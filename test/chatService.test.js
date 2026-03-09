import test from "node:test";
import assert from "node:assert/strict";
import { answerQuestion } from "../src/services/chatService.js";

test("chat service refuses personal SIV requests", async () => {
  const result = await answerQuestion("Qui est le proprietaire de la plaque AB-123-CD ?");
  assert.equal(result.type, "refusal");
  assert.match(result.answer, /donnees nominatives/i);
});

test("chat service handles short pricing prompt", async () => {
  const result = await answerQuestion("Aix en Provence 3 CV");
  assert.equal(result.type, "pricing");
  assert.equal(result.data.y1, 180);
});
