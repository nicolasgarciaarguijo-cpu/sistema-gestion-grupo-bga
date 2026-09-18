// Bajas de personal. Un empleado dado de baja NO se borra: queda con fecha y motivo de baja, sale de
// la nomina (y de todo lo que se calcula hacia adelante) y pasa a la seccion "Bajas", donde se puede
// abrir su ficha, imprimir sus recibos o reincorporarlo.
//
// Regla del mes: la baja no borra el pasado. Para lo que se calcula POR MES (liquidacion, costo por
// categoria, impacto por empresa) el empleado sigue contando en los meses en los que trabajo, hasta
// el mes de la baja inclusive. Del mes siguiente en adelante ya no suma.

import type { Employee } from "./types";

export type TerminationReason =
  | "renuncia"
  | "despido_sin_causa"
  | "despido_con_causa"
  | "fin_de_contrato"
  | "mutuo_acuerdo"
  | "abandono"
  | "jubilacion"
  | "fallecimiento"
  | "otro";

export const TERMINATION_REASON_OPTIONS: { value: TerminationReason; label: string }[] = [
  { value: "renuncia", label: "Renuncia" },
  { value: "despido_sin_causa", label: "Despido sin causa" },
  { value: "despido_con_causa", label: "Despido con causa" },
  { value: "fin_de_contrato", label: "Fin de contrato" },
  { value: "mutuo_acuerdo", label: "Mutuo acuerdo (art. 241)" },
  { value: "abandono", label: "Abandono de trabajo" },
  { value: "jubilacion", label: "Jubilacion" },
  { value: "fallecimiento", label: "Fallecimiento" },
  { value: "otro", label: "Otro" },
];

export const terminationReasonLabel = (reason?: string): string =>
  TERMINATION_REASON_OPTIONS.find((o) => o.value === reason)?.label || "Sin motivo";

// Activo = sin fecha de baja. La fecha es el unico dato que define el estado (el motivo es informativo).
export const isEmployeeActive = (employee: Pick<Employee, "terminationDate">): boolean =>
  !String(employee.terminationDate || "").trim();

export const isEmployeeTerminated = (employee: Pick<Employee, "terminationDate">): boolean =>
  !isEmployeeActive(employee);

// "yyyy-mm" del mes de la baja ("" si sigue activo).
export const terminationMonth = (employee: Pick<Employee, "terminationDate">): string =>
  String(employee.terminationDate || "").slice(0, 7);

// ¿Estuvo en la nomina durante ese mes? Sirve para no romper la liquidacion del mes en que se fue.
export const wasEmployedInMonth = (
  employee: Pick<Employee, "terminationDate" | "hireDate">,
  month: string
): boolean => {
  const target = String(month || "").slice(0, 7);
  if (!target) return isEmployeeActive(employee);
  const hire = String(employee.hireDate || "").slice(0, 7);
  if (hire && hire > target) return false;
  const end = terminationMonth(employee);
  if (!end) return true;
  return end >= target;
};

// Antiguedad en anios cumplidos entre ingreso y baja (para el legajo historico). Null si falta algun dato.
export const employedYears = (
  employee: Pick<Employee, "terminationDate" | "hireDate">
): number | null => {
  const hire = String(employee.hireDate || "").trim();
  const end = String(employee.terminationDate || "").trim();
  if (!hire || !end || end < hire) return null;
  const [hy, hm, hd] = hire.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let years = ey - hy;
  if (em < hm || (em === hm && ed < hd)) years -= 1;
  return Math.max(0, years);
};
