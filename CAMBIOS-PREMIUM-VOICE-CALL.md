# NYT Assistant - Premium Voice Call Update

## Objetivo

Esta versión estabiliza el modo conversación para que se sienta más como una llamada real:

- SpeechRecognition se inicia antes de que el usuario hable.
- El VAD ya no controla el inicio tardío de la transcripción; solo ayuda a detectar voz/silencio e interrupciones.
- El envío automático no depende de Enter, focus ni textarea.
- Se agregaron protecciones anti-loop, anti-duplicado y echo guard.
- El VAD permanece activo entre turnos y ya no se apaga después de la primera frase.
- Se cambió el cliente por defecto a `nyt-general` para que NYT Assistant no quede amarrado a CODE.

## Modo recomendado para pruebas

Primero prueba con corrección IA apagada para aislar el flujo de llamada:

```env
VITE_CLIENT_ID=nyt-general
VITE_VOICE_CONVERSATION_MODE=false
VITE_AUTO_SEND_AFTER_SILENCE=true
VITE_ENABLE_TRANSCRIPT_CORRECTION=false
VITE_CALL_DEBUG=false
```

Después, cuando el flujo esté estable, puedes prender:

```env
VITE_ENABLE_TRANSCRIPT_CORRECTION=true
```

## Ajustes de sensibilidad

Si corta demasiado rápido:

```env
VITE_VAD_SILENCE_MS=1800
```

Si tarda mucho en responder:

```env
VITE_VAD_SILENCE_MS=1000
```

Si detecta ruido como voz:

```env
VITE_VAD_ENERGY_THRESHOLD=0.035
```

Si no detecta bien tu voz:

```env
VITE_VAD_ENERGY_THRESHOLD=0.015
```

## Clientes

El cliente general por defecto es:

```txt
backend/data/clients/nyt-general.json
```

Para vender a una empresa, agrega un JSON en:

```txt
backend/data/clients/<cliente>.json
```

Y cambia:

```env
VITE_CLIENT_ID=<cliente>
DEFAULT_CLIENT_ID=<cliente>
```

## Validación hecha

- `npm run build` en frontend: OK.
- `node --check src/server.js` en backend: OK.

## Nota realista

Esta es la mejor experiencia posible sin WebRTC/STT streaming profesional. Con Web Speech API + speechSynthesis se puede lograr una demo muy vendible en Chrome/Edge, pero para una llamada premium de producción el siguiente paso sería STT streaming + TTS streaming + WebRTC.
