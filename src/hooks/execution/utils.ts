import type { Transaction } from '@mysten/sui/transactions';

/**
 * Acquire a non-SUI coin for use in a transaction step.
 * Checks intermediateCoins first (from prior borrow/withdraw in this atomic tx),
 * then falls back to fetching from wallet.
 */
export async function acquireNonSuiCoin(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  coinType: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  stepLabel: string,
  assetSymbol: string,
) {
  // Check intermediate coins from prior steps in this atomic transaction
  const intermediateCoin = intermediateCoins.get(coinType);
  if (intermediateCoin) {
    console.log(`${stepLabel}: Using intermediate ${assetSymbol} from prior step in this transaction`);
    const [coin] = tx.splitCoins(intermediateCoin, [amountInSmallestUnit]);
    return coin;
  }

  // Fall back to fetching from wallet
  console.log(`${stepLabel}: Fetching ${assetSymbol} coins from wallet...`);
  const coins = await suiClient.getCoins({ owner: ownerAddress, coinType });
  if (!coins.data || coins.data.length === 0) {
    throw new Error(`${stepLabel}: No ${assetSymbol} coins found in wallet`);
  }
  const totalBalance = coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), BigInt(0));
  if (totalBalance < BigInt(amountInSmallestUnit)) {
    throw new Error(`${stepLabel}: Insufficient ${assetSymbol} balance`);
  }
  let remaining = BigInt(amountInSmallestUnit);
  const selected: string[] = [];
  for (const c of coins.data) {
    if (remaining <= 0n) break;
    selected.push(c.coinObjectId);
    remaining -= BigInt(c.balance);
  }
  if (selected.length > 1) {
    const [primary, ...rest] = selected;
    tx.mergeCoins(tx.object(primary), rest.map(id => tx.object(id)));
    const [coin] = tx.splitCoins(tx.object(primary), [amountInSmallestUnit]);
    return coin;
  }
  const [coin] = tx.splitCoins(tx.object(selected[0]), [amountInSmallestUnit]);
  return coin;
}
