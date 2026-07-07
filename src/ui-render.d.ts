/**
 * TypeScript Typings for Smadiums UI Rendering Module.
 * @module ui-render
 */

import { AppState } from './state';

export function initUI(): void;
export function render(state: AppState): void;

// Re-exports for backward compatibility
export { playTone } from './utils';
export { speakTextTextToSpeech } from './ui-chat';
