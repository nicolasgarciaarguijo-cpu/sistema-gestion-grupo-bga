// COSTO REAL DE BANCOS Y TARJETAS por empresa (Nicolas, 2026-10-14): "cargar los resumenes de
// tarjetas y de cuenta y, segun el tipo de gasto, tener los costos reales finales de cada uno, por
// empresa, bien detallado".
//
//  - CUENTA: los debitos del extracto clasificados en renglones de BANCOS (comisiones, impuestos,
//    intereses). El pago de la tarjeta, las cuotas de credito y los movimientos de inversion NO son
//    costo bancario (van a su lugar).
//  - TARJETA: por cierre de resumen. Los cargos del resumen (sellos, percepciones, comisiones,
//    intereses) se reconocen por el texto; el resto son CONSUMOS, que se analizan por su tipo de gasto.
//  - Pesos y dolares nunca se suman.

export type CategoriaCosto = "comisiones" | "impuestos" | "intereses" | "consumos";

// Renglon de BANCOS del Calendario -> categoria (o null si no es costo bancario).
export function categoriaDeRenglonBancario(conceptKey: string | undefined): Exclude<CategoriaCosto, "consumos"> | null {
  const k = conceptKey || "";
  if (!k.startsWith("b_")) return null;
  if (k === "b_tarjeta_credito") return null; // pago de la tarjeta: va por la tarjeta
  if (k.startsWith("b_credito_")) return null; // cuota de credito: va a deudas
  if (k === "b_credito_inv_prov" || k === "b_debito_inv_prov") return null; // inversion
  if (k.startsWith("b_int_")) return "intereses";
  if (k.startsWith("b_com_") || k === "b_cesion_cheques" || k === "b_garantias_bind") return "comisiones";
  return "impuestos"; // b_imp_*, b_iva_*, b_percepcion_*, b_sellados, b_imp_ex_ef
}

const sinAcentos = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Linea del resumen de tarjeta -> categoria por su texto.
export function categoriaDeLineaTarjeta(descripcion: string): CategoriaCosto {
  const d = sinAcentos(descripcion);
  if (/\binteres|financiac|punit/.test(d)) return "intereses";
  if (/sellos|iibb|percep|db\.?\s*rg|\brg\s*\d|db iva|\biva\b|impuesto|ley 25\.?413|\bimp\.?\s*d[be]|db\/cr/.test(d)) return "impuestos";
  if (/comis|mant\.?\s*cuenta|mantenimiento|cargo por|renovacion|seguro de vida|administrativ/.test(d)) return "comisiones";
  return "consumos";
}

export type Totales4 = Record<CategoriaCosto, number> & { total: number };
const cero = (): Totales4 => ({ comisiones: 0, impuestos: 0, intereses: 0, consumos: 0, total: 0 });
const suma = (t: Totales4, c: CategoriaCosto, m: number) => {
  t[c] += m;
  t.total += m;
};

export type LineaCosto = {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: CategoriaCosto;
  monto: number;
  moneda: "ARS" | "USD";
  tipoGasto?: string; // solo consumos de tarjeta: su grupo / tipo de gasto
  titular?: string; // tarjeta: la tarjeta fisica (Gustavo, Maria...) dentro de la cuenta
  // El texto del banco NO parece de su renglon (ej. "DEBITO P/ACREDITAC.DE SUELDOS" en impuesto al
  // debito): se muestra igual, marcado para reclasificarlo en Bancos.
  revisar?: boolean;
};

// Un debito cuyo texto dice sueldos, transferencia, pago de servicios, tarjeta, etc. y que esta en un
// renglon de comision / impuesto / interes del banco probablemente esta mal clasificado.
export function debitoSospechoso(concepto: string): boolean {
  const d = sinAcentos(concepto);
  if (/\bimp\b|imp\.|impuesto|iva|percep|comision|com\.|ley|sello|interes|int\.|mantenim|db\/cr|25413|retenc/.test(d)) return false;
  return /sueldo|acreditac|transf|pago de servicio|tarjeta|credito por|debito automatico|haberes|proveedor|cheque/.test(d);
}

export type FilaCosto = {
  company: string;
  tipo: "cuenta" | "tarjeta";
  nombre: string;
  ars: Totales4;
  usd: Totales4;
  aRevisar: number; // pesos en lineas marcadas para revisar
  lineas: LineaCosto[];
  // Tarjetas: consumos por tipo de gasto (pesos) y el resumen del periodo para cotejar.
  consumosPorTipo?: Array<{ tipo: string; monto: number }>;
  resumenes?: Array<{ id: number; cierre: string; vencimiento: string; totalArs: number; totalUsd: number; pagado: boolean }>;
};

