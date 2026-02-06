// Mainnet token addresses for SUI blockchain
/** Reserve this much SUI when spending native SUI (transfer/swap) so the user can pay gas. ~0.003 SUI/tx typical. */
export const SUI_GAS_RESERVE = 0.01;

export const TOKENS = {
  SUI: {
    symbol: 'SUI',
    decimals: 9,
    coinType: '0x2::sui::SUI',
  },
  USDC: {
    symbol: 'USDC',
    decimals: 6,
    // Native Circle USDC on SUI mainnet
    coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  },
  USDT: {
    symbol: 'USDT',
    decimals: 6,
    // Native USDT on SUI mainnet
    coinType: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
  },
  WAL: {
    symbol: 'WAL',
    decimals: 9,
    // Walrus token on SUI mainnet
    coinType: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;
