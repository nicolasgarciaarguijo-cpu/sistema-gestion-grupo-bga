import { SEMAPHORE_PALETTE, type SemaphoreLevel } from "../ui/theme";

// Semaforo de estado por urgencia de fecha (verde = bien, amarillo = mas o menos, rojo = complicado).
// Semantica de ESTADO (no de empresa): verde si esta hecho o con margen; amarillo si vence pronto;
// rojo si esta vencido. Reutilizable para cobros, pagos y fechas.
const SEMAPHORE_SOON_DAYS = 7;
const daysUntilDate = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};
// Mes corto "mmm aaaa" de una fecha, para ubicar el origen de un problema que perdura.
const monthShortLabel = (dateStr: string): string => {
  if (!dateStr || !/^\d{4}-\d{2}/.test(dateStr)) return "";
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  const name = new Date(y, (m || 1) - 1, 1)
    .toLocaleDateString("es-AR", { month: "short" })
    .replace(".", "");
  return `${name} ${y}`;
};

// Antiguedad legible y CONSISTENTE de una fecha ya pasada: dias si es reciente, meses + mes de
// origen si perdura. Corto: "hace 5 d". Persistente: "en mar 2026 - hace 3 meses". "" si no aplica
// (fecha invalida o todavia no paso). Se usa en todos los semaforos con fecha para que sea igual.
const agingPhrase = (dateStr: string): string => {
  const days = daysUntilDate(dateStr);
  if (days === null || days >= 0) return "";
  const past = Math.abs(days);
  if (past < 31) return `hace ${past} d`;
  const months = Math.max(1, Math.round(past / 30.44));
  return `en ${monthShortLabel(dateStr)} - hace ${months} ${months === 1 ? "mes" : "meses"}`;
};

// Tiempo transcurrido desde una fecha de carga/modificacion. SIEMPRE devuelve texto (incluido "hoy"),
// para que el semaforo aclare a que fecha se refiere el "hace cuanto". "" solo si la fecha es invalida.
const elapsedPhrase = (dateStr: string): string => {
  const days = daysUntilDate(dateStr);
  if (days === null) return "";
  const past = Math.max(0, -days);
  if (past === 0) return "hoy";
  if (past < 31) return `hace ${past} d`;
  const months = Math.max(1, Math.round(past / 30.44));
  return `hace ${months} ${months === 1 ? "mes" : "meses"} (${monthShortLabel(dateStr)})`;
};

const getDateSemaphore = (
  dateStr: string,
  done: boolean,
  doneLabel = "hecho"
): { level: SemaphoreLevel; color: string; soft: string; label: string } => {
  if (done) return { level: "verde", ...SEMAPHORE_PALETTE.verde, label: doneLabel };
  const days = daysUntilDate(dateStr);
  if (days === null) return { level: "amarillo", ...SEMAPHORE_PALETTE.amarillo, label: "sin fecha" };
  if (days < 0)
    return { level: "rojo", ...SEMAPHORE_PALETTE.rojo, label: `vencio ${agingPhrase(dateStr)}` };
  if (days <= SEMAPHORE_SOON_DAYS)
    return {
      level: "amarillo",
      ...SEMAPHORE_PALETTE.amarillo,
      label: days === 0 ? "vence hoy" : `vence en ${days} d`,
    };
  return { level: "verde", ...SEMAPHORE_PALETTE.verde, label: `en ${days} d` };
};

// Semaforo de un trabajo aprobado: rojo si falta fecha de inicio (dato critico),
// verde si finalizado, amarillo si en curso/pendiente.
const getJobSemaphore = (job: {
  startDate?: string;
  executionStatus?: string;
}): { level: SemaphoreLevel; label: string } => {
  if (!job.startDate) return { level: "rojo", label: "sin fecha de inicio" };
  if (job.executionStatus === "finalizado") return { level: "verde", label: "finalizado" };
  const since = monthShortLabel(job.startDate);
  if (job.executionStatus === "en_curso")
    return { level: "amarillo", label: since ? `en curso (desde ${since})` : "en curso" };
  return { level: "amarillo", label: since ? `pendiente (desde ${since})` : "pendiente" };
};

