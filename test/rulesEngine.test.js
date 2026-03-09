import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSensitiveRefusal,
  canHandlePricing,
  computeCarteGriseEstimate,
  isSensitivePersonalRequest
} from "../src/services/rulesEngine.js";

test("detects pricing intent", () => {
  assert.equal(canHandlePricing("prix carte grise en paca"), true);
  assert.equal(canHandlePricing("Aix en Provence 3 CV"), true);
  assert.equal(canHandlePricing("bonjour"), false);
});

test("computes estimate for known region and cv", () => {
  const result = computeCarteGriseEstimate("Aix en Provence 3 CV");
  assert.ok(result);
  assert.equal(result.data.y1, 180);
  assert.equal(result.data.estimatedTotal, 193.76);
});

test("rejects sensitive personal request", () => {
  assert.equal(isSensitivePersonalRequest("Qui est le proprietaire de cette plaque ?"), true);
  const refusal = buildSensitiveRefusal();
  assert.equal(refusal.type, "refusal");
  assert.match(refusal.answer, /donnees nominatives/i);
});
