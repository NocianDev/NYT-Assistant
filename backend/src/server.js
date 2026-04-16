import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import multer from "multer";
import FormData from "form-data";

import Lead from "./models/Lead.js";
import Tenant from "./models/Tenant.js";

dotenv.config();

console.log("MONGODB_URI existe:", !!process.env.MONGODB_URI);
console.log("OPENROUTER_API_KEY existe:", !!process.env.OPENROUTER_API_KEY);
console.log("OPENAI_API_KEY existe:", !!process.env.OPENAI_API_KEY);
console.log("ELEVENLABS_API_KEY existe:", !!process.env.ELEVENLABS_API_KEY);

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("Mongo conectado"))
  .catch((err) => console.error("Error conectando Mongo:", err));

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.toLowerCase();

      const isAllowed = allowedOrigins.some(
        (allowed) => allowed && normalizedOrigin === allowed.toLowerCase()
      );

      if (isAllowed) {
        return callback(null, true);
      }

      console.error("❌ CORS bloqueado:", origin);
      return callback(new Error(`CORS bloqueado para: ${origin}`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-admin-password",
      "x-tenant-id",
      "x-client-type",
    ],
    credentials: false,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("NYT Assistant Backend OK");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * =========================================
 * UTILIDADES
 * =========================================
 */

function normalizeText(text = "") {
  return text.trim().toLowerCase();
}

function countWords(text = "") {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSpokenVersion(fullReply = "") {
  const clean = fullReply.replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const words = clean.split(" ");

  if (words.length <= 18) {
    return clean;
  }

  const shortPreview = words.slice(0, 12).join(" ");
  return `${shortPreview}. Te dejé el resto en pantalla para que lo leas con calma.`;
}

function normalizeTranscriptText(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[.,;:¡!¿?\-_\s]+/, "")
    .trim();
}

function transcriptLooksUseful(text = "") {
  const normalized = normalizeTranscriptText(text).toLowerCase();
  if (!normalized) return false;

  const junk = [
    "eh",
    "em",
    "mmm",
    "mm",
    "ajá",
    "aja",
    "sí",
    "si",
    "ok",
    "okay",
    "hola",
  ];

  if (normalized.length < 2) return false;
  if (normalized.length <= 3 && junk.includes(normalized)) return false;

  return true;
}

function extractPhone(text) {
  const match = text.match(/(?:\+?\d[\d\s\-()]{7,}\d)/);
  if (!match) return null;

  const phone = match[0].replace(/[^\d+]/g, "");
  return phone.length >= 8 ? phone : null;
}

function extractName(text) {
  const patterns = [
    /me llamo\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/i,
    /soy\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/i,
    /mi nombre es\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/i,
    /nombre[:\s]+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,3})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1]
        .trim()
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return null;
}

function detectInterest(text) {
  const lower = text.toLowerCase();

  return [
    "cotización",
    "cotizacion",
    "precio",
    "costo",
    "coste",
    "me interesa",
    "información",
    "informacion",
    "quiero contratar",
    "contratar",
    "servicio",
    "chatbot",
    "automatización",
    "automatizacion",
    "asistente",
    "ia",
    "demo",
    "agendar",
    "llamada",
    "paquete",
    "plan",
    "planes",
    "comprar",
  ].some((term) => lower.includes(term));
}

function wantsDemo(text) {
  const lower = text.toLowerCase();
  return [
    "demo",
    "agendar",
    "agenda",
    "llamada",
    "reunión",
    "reunion",
    "quiero hablar",
    "quiero una llamada",
    "quiero agendar",
    "quiero una demo",
  ].some((term) => lower.includes(term));
}

function getOriginForProvider(req) {
  return req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";
}

function detectClientType(req) {
  const explicit =
    req.body?.clientType ||
    req.headers["x-client-type"] ||
    req.query?.clientType;

  if (explicit === "mobile" || explicit === "desktop") {
    return explicit;
  }

  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

  return isMobile ? "mobile" : "desktop";
}

