'use client';

import { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  const prevTextRef = useRef(text);
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReducedMotionRef = useRef(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotionRef.current = mediaQuery.matches;

    const handler = (event: MediaQueryListEvent) => {
      isReducedMotionRef.current = event.matches;
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Detect new content during streaming
  useEffect(() => {
    if (!isStreaming || isReducedMotionRef.current) {
      prevTextRef.current = text;
      setIsRevealing(false);
      return;
    }

    const prevText = prevTextRef.current;
    const isNewContent = text.length > prevText.length;

    if (isNewContent) {
      // New content arrived - trigger reveal animation
      setIsRevealing(true);
      prevTextRef.current = text;

      // Clear existing timeout
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }

      // Reset reveal state after animation completes
      revealTimeoutRef.current = setTimeout(() => {
        setIsRevealing(false);
      }, 150);
    } else {
      // Text didn't grow (streaming ended or reset)
      prevTextRef.current = text;
      setIsRevealing(false);
    }

    return () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, [text, isStreaming]);

  return (
    <span
      dir="auto"
      className={`block whitespace-pre-wrap transition-all duration-150 ease-out ${
        isRevealing ? 'opacity-100' : 'opacity-100'
      }`}
      style={
        isRevealing && !isReducedMotionRef.current
          ? { animation: 'streaming-reveal 0.15s ease-out' }
          : undefined
      }
    >
      {text}
    </span>
  );
}