import axios from "axios";

function cleanFallbackText(text = "") {
  const commonFixes = [
    [/\bbrakets\b/gi, "brackets"],
    [/\bbracket\b/gi, "brackets"],
    [/\bwhats app\b/gi, "WhatsApp"],
    [/\bwasap\b/gi, "WhatsApp"],
    [/\binfo\b/gi, "informacion"],
  ];

  let cleaned = text.replace(/\s+/g, " ").trim();

  for (const [pattern, replacement] of commonFixes) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  if (!cleaned) return "";

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  if (!/[.!?]$/.test(cleaned)) {
    cleaned += cleaned.match(/^(que|cuanto|cuando|donde|como|quiero saber)/i)
      ? "?"
      : ".";
  }

  return cleaned;
}

function detectIntent(text = "") {
  const lower = text.toLowerCase();
  if (/precio|costo|cuanto|cotiz/.test(lower)) return "ask_price";
  if (/agenda|cita|reserv|horario/.test(lower)) return "schedule";
  if (/servicio|bracket|contrato|flete|menu|menú/.test(lower)) {
    return "ask_service_info";
  }
  if (/whatsapp|contacto|llamar|equipo/.test(lower)) return "handoff";
  return "general";
}

function getLocalCorrection(rawTranscript = "") {
  const correctedTranscript = cleanFallbackText(rawTranscript);
  const wordCount = correctedTranscript.split(/\s+/).filter(Boolean).length;
  const needsUserReview = wordCount < 3 || correctedTranscript.length < 8;

  return {
    correctedTranscript,
    confidence: needsUserReview ? "low" : "medium",
    detectedIntent: detectIntent(correctedTranscript),
    needsUserReview,
    providerUsed: "local-fallback",
  };
}

function safeJsonParse(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

export async function correctTranscript({ rawTranscript, clientConfig }) {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      correctedTranscript: "",
      confidence: "low",
      detectedIntent: "empty",
      needsUserReview: true,
      providerUsed: "empty",
    };
  }

  if (!process.env.OPENAI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return getLocalCorrection(rawTranscript);
  }

  const systemPrompt = `
Eres un corrector de transcripciones de voz para NYT Assistant.
Cliente: ${clientConfig.businessName}
Industria: ${clientConfig.industry}

Reglas:
- No inventes informacion.
- No cambies el sentido del usuario.
- Corrige puntuacion, ortografia, estructura y claridad.
- Conserva idioma espanol.
- Si el texto parece incompleto, needsUserReview=true.
- Si hay baja confianza, confidence="low".
Devuelve solo JSON con correctedTranscript, confidence, detectedIntent, needsUserReview.
`;

  try {
    if (process.env.OPENROUTER_API_KEY) {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: rawTranscript },
          ],
          temperature: 0.1,
          max_tokens: 160,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "X-Title": "NYT Assistant Speech Correction",
          },
          timeout: 18000,
        },
      );

      const text = response?.data?.choices?.[0]?.message?.content || "";
      return {
        ...getLocalCorrection(rawTranscript),
        ...safeJsonParse(text),
        providerUsed: "openrouter",
      };
    }

    const response = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: rawTranscript }],
          },
        ],
        max_output_tokens: 160,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 18000,
      },
    );

    const text =
      response?.data?.output_text ||
      response?.data?.output?.[0]?.content?.[0]?.text ||
      "";

    return {
      ...getLocalCorrection(rawTranscript),
      ...safeJsonParse(text),
      providerUsed: "openai",
    };
  } catch (error) {
    console.error("Speech correction fallback:", error.response?.data || error.message);
    return getLocalCorrection(rawTranscript);
  }
}