function shouldSpeakReply(reply = "", channel = "chat", transitionText = "") {
  if (channel !== "voice") return false;

  const text = normalizeText(reply);
  const words = countWords(reply);

  if (transitionText) return true;

  const hardNoPhrases = [
    "te dejo la información",
    "te comparto la información",
    "aquí tienes la información",
    "lee la información",
    "revísala abajo",
    "revisa el detalle",
  ];

  if (hardNoPhrases.some((p) => text.includes(p))) return false;

  const hasPriorityIntent = [
    "hola",
    "claro",
    "perfecto",
    "con gusto",
    "te explico",
    "te ayudo",
    "podemos agendar",
    "te paso",
    "demo",
    "cotización",
    "cotizacion",
    "precio",
    "whatsapp",
  ].some((p) => text.includes(p));

  if (words <= 18) return true;
  if (words <= 28 && hasPriorityIntent) return true;

  return false;
}

function buildSpeechPayload({ reply, transitionText = "" }) {
  if (transitionText) {
    return `${transitionText} ${buildSpokenVersion(reply)}`.trim();
  }

  return buildSpokenVersion(reply);
}

function extractOpenAIOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];
  const texts = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
  }

  return texts.join("\n").trim();
}

/**
 * =========================================
 * MEMORIA CONVERSACIONAL
 * =========================================
 */

const conversationMemory = new Map();
const MAX_HISTORY_MESSAGES = 12;

function getConversationHistory(conversationId) {
  return conversationMemory.get(conversationId) || [];
}

function appendConversationMessage(conversationId, role, content) {
  const current = conversationMemory.get(conversationId) || [];
  const next = [...current, { role, content }].slice(-MAX_HISTORY_MESSAGES);
  conversationMemory.set(conversationId, next);
}

function clearConversationHistory(conversationId) {
  conversationMemory.delete(conversationId);
}

function getStoredAssistant(conversationId) {
  const history = getConversationHistory(conversationId);
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.role === "system_assistant_meta") {
      return history[i].content || "isis";
    }
  }
  return "isis";
}

function setStoredAssistant(conversationId, assistantId) {
  const current = conversationMemory.get(conversationId) || [];
  const filtered = current.filter((m) => m.role !== "system_assistant_meta");
  const next = [
    ...filtered,
    { role: "system_assistant_meta", content: assistantId },
  ].slice(-MAX_HISTORY_MESSAGES);

  conversationMemory.set(conversationId, next);
}

/**
 * =========================================
 * TENANT
 * =========================================
 */

async function requireTenant(req, res, next) {
  try {
    const tenantId =
      req.headers["x-tenant-id"] ||
      req.body?.tenantId ||
      req.query?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "Falta tenantId" });
    }

    const tenant = await Tenant.findOne({ apiKey: tenantId });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant no encontrado" });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Error en requireTenant:", error.message);
    return res.status(500).json({ error: "Error validando tenant" });
  }
}

/**
 * =========================================
 * ASISTENTES NYT
 * =========================================
 */

