/**
 * UI Rendering and Interaction Coordinator Module for Smadiums.
 * Controls DOM caching, view switches, and coordinates sub-components rendering.
 * @module ui-render
 */

import { getState, saveSettings, updateState, addIncident } from './state.js';
import { escapeHTML } from './sanitizer.js';
import { setupMapListeners, updateSVGMapColors } from './ui-map.js';
import { renderChat, handleVoiceInput, handleChatSubmit } from './ui-chat.js';
import { debounce, playTone, announceToScreenReader, trapFocus } from './utils.js';

// Sub-component imports for modular architecture
import { renderIncidents } from './ui-incidents.js';
import { renderVolunteers } from './ui-volunteers.js';
import { generateSustainabilityPlan, setupCarbonCalculator } from './ui-sustainability.js';
import { handleRunTests } from './ui-testing.js';
import { calculateWayfindingRoute } from './ui-wayfinding.js';

/** Cached DOM element references. */
const el = {};

/**
 * Initialize DOM element cache and bind all event listeners.
 * Must be called once after DOMContentLoaded.
 * @returns {void}
 */
export function initUI() {
  // Core layout
  el.body = document.body;
  el.appContainer = document.getElementById('app-container');
  el.personaToggle = document.getElementById('persona-toggle');
  el.personaLabel = document.getElementById('persona-label');

  // Views
  el.staffView = document.getElementById('staff-view');
  el.fanView = document.getElementById('fan-view');

  // Settings
  el.settingsBtn = document.getElementById('settings-btn');
  el.settingsModal = document.getElementById('settings-modal');
  el.closeSettings = document.getElementById('close-settings');
  el.saveSettingsForm = document.getElementById('settings-form');
  el.apiKeyInput = document.getElementById('api-key-input');
  el.soundToggle = document.getElementById('sound-toggle');

  // Accessibility widgets
  el.themeSelect = document.getElementById('theme-select');
  el.textSizeSlider = document.getElementById('text-size-slider');
  el.textSizeValue = document.getElementById('text-size-value');
  el.dyslexicToggle = document.getElementById('dyslexic-toggle');

  // Telemetry elements
  el.telemetryOccupancy = document.getElementById('tele_occupancy');
  el.telemetryGateWait = document.getElementById('tele_gate_wait');
  el.telemetryConcessionWait = document.getElementById('tele_concession_wait');
  el.telemetryEnergy = document.getElementById('tele_energy');
  el.telemetryWater = document.getElementById('tele_water');
  el.telemetryRecycle = document.getElementById('tele_recycle');

  // Staff controls
  el.incidentsList = document.getElementById('incidents-list');
  el.opsLogs = document.getElementById('ops-logs');
  el.ecoContainer = document.getElementById('eco-recommendations');
  el.refreshEcoBtn = document.getElementById('refresh-eco-btn');

  // Volunteer controls
  el.volunteerRoster = document.getElementById('volunteer-roster');
  el.volActiveCount = document.getElementById('vol-active-count');

  // Fan controls
  el.chatMessages = document.getElementById('chat-messages');
  el.chatForm = document.getElementById('chat-form');
  el.chatInput = document.getElementById('chat-input');
  el.speakInputBtn = document.getElementById('speak-input-btn');
  el.suggestBtns = document.querySelectorAll('.suggest-btn');
  el.fanNavigator = document.getElementById('fan-navigator');
  el.navFromSelect = document.getElementById('nav-from');
  el.navToSelect = document.getElementById('nav-to');
  el.navRouteOutput = document.getElementById('nav-route-output');

  // Carbon calculator
  el.calcModeSelect = document.getElementById('calc-mode');
  el.ecoSavedVal = document.getElementById('eco-saved-val');

  // Dev & testing panel
  el.devToggle = document.getElementById('dev-panel-toggle');
  el.devPanel = document.getElementById('dev-panel');
  el.runTestsBtn = document.getElementById('run-tests-btn');
  el.testResultsList = document.getElementById('test-results-list');
  el.simBottleneckBtn = document.getElementById('sim-gate-bottleneck');
  el.simMedicalBtn = document.getElementById('sim-medical-incident');
  el.simTransitBtn = document.getElementById('sim-transit-delay');

  // Map 3D/2D view controls
  el.mapContainer = document.getElementById('map-container');
  el.btnView3d = document.getElementById('btn-view-3d');
  el.btnView2d = document.getElementById('btn-view-2d');

  bindPersonaSwitcher();
  bindSettingsModal();
  bindAccessibilityControls();
  bindDevPanel();
  bindMapControls();
  bindChatControls();
  bindSimulatorTriggers();
  applyInitialAccessibilityState();
  
  // Set up sub-component controllers
  setupCarbonCalculator(el.calcModeSelect, el.ecoSavedVal, announceToScreenReader);
}

// ---------------------------------------------------------------------------
// Event binding helpers
// ---------------------------------------------------------------------------

