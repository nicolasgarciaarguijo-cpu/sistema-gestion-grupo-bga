// Inversiones: crecimiento y resumen por empresa. Funciones puras y testeadas; sin React ni estado.
import type { Inversion, CompanyName } from "./types";

// Tipos sugeridos (el campo es texto libre; esto alimenta el datalist de la UI).
export const TIPOS_INVERSION_SUGERIDOS = [
  "Plazo fijo",
  "Plazo fijo UVA",
  "Fondo común (FCI)",
  "Acciones",
  "Bonos",
  "Obligaciones negociables",
  "Cripto",
  "Dólares",
  "Inmueble",
  "Maquinaria",
] as const;

export type CrecimientoInversion = {
  ganancia: number; // valorActual - montoInvertido (en la moneda de la inversion)
  pct: number; // % de crecimiento sobre el capital invertido (0 si el capital es 0)
};

// Crecimiento de UNA inversion: cuanto gano (o perdio) y en que porcentaje.
export function crecimientoInversion(inv: {
  montoInvertido: number;
  valorActual: number;
}): CrecimientoInversion {
  const invertido = Number(inv.montoInvertido || 0);
  const actual = Number(inv.valorActual || 0);
  const ganancia = actual - invertido;
  const pct = invertido > 0 ? (ganancia / invertido) * 100 : 0;
  return { ganancia, pct };
}

export type ResumenMoneda = {
  invertido: number;
  valorActual: number;
  ganancia: number;
  pct: number;
  cantidad: number;
};

export type ResumenInversionesEmpresa = {
  company: CompanyName;
  activas: number;
  ars: ResumenMoneda;
  usd: ResumenMoneda;
};

const monedaVacia = (): ResumenMoneda => ({
  invertido: 0,
  valorActual: 0,
  ganancia: 0,
  pct: 0,
  cantidad: 0,
});

// Resumen por empresa, separando ARS de USD (no se pueden sumar). Solo cuenta las inversiones
// ACTIVAS: las cerradas ya no son capital en juego. El % es sobre el total invertido de esa moneda.
export function resumenInversionesPorEmpresa(
  inversiones: Inversion[],
  companies: CompanyName[]
): ResumenInversionesEmpresa[] {
  return companies.map((company) => {
    const activas = inversiones.filter((i) => i.company === company && i.estado !== "cerrada");
    const ars = monedaVacia();
    const usd = monedaVacia();
    activas.forEach((i) => {
      const acc = i.moneda === "USD" ? usd : ars;
      acc.invertido += Number(i.montoInvertido || 0);
      acc.valorActual += Number(i.valorActual || 0);
      acc.cantidad += 1;
    });
    [ars, usd].forEach((acc) => {
      acc.ganancia = acc.valorActual - acc.invertido;
      acc.pct = acc.invertido > 0 ? (acc.ganancia / acc.invertido) * 100 : 0;
    });
    return { company, activas: activas.length, ars, usd };
  });
}
