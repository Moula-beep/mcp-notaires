# Bot Q/R Carte Grise (MCP Etat)

MVP de chatbot pour un site carte grise, avec:

- reponses metier (prix taxe regionale, FAQ carte grise),
- garde-fous legaux (pas de donnees nominatives SIV),
- integration data.gouv via MCP (`user-datagouv`) ou API HTTP publique,
- widget web embarquable.

## Demarrage rapide

1. Installer les dependances:

```bash
npm install
```

2. Copier `.env.example` vers `.env` et renseigner les variables necessaires.

3. Lancer le serveur:

```bash
npm run dev
```

4. Ouvrir `http://localhost:3000`.

## Variables d'environnement

- `PORT`: port HTTP (defaut `3000`)
- `DATAGOUV_MODE`: `mcp` ou `http`
- `MCP_PROXY_URL`: endpoint de proxy MCP (obligatoire si `DATAGOUV_MODE=mcp`)
- `MCP_PROXY_TOKEN`: token Bearer optionnel pour proteger le proxy MCP
- `OPENAI_API_KEY`: active la reformulation LLM sur contexte verifie
- `OPENAI_MODEL`: modele OpenAI pour la reformulation (optionnel)

## Architecture

- `src/app.js`: app Express partagee (local + Vercel), routes API, rate-limit, logs.
- `src/server.js`: bootstrap local (`app.listen`).
- `api/index.js`: entrypoint Vercel serverless.
- `src/services/chatService.js`: orchestration intent -> regles -> data.gouv -> fallback.
- `src/services/rulesEngine.js`: calcul taxe regionale, refus sensible, FAQ.
- `src/services/datagouvClient.js`: connecteur data.gouv (MCP ou HTTP).
- `src/services/llmOrchestrator.js`: reformulation optionnelle via OpenAI.
- `public/chat-widget.js`: widget JS integable sur site.

## Deploiement Vercel

Le projet est pret pour Vercel avec `api/index.js` et `vercel.json`.

1. Importer le repo dans Vercel.
2. Configurer les variables d'environnement:
   - `DATAGOUV_MODE`
   - `MCP_PROXY_URL` (si mode `mcp`)
   - `MCP_PROXY_TOKEN` (si necessaire)
   - `OPENAI_API_KEY` (optionnel)
   - `OPENAI_MODEL` (optionnel)
3. Deploy.

Notes importantes:
- Le rate-limit en memoire (`Map`) est best-effort en serverless (multi-instance). Pour la prod, preferer Upstash Redis ou equivalent.
- Endpoint sante: `GET /health` (rewrité vers la fonction Vercel).

## Perimetre fonctionnel MVP

- **Supporte**
  - estimation Y1 (taxe regionale) avec region + CV
  - questions generales carte grise
  - questions statistiques/data publiques (immatriculations)
- **Exclut**
  - identification d'un titulaire a partir d'une plaque
  - extraction de donnees personnelles SIV

## API

### `POST /api/chat`

Request:

```json
{
  "sessionId": "abc123",
  "question": "PACA 3 CV, combien coute la carte grise ?"
}
```

Response (exemple):

```json
{
  "type": "pricing",
  "answer": "Taxe regionale estimee (Y1): 3 x 60 EUR = 180 EUR.",
  "sources": [
    { "label": "Prix du cheval fiscal", "url": "https://www.service-public.gouv.fr/simulateur/calcul/PrixCV" }
  ],
  "disclaimers": [
    "Estimation indicative..."
  ],
  "data": {}
}
```

## Test

```bash
npm test
```
