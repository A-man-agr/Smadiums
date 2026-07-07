/**
 * UI Rendering and Interaction Module for Smadiums.
 * Controls DOM construction, SVG map updates, and accessibility states.
 */

import { getState, resolveIncident, updateIncident, addChatMessage, saveSettings } from './state.js';
import { sanitizeAIResponse, escapeHTML, detectPromptInjection } from './sanitizer.js';
import { generateContent } from './ai-client.js';
import { runAllTests } from './tests.js';
import { setupMapListeners, updateSVGMapColors } from './ui-map.js';
import { renderChat, speakTextTextToSpeech, handleVoiceInput } from './ui-chat.js';

/**
 * Debounce helper to delay costly layout/re-render operations.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Cache DOM elements
let el = {};

/**
 * Initialize DOM cache and bind click events.
 */
export function initUI() {
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
  
  // Telemetry Elements
  el.telemetryOccupancy = document.getElementById('tele_occupancy');
  el.telemetryGateWait = document.getElementById('tele_gate_wait');
  el.telemetryConcessionWait = document.getElementById('tele_concession_wait');
  el.telemetryEnergy = document.getElementById('tele_energy');
  el.telemetryWater = document.getElementById('tele_water');
  el.telemetryRecycle = document.getElementById('tele_recycle');
  
  // Staff Controls
  el.incidentsList = document.getElementById('incidents-list');
  el.opsLogs = document.getElementById('ops-logs');
  el.ecoContainer = document.getElementById('eco-recommendations');
  el.refreshEcoBtn = document.getElementById('refresh-eco-btn');
  
  // Fan Controls
  el.chatMessages = document.getElementById('chat-messages');
  el.chatForm = document.getElementById('chat-form');
  el.chatInput = document.getElementById('chat-input');
  el.speakInputBtn = document.getElementById('speak-input-btn');
  el.suggestBtns = document.querySelectorAll('.suggest-btn');
  el.fanNavigator = document.getElementById('fan-navigator');
  el.navFromSelect = document.getElementById('nav-from');
  el.navToSelect = document.getElementById('nav-to');
  el.navRouteOutput = document.getElementById('nav-route-output');
  
  // Carbon Calculator
  el.calcModeSelect = document.getElementById('calc-mode');
  el.ecoSavedVal = document.getElementById('eco-saved-val');
  
  // Dev & Testing panel
  el.devToggle = document.getElementById('dev-panel-toggle');
  el.devPanel = document.getElementById('dev-panel');
  el.runTestsBtn = document.getElementById('run-tests-btn');
  el.testResultsList = document.getElementById('test-results-list');
  el.simBottleneckBtn = document.getElementById('sim-gate-bottleneck');
  el.simMedicalBtn = document.getElementById('sim-medical-incident');
  el.simTransitBtn = document.getElementById('sim-transit-delay');

  // Map 3D/2D View Controls
  el.mapContainer = document.getElementById('map-container');
  el.btnView3d = document.getElementById('btn-view-3d');
  el.btnView2d = document.getElementById('btn-view-2d');

  // Bind Persona Switcher
  el.personaToggle.addEventListener('change', (e) => {
    const isFan = e.target.checked;
    const activePersona = isFan ? 'fan' : 'staff';
    el.personaLabel.textContent = isFan ? 'Fan Experience Portal' : 'Operations Control Center';
    
    // Announce to screen readers
    announceToScreenReader(`Switched view to ${el.personaLabel.textContent}`);
    
    // Toggle active classes
    if (isFan) {
      el.staffView.classList.add('hidden');
      el.fanView.classList.remove('hidden');
      el.body.classList.remove('persona-staff');
      el.body.classList.add('persona-fan');
    } else {
      el.fanView.classList.add('hidden');
      el.staffView.classList.remove('hidden');
      el.body.classList.remove('persona-fan');
      el.body.classList.add('persona-staff');
    }
  });

  // Settings Modal events
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
    saveSettings({
      geminiApiKey: el.apiKeyInput.value,
      soundFeedback: el.soundToggle.checked
    });
    el.settingsModal.classList.remove('active');
    playTone(600, 0.15); // Confirmation sound
  });

  // Accessibility handlers
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
    if (active) {
      el.body.classList.add('font-dyslexic');
    } else {
      el.body.classList.remove('font-dyslexic');
    }
  });

  // Dev Toggle
  el.devToggle.addEventListener('click', () => {
    const isExpanded = el.devPanel.classList.toggle('active');
    el.devToggle.setAttribute('aria-expanded', isExpanded);
  });

  // Map zone clicking handles detail display or Navigation routing
  setupMapListeners(calculateWayfindingRoute, el.navToSelect, announceToScreenReader);

  // Sustainability Recommendations
  el.refreshEcoBtn.addEventListener('click', generateSustainabilityPlan);

  // Chat Form submission
  el.chatForm.addEventListener('submit', handleChatSubmit);

  // Speak input (simulated voice transcription / Web Speech API)
  el.speakInputBtn.addEventListener('click', () => handleVoiceInput(el.speakInputBtn, el.chatInput, el.chatForm, getState().settings.selectedLanguage, announceToScreenReader));

  // Suggest buttons (pre-filled chat messages)
  el.suggestBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      el.chatInput.value = btn.dataset.query;
      el.chatForm.requestSubmit();
    });
  });

  // Wayfinding form events
  el.navFromSelect.addEventListener('change', calculateWayfindingRoute);
  el.navToSelect.addEventListener('change', calculateWayfindingRoute);

  // Run tests UI
  el.runTestsBtn.addEventListener('click', handleRunTests);

  // Map Perspective Toggles
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

  // Keyboard accessibility hotkeys (A11y requirements)
  document.addEventListener('keydown', (e) => {
    // Alt + M: Focus Map SVG
    if (e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const mapSvg = document.getElementById('stadium-svg');
      if (mapSvg) {
        mapSvg.focus();
        announceToScreenReader('Focused stadium map sensor grid.');
      }
    }
    // Alt + C: Focus Fan Chat Input
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (el.chatInput) {
        el.chatInput.focus();
        announceToScreenReader('Focused fan concierge chat input.');
      }
    }
    // Alt + S: Toggle Settings Modal
    if (e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (el.settingsBtn) {
        el.settingsBtn.click();
      }
    }
  });

  // Simulator Triggers
  el.simBottleneckBtn.addEventListener('click', () => {
    import('./state.js').then(m => m.addIncident({
      zone: 'gateB',
      title: 'Gate B Security Bottleneck',
      description: 'Bag inspection queues have backed up past the transit corridor due to high pedestrian arrival clusters. Wait times are peaking at 42 minutes.',
      severity: 'warning'
    }));
  });
  
  el.simMedicalBtn.addEventListener('click', () => {
    import('./state.js').then(m => m.addIncident({
      zone: 'sector300',
      title: 'Sector 324 Crowd Congestion',
      description: 'Stairwell exit blockage reported in the upper deck, restricting safe spectator egress. Stewards requested to assist.',
      severity: 'critical'
    }));
  });
  
  el.simTransitBtn.addEventListener('click', () => {
    import('./state.js').then(m => m.addIncident({
      zone: 'transitHub',
      title: 'Metro Platform Gridlock',
      description: 'Train departure delays at Commuter Station have caused platform overcrowding. Metro Police are metering inbound stadium gates.',
      severity: 'critical'
    }));
  });

  // Set initial accessibility classes
  const state = getState();
  updateAccessibilityThemeClasses(state.settings.theme);
  document.documentElement.style.setProperty('--base-font-size', `${state.settings.textSize}%`);
  if (state.settings.dyslexicFont) el.body.classList.add('font-dyslexic');

  // Bind Carbon Calculator
  if (el.calcModeSelect && el.ecoSavedVal) {
    el.calcModeSelect.addEventListener('change', () => {
      const mode = el.calcModeSelect.value;
      let savedText = '1.2 kg CO₂';
      if (mode === 'metro') savedText = '1.2 kg CO₂';
      else if (mode === 'rideshare') savedText = '0.1 kg CO₂';
      else if (mode === 'walking') savedText = '2.4 kg CO₂ (Zero Carbon)';
      el.ecoSavedVal.textContent = savedText;
      playTone(660, 0.05);
      announceToScreenReader(`Recalculated carbon offset. Saved ${savedText}.`);
    });
  }
}

