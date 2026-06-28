import type { SemaphoreLevel } from "../ui/theme";
import type { PettyCashExpense } from "./types";

// Una compra de caja chica es "blanca" si tiene factura o comprobante adjunto;
// si no, es "negra". Pura: no depende de estado.
export const getPettyCashAdministration = (
  expense: Pick<PettyCashExpense, "invoiceNumber" | "attachmentName">
) =>
  String(expense.invoiceNumber || "").trim() ||
  String(expense.attachmentName || "").trim()
    ? "blanco"
    : "negro";

// Semaforo de saldo de una caja chica: rojo si esta agotada, amarillo si esta
// por debajo del 20% de lo asignado, verde si tiene saldo. Pura.
export const getFundSemaphore = (
  remaining: number,
  assigned: number
): { level: SemaphoreLevel; label: string } => {
  if (Number(remaining) <= 0) return { level: "rojo", label: "saldo agotado" };
  if (Number(assigned) > 0 && Number(remaining) < Number(assigned) * 0.2)
    return { level: "amarillo", label: "saldo bajo" };
  return { level: "verde", label: "con saldo" };
};
