/**
 * UI Rendering and Interaction Module for Smadiums.
 * Controls DOM construction, SVG map updates, and accessibility states.
 * @module ui-render
 */

import { getState, resolveIncident, updateIncident, addChatMessage, addLog, saveSettings, updateState, addIncident } from './state.js';
import { sanitizeAIResponse, escapeHTML, detectPromptInjection } from './sanitizer.js';
import { generateContent } from './ai-client.js';
import { runAllTests } from '../tests/unit-tests.js';
import { setupMapListeners, updateSVGMapColors } from './ui-map.js';
import { renderChat, speakTextTextToSpeech, handleVoiceInput } from './ui-chat.js';
import { debounce, playTone, announceToScreenReader } from './utils.js';

/** Cached DOM element references, populated once during initUI(). */
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
  bindCarbonCalculator();
}

// ---------------------------------------------------------------------------
// Event binding helpers (extracted from monolithic initUI for readability)
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

  el.runTestsBtn.addEventListener('click', handleRunTests);
}

/** Bind map view toggle and zone click routing. */
function bindMapControls() {
  setupMapListeners(calculateWayfindingRoute, el.navToSelect, announceToScreenReader);

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
  el.refreshEcoBtn.addEventListener('click', generateSustainabilityPlan);
  el.chatForm.addEventListener('submit', handleChatSubmit);

  el.speakInputBtn.addEventListener('click', () => {
    handleVoiceInput(el.speakInputBtn, el.chatInput, el.chatForm, getState().settings.selectedLanguage, announceToScreenReader);
  });

  el.suggestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.chatInput.value = btn.dataset.query;
      el.chatForm.requestSubmit();
    });
  });

  el.navFromSelect.addEventListener('change', calculateWayfindingRoute);
  el.navToSelect.addEventListener('change', calculateWayfindingRoute);
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

