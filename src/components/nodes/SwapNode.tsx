import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Repeat, Plus, AlertTriangle, Loader2, TrendingDown } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { TOKENS, SUI_GAS_RESERVE } from '@/config/tokens';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { NodeMenu } from './NodeMenu';
import type { NodeData } from '@/types';

function SwapNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Track previous outgoing edges to detect when connections change
  const prevOutgoingEdgesRef = useRef<string>('');

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

  // Get balance for the from asset (needed for per-asset cumulative)
  const fromAsset = (nodeData.fromAsset || 'SUI') as keyof typeof TOKENS;

  // Calculate sequence number and cumulative amounts (per asset — only sum same token)
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

      // Sequence node: only count amount that spends the same from-asset as this swap
      counter++;
      const amount = parseFloat(String(node.data.amount ?? '0'));
      const nodeFromAsset = node.type === 'transfer'
        ? (node.data.asset || 'SUI')
        : node.type === 'swap'
        ? (node.data.fromAsset as string)
        : null;
      const amountOfThisAsset = nodeFromAsset === fromAsset ? amount : 0;

      if (!foundThisNode) {
        cumulative += amountOfThisAsset;
      }
      total += amountOfThisAsset;

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
  }, [id, nodes, edges, fromAsset]);

  const fromBalance = fromAsset === 'SUI' ? suiBalance : fromAsset === 'USDC' ? usdcBalance : usdtBalance;

  // Check balance validation for from asset (reserve SUI for gas when spending native SUI)
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    // Get original wallet balance for cumulative checks
    let walletBalance: number;
    if (fromBalance) {
      const decimals = TOKENS[fromAsset].decimals;
      walletBalance = parseInt(fromBalance.totalBalance) / Math.pow(10, decimals);
    } else {
      return null;
    }

    // Use effective balance for current amount check
    const effectiveBal = effectiveBalances.find(b => b.symbol === fromAsset);
    const effectiveBalance = effectiveBal && effectiveBalances.length > 0
      ? parseFloat(effectiveBal.balance)
      : walletBalance;

    const currentAmount = parseFloat(nodeData.amount || '0');
    const gasReserve = fromAsset === 'SUI' ? SUI_GAS_RESERVE : 0;
    const displayDecimals = fromAsset === 'SUI' ? 4 : 2;

    // Total available balance (wallet - gas reserve) - used for cumulative checks
    const totalAvailable = walletBalance - gasReserve;

    // Check if this individual swap exceeds current effective balance
    if (currentAmount > effectiveBalance) {
      const message = fromAsset === 'SUI'
        ? `Not enough for fees — leave ~${SUI_GAS_RESERVE} SUI for gas. Available: ${effectiveBalance.toFixed(displayDecimals)} SUI`
        : `Exceeds available balance (${effectiveBalance.toFixed(displayDecimals)} ${fromAsset})`;
      return {
        type: 'error' as const,
        message,
      };
    }

    // Check if cumulative amount exceeds total available (wallet - gas)
    if (cumulativeAmount > totalAvailable) {
      return {
        type: 'error' as const,
        message: `Cumulative total (${cumulativeAmount.toFixed(displayDecimals)} ${fromAsset}) exceeds available (${totalAvailable.toFixed(displayDecimals)})`,
      };
    }

    // Warning if total sequence exceeds available
    if (totalAmount > totalAvailable) {
      return {
        type: 'warning' as const,
        message: `Total sequence (${totalAmount.toFixed(displayDecimals)} ${fromAsset}) exceeds available (${totalAvailable.toFixed(displayDecimals)})`,
      };
    }

    return null;
  }, [fromBalance, account, nodeData.amount, cumulativeAmount, totalAmount, fromAsset, effectiveBalances]);

  // Fetch real-time swap quote
  const swapQuote = useSwapQuote(
    nodeData.fromAsset,
    nodeData.toAsset,
    nodeData.amount,
    !!account
  );

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

  const updateNodeData = useCallback((updates: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [id, setNodes]);

  // Ensure fromAsset and toAsset are never the same
  useEffect(() => {
    const from = nodeData.fromAsset || 'SUI';
    const to = nodeData.toAsset || 'USDC';

    if (from === to) {
      // Auto-select a different toAsset
      const availableTokens = (['SUI', 'USDC', 'USDT'] as const).filter(token => token !== from);
      if (availableTokens.length > 0) {
        updateNodeData({ toAsset: availableTokens[0] });
      }
    }
  }, [nodeData.fromAsset, nodeData.toAsset, updateNodeData]);

  // Store estimated output in node data for downstream nodes
  useEffect(() => {
    if (swapQuote.estimatedAmountOut && nodeData.toAsset) {
      updateNodeData({
        estimatedAmountOut: swapQuote.estimatedAmountOut,
        estimatedAmountOutSymbol: nodeData.toAsset,
      });
    }
  }, [swapQuote.estimatedAmountOut, nodeData.toAsset, updateNodeData]);

  // Update all connected transfer nodes with split amounts when output changes
  useEffect(() => {
    if (!swapQuote.estimatedAmountOut || !nodeData.toAsset) return;

    setNodes((nds) => {
      const outgoingEdges = edges.filter((e) => e.source === id);

      // Track edge changes
      const edgeKey = outgoingEdges.map((e) => e.target).sort().join(',');
      const edgesChanged = edgeKey !== prevOutgoingEdgesRef.current;
      if (edgesChanged) {
        prevOutgoingEdgesRef.current = edgeKey;
      }

      const transferTargetIds = new Set(
        outgoingEdges
          .map((edge) => {
            const targetNode = nds.find((n) => n.id === edge.target);
            return targetNode?.type === 'transfer' ? edge.target : null;
          })
          .filter(Boolean) as string[]
      );

      if (transferTargetIds.size === 0) return nds;

      const totalOutput = parseFloat(swapQuote.estimatedAmountOut);
      if (Number.isNaN(totalOutput)) return nds;

      const splitAmount = totalOutput / transferTargetIds.size;
      const amountStr = splitAmount <= 0 ? '0' : splitAmount < 0.0001 ? splitAmount.toExponential(2) : splitAmount.toFixed(6);

      // Check if any updates are needed
      const needsUpdate = nds.some((node) => {
        if (!transferTargetIds.has(node.id)) return false;
        const targetData = node.data as NodeData;
        // Skip if user manually edited AND edges haven't changed
        if (targetData.amountManuallyEdited && !edgesChanged) return false;
        return targetData.asset !== nodeData.toAsset || targetData.amount !== amountStr;
      });

      if (!needsUpdate) return nds;

      return nds.map((node) => {
        if (transferTargetIds.has(node.id)) {
          const targetData = node.data as NodeData;
          // Skip auto-sync if user has manually edited AND edges haven't changed
          if (targetData.amountManuallyEdited && !edgesChanged) return node;
          // If values are already correct, don't update
          if (targetData.asset === nodeData.toAsset && targetData.amount === amountStr) return node;

          return {
            ...node,
            data: {
              ...node.data,
              asset: nodeData.toAsset,
              amount: amountStr,
              amountManuallyEdited: false, // Reset flag when auto-updating
            },
          };
        }
        return node;
      });
    });
  }, [swapQuote.estimatedAmountOut, nodeData.toAsset, edges, id, setNodes]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [id, setNodes]);

  const handleReplace = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id
          ? {
              ...node,
              type: 'selector',
              data: {
                label: 'Select Action',
                type: 'protocol',
              },
            }
          : node
      )
    );
  }, [id, setNodes]);

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-lg min-w-[280px]">
      <div className="bg-blue-500 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-white" />
          <span className="font-semibold text-white text-sm">
            {sequenceNumber > 0 && `${sequenceNumber}. `}{nodeData.label}
          </span>
        </div>
        <NodeMenu onDelete={handleDelete} onReplace={handleReplace} />
      </div>

      <div className="p-4 space-y-3">
        {/* From Asset Selection */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">From</label>
          <select
            value={nodeData.fromAsset || 'SUI'}
            onChange={(e) => updateNodeData({ fromAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            <option value="SUI">{formatBalanceForDropdown('SUI')}</option>
            <option value="USDC">{formatBalanceForDropdown('USDC')}</option>
            <option value="USDT">{formatBalanceForDropdown('USDT')}</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Amount</label>
          <input
            type="text"
            value={nodeData.amount || ''}
            onChange={(e) => updateNodeData({ amount: e.target.value })}
            placeholder="0.0"
            className={`w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none ${
              balanceWarning?.type === 'error'
                ? 'border-red-500 focus:border-red-600'
                : balanceWarning?.type === 'warning'
                ? 'border-yellow-500 focus:border-yellow-600'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
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
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">To</label>
          <select
            value={nodeData.toAsset || 'USDC'}
            onChange={(e) => updateNodeData({ toAsset: e.target.value })}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
          >
            {(['SUI', 'USDC', 'USDT'] as const)
              .filter(token => token !== (nodeData.fromAsset || 'SUI'))
              .map(token => (
                <option key={token} value={token}>
                  {formatBalanceForDropdown(token)}
                </option>
              ))
            }
          </select>
        </div>

        {/* Estimated Output */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
          <div className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Estimated Output</div>
          {swapQuote.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Fetching quote...</span>
            </div>
          ) : swapQuote.error ? (
            <div className="text-xs text-red-600 dark:text-red-400">{swapQuote.error}</div>
          ) : swapQuote.estimatedAmountOut ? (
            <>
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
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
      <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-center">
        <button
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded transition-colors"
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
