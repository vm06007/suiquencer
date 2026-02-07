import { useState, useEffect } from 'react';

interface APYData {
  depositAPY: string;
  borrowAPY: string;
}

type ProtocolAPYs = Record<string, APYData>;

// Mock APY data - replace with real API calls later
const MOCK_APYS: Record<string, ProtocolAPYs> = {
  scallop: {
    SUI: { depositAPY: '3.15', borrowAPY: '5.8' },
    USDC: { depositAPY: '6.5', borrowAPY: '9.2' },
    USDT: { depositAPY: '5.8', borrowAPY: '8.5' },
    WAL: { depositAPY: '12.4', borrowAPY: '18.7' },
  },
  navi: {
    SUI: { depositAPY: '2.8', borrowAPY: '6.2' },
    USDC: { depositAPY: '7.2', borrowAPY: '10.1' },
    USDT: { depositAPY: '6.3', borrowAPY: '9.8' },
    WAL: { depositAPY: '11.8', borrowAPY: '17.5' },
    CETUS: { depositAPY: '1.3', borrowAPY: '8.7' },
    DEEP: { depositAPY: '2.1', borrowAPY: '9.2' },
    BLUE: { depositAPY: '1.8', borrowAPY: '7.5' },
    BUCK: { depositAPY: '4.2', borrowAPY: '8.1' },
    AUSD: { depositAPY: '5.5', borrowAPY: '9.0' },
  },
};

export function useLendingAPY(
  protocol: string = 'scallop',
  asset: string = 'SUI',
  enabled: boolean = true
) {
  const [apy, setApy] = useState<APYData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setApy(null);
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    const timeoutId = setTimeout(() => {
      const protocolData = MOCK_APYS[protocol] || MOCK_APYS.scallop;
      const assetData = protocolData[asset] || protocolData.SUI;
      setApy(assetData);
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [protocol, asset, enabled]);

  return { apy, isLoading };
}

// TODO: Replace mock data with real API calls
// Example for Scallop:
// export async function fetchScallopAPY() {
//   const response = await fetch('https://api.scallop.io/v1/markets');
//   const data = await response.json();
//   return data;
// }
