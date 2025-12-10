import { useState, useEffect } from "react";

// Helper functions for localStorage
const getStoredValue = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredValue = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is not available
  }
};

// Custom hook for localStorage with automatic persistence
function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with value from localStorage or default value
  const [storedValue, setStoredValueState] = useState<T>(() =>
    getStoredValue(key, defaultValue)
  );

  // Custom setter that handles both direct values and updater functions
  const setValue = (value: T | ((prev: T) => T)) => {
    const newValue =
      typeof value === "function"
        ? (value as (prev: T) => T)(storedValue)
        : value;
    setStoredValueState(newValue);
  };

  // Update localStorage whenever value changes
  useEffect(() => {
    setStoredValue(key, storedValue);
  }, [key, storedValue]);

  // Return state and setter function
  return [storedValue, setValue];
}

// Utility function to clear specific localStorage keys
const clearStoredValues = (keys: string[]): void => {
  try {
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Silently fail if localStorage is not available
  }
};

// Clear all Wikipedia app specific localStorage keys
const clearAllWikiStoredValues = (): void => {
  clearStoredValues([
    "wiki-title",
    "wiki-lang",
    "wiki-policy",
    "wiki-autoRejectCN",
    "wiki-strictness",
  ]);
};

export default useLocalStorage;
export { clearAllWikiStoredValues, clearStoredValues };
