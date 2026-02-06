import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// Create viem client for ENS resolution
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'), // Public RPC endpoint
});

/**
 * Test ENS name resolution
 */
async function testENSResolution(ensName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${ensName}`);
  console.log('='.repeat(60));

  try {
    console.log('⏳ Resolving ENS name...');

    const resolvedAddress = await publicClient.getEnsAddress({
      name: normalize(ensName),
    });

    if (resolvedAddress) {
      console.log('✅ Valid ENS name');
      console.log(`→ ${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`);
      console.log(`\nFull address: ${resolvedAddress}`);
      console.log(`Etherscan: https://etherscan.io/address/${resolvedAddress}`);

      return {
        name: ensName,
        valid: true,
        address: resolvedAddress,
      };
    } else {
      console.log('❌ This ENS name could not be resolved');

      return {
        name: ensName,
        valid: false,
        address: null,
      };
    }
  } catch (error) {
    console.log('❌ Error resolving ENS name');
    console.error('Error details:', error.message);

    return {
      name: ensName,
      valid: false,
      address: null,
      error: error.message,
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('\n🔍 ENS Name Resolution Test');
  console.log('Using RPC: https://eth.llamarpc.com');

  const results = [];

  // Test vitally.eth
  const vitallyResult = await testENSResolution('vitally.eth');
  results.push(vitallyResult);

  // Test vitalik.eth
  const vitalikResult = await testENSResolution('vitalik.eth');
  results.push(vitalikResult);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary');
  console.log('='.repeat(60));

  results.forEach((result) => {
    console.log(`\n${result.name}:`);
    console.log(`  Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (result.address) {
      console.log(`  Address: ${result.address}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run the test
main().catch(console.error);