// Semaforo de un presupuesto del historial: aprobado=verde, no aprobado=rojo, y si sigue
// en borrador/pendiente, vencido (paso la validez) = rojo, vigente = amarillo.
const getBudgetSemaphore = (budget: {
  status?: string;
  date?: string;
  snapshot?: { budget?: { validity?: string } };
}): { level: SemaphoreLevel; label: string } => {
  if (budget.status === "aprobado") return { level: "verde", label: "aprobado" };
  if (budget.status === "no_aprobado") return { level: "rojo", label: "no aprobado" };
  const validityDays = Number(/(\d+)/.exec(budget.snapshot?.budget?.validity || "")?.[1] || 0);
  if (validityDays > 0 && budget.date) {
    const [y, m, d] = budget.date.slice(0, 10).split("-").map(Number);
    if (y && m && d) {
      const venc = new Date(y, m - 1, d + validityDays);
      const vencStr = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}-${String(
        venc.getDate()
      ).padStart(2, "0")}`;
      const left = daysUntilDate(vencStr);
      if (left !== null && left < 0)
        return { level: "rojo", label: `vencido ${agingPhrase(vencStr)}`.trim() };
    }
  }
  return { level: "amarillo", label: "vigente" };
};

// Semaforo de facturacion/cobranza de UN trabajo: avisa que falta para evitar errores.
// - needsInvoice: el neto facturado real es menor al comprometido (billedPct) -> falta emitir/completar factura.
// - needsCollect: queda saldo por cobrar.
// Nivel: verde = al dia; amarillo = falta algo pero sigue en curso; rojo = finalizado y todavia falta
// (factura o cobranza pendiente en un trabajo cerrado = error a corregir).
const getJobBillingSemaphore = (job: {
  billedNetTarget: number;
  billedNetReal: number;
  invoicesCount: number;
  remainingToPay: number;
  executionStatus?: string;
}): {
  level: SemaphoreLevel;
  label: string;
  needsInvoice: boolean;
  needsCollect: boolean;
} => {
  const TOL = 1; // tolerancia de $1 para no marcar por redondeos
  const needsInvoice =
    job.invoicesCount === 0
      ? job.billedNetTarget > TOL
      : job.billedNetReal + TOL < job.billedNetTarget;
  const needsCollect = job.remainingToPay > TOL;
  const finished = job.executionStatus === "finalizado";
  if (!needsInvoice && !needsCollect) {
    return { level: "verde", label: "al dia", needsInvoice, needsCollect };
  }
  const parts: string[] = [];
  if (needsInvoice) parts.push("facturar");
  if (needsCollect) parts.push("cobrar");
  const what = parts.join(" y ");
  if (finished) {
    return { level: "rojo", label: `finalizado: falta ${what}`, needsInvoice, needsCollect };
  }
  return { level: "amarillo", label: `falta ${what}`, needsInvoice, needsCollect };
};

// Semaforo de stock/faltante de un material: verde cubierto, amarillo parcial, rojo faltante total.
const getStockSemaphore = (row: {
  available: number;
  missing: number;
}): { level: SemaphoreLevel; label: string } => {
  if (Number(row.missing) <= 0) return { level: "verde", label: "cubierto" };
  if (Number(row.available) > 0) return { level: "amarillo", label: "parcial" };
  return { level: "rojo", label: "faltante" };
};

// Semaforo de un fondo de caja chica: rojo si se agoto el saldo, amarillo si queda poco (<20%).
// Semaforo de un cliente del CRM: rojo si no hay CUIT ni contacto, amarillo si falta uno, verde completo.
const getClientSemaphore = (row: {
  clientTaxId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): { level: SemaphoreLevel; label: string } => {
  const hasTax = !!(row.clientTaxId || "").trim();
  const hasContact = !!(
    (row.contactName || "").trim() ||
    (row.contactPhone || "").trim() ||
    (row.contactEmail || "").trim()
  );
  if (!hasTax && !hasContact) return { level: "rojo", label: "sin CUIT ni contacto" };
  if (!hasTax || !hasContact) return { level: "amarillo", label: "datos incompletos" };
  return { level: "verde", label: "datos completos" };
};

export {
  daysUntilDate,
  monthShortLabel,
  agingPhrase,
  elapsedPhrase,
  getDateSemaphore,
  getJobSemaphore,
  getJobBillingSemaphore,
  getBudgetSemaphore,
  getStockSemaphore,
  getClientSemaphore,
};
