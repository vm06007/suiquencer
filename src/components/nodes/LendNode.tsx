import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useNodes, useEdges } from '@xyflow/react';
import { Landmark, AlertTriangle, X, TrendingUp, Loader2, Plus, Info } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NodeMenu } from './NodeMenu';
import { TOKENS, SCALLOP_SCOINS, SCALLOP } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import { useLendingAPY } from '@/hooks/useLendingAPY';
import { useScallopExchangeRate } from '@/hooks/useScallopExchangeRate';
import type { NodeData } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';

function LendNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();
  const [showSettings, setShowSettings] = useState(false);

  // Get wallet balances for all assets
  const selectedAsset = (nodeData.lendAsset || 'SUI') as keyof typeof TOKENS;
  const currentAction = nodeData.lendAction || 'deposit';
  const currentProtocol = nodeData.lendProtocol || 'scallop';

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

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Query sCoin balances for withdraw - both SCALLOP_* (wrapped) and MarketCoin (raw)
  const sCoinInfo = SCALLOP_SCOINS[selectedAsset];

  // Query wrapped sCoin balance (e.g. SCALLOP_SUI from Scallop UI deposits)
  const { data: wrappedSCoinBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: sCoinInfo?.sCoinType || '',
    },
    {
      enabled: !!account && !!sCoinInfo?.sCoinType && currentProtocol === 'scallop',
    }
  );

  // Query raw MarketCoin balance (from direct mint_entry deposits)
  const { data: marketCoinBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: sCoinInfo?.marketCoinType || '',
    },
    {
      enabled: !!account && !!sCoinInfo?.marketCoinType && currentProtocol === 'scallop',
    }
  );
  const { data: obligationObjects } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || '',
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::Obligation`,
      },
      options: { showContent: true },
    },
    {
      enabled: !!account && (currentAction === 'borrow' || currentAction === 'repay') && currentProtocol === 'scallop',
    }
  );

  // Query Scallop ObligationKey for borrow/repay action
  const { data: _obligationKeyObjects } = useSuiClientQuery(
    'getOwnedObjects',
    {
      owner: account?.address || '',
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::ObligationKey`,
      },
      options: { showContent: true },
    },
    {
      enabled: !!account && (currentAction === 'borrow' || currentAction === 'repay') && currentProtocol === 'scallop',
    }
  );

  // Detect predecessor lend nodes that enable withdraw/borrow/repay
  const { hasPredecessorDeposit, hasPredecessorBorrow } = useMemo(() => {
    let foundDeposit = false;
    let foundBorrow = false;
    const visited = new Set<string>();
    const checkPredecessors = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const incomingEdges = edges.filter(e => e.target === nodeId);
      for (const edge of incomingEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) continue;
        const sourceData = sourceNode.data as NodeData;
        if (sourceNode.type === 'lend' && (sourceData.lendAsset || 'SUI') === selectedAsset) {
          if (sourceData.lendAction === 'deposit' || !sourceData.lendAction) {
            foundDeposit = true;
          }
          if (sourceData.lendAction === 'borrow') {
            foundBorrow = true;
          }
        }
        checkPredecessors(edge.source);
      }
    };
    checkPredecessors(id);
    return { hasPredecessorDeposit: foundDeposit, hasPredecessorBorrow: foundBorrow };
  }, [nodes, edges, id, selectedAsset]);

  // Determine combined sCoin balance in wallet (wrapped SCALLOP_* + raw MarketCoin)
  const walletSCoinBalance = useMemo(() => {
    if (!sCoinInfo) return 0;
    const wrappedBal = wrappedSCoinBalance ? parseInt(wrappedSCoinBalance.totalBalance) / Math.pow(10, sCoinInfo.decimals) : 0;
    const marketBal = marketCoinBalance ? parseInt(marketCoinBalance.totalBalance) / Math.pow(10, sCoinInfo.decimals) : 0;
    return wrappedBal + marketBal;
  }, [wrappedSCoinBalance, marketCoinBalance, sCoinInfo]);

  const hasObligation = (obligationObjects?.data?.length ?? 0) > 0;
  const canBorrow = hasObligation || hasPredecessorDeposit;
  const canRepay = hasObligation || hasPredecessorBorrow;

  // Get APY data for the selected asset and protocol
  const { apy } = useLendingAPY(
    nodeData.lendProtocol || 'scallop',
    selectedAsset,
    !!account
  );

  // Get real-time exchange rate from Scallop (for Scallop protocol)
  const scallopExchangeRate = useScallopExchangeRate(
    selectedAsset,
    !!account && (nodeData.lendProtocol || 'scallop') === 'scallop'
  );

  // Calculate receipt tokens using real exchange rate
  const receiptTokenAmount = useMemo(() => {
    const amount = parseFloat(nodeData.lendAmount || '0');
    if (isNaN(amount) || amount <= 0) return null;

    const protocol = nodeData.lendProtocol || 'scallop';

    // Use real Scallop rate, or fallback to mock for Navi
    let exchangeRate: number;
    if (protocol === 'scallop') {
      exchangeRate = scallopExchangeRate.rate;
    } else {
      // Mock rates for Navi (until we add Navi SDK support)
      const naviRates: Record<string, number> = {
        SUI: 1.0189,
        USDC: 1.0623,
        USDT: 1.0534,
        WAL: 1.0098,
      };
      exchangeRate = naviRates[selectedAsset] || 1.0;
    }

    // IMPORTANT: Exchange rate means "1 receipt token = X underlying asset"
    // So to get receipt tokens from underlying assets: amount / exchangeRate
    // Example: If 1 sSUI = 1.0234 SUI, then 5 SUI = 5 / 1.0234 = 4.886 sSUI
    const receiptAmount = amount / exchangeRate;

    return {
      amount: receiptAmount.toFixed(selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2),
      symbol: getReceiptTokenSymbol(selectedAsset, protocol),
      exchangeRate: exchangeRate.toFixed(4),
      isLoading: protocol === 'scallop' ? scallopExchangeRate.isLoading : false,
    };
  }, [nodeData.lendAmount, selectedAsset, nodeData.lendProtocol, scallopExchangeRate]);

  // Get receipt token symbol based on protocol
  function getReceiptTokenSymbol(asset: string, protocol: string): string {
    if (protocol === 'navi') {
      return `n${asset}`; // Navi uses nSUI, nUSDC, etc.
    }
    // Scallop uses sSUI, sUSDC, etc.
    return `s${asset}`;
  }

  // Format balance for dropdown display with effective balance
  const formatBalanceForDropdown = (tokenKey: keyof typeof TOKENS) => {
    const effectiveBal = effectiveBalances.find(b => b.symbol === tokenKey);
    if (effectiveBal && effectiveBalances.length > 0) {
      const amount = parseFloat(effectiveBal.balance);
      const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
      return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
    }
    // Fallback to wallet balance
    const tokenBalance = tokenKey === 'SUI' ? suiBalance : tokenKey === 'USDC' ? usdcBalance : tokenKey === 'USDT' ? usdtBalance : walBalance;
    if (!tokenBalance) return tokenKey;
    const decimals = TOKENS[tokenKey].decimals;
    const amount = parseInt(tokenBalance.totalBalance) / Math.pow(10, decimals);
    const displayDecimals = tokenKey === 'SUI' || tokenKey === 'WAL' ? 4 : 2;
    return `${tokenKey} (${amount.toFixed(displayDecimals)})`;
  };

  // Get sequence number from shared hook (uses topological sort)
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Check balance validation (action-specific)
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    const lendAmount = parseFloat(nodeData.lendAmount || '0');
    if (lendAmount <= 0) return null;

    const displayDecimals = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2;

    if (currentAction === 'deposit') {
      // Deposit checks underlying asset balance
      const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
      if (!effectiveBal) return null;
      const availableBalance = parseFloat(effectiveBal.balance);
      if (lendAmount > availableBalance) {
        return {
          type: 'error' as const,
          message: `Insufficient ${selectedAsset}. Available: ${availableBalance.toFixed(displayDecimals)} ${selectedAsset}`,
        };
      }
    } else if (currentAction === 'withdraw') {
      // Withdraw checks sCoin balance (Scallop only — Navi has no wallet-side position tokens)
      if (currentProtocol === 'scallop' && !hasPredecessorDeposit && walletSCoinBalance <= 0) {
        return {
          type: 'error' as const,
          message: `No s${selectedAsset} found in wallet. Deposit first to get sCoin tokens.`,
        };
      }
    } else if (currentAction === 'borrow') {
      // Borrow checks if obligation exists
      if (!canBorrow) {
        return {
          type: 'error' as const,
          message: 'No obligation found. You need collateral deposited on Scallop to borrow.',
        };
      }
    } else if (currentAction === 'repay') {
      // Repay checks if obligation exists (user must have borrowed)
      if (!canRepay) {
        return {
          type: 'error' as const,
          message: 'No obligation found. You need an active borrow position to repay.',
        };
      }
      // Also check if user has enough of the asset to repay
      const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
      if (effectiveBal) {
        const availableBalance = parseFloat(effectiveBal.balance);
        if (lendAmount > availableBalance) {
          return {
            type: 'error' as const,
            message: `Insufficient ${selectedAsset}. Available: ${availableBalance.toFixed(displayDecimals)} ${selectedAsset}`,
          };
        }
      }
    }

    return null;
  }, [account, nodeData.lendAmount, selectedAsset, effectiveBalances, currentAction, hasPredecessorDeposit, walletSCoinBalance, canBorrow, canRepay]);

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

  const handleSettings = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  }, []);

  return (
    <>
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
          <NodeMenu onDelete={handleDelete} onReplace={handleReplace} onSettings={handleSettings} showSettings={true} />
        </div>

      <div className="p-4 space-y-3">
        {/* Protocol Selection */}
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
            <option value="borrow" disabled>Borrow (Need PRO Version)</option>
            <option value="repay" disabled>Repay (Need PRO Version)</option>
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
            <option value="WAL">{formatBalanceForDropdown('WAL')}</option>
          </select>

          {/* APY Display */}
          {apy && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                {(currentAction === 'deposit' || currentAction === 'withdraw') ? (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    <span className="font-semibold">{apy.depositAPY}% APY</span> · Deposit Rate
                  </p>
                ) : (
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    <span className="font-semibold">{apy.borrowAPY}% APY</span> · Borrow Rate
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
            {currentAction === 'withdraw' ? 'Amount to Withdraw' : currentAction === 'borrow' ? 'Amount to Borrow' : currentAction === 'repay' ? 'Amount to Repay' : 'Amount'}
          </label>
          <input
            type="number"
            step="0.000001"
            value={nodeData.lendAmount || ''}
            onChange={(e) => updateNodeData({ lendAmount: e.target.value })}
            placeholder="1.0"
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
          />
          {/* Show available balance (action-specific) */}
          {currentAction === 'deposit' && (() => {
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
          {currentAction === 'withdraw' && (() => {
            if (currentProtocol === 'navi') {
              return (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {hasPredecessorDeposit
                    ? 'Position from prior deposit in flow'
                    : 'Enter amount to withdraw from Navi position'}
                </p>
              );
            }
            const rate = scallopExchangeRate.rate || 1;
            const displayDecimals = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2;
            const maxWithdrawable = Math.floor(walletSCoinBalance * rate * Math.pow(10, displayDecimals)) / Math.pow(10, displayDecimals);
            return (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-between">
                {hasPredecessorDeposit
                  ? <span>sCoin from prior deposit in flow</span>
                  : <>
                      <span>Can withdraw: ~{maxWithdrawable.toFixed(displayDecimals)} {selectedAsset}</span>
                      {walletSCoinBalance > 0 && (
                        <button
                          type="button"
                          className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNodeData({ lendAmount: maxWithdrawable.toFixed(displayDecimals) });
                          }}
                        >
                          MAX
                        </button>
                      )}
                    </>
                }
              </p>
            );
          })()}
          {currentAction === 'borrow' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {hasObligation
                ? `Obligation found — borrow against your collateral`
                : hasPredecessorDeposit
                  ? `Collateral from prior deposit in flow`
                  : `No obligation found`
              }
            </p>
          )}
          {currentAction === 'repay' && (() => {
            const effectiveBal = effectiveBalances.find(b => b.symbol === selectedAsset);
            const available = effectiveBal ? parseFloat(effectiveBal.balance) : 0;
            const displayDecimals = selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2;
            return (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {hasObligation
                  ? `Obligation found — Available: ${available.toFixed(displayDecimals)} ${selectedAsset}`
                  : hasPredecessorBorrow
                    ? `Repaying borrow from prior step in flow`
                    : `No obligation found`
                }
              </p>
            );
          })()}

          {/* Balance warning */}
          {balanceWarning && (
            <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">
                {balanceWarning.message}
              </p>
            </div>
          )}
        </div>

        {/* Receipt Tokens Display (Deposit) */}
        {(currentAction === 'deposit' || !nodeData.lendAction) && receiptTokenAmount && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-3 py-2">
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">You Will Receive</div>
            {receiptTokenAmount.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Fetching rate...</span>
              </div>
            ) : (
              <>
                <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  ~{receiptTokenAmount.amount} {receiptTokenAmount.symbol}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Rate: 1 {receiptTokenAmount.symbol} = {receiptTokenAmount.exchangeRate} {selectedAsset}
                </div>
              </>
            )}
          </div>
        )}

        {/* Withdraw Info: sCoin burn (Scallop) or position withdrawal (Navi) */}
        {currentAction === 'withdraw' && receiptTokenAmount && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-3 py-2">
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
              {currentProtocol === 'navi' ? 'You Will Withdraw' : 'You Will Burn'}
            </div>
            {receiptTokenAmount.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Fetching rate...</span>
              </div>
            ) : currentProtocol === 'navi' ? (
              <>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {nodeData.lendAmount} {selectedAsset}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  from your Navi lending position
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  ~{receiptTokenAmount.amount} {receiptTokenAmount.symbol}
                  <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-1">
                    / {walletSCoinBalance.toFixed(selectedAsset === 'SUI' || selectedAsset === 'WAL' ? 4 : 2)} available
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  to redeem ~{nodeData.lendAmount} {selectedAsset}
                </div>
              </>
            )}
          </div>
        )}

        {/* Borrow Info */}
        {currentAction === 'borrow' && nodeData.lendAmount && parseFloat(nodeData.lendAmount) > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Borrow {nodeData.lendAmount} {selectedAsset}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {apy ? `${apy.borrowAPY}% APY` : ''} — Requires sufficient collateral to avoid liquidation
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repay Info */}
        {currentAction === 'repay' && nodeData.lendAmount && parseFloat(nodeData.lendAmount) > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-green-700 dark:text-green-300 font-medium">
                  Repay {nodeData.lendAmount} {selectedAsset}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Reduces your debt and frees up collateral
                </div>
              </div>
            </div>
          </div>
        )}
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

        {/* Add Sequence button */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex justify-center">
          <button
            className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-3 py-1 rounded transition-colors"
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
                Lend/Borrow Settings
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
                  value={nodeData.lendProtocol || 'scallop'}
                  onChange={(e) => updateNodeData({ lendProtocol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-400"
                >
                  <option value="scallop">Scallop</option>
                  <option value="navi">Navi Protocol</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Also available in the main card. APY rates update based on selected protocol.
                </p>
              </div>

              {/* Action-specific settings could go here */}
              {nodeData.lendAction === 'deposit' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    <strong>Deposit (Lend):</strong> Supply assets to earn interest. Your assets are available to borrowers, and you receive interest-bearing tokens in return.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Receipt Tokens:</strong> When you deposit, you receive {nodeData.lendProtocol === 'navi' ? 'n' : 's'}{selectedAsset} tokens (e.g., {nodeData.lendProtocol === 'navi' ? 'n' : 's'}SUI for SUI deposits). These tokens are worth MORE than the underlying asset because they include accumulated interest. For example, if 1 sSUI = 1.0234 SUI, depositing 5 SUI gives you ~4.886 sSUI (worth 5 SUI now, but increasing in value over time).
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'borrow' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Borrow:</strong> Borrow assets against your collateral. Make sure you have sufficient collateral deposited to avoid liquidation.
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'withdraw' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Withdraw:</strong> Withdraw your deposited assets. You can only withdraw up to your available balance.
                  </p>
                </div>
              )}

              {nodeData.lendAction === 'repay' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    <strong>Repay:</strong> Repay borrowed assets to reduce your debt and free up collateral.
                  </p>
                </div>
              )}

              {/* APY Rates Table */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Current APY Rates
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Asset</th>
                        <th className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-medium">Deposit</th>
                        <th className="px-3 py-2 text-right text-orange-600 dark:text-orange-400 font-medium">Borrow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(['SUI', 'USDC', 'USDT', 'WAL'] as const).map((asset) => {
                        // Get APY for each asset
                        const protocolData = nodeData.lendProtocol === 'navi'
                          ? { SUI: { depositAPY: '2.8', borrowAPY: '6.2' }, USDC: { depositAPY: '7.2', borrowAPY: '10.1' }, USDT: { depositAPY: '6.3', borrowAPY: '9.8' }, WAL: { depositAPY: '11.8', borrowAPY: '17.5' } }
                          : { SUI: { depositAPY: '3.15', borrowAPY: '5.8' }, USDC: { depositAPY: '6.5', borrowAPY: '9.2' }, USDT: { depositAPY: '5.8', borrowAPY: '8.5' }, WAL: { depositAPY: '12.4', borrowAPY: '18.7' } };
                        const assetAPY = protocolData[asset];
                        return (
                          <tr key={asset} className={selectedAsset === asset ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{asset}</td>
                            <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">{assetAPY.depositAPY}%</td>
                            <td className="px-3 py-2 text-right text-orange-600 dark:text-orange-400">{assetAPY.borrowAPY}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Rates are updated in real-time and may vary based on market conditions
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium">
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

export default memo(LendNode);
