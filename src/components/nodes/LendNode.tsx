import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes } from '@xyflow/react';
import { Landmark } from 'lucide-react';
import { useSuiClient, useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NodeMenu } from './NodeMenu';
import { TOKENS } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import type { NodeData } from '@/types';

function LendNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const nodeData = data as NodeData;
  const suiClient = useSuiClient();
  const account = useCurrentAccount();

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.lendAsset || 'SUI') as keyof typeof TOKENS;

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

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Format balance for dropdown display with effective balance
  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const effectiveBal = effectiveBalances.find(b => b.symbol === tokenKey);
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      const displayDecimals = tokenKey === 'SUI' ? 4 : 2;
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    // Fallback to wallet balance
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : usdtBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Calculate sequence number
  const sequenceNumber = useMemo(() => {
    return nodeData.sequenceNumber || 0;
  }, [nodeData.sequenceNumber]);

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
    <div className="bg-white dark:bg-gray-800 border-2 border-orange-500 dark:border-orange-600 rounded-lg shadow-lg min-w-[320px] max-w-[400px]">
      {/* Header */}
      <div className="bg-orange-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}
            {nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* Action Type */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Action
          </label>
          <select
            value={nodeData.lendAction || 'deposit'}
            onChange={(e) => updateNodeData({ lendAction: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="deposit">Deposit (Lend)</option>
            <option value="withdraw">Withdraw</option>
            <option value="borrow">Borrow</option>
            <option value="repay">Repay</option>
          </select>
        </div>

        {/* Asset */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Asset
          </label>
          <select
            value={nodeData.lendAsset || 'SUI'}
            onChange={(e) => updateNodeData({ lendAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Amount
          </label>
          <input
            type="number"
            step="0.000001"
            value={nodeData.lendAmount || ''}
            onChange={(e) => updateNodeData({ lendAmount: e.target.value })}
            placeholder="1.0"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          />
          {/* Show available balance */}
          {(() => {
            const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
            if (effectiveBal && effectiveBalances.length > 0) {
              const amount = parseFloat(effectiveBal.balance);
              const displayDecimals = selectedAsset === 'SUI' ? 4 : 2;
              return (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: {amount.toFixed(displayDecimals)} {selectedAsset}
                </p>
              );
            }
            return null;
          })()}
        </div>

        {/* Protocol */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            Protocol
          </label>
          <select
            value={nodeData.lendProtocol || 'scallop'}
            onChange={(e) => updateNodeData({ lendProtocol: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          >
            <option value="scallop">Scallop</option>
            <option value="navi">Navi Protocol</option>
          </select>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          💡 Currently supports Scallop deposit. More actions coming soon!
        </p>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-orange-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(LendNode);
