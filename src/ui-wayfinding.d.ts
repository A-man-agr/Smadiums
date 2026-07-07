/**
 * TypeScript Typings for Smadiums Wayfinding Component.
 * @module ui-wayfinding
 */

import { AppState } from './state';

export function calculateWayfindingRoute(
  state: AppState,
  from: string,
  to: string,
  outputContainer: HTMLElement | null,
  announceToScreenReader: (message: string) => void
): void;
