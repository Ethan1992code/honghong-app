interface ScenarioLike {
  emotionLevel?: number | null;
  emotion_level?: number | null;
  stageConfig?: unknown;
  stage_config?: unknown;
  [key: string]: unknown;
}

function normalizeStageConfig(stageConfig: unknown): unknown[] {
  if (Array.isArray(stageConfig)) {
    return stageConfig;
  }

  if (stageConfig && typeof stageConfig === "object") {
    return Object.entries(stageConfig as Record<string, unknown>)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value);
  }

  return [];
}

export function normalizeScenario<T extends ScenarioLike>(scenario: T) {
  const emotionLevel = scenario.emotionLevel ?? scenario.emotion_level ?? 3;
  const stageConfig = normalizeStageConfig(
    scenario.stageConfig ?? scenario.stage_config
  );

  return {
    ...scenario,
    emotionLevel,
    emotion_level: emotionLevel,
    stageConfig,
    stage_config: stageConfig,
  };
}

export function findScenarioById<T extends { id: number | string }>(
  scenarios: T[],
  scenarioId: number | string
): T | undefined {
  const normalizedScenarioId = Number(scenarioId);

  return scenarios.find((scenario) => Number(scenario.id) === normalizedScenarioId);
}
