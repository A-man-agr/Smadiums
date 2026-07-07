/**
 * CLI Entry point for running unit tests in a Node.js environment.
 * @module run-tests
 */
import { runAndLogTests } from './unit-tests.js';

(async () => {
  try {
    const success = await runAndLogTests();
    if (success) {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    } else {
      console.error('❌ One or more tests failed. Check logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Fatal error executing test suite:', error);
    process.exit(1);
  }
})();
