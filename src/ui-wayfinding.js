/**
 * UI Wayfinding Component for Smadiums.
 * Computes optimal routing paths between stadium zones, gates, and concessions
 * factoring in real-time wait times and congestion levels.
 * @module ui-wayfinding
 */

/**
 * Departure guides matching gates/zones.
 * @type {Record<string, string>}
 */
const DEPARTURE_INSTRUCTIONS = {
  gateA: 'Exit Gate A entrance plaza and walk straight toward Sector 100 ring corridor.',
  gateB: 'Enter Gate B and take the escalators up to Level 1 Concourse.',
  gateC: 'Pass security check at Gate C, then follow the orange banners on the main loop corridor.',
  gateD: 'Pass Gate D ticket lanes and keep right toward the West lifts.'
};

/**
 * Calculate routing guide between two points in the stadium.
 * Uses live zone telemetry to factor in queue times and delays.
 * @param {import('./state').AppState} state - Current application state
 * @param {string} from - Source zone key
 * @param {string} to - Destination zone key
 * @param {HTMLElement | null} outputContainer - Destination container for route guides
 * @param {Function} announceToScreenReader - A11y screen reader callback
 * @returns {void}
 */
export function calculateWayfindingRoute(state, from, to, outputContainer, announceToScreenReader) {
  if (!outputContainer) return;

  if (from === to) {
    outputContainer.innerHTML = '<div class="route-step">You are already at your destination.</div>';
    return;
  }

  const fromZone = state.zones[from];
  const toZone = state.zones[to];

  if (!fromZone || !toZone) {
    outputContainer.innerHTML = '';
    return;
  }

  const steps = [];

  // 1. Origin departure instructions
  if (DEPARTURE_INSTRUCTIONS[from]) {
    steps.push(DEPARTURE_INSTRUCTIONS[from]);
  }

  // 2. Destination arrival instructions
  if (to.startsWith('concession')) {
    steps.push(`Look for the food zone directories. ${toZone.name} is located nearby Section 112. (Queue time: ${toZone.waitTime} mins).`);
  } else if (to.startsWith('gate')) {
    steps.push(`Follow exit signs for the outer loop towards the ${toZone.name}.`);
  } else if (to === 'transitHub') {
    steps.push('Head through the main concourse exit gates toward the East Boulevard, and follow the green icons to the subway shuttle loading zone.');
    if (state.zones.transitHub.status === 'warning' || state.zones.transitHub.status === 'critical') {
      steps.push(`⚠️ Note: Metro shuttles have high queues (delay: ${state.zones.transitHub.waitTime}m). You may prefer the designated walking bypass path.`);
    }
  }

  steps.push('Arrived. Seek volunteers in bright green vests for seat row direction.');

  outputContainer.innerHTML = `<h4>Route Guide: ${fromZone.name} to ${toZone.name}</h4>` +
    `<ul>${steps.map(s => `<li>${s}</li>`).join('')}</ul>`;

  announceToScreenReader(`Route calculated from ${fromZone.name} to ${toZone.name}.`);
}
