import { runUnitTests } from './aiService.unit.test';
import { runIntegrationTests } from './aiService.integration.test';

// ─────────────────────────────────────────────────────────────
// AI Service — Master Test Runner
//
// Runs unit tests (offline), then integration tests (network).
// Prints a combined summary with totals.
//
// Usage:
//   import { runAllAITests } from './tests/aiService.testRunner';
//   runAllAITests();
// ─────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const runAllAITests = async () => {
  const overallStart = Date.now();

  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║                                                   ║');
  console.log('║   🚀  UNISPEND AI SERVICE — FULL TEST SUITE       ║');
  console.log('║                                                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  // ── Phase 1: Unit Tests ───────────────────────────────────
  let unitResults = { passed: 0, failed: 0, total: 0 };
  try {
    unitResults = runUnitTests() || unitResults;
  } catch (err) {
    console.error(`\n  💥 Unit test phase crashed: ${err.message}`);
  }

  await delay(1000);

  // ── Phase 2: Integration Tests ────────────────────────────
  let integrationResults = { passed: 0, failed: 0, skipped: 0, total: 0 };
  try {
    integrationResults = (await runIntegrationTests()) || integrationResults;
  } catch (err) {
    console.error(`\n  💥 Integration test phase crashed: ${err.message}`);
  }

  // ── Combined Summary ──────────────────────────────────────
  const totalTests = unitResults.total + integrationResults.total;
  const totalPassed = unitResults.passed + integrationResults.passed;
  const totalFailed = unitResults.failed + integrationResults.failed;
  const totalSkipped = integrationResults.skipped || 0;
  const elapsed = ((Date.now() - overallStart) / 1000).toFixed(1);

  const status = totalFailed === 0 ? '✅ ALL PASSED' : `❌ ${totalFailed} FAILED`;

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('        AI SERVICE TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`  Total Tests :  ${totalTests}`);
  console.log(`  Passed      :  ${totalPassed}`);
  console.log(`  Failed      :  ${totalFailed}`);
  console.log(`  Skipped     :  ${totalSkipped}`);
  console.log('');
  console.log('  ───────────────────────────────────────────────');
  console.log(`  Unit Tests       :  ${unitResults.passed}/${unitResults.total} passed`);
  console.log(`  Integration Tests:  ${integrationResults.passed}/${integrationResults.total} passed`);
  console.log('  ───────────────────────────────────────────────');
  console.log('');
  console.log(`  Status    :  ${status}`);
  console.log(`  Duration  :  ${elapsed}s`);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    skipped: totalSkipped,
    duration: elapsed,
    unit: unitResults,
    integration: integrationResults,
  };
};

export default runAllAITests;
