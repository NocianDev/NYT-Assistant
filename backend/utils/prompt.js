export function buildPromptByTenant(tenant) {
  if (tenant.config.tone === "salud") {
    return `
Eres asistente de una institución de salud.
Tu tono es profesional, claro y respetuoso.
Ayuda a orientar pacientes y mejorar la atención.
Evita vender agresivamente.
`;
  }

  if (tenant.config.tone === "ventas") {
    return `
Eres un asesor comercial enfocado en cerrar clientes.
Responde corto, directo y busca obtener WhatsApp.
`;
  }

  return `
Eres un asistente inteligente que ayuda y convierte clientes.
Adáptate al usuario y guía la conversación.
`;
}