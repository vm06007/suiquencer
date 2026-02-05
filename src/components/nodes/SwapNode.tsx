import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Repeat, Plus, X, AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { TOKENS } from '@/config/tokens';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import type { NodeData } from '@/types';

function SwapNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();

  // Get wallet balances for all assets
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

  // Calculate sequence number
  const { sequenceNumber, cumulativeAmount, totalAmount } = useMemo(() => {
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return { sequenceNumber: 0, cumulativeAmount: 0, totalAmount: 0 };

    let counter = 0;
    let cumulative = 0;
    let total = 0;
    let foundThisNode = false;
    const visited = new Set<string>();

    const traverse = (nodeId: string): number | null => {
      if (visited.has(nodeId)) return null;
      visited.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);

      if (!node || node.type === 'wallet') {
        const outgoing = edges.filter(e => e.source === nodeId);
        // Sort edges by target node position (Y first, then X) for consistent ordering
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find(n => n.id === a.target);
          const targetB = nodes.find(n => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      if (node.type === 'selector') {
        const outgoing = edges.filter(e => e.source === nodeId);
        // Sort edges by target node position for consistent ordering
        const sortedEdges = outgoing.sort((a, b) => {
          const targetA = nodes.find(n => n.id === a.target);
          const targetB = nodes.find(n => n.id === b.target);
          if (!targetA || !targetB) return 0;
          if (Math.abs(targetA.position.y - targetB.position.y) > 50) {
            return targetA.position.y - targetB.position.y;
          }
          return targetA.position.x - targetB.position.x;
        });
        for (const edge of sortedEdges) {
          const result = traverse(edge.target);
          if (result !== null) return result;
        }
        return null;
      }

      counter++;
      const amount = parseFloat(String(node.data.amount ?? '0'));

      if (!foundThisNode) {
        cumulative += amount;
      }
      total += amount;

      if (nodeId === id) {
        foundThisNode = true;
        return counter;
      }

      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return { sequenceNumber: counter, cumulativeAmount: cumulative, totalAmount: total };
  }, [id, nodes, edges]);

  // Get balance for the from asset
  const fromAsset = (nodeData.fromAsset || 'SUI') as keyof typeof TOKENS;
  const fromBalance = fromAsset === 'SUI' ? suiBalance : fromAsset === 'USDC' ? usdcBalance : usdtBalance;

  // Check balance validation for from asset (reserve gas when spending native SUI)
  const balanceWarning = useMemo(() => {
    if (!fromBalance || !account) return null;

    const decimals = TOKENS[fromAsset].decimals;
    const balanceInToken = parseInt(fromBalance.totalBalance) / Math.pow(10, decimals);
    const currentAmount = parseFloat(nodeData.amount || '0');
    const gasReserve = fromAsset === 'SUI' ? 0.5 : 0;
    const availableBalance = balanceInToken - gasReserve;
    const displayDecimals = fromAsset === 'SUI' ? 4 : 2;

    if (currentAmount > availableBalance) {
      const balanceMsg = fromAsset === 'SUI'
        ? `available balance: ${availableBalance.toFixed(displayDecimals)} ${fromAsset} (0.5 SUI reserved for gas)`
        : `wallet balance (${balanceInToken.toFixed(displayDecimals)} ${fromAsset})`;
      return {
        type: 'error' as const,
        message: `Exceeds ${balanceMsg}`,
      };
    }

    if (cumulativeAmount > availableBalance) {
      return {
        type: 'error' as const,
        message: `Cumulative total (${cumulativeAmount.toFixed(displayDecimals)} ${fromAsset}) exceeds available balance (${availableBalance.toFixed(displayDecimals)})`,
      };
    }

    if (totalAmount > availableBalance) {
      return {
        type: 'warning' as const,
        message: `Total sequence (${totalAmount.toFixed(displayDecimals)} ${fromAsset}) exceeds available balance (${availableBalance.toFixed(displayDecimals)})`,
      };
    }

    return null;
  }, [fromBalance, account, nodeData.amount, cumulativeAmount, totalAmount, fromAsset]);

  // Fetch real-time swap quote
  const swapQuote = useSwapQuote(
    nodeData.fromAsset,
    nodeData.toAsset,
    nodeData.amount,
    !!account
  );

  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : usdtBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  const updateNodeData = useCallback((updates: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  return (
    <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-blue-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}{nodeData.label}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="text-white hover:text-red-200 transition-colors"
          title="Delete node"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* From Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">From</label>
          <select
            value={nodeData.fromAsset || 'SUI'}
            onChange={(e) => updateNodeData({ fromAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value })}
            placeholder="0.0"
            className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none ${
              balanceWarning?.type === 'error'
                ? 'border-red-500 focus:border-red-600'
                : balanceWarning?.type === 'warning'
                ? 'border-yellow-500 focus:border-yellow-600'
                : 'border-gray-300 focus:border-blue-500'
            }`}
          />
          {balanceWarning && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${
                balanceWarning.type === 'error' ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{balanceWarning.message}</span>
            </div>
          )}
        </div>

        {/* To Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">To</label>
          <select
            value={nodeData.toAsset || 'USDC'}
            onChange={(e) => updateNodeData({ toAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="SUI">SUI</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>

        {/* Estimated Output */}
        <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
          <div className="text-xs text-gray-600 mb-0.5">Estimated Output</div>
          {swapQuote.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Fetching quote...</span>
            </div>
          ) : swapQuote.error ? (
            <div className="text-xs text-red-600">{swapQuote.error}</div>
          ) : swapQuote.estimatedAmountOut ? (
            <>
              <div className="text-sm font-semibold text-blue-700">
                ~{swapQuote.estimatedAmountOut} {nodeData.toAsset || 'USDC'}
              </div>
              {swapQuote.priceImpact && (
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${
                  parseFloat(swapQuote.priceImpact) > 5 ? 'text-red-600' :
                  parseFloat(swapQuote.priceImpact) > 2 ? 'text-yellow-600' :
                  'text-gray-500'
                }`}>
                  <TrendingDown className="w-3 h-3" />
                  <span>Price impact: {swapQuote.priceImpact}%</span>
                </div>
              )}
              {nodeData.amount && swapQuote.estimatedAmountOut && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Rate: 1 {nodeData.fromAsset || 'SUI'} ≈ {(parseFloat(swapQuote.estimatedAmountOut) / parseFloat(nodeData.amount)).toFixed(6)} {nodeData.toAsset || 'USDC'}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-500">
              {nodeData.amount ? 'Enter amount to see quote' : 'No quote available'}
            </div>
          )}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-3 !h-3"
      />

      {/* Add Sequence button */}
      <div className="border-t border-gray-200 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            const event = new CustomEvent('addNode', {
              detail: { sourceNodeId: id }
            });
            window.dispatchEvent(event);
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Sequence</span>
        </button>
      </div>
    </div>
  );
}

export default memo(SwapNode);
