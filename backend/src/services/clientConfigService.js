import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_DIR = path.resolve(__dirname, "../../data/clients");
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || "nyt-general";

const cache = new Map();

function normalizeClientConfig(raw = {}) {
  return {
    clientId: raw.clientId || DEFAULT_CLIENT_ID,
    businessName: raw.businessName || "Cliente Demo NYT",
    industry: raw.industry || "Negocio",
    assistantName: raw.assistantName || "NYT Assistant",
    tone: raw.tone || "profesional, claro y amable",
    services: Array.isArray(raw.services) ? raw.services : [],
    businessHours: raw.businessHours || "",
    location: raw.location || "",
    appointmentTypes: Array.isArray(raw.appointmentTypes)
      ? raw.appointmentTypes
      : [],
    faq: Array.isArray(raw.faq) ? raw.faq : [],
    rules: Array.isArray(raw.rules) ? raw.rules : [],
    leadFields: Array.isArray(raw.leadFields) ? raw.leadFields : [],
    handoff: raw.handoff || {
      whatsapp: "",
      email: "",
      instructions: "Canalizar al equipo humano.",
    },
    theme: raw.theme || {
      primaryColor: "#111827",
      accentColor: "#dc2626",
    },
    features: raw.features || {
      voice: true,
      leadCapture: true,
      multiAgentVoices: false,
    },
  };
}

async function readClientFile(clientId) {
  const safeClientId = String(clientId || DEFAULT_CLIENT_ID).replace(
    /[^a-z0-9-]/gi,
    "",
  );
  const filePath = path.join(CLIENTS_DIR, `${safeClientId}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return normalizeClientConfig(JSON.parse(raw));
}

export async function getClientConfig(clientId = DEFAULT_CLIENT_ID) {
  const normalizedId = clientId || DEFAULT_CLIENT_ID;

  if (cache.has(normalizedId)) {
    return cache.get(normalizedId);
  }

  try {
    const config = await readClientFile(normalizedId);
    cache.set(normalizedId, config);
    return config;
  } catch (error) {
    if (normalizedId !== DEFAULT_CLIENT_ID) {
      console.warn(
        `Cliente ${normalizedId} no encontrado. Usando ${DEFAULT_CLIENT_ID}.`,
      );
      return getClientConfig(DEFAULT_CLIENT_ID);
    }

    throw error;
  }
}

export function getPublicClientConfigFromFull(config) {
  const normalized = normalizeClientConfig(config);

  return {
    clientId: normalized.clientId,
    businessName: normalized.businessName,
    industry: normalized.industry,
    assistantName: normalized.assistantName,
    publicWelcomeMessage: `Soy ${normalized.assistantName}, configurado para atender a ${normalized.businessName}. Puedo ayudarte con informacion, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.`,
    theme: normalized.theme,
    enabledFeatures: normalized.features,
  };
}

export async function getPublicClientConfig(clientId = DEFAULT_CLIENT_ID) {
  const config = await getClientConfig(clientId);
  return getPublicClientConfigFromFull(config);
}

export async function listAvailableClients() {
  const files = await fs.readdir(CLIENTS_DIR);
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/i, ""));
}

export { DEFAULT_CLIENT_ID, normalizeClientConfig };
