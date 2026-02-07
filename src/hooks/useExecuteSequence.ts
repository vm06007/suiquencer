import { useState, useCallback, createElement } from 'react';
import toast from 'react-hot-toast';
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuinsClient } from '@mysten/suins';
import { isValidSuiNSName } from '@mysten/sui/utils';
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk';
import { executeRoute, getRoutes } from '@lifi/sdk';
import { TOKENS, SCALLOP, SCALLOP_SCOINS } from '@/config/tokens';
import { suiProvider } from '@/config/lifi';

// LI.FI chain/token mappings for re-routing on bridge failure
const SUI_CHAIN_ID = 9270000000000000;
const DEST_CHAIN_IDS: Record<string, number> = {
  ethereum: 1, polygon: 137, arbitrum: 42161, optimism: 10,
  base: 8453, avalanche: 43114, bsc: 56,
};
const SUI_TOKEN_ADDRESSES: Record<string, string> = {
  SUI: '0x2::sui::SUI',
  USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  USDT: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
};
const EVM_TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  USDT: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', 56: '0x55d398326f99059fF775485246999027B3197955' },
  ETH: { 1: '0x0000000000000000000000000000000000000000', 42161: '0x0000000000000000000000000000000000000000', 10: '0x0000000000000000000000000000000000000000', 8453: '0x0000000000000000000000000000000000000000' },
  WBTC: { 1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  DAI: { 1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 10: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
};
import type { Node } from '@xyflow/react';
import type { NodeData, ComparisonOperator } from '@/types';

export interface BridgeProcessInfo {
  type: string;
  status: string;
  txHash?: string;
  txLink?: string;
}

export interface BridgeStatus {
  status: 'signing' | 'pending' | 'bridging' | 'done' | 'failed';
  processes: BridgeProcessInfo[];
  tool?: string;
  fromAsset?: string;
  toAsset?: string;
  fromChain?: string;
  toChain?: string;
  error?: string;
}

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
                const asset = (node.data.balanceAsset || 'SUI') as keyof typeof TOKENS;
                const tokenInfo = TOKENS[asset];

                const balance = await suiClient.getBalance({
                  owner: resolvedAddress,
                  coinType: tokenInfo.coinType,
                });
                const balanceInToken = parseInt(balance.totalBalance) / Math.pow(10, tokenInfo.decimals);
                const compareVal = parseFloat(compareValue);

                let conditionMet = false;
                const op = operator as ComparisonOperator;
                switch (op) {
                  case 'gt':
                    conditionMet = balanceInToken > compareVal;
                    break;
                  case 'gte':
                    conditionMet = balanceInToken >= compareVal;
                    break;
                  case 'lt':
                    conditionMet = balanceInToken < compareVal;
                    break;
                  case 'lte':
                    conditionMet = balanceInToken <= compareVal;
                    break;
                  case 'eq':
                    conditionMet = Math.abs(balanceInToken - compareVal) < 0.0001;
                    break;
                  case 'ne':
                    conditionMet = Math.abs(balanceInToken - compareVal) >= 0.0001;
                    break;
                }

                console.log(
                  `Step ${i + 1}: Logic check - ${balanceInToken} ${asset} ${operator} ${compareVal} ${asset} = ${conditionMet}`
                );

                // If condition is not met, mark only DOWNSTREAM (connected) nodes for skipping
                if (!conditionMet) {
                  console.log(`Step ${i + 1}: Condition NOT met, skipping downstream nodes`);

                  // Find all nodes downstream of this logic node by traversing edges
                  const logicNodeId = node.id;
                  const visited = new Set<string>();

                  const markDownstream = (nodeId: string) => {
                    if (visited.has(nodeId)) return;
                    visited.add(nodeId);

                    // Find this node's index in the sequence and mark it for skipping
                    const nodeIndex = sequence.findIndex(n => n.id === nodeId);
                    if (nodeIndex > i) { // Only skip nodes after the logic node
                      skipIndices.add(nodeIndex);
                      console.log(`  Marking node ${nodeIndex + 1} for skipping (downstream of failed logic)`);
                    }

                    // Find outgoing edges from this node and recursively mark their targets
                    const outgoingEdges = edges.filter(e => e.source === nodeId);
                    outgoingEdges.forEach(edge => markDownstream(edge.target));
                  };

                  // Start marking from the logic node's immediate children
                  const outgoingEdges = edges.filter(e => e.source === logicNodeId);
                  outgoingEdges.forEach(edge => markDownstream(edge.target));
                } else {
                  console.log(`Step ${i + 1}: Condition met, continuing execution`);
                }
              } catch (error) {
                throw new Error(`Step ${i + 1}: Failed to fetch balance for ${resolvedAddress}`);
              }
            } else if (logicType === 'contract') {
              // Validate contract check inputs
              const packageId = node.data.contractPackageId;
              const module = node.data.contractModule;
              const func = node.data.contractFunction;
              const operator = node.data.contractComparisonOperator;
              const compareValue = node.data.contractCompareValue;

              if (!packageId) {
                throw new Error(`Step ${i + 1}: Package ID is required for contract check`);
              }

              if (!module) {
                throw new Error(`Step ${i + 1}: Module name is required for contract check`);
              }

              if (!func) {
                throw new Error(`Step ${i + 1}: Function name is required for contract check`);
              }

              if (!operator) {
                throw new Error(`Step ${i + 1}: Comparison operator is required`);
              }

              if (!compareValue) {
                throw new Error(`Step ${i + 1}: Compare value is required`);
              }

              // Evaluate the contract condition
              try {
                // Parse arguments if provided
                let args: any[] = [];
                if (node.data.contractArguments) {
                  try {
                    args = JSON.parse(node.data.contractArguments as string);
                    if (!Array.isArray(args)) {
                      throw new Error('Arguments must be a JSON array');
                    }
                  } catch (e) {
                    throw new Error(`Step ${i + 1}: Invalid JSON arguments`);
                  }
                }

                // Build transaction to call the view function
                const inspectTx = new Transaction();
                inspectTx.moveCall({
                  target: `${packageId}::${module}::${func}`,
                  arguments: args.map((arg: any) => {
                    if (typeof arg === 'string' && arg.startsWith('0x')) {
                      return inspectTx.object(arg);
                    }
                    return inspectTx.pure.u64(arg);
                  }),
                });

                // Execute as devInspect to get the value
                const result = await suiClient.devInspectTransactionBlock({
                  transactionBlock: inspectTx,
                  sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
                });

                if (result.error) {
                  throw new Error(`Contract call failed: ${result.error}`);
                }

                if (!result.results || result.results.length === 0) {
                  throw new Error('No return value from contract');
                }

                const returnData = result.results[0].returnValues;
                if (!returnData || returnData.length === 0) {
                  throw new Error('No return data from contract');
                }

                // Convert BCS bytes to number (assumes u64)
                const bytes = returnData[0][0];
                let contractValue = 0;
                for (let i = 0; i < Math.min(bytes.length, 8); i++) {
                  contractValue += bytes[i] * Math.pow(256, i);
                }

                const compareVal = parseFloat(compareValue);

                let conditionMet = false;
                const op = operator as ComparisonOperator;
                switch (op) {
                  case 'gt':
                    conditionMet = contractValue > compareVal;
                    break;
                  case 'gte':
                    conditionMet = contractValue >= compareVal;
                    break;
                  case 'lt':
                    conditionMet = contractValue < compareVal;
                    break;
                  case 'lte':
                    conditionMet = contractValue <= compareVal;
                    break;
                  case 'eq':
                    conditionMet = Math.abs(contractValue - compareVal) < 0.0001;
                    break;
                  case 'ne':
                    conditionMet = Math.abs(contractValue - compareVal) >= 0.0001;
                    break;
                }

                console.log(
                  `Step ${i + 1}: Contract check - ${contractValue} ${operator} ${compareVal} = ${conditionMet}`
                );

                // If condition is not met, mark only DOWNSTREAM (connected) nodes for skipping
                if (!conditionMet) {
                  console.log(`Step ${i + 1}: Condition NOT met, skipping downstream nodes`);

                  // Find all nodes downstream of this logic node by traversing edges
                  const logicNodeId = node.id;
                  const visited = new Set<string>();

                  const markDownstream = (nodeId: string) => {
                    if (visited.has(nodeId)) return;
                    visited.add(nodeId);

                    // Find this node's index in the sequence and mark it for skipping
                    const nodeIndex = sequence.findIndex(n => n.id === nodeId);
                    if (nodeIndex > i) { // Only skip nodes after the logic node
                      skipIndices.add(nodeIndex);
                      console.log(`  Marking node ${nodeIndex + 1} for skipping (downstream of failed logic)`);
                    }

                    // Find outgoing edges from this node and recursively mark their targets
                    const outgoingEdges = edges.filter(e => e.source === nodeId);
                    outgoingEdges.forEach(edge => markDownstream(edge.target));
                  };

                  // Start marking from the logic node's immediate children
                  const outgoingEdges = edges.filter(e => e.source === logicNodeId);
                  outgoingEdges.forEach(edge => markDownstream(edge.target));
                } else {
                  console.log(`Step ${i + 1}: Condition met, continuing execution`);
                }
              } catch (error: any) {
                throw new Error(`Step ${i + 1}: Failed to check contract: ${error.message}`);
              }
            } else {
              throw new Error(`Step ${i + 1}: Unknown logic type "${logicType}"`);
            }
          } else if (node.type === 'custom') {
            // Validate custom contract execution
            const packageId = node.data.customPackageId;
            const module = node.data.customModule;
            const func = node.data.customFunction;

            if (!packageId) {
              throw new Error(`Step ${i + 1}: Package ID is required for custom contract`);
            }

            if (!module) {
              throw new Error(`Step ${i + 1}: Module name is required for custom contract`);
            }

            if (!func) {
              throw new Error(`Step ${i + 1}: Function name is required for custom contract`);
            }

            // Parse arguments if provided
            if (node.data.customArguments) {
              try {
                const args = JSON.parse(node.data.customArguments as string);
                if (!Array.isArray(args)) {
                  throw new Error(`Step ${i + 1}: Arguments must be a JSON array`);
                }
              } catch (e) {
                throw new Error(`Step ${i + 1}: Invalid JSON arguments`);
              }
            }

            // Parse type arguments if provided
            if (node.data.customTypeArguments) {
              try {
                const typeArgs = JSON.parse(node.data.customTypeArguments as string);
                if (!Array.isArray(typeArgs)) {
                  throw new Error(`Step ${i + 1}: Type arguments must be a JSON array`);
                }
              } catch (e) {
                throw new Error(`Step ${i + 1}: Invalid type arguments JSON`);
              }
            }
          } else if (node.type === 'lend') {
            // Validate lend/borrow node
            const action = node.data.lendAction || 'deposit';
            const asset = node.data.lendAsset || 'SUI';
            const amount = parseFloat(node.data.lendAmount || '0');
            const protocol = node.data.lendProtocol || 'scallop';

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }

            if (protocol !== 'scallop') {
              throw new Error(`Step ${i + 1}: Only Scallop protocol is supported currently`);
            }

            if (action !== 'deposit' && action !== 'withdraw' && action !== 'borrow' && action !== 'repay') {
              throw new Error(`Step ${i + 1}: Unsupported lend action "${action}"`);
            }
          } else if (node.type === 'bridge') {
            // Validate bridge node
            const amount = parseFloat(node.data.bridgeAmount || '0');
            const asset = node.data.bridgeAsset;
            const outputAsset = node.data.bridgeOutputAsset;
            const chain = node.data.bridgeChain;
            const ethereumAddress = node.data.ethereumAddress;
            const protocol = node.data.bridgeProtocol || 'none';

            if (!asset) {
              throw new Error(`Step ${i + 1}: Source asset is required`);
            }

            if (!outputAsset) {
              throw new Error(`Step ${i + 1}: Destination asset is required`);
            }

            if (!chain) {
              throw new Error(`Step ${i + 1}: Destination chain is required`);
            }

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }

            if (!ethereumAddress) {
              throw new Error(`Step ${i + 1}: Ethereum address is required`);
            }

            // Validate Ethereum address format (basic check)
            if (!ethereumAddress.endsWith('.eth') &&
                !(ethereumAddress.startsWith('0x') && ethereumAddress.length === 42)) {
              throw new Error(`Step ${i + 1}: Invalid Ethereum address format`);
            }

            console.log(`Step ${i + 1}: Bridge validation passed`);
            if (protocol !== 'none') {
              console.log(`  Destination protocol: ${protocol}`);
            }
          } else if (node.type === 'stake') {
            // Validate stake node
            const amount = parseFloat(node.data.stakeAmount || '0');
            const stakeProtocol = node.data.stakeProtocol || 'native';

            if (amount <= 0) {
              throw new Error(`Step ${i + 1}: Amount must be greater than 0`);
            }

            if (stakeProtocol === 'native') {
              if (amount < 1) {
                throw new Error(`Step ${i + 1}: Minimum native stake is 1 SUI`);
              }
              if (!node.data.stakeValidator) {
                throw new Error(`Step ${i + 1}: Please select a validator`);
              }
            }

            console.log(`Step ${i + 1}: Stake validation passed (${stakeProtocol})`);
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

          // Bridge nodes are executed separately via LI.FI SDK, not in the Sui tx
          if (node.type === 'bridge') {
            // Validate and collect bridge node (handled after Sui tx below)
            const lifiRoute = node.data.lifiRoute;
            const asset = node.data.bridgeAsset || 'SUI';
            const outputAsset = node.data.bridgeOutputAsset;
            const chain = node.data.bridgeChain;
            const ethereumAddress = node.data.ethereumAddress;

            if (!lifiRoute) {
              throw new Error(`Step ${i + 1}: No LI.FI route found. Please wait for quote to load.`);
            }
            if (!lifiRoute.steps?.length) {
              throw new Error(`Step ${i + 1}: Invalid LI.FI route - no steps found`);
            }

            console.log(`Step ${i + 1}: Cross-chain bridge via LI.FI (deferred)`);
            console.log(`  Bridge: ${asset} from Sui -> ${chain}`);
            console.log(`  Convert: ${asset} -> ${outputAsset}`);
            console.log(`  Destination: ${ethereumAddress}`);
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
          } else if (node.type === 'custom') {
            const packageId = node.data.customPackageId!;
            const module = node.data.customModule!;
            const func = node.data.customFunction!;

            // Parse arguments if provided
            let args: any[] = [];
            if (node.data.customArguments) {
              args = JSON.parse(node.data.customArguments as string);
            }

            // Build the moveCall
            const target = `${packageId}::${module}::${func}`;

            // Convert arguments to proper transaction arguments
            const txArgs = args.map((arg: any) => {
              // Handle boolean strings
              if (arg === 'true' || arg === 'false') {
                return tx.pure.bool(arg === 'true');
              }

              // Handle boolean type
              if (typeof arg === 'boolean') {
                return tx.pure.bool(arg);
              }

              // If it's an object reference (starts with 0x), use tx.object()
              if (typeof arg === 'string' && arg.startsWith('0x')) {
                return tx.object(arg);
              }

              // For numbers - split from gas coin (for Coin<T> parameters)
              if (typeof arg === 'number') {
                const [coin] = tx.splitCoins(tx.gas, [arg]);
                return coin;
              }

              // For numeric strings - split from gas coin (for Coin<T> parameters)
              if (typeof arg === 'string' && !isNaN(Number(arg)) && arg.trim() !== '') {
                const amount = Number(arg);
                const [coin] = tx.splitCoins(tx.gas, [amount]);
                return coin;
              }

              // For regular strings
              if (typeof arg === 'string') {
                return tx.pure.string(arg);
              }

              // Default: try pure
              return tx.pure(arg);
            });

            // Parse type arguments if provided
            let typeArguments: string[] = [];
            if (node.data.customTypeArguments) {
              try {
                typeArguments = JSON.parse(node.data.customTypeArguments as string);
                if (!Array.isArray(typeArguments)) {
                  throw new Error('Type arguments must be a JSON array');
                }
              } catch (e) {
                throw new Error(`Step ${i + 1}: Invalid type arguments JSON`);
              }
            }

            const moveCallConfig: any = {
              target,
              arguments: txArgs,
            };

            // Only add type_arguments if provided
            if (typeArguments.length > 0) {
              moveCallConfig.typeArguments = typeArguments;
            }

            tx.moveCall(moveCallConfig);

            const typeArgsDisplay = typeArguments.length > 0 ? `<${typeArguments.join(', ')}>` : '';
            console.log(`Added step ${i + 1}: Custom contract call ${target}${typeArgsDisplay}`);
          } else if (node.type === 'lend') {
            // Execute lend/borrow operation
            const action = node.data.lendAction || 'deposit';
            const asset = (node.data.lendAsset || 'SUI') as keyof typeof TOKENS;
            const amount = parseFloat(node.data.lendAmount || '0');
            const protocol = node.data.lendProtocol || 'scallop';

            const tokenInfo = TOKENS[asset];
            const amountInSmallestUnit = Math.floor(amount * Math.pow(10, tokenInfo.decimals));

            if (protocol === 'scallop' && action === 'deposit') {
              // Scallop deposit (mint)
              const [coin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);

              tx.moveCall({
                target: `${SCALLOP.protocolPkg}::mint::mint_entry`,
                typeArguments: [tokenInfo.coinType],
                arguments: [
                  tx.object(SCALLOP.version),
                  tx.object(SCALLOP.market),
                  coin,
                  tx.object(SCALLOP.clock),
                ],
              });

              console.log(`Added step ${i + 1}: Scallop deposit ${amount} ${asset}`);
            } else if (protocol === 'scallop' && action === 'withdraw') {
              // Scallop withdraw (redeem) - burn sCoin to get back underlying asset
              // Users may have SCALLOP_* (wrapped) or MarketCoin (raw) - check both
              const sCoinConfig = SCALLOP_SCOINS[asset];
              const marketCoinType = `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${tokenInfo.coinType}>`;

              console.log(`Fetching s${asset} coins for withdraw...`);

              // Try wrapped sCoin first (SCALLOP_SUI, etc.)
              let hasWrappedSCoin = false;
              let wrappedCoins: any[] = [];
              if (sCoinConfig?.sCoinType) {
                const wrapped = await suiClient.getCoins({
                  owner: account.address,
                  coinType: sCoinConfig.sCoinType,
                });
                wrappedCoins = wrapped.data || [];
                hasWrappedSCoin = wrappedCoins.length > 0;
              }

              // Also check raw MarketCoin
              const rawCoins = await suiClient.getCoins({
                owner: account.address,
                coinType: marketCoinType,
              });
              const hasRawMarketCoin = (rawCoins.data?.length || 0) > 0;

              if (!hasWrappedSCoin && !hasRawMarketCoin) {
                throw new Error(`Step ${i + 1}: No s${asset} coins found in wallet. Deposit first to get sCoin tokens.`);
              }

              // Calculate sCoin amount needed based on exchange rate
              const exchangeRates: Record<string, number> = {
                SUI: 1.0931, USDC: 1.0567, USDT: 1.0489, WAL: 1.0123,
              };
              const rate = exchangeRates[asset] || 1.0;
              let sCoinAmount = Math.ceil((amount / rate) * Math.pow(10, tokenInfo.decimals));

              // Compute total available sCoin across wrapped + raw
              const totalWrappedBal = wrappedCoins.reduce((s: bigint, c: any) => s + BigInt(c.balance), BigInt(0));
              const rawCoinsList = rawCoins.data || [];
              const totalRawBal = rawCoinsList.reduce((s: bigint, c: any) => s + BigInt(c.balance), BigInt(0));
              const totalAvailableSCoin = totalWrappedBal + totalRawBal;

              console.log(`  sCoin needed: ${sCoinAmount}, available: ${totalAvailableSCoin.toString()} (wrapped: ${totalWrappedBal.toString()}, raw: ${totalRawBal.toString()})`);

              // Cap at total available — handles MAX button and exchange rate rounding
              if (BigInt(sCoinAmount) > totalAvailableSCoin && totalAvailableSCoin > BigInt(0)) {
                sCoinAmount = Number(totalAvailableSCoin);
                console.log(`  Capped sCoin amount to total available: ${sCoinAmount}`);
              }

              // Helper to select and merge coin objects
              const selectAndMergeCoins = (coins: any[], neededAmount: number) => {
                let remaining = BigInt(neededAmount);
                const selected: string[] = [];
                for (const coin of coins) {
                  if (remaining <= 0) break;
                  selected.push(coin.coinObjectId);
                  remaining -= BigInt(coin.balance);
                }

                let coinArg;
                if (selected.length > 1) {
                  const [primary, ...rest] = selected;
                  tx.mergeCoins(tx.object(primary), rest.map(c => tx.object(c)));
                  [coinArg] = tx.splitCoins(tx.object(primary), [neededAmount]);
                } else {
                  [coinArg] = tx.splitCoins(tx.object(selected[0]), [neededAmount]);
                }
                return coinArg;
              };

              let marketCoinArg;

              if (hasWrappedSCoin && sCoinConfig?.treasuryId) {
                // Convert wrapped sCoin (SCALLOP_SUI) → MarketCoin via burn_s_coin
                if (totalWrappedBal < BigInt(sCoinAmount)) {
                  // Not enough wrapped, try raw MarketCoin as fallback
                  if (hasRawMarketCoin) {
                    if (totalRawBal < BigInt(sCoinAmount)) {
                      throw new Error(`Step ${i + 1}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}`);
                    }
                    marketCoinArg = selectAndMergeCoins(rawCoinsList, sCoinAmount);
                  } else {
                    throw new Error(`Step ${i + 1}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}, available: ${(Number(totalAvailableSCoin) / Math.pow(10, tokenInfo.decimals)).toFixed(4)}`);
                  }
                } else {
                  // Use wrapped sCoin: burn to get MarketCoin
                  const wrappedCoinArg = selectAndMergeCoins(wrappedCoins, sCoinAmount);

                  marketCoinArg = tx.moveCall({
                    target: `${SCALLOP.converterPkg}::s_coin_converter::burn_s_coin`,
                    typeArguments: [sCoinConfig.sCoinType, tokenInfo.coinType],
                    arguments: [
                      tx.object(sCoinConfig.treasuryId),
                      wrappedCoinArg,
                    ],
                  });

                  console.log(`  Converting SCALLOP_${asset} → MarketCoin via burn_s_coin`);
                }
              } else if (hasRawMarketCoin) {
                // Use raw MarketCoin directly
                if (totalRawBal < BigInt(sCoinAmount)) {
                  throw new Error(`Step ${i + 1}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}, available: ${(Number(totalRawBal) / Math.pow(10, tokenInfo.decimals)).toFixed(4)}`);
                }
                marketCoinArg = selectAndMergeCoins(rawCoinsList, sCoinAmount);
              }

              // Call redeem_entry: burns MarketCoin and returns underlying asset
              tx.moveCall({
                target: `${SCALLOP.protocolPkg}::redeem::redeem_entry`,
                typeArguments: [tokenInfo.coinType],
                arguments: [
                  tx.object(SCALLOP.version),
                  tx.object(SCALLOP.market),
                  marketCoinArg,
                  tx.object(SCALLOP.clock),
                ],
              });

              console.log(`Added step ${i + 1}: Scallop withdraw ${amount} ${asset} (burning ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset})`);
            } else if (protocol === 'scallop' && action === 'borrow') {
              // Scallop borrow - borrow assets against existing obligation collateral
              const obligationId = node.data.lendObligationId;
              const obligationKeyId = node.data.lendObligationKeyId;

              let finalObligationId = obligationId;
              let finalObligationKeyId = obligationKeyId;

              // Auto-detect obligation from wallet
              if (!finalObligationId || !finalObligationKeyId) {
                console.log(`Auto-detecting Scallop obligation for borrow...`);

                const obligations = await suiClient.getOwnedObjects({
                  owner: account.address,
                  filter: {
                    StructType: `${SCALLOP.coreTypePkg}::obligation::Obligation`,
                  },
                  options: { showContent: true },
                });

                if (!obligations.data || obligations.data.length === 0) {
                  throw new Error(`Step ${i + 1}: No Scallop obligation found. You need collateral deposited to borrow.`);
                }

                finalObligationId = obligations.data[0].data?.objectId;

                const obligationKeys = await suiClient.getOwnedObjects({
                  owner: account.address,
                  filter: {
                    StructType: `${SCALLOP.coreTypePkg}::obligation::ObligationKey`,
                  },
                  options: { showContent: true },
                });

                if (!obligationKeys.data || obligationKeys.data.length === 0) {
                  throw new Error(`Step ${i + 1}: No Scallop obligation key found. Cannot borrow without the key.`);
                }

                finalObligationKeyId = obligationKeys.data[0].data?.objectId;

                console.log(`Found obligation: ${finalObligationId}, key: ${finalObligationKeyId}`);
              }

              if (!finalObligationId || !finalObligationKeyId) {
                throw new Error(`Step ${i + 1}: Could not find obligation objects for borrow`);
              }

              tx.moveCall({
                target: `${SCALLOP.protocolPkg}::borrow::borrow_entry`,
                typeArguments: [tokenInfo.coinType],
                arguments: [
                  tx.object(SCALLOP.version),
                  tx.object(finalObligationId),
                  tx.object(finalObligationKeyId),
                  tx.object(SCALLOP.market),
                  tx.pure.u64(amountInSmallestUnit),
                  tx.object(SCALLOP.clock),
                ],
              });

              console.log(`Added step ${i + 1}: Scallop borrow ${amount} ${asset} (obligation: ${finalObligationId?.slice(0, 10)}...)`);
            } else if (protocol === 'scallop' && action === 'repay') {
              // Scallop repay - repay borrowed assets to reduce debt on obligation
              const obligationId = node.data.lendObligationId;
              const obligationKeyId = node.data.lendObligationKeyId;

              let finalObligationId = obligationId;
              let finalObligationKeyId = obligationKeyId;

              if (!finalObligationId || !finalObligationKeyId) {
                console.log(`Auto-detecting Scallop obligation for repay...`);

                const obligations = await suiClient.getOwnedObjects({
                  owner: account.address,
                  filter: {
                    StructType: `${SCALLOP.coreTypePkg}::obligation::Obligation`,
                  },
                  options: { showContent: true },
                });

                if (!obligations.data || obligations.data.length === 0) {
                  throw new Error(`Step ${i + 1}: No Scallop obligation found. You need an active borrow to repay.`);
                }

                finalObligationId = obligations.data[0].data?.objectId;

                const obligationKeys = await suiClient.getOwnedObjects({
                  owner: account.address,
                  filter: {
                    StructType: `${SCALLOP.coreTypePkg}::obligation::ObligationKey`,
                  },
                  options: { showContent: true },
                });

                if (!obligationKeys.data || obligationKeys.data.length === 0) {
                  throw new Error(`Step ${i + 1}: No Scallop obligation key found. Cannot repay without the key.`);
                }

                finalObligationKeyId = obligationKeys.data[0].data?.objectId;

                console.log(`Found obligation: ${finalObligationId}, key: ${finalObligationKeyId}`);
              }

              if (!finalObligationId || !finalObligationKeyId) {
                throw new Error(`Step ${i + 1}: Could not find obligation objects for repay`);
              }

              // Split coin for repayment
              let repayCoin;
              if (asset === 'SUI') {
                [repayCoin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
              } else {
                const coins = await suiClient.getCoins({
                  owner: account.address,
                  coinType: tokenInfo.coinType,
                });

                if (!coins.data || coins.data.length === 0) {
                  throw new Error(`Step ${i + 1}: No ${asset} coins found in wallet for repayment`);
                }

                const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
                if (totalBalance < BigInt(amountInSmallestUnit)) {
                  throw new Error(`Step ${i + 1}: Insufficient ${asset} balance for repayment`);
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
                    coinsToMerge.map(c => tx.object(c))
                  );
                  [repayCoin] = tx.splitCoins(tx.object(primaryCoin), [amountInSmallestUnit]);
                } else {
                  [repayCoin] = tx.splitCoins(tx.object(selectedCoins[0]), [amountInSmallestUnit]);
                }
              }

              tx.moveCall({
                target: `${SCALLOP.protocolPkg}::repay::repay_entry`,
                typeArguments: [tokenInfo.coinType],
                arguments: [
                  tx.object(SCALLOP.version),
                  tx.object(finalObligationId),
                  tx.object(finalObligationKeyId),
                  tx.object(SCALLOP.market),
                  repayCoin,
                  tx.object(SCALLOP.clock),
                ],
              });

              console.log(`Added step ${i + 1}: Scallop repay ${amount} ${asset} (obligation: ${finalObligationId?.slice(0, 10)}...)`);
            }
          } else if (node.type === 'stake') {
            // Execute staking operation
            const amount = parseFloat(node.data.stakeAmount || '0');
            const stakeProtocol = node.data.stakeProtocol || 'native';
            const amountInMist = Math.floor(amount * 1e9); // SUI has 9 decimals

            if (stakeProtocol === 'native') {
              // Native SUI staking: delegate to validator
              const validatorAddress = node.data.stakeValidator!;
              const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

              tx.moveCall({
                target: '0x3::sui_system::request_add_stake',
                arguments: [
                  tx.object('0x5'), // SUI System State
                  coin,
                  tx.pure.address(validatorAddress),
                ],
              });

              console.log(`Added step ${i + 1}: Native stake ${amount} SUI to validator ${validatorAddress.slice(0, 10)}...`);

            } else if (stakeProtocol === 'aftermath') {
              // Aftermath afSUI liquid staking
              // Verified on-chain: request_stake takes validator address
              const aftermath = {
                packageId: '0x1575034d2729907aefca1ac757d6ccfcd3fc7e9e77927523c06007d8353ad836',
                stakedSuiVault: '0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d',
                safe: '0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610',
                referralVault: '0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef',
                suiSystem: '0x5',
              };

              // Aftermath needs a validator address - use selected or fetch first active
              let validatorAddress = node.data.stakeValidator;
              if (!validatorAddress) {
                // Fetch first active validator as default
                const sysState = await suiClient.getLatestSuiSystemState();
                validatorAddress = sysState.activeValidators[0]?.suiAddress;
                if (!validatorAddress) {
                  throw new Error(`Step ${i + 1}: No active validators found`);
                }
              }

              const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

              const afSuiCoin = tx.moveCall({
                target: `${aftermath.packageId}::staked_sui_vault::request_stake`,
                arguments: [
                  tx.object(aftermath.stakedSuiVault),
                  tx.object(aftermath.safe),
                  tx.object(aftermath.suiSystem),
                  tx.object(aftermath.referralVault),
                  coin,
                  tx.pure.address(validatorAddress),
                ],
              });

              // Transfer the returned afSUI to the user
              tx.transferObjects([afSuiCoin], account!.address);

              console.log(`Added step ${i + 1}: Aftermath stake ${amount} SUI for afSUI (validator: ${validatorAddress.slice(0, 10)}...)`);

            } else if (stakeProtocol === 'volo') {
              // Volo vSUI liquid staking (new stake_pool package)
              // Verified on-chain via sui_getNormalizedMoveModule
              const volo = {
                packageId: '0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20',
                stakePool: '0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5',
                metadata: '0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60',
                suiSystem: '0x5',
              };

              const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

              // Use stake (non-entry) which returns Coin<CERT> (vSUI)
              const vSuiCoin = tx.moveCall({
                target: `${volo.packageId}::stake_pool::stake`,
                arguments: [
                  tx.object(volo.stakePool),
                  tx.object(volo.metadata),
                  tx.object(volo.suiSystem),
                  coin,
                ],
              });

              // Transfer the returned vSUI to the user
              tx.transferObjects([vSuiCoin], account!.address);

              console.log(`Added step ${i + 1}: Volo stake ${amount} SUI for vSUI`);
            }
          }
        }

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
          if (!currentWallet) {
            throw new Error('Wallet not connected. Please connect your wallet for bridge operations.');
          }

          // Inject the connected wallet into the LI.FI Sui provider
          // Cast needed due to minor version differences between @mysten/wallet-standard packages
          suiProvider.setOptions({
            getWallet: async () => currentWallet as any,
          });

          const totalSteps = actualStepCount + bridgeNodes.length;

          for (const bridgeNode of bridgeNodes) {
            let activeRoute = bridgeNode.data.lifiRoute;
            const asset = bridgeNode.data.bridgeAsset || 'SUI';
            const outputAsset = bridgeNode.data.bridgeOutputAsset || 'USDC';
            const chain = bridgeNode.data.bridgeChain || 'ethereum';
            const deniedBridges: string[] = [];
            const maxRetries = 3;

            console.log(`Executing LI.FI bridge: ${asset} from Sui -> ${chain}...`);

            let sourceTxHash = '';
            let bridgeCompleted = false;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
              const currentTool = activeRoute.steps?.[0]?.tool || 'unknown';

              // Initialize/update bridge status
              setBridgeStatus({
                status: attempt > 0 ? 'signing' : 'signing',
                processes: [],
                tool: currentTool,
                fromAsset: asset,
                toAsset: outputAsset,
                fromChain: 'Sui',
                toChain: chain,
              });

              if (attempt > 0) {
                console.log(`Retry ${attempt}/${maxRetries - 1}: trying bridge tool "${currentTool}" (excluded: ${deniedBridges.join(', ')})`);
                toast.loading(`Retrying with ${currentTool}...`, { id: 'bridge-exec' });
              }

              try {
                await executeRoute(activeRoute, {
                  updateRouteHook: (updatedRoute) => {
                    const step = updatedRoute.steps[0];
                    const processes = step?.execution?.process || [];

                    let derivedStatus: BridgeStatus['status'] = 'signing';
                    const hasConfirmedTx = processes.some((p: any) => p.txHash);
                    const hasDone = processes.every((p: any) => p.status === 'DONE');
                    const hasFailed = processes.some((p: any) => p.status === 'FAILED');
                    const hasBridging = processes.some((p: any) =>
                      p.type === 'CROSS_CHAIN' && (p.status === 'PENDING' || p.status === 'DONE')
                    );

                    if (hasFailed) derivedStatus = 'failed';
                    else if (hasDone) derivedStatus = 'done';
                    else if (hasBridging) derivedStatus = 'bridging';
                    else if (hasConfirmedTx) derivedStatus = 'pending';

                    setBridgeStatus({
                      status: derivedStatus,
                      processes: processes.map((p: any) => ({
                        type: p.type || 'UNKNOWN',
                        status: p.status || 'UNKNOWN',
                        txHash: p.txHash,
                        txLink: p.txLink,
                      })),
                      tool: step?.tool,
                      fromAsset: asset,
                      toAsset: outputAsset,
                      fromChain: 'Sui',
                      toChain: chain,
                    });

                    if (hasConfirmedTx && !sourceTxHash) {
                      sourceTxHash = processes.find((p: any) => p.txHash)?.txHash || '';
                      // Show confirmation toast with LI.FI tracking link
                      toast.success(
                        createElement('span', null,
                          'Bridge signed! ',
                          createElement('a', {
                            href: `https://scan.li.fi/tx/${sourceTxHash}`,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            style: { color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' },
                          }, 'Track on LI.FI'),
                        ),
                        { duration: 10000, id: 'bridge-confirmed' }
                      );
                    }

                    for (const p of processes) {
                      console.log(`LI.FI [${p.type}]: ${p.status}${p.txHash ? ` tx: ${p.txHash}` : ''}`);
                    }
                  },
                });

                // Success!
                bridgeCompleted = true;
                toast.dismiss('bridge-exec');
                toast.dismiss('bridge-confirmed');
                setBridgeStatus(prev => prev ? { ...prev, status: 'done' } : null);
                toast.success(
                  createElement('span', null,
                    `Bridge to ${chain} complete! `,
                    sourceTxHash && createElement('a', {
                      href: `https://scan.li.fi/tx/${sourceTxHash}`,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      style: { color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' },
                    }, 'View on LI.FI'),
                  ),
                  { duration: 15000 }
                );
                break;

              } catch (error: any) {
                toast.dismiss('bridge-exec');
                console.error(`Bridge attempt ${attempt + 1} failed (${currentTool}):`, error);

                const rawMsg = error?.message || error?.cause?.message || '';

                // User rejected - stop immediately
                if (/user rejected|rejected the request|rejected the transaction/i.test(rawMsg)) {
                  throw error;
                }

                // Source tx already went through - can't retry, show tracking
                if (sourceTxHash) {
                  setBridgeStatus(prev => prev ? { ...prev, status: 'bridging' } : null);
                  toast.success('Bridge transaction submitted! Track status on LI.FI Explorer.');
                  bridgeCompleted = true;
                  break;
                }

                // Dry run / simulation failure - try next bridge
                const isRetryable = rawMsg.includes('Dry run failed') || rawMsg.includes('MoveAbort') || rawMsg.includes('422');
                if (!isRetryable || attempt >= maxRetries - 1) {
                  setBridgeStatus(prev => prev ? { ...prev, status: 'failed', error: `All bridge routes failed. Last error: ${currentTool} simulation failed.` } : null);
                  throw new Error(`Bridge failed after ${attempt + 1} attempt(s). No working route found for ${asset} -> ${outputAsset} on ${chain}. Try a larger amount or different destination chain.`);
                }

                // Exclude failed bridge and re-route
                deniedBridges.push(currentTool);
                console.log(`Excluding ${currentTool}, fetching alternative route...`);
                toast.loading(`${currentTool} failed, finding alternative route...`, { id: 'bridge-exec' });

                try {
                  const destChainId = DEST_CHAIN_IDS[chain] || 1;
                  const fromToken = SUI_TOKEN_ADDRESSES[asset];
                  const toToken = EVM_TOKEN_ADDRESSES[outputAsset]?.[destChainId];
                  if (!fromToken || !toToken) {
                    throw new Error(`No token address for ${!fromToken ? asset : outputAsset}`);
                  }

                  const fromDecimals = asset === 'SUI' || asset === 'WAL' ? 9 : 6;
                  const amount = parseFloat(bridgeNode.data.bridgeAmount || '0');
                  const fromAmount = Math.floor(amount * Math.pow(10, fromDecimals)).toString();

                  // Use destination address from the original route (resolved from ENS during quote fetch)
                  // The route.toAddress has the resolved 0x address, not the ENS name
                  let toAddress = activeRoute.toAddress;
                  if (!toAddress || toAddress === '0x0000000000000000000000000000000000000001') {
                    // Fallback: try to get from step action
                    toAddress = activeRoute.steps?.[0]?.action?.toAddress || bridgeNode.data.ethereumAddress || '0x0000000000000000000000000000000000000001';
                  }

                  const newRoutes = await getRoutes({
                    fromChainId: SUI_CHAIN_ID,
                    toChainId: destChainId,
                    fromTokenAddress: fromToken,
                    toTokenAddress: toToken,
                    fromAmount,
                    fromAddress: account!.address,
                    toAddress,
                    options: {
                      order: 'RECOMMENDED' as const,
                      denyBridges: deniedBridges,
                    },
                  });

                  if (!newRoutes.routes?.length) {
                    throw new Error('No alternative routes found');
                  }

                  activeRoute = newRoutes.routes[0];
                  console.log(`Found alternative route via ${activeRoute.steps[0]?.tool}`);
                } catch (rerouteError: any) {
                  toast.dismiss('bridge-exec');
                  setBridgeStatus(prev => prev ? { ...prev, status: 'failed', error: `No alternative routes available. ${rerouteError.message}` } : null);
                  throw new Error(`Bridge failed: ${currentTool} simulation failed and no alternative routes found. Try a larger amount or different destination chain.`);
                }
              }
            }

            // Show the modal with bridge tracking
            setLastResult({
              digest: suiResult?.digest || sourceTxHash || 'bridge-pending',
              stepCount: totalSteps,
              hasBridgeOperation: true,
            });
          }

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