/**
 * Handle theme updates at document body level.
 */
function updateAccessibilityThemeClasses(theme) {
  el.body.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
  if (theme === 'light') {
    el.body.classList.add('theme-light');
  } else if (theme === 'high-contrast') {
    el.body.classList.add('theme-high-contrast');
  } else {
    el.body.classList.add('theme-dark');
  }
}

/**
 * Announcement function for screen readers (aria-live utility).
 */
function announceToScreenReader(message) {
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.margin = '-1px';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.border = '0';
    document.body.appendChild(announcer);
  }
  announcer.textContent = message;
}

/**
 * Generate audio sound feedback for interactions (Accessibility / operational cues).
 */
function playTone(freq, duration) {
  const state = getState();
  if (!state.settings.soundFeedback) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio Context not allowed/supported yet.');
  }
}

/**
 * Run tests and display in developer panel.
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
    
    // Update button text with result
    el.runTestsBtn.textContent = `Run Tests (${passedCount}/${results.length} Passed)`;
  }, 300);
}

/**
 * Render the whole state reactively.
 * Called automatically when state changes.
 */
export function render(state) {
  // Update General Telemetry Numbers
  el.telemetryOccupancy.textContent = state.telemetry.stadiumOccupancy.toLocaleString();
  el.telemetryGateWait.textContent = `${state.telemetry.avgGateWaitTime}m`;
  el.telemetryConcessionWait.textContent = `${state.telemetry.avgConcessionWaitTime}m`;
  el.telemetryEnergy.textContent = `${state.telemetry.greenEnergyUsage}%`;
  el.telemetryWater.textContent = `${state.telemetry.waterSavedLitres.toLocaleString()} L`;
  el.telemetryRecycle.textContent = `${state.telemetry.wasteRecyclingRate}%`;

  // Apply warning state highlights on widgets if levels are abnormal
  toggleAlertClasses(el.telemetryGateWait.parentElement, state.telemetry.avgGateWaitTime > 30);
  toggleAlertClasses(el.telemetryConcessionWait.parentElement, state.telemetry.avgConcessionWaitTime > 20);

  // Render Incidents List
  renderIncidents(state.incidents);

  // Render Live Logs
  renderLogs(state.logs);

  // Update SVG Map fills dynamically based on zone statuses
  updateSVGMapColors(state.zones);

  // Render Fan Chat History
  renderChat(state.chatHistory, el.chatMessages);
}

