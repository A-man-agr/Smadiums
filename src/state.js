/**
 * State Management Module for Smadiums.
 * Implements a reactive state store with pub/sub notifications and a real-time
 * telemetry data simulator for crowd density, queue wait times, and sustainability.
 * @module state
 */

import {
  INITIAL_SETTINGS,
  INITIAL_TELEMETRY,
  INITIAL_ZONES,
  DEFAULT_INCIDENTS,
  INITIAL_CHAT_GREETING,
  INITIAL_VOLUNTEERS
} from './config.js';

// Initial state template constructed from configuration constants
const initialState = {
  settings: {
    ...INITIAL_SETTINGS,
    geminiApiKey: typeof localStorage !== 'undefined' ? localStorage.getItem('smadiums_api_key') || '' : ''
  },
  activePersona: 'staff',
  telemetry: { ...INITIAL_TELEMETRY },
  zones: { ...INITIAL_ZONES },
  incidents: DEFAULT_INCIDENTS.map(inc => ({
    ...inc,
    timestamp: new Date().toLocaleTimeString()
  })),
  logs: [
    { time: new Date().toLocaleTimeString(), message: 'Smadiums operations dashboard initialized.', type: 'info' },
    { time: new Date().toLocaleTimeString(), message: 'Connected to stadium sensor grid telemetry.', type: 'success' },
    { time: new Date().toLocaleTimeString(), message: 'Warning alert raised: Gate C scanner degradation.', type: 'error' }
  ],
  chatHistory: [
    {
      ...INITIAL_CHAT_GREETING,
      timestamp: new Date().toLocaleTimeString()
    }
  ],
  volunteers: INITIAL_VOLUNTEERS.map(v => ({ ...v }))
};

/** Application state store instance (deep-cloned from initialState). */
let state = JSON.parse(JSON.stringify(initialState));

/** Registered subscriber callbacks. */
const listeners = new Set();

/** Telemetry reduction factors applied when resolving incidents. */
const RESOLUTION_FACTORS = {
  waitTimeDivisor: 2.5,
  waitTimeFloor: 5,
  crowdDensityDivisor: 1.8,
  crowdDensityFloor: 30,
  queueLengthDivisor: 3,
  queueLengthFloor: 2
};

/** Maximum entries for in-memory collections to prevent heap growth. */
const MAX_LOG_ENTRIES = 50;
const MAX_CHAT_ENTRIES = 30;

/**
 * Register a listener function to be called when the state updates.
 * @param {Function} callback - Callback function that receives the updated state snapshot.
 * @returns {Function} Unsubscribe function that removes the listener.
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get a deep copy of the current application state.
 * @returns {import('./state').AppState} Cloned state snapshot
 */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Merge a partial update into the state and notify all subscribers.
 * @param {Partial<import('./state').AppState>} partialState - Subset of state to merge.
 * @returns {void}
 */
export function updateState(partialState) {
  state = { ...state, ...partialState };
  notify();
}

/**
 * Notify all registered subscribers with a fresh state snapshot.
 * Catches and logs errors in individual listeners to prevent cascading failures.
 */
function notify() {
  for (const listener of listeners) {
    try {
      listener(getState());
    } catch (e) {
      console.error('Error in state subscriber:', e);
    }
  }
}

/**
 * Validate the format of a Gemini API key.
 * @param {string} key - API key to validate
 * @throws {Error} If the key format is invalid
 */
function validateApiKeyFormat(key) {
  const GEMINI_KEY_PATTERN = /^AIzaSy[A-Za-z0-9_-]{33}$/;
  if (!GEMINI_KEY_PATTERN.test(key)) {
    throw new Error('Invalid Gemini API Key format. A valid key starts with "AIzaSy" and is 39 characters long.');
  }
}

/**
 * Save settings, persist API key to localStorage, and notify subscribers.
 * @param {Partial<import('./state').Settings>} settings - Settings to merge.
 * @throws {Error} If an API key is provided but has an invalid format.
 * @returns {void}
 */
export function saveSettings(settings) {
  const hasApiKey = settings.geminiApiKey !== undefined && settings.geminiApiKey !== '';
  if (hasApiKey) {
    validateApiKeyFormat(settings.geminiApiKey);
  }
  state.settings = { ...state.settings, ...settings };
  if (settings.geminiApiKey !== undefined && typeof localStorage !== 'undefined') {
    localStorage.setItem('smadiums_api_key', settings.geminiApiKey);
  }
  addLog('Application settings updated.', 'info');
  notify();
}

/**
 * Add a log entry to the operations log. Caps entries at MAX_LOG_ENTRIES.
 * @param {string} message - Log message text
 * @param {'info' | 'warning' | 'error' | 'success'} [type='info'] - Log severity level
 * @returns {void}
 */
export function addLog(message, type = 'info') {
  const newLog = {
    time: new Date().toLocaleTimeString(),
    message,
    type
  };
  state.logs = [newLog, ...state.logs].slice(0, MAX_LOG_ENTRIES);
  notify();
}

/**
 * Add a new incident and auto-dispatch volunteers in the affected zone.
 * @param {Object} incident - Incident data (zone, title, description, severity)
 * @returns {void}
 */
