/**
 * TypeScript Typings for Smadiums shared utilities.
 * @module utils
 */

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T;
export function playTone(freq: number, duration: number): void;
export function announceToScreenReader(message: string): void;
