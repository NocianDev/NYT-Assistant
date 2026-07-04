import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import multer from "multer";
import FormData from "form-data";

import Lead from "./models/Lead.js";
import Tenant from "./models/Tenant.js";
import {
  DEFAULT_CLIENT_ID,
  getClientConfig,
  getPublicClientConfig,
  getPublicClientConfigFromFull,
  listAvailableClients,
  normalizeClientConfig as normalizeBackendClientConfig,
} from "./services/clientConfigService.js";
import { correctTranscript } from "./agents/speechCorrectionAgent.js";
import {
  buildLeadInstruction,
  extractLeadSignal,
} from "./agents/leadExtractionAgent.js";
import { getAgentConfig, getVoiceIdForAgent } from "./config/agentConfig.js";

dotenv.config();

console.log("MONGODB_URI existe:", !!process.env.MONGODB_URI);
console.log("OPENROUTER_API_KEY existe:", !!process.env.OPENROUTER_API_KEY);
console.log("OPENAI_API_KEY existe:", !!process.env.OPENAI_API_KEY);
console.log("ELEVENLABS_API_KEY existe:", !!process.env.ELEVENLABS_API_KEY);

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => console.log("Mongo conectado"))
    .catch((err) => console.error("Error conectando Mongo:", err));
} else {
  console.warn("MONGODB_URI no configurado. Demo local sin persistencia.");
}

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

const allowedOriginSuffixes = (process.env.ALLOWED_ORIGIN_SUFFIXES || ".vercel.app")
  .split(",")
  .map((suffix) => suffix.trim().toLowerCase())
  .filter(Boolean);

function isOriginAllowed(origin = "") {
  if (!origin) return true;

  const normalizedOrigin = origin.toLowerCase();

  const exactMatch = allowedOrigins.some(
    (allowed) => allowed && normalizedOrigin === allowed.toLowerCase(),
  );

  if (exactMatch) return true;

  try {
    const host = new URL(normalizedOrigin).hostname;
    return allowedOriginSuffixes.some((suffix) => {
      const cleanSuffix = suffix.replace(/^https?:\/\//, "");
      return host === cleanSuffix || host.endsWith(cleanSuffix);
    });
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
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
      "x-client-id",
      "x-client-type",
    ],
    credentials: false,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("NYT Assistant Backend OK");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/client/public-config/:clientId", async (req, res) => {
  try {
    const publicConfig = await getPublicClientConfig(req.params.clientId);
    const agentConfig = getAgentConfig();

    return res.json({
      ...publicConfig,
      enabledFeatures: {
        ...publicConfig.enabledFeatures,
        multiAgentVoices:
          Boolean(publicConfig.enabledFeatures?.multiAgentVoices) &&
          agentConfig.multiAgentVoicesEnabled,
      },
      audio: {
        elevenLabsActive: agentConfig.multiAgentVoicesEnabled,
        multiAgentVoicesEnabled: agentConfig.multiAgentVoicesEnabled,
      },
    });
  } catch (error) {
    console.error("Error cargando public config:", error.message);
    return res.status(404).json({ error: "Cliente no encontrado" });
  }
});

app.get("/client/list", async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(404).json({ error: "No disponible" });
  }

  try {
    return res.json({ clients: await listAvailableClients() });
  } catch (error) {
    return res.status(500).json({ error: "No se pudieron listar clientes" });
  }
});

/**
 * =========================================
 * UTILIDADES
 * =========================================
 */

