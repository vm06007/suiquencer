import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Bridge, AlertTriangle } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NodeMenu } from './NodeMenu';
import { TOKENS } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData } from '@/types';

// Supported destination chains for LI.FI
const DESTINATION_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH' },
  { id: 'optimism', name: 'Optimism', symbol: 'ETH' },
  { id: 'base', name: 'Base', symbol: 'ETH' },
  { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX' },
  { id: 'bsc', name: 'BNB Chain', symbol: 'BNB' },
] as const;

function BridgeNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.bridgeAsset || 'SUI') as keyof typeof TOKENS;

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
          <Bridge className="w-4 h-4 text-white" />
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

        {/* Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Asset</label>
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

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💜 Powered by LI.FI - Cross-chain bridge aggregator
        </p>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(BridgeNode);