const ASSISTANT_CONFIG = {
  isis: {
    id: "isis",
    name: "Isis",
    color: "#facc15",
    voiceId: process.env.ELEVENLABS_VOICE_ISIS,
    handoff: "Te paso con Isis para continuar.",
    intro: "Hola, soy Isis. Te ayudo con la recepción inicial.",
    prompt: `
Eres Isis de NYT Assistant.
Tu función es recepción inicial.
Hablas con elegancia, claridad y seguridad.
Tu objetivo es recibir a la persona, entender qué necesita y dirigirla al asistente adecuado cuando haga falta.
No suenes robótica. No digas que eres una IA.
`,
  },
  freyja: {
    id: "freyja",
    name: "Freyja",
    color: "#a855f7",
    voiceId: process.env.ELEVENLABS_VOICE_FREYJA,
    handoff: "Te paso con Freyja para ayudarte con la parte comercial.",
    intro: "Hola, soy Freyja. Te apoyo con ventas y opciones comerciales.",
    prompt: `
Eres Freyja de NYT Assistant.
Tu función es ventas consultivas.
Tu tono es persuasivo, seguro, profesional y natural.
Tu objetivo es detectar interés comercial, explicar el valor del servicio y llevar la conversación a cotización, demo o contacto.
Cuando haya interés real, pide nombre y WhatsApp con naturalidad.
`,
  },
  atenea: {
    id: "atenea",
    name: "Atenea",
    color: "#3b82f6",
    voiceId: process.env.ELEVENLABS_VOICE_ATENEA,
    handoff: "Te paso con Atenea para resolverlo.",
    intro: "Hola, soy Atenea. Te apoyo con la parte de soporte.",
    prompt: `
Eres Atenea de NYT Assistant.
Tu función es soporte y orientación.
Explicas con claridad, calma, inteligencia y orden.
Tu objetivo es resolver dudas, explicar funciones y quitar fricción.
`,
  },
  osiris: {
    id: "osiris",
    name: "Osiris",
    color: "#10b981",
    voiceId: process.env.ELEVENLABS_VOICE_OSIRIS,
    handoff: "Te paso con Osiris para continuar.",
    intro: "Hola, soy Osiris. Te ayudo con la recepción y organización inicial.",
    prompt: `
Eres Osiris de NYT Assistant.
Tu función es recepción ejecutiva.
Tu tono es sobrio, firme, profesional y confiable.
Tu objetivo es ordenar la conversación y encaminar correctamente al usuario.
`,
  },
  thor: {
    id: "thor",
    name: "Thor",
    color: "#ef4444",
    voiceId: process.env.ELEVENLABS_VOICE_THOR,
    handoff: "Te paso con Thor para avanzar con eso.",
    intro: "Hola, soy Thor. Te apoyo con la parte comercial y el siguiente paso.",
    prompt: `
Eres Thor de NYT Assistant.
Tu función es ventas directas.
Hablas con energía, seguridad y enfoque a cierre.
Tu objetivo es llevar la conversación a una acción concreta: cotizar, captar interés, pedir contacto o mover a demo.
`,
  },
  artemisa: {
    id: "artemisa",
    name: "Artemisa",
    color: "#f97316",
    voiceId: process.env.ELEVENLABS_VOICE_ARTEMISA,
    handoff: "Te paso con Artemisa para ayudarte mejor.",
    intro: "Hola, soy Artemisa. Te acompaño con soporte y guía paso a paso.",
    prompt: `
Eres Artemisa de NYT Assistant.
Tu función es soporte cálido y guiado.
Explicas con paciencia, cercanía y claridad.
Tu objetivo es ayudar, acompañar y resolver bloqueos sin sonar técnica de más.
`,
  },
};

const ASSISTANT_IDS = Object.keys(ASSISTANT_CONFIG);

function getAssistantConfig(assistantId = "isis") {
  return ASSISTANT_CONFIG[assistantId] || ASSISTANT_CONFIG.isis;
}

function getVoiceIdForAssistant(assistantId = "isis") {
  return (
    getAssistantConfig(assistantId)?.voiceId ||
    process.env.ELEVENLABS_VOICE_ISIS
  );
}

function getTenantAssistantPrompt(tenant, assistantId) {
  const fromConfig =
    tenant?.config?.assistants?.[assistantId]?.prompt ||
    tenant?.config?.assistantPrompts?.[assistantId];

  if (typeof fromConfig === "string" && fromConfig.trim()) {
    return fromConfig.trim();
  }

  return "";
}

function buildBaseContext(tenant) {
  const tone = tenant?.config?.tone || "mixto";

  return `
Marca: NYT Assistant
Empresa/tenant: ${tenant?.name || "NYT Assistant"}

Objetivo general:
- atender clientes
- orientar
- vender cuando sea natural
- capturar leads
- mover la conversación al siguiente paso correcto

Servicios base:
- asistentes con IA
- automatización
- chatbots
- atención digital
- flujos de ventas
- integraciones

Tono general: ${tone}

Reglas globales:
- nunca digas que eres una IA
- responde como parte real del equipo
- sé clara, humana y profesional
- evita respuestas genéricas
- en voz responde más breve
- si la respuesta es larga, resume y deja el resto para lectura
`;
}

