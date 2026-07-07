/**
 * UI Volunteer Roster Component for Smadiums.
 * Controls volunteer status displays, icons, and shifts.
 * @module ui-volunteers
 */

import { escapeHTML } from './sanitizer.js';

/**
 * Determine the appropriate status emoji for a volunteer.
 * @param {import('./state').Volunteer} vol - Volunteer object
 * @returns {string} Emoji icon string
 */
function getVolunteerIcon(vol) {
  const isFemale = vol.name === 'Sofia';
  if (vol.status === 'dispatched') {
    return isFemale ? '🏃‍♀️' : '🏃‍♂️';
  }
  return isFemale ? '🙋‍♀️' : '🙋‍♂️';
}

/**
 * Render the volunteer roster dynamically based on state.
 * @param {Array<import('./state').Volunteer>} volunteers - Volunteer list from state
 * @param {Record<string, import('./state').Zone>} zones - Zone lookup map from state
 * @param {HTMLElement | null} rosterContainer - Roster list container element
 * @param {HTMLElement | null} countLabel - Active volunteers count badge element
 * @returns {void}
 */
export function renderVolunteers(volunteers, zones, rosterContainer, countLabel) {
  if (!rosterContainer) return;

  if (countLabel) {
    countLabel.textContent = `${volunteers.length} Active Helpers`;
  }

  rosterContainer.innerHTML = '';
  volunteers.forEach(vol => {
    const item = document.createElement('div');
    item.className = `vol-item status-${vol.status}`;

    const statusIcon = getVolunteerIcon(vol);
    const langStr = vol.languages.join(' / ');
    const zoneName = zones[vol.zone]?.name || vol.zone;
    const statusLabel = vol.status === 'dispatched'
      ? '<span class="vol-status-label dispatched-label">[Dispatched]</span>'
      : '<span class="vol-status-label idle-label">[Idle]</span>';

    item.innerHTML = `
      <span class="vol-status-icon" aria-hidden="true">${statusIcon}</span>
      <div class="vol-info">
        <span class="vol-name">${escapeHTML(vol.name)} (${escapeHTML(langStr)})</span>
        <span class="vol-assignment">
          ${escapeHTML(zoneName)} • ${escapeHTML(vol.role)}
          ${statusLabel}
        </span>
      </div>
    `;
    rosterContainer.appendChild(item);
  });
}