/** Bind the staff/fan persona toggle switch. */
function bindPersonaSwitcher() {
  el.personaToggle.addEventListener('change', (e) => {
    const isFan = e.target.checked;
    const activePersona = isFan ? 'fan' : 'staff';
    updateState({ activePersona });
    el.personaLabel.textContent = isFan ? 'Fan Experience Portal' : 'Operations Control Center';

    announceToScreenReader(`Switched view to ${el.personaLabel.textContent}`);

    el.staffView.classList.toggle('hidden', isFan);
    el.fanView.classList.toggle('hidden', !isFan);
    el.body.classList.toggle('persona-staff', !isFan);
    el.body.classList.toggle('persona-fan', isFan);
  });
}

/** Bind settings modal open/close/save events. */
function bindSettingsModal() {
  el.settingsBtn.addEventListener('click', () => {
    const state = getState();
    el.apiKeyInput.value = state.settings.geminiApiKey;
    el.soundToggle.checked = state.settings.soundFeedback;
    el.settingsModal.classList.add('active');
    el.settingsModal.querySelector('input, button').focus();
  });

  el.closeSettings.addEventListener('click', () => {
    el.settingsModal.classList.remove('active');
    el.settingsBtn.focus();
  });

  el.saveSettingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      saveSettings({
        geminiApiKey: el.apiKeyInput.value.trim(),
        soundFeedback: el.soundToggle.checked
      });
      el.settingsModal.classList.remove('active');
      playTone(600, 0.15);
    } catch (err) {
      playTone(300, 0.2);
      alert(err.message);
    }
  });

  trapFocus(el.settingsModal);
}

/** Bind accessibility theme, text size, and dyslexia font controls. */
function bindAccessibilityControls() {
  el.themeSelect.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    saveSettings({ theme: newTheme });
    updateAccessibilityThemeClasses(newTheme);
  });

  const updateTextSizeDebounced = debounce((val) => {
    saveSettings({ textSize: parseInt(val) });
    document.documentElement.style.setProperty('--base-font-size', `${val}%`);
  }, 150);

  el.textSizeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    el.textSizeValue.textContent = `${val}%`;
    updateTextSizeDebounced(val);
  });

  el.dyslexicToggle.addEventListener('change', (e) => {
    const active = e.target.checked;
    saveSettings({ dyslexicFont: active });
    el.body.classList.toggle('font-dyslexic', active);
  });
}

/** Bind developer panel toggle and test runner. */
function bindDevPanel() {
  el.devToggle.addEventListener('click', () => {
    const isExpanded = el.devPanel.classList.toggle('active');
    el.devToggle.setAttribute('aria-expanded', isExpanded);
  });

  el.runTestsBtn.addEventListener('click', () => {
    handleRunTests(el.testResultsList, el.runTestsBtn);
  });
}

/** Bind map view toggle and zone click routing. */
function bindMapControls() {
  setupMapListeners(
    () => calculateWayfindingRoute(getState(), el.navFromSelect.value, el.navToSelect.value, el.navRouteOutput, announceToScreenReader),
    el.navToSelect,
    announceToScreenReader
  );

  if (el.btnView3d && el.btnView2d && el.mapContainer) {
    el.btnView3d.addEventListener('click', () => {
      el.mapContainer.classList.add('view-3d');
      el.btnView3d.classList.add('active');
      el.btnView2d.classList.remove('active');
      playTone(580, 0.06);
      announceToScreenReader('Switched stadium map to 3D Holographic mode.');
    });
    el.btnView2d.addEventListener('click', () => {
      el.mapContainer.classList.remove('view-3d');
      el.btnView2d.classList.add('active');
      el.btnView3d.classList.remove('active');
      playTone(480, 0.06);
      announceToScreenReader('Switched stadium map to 2D flat mode.');
    });
  }

  // Keyboard accessibility hotkeys
  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const key = e.key.toLowerCase();

    if (key === 'm') {
      e.preventDefault();
      const mapSvg = document.getElementById('stadium-svg');
      if (mapSvg) {
        mapSvg.focus();
        announceToScreenReader('Focused stadium map sensor grid.');
      }
    } else if (key === 'c') {
      e.preventDefault();
      if (el.chatInput) {
        el.chatInput.focus();
        announceToScreenReader('Focused fan concierge chat input.');
      }
    } else if (key === 's') {
      e.preventDefault();
      if (el.settingsBtn) el.settingsBtn.click();
    }
  });
}

/** Bind chat form submission, voice input, and suggestion chips. */
function bindChatControls() {
  el.refreshEcoBtn.addEventListener('click', () => {
    generateSustainabilityPlan(getState(), el.ecoContainer);
  });
  el.chatForm.addEventListener('submit', (e) => handleChatSubmit(e, el.chatInput, el.chatMessages));

  el.speakInputBtn.addEventListener('click', () => {
    handleVoiceInput(el.speakInputBtn, el.chatInput, el.chatForm, getState().settings.selectedLanguage, announceToScreenReader);
  });

  el.suggestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.chatInput.value = btn.dataset.query;
      el.chatForm.requestSubmit();
    });
  });

  const triggerWayfinding = () => {
    calculateWayfindingRoute(getState(), el.navFromSelect.value, el.navToSelect.value, el.navRouteOutput, announceToScreenReader);
  };
  el.navFromSelect.addEventListener('change', triggerWayfinding);
  el.navToSelect.addEventListener('change', triggerWayfinding);
}