function toggleAlertClasses(container, isAlerting) {
  if (isAlerting) {
    container.classList.add('alerting');
  } else {
    container.classList.remove('alerting');
  }
}

// Map listeners managed by ui-map.js

/**
 * Render the incidents queue on the dashboard.
 */
function renderIncidents(incidents) {
  // Save scroll position
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

    // Header info
    let statusText = inc.status.toUpperCase().replace('_', ' ');
    let statusBadgeClass = `badge-${inc.status}`;
    
    let actionAreaHTML = '';
    
    if (inc.status === 'pending') {
      actionAreaHTML = `
        <button class="ops-btn primary-ops-btn draft-plan-btn" data-id="${inc.id}">
          ⚡ Draft AI Response Plan
        </button>`;
    } else if (inc.status === 'drafting') {
      actionAreaHTML = `
        <div class="ai-loading-indicator">
          <div class="spinner"></div>
          <span>GenAI compiling dispatcher response...</span>
        </div>`;
    } else if (inc.status === 'has_plan') {
      actionAreaHTML = `
        <div class="ai-plan-box">
          <div class="ai-plan-content">${sanitizeAIResponse(inc.actionPlan)}</div>
          <div class="ai-plan-actions">
            <button class="ops-btn success-ops-btn resolve-btn" data-id="${inc.id}">
              ✓ Deploy Plan & Resolve Incident
            </button>
            <button class="ops-btn secondary-ops-btn draft-plan-btn" data-id="${inc.id}">
              ↻ Re-draft
            </button>
          </div>
        </div>`;
    } else if (inc.status === 'resolved') {
      actionAreaHTML = `<div class="resolved-stamp">✓ Action Plan Deployed & Resolved</div>`;
    }

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

    // Bind event listeners inside this incident container
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

    el.incidentsList.appendChild(item);
  });

  // Restore scroll
  el.incidentsList.scrollTop = scrollPos;
}

/**
 * Trigger Gemini / Mock GenAI Response Drafting for specific incident.
 */
