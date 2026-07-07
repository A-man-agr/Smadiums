/**
 * Simulator Module for Smadiums.
 * Runs a background telemetry loop that fluctuates queue lengths, energy usage,
 * and crowd densities to model realistic match-day dynamics.
 * @module simulator
 */

import { triggerTelemetrySimulation, addIncident } from './state.js';

/** Simulation interval in milliseconds */
const SIMULATION_INTERVAL_MS = 10000;

/** Stadium capacity ceiling for occupancy fluctuations */
const MAX_OCCUPANCY = 82500;
const MIN_OCCUPANCY = 75000;

/** Sustainability metric bounds */
const ENERGY_MAX = 100;
const ENERGY_MIN = 50;
const RECYCLING_MAX = 98;
const RECYCLING_MIN = 80;
const RECYCLING_CHANGE_PROBABILITY = 0.8;

/** Zone telemetry bounds */
const MAX_WAIT_TIME = 60;
const MIN_WAIT_TIME = 2;
const MAX_CROWD_DENSITY = 100;
const MIN_CROWD_DENSITY = 10;
const MAX_QUEUE_LENGTH = 100;
const MIN_QUEUE_LENGTH = 1;

/** Zone status thresholds */
const WAIT_TIME_CRITICAL_THRESHOLD = 40;
const WAIT_TIME_WARNING_THRESHOLD = 20;
const CROWD_CRITICAL_THRESHOLD = 85;
const CROWD_WARNING_THRESHOLD = 65;

/** Predictive incident auto-trigger threshold */
const PREDICTIVE_ALERT_DENSITY_THRESHOLD = 88;

/**
 * Start the live stadium telemetry simulation.
 * Fluctuates queue lengths, wait times, and spectator counts at regular intervals.
 * Automatically spawns predictive crowd compression incidents when density exceeds thresholds.
 * @returns {void}
 */
export function startSimulator() {
  setInterval(() => {
    triggerTelemetrySimulation((state) => {
      // Fluctuate general occupancy and sustainability metrics
      const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
      state.telemetry.stadiumOccupancy = Math.min(MAX_OCCUPANCY, Math.max(MIN_OCCUPANCY, state.telemetry.stadiumOccupancy + fluctuation * 15));
      state.telemetry.greenEnergyUsage = Math.min(ENERGY_MAX, Math.max(ENERGY_MIN, state.telemetry.greenEnergyUsage + (Math.random() > 0.5 ? 1 : -1)));
      state.telemetry.waterSavedLitres += Math.floor(Math.random() * 10) + 5;

      // Occasionally adjust recycling rate
      if (Math.random() > RECYCLING_CHANGE_PROBABILITY) {
        state.telemetry.wasteRecyclingRate = Math.min(RECYCLING_MAX, Math.max(RECYCLING_MIN, state.telemetry.wasteRecyclingRate + (Math.random() > 0.5 ? 1 : -1)));
      }

      // Modify zone telemetry for zones without active incidents
      for (const key in state.zones) {
        const zone = state.zones[key];
        const hasActiveIncident = state.incidents.some(inc => inc.zone === key && inc.status !== 'resolved');

        if (hasActiveIncident) continue;

        if (zone.waitTime !== undefined) {
          const wFluct = Math.floor(Math.random() * 3) - 1;
          zone.waitTime = Math.min(MAX_WAIT_TIME, Math.max(MIN_WAIT_TIME, zone.waitTime + wFluct));
          zone.status = zone.waitTime > WAIT_TIME_CRITICAL_THRESHOLD ? 'critical'
            : zone.waitTime > WAIT_TIME_WARNING_THRESHOLD ? 'warning'
            : 'optimal';
        }

        if (zone.crowdDensity !== undefined) {
          const cFluct = Math.floor(Math.random() * 5) - 2;
          zone.crowdDensity = Math.min(MAX_CROWD_DENSITY, Math.max(MIN_CROWD_DENSITY, zone.crowdDensity + cFluct));
          if (zone.waitTime === undefined) {
            zone.status = zone.crowdDensity > CROWD_CRITICAL_THRESHOLD ? 'critical'
              : zone.crowdDensity > CROWD_WARNING_THRESHOLD ? 'warning'
              : 'optimal';
          }
        }

        if (zone.queueLength !== undefined) {
          const qFluct = Math.floor(Math.random() * 3) - 1;
          zone.queueLength = Math.min(MAX_QUEUE_LENGTH, Math.max(MIN_QUEUE_LENGTH, zone.queueLength + qFluct));
        }

        // Predictive crowd safety: auto-spawn incident if density spikes
        if (zone.crowdDensity !== undefined && zone.crowdDensity > PREDICTIVE_ALERT_DENSITY_THRESHOLD) {
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
    });
  }, SIMULATION_INTERVAL_MS);
}
