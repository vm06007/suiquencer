import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk';
import { TOKENS } from '@/config/tokens';
import type { Node } from '@xyflow/react';
import type { NodeData, ComparisonOperator } from '@/types';

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

        // Track which node indices to skip based on logic conditions
        const skipIndices = new Set<number>();

        // Resolve SuiNS names and validate all steps first
        const resolvedRecipients: Map<number, string> = new Map();
        const resolvedLogicAddresses: Map<number, string> = new Map();

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
          } else if (node.type === 'logic') {
            // Validate logic node
            const logicType = node.data.logicType;

            if (logicType === 'balance') {
              const address = node.data.balanceAddress;
              const operator = node.data.comparisonOperator;
              const compareValue = node.data.compareValue;

              if (!address) {
                throw new Error(`Step ${i + 1}: Address is required for balance check`);
              }

              if (!operator) {
                throw new Error(`Step ${i + 1}: Comparison operator is required`);
              }

              if (!compareValue) {
                throw new Error(`Step ${i + 1}: Compare value is required`);
              }

              // Resolve SuiNS name if needed
              let resolvedAddress = address;
              if (isValidSuiNSName(address)) {
                console.log(`Resolving SuiNS name for logic: ${address}`);
                try {
                  const nameRecord = await suinsClient.getNameRecord(address);
                  if (!nameRecord || !nameRecord.targetAddress) {
                    throw new Error(`Step ${i + 1}: Failed to resolve SuiNS name "${address}"`);
                  }
                  resolvedAddress = nameRecord.targetAddress;
                  console.log(`Resolved ${address} to ${resolvedAddress}`);
                } catch (error) {
                  throw new Error(`Step ${i + 1}: Failed to resolve SuiNS name "${address}"`);
                }
              }

              resolvedLogicAddresses.set(i, resolvedAddress);

              // Evaluate the condition
              try {
                const balance = await suiClient.getBalance({
                  owner: resolvedAddress,
                });
                const balanceInSui = parseInt(balance.totalBalance) / Math.pow(10, 9);
                const compareVal = parseFloat(compareValue);

                let conditionMet = false;
                const op = operator as ComparisonOperator;
                switch (op) {
                  case 'gt':
                    conditionMet = balanceInSui > compareVal;
                    break;
                  case 'gte':
                    conditionMet = balanceInSui >= compareVal;
                    break;
                  case 'lt':
                    conditionMet = balanceInSui < compareVal;
                    break;
                  case 'lte':
                    conditionMet = balanceInSui <= compareVal;
                    break;
                  case 'eq':
                    conditionMet = Math.abs(balanceInSui - compareVal) < 0.0001;
                    break;
                  case 'ne':
                    conditionMet = Math.abs(balanceInSui - compareVal) >= 0.0001;
                    break;
                }

                console.log(
                  `Step ${i + 1}: Logic check - ${balanceInSui} SUI ${operator} ${compareVal} SUI = ${conditionMet}`
                );

                // If condition is not met, mark all downstream nodes for skipping
                if (!conditionMet) {
                  console.log(`Step ${i + 1}: Condition NOT met, skipping downstream nodes`);
                  // Mark all nodes after this logic node for skipping
                  for (let j = i + 1; j < sequence.length; j++) {
                    skipIndices.add(j);
                  }
                } else {
                  console.log(`Step ${i + 1}: Condition met, continuing execution`);
                }
              } catch (error) {
                throw new Error(`Step ${i + 1}: Failed to fetch balance for ${resolvedAddress}`);
              }
            } else if (logicType === 'contract') {
              throw new Error(`Step ${i + 1}: Contract check not yet implemented`);
            } else {
              throw new Error(`Step ${i + 1}: Unknown logic type "${logicType}"`);
            }
          } else {
            throw new Error(`Step ${i + 1}: Node type "${node.type}" not yet implemented`);
          }
        }

        // Build all operations into the single transaction block
        let actualStepCount = 0;
        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];

          // Skip nodes that failed logic conditions
          if (skipIndices.has(i)) {
            console.log(`Skipping step ${i + 1} due to failed logic condition`);
            continue;
          }

          // Skip logic nodes - they don't add operations to the transaction
          if (node.type === 'logic') {
            console.log(`Step ${i + 1}: Logic node (no operation added to transaction)`);
            continue;
          }

          actualStepCount++;

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
        console.log(`Executing atomic transaction block with ${actualStepCount} operation(s)...`);
        const result = await signAndExecuteTransaction({
          transaction: tx as any,
        });

        console.log('Atomic transaction executed successfully:', result);

        // Store the result for the modal
        setLastResult({
          digest: result.digest,
          stepCount: actualStepCount,
        });

        toast.success(`Transaction confirmed (${actualStepCount} operation${actualStepCount === 1 ? '' : 's'})`);
        return result;
      } catch (error: any) {
        console.error('Execution failed:', error);
        const msg = error?.message ?? '';
        const isUserRejection = /user rejected|rejected the request|rejected the transaction/i.test(msg);
        if (!isUserRejection) {
          toast.error(msg || 'Execution failed');
        }
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