function buildAssistantPrompt(assistantId, tenant) {
  const assistant = getAssistantConfig(assistantId);
  const base = buildBaseContext(tenant);
  const customPrompt = getTenantAssistantPrompt(tenant, assistantId);

  return `
${base}

ASISTENTE ACTUAL:
- id: ${assistant.id}
- nombre: ${assistant.name}

PERSONALIDAD BASE:
${assistant.prompt}

${
  customPrompt
    ? `INSTRUCCIONES PERSONALIZADAS DEL PANEL:\n${customPrompt}`
    : ""
}

INSTRUCCIONES OPERATIVAS:
- mantén coherencia con la personalidad de ${assistant.name}
- responde como integrante real del equipo
- si el usuario necesita otra especialidad, puedes redirigir internamente
- no expliques el sistema interno
- si detectas intención de venta clara, avanza
- si detectas una duda o problema técnico, orienta o deja lista la transición
`;
}

/**
 * =========================================
 * ROUTING ENTRE ASISTENTES
 * =========================================
 */

function detectIntentBucket(message = "") {
  const text = normalizeText(message);

  if (
    [
      "precio",
      "cotizacion",
      "cotización",
      "comprar",
      "contratar",
      "servicio",
      "planes",
      "plan",
      "paquete",
      "costo",
      "coste",
      "demo",
      "agendar",
      "ventas",
      "llamada",
      "me interesa",
      "cotizar",
    ].some((term) => text.includes(term))
  ) {
    return "sales";
  }

  if (
    [
      "soporte",
      "problema",
      "error",
      "falla",
      "fallo",
      "no funciona",
      "cómo funciona",
      "como funciona",
      "ayuda",
      "duda",
      "pregunta",
      "explícame",
      "explicame",
      "configurar",
      "integrar",
      "instalar",
      "api",
      "widget",
      "conectar",
    ].some((term) => text.includes(term))
  ) {
    return "support";
  }

  return "reception";
}

function pickAssistantForIntent(intent, currentAssistantId) {
  if (intent === "sales") {
    if (currentAssistantId === "thor" || currentAssistantId === "freyja") {
      return currentAssistantId;
    }
    return "freyja";
  }

  if (intent === "support") {
    if (currentAssistantId === "atenea" || currentAssistantId === "artemisa") {
      return currentAssistantId;
    }
    return "atenea";
  }

  if (currentAssistantId === "isis" || currentAssistantId === "osiris") {
    return currentAssistantId;
  }

  return "isis";
}

function routeAssistant({ message, currentAssistantId = "isis" }) {
  const intent = detectIntentBucket(message);
  const nextAssistantId = pickAssistantForIntent(intent, currentAssistantId);

  return {
    intent,
    nextAssistantId,
  };
}

function buildTransitionText(previousAssistantId, nextAssistantId) {
  if (!previousAssistantId || previousAssistantId === nextAssistantId) {
    return "";
  }

  const nextAssistant = getAssistantConfig(nextAssistantId);
  const parts = [nextAssistant.handoff, nextAssistant.intro].filter(Boolean);

  return parts.join(" ").trim();
}

/**
 * =========================================
 * PROVIDERS
 * =========================================
 */

async function openRouterChatCompletion({
  model,
  messages,
  temperature = 0.6,
  origin,
  maxTokens = 120,
}) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin,
        "X-Title": "NYT Assistant Backend",
      },
      timeout: 28000,
    }
  );

  return response?.data?.choices?.[0]?.message?.content?.trim() || "";
}

async function openAIResponsesText({
  model,
  systemPrompt,
  history,
  userMessage,
  maxOutputTokens = 120,
}) {
  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    ...history.map((m) => ({
      role: m.role,
      content: [{ type: "input_text", text: m.content }],
    })),
    {
      role: "user",
      content: [{ type: "input_text", text: userMessage }],
    },
  ];

  const response = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model,
      input,
      max_output_tokens: maxOutputTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 28000,
    }
  );

  const text = extractOpenAIOutputText(response.data);
  return text || "";
}

