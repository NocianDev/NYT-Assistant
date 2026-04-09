import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import Lead from "./models/Lead.js";
import Tenant from "./models/Tenant.js";

dotenv.config();

console.log("MONGODB_URI existe:", !!process.env.MONGODB_URI);

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("Mongo conectado"))
  .catch((err) => console.error("Error conectando Mongo:", err));

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hoy-mismo-assitant.vercel.app",
  "https://hoymismo-assitant.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Origen bloqueado por CORS:", origin);
      return callback(new Error(`CORS bloqueado para: ${origin}`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-password", "x-tenant-id"],
    credentials: false,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend OK");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

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
    "coste",
    "costo",
    "me interesa",
    "información",
    "informacion",
    "quiero una página",
    "quiero una pagina",
    "quiero una web",
    "quiero contratar",
    "contratar",
    "servicio",
    "página web",
    "pagina web",
    "chatbot",
    "automatización",
    "automatizacion",
    "asistente virtual",
    "ia",
  ].some((term) => lower.includes(term));
}

async function requireTenant(req, res, next) {
  try {
    const tenantId =
      req.headers["x-tenant-id"] ||
      req.body.tenantId ||
      req.query.tenantId;

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

function buildPromptByTenant(tenant) {
  const tone = tenant?.config?.tone || "mixto";

  if (tone === "salud") {
    return `
Eres un asistente virtual profesional para una institución de salud.

Tu función es:
- orientar usuarios
- resolver dudas frecuentes
- ayudar con información clara
- mantener un tono serio, respetuoso y profesional

Reglas:
- nunca digas que eres una IA
- responde en máximo 1–3 líneas
- evita vender de forma agresiva
- enfócate en orientación, confianza y claridad
- si detectas interés real en implementar una solución, pide datos de contacto con naturalidad

Meta:
Ayudar primero, transmitir confianza y guiar al siguiente paso cuando sea adecuado.
`;
  }

  if (tone === "ventas") {
    return `
Eres un asesor comercial de una empresa de tecnología.

Tu objetivo es:
- atender clientes
- generar confianza
- detectar interés
- llevar a la conversación hacia contacto o cotización

Reglas:
- nunca digas que eres una IA
- responde en máximo 1–3 líneas
- sé directo, natural y comercial
- pide nombre y WhatsApp cuando detectes oportunidad clara
- evita respuestas largas

Meta:
Convertir conversaciones en leads reales.
`;
  }

  return `
Eres un asesor comercial y asistente virtual de una empresa de tecnología.

Tu función es:
- ayudar a usuarios
- resolver dudas
- detectar oportunidades
- convertir interesados en clientes

Servicios:
- páginas web profesionales
- chatbots
- automatización
- asistentes virtuales con IA
- soluciones digitales para empresas, clínicas, hospitales y negocios

PERSONALIDAD:
- humano, claro y profesional
- cercano pero confiable
- directo, sin rodeos
- adaptable según el tipo de usuario

REGLAS:
- nunca digas que eres una IA
- responde en máximo 1–3 líneas
- evita respuestas largas
- no uses lenguaje técnico innecesario
- siempre guía la conversación

MODO INTELIGENTE:
- si el usuario solo pregunta, ayuda sin presionar
- si detectas interés comercial, guía a contacto
- si es un sector sensible como salud, usa un tono más serio y respetuoso
- si ya compartió datos, agradece y profundiza necesidad
- si duda, genera confianza sin presionar

OBJETIVO FINAL:
Siempre que sea natural:
- obtener nombre
- obtener WhatsApp
- entender necesidad
- avanzar hacia cotización o contacto

META:
Ayudar primero.
Adaptarse al usuario.
Y convertir cuando sea el momento correcto.
`;
}

app.post("/chat", requireTenant, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const tenant = req.tenant;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Falta conversationId" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res
        .status(500)
        .json({ error: "Falta configurar OPENROUTER_API_KEY" });
    }

    const phone = extractPhone(message);
    const name = extractName(message);
    const interested = detectInterest(message);

    if (phone || name || interested) {
      await Lead.updateOne(
        { tenantId: tenant.apiKey, conversationId },
        {
          $setOnInsert: {
            tenantId: tenant.apiKey,
            conversationId,
            createdAt: new Date(),
          },
          $set: {
            name,
            phone,
            interested,
            updatedAt: new Date(),
          },
          $addToSet: { messages: message },
        },
        { upsert: true }
      );
    }

    const systemPrompt = buildPromptByTenant(tenant);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply =
      response?.data?.choices?.[0]?.message?.content ||
      "Hubo un problema al generar la respuesta.";

    return res.json({ reply });
  } catch (error) {
    console.error("Error en /chat:", error.response?.data || error.message);
    return res.status(500).json({ error: "Error en IA" });
  }
});

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