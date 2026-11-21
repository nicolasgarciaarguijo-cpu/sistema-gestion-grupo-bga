// Escritura y lectura del HISTORIAL DE CAMBIOS (tabla `registro_cambios` de Supabase). La regla de que se anota
// esta en domain/historialCambios.ts. La tabla solo crece: cada cambio es una fila nueva, asi que dos sesiones a
// la vez no se pisan. Si el guardado falla (sin conexion, sesion vencida) NO se frena el trabajo: el historial es
// un registro, no una condicion para cargar.
import { supabase } from "./supabase";
import type { CambioDeRegistro } from "../domain/historialCambios";

export type FilaHistorial = {
  id: number;
  creado_en: string;
  usuario: string;
  company: string;
  coleccion: string;
  ref_id: string;
  padre_id: string | null;
  hijo: string | null;
  accion: "alta" | "cambio" | "baja";
  resumen: string;
  cambios: Array<{ campo: string; antes: string; despues: string }>;
};

export async function guardarCambios(cambios: CambioDeRegistro[], usuario: string): Promise<boolean> {
  if (!cambios.length) return true;
  try {
    const { error } = await supabase.from("registro_cambios").insert(
      cambios.map((c) => ({
        usuario,
        company: c.company || "",
        coleccion: c.coleccion,
        ref_id: c.refId,
        padre_id: c.padreId ?? null,
        hijo: c.hijo ?? null,
        accion: c.accion,
        resumen: String(c.resumen || "").slice(0, 300),
        cambios: c.cambios.slice(0, 40),
      }))
    );
    if (error) console.warn("[historial] no se pudo guardar:", error.message);
    return !error;
  } catch (err) {
    console.warn("[historial] no se pudo guardar:", err);
    return false;
  }
}

export async function leerHistorial(opciones: { limite?: number; texto?: string; coleccion?: string; refId?: string } = {}): Promise<FilaHistorial[]> {
  let q = supabase.from("registro_cambios").select("id, creado_en, usuario, company, coleccion, ref_id, padre_id, hijo, accion, resumen, cambios").order("creado_en", { ascending: false }).limit(opciones.limite || 200);
  if (opciones.coleccion) q = q.eq("coleccion", opciones.coleccion);
  if (opciones.refId) q = q.eq("ref_id", opciones.refId);
  const texto = String(opciones.texto || "").trim().replace(/[%,()]/g, " ");
  if (texto) q = q.or(`resumen.ilike.%${texto}%,usuario.ilike.%${texto}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as FilaHistorial[];
}
