import { useEffect, useRef, useState } from 'react';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const captionsSupported = !!SR;

// Browser speech-to-text (Web Speech API). Interim text is shown live; final text is sent to the server.
export default function useLiveCaptions({ socketRef, enabled, onInterim }) {
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const lastInterim = useRef(0);
  const cb = useRef(onInterim);
  cb.current = onInterim;

  useEffect(() => {
    if (!enabled || !SR) return undefined;
    let stopped = false;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    recRef.current = rec;

    rec.onresult = (e) => {
      const socket = socketRef.current;
      if (!socket) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        if (e.results[i].isFinal) {
          socket.emit('caption:line', { text });
          cb.current?.('');
        } else {
          cb.current?.(text);
          const now = Date.now();
          if (now - lastInterim.current > 450) {
            lastInterim.current = now;
            socket.emit('caption:interim', { text });
          }
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone permission is needed for captions.');
        stopped = true;
      } else if (e.error === 'network') {
          if (navigator.brave) {
            setError('Live captions aren’t supported in Brave. Please use Chrome or Edge.');
            stopped = true; // don't keep retrying a service that will never answer
          } else {
            setError('Captions need an internet connection in this browser.');
          }
      }
    };
    // The browser ends recognition after silence; restart while enabled.
    rec.onend = () => {
      if (stopped) return;
      setTimeout(() => {
        try {
          if (!stopped) rec.start();
        } catch {
          /* already started */
        }
      }, 250);
    };
    try {
      rec.start();
      setError('');
    } catch {
      /* ignore */
    }
    return () => {
      stopped = true;
      cb.current?.('');
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    };
  }, [enabled, socketRef]);

  return { supported: !!SR, error };
}
