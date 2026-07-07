/**
 * TypeScript Typings for Smadiums Incidents Component.
 * @module ui-incidents
 */

import { Incident } from './state';

export function handleBroadcast(zoneKey: string): void;
export function triggerIncidentPlanDraft(incidentId: string): Promise<void>;
export function renderIncidents(incidents: Incident[], container: HTMLElement | null): void;
