import type { Transaction } from '@mysten/sui/transactions';
import { TOKENS, SCALLOP, SCALLOP_SCOINS } from '@/config/tokens';
import { acquireNonSuiCoin } from './utils';

export async function buildScallopDeposit(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  asset: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];

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
    target: `${SCALLOP.protocolPkg}::mint::mint_entry`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(SCALLOP.version),
      tx.object(SCALLOP.market),
      depositCoin,
      tx.object(SCALLOP.clock),
    ],
  });

  console.log(`Added ${stepLabel}: Scallop deposit ${asset}`);
}

export async function buildScallopWithdraw(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  asset: string,
  amount: number,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];
  const sCoinConfig = SCALLOP_SCOINS[asset];
  const marketCoinType = `${SCALLOP.coreTypePkg}::reserve::MarketCoin<${tokenInfo.coinType}>`;

  console.log(`Fetching s${asset} coins for withdraw...`);

  // Try wrapped sCoin first (SCALLOP_SUI, etc.)
  let hasWrappedSCoin = false;
  let wrappedCoins: any[] = [];
  if (sCoinConfig?.sCoinType) {
    const wrapped = await suiClient.getCoins({
      owner: ownerAddress,
      coinType: sCoinConfig.sCoinType,
    });
    wrappedCoins = wrapped.data || [];
    hasWrappedSCoin = wrappedCoins.length > 0;
  }

  // Also check raw MarketCoin
  const rawCoins = await suiClient.getCoins({
    owner: ownerAddress,
    coinType: marketCoinType,
  });
  const hasRawMarketCoin = (rawCoins.data?.length || 0) > 0;

  if (!hasWrappedSCoin && !hasRawMarketCoin) {
    throw new Error(`${stepLabel}: No s${asset} coins found in wallet. Deposit first to get sCoin tokens.`);
  }

  // Calculate sCoin amount needed based on exchange rate
  const exchangeRates: Record<string, number> = {
    SUI: 1.0931, USDC: 1.0567, USDT: 1.0489, WAL: 1.0123,
  };
  const rate = exchangeRates[asset] || 1.0;
  let sCoinAmount = Math.ceil((amount / rate) * Math.pow(10, tokenInfo.decimals));

  // Compute total available sCoin across wrapped + raw
  const totalWrappedBal = wrappedCoins.reduce((s: bigint, c: any) => s + BigInt(c.balance), BigInt(0));
  const rawCoinsList = rawCoins.data || [];
  const totalRawBal = rawCoinsList.reduce((s: bigint, c: any) => s + BigInt(c.balance), BigInt(0));
  const totalAvailableSCoin = totalWrappedBal + totalRawBal;

  console.log(`  sCoin needed: ${sCoinAmount}, available: ${totalAvailableSCoin.toString()} (wrapped: ${totalWrappedBal.toString()}, raw: ${totalRawBal.toString()})`);

  // Cap at total available — handles MAX button and exchange rate rounding
  if (BigInt(sCoinAmount) > totalAvailableSCoin && totalAvailableSCoin > BigInt(0)) {
    sCoinAmount = Number(totalAvailableSCoin);
    console.log(`  Capped sCoin amount to total available: ${sCoinAmount}`);
  }

  // Helper to select and merge coin objects
  const selectAndMergeCoins = (coins: any[], neededAmount: number) => {
    let remaining = BigInt(neededAmount);
    const selected: string[] = [];
    for (const coin of coins) {
      if (remaining <= 0) break;
      selected.push(coin.coinObjectId);
      remaining -= BigInt(coin.balance);
    }

    let coinArg;
    if (selected.length > 1) {
      const [primary, ...rest] = selected;
      tx.mergeCoins(tx.object(primary), rest.map(c => tx.object(c)));
      [coinArg] = tx.splitCoins(tx.object(primary), [neededAmount]);
    } else {
      [coinArg] = tx.splitCoins(tx.object(selected[0]), [neededAmount]);
    }
    return coinArg;
  };

  let marketCoinArg;

  if (hasWrappedSCoin && sCoinConfig?.treasuryId) {
    // Convert wrapped sCoin (SCALLOP_SUI) → MarketCoin via burn_s_coin
    if (totalWrappedBal < BigInt(sCoinAmount)) {
      // Not enough wrapped, try raw MarketCoin as fallback
      if (hasRawMarketCoin) {
        if (totalRawBal < BigInt(sCoinAmount)) {
          throw new Error(`${stepLabel}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}`);
        }
        marketCoinArg = selectAndMergeCoins(rawCoinsList, sCoinAmount);
      } else {
        throw new Error(`${stepLabel}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}, available: ${(Number(totalAvailableSCoin) / Math.pow(10, tokenInfo.decimals)).toFixed(4)}`);
      }
    } else {
      // Use wrapped sCoin: burn to get MarketCoin
      const wrappedCoinArg = selectAndMergeCoins(wrappedCoins, sCoinAmount);

      marketCoinArg = tx.moveCall({
        target: `${SCALLOP.converterPkg}::s_coin_converter::burn_s_coin`,
        typeArguments: [sCoinConfig.sCoinType, tokenInfo.coinType],
        arguments: [
          tx.object(sCoinConfig.treasuryId),
          wrappedCoinArg,
        ],
      });

      console.log(`  Converting SCALLOP_${asset} → MarketCoin via burn_s_coin`);
    }
  } else if (hasRawMarketCoin) {
    // Use raw MarketCoin directly
    if (totalRawBal < BigInt(sCoinAmount)) {
      throw new Error(`${stepLabel}: Insufficient s${asset}. Need ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset}, available: ${(Number(totalRawBal) / Math.pow(10, tokenInfo.decimals)).toFixed(4)}`);
    }
    marketCoinArg = selectAndMergeCoins(rawCoinsList, sCoinAmount);
  }

  // Call redeem_entry: burns MarketCoin and returns underlying asset
  tx.moveCall({
    target: `${SCALLOP.protocolPkg}::redeem::redeem_entry`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(SCALLOP.version),
      tx.object(SCALLOP.market),
      marketCoinArg!,
      tx.object(SCALLOP.clock),
    ],
  });

  console.log(`Added ${stepLabel}: Scallop withdraw ${amount} ${asset} (burning ~${(sCoinAmount / Math.pow(10, tokenInfo.decimals)).toFixed(4)} s${asset})`);
}

