import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Coins, AlertTriangle, X, TrendingUp, Loader2, Shield, Droplets } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { NodeMenu } from './NodeMenu';
import { TOKENS } from '@/config/tokens';
import { useEffectiveBalances } from '@/hooks/useEffectiveBalances';
import { useExecutionSequence } from '@/hooks/useExecutionSequence';
import type { NodeData } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';

const STAKE_PROTOCOLS = [
  { value: 'native', label: 'Native SUI Staking', description: 'Delegate to a validator directly' },
  { value: 'aftermath', label: 'Aftermath (afSUI)', description: 'Liquid staking with auto-compound' },
  { value: 'volo', label: 'Volo (vSUI)', description: 'Liquid staking with DeFi composability' },
] as const;

// Approximate APY rates for each protocol
const PROTOCOL_APYS: Record<string, string> = {
  native: '~3.5',
  aftermath: '~3.8',
  volo: '~3.6',
};

function StakeNode({ data, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const nodeData = data as NodeData;
  const account = useCurrentAccount();
  const [showSettings, setShowSettings] = useState(false);

  const protocol = nodeData.stakeProtocol || 'native';

  // Fetch SUI balance
  const { data: _suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Fetch validators for native staking
  const { data: systemState, isLoading: validatorsLoading } = useSuiClientQuery(
    'getLatestSuiSystemState',
    undefined,
    {
      enabled: !!account,
    }
  );

  // Get effective balances (wallet balance + effects of previous operations)
  const { effectiveBalances } = useEffectiveBalances(id, true);

  // Get sequence number from shared hook
  const { sequenceMap } = useExecutionSequence();
  const sequenceNumber = sequenceMap.get(id) || 0;

  // Sort validators by staking pool size (descending), take top ones
  const validators = useMemo(() => {
    if (!systemState?.activeValidators) return [];
    return [...systemState.activeValidators]
      .sort((a, b) => {
        const aStake = BigInt(a.stakingPoolSuiBalance);
        const bStake = BigInt(b.stakingPoolSuiBalance);
        return bStake > aStake ? 1 : bStake < aStake ? -1 : 0;
      })
      .slice(0, 30) // Top 30 validators
      .map((v) => ({
        address: v.suiAddress,
        name: v.name || v.suiAddress.slice(0, 10) + '...',
        commission: (parseInt(v.commissionRate) / 100).toFixed(0), // basis points to %
        staked: (parseInt(v.stakingPoolSuiBalance) / 1e9).toFixed(0),
      }));
  }, [systemState]);

  // Balance validation
  const balanceWarning = useMemo(() => {
    if (!account) return null;

    const stakeAmount = parseFloat(nodeData.stakeAmount || '0');
    if (stakeAmount <= 0) return null;

    const effectiveBal = effectiveBalances.find((b) => b.symbol === 'SUI');
    if (!effectiveBal) return null;

    const availableBalance = parseFloat(effectiveBal.balance);

    if (stakeAmount > availableBalance) {
      return {
        type: 'error' as const,
        message: `Insufficient SUI. Available: ${availableBalance.toFixed(4)} SUI`,
      };
    }

    return null;
  }, [account, nodeData.stakeAmount, effectiveBalances]);

  // Receipt token display
  const receiptInfo = useMemo(() => {
    const amount = parseFloat(nodeData.stakeAmount || '0');
    if (isNaN(amount) || amount <= 0) return null;

    if (protocol === 'native') {
      return {
        symbol: 'StakedSUI',
        amount: amount.toFixed(4),
        description: 'Locked until end of epoch (~24h)',
      };
    } else if (protocol === 'aftermath') {
      // afSUI exchange rate approximation (1 afSUI > 1 SUI due to accumulated rewards)
      const rate = 1.045; // approximate
      const receiptAmount = amount / rate;
      return {
        symbol: 'afSUI',
        amount: receiptAmount.toFixed(4),
        description: `Rate: 1 afSUI = ~${rate.toFixed(4)} SUI`,
      };
    } else {
      // vSUI exchange rate approximation
      const rate = 1.038;
      const receiptAmount = amount / rate;
      return {
        symbol: 'vSUI',
        amount: receiptAmount.toFixed(4),
        description: `Rate: 1 vSUI = ~${rate.toFixed(4)} SUI`,
      };
    }
  }, [nodeData.stakeAmount, protocol]);

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
      <div className="bg-white dark:bg-gray-800 border-2 border-pink-500 dark:border-pink-600 rounded-lg shadow-lg min-w-[320px] max-w-[400px]">
        {/* Header */}
        <div className="bg-pink-500 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-white" />
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
              Staking Protocol
            </label>
            <select
              value={protocol}
              onChange={(e) => updateNodeData({ stakeProtocol: e.target.value, stakeValidator: '' })}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-pink-500 dark:focus:border-pink-400"
            >
              {STAKE_PROTOCOLS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {STAKE_PROTOCOLS.find((p) => p.value === protocol)?.description}
            </p>
          </div>

          {/* Validator Selection (Native = required, Aftermath = optional) */}
          {(protocol === 'native' || protocol === 'aftermath') && (
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
                Validator {protocol === 'aftermath' && <span className="text-gray-400">(optional)</span>}
              </label>
              {validatorsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading validators...</span>
                </div>
              ) : (
                <select
                  value={nodeData.stakeValidator || ''}
                  onChange={(e) => updateNodeData({ stakeValidator: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-pink-500 dark:focus:border-pink-400"
                >
                  <option value="">
                    {protocol === 'aftermath' ? 'Auto-select (recommended)' : 'Select a validator...'}
                  </option>
                  {validators.map((v) => (
                    <option key={v.address} value={v.address}>
                      {v.name} ({v.commission}% fee)
                    </option>
                  ))}
                </select>
              )}
              {nodeData.stakeValidator && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                  {nodeData.stakeValidator}
                </p>
              )}
            </div>
          )}

          {/* Protocol info for liquid staking */}
          {protocol !== 'native' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {protocol === 'aftermath'
                  ? 'Receive afSUI - usable in DeFi while earning rewards'
                  : 'Receive vSUI - tradable on DEXes and usable as collateral'}
              </p>
            </div>
          )}

          {/* APY Display */}
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-green-700 dark:text-green-300">
                <span className="font-semibold">{PROTOCOL_APYS[protocol]}% APY</span>
                {' '}
                {protocol === 'native' ? '(varies by validator)' : '(auto-compounding)'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">
              Amount (SUI)
            </label>
            <input
              type="number"
              step="0.000001"
              min="1"
              value={nodeData.stakeAmount || ''}
              onChange={(e) => updateNodeData({ stakeAmount: e.target.value })}
              placeholder="1.0"
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm focus:outline-none focus:border-pink-500 dark:focus:border-pink-400"
            />
            {/* Show available balance */}
            {(() => {
              const effectiveBal = effectiveBalances.find((b) => b.symbol === 'SUI');
              if (effectiveBal && effectiveBalances.length > 0) {
                const amount = parseFloat(effectiveBal.balance);
                return (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Available: {amount.toFixed(4)} SUI
                  </p>
                );
              }
              return null;
            })()}

            {/* Minimum stake warning for native */}
            {protocol === 'native' && parseFloat(nodeData.stakeAmount || '0') > 0 && parseFloat(nodeData.stakeAmount || '0') < 1 && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Minimum stake for native SUI staking is 1 SUI
                </p>
              </div>
            )}

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

          {/* Receipt Token Display */}
          {receiptInfo && (
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded px-3 py-2">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">You Will Receive</div>
              <div className="text-sm font-semibold text-pink-700 dark:text-pink-300">
                ~{receiptInfo.amount} {receiptInfo.symbol}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {receiptInfo.description}
              </div>
            </div>
          )}
        </div>

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-pink-500 !w-3 !h-3"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-pink-500 !w-3 !h-3"
        />
      </div>

      {/* Settings Dialog */}
      <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Staking Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              {/* Protocol Comparison */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Protocol Comparison
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Protocol</th>
                        <th className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-medium">APY</th>
                        <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr className={protocol === 'native' ? 'bg-pink-50 dark:bg-pink-900/10' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-pink-500" />
                            Native SUI
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">~3.5%</td>
                        <td className="px-3 py-2 text-right text-gray-500">Locked</td>
                      </tr>
                      <tr className={protocol === 'aftermath' ? 'bg-pink-50 dark:bg-pink-900/10' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-blue-500" />
                            Aftermath (afSUI)
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">~3.8%</td>
                        <td className="px-3 py-2 text-right text-blue-500">Liquid</td>
                      </tr>
                      <tr className={protocol === 'volo' ? 'bg-pink-50 dark:bg-pink-900/10' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center gap-1.5">
                            <Droplets className="w-3.5 h-3.5 text-purple-500" />
                            Volo (vSUI)
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">~3.6%</td>
                        <td className="px-3 py-2 text-right text-purple-500">Liquid</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Rates are approximate and may vary based on network conditions
                </p>
              </div>

              {/* Protocol Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <strong>Native Staking:</strong> Delegates SUI directly to a validator. Locked until end of epoch (~24h). You receive StakedSUI objects.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <strong>Aftermath (afSUI):</strong> Liquid staking that auto-compounds rewards. afSUI is freely tradable and usable as collateral in DeFi protocols.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <strong>Volo (vSUI):</strong> Liquid staking with wide DeFi integrations. vSUI can be used on Cetus, NAVI, Scallop, and other protocols.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm font-medium">
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

export default memo(StakeNode);
