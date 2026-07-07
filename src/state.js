/**
 * State Management Module for Smadiums.
 * Implements a reactive state store with listeners and a real-time data simulator.
 */

// Initial state template
const initialState = {
  // Application Settings
  settings: {
    geminiApiKey: typeof localStorage !== 'undefined' ? localStorage.getItem('smadiums_api_key') || '' : '',
    theme: 'dark', // 'dark' | 'light' | 'high-contrast'
    textSize: 100, // percentage 80% to 150%
    dyslexicFont: false,
    soundFeedback: false,
    selectedLanguage: 'en'
  },
  
  // Current Active Persona
  activePersona: 'staff', // 'staff' | 'fan'
  
  // Stadium Live Telemetry
  telemetry: {
    crowdDensity: 68, // average percentage
    avgGateWaitTime: 18, // minutes
    avgConcessionWaitTime: 12, // minutes
    sustainabilityScore: 84, // percentage
    stadiumOccupancy: 78240, // out of 82500
    greenEnergyUsage: 72, // % solar/wind
    waterSavedLitres: 142500,
    wasteRecyclingRate: 88, // % diverted from landfill
  },

  // Interactive Zones & Map Statuses
  zones: {
    gateA: { name: 'Gate A (North)', waitTime: 15, status: 'optimal', crowdDensity: 45 },
    gateB: { name: 'Gate B (East)', waitTime: 22, status: 'warning', crowdDensity: 70 },
    gateC: { name: 'Gate C (South)', waitTime: 52, status: 'critical', crowdDensity: 92 },
    gateD: { name: 'Gate D (West)', waitTime: 12, status: 'optimal', crowdDensity: 38 },
    concession1: { name: 'North Eats (Concession 1)', waitTime: 8, status: 'optimal', queueLength: 12 },
    concession2: { name: 'Copa Snacks (Concession 2)', waitTime: 18, status: 'warning', queueLength: 32 },
    concession3: { name: 'Azteca Grill (Concession 3)', waitTime: 25, status: 'warning', queueLength: 48 },
    concession4: { name: 'Green Bites (Concession 4)', waitTime: 5, status: 'optimal', queueLength: 6 },
    sector100: { name: 'Lower Tier (Sectors 100-140)', status: 'warning', crowdDensity: 75 },
    sector200: { name: 'Middle Club Tier (Sectors 200-260)', status: 'optimal', crowdDensity: 55 },
    sector300: { name: 'Upper Tier (Sectors 300-380)', status: 'critical', crowdDensity: 90 },
    transitHub: { name: 'East Transit Metro Shuttle', waitTime: 25, status: 'warning', crowdDensity: 82 }
  },

  // Active Incidents & AI Action Plans
  incidents: [
    {
      id: 'inc_gate_c',
      zone: 'gateC',
      title: 'Gate C Ticket Scanner Outage',
      description: 'Scanner hardware malfunction has reduced gate capacity by 50%. Queues are spilling into the outer security perimeter. Wait time is currently 52 minutes.',
      severity: 'critical',
      timestamp: new Date().toLocaleTimeString(),
      status: 'pending', // 'pending' | 'drafting' | 'has_plan' | 'resolved'
      actionPlan: null
    },
    {
      id: 'inc_medical_108',
      zone: 'sector100',
      title: 'Sector 108 Medical Report',
      description: 'Volunteer reports an elderly spectator suffering from heat exhaustion. Patient is resting in Sector 108, Row 14, Seat 8.',
      severity: 'warning',
      timestamp: new Date().toLocaleTimeString(),
      status: 'pending',
      actionPlan: null
    },
    {
      id: 'inc_transit_delay',
      zone: 'transitHub',
      title: 'Metro Link Shuttle Delay',
      description: 'Traffic congestion on the external loop road is causing shuttle bus delays. Commuters queueing for trains are experiencing 25-minute wait times.',
      severity: 'warning',
      timestamp: new Date().toLocaleTimeString(),
      status: 'pending',
      actionPlan: null
    }
  ],

  // System Event Logs
  logs: [
    { time: new Date().toLocaleTimeString(), message: 'Smadiums operations dashboard initialized.', type: 'info' },
    { time: new Date().toLocaleTimeString(), message: 'Connected to stadium sensor grid telemetry.', type: 'success' },
    { time: new Date().toLocaleTimeString(), message: 'Warning alert raised: Gate C scanner degradation.', type: 'error' }
  ],

  // Fan Persona Chat History
  chatHistory: [
    {
      id: 'msg_init',
      sender: 'ai',
      text: 'Hello! Welcome to the FIFA World Cup 2026 Stadium Helper. I can assist you with finding your seat, checking concession queues, multilingual queries, and accessible services. How can I help you today?',
      timestamp: new Date().toLocaleTimeString(),
      language: 'en'
    }
  ]
};

