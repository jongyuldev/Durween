/**
 * Centralized strings module for Clippy
 * Provides type-safe access to all UI text and microcopy
 */

import stringsData from './en.json';

export type Strings = typeof stringsData;

/**
 * Get all strings
 */
export function getStrings(): Strings {
  return stringsData;
}

/**
 * Format a string with placeholders
 * Example: formatString("Hello {name}", { name: "World" }) => "Hello World"
 */
export function formatString(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// Export the strings object for direct access
export const strings = stringsData;
