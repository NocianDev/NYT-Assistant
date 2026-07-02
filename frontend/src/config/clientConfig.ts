import { audioProviderConfig } from "../audio/audioProvider";

export type PublicClientConfig = {
  clientId: string;
  businessName: string;
  industry: string;
  assistantName: string;
  publicWelcomeMessage: string;
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  enabledFeatures: {
    voice: boolean;
    leadCapture: boolean;
    multiAgentVoices: boolean;
  };
  audio?: {
    elevenLabsActive: boolean;
    multiAgentVoicesEnabled: boolean;
  };
};

export const fallbackPublicClientConfig: PublicClientConfig = {
  clientId: audioProviderConfig.clientId,
  businessName: "Cliente Demo NYT",
  industry: "Negocio",
  assistantName: "NYT Assistant",
  publicWelcomeMessage:
    "Soy NYT Assistant, configurado para atender a este negocio. Puedo ayudarte con informacion, servicios, preguntas frecuentes y canalizar tu solicitud al equipo.",
  theme: {
    primaryColor: "#111827",
    accentColor: "#dc2626",
  },
  enabledFeatures: {
    voice: true,
    leadCapture: true,
    multiAgentVoices: false,
  },
  audio: {
    elevenLabsActive: false,
    multiAgentVoicesEnabled: false,
  },
};

export function buildAssistantIntro(
  config: PublicClientConfig = fallbackPublicClientConfig,
) {
  return config.publicWelcomeMessage;
}

export async function fetchPublicClientConfig(
  clientId = audioProviderConfig.clientId,
) {
  const response = await fetch(
    `${audioProviderConfig.apiUrl}/client/public-config/${clientId}`,
  );

  if (!response.ok) {
    throw new Error(`No se pudo cargar cliente ${clientId}`);
  }

  return (await response.json()) as PublicClientConfig;
}
