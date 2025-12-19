# Deployment Guide

This guide explains how to deploy the Escrow contract to Mainnet and Sepolia testnet.

## Prerequisites

1. **Foundry installed** - If not already installed:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment variables set up** - Create a `.env` file in the `contracts/` directory:
   ```bash
   cd contracts
   cp env.example .env
   # Edit .env with your values
   ```
   
   **Note:** The `env.example` file contains a template with all required variables. Copy it to `.env` and fill in your actual values.

3. **Required environment variables:**
   - `PRIVATE_KEY` - Your deployer account's private key (without 0x prefix)
   - `WORKER_ADDRESS` - The address that will be set as the worker in the Escrow contract
   - `MAINNET_RPC_URL` - RPC URL for Ethereum mainnet (e.g., from Alchemy, Infura)
   - `SEPOLIA_RPC_URL` - RPC URL for Sepolia testnet

## Deployment Steps

### Deploy to Sepolia (Testnet)

1. **Set up your environment:**
   ```bash
   export PRIVATE_KEY=your_private_key_here
   export WORKER_ADDRESS=0xYourWorkerAddress
   export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ```

2. **Deploy the contract:**
   ```bash
   forge script script/DeployEscrow.s.sol:DeployEscrow \
     --rpc-url $SEPOLIA_RPC_URL \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     -vvvv
   ```

   Or using the profile:
   ```bash
   forge script script/DeployEscrow.s.sol:DeployEscrow \
     --profile sepolia \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     -vvvv
   ```

### Deploy to Mainnet

1. **Set up your environment:**
   ```bash
   export PRIVATE_KEY=your_private_key_here
   export WORKER_ADDRESS=0xYourWorkerAddress
   export MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

2. **Deploy the contract:**
   ```bash
   forge script script/DeployEscrow.s.sol:DeployEscrow \
     --rpc-url $MAINNET_RPC_URL \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     -vvvv
   ```

   Or using the profile:
   ```bash
   forge script script/DeployEscrow.s.sol:DeployEscrow \
     --profile mainnet \
     --broadcast \
     --verify \
     --etherscan-api-key $ETHERSCAN_API_KEY \
     -vvvv
   ```

## Quick Deploy (Using deploy.sh script)

The easiest way to deploy is using the provided `deploy.sh` script:

1. **Create and configure your .env file:**
   ```bash
   cd contracts
   cp env.example .env
   # Edit .env with your actual values
   ```

2. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```
   
   The script will:
   - Automatically load variables from `.env` file
   - Prompt you to select the network (Sepolia or Mainnet)
   - Validate all required environment variables
   - Build and deploy the contract

3. **Or specify the network directly:**
   ```bash
   ./deploy.sh sepolia
   # or
   ./deploy.sh mainnet
   ```

## Using .env file

Alternatively, you can use a `.env` file:

1. Create `.env` file in the `contracts/` directory:
   ```bash
   cp env.example .env
   # Then edit .env with your actual values
   ```
   
   Or manually create `.env` with:
   ```bash
   PRIVATE_KEY=your_private_key_here
   WORKER_ADDRESS=0xYourWorkerAddress
   MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

2. Load environment variables:
   ```bash
   source .env
   ```

3. Run the deploy script or forge commands as shown above.

## Verification

After deployment, the script will output:
- Contract address
- Owner address
- Worker address

You can verify the contract on Etherscan using the `--verify` flag (requires `ETHERSCAN_API_KEY`).

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file or private keys to version control
- Use a dedicated deployment account with minimal funds
- Double-check the `WORKER_ADDRESS` before deploying
- Test on Sepolia first before deploying to Mainnet
- Keep your private keys secure and never share them

## Troubleshooting

- **"Invalid private key"**: Make sure your private key doesn't have the `0x` prefix
- **"Insufficient funds"**: Ensure your deployer account has enough ETH for gas
- **"RPC URL error"**: Verify your RPC URL is correct and accessible
- **"Verification failed"**: Check your Etherscan API key and network settings

