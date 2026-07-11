'use client';

// src/components/ui/LoadingScreen.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + (Math.random() * 12);
      });
    }, 80);

    const timer = setTimeout(() => setVisible(false), 1800);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          aria-label="Loading spatial globe"
          role="status"
        >
          <div className="loading-ring" aria-hidden="true" />
          <div className="loading-text">Initializing Spatial Matrix</div>
          <div className="loading-bar-wrap">
            <div
              className="loading-bar-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="loading-pct">{Math.min(Math.round(progress), 100)}%</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