/** Bind simulator trigger buttons in the developer panel. */
function bindSimulatorTriggers() {
  el.simBottleneckBtn.addEventListener('click', () => {
    addIncident({
      zone: 'gateB',
      title: 'Gate B Security Bottleneck',
      description: 'Bag inspection queues have backed up past the transit corridor due to high pedestrian arrival clusters. Wait times are peaking at 42 minutes.',
      severity: 'warning'
    });
  });

  el.simMedicalBtn.addEventListener('click', () => {
    addIncident({
      zone: 'sector300',
      title: 'Sector 324 Crowd Congestion',
      description: 'Stairwell exit blockage reported in the upper deck, restricting safe spectator egress. Stewards requested to assist.',
      severity: 'critical'
    });
  });

  el.simTransitBtn.addEventListener('click', () => {
    addIncident({
      zone: 'transitHub',
      title: 'Metro Platform Gridlock',
      description: 'Train departure delays at Commuter Station have caused platform overcrowding. Metro Police are metering inbound stadium gates.',
      severity: 'critical'
    });
  });
}

/** Apply initial accessibility classes from saved settings. */
function applyInitialAccessibilityState() {
  const state = getState();
  updateAccessibilityThemeClasses(state.settings.theme);
  document.documentElement.style.setProperty('--base-font-size', `${state.settings.textSize}%`);
  if (state.settings.dyslexicFont) el.body.classList.add('font-dyslexic');
}

// ---------------------------------------------------------------------------
// Theme & Accessibility helpers
// ---------------------------------------------------------------------------

/**
 * Apply the correct theme CSS class to the document body.
 * @param {string} theme - 'dark' | 'light' | 'high-contrast'
 */
function updateAccessibilityThemeClasses(theme) {
  el.body.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
  el.body.classList.add(`theme-${theme === 'light' ? 'light' : theme === 'high-contrast' ? 'high-contrast' : 'dark'}`);
}

// trapFocus is now imported from utils.js for reuse across all modals

// ---------------------------------------------------------------------------
// Reactive render function
// ---------------------------------------------------------------------------

/**
 * Render the entire UI reactively from application state.
 * Called automatically on every state change via the subscription system.
 * @param {import('./state').AppState} state - Current application state snapshot
 */
export function render(state) {
  // Update telemetry numbers
  el.telemetryOccupancy.textContent = state.telemetry.stadiumOccupancy.toLocaleString();
  el.telemetryGateWait.textContent = `${state.telemetry.avgGateWaitTime}m`;
  el.telemetryConcessionWait.textContent = `${state.telemetry.avgConcessionWaitTime}m`;
  el.telemetryEnergy.textContent = `${state.telemetry.greenEnergyUsage}%`;
  el.telemetryWater.textContent = `${state.telemetry.waterSavedLitres.toLocaleString()} L`;
  el.telemetryRecycle.textContent = `${state.telemetry.wasteRecyclingRate}%`;

  // Apply warning highlights on abnormal levels
  toggleAlertClasses(el.telemetryGateWait.parentElement, state.telemetry.avgGateWaitTime > 30);
  toggleAlertClasses(el.telemetryConcessionWait.parentElement, state.telemetry.avgConcessionWaitTime > 20);

  // Render sub-sections using modular renderers
  renderIncidents(state.incidents, el.incidentsList);
  renderLogs(state.logs);

  if (el.volunteerRoster && state.volunteers) {
    renderVolunteers(state.volunteers, state.zones, el.volunteerRoster, el.volActiveCount);
  }

  updateSVGMapColors(state.zones);
  renderChat(state.chatHistory, el.chatMessages);
}

/**
 * Toggle the 'alerting' CSS class on a container based on a condition.
 * @param {HTMLElement} container - Target DOM element
 * @param {boolean} isAlerting - Whether the alert state is active
 */
function toggleAlertClasses(container, isAlerting) {
  container.classList.toggle('alerting', isAlerting);
}

// ---------------------------------------------------------------------------
// Logs rendering
// ---------------------------------------------------------------------------

/**
 * Render operations event log terminal.
 * @param {Array<import('./state').LogEntry>} logs - Log entries to display
 */
function renderLogs(logs) {
  el.opsLogs.innerHTML = '';
  logs.forEach(log => {
    const div = document.createElement('div');
    div.className = `log-line type-${log.type}`;
    div.innerHTML = `
      <span class="log-time">[${log.time}]</span>
      <span class="log-msg">${escapeHTML(log.message)}</span>
    `;
    el.opsLogs.appendChild(div);
  });
}

// handleChatSubmit is now imported from ui-chat.js — all chat logic is consolidated there
