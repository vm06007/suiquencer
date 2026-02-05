import { useCurrentAccount, useSuiClientQuery, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';
import { Wallet, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { TOKENS } from '@/config/tokens';

export function WalletConnect() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [showMenu, setShowMenu] = useState(false);

  // Get SUI balance
  const { data: suiBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.SUI.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Get USDC balance
  const { data: usdcBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDC.coinType,
    },
    {
      enabled: !!account,
    }
  );

  // Get USDT balance
  const { data: usdtBalance } = useSuiClientQuery(
    'getBalance',
    {
      owner: account?.address || '',
      coinType: TOKENS.USDT.coinType,
    },
    {
      enabled: !!account,
    }
  );

  const formatBalance = (balance: string, decimals: number) => {
    const amount = Number(balance) / Math.pow(10, decimals);
    return amount.toFixed(decimals === 9 ? 4 : 2);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };
// they sort of overlap with CM hackathon and yes sounds good if I win lets see how much rewards going to be
// but biggest reward for sure awaits you in BKK :P
  return (
    <div className="flex flex-col gap-2 w-full">
      {account ? (
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600 font-mono">
              {formatAddress(account.address)}
            </span>
          </div>

          <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5 space-y-1">
            <div className="text-xs text-gray-600">Balance</div>
            {suiBalance && (
              <div className="text-sm font-semibold text-green-700">
                {formatBalance(suiBalance.totalBalance, TOKENS.SUI.decimals)} SUI
              </div>
            )}
            {usdcBalance && Number(usdcBalance.totalBalance) > 0 && (
              <div className="text-xs font-medium text-gray-700">
                {formatBalance(usdcBalance.totalBalance, TOKENS.USDC.decimals)} USDC
              </div>
            )}
            {usdtBalance && Number(usdtBalance.totalBalance) > 0 && (
              <div className="text-xs font-medium text-gray-700">
                {formatBalance(usdtBalance.totalBalance, TOKENS.USDT.decimals)} USDT
              </div>
            )}
          </div>

          <div className="relative w-full">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-mono text-sm"
            >
              <span className="truncate">{formatAddress(account.address)}</span>
              <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
            </button>

            {showMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    disconnect();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 w-full">
          <div className="text-sm text-gray-600">Connect your wallet to get started</div>
          <div className="w-full [&>button]:w-full [&>button]:px-4 [&>button]:py-2 [&>button]:bg-blue-600 [&>button]:text-white [&>button]:rounded-lg [&>button]:hover:bg-blue-700 [&>button]:transition-colors [&>button]:font-medium [&>button]:border-0">
            <ConnectButton />
          </div>
        </div>
      )}
    </div>
  );
}
