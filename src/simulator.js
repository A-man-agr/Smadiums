/**
 * Simulator Module for Smadiums.
 * Simulates slight fluctuation of queues, energy usage, and fan movements in the background.
 */

import { triggerTelemetrySimulation, addIncident } from './state.js';

/**
 * Start the Live Stadium Telemetry Simulation.
 * Fluctuate queue lengths, wait times, and spectator counts every 10 seconds.
 * @returns {void}
 */
export function startSimulator() {
  setInterval(() => {
    triggerTelemetrySimulation((state) => {
      // Modify general occupancy and sustainability variables slightly
      const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
      state.telemetry.stadiumOccupancy = Math.min(82500, Math.max(75000, state.telemetry.stadiumOccupancy + fluctuation * 15));
      state.telemetry.greenEnergyUsage = Math.min(100, Math.max(50, state.telemetry.greenEnergyUsage + (Math.random() > 0.5 ? 1 : -1)));
      state.telemetry.waterSavedLitres += Math.floor(Math.random() * 10) + 5;
      
      // Divert recycling rates
      if (Math.random() > 0.8) {
        state.telemetry.wasteRecyclingRate = Math.min(98, Math.max(80, state.telemetry.wasteRecyclingRate + (Math.random() > 0.5 ? 1 : -1)));
      }

      // Modify zone telemetry slightly if they are not in an active incident
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
    });
  }, 10000); // Trigger telemetry fluctuation every 10 seconds
}
