"use client";

import { useEffect, useState } from "react";

/**
 * Delays updating a value until a specified delay has elapsed
 * since the last change. Useful for debouncing search inputs
 * to avoid excessive API calls on every keystroke.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 400ms)
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
