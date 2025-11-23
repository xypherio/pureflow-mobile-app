import React, { useCallback, useMemo } from "react";

/**
 * Custom hook for processing and memoizing data transformations
 * Reduces re-computation by memoizing expensive operations
 *
 * @param {Function} processorFn - Function that processes the data
 * @param {Array} dependencies - Dependencies array for useMemo/useCallback
 * @returns {Object} - { processedData: any, processData: Function }
 */
export const useLazyDataProcessor = (processorFn, dependencies = []) => {
  // Memoize the processor function to prevent recreation on every render
  const memoizedProcessor = useCallback(processorFn, dependencies);

  // Return the processor function - caller can use it with their own memoization
  return {
    processData: memoizedProcessor
  };
};

/**
 * Hook that combines data processing with memoization
 * Useful for expensive data transformations that should be cached
 *
 * @param {any} inputData - Input data to process
 * @param {Function} processor - Function to process the data
 * @param {Array} dependencies - Additional dependencies
 * @returns {any} - Processed and memoized data
 */
export const useProcessedData = (inputData, processor, dependencies = []) => {
  return useMemo(() => {
    if (!inputData) return null;

    try {
      return processor(inputData);
    } catch (error) {
      console.error('Data processing error:', error);
      return null;
    }
  }, [inputData, processor, ...dependencies]);
};

/**
 * Hook for debouncing data processing operations
 * Prevents excessive processing when data changes rapidly
 *
 * @param {any} data - Input data
 * @param {Function} processor - Processing function
 * @param {number} delay - Debounce delay in milliseconds
 * @param {Array} dependencies - Additional dependencies
 * @returns {any} - Debounced processed data
 */
export const useDebouncedDataProcessor = (data, processor, delay = 300, dependencies = []) => {
  const [debouncedData, setDebouncedData] = React.useState(data);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (data !== debouncedData) {
        const processed = processor(data);
        setDebouncedData(processed);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, processor, delay, ...dependencies]);

  return debouncedData;
};

export default useLazyDataProcessor;
