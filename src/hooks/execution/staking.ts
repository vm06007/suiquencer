import type { Transaction } from '@mysten/sui/transactions';

export function buildNativeStake(
  tx: Transaction,
  amountInMist: number,
  validatorAddress: string,
  stepLabel: string,
) {
  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

  tx.moveCall({
    target: '0x3::sui_system::request_add_stake',
    arguments: [
      tx.object('0x5'), // SUI System State
      coin,
      tx.pure.address(validatorAddress),
    ],
  });

  console.log(`Added ${stepLabel}: Native stake SUI to validator ${validatorAddress.slice(0, 10)}...`);
}

export async function buildAftermathStake(
  tx: Transaction,
  suiClient: any,
  ownerAddress: string,
  amountInMist: number,
  validatorAddress: string | undefined,
  stepLabel: string,
) {
  const aftermath = {
    packageId: '0x1575034d2729907aefca1ac757d6ccfcd3fc7e9e77927523c06007d8353ad836',
    stakedSuiVault: '0x2f8f6d5da7f13ea37daa397724280483ed062769813b6f31e9788e59cc88994d',
    safe: '0xeb685899830dd5837b47007809c76d91a098d52aabbf61e8ac467c59e5cc4610',
    referralVault: '0x4ce9a19b594599536c53edb25d22532f82f18038dc8ef618afd00fbbfb9845ef',
    suiSystem: '0x5',
  };

  // Aftermath needs a validator address - use selected or fetch first active
  let resolvedValidator = validatorAddress;
  if (!resolvedValidator) {
    const sysState = await suiClient.getLatestSuiSystemState();
    resolvedValidator = sysState.activeValidators[0]?.suiAddress;
    if (!resolvedValidator) {
      throw new Error(`${stepLabel}: No active validators found`);
    }
  }

  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

  const afSuiCoin = tx.moveCall({
    target: `${aftermath.packageId}::staked_sui_vault::request_stake`,
    arguments: [
      tx.object(aftermath.stakedSuiVault),
      tx.object(aftermath.safe),
      tx.object(aftermath.suiSystem),
      tx.object(aftermath.referralVault),
      coin,
      tx.pure.address(resolvedValidator),
    ],
  });

  // Transfer the returned afSUI to the user
  tx.transferObjects([afSuiCoin], ownerAddress);

  console.log(`Added ${stepLabel}: Aftermath stake SUI for afSUI (validator: ${resolvedValidator.slice(0, 10)}...)`);
}

export function buildVoloStake(
  tx: Transaction,
  ownerAddress: string,
  amountInMist: number,
  stepLabel: string,
) {
  const volo = {
    packageId: '0x68d22cf8bdbcd11ecba1e094922873e4080d4d11133e2443fddda0bfd11dae20',
    stakePool: '0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5',
    metadata: '0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60',
    suiSystem: '0x5',
  };

  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

  // Use stake (non-entry) which returns Coin<CERT> (vSUI)
  const vSuiCoin = tx.moveCall({
    target: `${volo.packageId}::stake_pool::stake`,
    arguments: [
      tx.object(volo.stakePool),
      tx.object(volo.metadata),
      tx.object(volo.suiSystem),
      coin,
    ],
  });

  // Transfer the returned vSUI to the user
  tx.transferObjects([vSuiCoin], ownerAddress);

  console.log(`Added ${stepLabel}: Volo stake SUI for vSUI`);
}
