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

// Scallop protocol addresses
export const SCALLOP = {
  // Entry-point package (mint_entry, redeem_entry, borrow_entry, repay_entry)
  protocolPkg: '0xd384ded6b9e7f4d2c4c9007b0291ef88fbfed8e709bce83d2da69de2d79d013d',
  // Core types package (Version, Market, MarketCoin, Obligation)
  coreTypePkg: '0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf',
  // s_coin_converter package (mint_s_coin, burn_s_coin)
  converterPkg: '0x80ca577876dec91ae6d22090e56c39bc60dce9086ab0729930c6900bc4162b4c',
  // Shared object IDs
  version: '0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7',
  market: '0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9',
  clock: '0x0000000000000000000000000000000000000000000000000000000000000006',
} as const;

// Scallop sCoin types
// There are TWO representations of deposited value:
// 1. MarketCoin<T>: raw receipt from mint_entry (coreTypePkg::reserve::MarketCoin<T>)
// 2. SCALLOP_*: wrapped sCoin from Scallop's UI (separate packages per asset)
// The UI should query BOTH and show combined balance.
export const SCALLOP_SCOINS: Record<string, {
  symbol: string;
  // The wrapped sCoin type (from Scallop's UI deposits)
  sCoinType: string;
  // The raw MarketCoin type (from direct mint_entry calls)
  marketCoinType: string;
  // SCoinTreasury object ID for s_coin_converter
  treasuryId: string;
  decimals: number;
}> = {
  SUI: {
    symbol: 'sSUI',
    sCoinType: '0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI',
    marketCoinType: `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${TOKENS.SUI.coinType}>`,
    treasuryId: '0x5c1678c8261ac9eec024d4d630006a9f55c80dc0b1aa38a003fcb1d425818c6b',
    decimals: 9,
  },
  // TODO: Add USDC, USDT, WAL sCoin types once verified on-chain
  USDC: {
    symbol: 'sUSDC',
    sCoinType: '', // Needs verification
    marketCoinType: `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${TOKENS.USDC.coinType}>`,
    treasuryId: '',
    decimals: 6,
  },
  USDT: {
    symbol: 'sUSDT',
    sCoinType: '', // Needs verification
    marketCoinType: `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${TOKENS.USDT.coinType}>`,
    treasuryId: '',
    decimals: 6,
  },
  WAL: {
    symbol: 'sWAL',
    sCoinType: '', // Needs verification
    marketCoinType: `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${TOKENS.WAL.coinType}>`,
    treasuryId: '',
    decimals: 9,
  },
};

export function getScallopSCoin(underlyingSymbol: string) {
  return SCALLOP_SCOINS[underlyingSymbol] || null;
}

// Navi Protocol addresses
export const NAVI = {
  packageId: '0xee0041239b89564ce870a7dec5ddc5d114367ab94a1137e90aa0633cb76518e0',
  storage: '0xbb4e2f4b6205c2e2a2db47aeb4f830796ec7c005f88537ee775986639bc442fe',
  priceOracle: '0x1568865ed9a0b5ec414220e8f79b3d04c77acc82358f6e5ae4635687392ffbef',
  incentiveV2: '0xf87a8acb8b81d14307894d12595541a73f19933f88e1326d5be349c7a6f7559c',
  incentiveV3: '0x62982dad27fb10bb314b3384d5de8d2ac2d72ab2dbeae5d801dbdb9efa816c80',
  clock: '0x0000000000000000000000000000000000000000000000000000000000000006',
} as const;

// Navi pool mapping: asset → { assetId, poolId }
export const NAVI_POOLS: Record<string, { assetId: number; poolId: string }> = {
  SUI: {
    assetId: 0,
    poolId: '0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5',
  },
  USDC: {
    assetId: 10,
    poolId: '0xa3582097b4c57630046c0c49a88bfc6b202a3ec0a9db5597c31765f7563755a8',
  },
  USDT: {
    assetId: 19,
    poolId: '0xa3e0471746e5d35043801bce247d3b3784cc74329d39f7ed665446ddcf22a9e2',
  },
  WAL: {
    assetId: 24,
    poolId: '0xef76883525f5c2ff90cd97732940dbbdba0b391e29de839b10588cee8e4fe167',
  },
};

export function getNaviPool(symbol: string) {
  return NAVI_POOLS[symbol] || null;
}
