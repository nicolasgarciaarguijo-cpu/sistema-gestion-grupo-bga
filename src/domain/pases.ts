// PASE ENTRE CUENTAS (Nicolas, 05/11/2026: "que me exija desde donde sale el dinero y hacia donde va, ya sea entre la misma
// empresa o entre dos empresas diferentes"). Puro: que falta para guardarlo, que tipo de movimiento es segun sus dos
// cuentas, y que le toca a cada empresa cuando el pase cruza de una a la otra.
// Si cruza de empresa genera un debe y haber entre las dos: ver intercompany.ts (girosDePases).

export type CuentaDePase = { id: string; company: string; tipo: string; color?: string; moneda?: string };

export type PaseForm = {
  id?: number;
  date: string;
  amount: number;
  currency: "ARS" | "USD";
  company: string; // la empresa de donde sale
  cuentaId: string;
  companyDestino: string; // la empresa a donde entra
  cuentaDestinoId: string;
  description: string;
  notes: string;
};

export function faltantesDelPase(f: PaseForm): string[] {
  const out: string[] = [];
  if (!/^(19|20)\d{2}-\d{2}-\d{2}$/.test(f.date || "")) out.push("la fecha");
  if (!(Number(f.amount) > 0)) out.push("el monto");
  if (!f.cuentaId) out.push("de dónde sale");
  if (!f.cuentaDestinoId) out.push("a dónde va");
  return out;
}

const puntaDe = (c?: CuentaDePase) => (c && c.tipo !== "banco" ? "efectivo" : "banco");

// La direccion del pase y su color salen de las dos cuentas. El banco es siempre blanco; el color es el del efectivo que se
// mueve (el de la cuenta de origen si es efectivo, si no el de la de destino).
export function datosDelPase(origen?: CuentaDePase, destino?: CuentaDePase) {
  const desde = puntaDe(origen);
  const hacia = puntaDe(destino);
  const efectivo = desde === "efectivo" ? origen : hacia === "efectivo" ? destino : undefined;
  return {
    direction: `${desde}_a_${hacia}` as "efectivo_a_banco" | "banco_a_efectivo" | "banco_a_banco" | "efectivo_a_efectivo",
    color: (efectivo?.color === "negro" ? "negro" : "blanco") as "blanco" | "negro",
  };
}

export const cruzaDeEmpresa = (t: { company: unknown; companyDestino?: unknown }): boolean =>
  !!t.companyDestino && t.companyDestino !== t.company;

// Lo que ve la billetera de una vista (una empresa o varias). Un pase que cruza de empresa se ve desde cada punta como lo que
// es para ella: a la de origen le sale y a la de destino le entra. Si la vista tiene a las dos, es el pase tal cual.
export function pasesParaReserva<T extends { company: unknown; companyDestino?: unknown; date: string; direction: string }>(
  pases: readonly T[],
  esDeLaVista: (company: string, date: string) => boolean
): T[] {
  const out: T[] = [];
  pases.forEach((t) => {
    const origen = esDeLaVista(String(t.company), t.date);
    if (!cruzaDeEmpresa(t)) {
      if (origen) out.push(t);
      return;
    }
    const destino = esDeLaVista(String(t.companyDestino), t.date);
    if (origen && destino) return void out.push(t);
    const [desde, , hacia] = String(t.direction || "").split("_");
    if (origen) out.push({ ...t, direction: desde === "efectivo" ? "efectivo_a_banco" : "banco_a_banco" });
    else if (destino) out.push({ ...t, direction: hacia === "efectivo" ? "banco_a_efectivo" : "banco_a_banco" });
  });
  return out;
}
