import { NextResponse } from 'next/server';
import { calculateBlobPrice } from './lib/price';
import { getServerConfigInstance } from '../create-blob/lib/config';
import { generateQuoteId, storePriceQuote } from '../lib/price-cache';

export async function GET() {
  try {
    const config = getServerConfigInstance();
    const priceData = await calculateBlobPrice(config.rpcUrl);
    
    // Generate a unique quote ID and cache the price (Upstash Redis cache)
    const quoteId = generateQuoteId();
    await storePriceQuote(quoteId, priceData.priceWei);
    
    console.log(`[blob-price] Generated quote ID: ${quoteId} for price: ${priceData.priceWei} wei`);
    
    return NextResponse.json({
      ...priceData,
      quoteId, // Include quote ID in response
    });
  } catch (error) {
    console.error('Error fetching blob price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blob price';

    return NextResponse.json(
      {
        error: errorMessage,
        details: 'Using provider.getFeeData() only; no RPC calls required.',
      },
      { status: 500 }
    );
  }
}
