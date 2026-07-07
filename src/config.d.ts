import { Settings, Telemetry, Zone, Incident, ChatMessage } from './state';

export const INITIAL_SETTINGS: Omit<Settings, 'geminiApiKey'>;
export const INITIAL_TELEMETRY: Telemetry;
export const INITIAL_ZONES: Record<string, Zone>;
export const DEFAULT_INCIDENTS: Omit<Incident, 'timestamp'>[];
export const INITIAL_CHAT_GREETING: Omit<ChatMessage, 'timestamp'>;