export function costoBancosYTarjetas(
  f: {
    bancos: Array<{ id: number; company: string; date: string; bank: string; movementType: string; amount: number; concept?: string; conceptKey?: string; currency?: string }>;
    tarjetas: Array<{ id: number; company: string; name: string; bank: string }>;
    resumenes: Array<{ id: number; company: string; cardId: number; closingDate: string; dueDate: string; totalArs: number; totalUsd: number; paid: boolean }>;
    consumos: Array<{ id: number; company: string; cardId: number; statementId?: number; date: string; description: string; amount: number; currency: "ARS" | "USD"; group: string }>;
  },
  desde: string,
  hasta: string
): FilaCosto[] {
  const filas = new Map<string, FilaCosto>();
  const fila = (company: string, tipo: "cuenta" | "tarjeta", nombre: string) => {
    const k = `${company}|${tipo}|${nombre}`;
    if (!filas.has(k)) filas.set(k, { company, tipo, nombre, ars: cero(), usd: cero(), aRevisar: 0, lineas: [] });
    return filas.get(k)!;
  };

  // Cuentas: debitos del periodo en renglones de bancos.
  f.bancos.forEach((b) => {
    if (b.movementType !== "debito" || !b.date || b.date < desde || b.date > hasta) return;
    const cat = categoriaDeRenglonBancario(b.conceptKey);
    if (!cat) return;
    const monto = Math.abs(Number(b.amount || 0));
    if (!monto) return;
    const r = fila(b.company, "cuenta", b.bank || "Banco");
    suma(b.currency === "USD" ? r.usd : r.ars, cat, monto);
    const revisar = debitoSospechoso(b.concept || "");
    if (revisar && b.currency !== "USD") r.aRevisar += monto;
    r.lineas.push({ id: `bank-${b.id}`, fecha: b.date, descripcion: b.concept || b.conceptKey || "", categoria: cat, monto, moneda: b.currency === "USD" ? "USD" : "ARS", revisar });
  });

  // Tarjetas: los resumenes que CIERRAN en el periodo, con sus consumos y cargos.
  const tarjetaPorId = new Map(f.tarjetas.map((t) => [t.id, t]));
  // "Visa Business · Gustavo" es una tarjeta fisica de la cuenta "Visa Business": van juntas.
  const nombreCuentaTarjeta = (t: { name: string; bank: string } | undefined) => {
    if (!t) return "Tarjeta";
    const base = String(t.name || "Tarjeta").split(" · ")[0].trim();
    return `${base}${t.bank ? ` · ${t.bank}` : ""}`;
  };
  const titularDe = (t: { name: string } | undefined) => {
    const partes = String(t?.name || "").split(" · ");
    return partes.length > 1 ? partes.slice(1).join(" · ") : "";
  };
  const resumenesEnPeriodo = f.resumenes.filter((s) => s.closingDate >= desde && s.closingDate <= hasta);
  const idsResumen = new Set(resumenesEnPeriodo.map((s) => s.id));
  resumenesEnPeriodo.forEach((s) => {
    const t = tarjetaPorId.get(s.cardId);
    const r = fila(s.company, "tarjeta", nombreCuentaTarjeta(t));
    (r.resumenes = r.resumenes || []).push({
      id: s.id, cierre: s.closingDate, vencimiento: s.dueDate, totalArs: Number(s.totalArs || 0), totalUsd: Number(s.totalUsd || 0), pagado: !!s.paid,
    });
  });
  f.consumos.forEach((c) => {
    // El consumo va con su resumen; si no tiene resumen asignado, por su fecha.
    const enPeriodo = c.statementId != null ? idsResumen.has(c.statementId) : c.date >= desde && c.date <= hasta;
    if (!enPeriodo) return;
    const monto = Number(c.amount || 0);
    if (!monto) return;
    const t = tarjetaPorId.get(c.cardId);
    const r = fila(c.company, "tarjeta", nombreCuentaTarjeta(t));
    const cat = categoriaDeLineaTarjeta(c.description);
    suma(c.currency === "USD" ? r.usd : r.ars, cat, monto);
    r.lineas.push({
      id: `consumo-${c.id}`, fecha: c.date, descripcion: c.description, categoria: cat, monto, moneda: c.currency === "USD" ? "USD" : "ARS",
      tipoGasto: cat === "consumos" ? c.group || "" : undefined,
      titular: titularDe(t) || undefined,
    });
  });

  // Consumos por tipo de gasto (pesos) en cada tarjeta.
  filas.forEach((r) => {
    if (r.tipo !== "tarjeta") return;
    const porTipo = new Map<string, number>();
    r.lineas
      .filter((l) => l.categoria === "consumos" && l.moneda === "ARS" && !l.id.startsWith("bank-"))
      .forEach((l) => {
        const tipo = l.tipoGasto || "Sin tipo de gasto";
        porTipo.set(tipo, (porTipo.get(tipo) || 0) + l.monto);
      });
    r.consumosPorTipo = Array.from(porTipo.entries())
      .map(([tipo, monto]) => ({ tipo, monto }))
      .sort((a, b) => b.monto - a.monto);
    r.lineas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  });

  return Array.from(filas.values()).sort(
    (a, b) => a.company.localeCompare(b.company) || (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre) : a.tipo === "cuenta" ? -1 : 1)
  );
}
