// Motor de "completitud" de un movimiento bancario (Fase 1 de la conciliación).
// Una sola verdad: dado un movimiento, dice QUÉ le falta para estar completo. De acá sale la pill "D"
// (falta completar) en la UI, sin decidirlo a mano pantalla por pantalla.
//
// Regla:
//  - Sin `assignedKind` => sin asignar => falta TODO (no se sabe de dónde viene / a dónde va).
//  - cobro/pago => tiene que apuntar a un trabajo (assignedJobBudget) o a un tercero (assignedParty),
//    y definir blanco/negro.
//  - interno/aporte/impuesto/otro => con elegir el tipo alcanza ("ya tiene un lugar").
import type { BankStatementEntry } from "./types";

export type BankAssignable = Pick<
  BankStatementEntry,
  "assignedKind" | "assignedJobBudget" | "assignedParty" | "administration"
>;

export function bankEntryMissingInfo(e: BankAssignable): string[] {
  const missing: string[] = [];
  if (!e.assignedKind) {
    missing.push("asignación");
    return missing;
  }
  if (e.assignedKind === "cobro" || e.assignedKind === "pago") {
    const hasJob = !!(e.assignedJobBudget && e.assignedJobBudget.trim());
    const hasParty = !!(e.assignedParty && e.assignedParty.trim());
    if (!hasJob && !hasParty) missing.push("trabajo o tercero");
    if (e.administration !== "blanco" && e.administration !== "negro") missing.push("blanco/negro");
  }
  return missing;
}

export const bankEntryComplete = (e: BankAssignable): boolean =>
  bankEntryMissingInfo(e).length === 0;