function normalizeText(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isDevelopmentMode() {
  return process.env.NODE_ENV === "development";
}

function logBackendDebug(label, payload = {}) {
  if (!isDevelopmentMode()) return;
  console.log(`[backend-dev] ${label}`, payload);
}

function isDentalClinic(clientConfig = {}) {
  const industry = normalizeText(clientConfig.industry || "");
  const services = (clientConfig.services || []).join(" ");
  const faq = (clientConfig.faq || [])
    .map((item) => `${item.question || ""} ${item.answer || ""}`)
    .join(" ");
  const combined = normalizeText(`${industry} ${services} ${faq}`);

  return [
    "dental",
    "dentista",
    "odontologia",
    "odontologico",
    "ortodoncia",
    "endodoncia",
    "implante",
  ].some((term) => combined.includes(term));
}

function hasAnyTerm(text = "", terms = []) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function getLeadFieldsText(clientConfig = {}) {
  const fields = clientConfig.leadFields || [];
  if (!fields.length) return "tus datos de contacto";

  const normalized = fields
    .map((field) => {
      const raw = String(field).trim();
      const fieldText = normalizeText(raw);

      if (fieldText === "nombre completo") return "tu nombre completo";
      if (fieldText === "nombre") return "tu nombre";
      if (fieldText === "edad") return "edad";
      if (fieldText === "alergias") return "si tienes alergias";
      if (fieldText === "motivo de consulta") return "el motivo de consulta";
      if (fieldText === "whatsapp") return "tu WhatsApp";
      if (fieldText === "telefono" || fieldText === "celular") {
        return "tu teléfono";
      }

      return raw.charAt(0).toLowerCase() + raw.slice(1);
    })
    .filter(Boolean);
  if (normalized.length <= 1) return normalized[0] || "tus datos de contacto";

  return `${normalized.slice(0, -1).join(", ")} y ${normalized.at(-1)}`;
}

function getConfiguredLocation(clientConfig = {}) {
  const location = String(clientConfig.location || "").trim();
  if (!location) return "";

  const normalized = normalizeText(location);
  const placeholderTerms = [
    "agrega aqui",
    "inserta direccion",
    "insertar direccion",
    "direccion real",
    "pendiente",
    "por definir",
    "placeholder",
  ];

  return placeholderTerms.some((term) => normalized.includes(term))
    ? ""
    : location;
}

function formatBusinessHours(hours = "") {
  const text = String(hours || "").trim().replace(/[.。]+$/u, "");
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function findMatchingFaq(clientConfig = {}, message = "", intent = "") {
  const text = normalizeText(message);
  const faq = clientConfig.faq || [];

  return faq.find((item) => {
    const question = normalizeText(item.question || "");
    const answer = normalizeText(item.answer || "");
    const combined = `${question} ${answer}`;

    if (!combined.trim()) return false;

    if (intent === "hours") {
      return hasAnyTerm(combined, ["horario", "hora", "atencion"]);
    }

    if (intent === "location") {
      return hasAnyTerm(combined, ["ubicacion", "direccion", "ubicados", "donde estan"]);
    }

    if (text.includes("brackets") && combined.includes("brackets")) {
      return true;
    }

    return question
      .split(/\s+/)
      .some((word) => word.length > 4 && text.includes(word));
  });
}

function findMatchingService(clientConfig = {}, message = "") {
  const text = normalizeText(message);

  return (clientConfig.services || []).find((service) => {
    const normalizedService = normalizeText(service);
    if (!normalizedService) return false;

    if (text.includes(normalizedService)) return true;
    if (text.includes("brackets") && normalizedService.includes("ortodoncia")) {
      return true;
    }

    return normalizedService
      .split(/\s+/)
      .some((word) => word.length > 4 && text.includes(word));
  });
}

function countWords(text = "") {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildSpokenVersion(fullReply = "") {
  const clean = fullReply.replace(/\s+/g, " ").trim();

  if (!clean) return "";

  const words = clean.split(" ");

  if (words.length <= 28) {
    return clean;
  }

  const shortPreview = words.slice(0, 24).join(" ");
  return `${shortPreview}. ¿Quieres que lo revisemos por partes?`;
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

function detectOffTopicMessage(message = "", clientConfig = {}) {
  const text = normalizeText(message);

  if (!text) {
    return {
      offTopic: false,
      reason: "empty-message",
    };
  }

  const dentalAllowedTerms = [
    "dolor de muela",
    "dolor dental",
    "dolor",
    "muela",
    "urgencia",
    "emergencia dental",
    "emergencia",
    "inflamacion",
    "sangrado",
    "infeccion",
    "brackets",
    "ortodoncia",
    "endodoncia",
    "implantes",
    "horarios",
    "horario",
    "ubicacion",
    "direccion",
    "citas",
    "cita",
    "agendar",
    "contacto",
    "whatsapp",
  ];

  if (isDentalClinic(clientConfig) && hasAnyTerm(text, dentalAllowedTerms)) {
    return {
      offTopic: false,
      reason: "dental-allowed-intent",
    };
  }

  const businessKeywords = [
    "precio",
    "cotizacion",
    "cotización",
    "costo",
    "coste",
    "plan",
    "planes",
    "paquete",
    "demo",
    "agendar",
    "llamada",
    "servicio",
    "servicios",
    "contratar",
    "comprar",
    "asistente",
    "ia",
    "chatbot",
    "automatizacion",
    "automatización",
    "soporte",
    "problema",
    "error",
    "falla",
    "fallo",
    "integrar",
    "integración",
    "api",
    "widget",
    "pagina",
    "página",
    "web",
    "leads",
    "clientes",
    "ventas",
    "negocio",
    "empresa",
    "whatsapp",
    "contacto",
    "informacion",
    "información",
    "ayuda",
    "instalar",
    "configurar",
    "funciona",
    "como funciona",
    "cómo funciona",
    "quien eres",
    "quién eres",
    "dentista",
    "dental",
    "odontologia",
    "odontología",
    "odontologico",
    "odontológico",
    "brackets",
    "ortodoncia",
    "endodoncia",
    "implantes",
    "limpieza dental",
    "urgencia dental",
    "dolor dental",
    "dolor de muela",
    "muela",
    "emergencia dental",
    "emergencia",
    "inflamacion",
    "dolor",
    "infeccion",
    "infección",
    "sangrado",
    "legal",
    "abogado",
    "contrato",
    "mercantil",
    "empresa",
    "cobranza",
    "flete",
    "logistica",
    "logística",
    "origen",
    "destino",
    "carga",
    "rastreo",
    "restaurante",
    "reservacion",
    "reservación",
    "menu",
    "menú",
    "pedido",
    "evento",
  ];

  const obviousOffTopic = [
    "cuentame un chiste",
    "cuéntame un chiste",
    "chiste",
    "quien gano",
    "quién ganó",
    "futbol",
    "fútbol",
    "nba",
    "pelicula",
    "película",
    "serie",
    "anime",
    "videojuego",
    "videojuegos",
    "horoscopo",
    "horóscopo",
    "signo zodiacal",
    "receta",
    "cocina",
    "tarea",
    "matematicas",
    "matemáticas",
    "historia universal",
    "traduce esto",
    "poema",
    "cancion",
    "canción",
    "novia",
    "novio",
    "amor",
    "religion",
    "religión",
    "politica",
    "política",
    "capital de",
    "presidente de",
    "quien descubrio",
    "quién descubrió",
    "cuanto es",
    "cuánto es",
  ];

  if (obviousOffTopic.some((term) => text.includes(term))) {
    return {
      offTopic: true,
      reason: "obvious-offtopic-keyword",
    };
  }

  const hasBusinessIntent = businessKeywords.some((term) =>
    text.includes(term)
  );

  const veryShortAllowed = [
    "hola",
    "buenas",
    "buenos dias",
    "buenos días",
    "info",
    "informacion",
    "información",
    "precio",
    "costos",
    "coste",
    "costo",
    "demo",
    "ayuda",
  ];

  if (veryShortAllowed.includes(text)) {
    return {
      offTopic: false,
      reason: "short-allowed",
    };
  }

  if (!hasBusinessIntent && countWords(text) >= 4) {
    return {
      offTopic: true,
      reason: "no-business-intent",
    };
  }

  return {
    offTopic: false,
    reason: hasBusinessIntent ? "business-keyword" : "short-message",
  };
}

function getOriginForProvider(req) {
  return (
    req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173"
  );
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

function normalizeClientConfig(rawConfig = {}) {
  return normalizeBackendClientConfig(rawConfig);
}

function createDemoTenant(clientConfig = {}) {
  const config = normalizeClientConfig(clientConfig);

  return {
    name: config.businessName,
    apiKey: "nyt_demo_1",
    adminPassword: process.env.ADMIN_PASSWORD || "demo",
    config: {
      tone: config.tone,
      clientConfig: config,
      primaryColor: "#dc2626",
      welcomeMessage:
        config.publicWelcomeMessage ||
        `Soy ${config.assistantName}, configurado para atender a ${config.businessName}. Puedo ayudarte con informacion, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.`,
    },
    isLocalDemo: true,
  };
}

async function resolveRequestClientConfig(req) {
  const clientId =
    req.body?.clientId ||
    req.headers["x-client-id"] ||
    req.query?.clientId ||
    DEFAULT_CLIENT_ID;

  if (req.body?.clientConfig) {
    return normalizeClientConfig({
      ...(await getClientConfig(clientId)),
      ...req.body.clientConfig,
      clientId,
    });
  }

  return getClientConfig(clientId);
}

function mergeTenantClientConfig(tenant, clientConfig = {}) {
  const normalized = normalizeClientConfig({
    ...(tenant?.config?.clientConfig || {}),
    ...clientConfig,
  });

  return {
    ...tenant,
    name: normalized.businessName || tenant?.name,
    config: {
      ...(tenant?.config || {}),
      tone: normalized.tone || tenant?.config?.tone,
      clientConfig: normalized,
    },
  };
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

  if (words <= 30) return true;
  if (words <= 42 && hasPriorityIntent) return true;

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
      return history[i].content || "main";
    }
  }
  return "main";
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
    const requestClientConfig = await resolveRequestClientConfig(req);

    if (!tenantId) {
      req.tenant = createDemoTenant(requestClientConfig);
      req.clientConfig = requestClientConfig;
      return next();
    }

    if (!process.env.MONGODB_URI || mongoose.connection.readyState !== 1) {
      req.tenant = createDemoTenant(requestClientConfig);
      req.clientConfig = requestClientConfig;
      return next();
    }

    const tenant = await Tenant.findOne({ apiKey: tenantId });

    if (!tenant) {
      req.tenant = createDemoTenant(requestClientConfig);
      req.clientConfig = requestClientConfig;
      return next();
    }

    req.tenant = mergeTenantClientConfig(tenant.toObject(), requestClientConfig);
    req.clientConfig = requestClientConfig;
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
  main: {
    id: "main",
    name: "NYT Assistant",
    color: "#dc2626",
    voiceId: process.env.ELEVENLABS_MAIN_VOICE_ID || process.env.ELEVENLABS_VOICE_ID,
    handoff: "",
    intro: "",
    prompt: `
Eres NYT Assistant.
Tu funcion es atender clientes de negocios configurados por backend.
Hablas con claridad, profesionalismo y naturalidad.
Tu objetivo es orientar, responder sobre servicios, resolver preguntas frecuentes y canalizar solicitudes al equipo.
No suenes robotico. No digas que eres una IA salvo que el usuario lo pregunte directamente.
Mantente dentro de las reglas del cliente configurado.
`,
  },
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
No te salgas a conversaciones generales.
Si el usuario se desvía del objetivo, vuelve a enfocar la conversación en atención inicial, necesidades y siguiente paso.
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
No te desvíes a temas que no ayuden a vender, orientar o calificar al prospecto.
Si el usuario cambia de tema, responde breve y vuelve a llevarlo al servicio o la oportunidad comercial.
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
No te apartes del tema técnico o de orientación.
Si el usuario se desvía, recuérdale que estás para ayudar con soporte y redirígelo con amabilidad.
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
No entres en conversaciones secundarias o irrelevantes.
Si el usuario se desvía, vuelve a centrarlo en lo que necesita y en el siguiente paso.
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
No te desvíes a temas ajenos a ventas.
Si el usuario cambia de tema, responde corto y vuelve a llevar la conversación a una acción comercial.
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
No desarrolles conversaciones fuera del soporte o la orientación.
Si el usuario se sale del enfoque, redirígelo con amabilidad al problema principal.
`,
  },
};

const ASSISTANT_IDS = Object.keys(ASSISTANT_CONFIG);

function getAssistantConfig(assistantId = "isis") {
  return ASSISTANT_CONFIG[assistantId] || ASSISTANT_CONFIG.isis;
}

function getVoiceIdForAssistant(assistantId = "isis") {
  const agentVoiceId = getVoiceIdForAgent(assistantId);
  if (agentVoiceId) return agentVoiceId;

  return (
    getAssistantConfig(assistantId)?.voiceId ||
    process.env.ELEVENLABS_VOICE_ID ||
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

function buildOffTopicReplyFromCurrentAssistant(currentAssistantId = "isis") {
  const assistant = getAssistantConfig(currentAssistantId);

  const focusByAssistant = {
    main: "informacion, servicios, preguntas frecuentes y canalizacion al equipo",
    isis: "recepción inicial, orientación del servicio y siguiente paso",
    osiris: "recepción inicial, organización de la atención y siguiente paso",
    freyja: "ventas, precios, demo y contacto comercial",
    thor: "ventas, cotización, interés comercial y cierre",
    atenea: "soporte, funciones, dudas técnicas e integración",
    artemisa: "soporte guiado, ayuda práctica y resolución de bloqueos",
  };

  const focus =
    focusByAssistant[currentAssistantId] ||
    "información del servicio, soporte, demo o contacto";

  return `Prefiero mantenerme enfocada en ${focus}. Si quieres, puedo ayudarte con eso.`;
}

function buildBaseContext(tenant) {
  const tone = tenant?.config?.tone || "mixto";
  const clientConfig = normalizeClientConfig(tenant?.config?.clientConfig || {});
  const services = clientConfig.services.map((item) => `- ${item}`).join("\n");
  const faq = clientConfig.faq
    .map((item) => `- ${item.question}\n  ${item.answer}`)
    .join("\n");
  const rules = clientConfig.rules.map((item) => `- ${item}`).join("\n");
  const leadFields = clientConfig.leadFields
    .map((item) => `- ${item}`)
    .join("\n");
  const appointmentTypes = (clientConfig.appointmentTypes || [])
    .map((item) => `- ${item}`)
    .join("\n");

  return `
Marca: NYT Assistant
Empresa/tenant: ${clientConfig.businessName || tenant?.name || "NYT Assistant"}
Industria: ${clientConfig.industry}
Asistente configurado: ${clientConfig.assistantName}
Horario configurado: ${clientConfig.businessHours || "No configurado"}
Ubicacion configurada: ${getConfiguredLocation(clientConfig) || "No configurada"}

Presentacion obligatoria si el usuario pregunta quien eres:
Soy ${clientConfig.assistantName}, configurado para atender a ${clientConfig.businessName}. Puedo ayudarte con informacion, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.

Objetivo general:
- atender clientes
- orientar
- vender cuando sea natural
- capturar leads
- mover la conversación al siguiente paso correcto

Servicios base:
${services}

Preguntas frecuentes:
${faq}

Tipos de cita:
${appointmentTypes}

Tono general: ${tone}

Reglas globales:
- nunca digas que eres una IA
- responde como parte real del equipo
- sé clara, humana y profesional
- evita respuestas genéricas
- habla como en llamada real: directo, natural y sin relleno
- en voz responde máximo 28 palabras
- si la respuesta es larga, resume y deja el resto para lectura
- mantente enfocada en el servicio principal del negocio
- evita hablar de temas ajenos al objetivo comercial o de atención
- si el usuario intenta llevar la conversación a otro tema, responde breve y redirígelo al propósito principal
- prioriza siempre ayudar dentro del rol actual del asistente

Reglas del cliente:
${rules}

Campos de lead a recopilar cuando sea natural:
${leadFields}
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
- habla como llamada real: directo, natural y sin relleno
- si el canal es voice, responde máximo 28 palabras
- usa 1 a 3 frases cortas
- haz solo una pregunta al final cuando ayude a avanzar
- si el usuario necesita otra especialidad, puedes redirigir internamente
- no expliques el sistema interno
- si detectas intención de venta clara, avanza hacia nombre, WhatsApp o demo
- si detectas una duda técnica, orienta con pasos simples
- no te salgas del tema principal del asistente actual
- no desarrolles conversaciones largas sobre temas generales, curiosidades o asuntos ajenos al servicio
- si el usuario se desvía del enfoque, recuérdale tu función y redirígelo con naturalidad
- evita frases genéricas como "estoy aquí para ayudarte"
- prioriza siempre el servicio principal, la orientación útil y el siguiente paso correcto
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
}) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model,
      messages,
      temperature,
      max_tokens: 85,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin,
        "X-Title": "NYT Assistant Backend",
      },
      timeout: 25000,
    }
  );

  return response?.data?.choices?.[0]?.message?.content?.trim() || "";
}

