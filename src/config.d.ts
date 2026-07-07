/**
 * TypeScript Typings for Smadiums Configuration Constants.
 * All exports are deeply frozen and should be treated as immutable.
 * @module config
 */

import { Settings, Telemetry, Zone, Incident, ChatMessage, Volunteer } from './state';

export const INITIAL_SETTINGS: Readonly<Omit<Settings, 'geminiApiKey'>>;
export const INITIAL_TELEMETRY: Readonly<Telemetry>;
export const INITIAL_ZONES: Readonly<Record<string, Readonly<Zone>>>;
export const DEFAULT_INCIDENTS: ReadonlyArray<Readonly<Omit<Incident, 'timestamp'>>>;
export const INITIAL_CHAT_GREETING: Readonly<Omit<ChatMessage, 'timestamp'>>;
export const INITIAL_VOLUNTEERS: ReadonlyArray<Readonly<Volunteer>>;
