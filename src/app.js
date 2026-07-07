/**
 * App Controller / Entry Point for Smadiums.
 * Bootstraps modules and initializes reactive subscriptions.
 * @module app
 */

import { subscribe, getState, addLog } from './state.js';
import { startSimulator } from './simulator.js';
import { initUI, render } from './ui-render.js';

window.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Initialize UI elements & event binds
    initUI();

    // 2. Subscribe render function to state mutations
    subscribe(render);

    // 3. Perform initial render with current state
    render(getState());

    // 4. Start background telemetry simulator
    startSimulator();

    // Log success
    addLog('Smadiums Dashboard successfully loaded.', 'success');
  } catch (error) {
    console.error('Fatal initialization error in Smadiums App:', error);
    const errBanner = document.createElement('div');
    errBanner.className = 'fatal-error-banner';
    errBanner.textContent = 'Failed to load stadium console. Please check console logs or reload.';
    document.body.prepend(errBanner);
  }
});
