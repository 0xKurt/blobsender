# BlobSender

A monorepo containing a Foundry smart contract project and a Next.js frontend.

## Project Structure

```
blobsender/
├── contracts/          # Foundry smart contract project
│   ├── src/           # Solidity source files
│   ├── test/          # Foundry test files
│   ├── script/        # Foundry deployment scripts
│   └── foundry.toml   # Foundry configuration
├── frontend/          # Next.js frontend application
│   ├── app/           # Next.js app directory
│   ├── public/        # Static assets
│   └── package.json   # Frontend dependencies
└── package.json       # Root workspace configuration
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) - For smart contract development

## Setup

### Install Foundry

If you haven't installed Foundry yet:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Install Dependencies

Install frontend dependencies:

```bash
npm install
```

## Development

### Smart Contracts

Navigate to the contracts directory:

```bash
cd contracts
```

**Run tests:**
```bash
forge test
```

**Build contracts:**
```bash
forge build
```

**Run a script:**
```bash
forge script <script_name>
```

### Frontend

The frontend is a Next.js application with TypeScript and Tailwind CSS.

**Start development server:**
```bash
npm run dev
```

Or from the root:
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm run start
```

## Scripts

From the root directory:

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js app for production
- `npm run start` - Start Next.js production server
- `npm run lint` - Run ESLint
- `npm run test:contracts` - Run Foundry tests
- `npm run build:contracts` - Build Foundry contracts