export function addIncident(incident) {
  const newIncident = {
    id: `inc_${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    status: 'pending',
    actionPlan: null,
    ...incident
  };
  state.incidents = [newIncident, ...state.incidents];

  const logType = incident.severity === 'critical' ? 'error' : 'warning';
  addLog(`New ${incident.severity} incident raised: ${incident.title}`, logType);

  // Automatically dispatch volunteers stationed in the affected zone
  if (incident.zone) {
    state.volunteers = state.volunteers.map(vol =>
      vol.zone === incident.zone ? { ...vol, status: 'dispatched' } : vol
    );
  }

  notify();
}

/**
 * Update an incident's fields by ID.
 * @param {string} incidentId - ID of the incident to update
 * @param {Partial<import('./state').Incident>} updates - Fields to merge
 * @returns {void}
 */
export function updateIncident(incidentId, updates) {
  state.incidents = state.incidents.map(inc =>
    inc.id === incidentId ? { ...inc, ...updates } : inc
  );
  notify();
}

/**
 * Resolve an incident, restoring zone telemetry and resetting dispatched volunteers.
 * @param {string} incidentId - ID of the incident to resolve
 * @returns {void}
 */
export function resolveIncident(incidentId) {
  const incident = state.incidents.find(inc => inc.id === incidentId);
  if (!incident) return;

  state.incidents = state.incidents.map(inc =>
    inc.id === incidentId ? { ...inc, status: 'resolved' } : inc
  );

  // Restore the corresponding zone to optimal telemetry
  const zoneKey = incident.zone;
  if (zoneKey && state.zones[zoneKey]) {
    const zone = state.zones[zoneKey];
    zone.status = 'optimal';
    if (zone.waitTime !== undefined) {
      zone.waitTime = Math.max(RESOLUTION_FACTORS.waitTimeFloor, Math.floor(zone.waitTime / RESOLUTION_FACTORS.waitTimeDivisor));
    }
    if (zone.crowdDensity !== undefined) {
      zone.crowdDensity = Math.max(RESOLUTION_FACTORS.crowdDensityFloor, Math.floor(zone.crowdDensity / RESOLUTION_FACTORS.crowdDensityDivisor));
    }
    if (zone.queueLength !== undefined) {
      zone.queueLength = Math.max(RESOLUTION_FACTORS.queueLengthFloor, Math.floor(zone.queueLength / RESOLUTION_FACTORS.queueLengthDivisor));
    }
  }

  // Reset dispatched volunteers in this zone back to idle
  state.volunteers = state.volunteers.map(vol =>
    (vol.zone === zoneKey && vol.status === 'dispatched') ? { ...vol, status: 'idle' } : vol
  );

  addLog(`Incident resolved: ${incident.title}. Stadium sector returned to optimal status.`, 'success');
  recalculateAverages();
  notify();
}

/**
 * Recalculate stadium-wide average telemetry from individual zone readings.
 * Updates avgGateWaitTime, avgConcessionWaitTime, and crowdDensity.
 */
function recalculateAverages() {
  let totalGateWait = 0;
  let gateCount = 0;
  let totalConcessionWait = 0;
  let concessionCount = 0;
  let totalCrowd = 0;
  let zoneCount = 0;

  for (const [key, zone] of Object.entries(state.zones)) {
    if (key.startsWith('gate')) {
      totalGateWait += zone.waitTime;
      gateCount++;
    } else if (key.startsWith('concession')) {
      totalConcessionWait += zone.waitTime;
      concessionCount++;
    }
    if (zone.crowdDensity !== undefined) {
      totalCrowd += zone.crowdDensity;
      zoneCount++;
    }
  }

  state.telemetry.avgGateWaitTime = gateCount ? Math.round(totalGateWait / gateCount) : state.telemetry.avgGateWaitTime;
  state.telemetry.avgConcessionWaitTime = concessionCount ? Math.round(totalConcessionWait / concessionCount) : state.telemetry.avgConcessionWaitTime;
  state.telemetry.crowdDensity = zoneCount ? Math.round(totalCrowd / zoneCount) : state.telemetry.crowdDensity;
}

/**
 * Add a fan chat message. Caps history at MAX_CHAT_ENTRIES, preserving the initial greeting.
 * @param {'user' | 'ai'} sender - Message sender type
 * @param {string} text - Message text content
 * @param {string} [language='en'] - Language code for multilingual support
 * @returns {void}
 */
export function addChatMessage(sender, text, language = 'en') {
  const newMsg = {
    id: `msg_${Date.now()}`,
    sender,
    text,
    timestamp: new Date().toLocaleTimeString(),
    language
  };

  // Preserve greeting at index 0; evict oldest conversation pair when cap is reached
  if (state.chatHistory.length >= MAX_CHAT_ENTRIES) {
    const greeting = state.chatHistory[0];
    const historicalTail = state.chatHistory.slice(3);
    state.chatHistory = [greeting, ...historicalTail];
  }

  state.chatHistory.push(newMsg);
  notify();
}

/**
 * Dynamic telemetry updater for the background simulation loop.
 * Executes telemetry changes, recalculates statistics, and alerts observers.
 * @param {Function} simulateFn - Lambda mutator for app telemetry variables
 * @returns {void}
 */
export function triggerTelemetrySimulation(simulateFn) {
  simulateFn(state);
  recalculateAverages();
  notify();
}

/**
 * Update a volunteer's status and optionally reassign their zone.
 * @param {string} id - Volunteer ID
 * @param {'idle' | 'dispatched'} status - New status value
 * @param {string | null} [zone=null] - Optional new zone assignment
 * @returns {void}
 */
export function updateVolunteerStatus(id, status, zone = null) {
  state.volunteers = state.volunteers.map(vol => {
    if (vol.id !== id) return vol;
    const updated = { ...vol, status };
    if (zone !== null) {
      updated.zone = zone;
    }
    return updated;
  });
  notify();
}
