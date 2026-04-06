import { useCallback, useRef, useState } from 'react';

export const useFaceProcessingAnimation = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  const closeModal = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setModalOpen(false);
  }, []);

  const startProcessing = useCallback((durationMs = 10000, options?: { autoClose?: boolean }) => {
    return new Promise<void>((resolve) => {
      const autoClose = options?.autoClose ?? true;

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setProgress(0);
      setModalOpen(true);
      const startedAt = Date.now();

      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const nextProgress = Math.min((elapsed / durationMs) * 100, 100);
        setProgress(nextProgress);

        if (nextProgress >= 100) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }

          if (autoClose) {
            setTimeout(() => {
              setModalOpen(false);
              resolve();
            }, 200);
            return;
          }

          resolve();
        }
      }, 100);
    });
  }, []);

  return {
    modalOpen,
    progress,
    startProcessing,
    closeModal,
  };
};
