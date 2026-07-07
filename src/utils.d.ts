/**
 * TypeScript Typings for Smadiums Shared Utilities.
 * @module utils
 */

export function debounce(func: Function, wait: number): Function;
export function playTone(freq: number, duration: number): void;
export function announceToScreenReader(message: string): void;
export function trapFocus(modal: HTMLElement): void;