// Application state store instance
let state = JSON.parse(JSON.stringify(initialState));

// Listeners collection
const listeners = new Set();

/**
 * Register a listener function to be called when the state updates.
 * @param {Function} callback - Callback function receives the updated state.
 */
export function subscribe(callback) {
  listeners.add(callback);
  // Return an unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get a copy of the current state.
 */
export function getState() {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Update the state and notify all subscribers.
 * @param {Object} partialState - Subset of state to update.
 */
export function updateState(partialState) {
  state = { ...state, ...partialState };
  notify();
}

/**
 * Trigger listener notifications.
 */
function notify() {
  for (let listener of listeners) {
    try {
      listener(getState());
    } catch (e) {
      console.error('Error in state subscriber:', e);
    }
  }
}

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings) {
  if (settings.geminiApiKey !== undefined && settings.geminiApiKey !== '') {
    const keyRegex = /^AIzaSy[A-Za-z0-9_-]{33}$/;
    if (!keyRegex.test(settings.geminiApiKey)) {
      throw new Error('Invalid Gemini API Key format. A valid key starts with "AIzaSy" and is 39 characters long.');
    }
  }
  state.settings = { ...state.settings, ...settings };
  if (settings.geminiApiKey !== undefined && typeof localStorage !== 'undefined') {
    localStorage.setItem('smadiums_api_key', settings.geminiApiKey);
  }
  addLog('Application settings updated.', 'info');
  notify();
}

/**
 * Add a log entry.
 */
export function addLog(message, type = 'info') {
  const newLog = {
    time: new Date().toLocaleTimeString(),
    message,
    type
  };
  // Cap logs at 50 to avoid memory overflow
  const updatedLogs = [newLog, ...state.logs].slice(0, 50);
  state.logs = updatedLogs;
  notify();
}

/**
 * Add a new incident.
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
  addLog(`New ${incident.severity} incident raised: ${incident.title}`, incident.severity === 'critical' ? 'error' : 'warning');
  notify();
}

/**
 * Update an incident's fields.
 */
export function updateIncident(incidentId, updates) {
  state.incidents = state.incidents.map(inc => {
    if (inc.id === incidentId) {
      return { ...inc, ...updates };
    }
    return inc;
  });
  notify();
}

/**
 * Resolve an incident, updating its status and related zone telemetry.
 */
export function resolveIncident(incidentId) {
  const incident = state.incidents.find(inc => inc.id === incidentId);
  if (!incident) return;

  state.incidents = state.incidents.map(inc => {
    if (inc.id === incidentId) {
      return { ...inc, status: 'resolved' };
    }
    return inc;
  });

  // Dynamically resolve the corresponding zone telemetry state
  const zoneKey = incident.zone;
  if (zoneKey && state.zones[zoneKey]) {
    state.zones[zoneKey].status = 'optimal';
    if (state.zones[zoneKey].waitTime !== undefined) {
      state.zones[zoneKey].waitTime = Math.max(5, Math.floor(state.zones[zoneKey].waitTime / 2.5));
    }
    if (state.zones[zoneKey].crowdDensity !== undefined) {
      state.zones[zoneKey].crowdDensity = Math.max(30, Math.floor(state.zones[zoneKey].crowdDensity / 1.8));
    }
    if (state.zones[zoneKey].queueLength !== undefined) {
      state.zones[zoneKey].queueLength = Math.max(2, Math.floor(state.zones[zoneKey].queueLength / 3));
    }
  }

  addLog(`Incident resolved: ${incident.title}. Stadium sector returned to optimal status.`, 'success');
  recalculateAverages();
  notify();
}

/**
 * Re-calculate stadium-wide averages based on zone telemetry.
 */
function recalculateAverages() {
  let totalGateWait = 0, gateCount = 0;
  let totalConcessionWait = 0, concessionCount = 0;
  let totalCrowd = 0, zoneCount = 0;

  for (let key in state.zones) {
    const zone = state.zones[key];
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
 * Add a fan chat message.
 */
export function addChatMessage(sender, text, language = 'en') {
  const newMsg = {
    id: `msg_${Date.now()}`,
    sender,
    text,
    timestamp: new Date().toLocaleTimeString(),
    language
  };
  
  // Cap chat history at 30 entries in state memory to prevent heap leaks.
  // Preserves greeting bubble at index 0 and shifts out the oldest conversation pair.
  if (state.chatHistory.length >= 30) {
    const greeting = state.chatHistory[0];
    const historicalTail = state.chatHistory.slice(3); // Remove oldest user message + AI response
    state.chatHistory = [greeting, ...historicalTail];
  }
  
  state.chatHistory.push(newMsg);
  notify();
}

/**
 * Start the Live Stadium Telemetry Simulation.
 * Simulates slight fluctuation of queues, energy usage, and fan movements.
 */
export function startSimulator() {
  setInterval(() => {
    // Modify general occupancy and sustainability variables slightly
    const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
    state.telemetry.stadiumOccupancy = Math.min(82500, Math.max(75000, state.telemetry.stadiumOccupancy + fluctuation * 15));
    state.telemetry.greenEnergyUsage = Math.min(100, Math.max(50, state.telemetry.greenEnergyUsage + (Math.random() > 0.5 ? 1 : -1)));
    state.telemetry.waterSavedLitres += Math.floor(Math.random() * 10) + 5;
    
    // Divert recycling rates
    if (Math.random() > 0.8) {
      state.telemetry.wasteRecyclingRate = Math.min(98, Math.max(80, state.telemetry.wasteRecyclingRate + (Math.random() > 0.5 ? 1 : -1)));
    }

    // Modify zone telemetry slightly if they are not in a critical incident
    for (let key in state.zones) {
      const zone = state.zones[key];
      const isIncidentZone = state.incidents.some(inc => inc.zone === key && inc.status !== 'resolved');
      
      if (!isIncidentZone) {
        if (zone.waitTime !== undefined) {
          const wFluct = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
          zone.waitTime = Math.min(60, Math.max(2, zone.waitTime + wFluct));
          zone.status = zone.waitTime > 40 ? 'critical' : zone.waitTime > 20 ? 'warning' : 'optimal';
        }
        if (zone.crowdDensity !== undefined) {
          const cFluct = Math.floor(Math.random() * 5) - 2; // -2 to 2
          zone.crowdDensity = Math.min(100, Math.max(10, zone.crowdDensity + cFluct));
          if (zone.waitTime === undefined) {
            zone.status = zone.crowdDensity > 85 ? 'critical' : zone.crowdDensity > 65 ? 'warning' : 'optimal';
          }
        }
        if (zone.queueLength !== undefined) {
          const qFluct = Math.floor(Math.random() * 3) - 1; // -1 to 1
          zone.queueLength = Math.min(100, Math.max(1, zone.queueLength + qFluct));
        }

        // Predictive crowd safety check:
        // Automatically spawn a warning incident if density spikes, modeling predictive logistics
        if (zone.crowdDensity !== undefined && zone.crowdDensity > 88) {
          const existingInc = state.incidents.find(inc => inc.zone === key && inc.status !== 'resolved');
          if (!existingInc) {
            setTimeout(() => {
              addIncident({
                zone: key,
                title: `Predictive Alert: ${zone.name} Compression Risk`,
                description: `Stadium analytics forecast high crowd compression in ${zone.name}. Seating access flow is running at ${zone.crowdDensity}%, exceeding security control thresholds.`,
                severity: 'critical'
              });
            }, 50);
          }
        }
      }
    }

    recalculateAverages();
    notify();
  }, 10000); // Trigger telemetry fluctuation every 10 seconds
}
