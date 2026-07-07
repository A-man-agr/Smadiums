/**
 * TypeScript Typings for Smadiums Interactive SVG Map.
 */

import { Zone } from './state';

export function updateSVGMapColors(zones: Record<string, Zone>): void;
export function setupMapListeners(
  calculateWayfindingRoute: () => void,
  navToSelect: HTMLSelectElement | null,
  announceToScreenReader: (message: string) => void
): void;
