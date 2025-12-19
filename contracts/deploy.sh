#!/bin/bash

# Deployment script for Escrow contract
# Usage: ./deploy.sh [sepolia|mainnet] (optional - will prompt if not provided)

set -e

# Load .env file if it exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "Loading environment variables from .env file..."
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# Interactive chain selection if not provided as argument
if [ -z "$1" ]; then
    echo ""
    echo "Select deployment network:"
    echo "1) Sepolia (testnet)"
    echo "2) Mainnet"
    echo ""
    read -p "Enter your choice [1-2]: " choice
    
    case $choice in
        1)
            NETWORK="sepolia"
            ;;
        2)
            NETWORK="mainnet"
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
else
    NETWORK=$1
fi

if [ "$NETWORK" != "sepolia" ] && [ "$NETWORK" != "mainnet" ]; then
    echo "Error: Network must be 'sepolia' or 'mainnet'"
    exit 1
fi

echo ""
echo "Deploying Escrow contract to $NETWORK..."
echo ""

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is not set"
    echo "Please set it in your .env file or export it in your shell"
    exit 1
fi

if [ -z "$WORKER_ADDRESS" ]; then
    echo "Error: WORKER_ADDRESS environment variable is not set"
    echo "Please set it in your .env file or export it in your shell"
    exit 1
fi

if [ "$NETWORK" = "mainnet" ]; then
    if [ -z "$MAINNET_RPC_URL" ]; then
        echo "Error: MAINNET_RPC_URL environment variable is not set"
        echo "Please set it in your .env file or export it in your shell"
        exit 1
    fi
    RPC_URL="$MAINNET_RPC_URL"
    ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY:-}"
else
    if [ -z "$SEPOLIA_RPC_URL" ]; then
        echo "Error: SEPOLIA_RPC_URL environment variable is not set"
        echo "Please set it in your .env file or export it in your shell"
        exit 1
    fi
    RPC_URL="$SEPOLIA_RPC_URL"
    ETHERSCAN_API_KEY="${SEPOLIA_ETHERSCAN_API_KEY:-$ETHERSCAN_API_KEY}"
fi

# Build the contract first
echo "Building contract..."
forge build

# Deploy
echo ""
echo "Deploying..."
if [ -n "$ETHERSCAN_API_KEY" ]; then
    echo "Verification enabled"
    forge script script/DeployEscrow.s.sol:DeployEscrow \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        -vvvv
else
    echo "Verification disabled (set ETHERSCAN_API_KEY to enable)"
    forge script script/DeployEscrow.s.sol:DeployEscrow \
        --rpc-url "$RPC_URL" \
        --broadcast \
        -vvvv
fi

echo ""
echo "Deployment complete!"
