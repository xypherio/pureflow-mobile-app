import { useEffect, useRef, useState } from "react";

/**
 * Custom hook to detect when an element enters the viewport
 * Useful for lazy loading components that should only render when visible
 *
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection ratio threshold (0-1)
 * @param {number} options.rootMargin - Root margin for intersection observer
 * @returns {Object} - { ref: React ref, isIntersecting: boolean }
 */
export const useViewport = ({
  threshold = 0.1,
  rootMargin = '50px'
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Use IntersectionObserver for better performance
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);

        // Once visible, mark as been visible (prevents re-lazy loading on scroll)
        if (isVisible && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, hasBeenVisible]);

  return { ref, isIntersecting, hasBeenVisible };
};

/**
 * Hook that provides lazy loading logic
 * Component only loads when it enters viewport AND autoLoad is true
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - Whether to auto-load when visible
 * @param {number} options.threshold - Intersection threshold
 * @param {string} options.rootMargin - Root margin
 * @returns {Object} - Viewport detection and loading state
 */
export const useLazyViewport = ({
  autoLoad = true,
  threshold = 0.1,
  rootMargin = '50px'
} = {}) => {
  const { ref, isIntersecting, hasBeenVisible } = useViewport({
    threshold,
    rootMargin
  });

  // Load content when visible and autoLoad is enabled
  const shouldLoad = autoLoad && hasBeenVisible;

  return {
    ref,
    isIntersecting,
    hasBeenVisible,
    shouldLoad
  };
};

export default useViewport;
