const REGION_RATES = {
  "auvergne-rhone-alpes": 43,
  "bourgogne-franche-comte": 60,
  "bretagne": 60,
  "centre-val-de-loire": 60,
  "corse": 53,
  "grand-est": 60,
  "guadeloupe": 41,
  "guyane": 42.5,
  "hauts-de-france": 43,
  "ile-de-france": 68.95,
  "martinique": 53,
  "mayotte": 30,
  "normandie": 60,
  "nouvelle-aquitaine": 58,
  "occitanie": 59.5,
  "pays-de-la-loire": 51,
  "provence-alpes-cote-d-azur": 60,
  "reunion": 60
};

const REGION_ALIASES = {
  paca: "provence-alpes-cote-d-azur",
  "provence alpes cote d azur": "provence-alpes-cote-d-azur",
  "provence alpes cote d'azur": "provence-alpes-cote-d-azur",
  "aix en provence": "provence-alpes-cote-d-azur",
  "ile de france": "ile-de-france",
  idf: "ile-de-france",
  "hauts de france": "hauts-de-france",
  "centre val de loire": "centre-val-de-loire",
  "grand est": "grand-est",
  "pays de la loire": "pays-de-la-loire",
  "auvergne rhone alpes": "auvergne-rhone-alpes",
  "bourgogne franche comte": "bourgogne-franche-comte",
  "nouvelle aquitaine": "nouvelle-aquitaine"
};

const RATE_SOURCE = "https://www.service-public.gouv.fr/simulateur/calcul/PrixCV";
const TOTAL_SOURCE = "https://www.service-public.gouv.fr/simulateur/calcul/cout-certificat-immatriculation";

const normalizeText = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchRegion = (question) => {
  const normalized = normalizeText(question);

  for (const [alias, canonical] of Object.entries(REGION_ALIASES)) {
    if (normalized.includes(alias)) {
      return canonical;
    }
  }

  return Object.keys(REGION_RATES).find((region) => normalized.includes(region)) || null;
};

const extractCv = (question) => {
  const match = question.match(/(\d{1,2})\s*cv\b/i);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1], 10);
};

export const canHandlePricing = (question) => {
  const text = normalizeText(question);
  const hasExplicitPricingTerms =
    text.includes("carte grise") || text.includes("taxe regionale") || text.includes("prix cv");
  const hasCv = /\b\d{1,2}\s*cv\b/.test(text);
  const hasKnownRegion =
    Object.keys(REGION_RATES).some((region) => text.includes(region)) ||
    Object.keys(REGION_ALIASES).some((alias) => text.includes(alias));
  return hasExplicitPricingTerms || (hasCv && hasKnownRegion);
};

export const computeCarteGriseEstimate = (question) => {
  const regionKey = matchRegion(question);
  const cv = extractCv(question);

  if (!regionKey || !cv) {
    return null;
  }

  const rate = REGION_RATES[regionKey];
  if (!rate) {
    return null;
  }

  const y1 = Number((rate * cv).toFixed(2));
  const managementFee = 11;
  const deliveryFee = 2.76;
  const estimatedTotal = Number((y1 + managementFee + deliveryFee).toFixed(2));

  return {
    type: "pricing",
    answer:
      `Taxe regionale estimee (Y1): ${cv} x ${rate} EUR = ${y1} EUR.\n` +
      `Total indicatif avec frais fixes courants: ${estimatedTotal} EUR ` +
      `(gestion ${managementFee} EUR + acheminement ${deliveryFee} EUR).`,
    disclaimers: [
      "Estimation indicative: le montant final depend du type de vehicule, de son anciennete et des exonerations locales.",
      "Le bot ne remplace pas le calcul officiel ANTS / Service-Public."
    ],
    sources: [
      { label: "Prix du cheval fiscal", url: RATE_SOURCE },
      { label: "Simulateur cout carte grise", url: TOTAL_SOURCE }
    ],
    data: {
      region: regionKey,
      cv,
      rate,
      y1,
      estimatedTotal
    }
  };
};

export const isSensitivePersonalRequest = (question) => {
  const text = normalizeText(question);
  const patterns = [
    "proprietaire",
    "titulaire",
    "adresse du proprietaire",
    "qui est le proprietaire",
    "plaque et nom",
    "retrouver une personne",
    "infos personnelles"
  ];
  return patterns.some((pattern) => text.includes(pattern));
};

export const buildSensitiveRefusal = () => ({
  type: "refusal",
  answer:
    "Je ne peux pas aider a identifier une personne a partir d'une plaque ou fournir des donnees nominatives SIV.",
  disclaimers: [
    "Les donnees personnelles d'immatriculation ne sont pas des donnees publiques ouvertes.",
    "Pour les demarches officielles, passez par les canaux ANTS / Service-Public."
  ],
  sources: [{ label: "Reutilisation des donnees SIV", url: "https://mobile.interieur.gouv.fr/Repertoire-des-informations-publiques/La-reutilisation-des-donnees-du-systeme-d-immatriculation-des-vehicules" }],
  data: {}
});

export const buildFallbackFaq = (question) => {
  const text = normalizeText(question);

  if (text.includes("quels documents") || text.includes("documents")) {
    return {
      type: "faq",
      answer:
        "Pour une carte grise, les documents varient selon le cas (achat neuf/occasion, changement d'adresse). Verifiez la liste officielle selon votre demarche.",
      disclaimers: ["Information generale: verifier la liste exacte sur le service officiel."],
      sources: [{ label: "Service-Public carte grise", url: "https://www.service-public.fr/particuliers/vosdroits/N367" }],
      data: {}
    };
  }

  return null;
};
