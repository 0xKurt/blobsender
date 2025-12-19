/**
 * Blobscan API utility for fetching blob gas price data
 * Uses blobscan.com API to get accurate blob gas price statistics
 */

const BLOBSCAN_API_URL = 'https://api.blobscan.com/stats/blocks/overall';
const FALLBACK_BLOB_GAS_PRICE = 400_000_000_000n; // 400 gwei

interface BlobscanStatsResponse {
  totalBlocks: number;
  totalBlobGasUsed: string;
  totalBlobAsCalldataGasUsed: string;
  totalBlobFee: string;
  totalBlobAsCalldataFee: string;
  avgBlobFee: number;
  avgBlobAsCalldataFee: number;
  avgBlobGasPrice: number;
  updatedAt: string;
}

/**
 * Fetch average blob gas price from blobscan API
 * @returns Average blob gas price in wei as bigint
 */
export async function fetchBlobGasPrice(): Promise<bigint> {
  try {
    const response = await fetch(BLOBSCAN_API_URL, {
      headers: {
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Blobscan API returned ${response.status}`);
    }

    const data = (await response.json()) as BlobscanStatsResponse;
    
    // avgBlobGasPrice is in wei (number), convert to bigint
    // Round to nearest integer
    const blobGasPrice = BigInt(Math.round(data.avgBlobGasPrice));
    
    console.log('Fetched blob gas price from blobscan:', blobGasPrice.toString(), 'wei');
    
    return blobGasPrice;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Failed to fetch blob gas price from blobscan API, using fallback:', errorMessage);
    return FALLBACK_BLOB_GAS_PRICE;
  }
}
