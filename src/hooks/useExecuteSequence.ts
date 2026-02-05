import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk';
import { TOKENS } from '@/config/tokens';
import type { Node } from '@xyflow/react';
import type { NodeData } from '@/types';

export function useExecuteSequence() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<{ digest: string; stepCount: number } | null>(null);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const suinsClient = new SuinsClient({
    client: suiClient as any,
    network: 'mainnet'
  });

  const executeSequence = useCallback(
    async (sequence: Node<NodeData>[]) => {
      if (!account) {
        toast.error('Please connect your wallet first');
        return;
      }

      if (sequence.length === 0) {
        toast.error('No transactions to execute');
        return;
      }

      setIsExecuting(true);

      try {
        // Create ONE transaction block for ALL operations (atomic)
        const tx = new Transaction();

        // Set sender address (required for Cetus swap)
        tx.setSender(account.address);

        console.log(`Building atomic transaction with ${sequence.length} operations...`);

        // Resolve SuiNS names and validate all steps first
        const resolvedRecipients: Map<number, string> = new Map();

        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientInput = node.data.recipientAddress;

            if (!recipientInput) {
              throw new Error(`Step ${i + 1}: Recipient address is required`);
            }

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }

            // Resolve SuiNS name if it's a valid SuiNS format
            let resolvedAddress = recipientInput;

            if (isValidSuiNSName(recipientInput)) {
              console.log(`Resolving SuiNS name: ${recipientInput}`);
              try {
                // Pass the name directly - the client handles both @ and .sui formats
                const nameRecord = await suinsClient.getNameRecord(recipientInput);
                if (!nameRecord || !nameRecord.targetAddress) {
                  throw new Error(`Step ${i + 1}: Failed to resolve SuiNS name "${recipientInput}"`);
                }
                resolvedAddress = nameRecord.targetAddress;
                console.log(`Resolved ${recipientInput} to ${resolvedAddress}`);
              } catch (error) {
                throw new Error(`Step ${i + 1}: Failed to resolve SuiNS name "${recipientInput}"`);
              }
            }

            resolvedRecipients.set(i, resolvedAddress);
          } else if (node.type === 'swap') {
            const amount = parseFloat(node.data.amount || '0');
            const fromAsset = node.data.fromAsset;
            const toAsset = node.data.toAsset;

            if (!fromAsset || !toAsset) {
              throw new Error(`Step ${i + 1}: Both from and to assets are required`);
            }

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }

            if (fromAsset === toAsset) {
              throw new Error(`Step ${i + 1}: Cannot swap between the same asset`);
            }
          } else {
            throw new Error(`Step ${i + 1}: Node type "${node.type}" not yet implemented`);
          }
        }

        // Build all operations into the single transaction block
        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientAddress = resolvedRecipients.get(i)!;
            const asset = (node.data.asset || 'SUI') as keyof typeof TOKENS;
            const tokenInfo = TOKENS[asset];

            // Convert amount to smallest unit based on token decimals
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));

            if (asset === 'SUI') {
              // For SUI, use gas coins
              const [coin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
              tx.transferObjects([coin], recipientAddress);
              console.log(`Added step ${i + 1}: Transfer ${amount} ${asset} to ${recipientAddress.slice(0, 10)}...`);
            } else {
              // For USDC/USDT, select coins from the user's wallet
              console.log(`Fetching ${asset} coins for transfer...`);

              const coins = await suiClient.getCoins({
                owner: account.address,
                coinType: tokenInfo.coinType,
              });

              if (!coins.data || coins.data.length === 0) {
                throw new Error(`Step ${i + 1}: No ${asset} coins found in wallet`);
              }

              // Calculate total available balance
              const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));

              if (totalBalance < BigInt(amountInSmallestUnit)) {
                throw new Error(`Step ${i + 1}: Insufficient ${asset} balance`);
              }

              // Select coins to cover the amount
              let remainingAmount = BigInt(amountInSmallestUnit);
              const selectedCoins: string[] = [];

              for (const coin of coins.data) {
                if (remainingAmount <= 0) break;
                selectedCoins.push(coin.coinObjectId);
                remainingAmount -= BigInt(coin.balance);
              }

              // If we need multiple coins, merge them first
              if (selectedCoins.length > 1) {
                const [primaryCoin, ...coinsToMerge] = selectedCoins;
                tx.mergeCoins(
                  tx.object(primaryCoin),
                  coinsToMerge.map(coin => tx.object(coin))
                );
                const [coinToTransfer] = tx.splitCoins(tx.object(primaryCoin), [amountInSmallestUnit]);
                tx.transferObjects([coinToTransfer], recipientAddress);
              } else {
                // Single coin is enough
                const [coinToTransfer] = tx.splitCoins(tx.object(selectedCoins[0]), [amountInSmallestUnit]);
                tx.transferObjects([coinToTransfer], recipientAddress);
              }

              console.log(`Added step ${i + 1}: Transfer ${amount} ${asset} to ${recipientAddress.slice(0, 10)}...`);
            }
          } else if (node.type === 'swap') {
            const amount = parseFloat(node.data.amount || '0');
            const fromAsset = node.data.fromAsset as keyof typeof TOKENS;
            const toAsset = node.data.toAsset as keyof typeof TOKENS;
            const fromToken = TOKENS[fromAsset];
            const toToken = TOKENS[toAsset];

            // Convert amount to smallest unit
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, fromToken.decimals));

            console.log(`Fetching swap route for ${amount} ${fromAsset} → ${toAsset}...`);

            // Cetus Aggregator SDK: use providers that don't require Pyth oracles to avoid
            // "All Pyth price nodes are unavailable" / reading 'from' errors in browser
            const aggregatorClient = new AggregatorClient({
              client: suiClient as any,
              signer: account.address,
              env: Env.Mainnet,
              pythUrls: ['https://hermes.pyth.network'],
            });

            const route = await aggregatorClient.findRouters({
              from: fromToken.coinType,
              target: toToken.coinType,
              amount: amountInSmallestUnit.toString(),
              byAmountIn: true,
              providers: ['CETUS', 'BLUEFIN', 'FERRADLMM'],
            });

            if (!route || !route.amountOut || !route.packages?.get('aggregator_v3')) {
              throw new Error(`Step ${i + 1}: No swap route found for ${fromAsset} → ${toAsset} (using CETUS, BLUEFIN, FERRADLMM). Try a different amount or pair.`);
            }

            console.log(`Route found: ${route.paths.length} hop(s), estimated output: ${route.amountOut.toString()}`);

            // Build input coin for the swap
            let inputCoin;
            if (fromAsset === 'SUI') {
              [inputCoin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
            } else {
              const coins = await suiClient.getCoins({
                owner: account.address,
                coinType: fromToken.coinType,
              });

              if (!coins.data || coins.data.length === 0) {
                throw new Error(`Step ${i + 1}: No ${fromAsset} coins found in wallet`);
              }

              const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
              if (totalBalance < BigInt(amountInSmallestUnit)) {
                throw new Error(`Step ${i + 1}: Insufficient ${fromAsset} balance`);
              }

              let remainingAmount = BigInt(amountInSmallestUnit);
              const selectedCoins: string[] = [];
              for (const coin of coins.data) {
                if (remainingAmount <= 0) break;
                selectedCoins.push(coin.coinObjectId);
                remainingAmount -= BigInt(coin.balance);
              }

              if (selectedCoins.length > 1) {
                const [primaryCoin, ...coinsToMerge] = selectedCoins;
                tx.mergeCoins(
                  tx.object(primaryCoin),
                  coinsToMerge.map(coin => tx.object(coin))
                );
                [inputCoin] = tx.splitCoins(tx.object(primaryCoin), [amountInSmallestUnit]);
              } else {
                [inputCoin] = tx.splitCoins(tx.object(selectedCoins[0]), [amountInSmallestUnit]);
              }
            }

            // Use SDK routerSwap to build swap (handles all DEXes, Pyth, slippage)
            const outputCoin = await aggregatorClient.routerSwap({
              router: route,
              inputCoin,
              slippage: 0.02,
              txb: tx,
            });

            tx.transferObjects([outputCoin], account.address);

            console.log(`Added step ${i + 1}: Swap ${amount} ${fromAsset} → ${toAsset}`);
          }
        }

        // Execute the entire transaction block atomically (one signature, all or nothing)
        console.log('Executing atomic transaction block...');
        const result = await signAndExecuteTransaction({
          transaction: tx as any,
        });

        console.log('Atomic transaction executed successfully:', result);

        // Store the result for the modal
        setLastResult({
          digest: result.digest,
          stepCount: sequence.length,
        });

        toast.success(`Transaction confirmed (${sequence.length} step${sequence.length === 1 ? '' : 's'})`);
        return result;
      } catch (error: any) {
        console.error('Execution failed:', error);
        toast.error(error.message || 'Execution failed');
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [account, signAndExecuteTransaction, suiClient]
  );

  return {
    executeSequence,
    isExecuting,
    lastResult,
    clearResult: () => setLastResult(null),
  };
}
