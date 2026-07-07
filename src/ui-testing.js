/**
 * UI Developer Test Console Component for Smadiums.
 * Controls test execution triggers and diagnostic result listings.
 * @module ui-testing
 */

import { runAllTests } from '../tests/unit-tests.js';
import { escapeHTML } from './sanitizer.js';
import { playTone } from './utils.js';

/**
 * Run all test assertions and display results dynamically in the developer panel.
 * @param {HTMLElement | null} resultsContainer - Target list element for results
 * @param {HTMLButtonElement | null} runBtn - Test trigger button element
 * @returns {void}
 */
export function handleRunTests(resultsContainer, runBtn) {
  if (!resultsContainer || !runBtn) return;

  playTone(880, 0.1);
  resultsContainer.innerHTML = '<li class="loading">Executing test assertions...</li>';

  setTimeout(async () => {
    const results = await runAllTests();
    resultsContainer.innerHTML = '';

    let passedCount = 0;
    results.forEach(res => {
      const li = document.createElement('li');
      li.className = `test-item ${res.status}`;

      const badge = res.status === 'passed' ? 'PASS' : 'FAIL';
      const statusIcon = res.status === 'passed' ? '✅' : '❌';

      li.innerHTML = `
        <span class="test-status-badge">${statusIcon} ${badge}</span>
        <span class="test-name">${escapeHTML(res.name)}</span>
        ${res.error ? `<div class="test-error">${escapeHTML(res.error)}</div>` : ''}
      `;
      resultsContainer.appendChild(li);
      if (res.status === 'passed') passedCount++;
    });

    runBtn.textContent = `Run Tests (${passedCount}/${results.length} Passed)`;
  }, 300);
}
