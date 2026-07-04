import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_DIR = path.resolve(__dirname, "../../data/clients");
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || "nyt-general";

const cache = new Map();

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item !== null && item !== undefined);
}

function normalizeFaqItem(item = {}) {
  return {
    question: item.question || item.pregunta || "",
    answer: item.answer || item.respuesta || "",
  };
}

function normalizeClientConfig(raw = {}) {
  const features = {
    voice: true,
    leadCapture: true,
    multiAgentVoices: false,
    ...(raw.features || {}),
  };

  const theme = {
    primaryColor: "#111827",
    accentColor: "#dc2626",
    backgroundColor: "#f8fafc",
    ...(raw.theme || {}),
  };

  return {
    clientId: raw.clientId || DEFAULT_CLIENT_ID,
    businessName: raw.businessName || "Cliente Demo NYT",
    industry: raw.industry || "Negocio",
    assistantName: raw.assistantName || "NYT Assistant",
    tone: raw.tone || "profesional, claro, amable y comercial",
    publicWelcomeMessage: raw.publicWelcomeMessage || "",
    services: normalizeArray(raw.services).map((item) => String(item).trim()).filter(Boolean),
    businessHours: raw.businessHours || "",
    location: raw.location || "",
    appointmentTypes: normalizeArray(raw.appointmentTypes).map((item) => String(item).trim()).filter(Boolean),
    faq: normalizeArray(raw.faq)
      .map(normalizeFaqItem)
      .filter((item) => item.question && item.answer),
    rules: normalizeArray(raw.rules).map((item) => String(item).trim()).filter(Boolean),
    leadFields: normalizeArray(raw.leadFields).map((item) => String(item).trim()).filter(Boolean),
    handoff: {
      whatsapp: "",
      email: "",
      instructions: "Canalizar al equipo humano.",
      ...(raw.handoff || {}),
    },
    theme,
    features,
  };
}

function sanitizeClientId(clientId) {
  return String(clientId || DEFAULT_CLIENT_ID)
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || DEFAULT_CLIENT_ID;
}

async function readClientFile(clientId) {
  const safeClientId = sanitizeClientId(clientId);
  const filePath = path.join(CLIENTS_DIR, `${safeClientId}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return normalizeClientConfig(JSON.parse(raw));
}

export async function getClientConfig(clientId = DEFAULT_CLIENT_ID) {
  const normalizedId = sanitizeClientId(clientId || DEFAULT_CLIENT_ID);

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
    publicWelcomeMessage:
      normalized.publicWelcomeMessage ||
      `Soy ${normalized.assistantName}, configurado para atender a ${normalized.businessName}. Puedo ayudarte con información, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.`,
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

export { DEFAULT_CLIENT_ID, normalizeClientConfig, sanitizeClientId };
