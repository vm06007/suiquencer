import { createPublicClient, createWalletClient, http, custom, namehash } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

export const TEXT_RECORD_KEY = 'suiquencer.flow';

// Reusable public client for ENS reads (no wallet needed)
export const ethPublicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

// Minimal ABI for ENS resolver setText
const ensResolverAbi = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
] as const;

/**
 * Format: "cid#key=encKey" or just "cid"
 */
function formatRecordValue(cid: string, encryptionKey?: string): string {
  if (encryptionKey) {
    return `${cid}#key=${encryptionKey}`;
  }
  return cid;
}

function parseRecordValue(value: string): { cid: string; encryptionKey?: string } {
  const hashIdx = value.indexOf('#key=');
  if (hashIdx === -1) {
    return { cid: value.trim() };
  }
  return {
    cid: value.slice(0, hashIdx).trim(),
    encryptionKey: value.slice(hashIdx + 5).trim(),
  };
}

/**
 * Read a flow CID (and optional encryption key) from an ENS text record.
 * No wallet needed — uses public RPC.
 */
export async function readFlowFromENS(
  ensName: string
): Promise<{ cid: string; encryptionKey?: string } | null> {
  const normalized = normalize(ensName);
  const value = await ethPublicClient.getEnsText({
    name: normalized,
    key: TEXT_RECORD_KEY,
  });

  if (!value) return null;
  return parseRecordValue(value);
}

/**
 * Write a flow CID (and optional encryption key) to an ENS text record.
 * Requires MetaMask or compatible Ethereum wallet via window.ethereum.
 */
export async function writeFlowToENS(
  ensName: string,
  cid: string,
  encryptionKey?: string
): Promise<string> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) {
    throw new Error('No Ethereum wallet found. Please install MetaMask.');
  }

  // Request accounts
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No Ethereum account available. Please connect your wallet.');
  }

  const account = accounts[0] as `0x${string}`;
  const normalized = normalize(ensName);

  // Get the resolver address for this ENS name
  const resolverAddress = await ethPublicClient.getEnsResolver({ name: normalized });
  if (!resolverAddress) {
    throw new Error(`No resolver found for ${ensName}. Make sure you own this ENS name.`);
  }

  // Create wallet client connected to MetaMask
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: custom(ethereum),
  });

  // Write the text record
  const value = formatRecordValue(cid, encryptionKey);
  const hash = await walletClient.writeContract({
    address: resolverAddress,
    abi: ensResolverAbi,
    functionName: 'setText',
    args: [namehash(normalized), TEXT_RECORD_KEY, value],
  });

  return hash;
}
