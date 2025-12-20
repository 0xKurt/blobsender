'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { getWagmiConfig } from './lib/wagmi';
import { getChainConfigInstance } from './lib/config';
import { ESCROW_ABI } from './lib/constants';
import { generateEscrowId } from './lib/utils';
import { validateText } from './lib/validation';
import { WalletConnection } from './components/WalletConnection';
import { BlobForm } from './components/BlobForm';
import { SuccessModal } from './components/SuccessModal';
import { ErrorModal } from './components/ErrorModal';
import { ErrorDisplay } from './components/ErrorDisplay';
import { WithdrawInfo } from './components/WithdrawInfo';
import { RecentBlobsTable } from './components/RecentBlobsTable';
import type { BlobSuccess, WithdrawInfo as WithdrawInfoType, RecentBlob } from './types';

// Configure QueryClient to reduce unnecessary refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on component mount if data exists
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    },
  },
});

function BlobSenderApp() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: txHash, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    query: {
      enabled: !!txHash, // Only poll when we have a hash
      refetchInterval: (query) => {
        // Only poll if transaction is still pending
        const data = query.state.data;
        // Transaction receipt exists means it's confirmed (status is 0 or 1)
        if (data) {
          return false; // Stop polling once we have a receipt (confirmed)
        }
        return 5000; // Poll every 5 seconds (instead of default which is faster)
      },
    },
  });

  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const [blobPrice, setBlobPrice] = useState<number | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [lastPriceFetch, setLastPriceFetch] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [pendingEscrowId, setPendingEscrowId] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null); // Store text for backend call
  const [success, setSuccess] = useState<BlobSuccess | null>(null);
  const [withdrawInfo, setWithdrawInfo] = useState<WithdrawInfoType | null>(null);
  const [recentBlobs, setRecentBlobs] = useState<RecentBlob[]>([]);

  // Update loading state based on transaction status
  useEffect(() => {
    if (isWriting || isConfirming) {
      setLoading(true);
    }
  }, [isWriting, isConfirming]);

  // Reset loading state when transaction is rejected/canceled
  useEffect(() => {
    if (writeError && !isWriting && !isConfirming) {
      setLoading(false);
      setPendingEscrowId(null);
      // Set error message for modal display only if we have a pending escrow
      // (meaning user actually tried to submit)
      if (pendingEscrowId) {
        const errorMessage = 
          writeError instanceof Error 
            ? writeError.message 
            : (writeError as { message?: string })?.message || 'Transaction failed';
        setError(errorMessage);
        setShowErrorModal(true);
      }
    }
  }, [writeError, isWriting, isConfirming, pendingEscrowId]);

  // Cache blob price to avoid excessive fetching (price doesn't change that often)
  const PRICE_CACHE_MS = 60 * 1000; // Cache price for 1 minute

  const fetchBlobPrice = useCallback(async (force = false) => {
    // Don't fetch if we have a cached price and it's still fresh
    const now = Date.now();
    if (!force && blobPrice !== null && lastPriceFetch > 0 && (now - lastPriceFetch) < PRICE_CACHE_MS) {
      console.log('Using cached blob price');
      return;
    }

    try {
      const response = await fetch('/api/blob-price');
      const data = await response.json();
      if (response.ok && typeof data.price === 'number' && data.price > 0 && data.quoteId) {
        setBlobPrice(data.price);
        setQuoteId(data.quoteId); // Store quote ID for backend verification
        setLastPriceFetch(now);
        console.log('Fetched blob price with quote ID:', data.quoteId);
      } else {
        console.error('Failed to fetch blob price:', data.error || 'Unknown error');
        setBlobPrice(null);
        setQuoteId(null);
      }
      } catch (err) {
      console.error('Failed to fetch blob price:', err);
      setBlobPrice(null);
      setQuoteId(null);
    }
  }, [blobPrice, lastPriceFetch, PRICE_CACHE_MS]);

  const fetchRecentBlobs = useCallback(async () => {
    try {
      const response = await fetch('/api/create-blob');
      const data = await response.json();
      setRecentBlobs(data.blobs || []);
    } catch (err) {
      console.error('Failed to fetch recent blobs:', err);
    }
  }, []);

  useEffect(() => {
    // Defer state update to avoid hydration mismatch
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    // Only fetch once on mount
    fetchBlobPrice(false); // Use cache if available
    fetchRecentBlobs();
    
    // Only poll when tab is visible, and increase interval to 60 seconds
    // Recent blobs don't change that frequently
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRecentBlobs();
      }
    }, 60000); // 60 seconds - recent blobs don't need frequent updates
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchBlobPrice, fetchRecentBlobs]);

  const handleEscrowConfirmed = useCallback(
    async (txHashHex: string, escrowId: string, blobText: string) => {
      console.log('[handleEscrowConfirmed] Starting backend call:', {
        txHashHex,
        escrowId,
        textLength: blobText?.length,
        userAddress: address,
      });

      try {
        console.log('[handleEscrowConfirmed] Sending POST to /api/create-blob');
        const response = await fetch('/api/create-blob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: blobText,
            userAddress: address,
            escrowTxHash: txHashHex,
            escrowId,
            // quoteId is optional - backend calculates price directly for security
            ...(quoteId && { quoteId }),
          }),
        });

        console.log('[handleEscrowConfirmed] Response status:', response.status);
        console.log('[handleEscrowConfirmed] Response ok:', response.ok);

        const responseData = await response.json();
        console.log('[handleEscrowConfirmed] Response data:', responseData);

        if (responseData.error) {
          // Ignore "already being processed" error - this is expected for duplicate requests
          // and doesn't indicate a real problem (the first request is already handling it)
          const isDuplicateRequestError = responseData.error.includes('already being processed');
          
          if (isDuplicateRequestError) {
            console.log('[handleEscrowConfirmed] Ignoring duplicate request error (expected behavior)');
            // Don't set error state - just continue normally
            // The first request will handle the blob creation
            return;
          }
          
          // Check if error is about missing/invalid quote ID - auto-retry with new quote
          const isQuoteError = 
            responseData.error.includes('Missing quote') ||
            responseData.error.includes('Invalid or expired quote') ||
            responseData.error.includes('quote ID');
          
          if (isQuoteError && !responseData.canWithdraw) {
            console.log('[handleEscrowConfirmed] Quote ID error detected, fetching new price and retrying...');
            
            // Fetch new price and quote ID (force fetch to get new quote)
            try {
              const priceResponse = await fetch('/api/blob-price');
              const priceData = await priceResponse.json();
              
              if (priceResponse.ok && typeof priceData.price === 'number' && priceData.price > 0 && priceData.quoteId) {
                setBlobPrice(priceData.price);
                setQuoteId(priceData.quoteId);
                console.log('[handleEscrowConfirmed] Fetched new quote ID:', priceData.quoteId);
                
                // Retry the request with new quote ID
                console.log('[handleEscrowConfirmed] Retrying with new quote ID...');
                const retryResponse = await fetch('/api/create-blob', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    text: blobText,
                    userAddress: address,
                    escrowTxHash: txHashHex,
                    escrowId,
                    quoteId: priceData.quoteId,
                  }),
                });
                
                const retryData = await retryResponse.json();
                
                if (retryResponse.ok && !retryData.error) {
                  // Success on retry
                  console.log('[handleEscrowConfirmed] Retry successful!');
                  setSuccess({
                    blobscanLink: retryData.blobscanLink,
                    etherscanLink: retryData.etherscanLink,
                    escrowId: retryData.escrowId,
                  });
                  setText('');
                  fetchRecentBlobs();
                  return;
                } else {
                  // Retry also failed, show error
                  console.error('[handleEscrowConfirmed] Retry also failed:', retryData.error);
                  if (retryData.canWithdraw) {
                    setWithdrawInfo({
                      escrowId: retryData.escrowId || escrowId,
                      escrowTxHash: retryData.escrowTxHash || txHashHex,
                      withdrawDelay: retryData.withdrawDelay || 60,
                      details: retryData.details,
                      expectedValue: retryData.expectedValue,
                      actualValue: retryData.actualValue,
                      etherscanLink: retryData.etherscanLink,
                      contractLink: retryData.contractLink,
                    });
                    setError(retryData.error);
                  } else {
                    setError(retryData.error + (retryData.details ? `: ${retryData.details}` : ''));
                  }
                  return;
                }
              } else {
                // Failed to fetch new price
                console.error('[handleEscrowConfirmed] Failed to fetch new price for retry');
                setError('Failed to fetch new price. Please refresh the page and try again.');
                return;
              }
            } catch (retryError: unknown) {
              console.error('[handleEscrowConfirmed] Error during retry:', retryError);
              setError('Failed to retry with new price. Please refresh the page and try again.');
              return;
            }
          }
          
          console.error('[handleEscrowConfirmed] Backend returned error:', responseData.error);
          if (responseData.canWithdraw) {
            setWithdrawInfo({
              escrowId: responseData.escrowId,
              escrowTxHash: responseData.escrowTxHash,
              withdrawDelay: responseData.withdrawDelay || 60,
              details: responseData.details,
              expectedValue: responseData.expectedValue,
              actualValue: responseData.actualValue,
              etherscanLink: responseData.etherscanLink,
              contractLink: responseData.contractLink,
            });
            setError(responseData.error);
          } else {
            setError(responseData.error + (responseData.details ? `: ${responseData.details}` : ''));
          }
        } else {
          setSuccess({
            blobscanLink: responseData.blobscanLink,
            etherscanLink: responseData.etherscanLink,
            escrowId: responseData.escrowId,
          });
          setText('');
          fetchRecentBlobs();
        }
      } catch (err: unknown) {
        console.error('Error creating blob:', err);
        setError(err instanceof Error ? err.message : 'Failed to create blob');
      } finally {
        console.log('[handleEscrowConfirmed] Finally block - resetting loading state');
        setLoading(false);
        setPendingEscrowId(null);
        setPendingText(null);
        
        // Fetch new price and quote ID for next blob creation
        // This ensures users can create multiple blobs in a row without issues
        // Force fetch to get a new quote ID (don't use cache)
        console.log('[handleEscrowConfirmed] Fetching new price for next blob creation...');
        fetchBlobPrice(true); // Force fetch to get new quote ID
      }
    },
    [address, quoteId, fetchRecentBlobs, fetchBlobPrice]
  );

  // Effect to handle escrow transaction confirmation and proceed to backend
  useEffect(() => {
    console.log('[Effect] Escrow confirmation check:', {
      isConfirmed,
      txHash,
      pendingEscrowId,
      pendingText: pendingText ? `${pendingText.length} chars` : 'empty',
      hasPendingText: !!pendingText,
    });

    if (isConfirmed && txHash && pendingEscrowId && pendingText) {
      console.log('[Effect] All conditions met, calling handleEscrowConfirmed');
      handleEscrowConfirmed(txHash, pendingEscrowId, pendingText);
    } else {
      console.log('[Effect] Conditions not met:', {
        isConfirmed,
        hasTxHash: !!txHash,
        hasPendingEscrowId: !!pendingEscrowId,
        hasPendingText: !!pendingText,
      });
    }
  }, [isConfirmed, txHash, pendingEscrowId, pendingText, handleEscrowConfirmed]);

  const handleSubmit = async (submittedText: string) => {
    // Prevent duplicate submissions
    if (loading || isWriting || isConfirming) {
      console.log('[handleSubmit] Already processing, ignoring duplicate submission');
      return;
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    const textValidation = validateText(submittedText, 1000);
    if (!textValidation.valid) {
      setError(textValidation.error || 'Invalid text');
      return;
    }

    if (!blobPrice || blobPrice <= 0) {
      setError('Blob price not available. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);
    setShowErrorModal(false);
    setSuccess(null);
    setWithdrawInfo(null);
    setText(submittedText);
    setPendingText(submittedText); // Store text for backend call

    try {
      // Step 1: Switch to configured chain if needed
      const config = getChainConfigInstance();
      if (chainId !== config.chainId) {
        console.log(`Switching to ${config.chainName} network...`);
        try {
          await switchChain({ chainId: config.chainId });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: unknown) {
          const error = switchError as { message?: string; cause?: { code?: number } };
          if (error.message?.includes('rejected') || error.cause?.code === 4001) {
            setError(`Network switch was rejected. Please switch to ${config.chainName} manually.`);
            setLoading(false);
            return;
          }
          throw new Error(`Failed to switch network: ${error.message || 'Unknown error'}`);
        }
      }

      // Step 2: Generate escrow ID
      const escrowId = generateEscrowId();
      console.log('Generated escrow ID:', escrowId);
      setPendingEscrowId(escrowId);

      // Step 3: Create escrow transaction using wagmi
      const value = parseEther(blobPrice.toFixed(18));
      console.log('Creating escrow transaction...', { escrowId, value: value.toString() });

      console.log('[handleSubmit] Calling writeContract...');
      writeContract({
        address: config.escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'createEscrow',
        args: [escrowId as `0x${string}`],
        value: value,
      });
      console.log('[handleSubmit] writeContract called, waiting for transaction...');

      // Note: writeError is checked in useEffect, not here
      // because writeContract is async and errors come later
    } catch (err: unknown) {
      console.error('Error creating escrow:', err);
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
      setLoading(false);
      setPendingEscrowId(null);
    }
  };

  const shareOnTwitter = useCallback(() => {
    if (!success) return;
    const shareText = `🚀 I just created a blob on Ethereum using EIP-4844!\n\nView my blob: ${success.blobscanLink}\n\nCreated with blobsender.xyz 🌈`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  }, [success]);

  const shareOnFarcaster = useCallback(() => {
    if (!success) return;
    const shareText = `🚀 I just created a blob on Ethereum using EIP-4844!\n\nView my blob: ${success.blobscanLink}\n\nCreated with blobsender.xyz 🌈`;
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`, '_blank');
  }, [success]);

  const closeSuccessModal = useCallback(() => {
    setSuccess(null);
  }, []);

  const closeErrorModal = useCallback(() => {
    setError(null);
    setShowErrorModal(false);
  }, []);

  const getLoadingMessage = () => {
    if (isWriting) return 'Confirm transaction in wallet...';
    if (isConfirming) return 'Waiting for confirmation...';
    return 'Creating your blob...';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4 tracking-tight text-slate-100 flex items-center justify-center gap-3">
            <Image 
              src="/favicon.ico" 
              alt="BlobSender icon" 
              width={40}
              height={40}
              className="w-10 h-10"
              unoptimized
            />
            BlobSender
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Create and share blobs on Ethereum using EIP-4844. Post messages, greetings, or anything you want - on-chain.
          </p>
        </header>

        {/* Wallet Connection */}
        <WalletConnection />

        {/* Main Form Card */}
        <div className="bg-slate-800/50 backdrop-blur-md rounded-3xl p-10 mb-12 shadow-2xl border border-slate-700">
          {/* Explanatory Text */}
          <div className="text-center mb-10">
            <p className="text-2xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 font-semibold">
              Send Your Blob
            </p>
            <p className="text-slate-300 mb-4 max-w-xxl mx-auto">
              Send a note to your mom, confess secrets, or just say hi to the blockchain.
            </p>
            <p className="text-sm text-slate-400 italic max-w-xl mx-auto">
              &ldquo;Choose your words wisely… or don&apos;t. We&apos;re not your mom.&rdquo;
            </p>
          </div>

          {/* Form */}
          <BlobForm
            onSubmit={handleSubmit}
            loading={loading}
            blobPrice={blobPrice}
            disabled={!mounted || !isConnected}
            loadingMessage={getLoadingMessage()}
            isConnected={isConnected}
          />

          {/* Error State (inline for withdraw info only) */}
          {error && withdrawInfo && <ErrorDisplay error={error} />}

          {/* Withdraw Info */}
          {withdrawInfo && <WithdrawInfo withdrawInfo={withdrawInfo} error={error || undefined} />}

          {/* Success/Loading Modal */}
          {(loading || success) && (
            <SuccessModal
              success={success}
              loading={loading}
              loadingMessage={getLoadingMessage()}
              onClose={closeSuccessModal}
              onShareTwitter={shareOnTwitter}
              onShareFarcaster={shareOnFarcaster}
            />
          )}

        </div>

        {/* Recent Blobs Table */}
        <RecentBlobsTable blobs={recentBlobs} />
      </div>

      {/* Error Modal (for non-withdraw errors) - rendered outside card to avoid z-index issues */}
      <ErrorModal error={showErrorModal && error && !withdrawInfo ? error : null} onClose={closeErrorModal} />
    </div>
  );
}

export default function Home() {
  // Get wagmi config lazily on client side only
  // Use useState with lazy initialization to avoid loading during SSR
  const [config, setConfig] = useState<ReturnType<typeof getWagmiConfig> | null>(null);
  // Initialize to false, set to true after mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Set mounted to true after component mounts
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Only load config after component has mounted on client
    if (!mounted) return;
    
    // Use setTimeout to defer state update and avoid synchronous setState warning
    const timeoutId = setTimeout(() => {
      try {
        console.log('Loading wagmi config...');
        const loadedConfig = getWagmiConfig();
        setConfig(loadedConfig);
        console.log('Wagmi config loaded successfully');
      } catch (error) {
        console.error('Failed to load wagmi config:', error);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [mounted]);
  
  // Only render when config is loaded
  if (!config) {
    return null;
  }
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <BlobSenderApp />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
