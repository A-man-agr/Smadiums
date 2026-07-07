/**
 * App Controller / Entry Point for Smadiums.
 * Bootstraps modules and initializes reactive subscriptions.
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
    
    // 3. Perform initial render with initial state
    render(getState());
    
    // 4. Start background telemetry simulator
    startSimulator();
    
    // Log success
    addLog('Smadiums Dashboard successfully loaded.', 'success');
  } catch (error) {
    console.error('Fatal initialization error in Smadiums App:', error);
    const errBanner = document.createElement('div');
    errBanner.style.cssText = 'background: red; color: white; padding: 15px; text-align: center; font-weight: bold; position: fixed; top: 0; left: 0; width: 100%; z-index: 10000;';
    errBanner.textContent = 'Failed to load stadium console. Please check console logs or reload.';
    document.body.prepend(errBanner);
  }
});
