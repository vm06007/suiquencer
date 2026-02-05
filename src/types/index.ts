export type ProtocolType =
  | 'wallet'
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'nft';

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
  // Tracking
  amountManuallyEdited?: boolean;
  sequenceNumber?: number;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  isLoading: boolean;
}
