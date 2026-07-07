/**
 * UI Sustainability Component for Smadiums.
 * Controls AI eco recommendations and carbon offset footprint calculator.
 * @module ui-sustainability
 */

import { generateContent } from './ai-client.js';
import { sanitizeAIResponse } from './sanitizer.js';
import { addLog } from './state.js';
import { playTone } from './utils.js';

/**
 * Generate eco recommendations from live telemetry via GenAI.
 * @param {import('./state').AppState} state - Current application state
 * @param {HTMLElement | null} container - Recommendations container element
 * @returns {Promise<void>}
 */
export async function generateSustainabilityPlan(state, container) {
  if (!container) return;

  container.innerHTML = `
    <div class="ai-loading-indicator">
      <div class="spinner"></div>
      <span>Eco-Advisor parsing utility loads...</span>
    </div>`;

  try {
    const recommendations = await generateContent('sustainability', {
      occupancy: state.telemetry.stadiumOccupancy,
      greenEnergyUsage: state.telemetry.greenEnergyUsage,
      wasteRecyclingRate: state.telemetry.wasteRecyclingRate,
      waterSavedLitres: state.telemetry.waterSavedLitres
    });

    container.innerHTML = sanitizeAIResponse(recommendations);
    addLog('AI sustainability recommendations updated.', 'success');
  } catch (_e) {
    container.innerHTML = '<p class="error-text">Failed to retrieve sustainability plan. Check connectivity.</p>';
  }
}

/**
 * Setup and bind carbon calculator event listeners.
 * @param {HTMLSelectElement | null} modeSelect - Travel mode selector dropdown
 * @param {HTMLElement | null} savedValLabel - Carbon saved display element
 * @param {Function} announceToScreenReader - A11y screen reader callback
 * @returns {void}
 */
export function setupCarbonCalculator(modeSelect, savedValLabel, announceToScreenReader) {
  if (!modeSelect || !savedValLabel) return;

  const CARBON_SAVINGS = {
    metro: '1.2 kg CO₂',
    rideshare: '0.1 kg CO₂',
    walking: '2.4 kg CO₂ (Zero Carbon)'
  };

  modeSelect.addEventListener('change', () => {
    const savedText = CARBON_SAVINGS[modeSelect.value] || '1.2 kg CO₂';
    savedValLabel.textContent = savedText;
    playTone(660, 0.05);
    announceToScreenReader(`Recalculated carbon offset. Saved ${savedText}.`);
  });
}
