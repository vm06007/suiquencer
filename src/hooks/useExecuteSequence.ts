import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk';
import { TOKENS } from '@/config/tokens';
import { acquireNonSuiCoin } from './execution/utils';
import { evaluateBalanceCondition, evaluateContractCondition, markDownstreamNodes } from './execution/logic';
import { buildScallopDeposit, buildScallopWithdraw, buildScallopBorrow, buildScallopRepay } from './execution/scallop';
import { buildNaviDeposit, buildNaviWithdraw, buildNaviBorrow } from './execution/navi';
import { buildNativeStake, buildAftermathStake, buildVoloStake } from './execution/staking';
import { executeBridgeNodes } from './execution/bridge';
import type { BridgeStatus, BridgeProcessInfo } from './execution/bridge';
import type { Node } from '@xyflow/react';
import type { NodeData, ComparisonOperator } from '@/types';

export type { BridgeStatus, BridgeProcessInfo };

export function useExecuteSequence() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<{ digest: string; stepCount: number; hasBridgeOperation?: boolean } | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const suinsClient = new SuinsClient({
    client: suiClient as any,
    network: 'mainnet'
  });

  const executeSequence = useCallback(
    async (sequence: Node<NodeData>[], edges: any[]) => {
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

        // Collect bridge nodes for separate execution via LI.FI SDK
        const bridgeNodes: Node<NodeData>[] = [];

        // Resolve SuiNS names and validate all steps first
        const resolvedRecipients: Map<number, string> = new Map();

        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];
          const stepLabel = `Step ${i + 1}`;

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientInput = node.data.recipientAddress;

            if (!recipientInput) throw new Error(`${stepLabel}: Recipient address is required`);
            if (amount <= 0) throw new Error(`${stepLabel}: Amount must be greater than 0`);

            // Resolve SuiNS name if it's a valid SuiNS format
            let resolvedAddress = recipientInput;
            if (isValidSuiNSName(recipientInput)) {
              console.log(`Resolving SuiNS name: ${recipientInput}`);
              try {
                const nameRecord = await suinsClient.getNameRecord(recipientInput);
                if (!nameRecord || !nameRecord.targetAddress) {
                  throw new Error(`${stepLabel}: Failed to resolve SuiNS name "${recipientInput}"`);
                }
                resolvedAddress = nameRecord.targetAddress;
                console.log(`Resolved ${recipientInput} to ${resolvedAddress}`);
              } catch (error) {
                throw new Error(`${stepLabel}: Failed to resolve SuiNS name "${recipientInput}"`);
              }
            }

            resolvedRecipients.set(i, resolvedAddress);
          } else if (node.type === 'swap') {
            const amount = parseFloat(node.data.amount || '0');
            if (!node.data.fromAsset || !node.data.toAsset) throw new Error(`${stepLabel}: Both from and to assets are required`);
            if (amount <= 0) throw new Error(`${stepLabel}: Amount must be greater than 0`);
            if (node.data.fromAsset === node.data.toAsset) throw new Error(`${stepLabel}: Cannot swap between the same asset`);
          } else if (node.type === 'logic') {
            const logicType = node.data.logicType;

            if (logicType === 'balance') {
              const address = node.data.balanceAddress;
              const operator = node.data.comparisonOperator;
              const compareValue = node.data.compareValue;

              if (!address) throw new Error(`${stepLabel}: Address is required for balance check`);
              if (!operator) throw new Error(`${stepLabel}: Comparison operator is required`);
              if (!compareValue) throw new Error(`${stepLabel}: Compare value is required`);

              // Resolve SuiNS name if needed
              let resolvedAddress = address;
              if (isValidSuiNSName(address)) {
                console.log(`Resolving SuiNS name for logic: ${address}`);
                try {
                  const nameRecord = await suinsClient.getNameRecord(address);
                  if (!nameRecord || !nameRecord.targetAddress) {
                    throw new Error(`${stepLabel}: Failed to resolve SuiNS name "${address}"`);
                  }
                  resolvedAddress = nameRecord.targetAddress;
                  console.log(`Resolved ${address} to ${resolvedAddress}`);
                } catch (error) {
                  throw new Error(`${stepLabel}: Failed to resolve SuiNS name "${address}"`);
                }
              }

              try {
                const asset = (node.data.balanceAsset || 'SUI') as string;
                const conditionMet = await evaluateBalanceCondition(
                  suiClient, resolvedAddress, asset, operator as ComparisonOperator, compareValue, stepLabel
                );

                if (!conditionMet) {
                  console.log(`${stepLabel}: Condition NOT met, skipping downstream nodes`);
                  markDownstreamNodes(node.id, i, sequence, edges, skipIndices);
                } else {
                  console.log(`${stepLabel}: Condition met, continuing execution`);
                }
              } catch (error) {
                throw new Error(`${stepLabel}: Failed to fetch balance for ${resolvedAddress}`);
              }
            } else if (logicType === 'contract') {
              const packageId = node.data.contractPackageId;
              const module = node.data.contractModule;
              const func = node.data.contractFunction;
              const operator = node.data.contractComparisonOperator;
              const compareValue = node.data.contractCompareValue;

              if (!packageId) throw new Error(`${stepLabel}: Package ID is required for contract check`);
              if (!module) throw new Error(`${stepLabel}: Module name is required for contract check`);
              if (!func) throw new Error(`${stepLabel}: Function name is required for contract check`);
              if (!operator) throw new Error(`${stepLabel}: Comparison operator is required`);
              if (!compareValue) throw new Error(`${stepLabel}: Compare value is required`);

              try {
                const conditionMet = await evaluateContractCondition(
                  suiClient, packageId, module, func,
                  node.data.contractArguments, operator as ComparisonOperator, compareValue, stepLabel
                );

                if (!conditionMet) {
                  console.log(`${stepLabel}: Condition NOT met, skipping downstream nodes`);
                  markDownstreamNodes(node.id, i, sequence, edges, skipIndices);
                } else {
                  console.log(`${stepLabel}: Condition met, continuing execution`);
                }
              } catch (error: any) {
                throw new Error(`${stepLabel}: Failed to check contract: ${error.message}`);
              }
            } else {
              throw new Error(`${stepLabel}: Unknown logic type "${logicType}"`);
            }
          } else if (node.type === 'custom') {
            if (!node.data.customPackageId) throw new Error(`${stepLabel}: Package ID is required for custom contract`);
            if (!node.data.customModule) throw new Error(`${stepLabel}: Module name is required for custom contract`);
            if (!node.data.customFunction) throw new Error(`${stepLabel}: Function name is required for custom contract`);

            if (node.data.customArguments) {
              try {
                const args = JSON.parse(node.data.customArguments as string);
                if (!Array.isArray(args)) throw new Error(`${stepLabel}: Arguments must be a JSON array`);
              } catch (e) {
                throw new Error(`${stepLabel}: Invalid JSON arguments`);
              }
            }
            if (node.data.customTypeArguments) {
              try {
                const typeArgs = JSON.parse(node.data.customTypeArguments as string);
                if (!Array.isArray(typeArgs)) throw new Error(`${stepLabel}: Type arguments must be a JSON array`);
              } catch (e) {
                throw new Error(`${stepLabel}: Invalid type arguments JSON`);
              }
            }
          } else if (node.type === 'lend') {
            const action = node.data.lendAction || 'deposit';
            const amount = parseFloat(node.data.lendAmount || '0');
            const protocol = node.data.lendProtocol || 'scallop';

            if (amount <= 0) throw new Error(`${stepLabel}: Amount must be greater than 0`);
            if (protocol !== 'scallop' && protocol !== 'navi') throw new Error(`${stepLabel}: Only Scallop and Navi protocols are supported currently`);
            if (protocol === 'navi' && action === 'repay') throw new Error(`${stepLabel}: Navi repay is not yet supported.`);
            if (action !== 'deposit' && action !== 'withdraw' && action !== 'borrow' && action !== 'repay') throw new Error(`${stepLabel}: Unsupported lend action "${action}"`);
          } else if (node.type === 'bridge') {
            const amount = parseFloat(node.data.bridgeAmount || '0');
            const ethereumAddress = node.data.ethereumAddress;

            if (!node.data.bridgeAsset) throw new Error(`${stepLabel}: Source asset is required`);
            if (!node.data.bridgeOutputAsset) throw new Error(`${stepLabel}: Destination asset is required`);
            if (!node.data.bridgeChain) throw new Error(`${stepLabel}: Destination chain is required`);
            if (amount <= 0) throw new Error(`${stepLabel}: Amount must be greater than 0`);
            if (!ethereumAddress) throw new Error(`${stepLabel}: Ethereum address is required`);

            if (!ethereumAddress.endsWith('.eth') &&
                !(ethereumAddress.startsWith('0x') && ethereumAddress.length === 42)) {
              throw new Error(`${stepLabel}: Invalid Ethereum address format`);
            }

            console.log(`${stepLabel}: Bridge validation passed`);
            if ((node.data.bridgeProtocol || 'none') !== 'none') {
              console.log(`  Destination protocol: ${node.data.bridgeProtocol}`);
            }
          } else if (node.type === 'stake') {
            const amount = parseFloat(node.data.stakeAmount || '0');
            const stakeProtocol = node.data.stakeProtocol || 'native';

            if (amount <= 0) throw new Error(`${stepLabel}: Amount must be greater than 0`);
            if (stakeProtocol === 'native') {
              if (amount < 1) throw new Error(`${stepLabel}: Minimum native stake is 1 SUI`);
              if (!node.data.stakeValidator) throw new Error(`${stepLabel}: Please select a validator`);
            }

            console.log(`${stepLabel}: Stake validation passed (${stakeProtocol})`);
          } else {
            throw new Error(`${stepLabel}: Node type "${node.type}" not yet implemented`);
          }
        }

        // Build all operations into the single transaction block
        let actualStepCount = 0;
        const intermediateCoins = new Map<string, any>();

        for (let i = 0; i < sequence.length; i++) {
          const node = sequence[i];
          const stepLabel = `Step ${i + 1}`;

          // Skip nodes that failed logic conditions
          if (skipIndices.has(i)) {
            console.log(`Skipping step ${i + 1} due to failed logic condition`);
            continue;
          }

          // Skip logic nodes - they don't add operations to the transaction
          if (node.type === 'logic') {
            console.log(`${stepLabel}: Logic node (no operation added to transaction)`);
            continue;
          }

          // Bridge nodes are executed separately via LI.FI SDK, not in the Sui tx
          if (node.type === 'bridge') {
            const lifiRoute = node.data.lifiRoute;
            if (!lifiRoute) throw new Error(`${stepLabel}: No LI.FI route found. Please wait for quote to load.`);
            if (!lifiRoute.steps?.length) throw new Error(`${stepLabel}: Invalid LI.FI route - no steps found`);

            console.log(`${stepLabel}: Cross-chain bridge via LI.FI (deferred)`);
            console.log(`  Bridge: ${node.data.bridgeAsset || 'SUI'} from Sui -> ${node.data.bridgeChain}`);
            console.log(`  Convert: ${node.data.bridgeAsset} -> ${node.data.bridgeOutputAsset}`);
            console.log(`  Destination: ${node.data.ethereumAddress}`);
            console.log(`  Route Tool: ${lifiRoute.steps[0]?.tool || 'unknown'}`);

            bridgeNodes.push(node);
            continue;
          }

          actualStepCount++;

          if (node.type === 'transfer') {
            const amount = parseFloat(node.data.amount || '0');
            const recipientAddress = resolvedRecipients.get(i)!;
            const asset = (node.data.asset || 'SUI') as keyof typeof TOKENS;
            const tokenInfo = TOKENS[asset];
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));

            if (asset === 'SUI') {
              const [coin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
              tx.transferObjects([coin], recipientAddress);
            } else {
              const coinToTransfer = await acquireNonSuiCoin(
                tx, suiClient, account.address, tokenInfo.coinType,
                amountInSmallestUnit, intermediateCoins, stepLabel, asset
              );
              tx.transferObjects([coinToTransfer], recipientAddress);
            }
            console.log(`Added ${stepLabel}: Transfer ${amount} ${asset} to ${recipientAddress.slice(0, 10)}...`);
          } else if (node.type === 'swap') {
            const amount = parseFloat(node.data.amount || '0');
            const fromAsset = node.data.fromAsset as keyof typeof TOKENS;
            const toAsset = node.data.toAsset as keyof typeof TOKENS;
            const fromToken = TOKENS[fromAsset];
            const toToken = TOKENS[toAsset];
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, fromToken.decimals));

            console.log(`Fetching swap route for ${amount} ${fromAsset} → ${toAsset}...`);

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
              throw new Error(`${stepLabel}: No swap route found for ${fromAsset} → ${toAsset} (using CETUS, BLUEFIN, FERRADLMM). Try a different amount or pair.`);
            }

            console.log(`Route found: ${route.paths.length} hop(s), estimated output: ${route.amountOut.toString()}`);

            let inputCoin;
            if (fromAsset === 'SUI') {
              [inputCoin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
            } else {
              inputCoin = await acquireNonSuiCoin(
                tx, suiClient, account.address, fromToken.coinType,
                amountInSmallestUnit, intermediateCoins, stepLabel, fromAsset as string
              );
            }

            const outputCoin = await aggregatorClient.routerSwap({
              router: route,
              inputCoin,
              slippage: 0.02,
              txb: tx,
            });

            tx.transferObjects([outputCoin], account.address);
            console.log(`Added ${stepLabel}: Swap ${amount} ${fromAsset} → ${toAsset}`);
          } else if (node.type === 'custom') {
            const packageId = node.data.customPackageId!;
            const module = node.data.customModule!;
            const func = node.data.customFunction!;
            const target = `${packageId}::${module}::${func}`;

            let args: any[] = [];
            if (node.data.customArguments) {
              args = JSON.parse(node.data.customArguments as string);
            }

            const txArgs = args.map((arg: any) => {
              if (arg === 'true' || arg === 'false') return tx.pure.bool(arg === 'true');
              if (typeof arg === 'boolean') return tx.pure.bool(arg);
              if (typeof arg === 'string' && arg.startsWith('0x')) return tx.object(arg);
              if (typeof arg === 'number') { const [coin] = tx.splitCoins(tx.gas, [arg]); return coin; }
              if (typeof arg === 'string' && !isNaN(Number(arg)) && arg.trim() !== '') {
                const amount = Number(arg);
                const [coin] = tx.splitCoins(tx.gas, [amount]);
                return coin;
              }
              if (typeof arg === 'string') return tx.pure.string(arg);
              return tx.pure(arg);
            });

            let typeArguments: string[] = [];
            if (node.data.customTypeArguments) {
              try {
                typeArguments = JSON.parse(node.data.customTypeArguments as string);
                if (!Array.isArray(typeArguments)) throw new Error('Type arguments must be a JSON array');
              } catch (e) {
                throw new Error(`${stepLabel}: Invalid type arguments JSON`);
              }
            }

            const moveCallConfig: any = { target, arguments: txArgs };
            if (typeArguments.length > 0) moveCallConfig.typeArguments = typeArguments;
            tx.moveCall(moveCallConfig);

            const typeArgsDisplay = typeArguments.length > 0 ? `<${typeArguments.join(', ')}>` : '';
            console.log(`Added ${stepLabel}: Custom contract call ${target}${typeArgsDisplay}`);
          } else if (node.type === 'lend') {
            const action = node.data.lendAction || 'deposit';
            const asset = (node.data.lendAsset || 'SUI') as keyof typeof TOKENS;
            const amount = parseFloat(node.data.lendAmount || '0');
            const protocol = node.data.lendProtocol || 'scallop';
            const tokenInfo = TOKENS[asset];
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));

            if (protocol === 'scallop' && action === 'deposit') {
              await buildScallopDeposit(tx, suiClient, account.address, asset, amountInSmallestUnit, intermediateCoins, stepLabel);
            } else if (protocol === 'scallop' && action === 'withdraw') {
              await buildScallopWithdraw(tx, suiClient, account.address, asset, amount, stepLabel);
            } else if (protocol === 'scallop' && action === 'borrow') {
              await buildScallopBorrow(tx, suiClient, account.address, asset, amountInSmallestUnit, node, stepLabel);
            } else if (protocol === 'scallop' && action === 'repay') {
              await buildScallopRepay(tx, suiClient, account.address, asset, amountInSmallestUnit, intermediateCoins, node, stepLabel);
            } else if (protocol === 'navi' && action === 'deposit') {
              await buildNaviDeposit(tx, suiClient, account.address, asset, amountInSmallestUnit, intermediateCoins, stepLabel);
            } else if (protocol === 'navi' && action === 'withdraw') {
              buildNaviWithdraw(tx, asset, amountInSmallestUnit, intermediateCoins, stepLabel);
            } else if (protocol === 'navi' && action === 'borrow') {
              buildNaviBorrow(tx, asset, amountInSmallestUnit, intermediateCoins, stepLabel);
            }
          } else if (node.type === 'stake') {
            const amount = parseFloat(node.data.stakeAmount || '0');
            const stakeProtocol = node.data.stakeProtocol || 'native';
            const amountInMist = Math.floor(amount * 1e9);

            if (stakeProtocol === 'native') {
              buildNativeStake(tx, amountInMist, node.data.stakeValidator!, stepLabel);
            } else if (stakeProtocol === 'aftermath') {
              await buildAftermathStake(tx, suiClient, account.address, amountInMist, node.data.stakeValidator, stepLabel);
            } else if (stakeProtocol === 'volo') {
              buildVoloStake(tx, account.address, amountInMist, stepLabel);
            }
          }
        }

        // Transfer any remaining intermediate coins to the user
        for (const [coinType, coin] of intermediateCoins) {
          tx.transferObjects([coin], account.address);
          console.log(`Transferring remaining intermediate coin (${coinType.slice(0, 30)}...) to user`);
        }
        intermediateCoins.clear();

        // Check if all operations were skipped (no Sui ops and no bridge ops)
        if (actualStepCount === 0 && bridgeNodes.length === 0) {
          console.log('All operations were skipped due to failed logic conditions');
          toast.error('All operations skipped - logic condition(s) not met');
          return;
        }

        // Execute the Sui transaction block if there are non-bridge operations
        let suiResult: { digest: string } | null = null;
        if (actualStepCount > 0) {
          console.log(`Executing atomic transaction block with ${actualStepCount} operation(s)...`);
          suiResult = await signAndExecuteTransaction({
            transaction: tx as any,
          });
          console.log('Atomic transaction executed successfully:', suiResult);
          toast.success(`Sui transaction confirmed (${actualStepCount} operation${actualStepCount === 1 ? '' : 's'})`);
        }

        // Execute bridge operations via LI.FI SDK
        if (bridgeNodes.length > 0) {
          await executeBridgeNodes(
            bridgeNodes, account.address, currentWallet,
            setBridgeStatus as any, setLastResult,
            suiResult?.digest, actualStepCount,
          );
          return suiResult;
        }

        const totalSteps = actualStepCount;

        // Store the result for the modal (non-bridge case)
        setLastResult({
          digest: suiResult?.digest || '',
          stepCount: totalSteps,
          hasBridgeOperation: false,
        });

        toast.success(`Transaction confirmed (${totalSteps} operation${totalSteps === 1 ? '' : 's'})`);
        return suiResult;
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
    [account, currentWallet, signAndExecuteTransaction, suiClient]
  );

  return {
    executeSequence,
    isExecuting,
    lastResult,
    bridgeStatus,
    clearResult: () => { setLastResult(null); setBridgeStatus(null); },
  };
}