async function openAIResponsesText({
  model,
  systemPrompt,
  history,
  userMessage,
}) {
  const input = [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }],
    },
    ...history.map((m) => {
      if (m.role === "assistant") {
        return {
          role: "assistant",
          content: [{ type: "output_text", text: m.content }],
        };
      }

      return {
        role: "user",
        content: [{ type: "input_text", text: m.content }],
      };
    }),
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
      max_output_tokens: 85,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 25000,
    }
  );

  const text = extractOpenAIOutputText(response.data);
  return text || "";
}

function resolveConfiguredReply({ clientConfig, message }) {
  const text = normalizeText(message);
  const matchedService = findMatchingService(clientConfig, message);
  let matchedFaq = null;
  let intent = "";

  const hoursIntent = hasAnyTerm(text, [
    "horario",
    "horarios",
    "a que hora",
    "hora de atencion",
    "abren",
    "cierran",
  ]);
  const locationIntent = hasAnyTerm(text, [
    "ubicacion",
    "ubicados",
    "donde estan",
    "direccion",
    "domicilio",
  ]);
  const dentalPainIntent =
    isDentalClinic(clientConfig) &&
    hasAnyTerm(text, [
      "dolor de muela",
      "dolor dental",
      "me duele una muela",
      "me duele la muela",
      "muela",
      "infeccion",
      "sangrado",
      "inflamacion",
      "urgencia",
      "emergencia dental",
      "emergencia",
    ]);

  if (dentalPainIntent) {
    return {
      reply: `Lamento que tengas dolor. No puedo diagnosticar ni recomendar medicamentos, pero por dolor dental lo más recomendable es que el equipo te valore lo antes posible. Puedo ayudarte a canalizar tu solicitud. ¿Me compartes ${getLeadFieldsText(clientConfig)}?`,
      intent: "dental-pain",
      matchedService,
      matchedFaq: null,
    };
  }

  if (hoursIntent) {
    intent = "hours";
    matchedFaq = findMatchingFaq(clientConfig, message, intent);

    if (clientConfig.businessHours) {
      return {
        reply: `El horario de atención es de ${formatBusinessHours(clientConfig.businessHours)}.`,
        intent,
        matchedService,
        matchedFaq,
      };
    }

    if (matchedFaq?.answer) {
      return {
        reply: matchedFaq.answer,
        intent,
        matchedService,
        matchedFaq,
      };
    }

    return {
      reply:
        "No tengo el horario configurado todavía, pero puedo canalizarte con el equipo.",
      intent,
      matchedService,
      matchedFaq: null,
    };
  }

  if (locationIntent) {
    intent = "location";
    const location = getConfiguredLocation(clientConfig);
    matchedFaq = findMatchingFaq(clientConfig, message, intent);

    return {
      reply: location
        ? `Estamos ubicados en ${location}.`
        : "No tengo la dirección configurada todavía, pero puedo canalizarte con el equipo para compartirte la ubicación correcta.",
      intent,
      matchedService,
      matchedFaq,
    };
  }

  if (matchedService) {
    matchedFaq = findMatchingFaq(clientConfig, message, "service");
    return {
      reply:
        matchedFaq?.answer ||
        `Sí, contamos con servicio de ${matchedService}. Se recomienda agendar una valoración para revisar el caso.`,
      intent: "service",
      matchedService,
      matchedFaq,
    };
  }

  matchedFaq = findMatchingFaq(clientConfig, message);
  if (matchedFaq?.answer) {
    return {
      reply: matchedFaq.answer,
      intent: "faq",
      matchedService,
      matchedFaq,
    };
  }

  return {
    reply: "",
    intent: "",
    matchedService,
    matchedFaq,
  };
}

