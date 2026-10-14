// ARQUEO DEL CIERRE DE EJERCICIO (Nicolas, 2026-10-14): "cuando el año cierra el sistema deberia
// preguntar la plata en cada banco, en efectivo blanco y efectivo negro. De esta manera, tener un punto
// de partida fiel. Si la plata no es igual a la que figuraba, consultar el porque del cambio: quizas sea
// un retiro de socios y deberiamos poder dejarlo asentado."
//
//  - Una fila por cuenta (banco, efectivo blanco/negro, caja de cada persona), con lo que dice el
//    sistema al ultimo dia del ejercicio y lo que hay DE VERDAD.
//  - Si no coinciden, hace falta el motivo: retiro de socios (falta plata), aporte de socios (sobra),
//    diferencia de arqueo u otro (con su explicacion).
//  - El ejercicio nuevo arranca con la plata CONTADA. Los retiros y aportes quedan asentados.

import type { CierreBilletera } from "./cierreEjercicio";

export type MotivoArqueo = "retiro" | "aporte" | "ajuste" | "otro";

export type FilaArqueo = {
  cuentaId: string;
  nombre: string;
  tipo: "banco" | "efectivo" | "persona";
  moneda: "ARS" | "USD";
  color: "blanco" | "negro";
  sistema: number; // lo que dice el sistema al cierre
  real: number; // lo contado
  motivo?: MotivoArqueo;
  socio?: string; // retiro / aporte
  detalle?: string; // ajuste / otro
};

export const TOLERANCIA_ARQUEO = 1; // pesos (o dolares): diferencias de centavos no piden motivo

export const diferencia = (f: FilaArqueo) => Math.round((Number(f.real || 0) - Number(f.sistema || 0)) * 100) / 100;

export function filasDeArqueo(
  saldos: Array<{ id: string; company: string; nombre: string; tipo: "banco" | "efectivo" | "persona"; moneda: "ARS" | "USD"; color: "blanco" | "negro"; saldo: number; activa?: boolean }>,
  company: string
): FilaArqueo[] {
  return saldos
    .filter((c) => c.company === company && (c.activa !== false || Math.abs(c.saldo) > TOLERANCIA_ARQUEO))
    .map((c) => ({
      cuentaId: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      moneda: c.moneda,
      color: c.tipo === "banco" ? "blanco" : c.color,
      sistema: Math.round(Number(c.saldo || 0) * 100) / 100,
      real: Math.round(Number(c.saldo || 0) * 100) / 100,
    }))
    .sort((a, b) => (a.moneda === b.moneda ? (a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre) : a.tipo === "banco" ? -1 : 1) : a.moneda === "ARS" ? -1 : 1));
}

// Lo que falta completar para poder confirmar el arqueo (vacio = listo).
export function faltantesDelArqueo(filas: FilaArqueo[]): string[] {
  const out: string[] = [];
  filas.forEach((f) => {
    const d = diferencia(f);
    if (Math.abs(d) <= TOLERANCIA_ARQUEO) return;
    if (!f.motivo) out.push(`${f.nombre}: falta el motivo de la diferencia`);
    else if (f.motivo === "retiro" && d > 0) out.push(`${f.nombre}: hay MÁS plata que en el sistema, no puede ser un retiro`);
    else if (f.motivo === "aporte" && d < 0) out.push(`${f.nombre}: hay MENOS plata que en el sistema, no puede ser un aporte`);
    else if ((f.motivo === "retiro" || f.motivo === "aporte") && !String(f.socio || "").trim()) out.push(`${f.nombre}: falta el socio`);
    else if ((f.motivo === "ajuste" || f.motivo === "otro") && !String(f.detalle || "").trim()) out.push(`${f.nombre}: falta explicar la diferencia`);
  });
  return out;
}

// Billeteras del cierre (saldo de apertura del ejercicio nuevo) desde lo CONTADO.
export function billeterasDesdeArqueo(filas: FilaArqueo[]): CierreBilletera[] {
  const m = new Map<string, CierreBilletera>();
  filas.forEach((f) => {
    const location = f.tipo === "banco" ? "banco" : "efectivo";
    const k = `${f.moneda}|${location}|${f.color}`;
    if (!m.has(k)) m.set(k, { currency: f.moneda, location, color: f.color, amount: 0 });
    m.get(k)!.amount += Number(f.real || 0);
  });
  return Array.from(m.values()).map((b) => ({ ...b, amount: Math.round(b.amount * 100) / 100 }));
}

// Retiros y aportes que el arqueo deja asentados (el monto es la diferencia).
export function movimientosDelArqueo(filas: FilaArqueo[]): {
  retiros: Array<{ socio: string; monto: number; moneda: "ARS" | "USD"; color: "blanco" | "negro"; cuentaId: string; nombre: string }>;
  aportes: Array<{ socio: string; monto: number; moneda: "ARS" | "USD"; color: "blanco" | "negro"; cuentaId: string; nombre: string }>;
} {
  const retiros: any[] = [];
  const aportes: any[] = [];
  filas.forEach((f) => {
    const d = diferencia(f);
    if (Math.abs(d) <= TOLERANCIA_ARQUEO) return;
    const base = { socio: String(f.socio || "").trim(), monto: Math.abs(d), moneda: f.moneda, color: f.color, cuentaId: f.cuentaId, nombre: f.nombre };
    if (f.motivo === "retiro" && d < 0) retiros.push(base);
    if (f.motivo === "aporte" && d > 0) aportes.push(base);
  });
  return { retiros, aportes };
}