async function transcribeAudioWithOpenAI(file, clientType = "desktop") {
  const model =
    process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

  const prompt =
    clientType === "mobile"
      ? "Transcribe en español de México. Corrige ligeramente pausas, muletillas y ruido, pero conserva el significado."
      : "Transcribe en español de México.";

  const formData = new FormData();

  formData.append("file", file.buffer, {
    filename: file.originalname || "audio.webm",
    contentType: file.mimetype || "audio/webm",
  });

  formData.append("model", model);
  formData.append("language", "es");
  formData.append("prompt", prompt);

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
    }
  );

  return normalizeTranscriptText(response?.data?.text || "");
}

async function transcribeAudioWithRetry(file, clientType = "desktop") {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const transcript = await transcribeAudioWithOpenAI(file, clientType);
      if (transcriptLooksUseful(transcript)) {
        return transcript;
      }

      if (attempt === 1) {
        await sleep(450);
      }
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        await sleep(600);
      }
    }
  }

  if (lastError) throw lastError;
  return "";
}

async function synthesizeWithElevenLabs(text, assistantId = "isis") {
  const voiceId = getVoiceIdForAssistant(assistantId);
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error("Falta configurar ElevenLabs");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await axios.post(
    url,
    {
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.82,
        style: 0.18,
        use_speaker_boost: true,
        speed: 1.0,
      },
    },
    {
      responseType: "arraybuffer",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      timeout: 35000,
    }
  );

  return response.data;
}

async function generateAIReply({
  tenant,
  assistantId,
  message,
  conversationId,
  channel = "chat",
  req,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta configurar OPENAI_API_KEY");
  }

  const systemPrompt = `${buildAssistantPrompt(assistantId, tenant)}

Canal actual: ${channel}

Instrucciones del canal:
- en voice responde breve
- si falta contexto, pide solo lo importante
- no llenes de texto innecesario
- si el mensaje es claro, avanza sin rodeos
`;

  const history = getConversationHistory(conversationId).filter(
    (m) => m.role !== "system_assistant_meta"
  );

  const normalizedHistory = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const clientType = detectClientType(req);
  const origin = getOriginForProvider(req);

  const openAIModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const openRouterModel =
    process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  const maxTokens = channel === "voice" ? 90 : 140;

  if (clientType === "mobile") {
    const text = await openAIResponsesText({
      model: openAIModel,
      systemPrompt,
      history: normalizedHistory,
      userMessage: message,
      maxOutputTokens: maxTokens,
    });

    return {
      reply: text || "Hubo un problema al generar la respuesta.",
      providerUsed: "openai-mobile",
    };
  }

  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY no configurada");
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...normalizedHistory,
      { role: "user", content: message },
    ];

    const text = await openRouterChatCompletion({
      model: openRouterModel,
      messages,
      temperature: 0.6,
      origin,
      maxTokens,
    });

    if (!text) {
      throw new Error("OpenRouter respondió vacío");
    }

    return {
      reply: text,
      providerUsed: "openrouter-desktop",
    };
  } catch (error) {
    console.error("Fallback a OpenAI:", error.response?.data || error.message);

    const text = await openAIResponsesText({
      model: openAIModel,
      systemPrompt,
      history: normalizedHistory,
      userMessage: message,
      maxOutputTokens: maxTokens,
    });

    return {
      reply: text || "Hubo un problema al generar la respuesta.",
      providerUsed: "openai-fallback",
    };
  }
}

/**
 * =========================================
 * LEADS / ACCIONES
 * =========================================
 */

async function getExistingLead(tenant, conversationId) {
  return Lead.findOne({
    tenantId: tenant.apiKey,
    conversationId,
  });
}