function generateLocalFallbackReply({ tenant, message, channel = "chat" }) {
  const clientConfig = normalizeClientConfig(tenant?.config?.clientConfig || {});
  const text = normalizeText(message);
  const services = clientConfig.services.join(", ");
  const leadFields = getLeadFieldsText(clientConfig);
  const configuredReply = resolveConfiguredReply({ clientConfig, message });

  if (configuredReply.reply) {
    return configuredReply.reply;
  }
  if (text.includes("quien eres") || text.includes("quién eres")) {
    return `Soy ${clientConfig.assistantName}, configurado para atender a ${clientConfig.businessName}. Puedo ayudarte con informacion, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.`;
  }

  const matchedFaq = findMatchingFaq(clientConfig, message);

  if (matchedFaq) {
    return `${matchedFaq.answer} Para canalizarte mejor, comparte ${leadFields}.`;
  }

  const matchedService = findMatchingService(clientConfig, message);

  if (matchedService || text.includes("servicio") || text.includes("informacion")) {
    return `${clientConfig.businessName} puede orientarte sobre: ${services}. Puedo canalizar tu solicitud al equipo. Que servicio te interesa?`;
  }

  if (
    text.includes("precio") ||
    text.includes("costo") ||
    text.includes("cotizacion") ||
    text.includes("cotización")
  ) {
    return `Puedo ayudarte a canalizar una cotizacion con ${clientConfig.businessName}. Para avanzar, comparte ${leadFields}.`;
  }

  if (channel === "voice") {
    return `Claro. Soy ${clientConfig.assistantName} para ${clientConfig.businessName}. Te puedo orientar y canalizar con el equipo. Que necesitas revisar?`;
  }

  const appointmentTypes = (clientConfig.appointmentTypes || []).join(", ");
  const appointmentText = appointmentTypes
    ? ` Maneja ${appointmentTypes}.`
    : "";

  return `Con gusto. ${clientConfig.businessName} atiende ${clientConfig.industry.toLowerCase()} y puede orientarte en ${services}.${appointmentText} Para ayudarte mejor, dime ${leadFields}.`;
}

