import type { Transaction } from '@mysten/sui/transactions';
import { TOKENS, NAVI, getNaviPool } from '@/config/tokens';
import { acquireNonSuiCoin } from './utils';

export async function buildNaviDeposit(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  asset: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];
  const naviPool = getNaviPool(asset);
  if (!naviPool) {
    throw new Error(`${stepLabel}: Asset ${asset} is not supported on Navi Protocol`);
  }

  let depositCoin;
  if (asset === 'SUI') {
    [depositCoin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
  } else {
    depositCoin = await acquireNonSuiCoin(
      tx, suiClient, ownerAddress, tokenInfo.coinType,
      amountInSmallestUnit, intermediateCoins, stepLabel, asset
    );
  }

  tx.moveCall({
    target: `${NAVI.packageId}::incentive_v3::entry_deposit`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(NAVI.clock),
      tx.object(NAVI.storage),
      tx.object(naviPool.poolId),
      tx.pure.u8(naviPool.assetId),
      depositCoin,
      tx.pure.u64(amountInSmallestUnit),
      tx.object(NAVI.incentiveV2),
      tx.object(NAVI.incentiveV3),
    ],
  });

  console.log(`Added ${stepLabel}: Navi deposit ${asset} (pool: ${naviPool.poolId.slice(0, 10)}...)`);
}

export function buildNaviWithdraw(
  tx: Transaction,
  asset: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];
  const naviPool = getNaviPool(asset);
  if (!naviPool) {
    throw new Error(`${stepLabel}: Asset ${asset} is not supported on Navi Protocol`);
  }

  const withdrawnBalance = tx.moveCall({
    target: `${NAVI.packageId}::incentive_v3::withdraw_v2`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(NAVI.clock),
      tx.object(NAVI.priceOracle),
      tx.object(NAVI.storage),
      tx.object(naviPool.poolId),
      tx.pure.u8(naviPool.assetId),
      tx.pure.u64(amountInSmallestUnit),
      tx.object(NAVI.incentiveV2),
      tx.object(NAVI.incentiveV3),
      tx.object('0x5'), // SUI System State
    ],
  });

  // Convert Balance<T> → Coin<T>
  const withdrawnCoin = tx.moveCall({
    target: '0x2::coin::from_balance',
    typeArguments: [tokenInfo.coinType],
    arguments: [withdrawnBalance],
  });

  // Store as intermediate coin for potential use by subsequent steps
  const existingCoin = intermediateCoins.get(tokenInfo.coinType);
  if (existingCoin) {
    tx.mergeCoins(existingCoin, [withdrawnCoin]);
  } else {
    intermediateCoins.set(tokenInfo.coinType, withdrawnCoin);
  }

  console.log(`Added ${stepLabel}: Navi withdraw ${asset} → intermediate coin`);
}

export function buildNaviBorrow(
  tx: Transaction,
  asset: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];
  const naviPool = getNaviPool(asset);
  if (!naviPool) {
    throw new Error(`${stepLabel}: Asset ${asset} is not supported on Navi Protocol`);
  }

  const borrowedBalance = tx.moveCall({
    target: `${NAVI.packageId}::incentive_v3::borrow_v2`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(NAVI.clock),
      tx.object(NAVI.priceOracle),
      tx.object(NAVI.storage),
      tx.object(naviPool.poolId),
      tx.pure.u8(naviPool.assetId),
      tx.pure.u64(amountInSmallestUnit),
      tx.object(NAVI.incentiveV2),
      tx.object(NAVI.incentiveV3),
      tx.object('0x5'), // SUI System State
    ],
  });

  // Convert Balance<T> → Coin<T>
  const borrowedCoin = tx.moveCall({
    target: '0x2::coin::from_balance',
    typeArguments: [tokenInfo.coinType],
    arguments: [borrowedBalance],
  });

  // Store as intermediate coin for potential use by subsequent steps
  const existingCoin = intermediateCoins.get(tokenInfo.coinType);
  if (existingCoin) {
    tx.mergeCoins(existingCoin, [borrowedCoin]);
  } else {
    intermediateCoins.set(tokenInfo.coinType, borrowedCoin);
  }

  console.log(`Added ${stepLabel}: Navi borrow ${asset} → intermediate coin`);
}
