export type ProtocolType =
  | 'wallet'
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'lend'
  | 'nft'
  | 'logic'
  | 'custom';

export type ComparisonOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
export type LogicType = 'balance' | 'contract';

export interface NodeData extends Record<string, unknown> {
  label: string;
  type: 'wallet' | 'protocol';
  protocol?: ProtocolType;
  // Transfer specific
  recipientAddress?: string;
  amount?: string;
  asset?: string;
  // Swap specific
  fromAsset?: string;
  toAsset?: string;
  estimatedAmountOut?: string;
  estimatedAmountOutSymbol?: string;
  swapProtocol?: string; // cetus, turbos, aftermath
  slippageTolerance?: string; // percentage (e.g., "1" for 1%)
  transactionDeadline?: string; // minutes (e.g., "20" for 20 minutes)
  // Logic specific
  logicType?: LogicType;
  // Balance check
  balanceAddress?: string;
  balanceAsset?: string; // Which token to check (SUI, USDC, USDT)
  comparisonOperator?: ComparisonOperator;
  compareValue?: string;
  // Contract check
  contractPackageId?: string;
  contractModule?: string;
  contractFunction?: string;
  contractArguments?: string; // JSON array string
  contractComparisonOperator?: ComparisonOperator;
  contractCompareValue?: string;
  // Custom contract execution
  customPackageId?: string;
  customModule?: string;
  customFunction?: string;
  customArguments?: string; // JSON array string
  customTypeArguments?: string; // JSON array of type parameters like ["0x2::sui::SUI"]
  // Lend/Borrow specific
  lendAction?: string; // deposit, withdraw, borrow, repay
  lendAsset?: string; // SUI, USDC, USDT
  lendAmount?: string;
  lendProtocol?: string; // scallop, navi
  // Bridge specific
  bridgeChain?: string; // ethereum, polygon, arbitrum, etc.
  bridgeAsset?: string; // Input asset: SUI, USDC, USDT, WAL
  bridgeOutputAsset?: string; // Output asset: ETH, USDC, USDT, WBTC, etc.
  bridgeAmount?: string;
  bridgeProtocol?: string; // Destination DeFi protocol: aave, lido, uniswap, compound, none
  // Ethereum Address specific
  ethereumAddress?: string; // 0x... or name.eth
  // Tracking
  amountManuallyEdited?: boolean;
  sequenceNumber?: number;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  isLoading: boolean;
}
