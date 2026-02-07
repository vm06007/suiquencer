import { createElement } from 'react';
import toast from 'react-hot-toast';
import { executeRoute, getRoutes } from '@lifi/sdk';
import { suiProvider } from '@/config/lifi';
import type { Node } from '@xyflow/react';
import type { NodeData } from '@/types';

export interface BridgeProcessInfo {
  type: string;
  status: string;
  txHash?: string;
  txLink?: string;
}

export interface BridgeStatus {
  status: 'signing' | 'pending' | 'bridging' | 'done' | 'failed';
  processes: BridgeProcessInfo[];
  tool?: string;
  fromAsset?: string;
  toAsset?: string;
  fromChain?: string;
  toChain?: string;
  error?: string;
}

// LI.FI chain/token mappings for re-routing on bridge failure
const SUI_CHAIN_ID = 9270000000000000;
const DEST_CHAIN_IDS: Record<string, number> = {
  ethereum: 1, polygon: 137, arbitrum: 42161, optimism: 10,
  base: 8453, avalanche: 43114, bsc: 56,
};
const SUI_TOKEN_ADDRESSES: Record<string, string> = {
  SUI: '0x2::sui::SUI',
  USDC: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  USDT: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
};
const EVM_TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
  USDT: { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', 137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', 43114: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', 56: '0x55d398326f99059fF775485246999027B3197955' },
  ETH: { 1: '0x0000000000000000000000000000000000000000', 42161: '0x0000000000000000000000000000000000000000', 10: '0x0000000000000000000000000000000000000000', 8453: '0x0000000000000000000000000000000000000000' },
  WBTC: { 1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 137: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 42161: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  DAI: { 1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', 137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', 42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', 10: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1' },
};

/**
 * Execute all bridge nodes via LI.FI SDK.
 * Handles retry loop with alternative route re-fetching on failure.
 */
export async function executeBridgeNodes(
  bridgeNodes: Node<NodeData>[],
  accountAddress: string,
  currentWallet: any,
  setBridgeStatus: (val: BridgeStatus | ((prev: BridgeStatus | null) => BridgeStatus | null)) => void,
  setLastResult: (val: { digest: string; stepCount: number; hasBridgeOperation?: boolean }) => void,
  suiDigest: string | undefined,
  actualStepCount: number,
) {
  if (!currentWallet) {
    throw new Error('Wallet not connected. Please connect your wallet for bridge operations.');
  }

  // Inject the connected wallet into the LI.FI Sui provider
  suiProvider.setOptions({
    getWallet: async () => currentWallet as any,
  });

  const totalSteps = actualStepCount + bridgeNodes.length;

  for (const bridgeNode of bridgeNodes) {
    let activeRoute = bridgeNode.data.lifiRoute;
    const asset = bridgeNode.data.bridgeAsset || 'SUI';
    const outputAsset = bridgeNode.data.bridgeOutputAsset || 'USDC';
    const chain = bridgeNode.data.bridgeChain || 'ethereum';
    const deniedBridges: string[] = [];
    const maxRetries = 3;

    console.log(`Executing LI.FI bridge: ${asset} from Sui -> ${chain}...`);

    let sourceTxHash = '';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const currentTool = activeRoute.steps?.[0]?.tool || 'unknown';

      // Initialize/update bridge status
      setBridgeStatus({
        status: 'signing',
        processes: [],
        tool: currentTool,
        fromAsset: asset,
        toAsset: outputAsset,
        fromChain: 'Sui',
        toChain: chain,
      });

      if (attempt > 0) {
        console.log(`Retry ${attempt}/${maxRetries - 1}: trying bridge tool "${currentTool}" (excluded: ${deniedBridges.join(', ')})`);
        toast.loading(`Retrying with ${currentTool}...`, { id: 'bridge-exec' });
      }

      try {
        await executeRoute(activeRoute, {
          updateRouteHook: (updatedRoute) => {
            const step = updatedRoute.steps[0];
            const processes = step?.execution?.process || [];

            let derivedStatus: BridgeStatus['status'] = 'signing';
            const hasConfirmedTx = processes.some((p: any) => p.txHash);
            const hasDone = processes.every((p: any) => p.status === 'DONE');
            const hasFailed = processes.some((p: any) => p.status === 'FAILED');
            const hasBridging = processes.some((p: any) =>
              p.type === 'CROSS_CHAIN' && (p.status === 'PENDING' || p.status === 'DONE')
            );

            if (hasFailed) derivedStatus = 'failed';
            else if (hasDone) derivedStatus = 'done';
            else if (hasBridging) derivedStatus = 'bridging';
            else if (hasConfirmedTx) derivedStatus = 'pending';

            setBridgeStatus({
              status: derivedStatus,
              processes: processes.map((p: any) => ({
                type: p.type || 'UNKNOWN',
                status: p.status || 'UNKNOWN',
                txHash: p.txHash,
                txLink: p.txLink,
              })),
              tool: step?.tool,
              fromAsset: asset,
              toAsset: outputAsset,
              fromChain: 'Sui',
              toChain: chain,
            });

            if (hasConfirmedTx && !sourceTxHash) {
              sourceTxHash = processes.find((p: any) => p.txHash)?.txHash || '';
              // Show confirmation toast with LI.FI tracking link
              toast.success(
                createElement('span', null,
                  'Bridge signed! ',
                  createElement('a', {
                    href: `https://scan.li.fi/tx/${sourceTxHash}`,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    style: { color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' },
                  }, 'Track on LI.FI'),
                ),
                { duration: 10000, id: 'bridge-confirmed' }
              );
            }

            for (const p of processes) {
              console.log(`LI.FI [${p.type}]: ${p.status}${p.txHash ? ` tx: ${p.txHash}` : ''}`);
            }
          },
        });

        // Success!
        toast.dismiss('bridge-exec');
        toast.dismiss('bridge-confirmed');
        setBridgeStatus(prev => prev ? { ...prev, status: 'done' } : null);
        toast.success(
          createElement('span', null,
            `Bridge to ${chain} complete! `,
            sourceTxHash && createElement('a', {
              href: `https://scan.li.fi/tx/${sourceTxHash}`,
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' },
            }, 'View on LI.FI'),
          ),
          { duration: 15000 }
        );
        break;

      } catch (error: any) {
        toast.dismiss('bridge-exec');
        console.error(`Bridge attempt ${attempt + 1} failed (${currentTool}):`, error);

        const rawMsg = error?.message || error?.cause?.message || '';

        // User rejected - stop immediately
        if (/user rejected|rejected the request|rejected the transaction/i.test(rawMsg)) {
          throw error;
        }

        // Source tx already went through - can't retry, show tracking
        if (sourceTxHash) {
          setBridgeStatus(prev => prev ? { ...prev, status: 'bridging' } : null);
          toast.success('Bridge transaction submitted! Track status on LI.FI Explorer.');
          break;
        }

        // Dry run / simulation failure - try next bridge
        const isRetryable = rawMsg.includes('Dry run failed') || rawMsg.includes('MoveAbort') || rawMsg.includes('422');
        if (!isRetryable || attempt >= maxRetries - 1) {
          setBridgeStatus(prev => prev ? { ...prev, status: 'failed', error: `All bridge routes failed. Last error: ${currentTool} simulation failed.` } : null);
          throw new Error(`Bridge failed after ${attempt + 1} attempt(s). No working route found for ${asset} -> ${outputAsset} on ${chain}. Try a larger amount or different destination chain.`);
        }

        // Exclude failed bridge and re-route
        deniedBridges.push(currentTool);
        console.log(`Excluding ${currentTool}, fetching alternative route...`);
        toast.loading(`${currentTool} failed, finding alternative route...`, { id: 'bridge-exec' });

        try {
          const destChainId = DEST_CHAIN_IDS[chain] || 1;
          const fromToken = SUI_TOKEN_ADDRESSES[asset];
          const toToken = EVM_TOKEN_ADDRESSES[outputAsset]?.[destChainId];
          if (!fromToken || !toToken) {
            throw new Error(`No token address for ${!fromToken ? asset : outputAsset}`);
          }

          const fromDecimals = asset === 'SUI' || asset === 'WAL' ? 9 : 6;
          const amount = parseFloat(bridgeNode.data.bridgeAmount || '0');
          const fromAmount = Math.floor(amount * Math.pow(10, fromDecimals)).toString();

          // Use destination address from the original route (resolved from ENS during quote fetch)
          let toAddress = activeRoute.toAddress;
          if (!toAddress || toAddress === '0x0000000000000000000000000000000000000001') {
            toAddress = activeRoute.steps?.[0]?.action?.toAddress || bridgeNode.data.ethereumAddress || '0x0000000000000000000000000000000000000001';
          }

          const newRoutes = await getRoutes({
            fromChainId: SUI_CHAIN_ID,
            toChainId: destChainId,
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            fromAmount,
            fromAddress: accountAddress,
            toAddress,
            options: {
              order: 'RECOMMENDED' as const,
              denyBridges: deniedBridges,
            } as any,
          });

          if (!newRoutes.routes?.length) {
            throw new Error('No alternative routes found');
          }

          activeRoute = newRoutes.routes[0];
          console.log(`Found alternative route via ${activeRoute.steps[0]?.tool}`);
        } catch (rerouteError: any) {
          toast.dismiss('bridge-exec');
          setBridgeStatus(prev => prev ? { ...prev, status: 'failed', error: `No alternative routes available. ${rerouteError.message}` } : null);
          throw new Error(`Bridge failed: ${currentTool} simulation failed and no alternative routes found. Try a larger amount or different destination chain.`);
        }
      }
    }

    // Show the modal with bridge tracking
    setLastResult({
      digest: suiDigest || sourceTxHash || 'bridge-pending',
      stepCount: totalSteps,
      hasBridgeOperation: true,
    });
  }
}
