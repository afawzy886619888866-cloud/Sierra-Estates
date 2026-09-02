

export class HarnessEvaluator {
  /**
   * Score an agent's completion output against expected keys, schema requirements, and latency thresholds.
   */
   evaluateOutput(
    scenario,
    output,
    latencyMs,
    tokenCount
  ) {
    const errors = [];

    if (!output || typeof output !== 'object') {
      errors.push('Output is not a valid JSON object');
      return {
        scenarioId: scenario.id,
        success: false,
        accuracyScore: 0,
        latencyMs,
        tokenCount,
        output,
        validationErrors: errors,
        timestamp: new Date().toISOString(),
      };
    }

    // Check required fields
    let foundKeysCount = 0;
    for (const key of scenario.expectedOutputKeys) {
      if (key in output && output[key] !== undefined && output[key] !== null) {
        foundKeysCount++;
      } else {
        errors.push(`Missing expected output field: ${key}`);
      }
    }

    const keyCoverage = scenario.expectedOutputKeys.length > 0
      ? foundKeysCount / scenario.expectedOutputKeys.length
      : 1.0;

    // Latency penalty if exceeded
    const latencyPenalty = latencyMs > scenario.maxLatencyMs
      ? Math.max(0, 0.2 * ((latencyMs - scenario.maxLatencyMs) / scenario.maxLatencyMs))
      : 0;

    const accuracyScore = Math.max(0, Math.min(1, keyCoverage - latencyPenalty));
    const success = accuracyScore >= scenario.minAccuracyScore && errors.length === 0;

    return {
      scenarioId: scenario.id,
      success,
      accuracyScore: Math.round(accuracyScore * 100) / 100,
      latencyMs,
      tokenCount,
      output,
      validationErrors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
