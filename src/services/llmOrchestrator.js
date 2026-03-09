import { config } from "../config.js";

const SYSTEM_PROMPT = `
You are a French assistant for a carte grise website.
Rules:
- Never provide personal SIV data.
- Be concise and practical.
- If information is uncertain, say it and refer to official source links.
- Respond in French.
`.trim();

export async function runLlmWithContext(question, context) {
  if (!config.openAiApiKey) {
    return null;
  }

  const input = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    },
    {
      role: "user",
      content:
        `Question utilisateur:\n${question}\n\n` +
        `Contexte verifie:\n${JSON.stringify(context, null, 2)}\n\n` +
        "Produis une reponse utile et courte, puis rappelle les limites legales si necessaire."
    }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.openAiApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: config.openAiModel,
      input
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed (${response.status}).`);
  }

  const payload = await response.json();
  return payload?.output_text?.trim() || null;
}
