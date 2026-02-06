import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { ArrowLeftRight, AlertTriangle, CheckCircle, XCircle, Loader2, Info, ExternalLink } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { getRoutes } from '@lifi/sdk';
import { NodeMenu } from './NodeMenu';
import { ENSHelper } from '../ENSHelper';
import { TOKENS } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData } from '@/types';
import '@/config/lifi'; // Initialize LI.FI config

// LI.FI Chain IDs
const SUI_CHAIN_ID = '9270000000000000'; // Sui blockchain on LI.FI

// Supported destination chains for LI.FI (EVM chains)
const DESTINATION_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', chainId: '1' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', chainId: '137' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', chainId: '42161' },
  { id: 'optimism', name: 'Optimism', symbol: 'ETH', chainId: '10' },
  { id: 'base', name: 'Base', symbol: 'ETH', chainId: '8453' },
  { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', chainId: '43114' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB', chainId: '56' },
] as const;

// Token addresses for LI.FI quotes (Sui uses coin types, EVM uses addresses)
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  // Sui tokens (using Sui coin types)
  SUI: {
    [SUI_CHAIN_ID]: '0x2::sui::SUI',
  },
  USDC: {
    [SUI_CHAIN_ID]: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  },
  USDT: {
    [SUI_CHAIN_ID]: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
  },
  // EVM tokens
};

// EVM token addresses (keeping separate for clarity)
const EVM_TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  USDC: {
    '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    '137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
    '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    '43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC
  },
  USDT: {
    '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum
    '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
    '42161': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    '10': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
    '43114': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
    '56': '0x55d398326f99059fF775485246999027B3197955', // BSC
  },
  ETH: {
    '1': '0x0000000000000000000000000000000000000000', // Native ETH
    '137': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Wrapped ETH on Polygon
    '42161': '0x0000000000000000000000000000000000000000', // Native ETH
    '10': '0x0000000000000000000000000000000000000000', // Native ETH
    '8453': '0x0000000000000000000000000000000000000000', // Native ETH
  },
  WBTC: {
    '1': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Ethereum
    '137': '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // Polygon
    '42161': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // Arbitrum
  },
  DAI: {
    '1': '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum
    '137': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // Polygon
    '42161': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Arbitrum
    '10': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Optimism
  },
};

// Common assets available on most destination chains
const DESTINATION_ASSETS = [
  'ETH',
  'USDC',
  'USDT',
  'WBTC',
  'DAI',
  'MATIC',
  'AVAX',
  'BNB',
] as const;

// DeFi protocols available on destination chains
const DEFI_PROTOCOLS = [
  { id: 'none', name: 'Send to Wallet', description: 'Just bridge and send to your wallet' },
  { id: 'aave', name: 'Aave', description: 'Supply to Aave lending pool' },
  { id: 'lido', name: 'Lido', description: 'Stake ETH for stETH' },
  { id: 'uniswap-v3', name: 'Uniswap V3', description: 'Add liquidity to Uniswap pool' },
  { id: 'compound', name: 'Compound', description: 'Supply to Compound lending' },
] as const;

// Create viem client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'), // Public RPC endpoint
});

function BridgeNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();
  const [ensValidation, setEnsValidation] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    resolvedAddress: string | null;
  }>({ isValidating: false, isValid: null, resolvedAddress: null });

  const [bridgeQuote, setBridgeQuote] = useState<{
    estimatedOutput: string;
    estimatedOutputUsd: string;
    gasCosts: string;
    route?: any;
    lifiRoute?: any; // Full LI.FI route object for execution
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.bridgeAsset || 'SUI') as keyof typeof TOKENS;
  const selectedOutputAsset = nodeData.bridgeOutputAsset || 'USDC';

  const { data: suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const { data: usdcBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDC.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const { data: usdtBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDT.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const { data: walBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.WAL.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Get effective balances
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Format balance for dropdown display
  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const effectiveBal = effectiveBalances.find(b => b.symbol === tokenKey);
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : tokenKey === 'USDT' ? usdtBalance : walBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Get sequence number
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Validate ENS name with real resolution
  useEffect(() => {
    const ethereumAddress = nodeData.ethereumAddress;

    if (!ethereumAddress) {
      setEnsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // If it's a regular Ethereum address (0x...), no validation needed
    if (ethereumAddress.startsWith('0x') && ethereumAddress.length === 42) {
      setEnsValidation({ isValidating: false, isValid: null, resolvedAddress: null });
      return;
    }

    // Check if it's a valid ENS name (.eth domain)
    if (ethereumAddress.endsWith('.eth')) {
      setEnsValidation({ isValidating: true, isValid: null, resolvedAddress: null });

      const validateName = async () => {
        try {
          // Use viem to resolve ENS name
          const resolvedAddress = await publicClient.getEnsAddress({
            name: normalize(ethereumAddress),
          });

          if (resolvedAddress) {
            setEnsValidation({
              isValidating: false,
              isValid: true,
              resolvedAddress,
            });
          } else {
            // ENS name doesn't resolve
            setEnsValidation({
              isValidating: false,
              isValid: false,
              resolvedAddress: null,
            });
          }
        } catch (error) {
          console.error('ENS validation error:', error);
          setEnsValidation({
            isValidating: false,
            isValid: false,
            resolvedAddress: null,
          });
        }
      };

      // Debounce ENS resolution
      const timeoutId = setTimeout(validateName, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [nodeData.ethereumAddress]);

  // Check balance validation
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
    if (!effectiveBal) return null;

    const availableBalance = parseFloat(effectiveBal.balance);
    const bridgeAmount = parseFloat(nodeData.bridgeAmount || '0');

    if (bridgeAmount <= 0) return null;

    if (bridgeAmount > availableBalance) {
      return {
        type: 'error' as const,
        message: `Insufficient ${selectedAsset}. Available: ${availableBalance.toFixed(selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2)} ${selectedAsset}`,
      };
    }

    return null;
  }, [account, nodeData.bridgeAmount, selectedAsset, effectiveBalances]);

  // Calculate estimated output using LI.FI quote or approximation
  const estimatedOutput = useMemo(() => {
    const bridgeAmount = parseFloat(nodeData.bridgeAmount || '0');
    const outputAsset = selectedOutputAsset;

    if (bridgeAmount <= 0 || !nodeData.bridgeChain || !outputAsset) return null;

    const destinationChain = DESTINATION_CHAINS.find(c => c.id === nodeData.bridgeChain);

    // If we have a quote (real or approximate), use it
    if (bridgeQuote && bridgeQuote.estimatedOutput) {
      // Determine decimals for output asset
      let outputDecimals = 6; // Default for USDC/USDT/DAI
      if (outputAsset === 'ETH' || outputAsset === 'AVAX' || outputAsset === 'BNB' || outputAsset === 'MATIC') {
        outputDecimals = 18;
      } else if (outputAsset === 'WBTC') {
        outputDecimals = 8;
      }

      const outputAmount = parseFloat(bridgeQuote.estimatedOutput) / Math.pow(10, outputDecimals);
      const outputUsd = parseFloat(bridgeQuote.estimatedOutputUsd || '0');

      // Calculate input USD value
      const inputPrice = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 1.0 :
                        selectedAsset === 'USDC' || selectedAsset === 'USDT' ? 1.0 : 1.0;
      const inputUsd = bridgeAmount * inputPrice;

      // Calculate fee percentage
      const feePercent = inputUsd > 0 && outputUsd > 0 ?
        ((inputUsd - outputUsd) / inputUsd) * 100 : 0.1;

      return {
        amount: outputAmount,
        asset: outputAsset,
        chain: destinationChain?.name || 'destination chain',
        feePercent: Math.max(0, feePercent),
        isRealQuote: !!bridgeQuote.route,
      };
    }

    // If loading, return null
    if (quoteLoading) {
      return null;
    }

    // If no quote available, return null
    return null;
  }, [nodeData.bridgeAmount, nodeData.bridgeChain, selectedOutputAsset, selectedAsset, bridgeQuote, quoteLoading]);

  const updateNodeData = useCallback(
    (updates: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );

  // Set default output asset if not set
  useEffect(() => {
    if (!nodeData.bridgeOutputAsset) {
      updateNodeData({ bridgeOutputAsset: 'USDC' });
    }
  }, [nodeData.bridgeOutputAsset, updateNodeData]);

  // Fetch real LI.FI quote for EVM-side operations
  useEffect(() => {
    const fetchQuote = async () => {
      const amount = parseFloat(nodeData.bridgeAmount || '0');
      const fromAsset = selectedAsset;
      const toAsset = selectedOutputAsset;
      const chainId = nodeData.bridgeChain;

      // Don't fetch if required fields are missing
      if (!amount || amount <= 0 || !fromAsset || !toAsset || !chainId) {
        setBridgeQuote(null);
        setQuoteError(null);
        return;
      }

      // Find the destination chain info
      const destChain = DESTINATION_CHAINS.find(c => c.id === chainId);
      if (!destChain) {
        setQuoteError('Unsupported destination chain');
        return;
      }

      setQuoteLoading(true);
      setQuoteError(null);

      try {
        console.log('🔍 Fetching REAL LI.FI quote...');
        console.log(`  From: ${amount} ${fromAsset} on Sui (Chain ID: ${SUI_CHAIN_ID})`);
        console.log(`  To: ${toAsset} on ${destChain?.name} (Chain ID: ${destChain.chainId})`);
        console.log(`  API Key configured: ${!!import.meta.env.VITE_LIFI_API_KEY}`);

        // Get token addresses
        const fromTokenAddr = TOKEN_ADDRESSES[fromAsset]?.[SUI_CHAIN_ID];
        const toTokenAddr = EVM_TOKEN_ADDRESSES[toAsset]?.[destChain.chainId];

        if (!fromTokenAddr || !toTokenAddr) {
          console.error('Token addresses not available!');
          console.error(`  From: ${fromAsset} on Sui (${SUI_CHAIN_ID}): ${fromTokenAddr}`);
          console.error(`  To: ${toAsset} on ${destChain?.name} (${destChain.chainId}): ${toTokenAddr}`);
          throw new Error(`Token ${!fromTokenAddr ? fromAsset : toAsset} not supported for bridging`);
        }

        // Calculate amount in smallest units (Sui uses 9 decimals for SUI, 6 for USDC/USDT)
        const fromDecimals = fromAsset === 'SUI' ? 9 : 6;
        const amountInSmallestUnit = Math.floor(amount * Math.pow(10, fromDecimals)).toString();

        // Get the destination Ethereum address
        const ethereumAddress = nodeData.ethereumAddress;

        // For quotes, we need a valid Ethereum address as toAddress
        let toAddress = ethereumAddress;

        // If ENS name, use resolved address if available
        if (ethereumAddress?.endsWith('.eth')) {
          if (ensValidation.resolvedAddress) {
            toAddress = ensValidation.resolvedAddress;
            console.log(`  Using resolved ENS: ${ethereumAddress} → ${toAddress}`);
          } else {
            // ENS not resolved yet, use placeholder
            toAddress = '0x0000000000000000000000000000000000000001';
            console.log(`  ENS not resolved yet, using placeholder`);
          }
        }

        // If no address entered, use placeholder for quote
        if (!toAddress) {
          toAddress = '0x0000000000000000000000000000000000000001';
        }

        // Validate Ethereum address format
        if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
          throw new Error('Invalid Ethereum address format');
        }

        // Use LI.FI SDK to get routes
        console.log('📡 Calling LI.FI SDK getRoutes()...');
        console.log(`  From: ${fromAsset} on Sui (${SUI_CHAIN_ID})`);
        console.log(`  To: ${toAsset} on ${destChain.name} (${destChain.chainId})`);
        console.log(`  Amount: ${amount} ${fromAsset} (${amountInSmallestUnit} smallest units)`);
        console.log(`  From Address: ${account?.address?.slice(0, 10)}...`);
        console.log(`  To Address: ${toAddress}`);

        const routesRequest = {
          fromChainId: parseInt(SUI_CHAIN_ID),
          toChainId: parseInt(destChain.chainId),
          fromTokenAddress: fromTokenAddr,
          toTokenAddress: toTokenAddr,
          fromAmount: amountInSmallestUnit,
          fromAddress: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000',
          toAddress: toAddress,
          options: {
            order: 'RECOMMENDED' as const, // Get best route
          },
        };

        const routesResult = await getRoutes(routesRequest);

        if (!routesResult.routes || routesResult.routes.length === 0) {
          throw new Error('No routes found for this bridge operation');
        }

        // Get the best (first) route
        const bestRoute = routesResult.routes[0];

        console.log('✅ REAL LI.FI route received from SDK!');
        console.log('  Output:', bestRoute.toAmount, 'smallest units');
        console.log('  USD Value:', bestRoute.toAmountUSD);
        console.log('  Gas Cost:', bestRoute.gasCostUSD || '0', 'USD');
        console.log('  Tool:', bestRoute.steps[0]?.tool);
        console.log('  Steps:', bestRoute.steps.length);

        setBridgeQuote({
          estimatedOutput: bestRoute.toAmount,
          estimatedOutputUsd: bestRoute.toAmountUSD,
          gasCosts: bestRoute.gasCostUSD || '0',
          route: bestRoute,
          lifiRoute: bestRoute, // Store full route for execution
        });

        // Save route to node data for execution
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  lifiRoute: bestRoute,
                },
              };
            }
            return node;
          })
        );
      } catch (error: any) {
        console.error('Failed to fetch LI.FI quote:', error);
        setQuoteError(error.message || 'Failed to fetch quote');
        setBridgeQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    // Debounce the quote fetch
    const timeoutId = setTimeout(fetchQuote, 800);
    return () => clearTimeout(timeoutId);
  }, [nodeData.bridgeAmount, selectedAsset, selectedOutputAsset, nodeData.bridgeChain, account, ensValidation.resolvedAddress]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
    },
    [id, setNodes]
  );

  const handleReplace = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            type: 'selector',
            data: {
              label: 'Select Action',
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-purple-500 dark:border-purple-600 rounded-lg shadow-lg min-w-[280px]">
      {/* Header */}
      <div className="bg-purple-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* Destination Chain */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Destination Chain
          </label>
          <select
            value={nodeData.bridgeChain || 'ethereum'}
            onChange={(e) => updateNodeData({ bridgeChain: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          >
            {DESTINATION_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ethereum Address Input */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            To Ethereum Address
          </label>
          <input
            type="text"
            value={nodeData.ethereumAddress || ''}
            onChange={(e) => updateNodeData({ ethereumAddress: e.target.value })}
            placeholder="0x... or name.eth"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          />

          {/* ENS Validation */}
          {nodeData.ethereumAddress && nodeData.ethereumAddress.endsWith('.eth') && (
            <div className="mt-1">
              {ensValidation.isValidating && (
                <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resolving ENS name...</span>
                </div>
              )}
              {!ensValidation.isValidating && ensValidation.isValid === true && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>Valid ENS name</span>
                  </div>
                  {ensValidation.resolvedAddress && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded p-1">
                      <span className="flex-1 truncate">
                        → {ensValidation.resolvedAddress.slice(0, 6)}...{ensValidation.resolvedAddress.slice(-4)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <div className="group relative">
                          <Info className="w-3 h-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                            {ensValidation.resolvedAddress}
                          </div>
                        </div>
                        <a
                          href={`https://etherscan.io/address/${ensValidation.resolvedAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View on Etherscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!ensValidation.isValidating && ensValidation.isValid === false && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <XCircle className="w-3 h-3" />
                  <span>This ENS name could not be resolved</span>
                </div>
              )}
            </div>
          )}

          {(!nodeData.ethereumAddress || (!nodeData.ethereumAddress.endsWith('.eth') && !nodeData.ethereumAddress.startsWith('0x'))) && (
            <ENSHelper onSelectName={(name) => updateNodeData({ ethereumAddress: name })} />
          )}
        </div>

        {/* Input Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">From Asset</label>
          <select
            value={nodeData.bridgeAsset || 'SUI'}
            onChange={(e) => updateNodeData({ bridgeAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
            <option value="WAL">{formatBalanceForDropdown('WAL')}</option>
          </select>
        </div>

        {/* Output Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">To Asset</label>
          <select
            value={selectedOutputAsset}
            onChange={(e) => updateNodeData({ bridgeOutputAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          >
            {DESTINATION_ASSETS.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
        </div>

        {/* DeFi Protocol Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block flex items-center gap-1">
            Destination Protocol
            <span className="text-purple-600 dark:text-purple-400">✨</span>
          </label>
          <select
            value={nodeData.bridgeProtocol || 'none'}
            onChange={(e) => updateNodeData({ bridgeProtocol: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          >
            {DEFI_PROTOCOLS.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {DEFI_PROTOCOLS.find(p => p.id === (nodeData.bridgeProtocol || 'none'))?.description}
          </p>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.bridgeAmount || ''}
            onChange={(e) => updateNodeData({ bridgeAmount: e.target.value })}
            placeholder="0.0"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-purple-500"
          />
          {(() => {
            const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
            if (effectiveBal && effectiveBalances.length > 0) {
              const amount = parseFloat(effectiveBal.balance);
              const displayDecimals = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2;
              return (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: {amount.toFixed(displayDecimals)} {selectedAsset}
                </p>
              );
            }
            return null;
          })()}

          {balanceWarning && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">
                {balanceWarning.message}
              </p>
            </div>
          )}
        </div>

        {/* Estimated Output Display */}
        {quoteLoading && parseFloat(nodeData.bridgeAmount || '0') > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
              <span className="text-xs text-purple-700 dark:text-purple-300">Fetching quote...</span>
            </div>
          </div>
        )}
        {!quoteLoading && quoteError && parseFloat(nodeData.bridgeAmount || '0') > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-600 dark:text-red-400">
                <div className="font-semibold">Quote unavailable</div>
                <div className="mt-0.5">{quoteError}</div>
              </div>
            </div>
          </div>
        )}
        {!quoteLoading && !quoteError && estimatedOutput && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-3 py-2">
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
              You Will Receive
              {estimatedOutput.isRealQuote && bridgeQuote?.route && (
                <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓ LI.FI</span>
              )}
            </div>
            <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              ~{(() => {
                // Format based on output asset type
                const asset = estimatedOutput.asset;
                if (asset === 'USDC' || asset === 'USDT' || asset === 'DAI') {
                  return estimatedOutput.amount.toFixed(2);
                } else if (asset === 'WBTC') {
                  return estimatedOutput.amount.toFixed(6);
                } else {
                  return estimatedOutput.amount.toFixed(4);
                }
              })()} {estimatedOutput.asset}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              on {estimatedOutput.chain}
            </div>
            {(() => {
              const protocol = nodeData.bridgeProtocol || 'none';
              const protocolInfo = DEFI_PROTOCOLS.find(p => p.id === protocol);

              if (protocol !== 'none' && protocolInfo) {
                return (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium flex items-center gap-1">
                    <span>→ {protocolInfo.name}</span>
                    {bridgeQuote?.route && <span className="text-green-600 dark:text-green-400">via LI.FI</span>}
                  </div>
                );
              }
              return null;
            })()}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Est. fee: ~{estimatedOutput.feePercent.toFixed(2)}%
            </div>
            {bridgeQuote?.route && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                Powered by LI.FI routing
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💜 Powered by LI.FI - Cross-chain bridge aggregator
        </p>
      </div>

      {/* Only input handle - bridge is terminal node */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(BridgeNode);
