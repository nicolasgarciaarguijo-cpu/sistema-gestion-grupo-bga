// TOTALES DE CADA BLOQUE DE UN TRABAJO APROBADO (Nicolas, 03/11/2026: "si cargue 6 cobranzas que sume los netos, que sume
// las cobranzas; si cargue 3 facturas que sume los netos facturados, que sume los IVAs y los totales; lo mismo en
// retenciones, en adicionales y en comisiones"). Suma lo CARGADO en cada bloque; no reemplaza el resumen del trabajo.
// Pesos y dolares nunca se suman: lo que esta en U$S va en su propio total (un U$S pesificado cuenta en pesos).
// Neto = sin IVA. Un cobro en blanco trae el IVA adentro (neto = cobro / (1 + IVA)); en negro no hay IVA.

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v || 0);

export type TotalesFacturas = { cantidad: number; neto: number; iva: number; total: number };

export function totalesFacturas(facturas: Array<{ subtotal?: number; vat?: number; total?: number }>): TotalesFacturas {
  const reales = facturas.filter((f) => num(f.subtotal) > 0 || num(f.total) > 0);
  return {
    cantidad: reales.length,
    neto: r2(reales.reduce((a, f) => a + num(f.subtotal), 0)),
    iva: r2(reales.reduce((a, f) => a + num(f.vat), 0)),
    total: r2(reales.reduce((a, f) => a + num(f.total), 0)),
  };
}

type Cobro = { amount?: number; administration?: "blanco" | "negro"; currency?: "ARS" | "USD"; arsApplied?: boolean; exchangeRate?: number };

export type TotalesCobranzas = {
  cantidad: number;
  blanco: number; // pesos cobrados en blanco (con IVA)
  netoBlanco: number; // lo mismo sin IVA
  ivaBlanco: number;
  negro: number; // pesos cobrados en negro (sin IVA: es neto)
  total: number; // blanco + negro
  neto: number; // netoBlanco + negro
  usd: number; // dolares cobrados (sin pesificar)
};

// Un cobro en pesos: los pesos, o el U$S pesificado (monto x cotizacion). Un dolar puro no tiene pesos.
const pesosDe = (c: Cobro) =>
  c.currency === "USD" ? (c.arsApplied && num(c.exchangeRate) > 0 ? num(c.amount) * num(c.exchangeRate) : 0) : num(c.amount);

export function totalesCobranzas(cobros: Cobro[], ivaPct = 21): TotalesCobranzas {
  const conMonto = cobros.filter((c) => num(c.amount) > 0);
  const blanco = conMonto.filter((c) => (c.administration || "blanco") === "blanco").reduce((a, c) => a + pesosDe(c), 0);
  const negro = conMonto.filter((c) => c.administration === "negro").reduce((a, c) => a + pesosDe(c), 0);
  const netoBlanco = blanco / (1 + ivaPct / 100);
  return {
    cantidad: conMonto.length,
    blanco: r2(blanco),
    netoBlanco: r2(netoBlanco),
    ivaBlanco: r2(blanco - netoBlanco),
    negro: r2(negro),
    total: r2(blanco + negro),
    neto: r2(netoBlanco + negro),
    usd: r2(conMonto.filter((c) => c.currency === "USD" && !(c.arsApplied && num(c.exchangeRate) > 0)).reduce((a, c) => a + num(c.amount), 0)),
  };
}

export function totalesRetenciones(retenciones: Array<{ amount?: number }>): { cantidad: number; total: number } {
  const conMonto = retenciones.filter((r) => num(r.amount) > 0);
  return { cantidad: conMonto.length, total: r2(conMonto.reduce((a, r) => a + num(r.amount), 0)) };
}

export type TotalesAdicionales = {
  cantidad: number;
  netoBlanco: number;
  iva: number;
  totalBlanco: number; // neto blanco + IVA
  negro: number;
  neto: number; // neto blanco + negro
  total: number; // total blanco + negro
  usdBlanco: number;
  usdNegro: number;
};

export function totalesAdicionales(
  adicionales: Array<{ amount?: number; administration?: "blanco" | "negro"; vatRate?: number; currency?: "ARS" | "USD" }>,
  ivaPct = 21
): TotalesAdicionales {
  const conMonto = adicionales.filter((a) => num(a.amount) > 0);
  const esBlanco = (a: { administration?: string }) => (a.administration || "blanco") === "blanco";
  const pesos = conMonto.filter((a) => a.currency !== "USD");
  const usd = conMonto.filter((a) => a.currency === "USD");
  const netoBlanco = pesos.filter(esBlanco).reduce((s, a) => s + num(a.amount), 0);
  const iva = pesos.filter(esBlanco).reduce((s, a) => s + num(a.amount) * (Number(a.vatRate ?? ivaPct) / 100), 0);
  const negro = pesos.filter((a) => !esBlanco(a)).reduce((s, a) => s + num(a.amount), 0);
  return {
    cantidad: conMonto.length,
    netoBlanco: r2(netoBlanco),
    iva: r2(iva),
    totalBlanco: r2(netoBlanco + iva),
    negro: r2(negro),
    neto: r2(netoBlanco + negro),
    total: r2(netoBlanco + iva + negro),
    usdBlanco: r2(usd.filter(esBlanco).reduce((s, a) => s + num(a.amount), 0)),
    usdNegro: r2(usd.filter((a) => !esBlanco(a)).reduce((s, a) => s + num(a.amount), 0)),
  };
}

export function totalesComisiones(
  pagos: Array<{ amount?: number; administration?: "blanco" | "negro" }>
): { cantidad: number; blanco: number; negro: number; total: number } {
  const conMonto = pagos.filter((p) => num(p.amount) > 0);
  const blanco = conMonto.filter((p) => (p.administration || "blanco") === "blanco").reduce((s, p) => s + num(p.amount), 0);
  const negro = conMonto.filter((p) => p.administration === "negro").reduce((s, p) => s + num(p.amount), 0);
  return { cantidad: conMonto.length, blanco: r2(blanco), negro: r2(negro), total: r2(blanco + negro) };
}