async function transcribeAudioWithOpenAI(file) {
  const formData = new FormData();

  formData.append("file", file.buffer, {
    filename: file.originalname || "audio.webm",
    contentType: file.mimetype || "audio/webm",
  });

  formData.append(
    "model",
    process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"
  );
  formData.append("language", "es");

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
      timeout: 45000,
    }
  );

  return response?.data?.text?.trim() || "";
}

async function synthesizeWithElevenLabs(text, assistantId = "isis") {
  const voiceId = getVoiceIdForAssistant(assistantId);
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error("Falta configurar ElevenLabs");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3&output_format=mp3_22050_32`;

  const response = await axios.post(
    url,
    {
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.82,
        style: 0.12,
        use_speaker_boost: true,
        speed: 1.08,
      },
    },
    {
      responseType: "arraybuffer",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      timeout: 30000,
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
  leadSignal,
}) {
  const clientConfig = normalizeClientConfig(tenant?.config?.clientConfig || {});
  const systemPrompt = `${buildAssistantPrompt(assistantId, tenant)}

Canal actual: ${channel}

Instrucciones del canal:
- en voice responde como llamada real, máximo 28 palabras
- evita introducciones largas y despedidas innecesarias
- si falta contexto, pide solo lo importante
- si el mensaje es claro, avanza sin rodeos
- cuando haya interés comercial, busca el siguiente paso: nombre, WhatsApp o demo

Instrucciones de lead:
${buildLeadInstruction(clientConfig, leadSignal)}
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

  const openAIModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const openRouterModel =
    process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const configuredReply = resolveConfiguredReply({ clientConfig, message });

  if (configuredReply.reply) {
    return {
      reply: configuredReply.reply,
      providerUsed: "configured-rules",
      matchedService: configuredReply.matchedService || null,
      matchedFaq: configuredReply.matchedFaq?.question || null,
    };
  }

  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return {
      reply: generateLocalFallbackReply({ tenant, message, channel }),
      providerUsed: "local-demo-fallback",
    };
  }

  if (clientType === "mobile") {
    if (!process.env.OPENAI_API_KEY) {
      return {
        reply: generateLocalFallbackReply({ tenant, message, channel }),
        providerUsed: "local-demo-fallback",
      };
    }

    const text = await openAIResponsesText({
      model: openAIModel,
      systemPrompt,
      history: normalizedHistory,
      userMessage: message,
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

    if (!process.env.OPENAI_API_KEY) {
      return {
        reply: generateLocalFallbackReply({ tenant, message, channel }),
        providerUsed: "local-demo-fallback",
      };
    }

    try {
      const text = await openAIResponsesText({
        model: openAIModel,
        systemPrompt,
        history: normalizedHistory,
        userMessage: message,
      });

      return {
        reply: text || generateLocalFallbackReply({ tenant, message, channel }),
        providerUsed: text ? "openai-fallback" : "local-demo-fallback",
      };
    } catch (openAiError) {
      console.error(
        "Fallback local:",
        openAiError.response?.data || openAiError.message
      );
      return {
        reply: generateLocalFallbackReply({ tenant, message, channel }),
        providerUsed: "local-demo-fallback",
      };
    }
  }
}

/**
 * =========================================
 * LEADS / ACCIONES
 * =========================================
 */

async function getExistingLead(tenant, conversationId) {
  if (tenant?.isLocalDemo || mongoose.connection.readyState !== 1) {
    return null;
  }

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
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      systemPrompt,
      history: [],
      userMessage: userPrompt,
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
  if (tenant?.isLocalDemo || mongoose.connection.readyState !== 1) {
    return {
      leadSaved: false,
      webhookSent: false,
      mergedLead: {
        name: name || null,
        phone: phone || null,
        interested: Boolean(interested),
        requestedDemo: Boolean(requestedDemo),
      },
    };
  }

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
        return res
          .status(500)
          .json({ error: "Falta configurar OPENAI_API_KEY" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No se envió audio" });
      }

      const transcript = await transcribeAudioWithOpenAI(req.file);

      if (!transcript) {
        return res
          .status(422)
          .json({ error: "No se pudo transcribir el audio" });
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
    return res.send(audioBuffer);
  } catch (error) {
    console.error(
      "Error en /voice/speak:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Error generando voz" });
  }
});

