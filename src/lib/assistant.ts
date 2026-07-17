// Cliente del asistente interno con Claude.
// Habla con la Edge Function "claude-chat" (que guarda la API key como secreto).
// El JWT del usuario logueado viaja solo: supabase.functions.invoke lo adjunta.
import { supabase } from "./supabase";

export type AssistantRole = "user" | "assistant";
export type AssistantMessage = { role: AssistantRole; content: string };

export type AssistantReply = {
  text: string;
  model: string;
  usage: unknown;
};

// Envia el historial de conversacion y devuelve la respuesta de Claude.
// `history` son los turnos previos; `content` es el mensaje nuevo del usuario;
// `context` es la foto en vivo del sistema (se suma a la personalidad del asistente,
// no la reemplaza).
export async function askAssistant(
  history: AssistantMessage[],
  content: string,
  context?: string,
): Promise<AssistantReply> {
  const messages: AssistantMessage[] = [
    ...history,
    { role: "user", content },
  ];

  const { data, error } = await supabase.functions.invoke("claude-chat", {
    body: { messages, ...(context ? { context } : {}) },
  });

  if (error) {
    throw new Error(
      "No se pudo hablar con el asistente: " + (error.message ?? String(error)),
    );
  }
  if (data?.error) {
    throw new Error("El asistente devolvio un error: " + data.error);
  }

  return data as AssistantReply;
}
