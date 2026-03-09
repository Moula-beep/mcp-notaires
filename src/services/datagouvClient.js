import { config } from "../config.js";

const DATAGOUV_API = "https://www.data.gouv.fr/api/1";

const toResultText = (value) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

async function callMcpTool(toolName, args) {
  if (!config.mcpProxyUrl) {
    throw new Error("MCP_PROXY_URL is required when DATAGOUV_MODE=mcp.");
  }

  const response = await fetch(config.mcpProxyUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.mcpProxyToken ? { authorization: `Bearer ${config.mcpProxyToken}` } : {})
    },
    body: JSON.stringify({
      server: "user-datagouv",
      toolName,
      arguments: args
    })
  });

  if (!response.ok) {
    throw new Error(`MCP proxy call failed (${response.status}) for tool ${toolName}.`);
  }

  return response.json();
}

async function searchDatasetsHttp(query, page = 1, pageSize = 5) {
  const url = new URL(`${DATAGOUV_API}/datasets/`);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`data.gouv datasets search failed (${res.status}).`);
  }

  const payload = await res.json();
  const hits = Array.isArray(payload?.data) ? payload.data : [];

  const compact = hits.slice(0, pageSize).map((dataset) => ({
    id: dataset.id,
    title: dataset.title,
    page: dataset.page,
    organization: dataset.organization?.name || null,
    last_update: dataset.last_update || dataset.last_modified || null
  }));

  return {
    source: "http",
    tool: "search_datasets",
    result: compact
  };
}

export async function searchDatasets(query, page = 1, pageSize = 5) {
  if (config.datagouvMode === "mcp") {
    const response = await callMcpTool("search_datasets", { query, page, page_size: pageSize });
    return {
      source: "mcp",
      tool: "search_datasets",
      result: toResultText(response?.result ?? response)
    };
  }

  return searchDatasetsHttp(query, page, pageSize);
}

export async function getDatasetInfo(datasetId) {
  if (config.datagouvMode === "mcp") {
    const response = await callMcpTool("get_dataset_info", { dataset_id: datasetId });
    return {
      source: "mcp",
      tool: "get_dataset_info",
      result: toResultText(response?.result ?? response)
    };
  }

  const res = await fetch(`${DATAGOUV_API}/datasets/${datasetId}/`);
  if (!res.ok) {
    throw new Error(`data.gouv dataset info failed (${res.status}).`);
  }

  const payload = await res.json();
  return {
    source: "http",
    tool: "get_dataset_info",
    result: {
      id: payload.id,
      title: payload.title,
      description: payload.description,
      page: payload.page,
      tags: payload.tags || [],
      organization: payload.organization?.name || null
    }
  };
}
