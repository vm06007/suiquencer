import { useMemo } from 'react';
import { useNodes, useEdges } from '@xyflow/react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';
import { TOKENS } from '@/config/tokens';
import type { TokenBalance } from '@/types';
import { getEffectiveBalances } from '@/utils/effectiveBalances';
import { useExecutionSequence } from './useExecutionSequence';

export function useEffectiveBalances(nodeId: string, enabled: boolean = true) {
  const nodes = useNodes();
  const edges = useEdges();
  const account = useCurrentAccount();

  // Fetch base wallet balances
  const { data: suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  const { data: usdcBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDC.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  const { data: usdtBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDT.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  const { data: walBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.WAL.coinType,
    },
    {
      enabled: !!account && enabled,
    }
  );

  // Navi-specific token balances
  const { data: cetusBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.CETUS.coinType },
    { enabled: !!account && enabled }
  );

  const { data: deepBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.DEEP.coinType },
    { enabled: !!account && enabled }
  );

  const { data: blueBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.BLUE.coinType },
    { enabled: !!account && enabled }
  );

  const { data: buckBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.BUCK.coinType },
    { enabled: !!account && enabled }
  );

  const { data: ausdBalance } = useSuiClientQuery(
    'getBalance',
    { owner: account?.address || '', coinType: TOKENS.AUSD.coinType },
    { enabled: !!account && enabled }
  );

  // Calculate base balances
  const baseBalances: TokenBalance[] = useMemo(() => {
    if (!account) return [];

    const balances: TokenBalance[] = [];

    const addBalance = (
      symbol: string,
      data: typeof suiBalance,
      decimals: number,
      displayDecimals: number
    ) => {
      if (data) {
        const amount = parseInt(data.totalBalance) / Math.pow(10, decimals);
        balances.push({ symbol, balance: amount.toFixed(displayDecimals), isLoading: false });
      }
    };

    addBalance('SUI', suiBalance, TOKENS.SUI.decimals, 4);
    addBalance('USDC', usdcBalance, TOKENS.USDC.decimals, 2);
    addBalance('USDT', usdtBalance, TOKENS.USDT.decimals, 2);
    addBalance('WAL', walBalance, TOKENS.WAL.decimals, 4);
    addBalance('CETUS', cetusBalance, TOKENS.CETUS.decimals, 4);
    addBalance('DEEP', deepBalance, TOKENS.DEEP.decimals, 4);
    addBalance('BLUE', blueBalance, TOKENS.BLUE.decimals, 4);
    addBalance('BUCK', buckBalance, TOKENS.BUCK.decimals, 4);
    addBalance('AUSD', ausdBalance, TOKENS.AUSD.decimals, 2);

    return balances;
  }, [account, suiBalance, usdcBalance, usdtBalance, walBalance, cetusBalance, deepBalance, blueBalance, buckBalance, ausdBalance]);

  // Get sequence map for proper ordering
  const { sequenceMap } = useExecutionSequence();

  // Calculate effective balances (wallet balance + effects of previous operations)
  const effectiveBalances = useMemo(() => {
    if (!account || !enabled || baseBalances.length === 0) return [];

    return getEffectiveBalances(nodes as any, edges, nodeId, baseBalances, sequenceMap);
  }, [nodes, edges, nodeId, baseBalances, account, enabled, sequenceMap]);

  return {
    baseBalances,
    effectiveBalances,
    isLoading: !account,
  };
}
