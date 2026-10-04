import { useRef, useEffect, useState } from 'react';

/**
 * Visual render tracker hook.
 * Increments a counter on every render and triggers a transient flash state
 * to visually prove that untouched components do not re-render.
 */
export function useRenderTracker(): { renderCount: number; isFlashing: boolean } {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    setIsFlashing(true);
    const timer = setTimeout(() => {
      setIsFlashing(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [renderCountRef.current]);

  return {
    renderCount: renderCountRef.current,
    isFlashing,
  };
}
