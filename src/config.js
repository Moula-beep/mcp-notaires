const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  datagouvMode: process.env.DATAGOUV_MODE || "http",
  mcpProxyUrl: process.env.MCP_PROXY_URL || "",
  mcpProxyToken: process.env.MCP_PROXY_TOKEN || ""
};

export const isProd = config.nodeEnv === "production";
