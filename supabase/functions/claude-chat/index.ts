// Edge Function: asistente interno con Claude (Anthropic) para el SISTEMA.
//
// La API key vive SOLO como secreto en Supabase (Deno.env), nunca en el frontend.
// El frontend le pega a esta funcion con supabase.functions.invoke("claude-chat", ...),
// que adjunta el JWT del usuario; con verify_jwt=true solo usuarios logueados pueden usarla.
//
// Body esperado (JSON):
//   { messages: [{ role: "user" | "assistant", content: string }, ...],
//     context?: string,   // foto en vivo del sistema, se suma al system prompt
//     system?: string }   // reemplaza la personalidad por defecto (opcional)
// Respuesta:
//   { text: string, model: string, usage: {...} }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
// Modelo por defecto: Opus 4.8 (el mas capaz). Para bajar costo se puede setear el
// secreto ANTHROPIC_MODEL = "claude-sonnet-5" (o "claude-haiku-4-5") sin tocar codigo.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

const SYSTEM_PROMPT_DEFAULT = [
  "Sos el asistente interno del sistema de gestion de Grupo BGA (un ERP web multiempresa).",
  "Las dos empresas son BGA (color azul) y De Raiz (color marron); 'General' aplica a ambas.",
  "Respondes en espanol rioplatense, de forma clara y concisa, orientada a la gestion:",
  "presupuestos, facturacion, compras, caja chica, stock, personal y CRM.",
  "Si no tenes datos suficientes para responder con certeza, decilo y pedi la aclaracion.",
  "No inventes numeros ni montos: si el usuario no los dio, preguntalos.",
].join(" ");

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido. Usar POST." }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json(
      { error: "Falta el secreto ANTHROPIC_API_KEY en el proyecto Supabase." },
      500,
    );
  }

  let payload: { messages?: unknown; system?: unknown; context?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body invalido: se esperaba JSON." }, 400);
  }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(
      { error: "Falta 'messages' (array con al menos un mensaje)." },
      400,
    );
  }

  const basePrompt =
    typeof payload.system === "string" && payload.system.trim().length > 0
      ? payload.system
      : SYSTEM_PROMPT_DEFAULT;

  // El contexto (estado en vivo del sistema) se SUMA a la personalidad, no la pisa.
  const system =
    typeof payload.context === "string" && payload.context.trim().length > 0
      ? `${basePrompt}\n\n${payload.context}`
      : basePrompt;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Propaga el error de Anthropic (sin exponer la key)
      return json(
        {
          error: "Error de la API de Anthropic.",
          detail: data?.error?.message ?? data,
        },
        resp.status,
      );
    }

    const text = Array.isArray(data.content)
      ? data.content
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("")
      : "";

    return json({ text, model: data.model ?? MODEL, usage: data.usage ?? null });
  } catch (err) {
    return json(
      { error: "No se pudo contactar a la API de Anthropic.", detail: String(err) },
      502,
    );
  }
});
