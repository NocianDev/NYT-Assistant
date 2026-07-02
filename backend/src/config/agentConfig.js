export function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function getAgentConfig() {
  const elevenLabsActive = isElevenLabsConfigured();

  return {
    multiAgentVoicesEnabled: elevenLabsActive,
    agents: {
      main: {
        id: "main",
        name: "NYT Assistant",
        role: "asistente principal",
        voiceId: process.env.ELEVENLABS_MAIN_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
      },
      sales: {
        id: "sales",
        name: "Alicia",
        role: "agente comercial",
        voiceId: process.env.ELEVENLABS_SALES_VOICE_ID || "",
      },
      support: {
        id: "support",
        name: "Soporte",
        role: "soporte",
        voiceId: process.env.ELEVENLABS_SUPPORT_VOICE_ID || "",
      },
      scheduling: {
        id: "scheduling",
        name: "Agenda",
        role: "agenda",
        voiceId: process.env.ELEVENLABS_SCHEDULING_VOICE_ID || "",
      },
      handoff: {
        id: "handoff",
        name: "Canalizacion humana",
        role: "handoff",
        voiceId: process.env.ELEVENLABS_MAIN_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
      },
    },
  };
}

export function getVoiceIdForAgent(agentId = "main") {
  const config = getAgentConfig();
  return config.agents[agentId]?.voiceId || config.agents.main.voiceId;
}
