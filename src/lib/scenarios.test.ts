import assert from "node:assert/strict";
import { normalizeScenario } from "./scenarios";

const normalized = normalizeScenario({
  id: 1,
  title: "Anniversary",
  description: "Forgot the day",
  emotionLevel: 5,
  stageConfig: {
    1: { name: "angry", hint: "apologize", description: "upset" },
    2: { name: "softening", hint: "listen", description: "less upset" },
  },
  category: "girlfriend",
});

assert.equal(normalized.emotion_level, 5);
assert.equal(normalized.emotionLevel, 5);
assert.equal(normalized.stage_config[0]?.name, "angry");
assert.equal(normalized.stage_config[1]?.hint, "listen");
assert.deepEqual(normalized.stageConfig, normalized.stage_config);
