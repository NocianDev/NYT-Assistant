import { audioProviderConfig } from "./audioProvider";

type SpeakWithBackendParams = {
  text: string;
  assistantId?: string;
  clientType?: "mobile" | "desktop";
};

export async function speakWithBackendElevenLabs({
  text,
  assistantId = "isis",
  clientType = "desktop",
}: SpeakWithBackendParams): Promise<Blob> {
  const response = await fetch(`${audioProviderConfig.apiUrl}/voice/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": audioProviderConfig.tenantId,
      "x-client-type": clientType,
    },
    body: JSON.stringify({
      text,
      tenantId: audioProviderConfig.tenantId,
      assistantId,
      clientType,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs backend no disponible (${response.status})`);
  }

  return response.blob();
}

export async function speakWithDirectElevenLabs(text: string): Promise<Blob> {
  const { elevenLabsApiKey, elevenLabsVoiceId } = audioProviderConfig;

  if (!elevenLabsApiKey || !elevenLabsVoiceId) {
    throw new Error("Falta VITE_ELEVENLABS_API_KEY o VITE_ELEVENLABS_VOICE_ID");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}?output_format=mp3_22050_32`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.8,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs directo no disponible (${response.status})`);
  }

  return response.blob();
}

export async function playAudioBlob(blob: Blob) {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error("No se pudo reproducir audio"));
      audio.play().catch(reject);
    });
  } finally {
    URL.revokeObjectURL(audioUrl);
  }
}
