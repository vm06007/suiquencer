import { createConfig, Sui } from '@lifi/sdk';

// Create Sui provider - wallet is injected before execution via suiProvider.setOptions()
export const suiProvider = Sui();

// Configure LI.FI SDK with Sui provider for cross-chain execution
createConfig({
  integrator: 'Suiquencer',
  apiKey: import.meta.env.VITE_LIFI_API_KEY,
  providers: [suiProvider],
});

export const LIFI_CONFIG = {
  integrator: 'Suiquencer',
  apiKey: import.meta.env.VITE_LIFI_API_KEY,
};
