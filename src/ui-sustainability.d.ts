/**
 * TypeScript Typings for Smadiums Sustainability Component.
 * @module ui-sustainability
 */

import { AppState } from './state';

export function generateSustainabilityPlan(state: AppState, container: HTMLElement | null): Promise<void>;
export function setupCarbonCalculator(
  modeSelect: HTMLSelectElement | null,
  savedValLabel: HTMLElement | null,
  announceToScreenReader: (message: string) => void
): void;
