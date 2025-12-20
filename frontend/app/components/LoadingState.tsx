'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const LOADING_MESSAGES = [
  'Etching words into Ethereum...',
  'Whispering to the chain...',
  'Blob in transit...',
  'Sending vibes onchain...',
  'Waiting for consensus...',
  'Talking to validators...',
  'Blob inclusion pending...',
  'Ethereum is thinking...',
  'Negotiating with the mempool...',
  'Chain is chewing...',
  'Your blob is blobbin...',
  'Onchain magic happening...',
  'Loading, but decentralized...',
  'Blockchain doing blockchain things...',
  'Teaching Ethereum your message...',
  'Asking nicely for inclusion...',
  'Still processing, still vibing...',
  'Blobs take their time...',
  'Consensus forming slowly...',
  'This is normal...',
  'Ethereum moves slowly...',
  'Waiting builds character...',
  'Good blobs take time...',
  'Time passes onchain...',
  'Please enjoy the spinner...',
  'Decentralization takes patience...',
  'Almost there, probably...',
  'Your message is cooking...',
  'Chain-level contemplation...',
  'Blob pipeline active...',
  'Data becoming destiny...',
  'Words becoming blobs...',
  'Thought entering consensus...',
  'Message crossing the threshold...',
  'A blob is born...',
  'Temporary permanence loading...',
  'Onchain thoughts loading...',
  'Blobs before regrets...',
  'Still alive, still working...',
  'Patience is permissionless...',
  'Ethereum typing...',
  'Consensus soon...',
  'Blob magic pending...',
  'Cryptographic vibes loading...',
  'The blob awakens...',
  'This takes a minute...',
  'Chain says "hold on"...',
  'Blob creation underway...',
  'Almost immutable-ish...',
  'Decentralized loading screen...',

  // additional
  'Blob drifting onchain...',
  'Waiting for blob love...',
  'Ethereum says maybe...',
  'Consensus doing its thing...',
  'Mempool whispers back...',
  'Validators are judging...',
  'Chain energy building...',
  'Blob seeking acceptance...',
  'Ethereum clears throat...',
  'Still blobbin along...',
  'Gas fumes detected...',
  'Protocol vibes aligning...',
  'Chain mood stabilizing...',
  'Blobs hate being rushed...',
  'Onchain patience required...',
  'Data wants consensus...',
  'Ethereum blinking slowly...',
  'Blob awaiting destiny...',
  'Chain spirits consulted...',
  'Decentralization in progress...',
  'This is very onchain...',
  'Trust the protocol...',
  'Validators nodding slowly...',
  'Blob finding its home...',
  'Ethereum stretching time...',
  'Waiting for finality...',
  'Chain hums quietly...',
  'Consensus warming up...',
  'Blob energy charging...',
  'Ethereum pondering existence...',
];


export function LoadingState() {
  const [currentMessage, setCurrentMessage] = useState(() => 
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );

  // Rotate messages every 4 seconds when loading
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center mb-6">
        <Loader2 className="w-16 h-16 text-violet-500 animate-spin" />
      </div>
      <h2 className="text-3xl font-bold text-slate-100 mb-2">Creating Your Blob</h2>
      <p className="text-slate-400 text-sm transition-opacity duration-300">{currentMessage}</p>
      <div className="mt-6 space-y-2">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-slate-500">This may take a moment...</p>
      </div>
    </div>
  );
}
