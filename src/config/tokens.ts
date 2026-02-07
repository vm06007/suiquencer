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
  CETUS: {
    symbol: 'CETUS',
    decimals: 9,
    coinType: '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
  },
  DEEP: {
    symbol: 'DEEP',
    decimals: 6,
    coinType: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
  },
  BLUE: {
    symbol: 'BLUE',
    decimals: 9,
    coinType: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE',
  },
  BUCK: {
    symbol: 'BUCK',
    decimals: 9,
    coinType: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK',
  },
  AUSD: {
    symbol: 'AUSD',
    decimals: 6,
    coinType: '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',
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

// Navi pool mapping: asset → { assetId, poolId, supplyBalanceParentId, borrowBalanceParentId }
export const NAVI_POOLS: Record<string, {
  assetId: number;
  poolId: string;
  supplyBalanceParentId: string;
  borrowBalanceParentId: string;
}> = {
  SUI: {
    assetId: 0,
    poolId: '0x96df0fce3c471489f4debaaa762cf960b3d97820bd1f3f025ff8190730e958c5',
    supplyBalanceParentId: '0x589c83af4b035a3bc64c40d9011397b539b97ea47edf7be8f33d643606bf96f8',
    borrowBalanceParentId: '0xe7ff0daa9d090727210abe6a8b6c0c5cd483f3692a10610386e4dc9c57871ba7',
  },
  USDC: {
    assetId: 10,
    poolId: '0xa3582097b4c57630046c0c49a88bfc6b202a3ec0a9db5597c31765f7563755a8',
    supplyBalanceParentId: '0x08b5ce8574ac3bc9327e66ad5decd34d07ee798f724ad01058e8855ac9acb605',
    borrowBalanceParentId: '0xb0b0c7470e96cabbb4f1e8d06bef2fbea65f4dbac52afae8635d9286b1ea9a09',
  },
  USDT: {
    assetId: 19,
    poolId: '0xa3e0471746e5d35043801bce247d3b3784cc74329d39f7ed665446ddcf22a9e2',
    supplyBalanceParentId: '0xe0399b39ca6127a879071371aff22ca98d8e7f24872afa8435a12e2a77c00e15',
    borrowBalanceParentId: '0xc14d8292a7d69ae31164bafab7ca8a5bfda11f998540fe976a674ed0673e448f',
  },
  WAL: {
    assetId: 24,
    poolId: '0xef76883525f5c2ff90cd97732940dbbdba0b391e29de839b10588cee8e4fe167',
    supplyBalanceParentId: '0xa476b12f8b45c7cb595cf1648822d48e4e82d63a47ba94304f3ad3bb19247ff9',
    borrowBalanceParentId: '0xf8741f2550b0d7f7a3179ba2a0363c73e206ca6691d2d1ebbb95b6018359e17b',
  },
  CETUS: {
    assetId: 4,
    poolId: '0x3c376f857ec4247b8ee456c1db19e9c74e0154d4876915e54221b5052d5b1e2e',
    supplyBalanceParentId: '0x6adc72faf2a9a15a583c9fb04f457c6a5f0b456bc9b4832413a131dfd4faddae',
    borrowBalanceParentId: '0x4c3da45ffff6432b4592a39cdb3ce12f4a28034cbcb804bb071facc81fdd923d',
  },
  AUSD: {
    assetId: 9,
    poolId: '0xc9208c1e75f990b2c814fa3a45f1bf0e85bb78404cfdb2ae6bb97de58bb30932',
    supplyBalanceParentId: '0xe151af690355de8be1c0281fbd0d483c099ea51920a57c4bf8c9666fd36808fd',
    borrowBalanceParentId: '0x551300b9441c9a3a16ca1d7972c1dbb4715e15004ccd5f001b2c2eee22fd92c1',
  },
  DEEP: {
    assetId: 15,
    poolId: '0x08373c5efffd07f88eace1c76abe4777489d9ec044fd4cd567f982d9c169e946',
    supplyBalanceParentId: '0x3fdd91f32dcea2af6e16ae66a7220f6439530ef6238deafe5a72026b3e7aa5f5',
    borrowBalanceParentId: '0xba03bb3e0167e1ec355926dfe0c130866857b062b93fb5d9cfba20824ad9f1d5',
  },
  BLUE: {
    assetId: 17,
    poolId: '0xe2cfd1807f5b44b44d7cabff5376099e76c5f0e4b35a01bdc4b0ef465a23e32c',
    supplyBalanceParentId: '0xc12b3d04d566fb418a199a113c09c65c121fd878172084ec0c60e08def51726f',
    borrowBalanceParentId: '0x897b75f0e55b9cfaae65e818d02ebefa5c91d4cf581f9c7c86d6e39749c87020',
  },
  BUCK: {
    assetId: 18,
    poolId: '0x98953e1c8af4af0cd8f59a52f9df6e60c9790b8143f556751f10949b40c76c50',
    supplyBalanceParentId: '0xdcd4fd6c686eebb54b1816e9851183647a306817303d306bbf70f82757f3eff9',
    borrowBalanceParentId: '0x6ae3645ff5936c10ab98c2529d3a316b0d4b22eff46d0d262e27db41371af597',
  },
};

export function getNaviPool(symbol: string) {
  return NAVI_POOLS[symbol] || null;
}