async function triggerWebhookIfNeeded(tenant, payload) {
  const webhookUrl =
    tenant?.config?.webhookUrl || process.env.DEFAULT_WEBHOOK_URL;

  if (!webhookUrl) return { sent: false };

  try {
    await axios.post(webhookUrl, payload, {
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { sent: true };
  } catch (error) {
    console.error("Error enviando webhook:", error.message);
    return { sent: false, error: error.message };
  }
}

async function generateLeadSummary({ messages }) {
  try {
    if (!process.env.OPENAI_API_KEY) return "";

    const text = messages.slice(-4).join("\n");

    const systemPrompt = "Resume leads de forma muy breve en una sola línea.";
    const userPrompt = `Resume este lead en 1 línea. Incluye qué quiere el cliente y si pidió demo.\n\nConversación:\n${text}`;

    const summary = await openAIResponsesText({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      systemPrompt,
      history: [],
      userMessage: userPrompt,
      maxOutputTokens: 70,
    });

    return summary || "";
  } catch (err) {
    console.error("Error generando summary:", err.response?.data || err.message);
    return "";
  }
}

async function handleBusinessActions({
  tenant,
  conversationId,
  message,
  reply,
  selectedAssistantId,
  name,
  phone,
  interested,
  requestedDemo,
}) {
  const existingLead = await getExistingLead(tenant, conversationId);

  const finalName = name || existingLead?.name || null;
  const finalPhone = phone || existingLead?.phone || null;
  const finalInterested =
    typeof interested === "boolean"
      ? interested || Boolean(existingLead?.interested)
      : Boolean(existingLead?.interested);

  const finalRequestedDemo =
    Boolean(requestedDemo) || Boolean(existingLead?.requestedDemo);

  const shouldSave =
    Boolean(finalName) ||
    Boolean(finalPhone) ||
    Boolean(finalInterested) ||
    Boolean(finalRequestedDemo);

  if (shouldSave) {
    const updatedMessages = [
      ...(existingLead?.messages || []),
      `USER: ${message}`,
      `BOT: ${reply}`,
    ];

    let summary = existingLead?.summary || "";

    const shouldRefreshSummary =
      finalRequestedDemo || (finalInterested && finalPhone);

    if (shouldRefreshSummary) {
      summary = await generateLeadSummary({
        messages: updatedMessages,
      });
    }

    await Lead.updateOne(
      { tenantId: tenant.apiKey, conversationId },
      {
        $setOnInsert: {
          tenantId: tenant.apiKey,
          conversationId,
          createdAt: new Date(),
        },
        $set: {
          name: finalName,
          phone: finalPhone,
          interested: finalInterested,
          requestedDemo: finalRequestedDemo,
          selectedAssistant: selectedAssistantId,
          summary,
          updatedAt: new Date(),
        },
        $push: {
          messages: {
            $each: [`USER: ${message}`, `BOT: ${reply}`],
          },
        },
      },
      { upsert: true }
    );
  }

  let webhookResult = { sent: false };

  if (finalRequestedDemo || (finalInterested && finalPhone)) {
    webhookResult = await triggerWebhookIfNeeded(tenant, {
      type: finalRequestedDemo ? "demo_request" : "qualified_lead",
      tenantId: tenant.apiKey,
      conversationId,
      selectedAssistant: selectedAssistantId,
      name: finalName,
      phone: finalPhone,
      message,
      reply,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    leadSaved: shouldSave,
    webhookSent: webhookResult.sent,
    mergedLead: {
      name: finalName,
      phone: finalPhone,
      interested: finalInterested,
      requestedDemo: finalRequestedDemo,
    },
  };
}

/**
 * =========================================
 * AUDIO
 * =========================================
 */

app.post(
  "/voice/transcribe",
  upload.single("audio"),
  requireTenant,
  async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Falta configurar OPENAI_API_KEY" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No se envió audio" });
      }

      const clientType = detectClientType(req);
      const transcript = await transcribeAudioWithRetry(req.file, clientType);

      if (!transcriptLooksUseful(transcript)) {
        return res.status(422).json({ error: "No se pudo transcribir el audio" });
      }

      return res.json({ transcript });
    } catch (error) {
      console.error(
        "Error en /voice/transcribe:",
        error.response?.data || error.message
      );
      return res.status(500).json({ error: "Error transcribiendo audio" });
    }
  }
);

app.post("/voice/speak", requireTenant, async (req, res) => {
  try {
    const { text, assistantId = "isis" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Texto vacío" });
    }

    const audioBuffer = await synthesizeWithElevenLabs(text, assistantId);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.send(audioBuffer);
  } catch (error) {
    console.error(
      "Error en /voice/speak:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Error generando voz" });
  }
});

