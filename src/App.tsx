import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Flow from './components/Flow';
import '@mysten/dapp-kit/dist/index.css';

// CORS-friendly RPC endpoints for browser (Mysten fullnode blocks origin from localhost)
// PublicNode: https://sui-rpc.publicnode.com | Other options: Ankr, Chainstack, Helius
const { networkConfig } = createNetworkConfig({
  mainnet: { url: 'https://sui-rpc.publicnode.com' },
  testnet: { url: 'https://sui-testnet-rpc.publicnode.com' },
  devnet: { url: getFullnodeUrl('devnet') },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          <Flow />
          <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
