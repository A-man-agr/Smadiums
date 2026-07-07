/**
 * Shared utility functions for Smadiums.
 * Provides audio feedback and accessibility announcement helpers
 * used across multiple UI modules.
 * @module utils
 */

import { getState } from './state.js';

/**
 * Debounce helper to delay costly layout/re-render operations.
 * Returns a wrapped function that delays invocation until after
 * `wait` milliseconds have elapsed since the last call.
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate audio tone feedback for interactions (accessibility / operational cues).
 * Only plays when the user has enabled sound feedback in settings.
 * @param {number} freq - Tone frequency in Hz
 * @param {number} duration - Tone duration in seconds
 * @returns {void}
 */
export function playTone(freq, duration) {
  const state = getState();
  if (!state.settings.soundFeedback) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_e) {
    console.warn('Audio Context not allowed/supported yet.');
  }
}

/**
 * Announcement function for screen readers (aria-live utility).
 * Creates or updates a visually hidden live region to broadcast messages
 * to assistive technology.
 * @param {string} message - Text to announce
 * @returns {void}
 */
export function announceToScreenReader(message) {
  let announcer = document.getElementById('sr-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'assertive');
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.margin = '-1px';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.border = '0';
    document.body.appendChild(announcer);
  }
  announcer.textContent = message;
}