async function triggerIncidentPlanDraft(incidentId) {
  const state = getState();
  const inc = state.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  playTone(800, 0.1);
  updateIncident(incidentId, { status: 'drafting' });

  try {
    const plan = await generateContent('incident', inc);
    updateIncident(incidentId, {
      status: 'has_plan',
      actionPlan: plan
    });
    import('./state.js').then(m => m.addLog(`AI Response plan drafted for ${inc.title}. Ready for validation.`, 'info'));
  } catch (error) {
    console.error('Failed to generate action plan:', error);
    updateIncident(incidentId, { status: 'pending' });
    import('./state.js').then(m => m.addLog(`AI dispatch generation failed for ${inc.title}.`, 'error'));
  }
}

/**
 * Render operations event log terminal.
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

// Map styling managed by ui-map.js

// Chat view and Text-to-Speech managed by ui-chat.js

/**
 * Handle fan chat submission to Gemini / Mock Local Concierge.
 */
async function handleChatSubmit(e) {
  e.preventDefault();
  const text = el.chatInput.value.trim();
  if (text === '') return;

  playTone(700, 0.1);
  el.chatInput.value = '';

  // Add user message
  addChatMessage('user', text);
  
  // Prompt Injection Validation
  if (detectPromptInjection(text)) {
    import('./state.js').then(m => m.addLog('Chat query blocked: Potential Prompt Injection.', 'error'));
    setTimeout(() => {
      addChatMessage('ai', '⚠️ **Security Alert:** Your query was blocked by the Smadiums Prompt Injection Gateway. System override instructions are restricted. Please query stadium navigation or accessibility features.');
    }, 200);
    return;
  }
  
  // Show typing loader message
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
    
    // Remove typing loader and add actual response
    const loaderEl = document.getElementById(loaderId);
    if (loaderEl) loaderEl.remove();
    
    addChatMessage('ai', aiResponse);
    playTone(900, 0.1);
    
    // Read response out loud if soundFeedback settings are active
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

// Speech-to-Text dictation managed by ui-chat.js

/**
 * Generate Eco Recommendations from telemetry.
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
    import('./state.js').then(m => m.addLog('AI sustainability recommendations updated.', 'success'));
  } catch (e) {
    el.ecoContainer.innerHTML = '<p class="error-text">Failed to retrieve sustainability plan. Check connectivity.</p>';
  }
}

/**
 * Calculate routing guide between two points in the stadium.
 */
function calculateWayfindingRoute() {
  const from = el.navFromSelect.value;
  const to = el.navToSelect.value;
  
  if (from === to) {
    el.navRouteOutput.innerHTML = `<div class="route-step">You are already at your destination.</div>`;
    return;
  }

  const state = getState();
  const fromZone = state.zones[from];
  const toZone = state.zones[to];

  if (!fromZone || !toZone) {
    el.navRouteOutput.innerHTML = '';
    return;
  }

  // Draw simple pathing instructions
  let html = `<h4>Route Guide: ${fromZone.name} to ${toZone.name}</h4>`;
  let steps = [];
  
  // Custom navigation directions
  if (from === 'gateA') {
    steps.push('Exit Gate A entrance plaza and walk straight toward Sector 100 ring corridor.');
  } else if (from === 'gateB') {
    steps.push('Enter Gate B and take the escalators up to Level 1 Concourse.');
  } else if (from === 'gateC') {
    steps.push('Pass security check at Gate C, then follow the orange banners on the main loop corridor.');
  } else if (from === 'gateD') {
    steps.push('Pass Gate D ticket lanes and keep right toward the West lifts.');
  }

  if (to.startsWith('concession')) {
    steps.push(`Look for the food zone directories. ${toZone.name} is located nearby Section 112. (Queue time: ${toZone.waitTime} mins).`);
  } else if (to.startsWith('gate')) {
    steps.push(`Follow exit signs for the outer loop towards the ${toZone.name}.`);
  } else if (to === 'transitHub') {
    steps.push(`Head through the main concourse exit gates toward the East Boulevard, and follow the green icons to the subway shuttle loading zone.`);
    if (state.zones.transitHub.status === 'warning' || state.zones.transitHub.status === 'critical') {
      steps.push(`⚠️ Note: Metro shuttles have high queues (delay: ${state.zones.transitHub.waitTime}m). You may prefer the designated walking bypass path.`);
    }
  }

  steps.push('Arrived. Seek volunteers in bright green vests for seat row direction.');

  html += `<ul>${steps.map(s => `<li>${s}</li>`).join('')}</ul>`;
  el.navRouteOutput.innerHTML = html;
  
  announceToScreenReader(`Route calculated from ${fromZone.name} to ${toZone.name}.`);
}
export { playTone, speakTextTextToSpeech };
