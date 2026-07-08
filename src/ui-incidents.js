/**
 * UI Incidents Component for Smadiums.
 * Controls the Operations Control Center incident cards queue and GenAI response plan flows.
 * @module ui-incidents
 */

import { generateContent } from './ai-client.js';
import { sanitizeAIResponse, escapeHTML } from './sanitizer.js';
import { updateIncident, addLog, resolveIncident, getState } from './state.js';
import { speakText } from './ui-chat.js';
import { playTone } from './utils.js';

/**
 * Announcement audio templates corresponding to zone bottlenecks.
 * @type {Record<string, string>}
 */
const ZONE_BROADCASTS = {
  gateC: 'Gate C is experiencing high wait times. For faster entry, please walk to Gate D where wait times are under 10 minutes.',
  sector100: 'Attention spectators. High heat levels reported. Roaming hydration stewards are distributing water. Stay hydrated.',
  sector300: 'Attention spectators. High heat levels reported. Roaming hydration stewards are distributing water. Stay hydrated.',
  transitHub: 'Transit warning. Metro shuttle buses are delayed due to loop traffic. Spectators are advised to use the Green Ribbon Trail to walk to the Metro station.'
};

/**
 * Handle the voice broadcast announcement for a specific zone incident.
 * @param {string} zoneKey - Zone identifier
 * @returns {void}
 */
export function handleBroadcast(zoneKey) {
  playTone(660, 0.1);
  setTimeout(() => playTone(880, 0.15), 100);

  const warningText = ZONE_BROADCASTS[zoneKey] || 'Attention spectators. Please follow stewards instructions in this area.';
  speakText(warningText);
  addLog(`AI Voice Broadcast Alert deployed for ${zoneKey}.`, 'info');
}

/**
 * Trigger GenAI response plan drafting for a specific incident.
 * @param {string} incidentId - ID of the incident to draft a plan for
 * @returns {Promise<void>}
 */
export async function triggerIncidentPlanDraft(incidentId) {
  playTone(800, 0.1);
  updateIncident(incidentId, { status: 'drafting' });

  const inc = getState().incidents.find(i => i.id === incidentId);
  if (!inc) return;

  try {
    const plan = await generateContent('incident', inc);
    updateIncident(incidentId, { status: 'has_plan', actionPlan: plan });
    addLog(`AI Response plan drafted for ${inc.title}. Ready for validation.`, 'info');
  } catch (error) {
    console.error('Failed to generate action plan:', error);
    updateIncident(incidentId, { status: 'pending' });
    addLog(`AI dispatch generation failed for ${inc.title}.`, 'error');
  }
}

/**
 * Build the action area HTML for an incident card based on status.
 * @param {import('./state').Incident} inc - Incident object
 * @returns {string} HTML string
 */
function buildIncidentActionHTML(inc) {
  switch (inc.status) {
    case 'pending':
      return `
        <button class="ops-btn primary-ops-btn draft-plan-btn" data-id="${inc.id}">
          ⚡ Draft AI Response Plan
        </button>`;

    case 'drafting':
      return `
        <div class="ai-loading-indicator">
          <div class="spinner"></div>
          <span>GenAI compiling dispatcher response...</span>
        </div>`;

    case 'has_plan':
      return `
        <div class="ai-plan-box">
          <div class="ai-plan-content">${sanitizeAIResponse(inc.actionPlan)}</div>
          <div class="ai-plan-actions">
            <button class="ops-btn success-ops-btn resolve-btn" data-id="${inc.id}">
              ✓ Deploy Plan & Resolve Incident
            </button>
            <button class="ops-btn primary-ops-btn broadcast-announcement-btn" data-zone="${inc.zone}" data-id="${inc.id}">
              🔊 Voice Broadcast Alert
            </button>
            <button class="ops-btn secondary-ops-btn draft-plan-btn" data-id="${inc.id}">
              ↻ Re-draft
            </button>
          </div>
        </div>`;

    case 'resolved':
      return '<div class="resolved-stamp">✓ Action Plan Deployed & Resolved</div>';

    default:
      return '';
  }
}

/**
 * Bind click event listeners to action buttons within an incident card.
 * @param {HTMLElement} item - Incident card DOM element
 * @param {import('./state').Incident} inc - Incident data object
 */
function bindIncidentButtons(item, inc) {
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

  const broadcastBtn = item.querySelector('.broadcast-announcement-btn');
  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', () => handleBroadcast(broadcastBtn.dataset.zone));
  }
}

/**
 * Render the incidents queue on the staff dashboard.
 * @param {Array<import('./state').Incident>} incidents - Current incident list
 * @param {HTMLElement | null} container - Incidents list container element
 * @returns {void}
 */
export function renderIncidents(incidents, container) {
  if (!container) return;

  const scrollPos = container.scrollTop;
  container.innerHTML = '';

  if (incidents.length === 0) {
    container.innerHTML = `
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

    const statusText = inc.status.toUpperCase().replace('_', ' ');
    const statusBadgeClass = `badge-${inc.status}`;
    const actionAreaHTML = buildIncidentActionHTML(inc);

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

    bindIncidentButtons(item, inc);
    container.appendChild(item);
  });

  container.scrollTop = scrollPos;
}
