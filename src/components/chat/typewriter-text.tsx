/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TypewriterTextProps {
  text: string;
  isStreaming: boolean;
  /** Optional: characters per frame (default: 2 for smoother feel) */
  speed?: number;
}

export function TypewriterText({ text, isStreaming, speed = 1 }: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const animationFrameRef = useRef<number | null>(null);
  const targetTextRef = useRef(text);
  const isReducedMotionRef = useRef(false);

  // Check prefers-reduced-motion once on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    isReducedMotionRef.current = mediaQuery.matches;

    const handler = (event: MediaQueryListEvent) => {
      isReducedMotionRef.current = event.matches;
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Reset when text changes (new chunk arrives during streaming)
  useEffect(() => {
    targetTextRef.current = text;

    if (!isStreaming || isReducedMotionRef.current) {
      // Not streaming or user prefers reduced motion - show full text immediately
      setDisplayText(text);
      return;
    }

    // Cancel any pending animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Animate from current display to new target
    let currentIndex = displayText.length;
    const targetLength = text.length;

    // If text got shorter (shouldn't happen in streaming), reset
    if (currentIndex > targetLength) {
      currentIndex = 0;
      setDisplayText('');
    }

    function animate() {
      if (currentIndex >= targetLength) {
        setDisplayText(text);
        animationFrameRef.current = null;
        return;
      }

      // Advance by speed characters
      currentIndex = Math.min(currentIndex + speed, targetLength);
      setDisplayText(text.slice(0, currentIndex));

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [text, isStreaming, speed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <span dir="auto" className="block whitespace-pre-wrap">
      {displayText}
    </span>
  );
}
