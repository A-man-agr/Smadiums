/**
 * TypeScript Typings for Smadiums Volunteers Component.
 * @module ui-volunteers
 */

import { Volunteer, Zone } from './state';

export function renderVolunteers(
  volunteers: Volunteer[],
  zones: Record<string, Zone>,
  rosterContainer: HTMLElement | null,
  countLabel: HTMLElement | null
): void;
