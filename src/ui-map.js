/**
 * UI Map Component for Smadiums.
 * Manages interactive SVG stadium map styling, hover tooltips, and click routing hooks.
 * @module ui-map
 */

import { getState, addLog } from './state.js';
import { playTone } from './utils.js';

/**
 * Status-to-log-type mapping for zone inspections.
 * @param {string} status - Zone status value
 * @returns {'info' | 'warning' | 'error'} Log severity type
 */
function getLogTypeForZoneStatus(status) {
  if (status === 'critical') return 'error';
  if (status === 'warning') return 'warning';
  return 'info';
}

/**
 * Update the colors of SVG Map paths dynamically based on active telemetry status.
 * @param {Record<string, import('./state').Zone>} zones - Current stadium zones telemetry mapping
 * @returns {void}
 */
export function updateSVGMapColors(zones) {
  if (!zones) return;

  for (const [zoneKey, zone] of Object.entries(zones)) {
    const svgEl = document.querySelector(`[data-zone="${zoneKey}"]`);
    if (!svgEl) continue;

    // Toggle status classes
    svgEl.classList.remove('zone-optimal', 'zone-warning', 'zone-critical');
    svgEl.classList.add(`zone-${zone.status}`);

    // Update interactive title tooltip with live data
    const titleEl = svgEl.querySelector('title');
    if (titleEl) {
      const parts = [`${zone.name}`, `Status: ${zone.status.toUpperCase()}`];
      if (zone.waitTime !== undefined) parts.push(`Wait Time: ${zone.waitTime}m`);
      if (zone.crowdDensity !== undefined) parts.push(`Crowd Density: ${zone.crowdDensity}%`);
      titleEl.textContent = parts.join('\n');
    }
  }
}

/**
 * Setup map path/shapes selectors and bind hover / click indicators.
 * Coordinates between Staff inspection log output and Fan destination selectors.
 * @param {Function} calculateWayfindingRoute - Callback to trigger path updates
 * @param {HTMLElement} navToSelect - Target dropdown selector
 * @param {Function} announceToScreenReader - Aria live announcer callback
 * @returns {void}
 */
export function setupMapListeners(calculateWayfindingRoute, navToSelect, announceToScreenReader) {
  const mapSvg = document.getElementById('stadium-svg');
  if (!mapSvg) return;

  mapSvg.addEventListener('click', (e) => {
    const target = e.target.closest('[data-zone]');
    if (!target) return;

    const zoneKey = target.dataset.zone;
    const state = getState();
    const zone = state.zones[zoneKey];
    if (!zone) return;

    playTone(520, 0.08);

    if (state.activePersona === 'staff') {
      // In Staff View, display zone inspection details in operations log
      const logType = getLogTypeForZoneStatus(zone.status);
      addLog(
        `Inspected ${zone.name}: Wait Time: ${zone.waitTime || 'N/A'}m | Crowd Density: ${zone.crowdDensity || 'N/A'}% | Status: ${zone.status.toUpperCase()}`,
        logType
      );
    } else {
      // In Fan View, feed this into navigation selection
      const isNavigable = zoneKey.startsWith('gate') || zoneKey.startsWith('concession') || zoneKey === 'transitHub';
      if (isNavigable && navToSelect) {
        navToSelect.value = zoneKey;
        calculateWayfindingRoute();
        announceToScreenReader(`Selected destination: ${zone.name}`);
      }
    }
  });
}