app.post("/voice/correct-transcript", requireTenant, async (req, res) => {
  try {
    const { rawTranscript = "" } = req.body;
    const clientConfig = req.clientConfig || req.tenant?.config?.clientConfig;

    if (!rawTranscript.trim()) {
      return res.json({
        correctedTranscript: "",
        confidence: "low",
        detectedIntent: "empty",
        needsUserReview: true,
      });
    }

    const result = await correctTranscript({
      rawTranscript,
      clientConfig: normalizeClientConfig(clientConfig),
    });

    return res.json(result);
  } catch (error) {
    console.error(
      "Error en /voice/correct-transcript:",
      error.response?.data || error.message
    );
    return res.status(500).json({ error: "Error corrigiendo transcripcion" });
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
      conversationId: requestedConversationId,
      conversationHistory = [],
      channel = "chat",
      assistantId: requestedAssistantId,
    } = req.body;

    const tenant = req.tenant;
    const conversationId =
      requestedConversationId ||
      `client-${req.body?.clientId || tenant?.config?.clientConfig?.clientId || DEFAULT_CLIENT_ID}`;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    if (Array.isArray(conversationHistory) && conversationHistory.length) {
      clearConversationHistory(conversationId);
      conversationHistory.slice(-MAX_HISTORY_MESSAGES).forEach((item) => {
        if (!item?.content && !item?.text) return;
        appendConversationMessage(
          conversationId,
          item.role === "assistant" || item.role === "bot"
            ? "assistant"
            : "user",
          item.content || item.text
        );
      });
    }

    const previousAssistantId =
      requestedAssistantId && ASSISTANT_IDS.includes(requestedAssistantId)
        ? requestedAssistantId
        : getStoredAssistant(conversationId);
    const requestClientConfig = normalizeClientConfig(
      req.clientConfig || tenant?.config?.clientConfig || {}
    );
    const agentRuntimeConfig = getAgentConfig();
    const multiAgentVoicesEnabled =
      Boolean(requestClientConfig.features?.multiAgentVoices) &&
      agentRuntimeConfig.multiAgentVoicesEnabled;

    logBackendDebug("request-context", {
      clientId:
        req.body?.clientId ||
        req.headers["x-client-id"] ||
        req.query?.clientId ||
        requestClientConfig.clientId,
      businessName: requestClientConfig.businessName,
    });

    const offTopicResult = detectOffTopicMessage(message, requestClientConfig);
    const isOffTopic = offTopicResult.offTopic;

    logBackendDebug("offtopic-guard", {
      offTopic: offTopicResult.offTopic,
      reason: offTopicResult.reason,
    });

    if (isOffTopic) {
      const currentAssistant = getAssistantConfig(previousAssistantId);
      const reply = buildOffTopicReplyFromCurrentAssistant(previousAssistantId);
      const speak = shouldSpeakReply(reply, channel, "");

      appendConversationMessage(conversationId, "user", message);
      appendConversationMessage(conversationId, "assistant", reply);
      setStoredAssistant(conversationId, previousAssistantId);

      logBackendDebug("reply-provider", {
        providerUsed: "offtopic-guard",
        matchedService: null,
        matchedFaq: null,
      });

      return res.json({
        reply,
        ttsEnabled: speak,
        ttsText: speak ? reply : "",
        switched: false,
        transitionText: "",
        previousAssistantId,
        previousAssistantName: currentAssistant.name,
        assistantId: previousAssistantId,
        assistantName: currentAssistant.name,
        assistantColor: currentAssistant.color,
        voiceAssistant: previousAssistantId,
        detectedIntent: "offtopic",
        providerUsed: "offtopic-guard",
        clientType: detectClientType(req),
        actions: {
          leadSaved: false,
          webhookSent: false,
          mergedLead: {
            name: null,
            phone: null,
            interested: false,
            requestedDemo: false,
          },
        },
        memorySize: getConversationHistory(conversationId).length,
      });
    }

    const routing = multiAgentVoicesEnabled
      ? routeAssistant({
          message,
          currentAssistantId: previousAssistantId,
        })
      : {
          intent: detectIntentBucket(message),
          nextAssistantId: "main",
        };

    const selectedAssistantId = routing.nextAssistantId;
    const previousAssistant = getAssistantConfig(previousAssistantId);
    const selectedAssistant = getAssistantConfig(selectedAssistantId);

    const switched =
      multiAgentVoicesEnabled && previousAssistantId !== selectedAssistantId;
    const transitionText = switched
      ? buildTransitionText(previousAssistantId, selectedAssistantId)
      : "";

    const name = extractName(message);
    const phone = extractPhone(message);
    const interested = detectInterest(message);
    const requestedDemo = wantsDemo(message);
    const clientConfig = requestClientConfig;
    const leadSignal = extractLeadSignal({ message, clientConfig });

    const ai = await generateAIReply({
      tenant,
      assistantId: selectedAssistantId,
      message,
      conversationId,
      channel,
      req,
      leadSignal,
    });

    logBackendDebug("reply-provider", {
      providerUsed: ai.providerUsed,
      matchedService: ai.matchedService || null,
      matchedFaq: ai.matchedFaq || null,
    });

    const rawReply = ai.reply || "Hubo un problema al generar la respuesta.";

    const reply = transitionText
      ? `${transitionText} ${rawReply}`.trim()
      : rawReply;

    appendConversationMessage(conversationId, "user", message);
    appendConversationMessage(conversationId, "assistant", reply);
    setStoredAssistant(conversationId, selectedAssistantId);

    const actions = await handleBusinessActions({
      tenant,
      conversationId,
      message,
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
      clientId: clientConfig.clientId,
      publicClientConfig: getPublicClientConfigFromFull(clientConfig),
      audio: {
        elevenLabsActive: agentRuntimeConfig.multiAgentVoicesEnabled,
        multiAgentVoicesEnabled,
      },
      leadSignal,

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