/** Bind carbon calculator travel mode selector. */
function bindCarbonCalculator() {
  if (!el.calcModeSelect || !el.ecoSavedVal) return;

  const CARBON_SAVINGS = {
    metro: '1.2 kg CO₂',
    rideshare: '0.1 kg CO₂',
    walking: '2.4 kg CO₂ (Zero Carbon)'
  };

  el.calcModeSelect.addEventListener('change', () => {
    const savedText = CARBON_SAVINGS[el.calcModeSelect.value] || '1.2 kg CO₂';
    el.ecoSavedVal.textContent = savedText;
    playTone(660, 0.05);
    announceToScreenReader(`Recalculated carbon offset. Saved ${savedText}.`);
  });
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

/**
 * Trap tab key focus inside modal containers for WCAG compliance.
 * @param {HTMLElement} modal - Modal container element
 */
function trapFocus(modal) {
  const focusable = modal.querySelectorAll('input, button, select, [tabindex="0"]');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Test runner UI
// ---------------------------------------------------------------------------

/**
 * Run tests and display results in the developer panel.
 */
function handleRunTests() {
  playTone(880, 0.1);
  el.testResultsList.innerHTML = '<li class="loading">Executing test assertions...</li>';

  setTimeout(async () => {
    const results = await runAllTests();
    el.testResultsList.innerHTML = '';

    let passedCount = 0;
    results.forEach(res => {
      const li = document.createElement('li');
      li.className = `test-item ${res.status}`;

      const badge = res.status === 'passed' ? 'PASS' : 'FAIL';
      const statusIcon = res.status === 'passed' ? '✅' : '❌';

      li.innerHTML = `
        <span class="test-status-badge">${statusIcon} ${badge}</span>
        <span class="test-name">${escapeHTML(res.name)}</span>
        ${res.error ? `<div class="test-error">${escapeHTML(res.error)}</div>` : ''}
      `;
      el.testResultsList.appendChild(li);
      if (res.status === 'passed') passedCount++;
    });

    el.runTestsBtn.textContent = `Run Tests (${passedCount}/${results.length} Passed)`;
  }, 300);
}

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

  // Render sub-sections
  renderIncidents(state.incidents);
  renderLogs(state.logs);

  if (el.volunteerRoster && state.volunteers) {
    renderVolunteers(state.volunteers, state.zones);
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
// Incident rendering & GenAI drafting
// ---------------------------------------------------------------------------

/**
 * Render the incidents queue on the staff dashboard.
 * @param {Array<import('./state').Incident>} incidents - Current incident list
 */
function renderIncidents(incidents) {
  const scrollPos = el.incidentsList.scrollTop;
  el.incidentsList.innerHTML = '';

  if (incidents.length === 0) {
    el.incidentsList.innerHTML = `
      <div class="empty-incidents">
        <span class="empty-icon">✓</span>
        <p>No active alerts. All stadium systems operating nominally.</p>
      </div>`;
    return;
  }

  incidents.forEach(inc => {
    const item = document.createElement('div');
    item.className = `incident-card severity-${inc.severity} status-${inc.status}`;
    item.id = `card-${inc.id}`;

    const statusText = inc.status.toUpperCase().replace('_', ' ');
    const statusBadgeClass = `badge-${inc.status}`;
    const actionAreaHTML = buildIncidentActionHTML(inc);

    item.innerHTML = `
      <div class="incident-header">
        <span class="incident-severity-dot"></span>
        <h4 class="incident-title">${escapeHTML(inc.title)}</h4>
        <span class="incident-badge ${statusBadgeClass}">${statusText}</span>
      </div>
      <div class="incident-meta">Zone: ${escapeHTML(inc.zone)} | Raised: ${inc.timestamp}</div>
      <p class="incident-desc">${escapeHTML(inc.description)}</p>
      <div class="incident-actions-container">
        ${actionAreaHTML}
      </div>
    `;

    bindIncidentButtons(item, inc);
    el.incidentsList.appendChild(item);
  });

  el.incidentsList.scrollTop = scrollPos;
}

/**
 * Build the action area HTML for an incident based on its current status.
 * @param {import('./state').Incident} inc - Incident object
 * @returns {string} HTML string for the action area
 */
function buildIncidentActionHTML(inc) {
  switch (inc.status) {
    case 'pending':
      return `
        <button class="ops-btn primary-ops-btn draft-plan-btn" data-id="${inc.id}">
          ⚡ Draft AI Response Plan
        </button>`;

    case 'drafting':
      return `
        <div class="ai-loading-indicator">
          <div class="spinner"></div>
          <span>GenAI compiling dispatcher response...</span>
        </div>`;

    case 'has_plan':
      return `
        <div class="ai-plan-box">
          <div class="ai-plan-content">${sanitizeAIResponse(inc.actionPlan)}</div>
          <div class="ai-plan-actions">
            <button class="ops-btn success-ops-btn resolve-btn" data-id="${inc.id}">
              ✓ Deploy Plan & Resolve Incident
            </button>
            <button class="ops-btn primary-ops-btn broadcast-announcement-btn" data-zone="${inc.zone}" data-id="${inc.id}">
              🔊 Voice Broadcast Alert
            </button>
            <button class="ops-btn secondary-ops-btn draft-plan-btn" data-id="${inc.id}">
              ↻ Re-draft
            </button>
          </div>
        </div>`;

    case 'resolved':
      return '<div class="resolved-stamp">✓ Action Plan Deployed & Resolved</div>';

    default:
      return '';
  }
}

/**
 * Bind click event listeners to action buttons within an incident card.
 * @param {HTMLElement} item - Incident card DOM element
 * @param {import('./state').Incident} inc - Incident data object
 */
function bindIncidentButtons(item, inc) {
  const draftBtn = item.querySelector('.draft-plan-btn');
  if (draftBtn) {
    draftBtn.addEventListener('click', () => triggerIncidentPlanDraft(inc.id));
  }

  const resolveBtn = item.querySelector('.resolve-btn');
  if (resolveBtn) {
    resolveBtn.addEventListener('click', () => {
      playTone(440, 0.2);
      resolveIncident(inc.id);
    });
  }

  const broadcastBtn = item.querySelector('.broadcast-announcement-btn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => handleBroadcast(broadcastBtn.dataset.zone));
  }
}

/**
 * Handle the voice broadcast for a specific zone incident.
 * @param {string} zoneKey - Zone identifier
 */
function handleBroadcast(zoneKey) {
  playTone(660, 0.1);
  setTimeout(() => playTone(880, 0.15), 100);

  const ZONE_BROADCASTS = {
    gateC: 'Gate C is experiencing high wait times. For faster entry, please walk to Gate D where wait times are under 10 minutes.',
    sector100: 'Attention spectators. High heat levels reported. Roaming hydration stewards are distributing water. Stay hydrated.',
    sector300: 'Attention spectators. High heat levels reported. Roaming hydration stewards are distributing water. Stay hydrated.',
    transitHub: 'Transit warning. Metro shuttle buses are delayed due to loop traffic. Spectators are advised to use the Green Ribbon Trail to walk to the Metro station.'
  };

  const warningText = ZONE_BROADCASTS[zoneKey] || 'Attention spectators. Please follow stewards instructions in this area.';
  speakTextTextToSpeech(warningText);
  addLog(`AI Voice Broadcast Alert deployed for ${zoneKey}.`, 'info');
}

/**
 * Trigger GenAI / mock AI response drafting for a specific incident.
 * @param {string} incidentId - ID of the incident to draft a plan for
 */
async function triggerIncidentPlanDraft(incidentId) {
  const state = getState();
  const inc = state.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  playTone(800, 0.1);
  updateIncident(incidentId, { status: 'drafting' });

  try {
    const plan = await generateContent('incident', inc);
    updateIncident(incidentId, { status: 'has_plan', actionPlan: plan });
    addLog(`AI Response plan drafted for ${inc.title}. Ready for validation.`, 'info');
  } catch (error) {
    console.error('Failed to generate action plan:', error);
    updateIncident(incidentId, { status: 'pending' });
    addLog(`AI dispatch generation failed for ${inc.title}.`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Logs & Volunteer rendering
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

/**
 * Render the volunteer roster dynamically based on state.
 * @param {Array<import('./state').Volunteer>} volunteers - Volunteer list from state
 * @param {Record<string, import('./state').Zone>} zones - Zone lookup map from state
 */
function renderVolunteers(volunteers, zones) {
  if (el.volActiveCount) {
    el.volActiveCount.textContent = `${volunteers.length} Active Helpers`;
  }

  el.volunteerRoster.innerHTML = '';
  volunteers.forEach(vol => {
    const item = document.createElement('div');
    item.className = `vol-item status-${vol.status}`;

    const statusIcon = getVolunteerIcon(vol);
    const langStr = vol.languages.join(' / ');
    const zoneName = zones[vol.zone]?.name || vol.zone;
    const statusLabel = vol.status === 'dispatched'
      ? '<span class="vol-status-label dispatched-label">[Dispatched]</span>'
      : '<span class="vol-status-label idle-label">[Idle]</span>';

    item.innerHTML = `
      <span class="vol-status-icon" aria-hidden="true">${statusIcon}</span>
      <div class="vol-info">
        <span class="vol-name">${escapeHTML(vol.name)} (${escapeHTML(langStr)})</span>
        <span class="vol-assignment">
          ${escapeHTML(zoneName)} • ${escapeHTML(vol.role)}
          ${statusLabel}
        </span>
      </div>
    `;
    el.volunteerRoster.appendChild(item);
  });
}

/**
 * Determine the appropriate status emoji for a volunteer.
 * @param {import('./state').Volunteer} vol - Volunteer object
 * @returns {string} Emoji icon string
 */
function getVolunteerIcon(vol) {
  const isFemale = vol.name === 'Sofia';
  if (vol.status === 'dispatched') {
    return isFemale ? '🏃‍♀️' : '🏃‍♂️';
  }
  return isFemale ? '🙋‍♀️' : '🙋‍♂️';
}

// ---------------------------------------------------------------------------
// Chat handling
// ---------------------------------------------------------------------------

/**
 * Handle fan chat submission to GenAI / mock local concierge.
 * @param {Event} e - Form submission event
 */
async function handleChatSubmit(e) {
  e.preventDefault();
  const text = el.chatInput.value.trim();
  if (text === '') return;

  playTone(700, 0.1);
  el.chatInput.value = '';

  addChatMessage('user', text);

  // Prompt injection validation
  if (detectPromptInjection(text)) {
    addLog('Chat query blocked: Potential Prompt Injection.', 'error');
    setTimeout(() => {
      addChatMessage('ai', '⚠️ **Security Alert:** Your query was blocked by the Smadiums Prompt Injection Gateway. System override instructions are restricted. Please query stadium navigation or accessibility features.');
    }, 200);
    return;
  }

  // Show typing indicator
  const loaderId = `loader_${Date.now()}`;
  const loaderBubble = document.createElement('div');
  loaderBubble.id = loaderId;
  loaderBubble.className = 'chat-bubble sender-ai typing-msg';
  loaderBubble.innerHTML = `
    <div class="typing-loader">
      <span></span><span></span><span></span>
    </div>`;
  el.chatMessages.appendChild(loaderBubble);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;

  try {
    const aiResponse = await generateContent('chat', {
      message: text,
      language: getState().settings.selectedLanguage
    });

    const loaderEl = document.getElementById(loaderId);
    if (loaderEl) loaderEl.remove();

    addChatMessage('ai', aiResponse);
    playTone(900, 0.1);

    if (getState().settings.soundFeedback) {
      speakTextTextToSpeech(aiResponse);
    }
  } catch (err) {
    console.error('Chat error:', err);
    const loaderEl = document.getElementById(loaderId);
    if (loaderEl) loaderEl.remove();

    addChatMessage('ai', 'I apologize, but I am experiencing issues retrieving updates right now. Please seek a stadium steward at the closest Guest Information Pod.');
  }
}

// ---------------------------------------------------------------------------
// Sustainability & Wayfinding
// ---------------------------------------------------------------------------

/**
 * Generate eco recommendations from live telemetry via GenAI.
 */
async function generateSustainabilityPlan() {
  const state = getState();
  el.ecoContainer.innerHTML = `
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

    el.ecoContainer.innerHTML = sanitizeAIResponse(recommendations);
    addLog('AI sustainability recommendations updated.', 'success');
  } catch (_e) {
    el.ecoContainer.innerHTML = '<p class="error-text">Failed to retrieve sustainability plan. Check connectivity.</p>';
  }
}

/**
 * Calculate routing guide between two points in the stadium.
 * Uses live zone telemetry to factor in queue times and delays.
 */
function calculateWayfindingRoute() {
  const from = el.navFromSelect.value;
  const to = el.navToSelect.value;

  if (from === to) {
    el.navRouteOutput.innerHTML = '<div class="route-step">You are already at your destination.</div>';
    return;
  }

  const state = getState();
  const fromZone = state.zones[from];
  const toZone = state.zones[to];

  if (!fromZone || !toZone) {
    el.navRouteOutput.innerHTML = '';
    return;
  }

  const steps = [];

  // Origin departure instructions
  const DEPARTURE_INSTRUCTIONS = {
    gateA: 'Exit Gate A entrance plaza and walk straight toward Sector 100 ring corridor.',
    gateB: 'Enter Gate B and take the escalators up to Level 1 Concourse.',
    gateC: 'Pass security check at Gate C, then follow the orange banners on the main loop corridor.',
    gateD: 'Pass Gate D ticket lanes and keep right toward the West lifts.'
  };
  if (DEPARTURE_INSTRUCTIONS[from]) {
    steps.push(DEPARTURE_INSTRUCTIONS[from]);
  }

  // Destination arrival instructions
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

  const html = `<h4>Route Guide: ${fromZone.name} to ${toZone.name}</h4>` +
    `<ul>${steps.map(s => `<li>${s}</li>`).join('')}</ul>`;
  el.navRouteOutput.innerHTML = html;

  announceToScreenReader(`Route calculated from ${fromZone.name} to ${toZone.name}.`);
}

// Re-export utilities for backward compatibility
export { playTone, speakTextTextToSpeech };
