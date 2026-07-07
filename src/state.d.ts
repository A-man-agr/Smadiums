/**
 * TypeScript Typings for Smadiums State Management.
 * @module state
 */

export interface Telemetry {
  stadiumOccupancy: number;
  avgGateWaitTime: number;
  avgConcessionWaitTime: number;
  crowdDensity: number;
  sustainabilityScore: number;
  greenEnergyUsage: number;
  waterSavedLitres: number;
  wasteRecyclingRate: number;
}

export interface Zone {
  name: string;
  status: 'optimal' | 'warning' | 'critical';
  waitTime?: number;
  crowdDensity?: number;
  queueLength?: number;
}

export interface Incident {
  id: string;
  zone: string;
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  status: 'pending' | 'drafting' | 'has_plan' | 'resolved';
  timestamp: string;
  actionPlan?: string | null;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface Settings {
  theme: 'dark' | 'light' | 'high-contrast';
  textSize: number;
  dyslexicFont: boolean;
  soundFeedback: boolean;
  selectedLanguage: 'en' | 'es' | 'fr';
  geminiApiKey: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  language?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  languages: string[];
  zone: string;
  role: string;
  status: 'idle' | 'dispatched';
}

export interface AppState {
  activePersona: 'staff' | 'fan';
  telemetry: Telemetry;
  zones: Record<string, Zone>;
  incidents: Incident[];
  logs: LogEntry[];
  settings: Settings;
  chatHistory: ChatMessage[];
  volunteers: Volunteer[];
}

export type StateListener = (state: AppState) => void;

export function getState(): AppState;
export function updateState(newState: Partial<AppState>): void;
export function subscribe(listener: StateListener): () => void;
export function addIncident(inc: Omit<Incident, 'id' | 'status' | 'timestamp'>): void;
export function resolveIncident(id: string): void;
export function updateIncident(id: string, updates: Partial<Incident>): void;
export function addLog(message: string, type?: LogEntry['type']): void;
export function addChatMessage(sender: ChatMessage['sender'], text: string, language?: string): void;
export function saveSettings(settings: Partial<Settings>): void;
export function updateVolunteerStatus(id: string, status: Volunteer['status'], zone?: string | null): void;
export function triggerTelemetrySimulation(simulateFn: (state: AppState) => void): void;
