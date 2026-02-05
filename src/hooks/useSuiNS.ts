import { useQuery } from '@tanstack/react-query';
import { useSuiClient } from '@mysten/dapp-kit';

export function useSuiNS(nameOrAddress: string | undefined) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ['suins', nameOrAddress],
    queryFn: async () => {
      if (!nameOrAddress) return null;

      // If it's already an address (starts with 0x), return as-is
      if (nameOrAddress.startsWith('0x')) {
        return {
          address: nameOrAddress,
          name: null,
          isResolved: false,
        };
      }

      // If it ends with .sui, try to resolve it
      if (nameOrAddress.endsWith('.sui')) {
        try {
          // Use SuiNS SDK to resolve the name
          // For now, we'll use the SuiNS contract directly
          const SUINS_PACKAGE = '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0';

          // Query the name record
          const name = nameOrAddress.replace('.sui', '');

          // This is a simplified approach - you may need to adjust based on actual SuiNS implementation
          // For production, consider using @mysten/suins-toolkit

          // For now, return the name as-is and let the transaction fail if invalid
          // TODO: Implement proper SuiNS resolution using the SuiNS SDK
          return {
            address: nameOrAddress,
            name: nameOrAddress,
            isResolved: false,
            error: 'SuiNS resolution not yet fully implemented',
          };
        } catch (error) {
          console.error('Failed to resolve SuiNS name:', error);
          return {
            address: null,
            name: nameOrAddress,
            isResolved: false,
            error: 'Failed to resolve name',
          };
        }
      }

      // Invalid format
      return {
        address: null,
        name: nameOrAddress,
        isResolved: false,
        error: 'Invalid address or name format',
      };
    },
    enabled: !!nameOrAddress && nameOrAddress.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
