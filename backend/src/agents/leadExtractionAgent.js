function hasAny(text = "", terms = []) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

export function extractLeadSignal({ message = "", clientConfig }) {
  const wantsContact = hasAny(message, [
    "agendar",
    "cita",
    "cotizar",
    "cotizacion",
    "precio",
    "contacto",
    "whatsapp",
    "reservar",
    "informacion",
    "información",
    "hablar con",
  ]);

  const missingFields = (clientConfig.leadFields || []).slice(0, 3);

  let suggestedNextAction =
    clientConfig?.handoff?.instructions || "Canalizar al equipo humano.";

  if (/legal|abogado|contrato|mercantil/i.test(clientConfig.industry)) {
    suggestedNextAction = "Canalizar con un abogado para revision profesional.";
  } else if (/logistica|transporte/i.test(clientConfig.industry)) {
    suggestedNextAction = "Solicitar origen, destino, tipo de carga y fecha.";
  } else if (/restaurante/i.test(clientConfig.industry)) {
    suggestedNextAction = "Solicitar fecha, numero de personas y contacto.";
  } else if (/dental|clinica|salud/i.test(clientConfig.industry)) {
    suggestedNextAction = "Recomendar valoracion profesional y pedir datos de contacto.";
  }

  return {
    interested: wantsContact,
    missingFields,
    suggestedNextAction,
    summaryTemplate: [
      "Nuevo prospecto:",
      ...clientConfig.leadFields.map((field) => `${field}:`),
      `Siguiente accion sugerida: ${suggestedNextAction}`,
    ].join("\n"),
  };
}

export function buildLeadInstruction(clientConfig, leadSignal) {
  if (!leadSignal?.interested) {
    return "Si el usuario muestra interes, recopila datos de lead de forma gradual.";
  }

  return `
El usuario parece prospecto. Pide de forma natural solo el siguiente dato util.
Campos esperados:
${clientConfig.leadFields.map((field) => `- ${field}`).join("\n")}
Siguiente accion sugerida: ${leadSignal.suggestedNextAction}
No pidas todos los datos de golpe salvo que el usuario ya quiera canalizacion inmediata.
`;
}
