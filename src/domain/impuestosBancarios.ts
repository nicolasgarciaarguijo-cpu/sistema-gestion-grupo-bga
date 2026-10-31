// IMPUESTOS DEL EXTRACTO Y DEL RESUMEN DE TARJETA (Nicolas, 2026-10-23): "que el extracto bancario al cargarlo
// me sume todos los impuestos y me cargue una deuda con un titulo 'Impuestos extracto bancario', y asi quedan
// asentados esos importes. Debo poder revisar el resumen para control y despues poder tildar pagados para que
// descuenten de la cuenta de cada banco. Cuando cargo el resumen de la tarjeta, lo mismo."
//
// Entran los impuestos Y las comisiones e intereses (todo lo que el banco cobra solo), agrupados POR BANCO Y
// POR MES; los de la tarjeta, por resumen. Tildarlo pagado crea el pago (un CostEntry) desde la cuenta del
// banco: recien ahi baja el saldo de la cuenta (el saldo sale de lo cargado; el extracto solo controla).
// Funciones puras.
import { categoriaDeLineaTarjeta, categoriaDeRenglonBancario } from "./costoBancosTarjetas";

export type CategoriaImpuesto = "impuestos" | "comisiones" | "intereses";
export const ETIQUETA_CATEGORIA: Record<CategoriaImpuesto, string> = { impuestos: "Impuestos", comisiones: "Comisiones", intereses: "Intereses" };

export type LineaImpuesto = { id: string; fecha: string; descripcion: string; categoria: CategoriaImpuesto; monto: number };
export type GrupoImpuestos = {
  clave: string; // "banco:<empresa>|<banco>|<moneda>|<yyyy-mm>" o "tarjeta:<statementId>"
  origen: "banco" | "tarjeta";
  company: string;
  titulo: string;
  banco: string;
  moneda: "ARS" | "USD";
  mes: string; // yyyy-mm
  fecha: string; // cuando se paga: ultimo debito del mes (banco) o vencimiento del resumen (tarjeta)
  total: number;
  porCategoria: Record<CategoriaImpuesto, number>;
  lineas: LineaImpuesto[];
  cardId?: number;
  statementId?: number;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (yyyymm: string) => `${MESES[Number(yyyymm.slice(5, 7)) - 1] || ""} ${yyyymm.slice(0, 4)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;
const cero = (): Record<CategoriaImpuesto, number> => ({ impuestos: 0, comisiones: 0, intereses: 0 });

// Categoria de un debito del banco: por el renglon en que se clasifico; si no tiene renglon, por su texto.
export function categoriaDeDebito(conceptKey: string | undefined, concept: string): CategoriaImpuesto | null {
  if (conceptKey) return categoriaDeRenglonBancario(conceptKey);
  const c = categoriaDeLineaTarjeta(concept);
  return c === "consumos" ? null : c;
}

export type DebitoBanco = {
  id: number;
  company: string;
  bank: string;
  date: string;
  movementType: string;
  concept: string;
  amount: number;
  currency?: "ARS" | "USD";
  conceptKey?: string;
};

export function impuestosDeExtractos(debitos: DebitoBanco[]): GrupoImpuestos[] {
  const grupos = new Map<string, GrupoImpuestos>();
  debitos.forEach((d) => {
    if (d.movementType !== "debito" || !d.date) return;
    const categoria = categoriaDeDebito(d.conceptKey, d.concept);
    if (!categoria) return;
    const monto = Math.abs(Number(d.amount || 0));
    if (!(monto > 0)) return;
    const moneda = d.currency === "USD" ? "USD" : "ARS";
    const mes = d.date.slice(0, 7);
    const banco = (d.bank || "Banco").trim();
    const clave = `banco:${d.company}|${banco}|${moneda}|${mes}`;
    let g = grupos.get(clave);
    if (!g) {
      g = {
        clave,
        origen: "banco",
        company: d.company,
        // Nombre fijado por Nicolas (2026-10-31): el mismo para cuentas y tarjetas, aclarando de donde sale.
        titulo: `Comisiones, tasas e intereses (cuenta) · ${banco} · ${nombreMes(mes)}`,
        banco,
        moneda,
        mes,
        fecha: d.date,
        total: 0,
        porCategoria: cero(),
        lineas: [],
      };
      grupos.set(clave, g);
    }
    g.lineas.push({ id: `b${d.id}`, fecha: d.date, descripcion: d.concept, categoria, monto });
    g.total = r2(g.total + monto);
    g.porCategoria[categoria] = r2(g.porCategoria[categoria] + monto);
    if (d.date > g.fecha) g.fecha = d.date;
  });
  return Array.from(grupos.values())
    .map((g) => ({ ...g, lineas: g.lineas.sort((a, b) => a.fecha.localeCompare(b.fecha)) }))
    .sort((a, b) => b.mes.localeCompare(a.mes) || a.banco.localeCompare(b.banco));
}

export type ResumenTarjeta = { id: number; company: string; cardId: number; closingDate: string; dueDate: string };
export type LineaResumen = { id: number; company: string; cardId: number; statementId?: number; date: string; description: string; amount: number; currency: "ARS" | "USD" };
export type Tarjeta = { id: number; name: string; bank: string };

// Los cargos del resumen de tarjeta (sellos, percepciones, comisiones, intereses), uno por resumen y moneda.
export function impuestosDeResumenes(resumenes: ResumenTarjeta[], lineas: LineaResumen[], tarjetas: Tarjeta[]): GrupoImpuestos[] {
  const out: GrupoImpuestos[] = [];
  resumenes.forEach((s) => {
    const card = tarjetas.find((t) => t.id === s.cardId);
    (["ARS", "USD"] as const).forEach((moneda) => {
      const cargos = lineas
        .filter((l) => l.statementId === s.id && (l.currency || "ARS") === moneda)
        .map((l) => ({ l, categoria: categoriaDeLineaTarjeta(l.description) }))
        .filter((x) => x.categoria !== "consumos" && Number(x.l.amount || 0) > 0);
      if (!cargos.length) return;
      const porCategoria = cero();
      cargos.forEach((x) => (porCategoria[x.categoria as CategoriaImpuesto] = r2(porCategoria[x.categoria as CategoriaImpuesto] + Number(x.l.amount))));
      const fecha = s.dueDate || s.closingDate;
      out.push({
        clave: `tarjeta:${s.id}${moneda === "USD" ? ":usd" : ""}`,
        origen: "tarjeta",
        company: s.company,
        titulo: `Comisiones, tasas e intereses (tarjeta) · ${card?.name || "tarjeta"} · ${nombreMes((s.closingDate || fecha).slice(0, 7))}`,
        banco: card?.bank || "",
        moneda,
        mes: (s.closingDate || fecha).slice(0, 7),
        fecha,
        total: r2(cargos.reduce((a, x) => a + Number(x.l.amount), 0)),
        porCategoria,
        lineas: cargos.map((x) => ({ id: `t${x.l.id}`, fecha: x.l.date, descripcion: x.l.description, categoria: x.categoria as CategoriaImpuesto, monto: Number(x.l.amount) })),
        cardId: s.cardId,
        statementId: s.id,
      });
    });
  });
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
