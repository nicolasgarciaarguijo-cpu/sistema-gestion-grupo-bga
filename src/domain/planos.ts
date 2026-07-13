// Estado de los planos de fabricacion de un trabajo aprobado. Tres estados (idea del usuario):
//   - "sin"     : no hay ningun archivo de plano cargado.
//   - "proceso" : hay archivos, pero el usuario todavia NO confirmo que esten terminados. El sistema
//                 no puede saber si estan completos (puede haber 20 planos y faltar 5 en un archivo),
//                 asi que espera la confirmacion. Aparece como "planos sin confirmar".
//   - "listo"   : el usuario confirmo (planosConfirmedAt cargado).
// El semaforo se mide contra la FECHA DE INICIO DE FABRICACION (startDate): sin planos (ni compras)
// la fabrica no arranca, asi que ese es el deadline real, no la entrega.
import type { ApprovedJob } from "./types";

export type PlanoLevel = "sin" | "proceso" | "listo";
export type PlanoTone = "red" | "yellow" | "green";

type PlanoJob = Pick<
  ApprovedJob,
  "workFiles" | "planosConfirmedAt" | "startDate" | "executionStatus"
>;

export function planoFileCount(job: Pick<ApprovedJob, "workFiles">): number {
  return (job.workFiles || []).filter((f) => f.kind === "plano").length;
}

export function getPlanoLevel(
  job: Pick<ApprovedJob, "workFiles" | "planosConfirmedAt">
): PlanoLevel {
  if (job.planosConfirmedAt) return "listo";
  if (planoFileCount(job) > 0) return "proceso";
  return "sin";
}

// Dias desde hoy hasta una fecha ISO (AAAA-MM-DD). Negativo = ya paso. null si falta la fecha.
export function daysUntil(dateIso: string, todayIso: string): number | null {
  if (!dateIso || !todayIso) return null;
  const d = Date.parse(`${dateIso.slice(0, 10)}T00:00:00`);
  const t = Date.parse(`${todayIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d) || Number.isNaN(t)) return null;
  return Math.round((d - t) / 86400000);
}

export type PlanoSemaphore = {
  level: PlanoLevel;
  tone: PlanoTone;
  label: string;
  fileCount: number;
  daysToStart: number | null; // dias hasta el inicio de fabricacion
  overdue: boolean; // no esta listo y el inicio de fabricacion ya paso
};

export function getPlanoSemaphore(job: PlanoJob, todayIso: string): PlanoSemaphore {
  const level = getPlanoLevel(job);
  const fileCount = planoFileCount(job);
  const daysToStart = daysUntil(job.startDate, todayIso);
  const done = level === "listo";
  const overdue = !done && daysToStart !== null && daysToStart < 0;
  const tone: PlanoTone = done ? "green" : level === "proceso" ? "yellow" : "red";
  const label = done
    ? "Planos listos"
    : level === "proceso"
    ? "Planos sin confirmar"
    : "Sin planos";
  return { level, tone, label, fileCount, daysToStart, overdue };
}

// Un trabajo esta "pendiente de planos" si no esta finalizado y sus planos no estan listos (sin o en
// proceso). Es lo que alimenta el panel y el reporte de recordatorio.
export function isPlanoPending(
  job: Pick<ApprovedJob, "workFiles" | "planosConfirmedAt" | "executionStatus">
): boolean {
  return job.executionStatus !== "finalizado" && getPlanoLevel(job) !== "listo";
}

// Ordena los pendientes por urgencia: primero los vencidos / mas proximos al inicio de fabricacion.
// Los que no tienen fecha de inicio van al final.
export function comparePlanoUrgency(
  a: PlanoSemaphore,
  b: PlanoSemaphore
): number {
  const av = a.daysToStart === null ? Number.POSITIVE_INFINITY : a.daysToStart;
  const bv = b.daysToStart === null ? Number.POSITIVE_INFINITY : b.daysToStart;
  return av - bv;
}
