import { JsonRpcProvider } from 'ethers';

const DEFAULT_BLOB_GAS_USED = 131072n; // Typical gas per blob
const ETH_WEI = 1_000_000_000_000_000_000n; // 1 ETH in wei
const BUFFER_MULTIPLIER = 600n;

/**
 * Calculate blob price from fee data
 */
export async function calculateBlobPrice(
  rpcUrl: string
): Promise<{
  price: number;
  priceWei: string;
  blobGasPrice: string;
  blobGasUsed: string;
  feeData: {
    maxFeePerGas: string | null;
    maxPriorityFeePerGas: string | null;
  };
}> {
  const provider = new JsonRpcProvider(rpcUrl, undefined, { polling: false });

  // Fetch standard fee data from provider
  const feeData = await provider.getFeeData();

  // Use maxFeePerGas from provider as a stand-in for blob gas price
  let blobGasPrice = feeData.maxFeePerGas ?? 30n * 10n ** 9n; // fallback 30 gwei
  blobGasPrice *= BUFFER_MULTIPLIER; // apply buffer

  const blobCost = blobGasPrice * DEFAULT_BLOB_GAS_USED;
  const blobCostEth = Number(blobCost) / Number(ETH_WEI);

  if (blobCostEth <= 0 || !isFinite(blobCostEth)) {
    throw new Error('Invalid blob cost calculated');
  }

  return {
    price: blobCostEth,
    priceWei: blobCost.toString(),
    blobGasPrice: blobGasPrice.toString(),
    blobGasUsed: DEFAULT_BLOB_GAS_USED.toString(),
    feeData: {
      maxFeePerGas: feeData.maxFeePerGas?.toString() ?? null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() ?? null,
    },
  };
}

