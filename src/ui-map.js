/**
 * UI Map Component for Smadiums.
 * Manages interactive SVG stadium map styling, hover tooltips, and click routing hooks.
 */

import { getState } from './state.js';
import { playTone } from './ui-render.js';

/**
 * Update the colors of SVG Map paths dynamically based on active telemetry status.
 * @param {Object} zones - Current stadium zones telemetry mapping
 * @returns {void}
 */
export function updateSVGMapColors(zones) {
  if (!zones) return;
  for (let zoneKey in zones) {
    const zone = zones[zoneKey];
    // Find SVG element matching the data-zone attribute
    const svgEl = document.querySelector(`[data-zone="${zoneKey}"]`);
    if (svgEl) {
      // Clear status classes
      svgEl.classList.remove('zone-optimal', 'zone-warning', 'zone-critical');
      svgEl.classList.add(`zone-${zone.status}`);
      
      // Update interactive title tooltip details
      const titleEl = svgEl.querySelector('title');
      if (titleEl) {
        let details = `${zone.name}\nStatus: ${zone.status.toUpperCase()}`;
        if (zone.waitTime !== undefined) details += `\nWait Time: ${zone.waitTime}m`;
        if (zone.crowdDensity !== undefined) details += `\nCrowd Density: ${zone.crowdDensity}%`;
        titleEl.textContent = details;
      }
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
      // In Staff View, display Zone inspection details in Logs
      import('./state.js').then(m => m.addLog(
        `Inspected ${zone.name}: Wait Time: ${zone.waitTime || 'N/A'}m | Crowd Density: ${zone.crowdDensity || 'N/A'}% | Status: ${zone.status.toUpperCase()}`,
        zone.status === 'critical' ? 'error' : zone.status === 'warning' ? 'warning' : 'info'
      ));
    } else {
      // In Fan View, feed this into navigation selection
      if (zoneKey.startsWith('gate') || zoneKey.startsWith('concession') || zoneKey === 'transitHub') {
        if (navToSelect) {
          navToSelect.value = zoneKey;
          calculateWayfindingRoute();
          announceToScreenReader(`Selected destination: ${zone.name}`);
        }
      }
    }
  });
}
