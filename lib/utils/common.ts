import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to conditionally join class names together and merge Tailwind CSS classes.
 *
 * Accepts any number of class values (strings, arrays, objects) and returns a single string
 * of class names, with conflicting Tailwind classes automatically resolved.
 *
 * @param {...ClassValue[]} inputs - Array of class values to process and merge.
 * @returns {string} - The merged and resolved class name string.
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
