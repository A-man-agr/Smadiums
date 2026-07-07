/**
 * UI Rendering and Interaction Module for Smadiums.
 * Controls DOM construction, SVG map updates, and accessibility states.
 */

import { getState, resolveIncident, updateIncident, addChatMessage, saveSettings } from './state.js';
import { sanitizeAIResponse, escapeHTML, detectPromptInjection } from './sanitizer.js';
import { generateContent } from './ai-client.js';
import { runAllTests } from './tests.js';

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
  setupMapListeners();

  // Sustainability Recommendations
  el.refreshEcoBtn.addEventListener('click', generateSustainabilityPlan);

  // Chat Form submission
  el.chatForm.addEventListener('submit', handleChatSubmit);

  // Speak input (simulated voice transcription / Web Speech API)
  el.speakInputBtn.addEventListener('click', handleVoiceInput);

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
  
  setTimeout(() => {
    const results = runAllTests();
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
  renderChat(state.chatHistory);
}

function toggleAlertClasses(container, isAlerting) {
  if (isAlerting) {
    container.classList.add('alerting');
  } else {
    container.classList.remove('alerting');
  }
}

/**
 * Setup map path/shapes selectors and bind hover / click indicators.
 */
function setupMapListeners() {
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
        el.navToSelect.value = zoneKey;
        calculateWayfindingRoute();
        announceToScreenReader(`Selected destination: ${zone.name}`);
      }
    }
  });
}

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

/**
 * Update the colors of SVG Map paths dynamically.
 */
function updateSVGMapColors(zones) {
  for (let zoneKey in zones) {
    const zone = zones[zoneKey];
    // Find SVG element matching the data-zone attribute
    const svgEl = document.querySelector(`[data-zone="${zoneKey}"]`);
    if (svgEl) {
      // Clear status classes
      svgEl.classList.remove('zone-optimal', 'zone-warning', 'zone-critical');
      svgEl.classList.add(`zone-${zone.status}`);
      
      // Update interactive title tooltip if it exists
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
 * Render the chat bubbles in the Fan Concierge.
 */
function renderChat(chat) {
  const scrollPos = el.chatMessages.scrollTop;
  const isAtBottom = el.chatMessages.scrollHeight - el.chatMessages.clientHeight <= el.chatMessages.scrollTop + 30;

  el.chatMessages.innerHTML = '';
  
  chat.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble sender-${msg.sender}`;
    
    // AI messages support formatted Markdown, User messages are pure sanitized text
    const textContent = msg.sender === 'ai' ? sanitizeAIResponse(msg.text) : escapeHTML(msg.text);
    
    bubble.innerHTML = `
      <div class="bubble-content">${textContent}</div>
      <div class="bubble-meta">
        <span>${msg.timestamp}</span>
        ${msg.sender === 'ai' ? `<button class="tts-btn" aria-label="Speak text" data-text="${escapeHTML(msg.text)}">🔊</button>` : ''}
      </div>
    `;

    const ttsBtn = bubble.querySelector('.tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakTextTextToSpeech(ttsBtn.dataset.text);
      });
    }

    el.chatMessages.appendChild(bubble);
  });

  // Restore scroll or scroll to bottom
  if (isAtBottom) {
    el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
  } else {
    el.chatMessages.scrollTop = scrollPos;
  }
}

/**
 * TTS Helper. Speaks text out loud using Web Speech Synthesis API.
 */
function speakTextTextToSpeech(text) {
  if ('speechSynthesis' in window) {
    // If speaking, cancel it
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }
    // Remove markdown symbols from speech
    const cleanText = text.replace(/[\*\#\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Attempt to match the reader language if possible
    const firstWords = cleanText.toLowerCase();
    if (firstWords.includes('puerta') || firstWords.includes('hola') || firstWords.includes('baño')) {
      utterance.lang = 'es-ES';
    } else if (firstWords.includes('bonjour') || firstWords.includes('merci')) {
      utterance.lang = 'fr-FR';
    } else {
      utterance.lang = 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  } else {
    alert('Audio synthesis is not supported in this browser.');
  }
}

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

/**
 * Voice dictation (Speech to Text simulation).
 */
function handleVoiceInput() {
  playTone(880, 0.05);
  const recognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  if (!recognition) {
    // If not supported, simulate a voice input
    el.chatInput.value = 'Where is the nearest wheelchair elevator?';
    el.chatInput.focus();
    announceToScreenReader('Voice recognition not supported. Simulated: Where is the nearest wheelchair elevator?');
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRec();
  rec.lang = getState().settings.selectedLanguage === 'es' ? 'es-ES' : 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  el.speakInputBtn.classList.add('recording');
  announceToScreenReader('Voice recording active. Please speak now.');

  rec.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    el.chatInput.value = resultText;
    el.speakInputBtn.classList.remove('recording');
    el.chatForm.requestSubmit();
  };

  rec.onerror = (e) => {
    console.error('Speech recognition error:', e);
    el.speakInputBtn.classList.remove('recording');
  };

  rec.onend = () => {
    el.speakInputBtn.classList.remove('recording');
  };

  rec.start();
}

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