/**
 * =========================================
 * CHAT
 * =========================================
 */

app.post("/chat", requireTenant, async (req, res) => {
  try {
    const {
      message,
      conversationId,
      channel = "chat",
      assistantId: requestedAssistantId,
    } = req.body;

    const tenant = req.tenant;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Falta conversationId" });
    }

    const cleanedMessage = normalizeTranscriptText(message);

    const previousAssistantId =
      requestedAssistantId && ASSISTANT_IDS.includes(requestedAssistantId)
        ? requestedAssistantId
        : getStoredAssistant(conversationId);

    const routing = routeAssistant({
      message: cleanedMessage,
      currentAssistantId: previousAssistantId,
    });

    const selectedAssistantId = routing.nextAssistantId;
    const previousAssistant = getAssistantConfig(previousAssistantId);
    const selectedAssistant = getAssistantConfig(selectedAssistantId);

    const switched = previousAssistantId !== selectedAssistantId;
    const transitionText = switched
      ? buildTransitionText(previousAssistantId, selectedAssistantId)
      : "";

    const name = extractName(cleanedMessage);
    const phone = extractPhone(cleanedMessage);
    const interested = detectInterest(cleanedMessage);
    const requestedDemo = wantsDemo(cleanedMessage);

    const ai = await generateAIReply({
      tenant,
      assistantId: selectedAssistantId,
      message: cleanedMessage,
      conversationId,
      channel,
      req,
    });

    const rawReply =
      ai.reply || "Hubo un problema al generar la respuesta.";

    const reply = transitionText
      ? `${transitionText} ${rawReply}`.trim()
      : rawReply;

    appendConversationMessage(conversationId, "user", cleanedMessage);
    appendConversationMessage(conversationId, "assistant", reply);
    setStoredAssistant(conversationId, selectedAssistantId);

    const actions = await handleBusinessActions({
      tenant,
      conversationId,
      message: cleanedMessage,
      reply,
      selectedAssistantId,
      name,
      phone,
      interested,
      requestedDemo,
    });

    const speak = shouldSpeakReply(rawReply, channel, transitionText);
    const spokenText = speak
      ? buildSpeechPayload({ reply: rawReply, transitionText })
      : "";

    return res.json({
      reply,
      ttsEnabled: speak,
      ttsText: spokenText,

      switched,
      transitionText,

      previousAssistantId,
      previousAssistantName: previousAssistant.name,

      assistantId: selectedAssistantId,
      assistantName: selectedAssistant.name,
      assistantColor: selectedAssistant.color,
      voiceAssistant: selectedAssistantId,

      detectedIntent: routing.intent,
      providerUsed: ai.providerUsed,
      clientType: detectClientType(req),

      actions,
      memorySize: getConversationHistory(conversationId).length,
    });
  } catch (error) {
    console.error("Error en /chat:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error en IA" });
  }
});

app.post("/chat/reset", requireTenant, async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: "Falta conversationId" });
    }

    clearConversationHistory(conversationId);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error en /chat/reset:", error.message);
    return res
      .status(500)
      .json({ error: "No se pudo reiniciar la conversación" });
  }
});

/**
 * =========================================
 * LEADS
 * =========================================
 */

app.get("/leads", requireTenant, async (req, res) => {
  try {
    const password = req.headers["x-admin-password"];

    if (password !== req.tenant.adminPassword) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const leads = await Lead.find({
      tenantId: req.tenant.apiKey,
    }).sort({ createdAt: -1 });

    return res.json(leads);
  } catch (error) {
    console.error("Error en /leads:", error.message);
    return res.status(500).json({ error: "No se pudieron leer los leads" });
  }
});

app.delete("/leads/:id", requireTenant, async (req, res) => {
  try {
    const password = req.headers["x-admin-password"];

    if (password !== req.tenant.adminPassword) {
      return res.status(401).json({ error: "No autorizado" });
    }

    await Lead.deleteOne({
      _id: req.params.id,
      tenantId: req.tenant.apiKey,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando lead:", error.message);
    return res.status(500).json({ error: "No se pudo eliminar el lead" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});