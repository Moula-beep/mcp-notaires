import {
  buildFallbackFaq,
  buildSensitiveRefusal,
  canHandlePricing,
  computeCarteGriseEstimate,
  isSensitivePersonalRequest
} from "./rulesEngine.js";
import { getDatasetInfo, searchDatasets } from "./datagouvClient.js";
import { runLlmWithContext } from "./llmOrchestrator.js";

const DATASET_HINTS = {
  immatriculation: "immatriculations de vehicules routiers",
  carburant: "immatriculations carburant vehicules",
  parc: "parc de vehicules routiers",
  "carte grise": "cout carte grise cheval fiscal region"
};

const nowIso = () => new Date().toISOString();

const chooseDataQuery = (question) => {
  const lowered = question.toLowerCase();
  for (const [keyword, query] of Object.entries(DATASET_HINTS)) {
    if (lowered.includes(keyword)) {
      return query;
    }
  }
  return "immatriculations vehicules";
};

const shouldUseDatagouv = (question) => {
  const lowered = question.toLowerCase();
  return (
    lowered.includes("stat") ||
    lowered.includes("donnee") ||
    lowered.includes("data") ||
    lowered.includes("immatriculation") ||
    lowered.includes("vehicule") ||
    lowered.includes("tendance")
  );
};

export async function answerQuestion(question) {
  const q = String(question || "").trim();
  if (!q) {
    return {
      type: "validation_error",
      answer: "Merci d'ecrire une question pour que je puisse vous aider.",
      sources: [],
      disclaimers: [],
      data: {},
      meta: { generatedAt: nowIso() }
    };
  }

  if (isSensitivePersonalRequest(q)) {
    return { ...buildSensitiveRefusal(), meta: { generatedAt: nowIso() } };
  }

  if (canHandlePricing(q)) {
    const pricing = computeCarteGriseEstimate(q);
    if (pricing) {
      return { ...pricing, meta: { generatedAt: nowIso(), route: "rules/pricing" } };
    }
  }

  const faq = buildFallbackFaq(q);
  if (faq) {
    return { ...faq, meta: { generatedAt: nowIso(), route: "rules/faq" } };
  }

  if (shouldUseDatagouv(q)) {
    const query = chooseDataQuery(q);
    const datasets = await searchDatasets(query, 1, 3);
    const result = Array.isArray(datasets.result) ? datasets.result : [];
    const top = result[0] || null;
    const details = top?.id ? await getDatasetInfo(top.id) : null;

    const context = { datasets, details };
    const llmText = await runLlmWithContext(q, context);

    const answer =
      llmText ||
      (top
        ? `J'ai trouve un jeu de donnees pertinent: "${top.title}". Voulez-vous que je rentre dans le detail des indicateurs disponibles ?`
        : "Je n'ai pas trouve de jeu de donnees evident sur cette demande. Pouvez-vous preciser votre besoin ?");

    const sources = [];
    if (top?.page) {
      sources.push({ label: `Dataset: ${top.title}`, url: top.page });
    } else {
      sources.push({ label: "Catalogue data.gouv.fr", url: "https://www.data.gouv.fr/" });
    }

    return {
      type: "datagouv_answer",
      answer,
      disclaimers: [
        "Les statistiques presentes proviennent de sources publiques et peuvent comporter un delai de mise a jour.",
        "Pour une decision administrative finale, utilisez les canaux officiels."
      ],
      sources,
      data: {
        query,
        datasetPreview: result
      },
      meta: {
        generatedAt: nowIso(),
        route: "datagouv/search"
      }
    };
  }

  return {
    type: "general",
    answer:
      "Je peux vous aider sur le prix de carte grise, les procedures generales et les donnees publiques d'immatriculation. Donnez-moi la region et la puissance fiscale (ex: PACA 5 CV).",
    disclaimers: ["Je ne fournis pas de donnees nominatives liees aux plaques."],
    sources: [{ label: "Service-Public carte grise", url: "https://www.service-public.fr/particuliers/vosdroits/N367" }],
    data: {},
    meta: { generatedAt: nowIso(), route: "fallback/general" }
  };
}
