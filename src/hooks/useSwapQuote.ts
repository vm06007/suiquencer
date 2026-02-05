import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { TOKENS } from '@/config/tokens';
import { AggregatorClient } from '@cetusprotocol/aggregator-sdk';

interface SwapQuote {
  estimatedAmountOut: string;
  priceImpact: string;
  isLoading: boolean;
  error: string | null;
}

export function useSwapQuote(
  fromAsset: string | undefined,
  toAsset: string | undefined,
  amount: string | undefined,
  enabled: boolean = true
): SwapQuote {
  const suiClient = useSuiClient();
  const [quote, setQuote] = useState<SwapQuote>({
    estimatedAmountOut: '',
    priceImpact: '',
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Reset quote if inputs are invalid
    if (!enabled || !fromAsset || !toAsset || !amount || fromAsset === toAsset) {
      setQuote({
        estimatedAmountOut: '',
        priceImpact: '',
        isLoading: false,
        error: null,
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setQuote({
        estimatedAmountOut: '',
        priceImpact: '',
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchQuote = async () => {
      setQuote(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const fromToken = TOKENS[fromAsset as keyof typeof TOKENS];
        const toToken = TOKENS[toAsset as keyof typeof TOKENS];

        // Convert amount to smallest unit
        const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, fromToken.decimals));

        console.log('Fetching swap quote:', {
          from: fromToken.coinType,
          target: toToken.coinType,
          amount: amountInSmallestUnit,
        });

        // Initialize Cetus Aggregator Client
        const client = new AggregatorClient(suiClient);

        // Find routes (SDK returns a single route object, not an array)
        const route = await client.findRouters({
          from: fromToken.coinType,
          target: toToken.coinType,
          amount: amountInSmallestUnit,
          byAmountIn: true,
        });

        console.log('Routes response:', route);

        // Parse the response - SDK returns a single route object
        if (route && route.amountOut) {
          const amountOut = route.amountOut;
          const deviationRatio = route.deviationRatio || 0;

          // Convert BN to number if needed
          const amountOutValue = typeof amountOut === 'object' && 'toNumber' in amountOut
            ? amountOut.toNumber()
            : parseFloat(amountOut.toString());

          // Convert amount out from smallest unit to decimal
          const amountOutDecimal = amountOutValue / Math.pow(10, toToken.decimals);

          // Convert deviation ratio to price impact percentage
          const priceImpactPercent = parseFloat(deviationRatio) * 100;

          setQuote({
            estimatedAmountOut: amountOutDecimal.toFixed(toToken.decimals === 9 ? 4 : 2),
            priceImpact: priceImpactPercent.toFixed(2),
            isLoading: false,
            error: null,
          });
        } else if (route && route.insufficientLiquidity) {
          console.warn('Insufficient liquidity');
          setQuote({
            estimatedAmountOut: '',
            priceImpact: '',
            isLoading: false,
            error: 'Insufficient liquidity',
          });
        } else {
          console.warn('No routes found');
          setQuote({
            estimatedAmountOut: '',
            priceImpact: '',
            isLoading: false,
            error: 'No routes available',
          });
        }
      } catch (error: any) {
        console.error('Error fetching swap quote:', error);
        setQuote({
          estimatedAmountOut: '',
          priceImpact: '',
          isLoading: false,
          error: error.message || 'Failed to fetch quote',
        });
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [fromAsset, toAsset, amount, enabled, suiClient]);

  return quote;
}
