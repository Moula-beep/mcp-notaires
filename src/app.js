import express from "express";
import { config } from "./config.js";
import { answerQuestion } from "./services/chatService.js";

const app = express();

app.use(express.json({ limit: "200kb" }));
app.use(express.static("public"));

const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const key = `${ip}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const count = buckets.get(key) || 0;

  if (count >= MAX_REQUESTS) {
    return res.status(429).json({
      error: "Trop de requetes. Merci de reessayer dans une minute."
    });
  }

  buckets.set(key, count + 1);
  return next();
}

const healthPayload = {
  ok: true,
  service: "carte-grise-bot",
  datagouvMode: config.datagouvMode
};

app.get("/health", (_req, res) => {
  res.json(healthPayload);
});

app.get("/api/health", (_req, res) => {
  res.json(healthPayload);
});

app.post("/api/chat", rateLimit, async (req, res) => {
  const startedAt = Date.now();
  const question = typeof req.body?.question === "string" ? req.body.question : "";
  const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "anonymous";

  try {
    const result = await answerQuestion(question);
    const durationMs = Date.now() - startedAt;

    console.log(
      JSON.stringify({
        event: "chat.answer",
        at: new Date().toISOString(),
        sessionId,
        route: result?.meta?.route || "unknown",
        durationMs,
        ok: true
      })
    );

    res.json(result);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(
      JSON.stringify({
        event: "chat.answer",
        at: new Date().toISOString(),
        sessionId,
        durationMs,
        ok: false,
        error: error?.message || "unknown error"
      })
    );

    res.status(500).json({
      type: "error",
      answer: "Desole, une erreur est survenue. Merci de reessayer.",
      sources: [],
      disclaimers: ["Si le probleme persiste, utilisez la procedure officielle sur Service-Public/ANTS."],
      data: {}
    });
  }
});

export default app;
