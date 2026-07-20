// COMPROMISOS: lo que falta cobrar y lo que falta pagar.
//
// La factura es un COMPROMISO DE PAGO, no un movimiento de plata. Vive en una capa aparte que NUNCA
// toca el resultado (el resultado es percibido: cobros menos pagos). Si el compromiso sumara al
// resultado, la misma plata se contaria dos veces: primero la factura y despues el pago.
// Es el mismo patron que la orden de compra (sugerencia) y el pago programado (prevision).
//
// El saldo se calcula por CONTRAPARTE, no factura por factura: el usuario fue explicito en que no
// quiere casar cada factura con cada pago. Por eso la llave es el cliente / el proveedor, y por eso
// el listado de proveedores importa: es lo que une las dos puntas.
//
// Puro: solo aritmetica y texto.

export type CommitmentDoc = {
  counterparty: string; // cliente o proveedor
  counterpartyId?: number;
  date: string; // yyyy-mm-dd
  amount: number;
};

export type CommitmentMovement = {
  counterparty: string;
  counterpartyId?: number;
  date: string;
  amount: number;
};

export type CommitmentBalance = {
  counterparty: string;
  counterpartyId?: number;
  invoiced: number; // total comprometido (facturado)
  settled: number; // total movido (cobrado o pagado)
  pending: number; // lo que falta; negativo = se movio de mas
  oldestOpenDate: string; // fecha de la factura mas vieja sin cubrir ("" si no hay)
  ageDays: number; // antiguedad de esa factura contra `today`
  overpaid: boolean; // se cobro/pago mas de lo facturado -> revisar
};

export type CommitmentsSummary = {
  rows: CommitmentBalance[];
  totalInvoiced: number;
  totalSettled: number;
  totalPending: number;
  overdue: CommitmentBalance[]; // pendientes con mas de `overdueDays`
  totalOverdue: number;
};

// La llave junta por id si lo hay (el listado manda) y si no por nombre normalizado, para que
// "DAC Maderas" y "dac maderas " no queden como dos contrapartes distintas.
const keyOf = (item: { counterparty: string; counterpartyId?: number }): string =>
  item.counterpartyId ? `id:${item.counterpartyId}` : `name:${(item.counterparty || "").trim().toLowerCase()}`;

const daysBetween = (from: string, to: string): number => {
  const a = Date.parse(`${(from || "").slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${(to || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
};

export function summarizeCommitments(input: {
  invoices: CommitmentDoc[];
  movements: CommitmentMovement[];
  today: string;
  overdueDays?: number;
}): CommitmentsSummary {
  const overdueDays = input.overdueDays ?? 30;
  const acc = new Map<
    string,
    { counterparty: string; counterpartyId?: number; invoices: CommitmentDoc[]; settled: number }
  >();

  const slot = (item: { counterparty: string; counterpartyId?: number }) => {
    const key = keyOf(item);
    if (!acc.has(key)) {
      acc.set(key, {
        counterparty: (item.counterparty || "Sin identificar").trim() || "Sin identificar",
        counterpartyId: item.counterpartyId,
        invoices: [],
        settled: 0,
      });
    }
    return acc.get(key)!;
  };

  (input.invoices || []).forEach((inv) => {
    if (!(Number(inv.amount || 0) > 0)) return;
    slot(inv).invoices.push(inv);
  });
  (input.movements || []).forEach((mov) => {
    const amount = Number(mov.amount || 0);
    if (!(amount > 0)) return;
    slot(mov).settled += amount;
  });

  const rows: CommitmentBalance[] = Array.from(acc.values()).map((item) => {
    const invoiced = item.invoices.reduce((a, inv) => a + Number(inv.amount || 0), 0);
    const pending = invoiced - item.settled;

    // La factura mas vieja que todavia no quedo cubierta: se van tapando de la mas antigua a la mas
    // nueva con lo que se movio (imputacion por antiguedad, que es como se hace en la practica).
    let restante = item.settled;
    let oldestOpenDate = "";
    const ordenadas = [...item.invoices].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    for (const inv of ordenadas) {
      const monto = Number(inv.amount || 0);
      if (restante >= monto) {
        restante -= monto;
        continue;
      }
      oldestOpenDate = inv.date || "";
      break;
    }

    return {
      counterparty: item.counterparty,
      counterpartyId: item.counterpartyId,
      invoiced,
      settled: item.settled,
      pending,
      oldestOpenDate: pending > 0 ? oldestOpenDate : "",
      ageDays: pending > 0 && oldestOpenDate ? daysBetween(oldestOpenDate, input.today) : 0,
      overpaid: pending < 0,
    };
  });

  rows.sort((a, b) => b.pending - a.pending);
  const overdue = rows.filter((r) => r.pending > 0 && r.ageDays > overdueDays);

  return {
    rows,
    totalInvoiced: rows.reduce((a, r) => a + r.invoiced, 0),
    totalSettled: rows.reduce((a, r) => a + r.settled, 0),
    totalPending: rows.reduce((a, r) => a + r.pending, 0),
    overdue,
    totalOverdue: overdue.reduce((a, r) => a + r.pending, 0),
  };
}
