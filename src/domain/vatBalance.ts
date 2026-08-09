// Posicion de IVA de UNA empresa: DEBITO fiscal (IVA de ventas emitidas) menos CREDITO fiscal (IVA de
// compras EN BLANCO), acumulado DESDE el ultimo VEP de pago. El IVA se paga por trimestre; cuando se
// carga el VEP de pago, ese pago "cierra" el periodo y el contador arranca de nuevo (cuenta solo lo
// posterior a la fecha del VEP). Objetivo: ver por empresa si conviene facturar o comprar para equilibrar.
//
// posicion > 0  -> DEBITO mayor: hay IVA A PAGAR (conviene comprar en blanco con esta empresa).
// posicion < 0  -> CREDITO mayor: saldo A FAVOR (conviene facturar con esta empresa).
//
// Nota fiscal: el credito fiscal solo lo dan las compras EN BLANCO (el negro no computa). Las ventas
// emitidas (ARCA) son todas fiscales. El IVA no toca el estado de resultados (es percibido/neto): esto
// es un tablero aparte, mas cercano al balance/reserva.

export type VatMovement = {
  company: string;
  date: string; // yyyy-mm-dd
  vat: number;
  administration?: string; // solo compras: "blanco" | "negro" (ausente = blanco)
};

export type VatVep = { company: string; date: string };

export type VatPosition = {
  debito: number; // IVA de ventas del periodo abierto
  credito: number; // IVA de compras (blanco) del periodo abierto
  posicion: number; // debito - credito ( >0 = a pagar ; <0 = a favor )
  lastVepDate: string | null; // fecha del ultimo VEP pagado (null = nunca se pago, cuenta todo)
  ventas: number; // cantidad de facturas de venta computadas
  compras: number; // cantidad de facturas de compra computadas
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeVatPosition(params: {
  company: string;
  issued: VatMovement[]; // facturas emitidas (debito fiscal)
  purchases: VatMovement[]; // facturas de compra (credito fiscal)
  veps: VatVep[]; // VEP de pago de IVA cargados
  asOf?: string; // corte superior opcional (yyyy-mm-dd); default: sin corte
}): VatPosition {
  const { company, issued, purchases, veps, asOf } = params;

  // Ultimo VEP de la empresa con fecha <= asOf. El contador cuenta lo POSTERIOR a esa fecha.
  const lastVepDate =
    veps
      .filter((v) => v.company === company && v.date && (!asOf || v.date <= asOf))
      .map((v) => v.date)
      .sort()
      .slice(-1)[0] ?? null;

  const inWindow = (m: VatMovement) =>
    m.company === company &&
    !!m.date &&
    (!lastVepDate || m.date > lastVepDate) &&
    (!asOf || m.date <= asOf);

  const issuedIn = issued.filter(inWindow);
  // Credito fiscal solo de compras EN BLANCO.
  const purchIn = purchases.filter((m) => inWindow(m) && (m.administration ?? "blanco") !== "negro");

  const debito = round2(issuedIn.reduce((acc, m) => acc + Number(m.vat || 0), 0));
  const credito = round2(purchIn.reduce((acc, m) => acc + Number(m.vat || 0), 0));

  return {
    debito,
    credito,
    posicion: round2(debito - credito),
    lastVepDate,
    ventas: issuedIn.length,
    compras: purchIn.length,
  };
}

// Etiqueta corta para la UI: a pagar / a favor / equilibrado.
export const vatPositionLabel = (posicion: number): { text: string; tone: "out" | "in" | "neutral" } => {
  if (posicion > 1) return { text: "a pagar", tone: "out" };
  if (posicion < -1) return { text: "a favor", tone: "in" };
  return { text: "equilibrado", tone: "neutral" };
};
