import { memo, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Repeat, Plus, AlertTriangle, Loader2, TrendingDown, X } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { TOKENS, SUI_GAS_RESERVE } from '@/config/tokens';
import { useSwapQuote } from '@/hooks/useSwapQuote';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import { NodeMenu } from './NodeMenu';
import type { NodeData } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';

function SwapNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();
  const [showSettings, setShowSettings] = useState(false);

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

  const { data: cetusBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.CETUS.coinType },
    { enabled: !!account }
  );

  const { data: deepBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.DEEP.coinType },
    { enabled: !!account }
  );

  const { data: blueBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.BLUE.coinType },
    { enabled: !!account }
  );

  const { data: buckBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.BUCK.coinType },
    { enabled: !!account }
  );

  const { data: ausdBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.AUSD.coinType },
    { enabled: !!account }
  );

  const swapBalanceMap: Record<string, typeof suiBalance> = {
    SUI: suiBalance, USDC: usdcBalance, USDT: usdtBalance, WAL: walBalance,
    CETUS: cetusBalance, DEEP: deepBalance, BLUE: blueBalance, BUCK: buckBalance, AUSD: ausdBalance,
  };

  // Get balance for the from asset (needed for per-asset cumulative)
  const fromAsset = (nodeData.fromAsset || 'SUI') as keyof typeof TOKENS;

  // Get sequence number from shared hook (uses topological sort)
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Calculate cumulative amounts (per asset — only sum same token)
  const { cumulativeAmount, totalAmount } = useMemo(() => {
    const walletNode = nodes.find(n => n.type === 'wallet');
    if (!walletNode) return { cumulativeAmount: 0, totalAmount: 0 };

    let cumulative = 0;
    let total = 0;
    let foundThisNode = false;
    const visited = new Set<string>();

    const traverse = (nodeId: string): boolean | null => {
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
        return true;
      }

      const outgoing = edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        const result = traverse(edge.target);
        if (result !== null) return result;
      }

      return null;
    };

    traverse(walletNode.id);
    return { cumulativeAmount: cumulative, totalAmount: total };
  }, [id, nodes, edges, fromAsset]);

  const fromBalance = swapBalanceMap[fromAsset] || null;

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
    const displayDecimals = fromAsset === 'SUI' || fromAsset === 'WAL' ? 4 : 2;

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
    const displayDecimals = TOKENS[tokenKey].decimals === 9 ? 4 : 2;
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    // Fallback to wallet balance
    const tokenBalance = swapBalanceMap[tokenKey] || null;
    if (!tokenBalance) return tokenKey;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, TOKENS[tokenKey].decimals);
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Tokens from predecessor operations or wallet not in the standard 4
  const extraTokens = useMemo(() => {
    const standardTokens = new Set(['SUI', 'USDC', 'USDT', 'WAL']);
    const extras: string[] = [];
    // From effective balances (predecessor operations)
    for (const b of effectiveBalances) {
      if (!standardTokens.has(b.symbol) && parseFloat(b.balance) > 0 && b.symbol in TOKENS) {
        extras.push(b.symbol);
      }
    }
    // Also from wallet balances (user holds them)
    for (const [key, bal] of Object.entries(swapBalanceMap)) {
      if (!standardTokens.has(key) && bal && Number(bal.totalBalance) > 0 && !extras.includes(key)) {
        extras.push(key);
      }
    }
    return extras;
  }, [effectiveBalances, swapBalanceMap]);

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
      const availableTokens = ['SUI', 'USDC', 'USDT', 'WAL', ...extraTokens].filter(token => token !== from);
      if (availableTokens.length > 0) {
        updateNodeData({ toAsset: availableTokens[0] });
      }
    }
  }, [nodeData.fromAsset, nodeData.toAsset, updateNodeData, extraTokens]);

  // Store estimated output in node data for downstream nodes
  useEffect(() => {
    if (swapQuote.estimatedAmountOut && nodeData.toAsset) {
      // Only update if values actually changed to avoid infinite re-render loop
      if (nodeData.estimatedAmountOut !== swapQuote.estimatedAmountOut ||
          nodeData.estimatedAmountOutSymbol !== nodeData.toAsset) {
        updateNodeData({
          estimatedAmountOut: swapQuote.estimatedAmountOut,
          estimatedAmountOutSymbol: nodeData.toAsset,
        });
      }
    }
  }, [swapQuote.estimatedAmountOut, nodeData.toAsset, nodeData.estimatedAmountOut, nodeData.estimatedAmountOutSymbol, updateNodeData]);

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

  const handleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  }, []);

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-lg min-w-[280px]">
        <div className="bg-blue-500 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-white" />
            <span className="font-semibold text-white text-sm">
              {sequenceNumber > 0 && `${sequenceNumber}. `}{nodeData.label}
            </span>
          </div>
          <NodeMenu onDelete={handleDelete} onReplace={handleReplace} onSettings={handleSettings} showSettings={true} />
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
            <option value="WAL">{formatBalanceForDropdown('WAL')}</option>
            {extraTokens.map(token => (
              <option key={token} value={token}>
                {formatBalanceForDropdown(token as keyof typeof TOKENS)}
              </option>
            ))}
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
            {(['SUI', 'USDC', 'USDT', 'WAL', ...extraTokens] as string[])
              .filter(token => token !== (nodeData.fromAsset || 'SUI'))
              .map(token => (
                <option key={token} value={token}>
                  {formatBalanceForDropdown(token as keyof typeof TOKENS)}
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

      {/* Settings Dialog */}
      <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Swap Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              {/* Protocol Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Protocol
                </label>
                <select
                  value={nodeData.swapProtocol || 'cetus'}
                  onChange={(e) => updateNodeData({ swapProtocol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                >
                  <option value="cetus">Cetus Aggregator</option>
                  <option value="turbos" disabled>Turbos (Coming Soon)</option>
                  <option value="aftermath" disabled>Aftermath (Coming Soon)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Aggregates best rates from CETUS, BLUEFIN, and FERRADLMM DEXs
                </p>
              </div>

              {/* Slippage Tolerance */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Slippage Tolerance
                </label>
                <div className="flex gap-2 mb-2">
                  {['0.5', '1', '2'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => updateNodeData({ slippageTolerance: preset })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        (nodeData.slippageTolerance || '1') === preset
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={nodeData.slippageTolerance || '1'}
                    onChange={(e) => updateNodeData({ slippageTolerance: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="1.0"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum price movement you're willing to accept
                </p>
              </div>

              {/* Transaction Deadline */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Transaction Deadline
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="60"
                    value={nodeData.transactionDeadline || '20'}
                    onChange={(e) => updateNodeData({ transactionDeadline: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="20"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Transaction will revert if not executed within this time
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                  Done
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export default memo(SwapNode);
