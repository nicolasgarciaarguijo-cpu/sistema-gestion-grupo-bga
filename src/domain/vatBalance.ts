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

// IVA MES A MES (Nicolas, 03/11/2026: "que sea mensual, alineada al calendario, sin importar la carga del VEP. El VEP deberia
// controlar, al igual que lo hace un resumen bancario: revisar que el pago corresponde a lo que tenemos estipulado"). Cada mes
// calendario: debito menos credito; el saldo a favor pasa al mes siguiente (como en la DDJJ). El VEP NO reinicia nada: se
// asigna al mes que paga (su periodo; sin periodo, el mes anterior a su fecha) y se compara con lo que el sistema dice a pagar.
export type ControlVep = "ok" | "falta" | "de_mas" | "sin_vep" | "nada";
export type MesIva = {
  mes: string; // yyyy-mm
  debito: number;
  credito: number;
  posicion: number; // debito - credito del mes
  arrastre: number; // saldo a favor que viene del mes anterior
  aPagar: number; // lo que corresponde pagar del mes (ya descontado el arrastre)
  aFavorQuePasa: number; // saldo a favor que pasa al mes siguiente
  vep: number; // pagado con VEP para ESTE mes
  diferencia: number; // vep - aPagar
  control: ControlVep;
};
export type IvaAnual = {
  desde: string;
  hasta: string;
  debito: number;
  credito: number;
  aPagar: number;
  vepPagado: number;
  diferencia: number;
  meses: MesIva[]; // los del ejercicio
  mesActual: MesIva | null;
};

const mesAnterior = (iso: string) => {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
export const mesDelVep = (v: { date: string; periodoMes?: string }) => (v.periodoMes && /^\d{4}-\d{2}$/.test(v.periodoMes) ? v.periodoMes : mesAnterior(v.date));

export function ivaAnual(params: {
  company: string;
  issued: VatMovement[];
  purchases: VatMovement[];
  veps: Array<{ company: string; date: string; amount?: number; periodoMes?: string }>;
  desde: string; // yyyy-mm-dd (inicio del ejercicio que se muestra)
  hasta: string; // yyyy-mm-dd (hoy o fin del ejercicio)
  hoy?: string; // para saber que meses ya cerraron (un mes sin VEP solo se marca si ya paso)
}): IvaAnual {
  const { company, desde, hasta } = params;
  const hoyMes = (params.hoy || hasta).slice(0, 7);
  const deLaEmpresa = <T extends { company: string }>(l: T[]) => l.filter((x) => x.company === company);
  const issued = deLaEmpresa(params.issued).filter((v) => !!v.date);
  const purchases = deLaEmpresa(params.purchases).filter((v) => !!v.date && (v.administration ?? "blanco") !== "negro");
  const veps = deLaEmpresa(params.veps).filter((v) => !!v.date);
  // El arrastre se calcula desde el primer movimiento de la historia, asi el saldo a favor viene bien aunque sea de antes.
  const primero = [...issued.map((v) => v.date), ...purchases.map((v) => v.date), desde].sort()[0].slice(0, 7);
  const ultimo = hasta.slice(0, 7);
  const porMes = new Map<string, MesIva>();
  for (let [y, m] = primero.split("-").map(Number); `${y}-${String(m).padStart(2, "0")}` <= ultimo; m === 12 ? (y++, (m = 1)) : m++) {
    const mes = `${y}-${String(m).padStart(2, "0")}`;
    porMes.set(mes, { mes, debito: 0, credito: 0, posicion: 0, arrastre: 0, aPagar: 0, aFavorQuePasa: 0, vep: 0, diferencia: 0, control: "nada" });
  }
  issued.forEach((v) => { const x = porMes.get(v.date.slice(0, 7)); if (x) x.debito += Number(v.vat || 0); });
  purchases.forEach((v) => { const x = porMes.get(v.date.slice(0, 7)); if (x) x.credito += Number(v.vat || 0); });
  veps.forEach((v) => { const x = porMes.get(mesDelVep(v)); if (x) x.vep += Number(v.amount || 0); });
  let arrastre = 0;
  Array.from(porMes.values()).forEach((x) => {
    x.debito = round2(x.debito);
    x.credito = round2(x.credito);
    x.vep = round2(x.vep);
    x.posicion = round2(x.debito - x.credito);
    x.arrastre = round2(arrastre);
    const neto = x.posicion - arrastre;
    x.aPagar = round2(Math.max(0, neto));
    x.aFavorQuePasa = round2(Math.max(0, -neto));
    arrastre = x.aFavorQuePasa;
    x.diferencia = round2(x.vep - x.aPagar);
    const cerrado = x.mes < hoyMes;
    x.control =
      x.aPagar <= 1 && x.vep <= 1 ? "nada" : x.vep <= 1 ? (cerrado ? "sin_vep" : "nada") : Math.abs(x.diferencia) <= 1 ? "ok" : x.diferencia < 0 ? "falta" : "de_mas";
  });
  const meses = Array.from(porMes.values()).filter((x) => x.mes >= desde.slice(0, 7));
  const sum = (k: "debito" | "credito" | "aPagar" | "vep") => round2(meses.reduce((a, m) => a + m[k], 0));
  return {
    desde,
    hasta,
    debito: sum("debito"),
    credito: sum("credito"),
    aPagar: sum("aPagar"),
    vepPagado: sum("vep"),
    diferencia: round2(sum("vep") - sum("aPagar")),
    meses,
    mesActual: porMes.get(hoyMes) || null,
  };
}
