// Seguros: estado de vigencia y resumen. Funciones puras y testeadas; sin React ni estado.
import type { Seguro, CompanyName } from "./types";

// Tipos sugeridos (el campo es texto libre; esto solo alimenta el datalist de la UI).
export const TIPOS_SEGURO_SUGERIDOS = [
  "ART",
  "Seguro de caución",
  "Póliza de vehículo",
  "Seguro de vida",
  "Integral de comercio",
  "Responsabilidad civil",
  "Accidentes personales",
  "Incendio",
] as const;

export type SeguroVigencia = "vigente" | "por_vencer" | "vencido" | "sin_fecha";

// Estado de vigencia de un seguro a una fecha dada. `diasAviso` = ventana de "por vencer".
export function seguroVigencia(
  vigenciaHasta: string,
  hoyIso: string,
  diasAviso = 30
): SeguroVigencia {
  const hasta = (vigenciaHasta || "").slice(0, 10);
  const hoy = (hoyIso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta) || !/^\d{4}-\d{2}-\d{2}$/.test(hoy)) return "sin_fecha";
  if (hasta < hoy) return "vencido";
  // Días hasta el vencimiento (comparación por fecha ISO en UTC para evitar husos).
  const dHasta = new Date(`${hasta}T00:00:00Z`).getTime();
  const dHoy = new Date(`${hoy}T00:00:00Z`).getTime();
  const dias = Math.round((dHasta - dHoy) / 86400000);
  return dias <= diasAviso ? "por_vencer" : "vigente";
}

export const ETIQUETA_VIGENCIA: Record<SeguroVigencia, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  sin_fecha: "Sin fecha",
};

export type SegurosResumenEmpresa = {
  company: CompanyName;
  cantidad: number; // seguros activos
  costoMensualTotal: number; // suma del costo mensual de los activos
  vigentes: number;
  porVencer: number;
  vencidos: number;
};

// Resumen por empresa: cuántos seguros activos hay, cuánto suman por mes y el estado de vigencia.
// Solo cuenta los seguros con estado "activo" (los dados de baja no suman costo).
export function resumenSegurosPorEmpresa(
  seguros: Seguro[],
  companies: CompanyName[],
  hoyIso: string,
  diasAviso = 30
): SegurosResumenEmpresa[] {
  return companies.map((company) => {
    const activos = seguros.filter((s) => s.company === company && s.estado !== "baja");
    let costoMensualTotal = 0;
    let vigentes = 0;
    let porVencer = 0;
    let vencidos = 0;
    activos.forEach((s) => {
      costoMensualTotal += Number(s.costoMensual || 0);
      const v = seguroVigencia(s.vigenciaHasta, hoyIso, diasAviso);
      if (v === "vencido") vencidos += 1;
      else if (v === "por_vencer") porVencer += 1;
      else if (v === "vigente") vigentes += 1;
    });
    return { company, cantidad: activos.length, costoMensualTotal, vigentes, porVencer, vencidos };
  });
}
