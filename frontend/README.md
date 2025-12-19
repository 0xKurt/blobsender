# BlobSender Frontend

A Next.js frontend for creating and publishing blobs on the Ethereum blockchain using EIP-4844 blob transactions.

## Features

- 🌈 Beautiful, colorful dark theme UI with rainbow borders and glow effects
- 💰 Real-time blob price display
- 🔗 Wallet connection via MetaMask
- 📝 Create blobs with up to 1000 characters
- 📊 View recent blobs in a table
- 🐦 Share created blobs on Twitter
- ⚠️ Error handling with withdrawal instructions
- ⏳ Loading states and transaction tracking

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```

   Required variables:
   - `RPC_URL` - Ethereum RPC endpoint (Sepolia for testnet)
   - `NEXT_PUBLIC_RPC_URL` - Public RPC URL (for client-side)
   - `ESCROW_ADDRESS` - Deployed Escrow contract address
   - `NEXT_PUBLIC_ESCROW_ADDRESS` - Public contract address (for client-side)
   - `PRIVATE_KEY` - Private key for backend operations (server-side only)

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## How It Works

1. User connects wallet and enters text (up to 1000 characters)
2. Frontend sends request to `/api/create-blob` with text and user address
3. Backend:
   - Generates random bytes32 ID for escrow
   - Calls `createEscrow` on the contract with the ID and blob price
   - Waits for transaction confirmation
   - Creates blob transaction with the text data
   - Waits for blob transaction confirmation
   - Calls `fulfill` on the escrow contract
4. Frontend displays success with blobscan link and Twitter share option
5. If any step fails, user gets withdrawal instructions

## API Routes

### `GET /api/blob-price`
Fetches current blob gas price from the network.

### `POST /api/create-blob`
Creates an escrow, publishes blob, and fulfills escrow.

**Request:**
```json
{
  "text": "Your message here",
  "userAddress": "0x..."
}
```

**Response (success):**
```json
{
  "success": true,
  "escrowId": "0x...",
  "blobTxHash": "0x...",
  "blobscanLink": "https://sepolia.blobscan.com/blob/...",
  "etherscanLink": "https://sepolia.etherscan.io/tx/..."
}
```

**Response (error with withdrawal):**
```json
{
  "error": "Blob transaction failed",
  "escrowId": "0x...",
  "escrowTxHash": "0x...",
  "canWithdraw": true,
  "withdrawDelay": 60
}
```

### `GET /api/create-blob`
Returns the last 10 created blobs from cache.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Wagmi (Ethereum wallet connection)
- Ethers v6 (Blockchain interactions)
- KZG-WASM (Blob transaction support)

## Notes

- The app is configured for Sepolia testnet by default
- Blob transactions require EIP-4844 support (Sepolia, Mainnet after Dencun upgrade)
- The backend uses a server-side private key to handle escrow and blob transactions
- Recent blobs are cached in-memory (resets on server restart)
