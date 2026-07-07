/**
 * Configuration Constants Module for Smadiums.
 * Defines starting telemetry, zone configurations, initial incidents, and constants.
 */

export const INITIAL_SETTINGS = {
  theme: 'dark',
  textSize: 100,
  dyslexicFont: false,
  soundFeedback: false,
  selectedLanguage: 'en'
};

export const INITIAL_TELEMETRY = {
  crowdDensity: 68,
  avgGateWaitTime: 18,
  avgConcessionWaitTime: 12,
  sustainabilityScore: 84,
  stadiumOccupancy: 78240,
  greenEnergyUsage: 72,
  waterSavedLitres: 142500,
  wasteRecyclingRate: 88,
};

export const INITIAL_ZONES = {
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
};

export const DEFAULT_INCIDENTS = [
  {
    id: 'inc_gate_c',
    zone: 'gateC',
    title: 'Gate C Ticket Scanner Outage',
    description: 'Scanner hardware malfunction has reduced gate capacity by 50%. Queues are spilling into the outer security perimeter. Wait time is currently 52 minutes.',
    severity: 'critical',
    status: 'pending',
    actionPlan: null
  },
  {
    id: 'inc_medical_108',
    zone: 'sector100',
    title: 'Sector 108 Medical Report',
    description: 'Volunteer reports an elderly spectator suffering from heat exhaustion. Patient is resting in Sector 108, Row 14, Seat 8.',
    severity: 'warning',
    status: 'pending',
    actionPlan: null
  },
  {
    id: 'inc_transit_delay',
    zone: 'transitHub',
    title: 'Metro Link Shuttle Delay',
    description: 'Traffic congestion on the external loop road is causing shuttle bus delays. Commuters queueing for trains are experiencing 25-minute wait times.',
    severity: 'warning',
    status: 'pending',
    actionPlan: null
  }
];

export const INITIAL_CHAT_GREETING = {
  id: 'msg_init',
  sender: 'ai',
  text: 'Hello! Welcome to the FIFA World Cup 2026 Stadium Helper. I can assist you with finding your seat, checking concession queues, multilingual queries, and accessible services. How can I help you today?',
  language: 'en'
};