export async function buildScallopBorrow(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  asset: string,
  amountInSmallestUnit: number,
  node: any,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];

  let finalObligationId = node.data.lendObligationId;
  let finalObligationKeyId = node.data.lendObligationKeyId;

  // Auto-detect obligation from wallet
  if (!finalObligationId || !finalObligationKeyId) {
    console.log(`Auto-detecting Scallop obligation for borrow...`);

    const obligations = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::Obligation`,
      },
      options: { showContent: true },
    });

    if (!obligations.data || obligations.data.length === 0) {
      throw new Error(`${stepLabel}: No Scallop obligation found. You need collateral deposited to borrow.`);
    }

    finalObligationId = obligations.data[0].data?.objectId;

    const obligationKeys = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::ObligationKey`,
      },
      options: { showContent: true },
    });

    if (!obligationKeys.data || obligationKeys.data.length === 0) {
      throw new Error(`${stepLabel}: No Scallop obligation key found. Cannot borrow without the key.`);
    }

    finalObligationKeyId = obligationKeys.data[0].data?.objectId;

    console.log(`Found obligation: ${finalObligationId}, key: ${finalObligationKeyId}`);
  }

  if (!finalObligationId || !finalObligationKeyId) {
    throw new Error(`${stepLabel}: Could not find obligation objects for borrow`);
  }

  tx.moveCall({
    target: `${SCALLOP.protocolPkg}::borrow::borrow_entry`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(SCALLOP.version),
      tx.object(finalObligationId),
      tx.object(finalObligationKeyId),
      tx.object(SCALLOP.market),
      tx.pure.u64(amountInSmallestUnit),
      tx.object(SCALLOP.clock),
    ],
  });

  console.log(`Added ${stepLabel}: Scallop borrow ${asset} (obligation: ${finalObligationId?.slice(0, 10)}...)`);
}

export async function buildScallopRepay(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  asset: string,
  amountInSmallestUnit: number,
  intermediateCoins: Map<string, any>,
  node: any,
  stepLabel: string,
) {
  const tokenInfo = TOKENS[asset as keyof typeof TOKENS];

  let finalObligationId = node.data.lendObligationId;
  let finalObligationKeyId = node.data.lendObligationKeyId;

  if (!finalObligationId || !finalObligationKeyId) {
    console.log(`Auto-detecting Scallop obligation for repay...`);

    const obligations = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::Obligation`,
      },
      options: { showContent: true },
    });

    if (!obligations.data || obligations.data.length === 0) {
      throw new Error(`${stepLabel}: No Scallop obligation found. You need an active borrow to repay.`);
    }

    finalObligationId = obligations.data[0].data?.objectId;

    const obligationKeys = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${SCALLOP.coreTypePkg}::obligation::ObligationKey`,
      },
      options: { showContent: true },
    });

    if (!obligationKeys.data || obligationKeys.data.length === 0) {
      throw new Error(`${stepLabel}: No Scallop obligation key found. Cannot repay without the key.`);
    }

    finalObligationKeyId = obligationKeys.data[0].data?.objectId;

    console.log(`Found obligation: ${finalObligationId}, key: ${finalObligationKeyId}`);
  }

  if (!finalObligationId || !finalObligationKeyId) {
    throw new Error(`${stepLabel}: Could not find obligation objects for repay`);
  }

  // Split coin for repayment
  let repayCoin;
  if (asset === 'SUI') {
    [repayCoin] = tx.splitCoins(tx.gas, [amountInSmallestUnit]);
  } else {
    repayCoin = await acquireNonSuiCoin(
      tx, suiClient, ownerAddress, tokenInfo.coinType,
      amountInSmallestUnit, intermediateCoins, stepLabel, asset
    );
  }

  tx.moveCall({
    target: `${SCALLOP.protocolPkg}::repay::repay_entry`,
    typeArguments: [tokenInfo.coinType],
    arguments: [
      tx.object(SCALLOP.version),
      tx.object(finalObligationId),
      tx.object(finalObligationKeyId),
      tx.object(SCALLOP.market),
      repayCoin,
      tx.object(SCALLOP.clock),
    ],
  });

  console.log(`Added ${stepLabel}: Scallop repay ${asset} (obligation: ${finalObligationId?.slice(0, 10)}...)`);
}
