import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

// The API sits on a free host that sleeps when idle, so the first request
// after a quiet spell can take about a minute. Say so once a wait passes this.
const WAKE_NOTICE_AFTER_MS = 3000;

// Wrap API calls with `track`; `waking` turns on while any of them is slow.
export const useWakeNotice = () => {
  const [slowRequests, setSlowRequests] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const track = useCallback(async <T,>(work: Promise<T>): Promise<T> => {
    let slow = false;
    const timer = setTimeout(() => {
      slow = true;
      if (mounted.current) setSlowRequests((n) => n + 1);
    }, WAKE_NOTICE_AFTER_MS);
    try {
      return await work;
    } finally {
      clearTimeout(timer);
      if (slow && mounted.current) setSlowRequests((n) => n - 1);
    }
  }, []);

  return { waking: slowRequests > 0, track };
};

// Always rendered, so screen readers announce the message when it appears.
const WakeNotice: React.FC<{ waking: boolean }> = ({ waking }) => (
  <Box
    role="status"
    sx={waking ? {
      display: 'flex', gap: 1, alignItems: 'flex-start',
      mt: 2, px: 1.5, py: 1.25, borderRadius: '10px',
      bgcolor: 'rgb(var(--accent-rgb) / 0.06)',
      border: '1px solid rgb(var(--accent-rgb) / 0.25)',
      color: '#1A3C5E', fontSize: 13, lineHeight: 1.45,
    } : undefined}
  >
    {waking && (
      <>
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            flexShrink: 0, width: 8, height: 8, mt: '5px', borderRadius: '50%',
            bgcolor: 'var(--accent)',
            animation: 'wake-pulse 1.2s ease-in-out infinite',
            '@keyframes wake-pulse': { '50%': { opacity: 0.3 } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
        Waking up the free server. The first visit after a quiet spell takes about a minute.
      </>
    )}
  </Box>
);

export default WakeNotice;
