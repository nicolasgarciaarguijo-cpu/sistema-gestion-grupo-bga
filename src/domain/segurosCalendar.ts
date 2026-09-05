// Previsión mensual de seguros para el Calendario anual (la planilla).
//
// Cada seguro ACTIVO que alimenta la planilla genera, mes a mes dentro de su vigencia, una PREVISIÓN
// de egreso (lo que se viene). NO es plata real: entra por un carril separado que NO suma al neto del
// calendario (el neto lo mueve el débito real del banco). Cuando cae el débito, se concilia visualmente
// contra esta previsión. Funciones puras y testeadas; sin React ni estado.
import type { Seguro } from "./types";

// Monto mensual del seguro: fijo (numérica) o % sobre una base (porcentual).
export function montoMensualSeguro(s: {
  rendicion?: "numerica" | "porcentual";
  costoMensual: number;
  porcentaje?: number;
  montoBase?: number;
}): number {
  if (s.rendicion === "porcentual") {
    return (Number(s.montoBase || 0) * Number(s.porcentaje || 0)) / 100;
  }
  return Number(s.costoMensual || 0);
}

// Mapea el tipo de seguro (texto libre) al renglón del Calendario anual (ver domain/calendarStructure).
// Si el seguro ya trae conceptKey, manda ese. Si no reconoce el tipo, devuelve "" (queda sin renglón fijo).
export function conceptKeyForSeguro(seguro: { tipo: string; conceptKey?: string }): string {
  if (seguro.conceptKey) return seguro.conceptKey;
  const t = (seguro.tipo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (t.includes("vehic") || t.includes("auto")) return "seg_vehiculo";
  if (t.includes("caucion")) return "seg_caucion_1";
  if (t.includes("inmueble")) return "seg_inmueble";
  if (t.includes("responsabil") || t.includes("resp civil") || t.includes("civil")) return "seg_resp_civil";
  if (t.includes("integral") || t.includes("comercio")) return "seg_integral_comercio";
  if (t.includes("maquina")) return "seg_maquinarias";
  return "";
}

// True si el tipo es ART (Aseguradora de Riesgos del Trabajo). Su costo ya está en la nómina.
export function esArtSeguro(tipo?: string): boolean {
  const t = (tipo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return t === "art" || t.startsWith("art ") || t.includes("aseguradora de riesgos");
}

// True si el seguro debe generar previsión: activo, alimenta la planilla, y con monto > 0.
// La ART queda afuera por defecto (su costo ya está en la nómina); el usuario puede forzarla marcando
// alimentaPlanilla = true, o excluir cualquier seguro con alimentaPlanilla = false.
export function seguroGeneraPrevision(s: Seguro): boolean {
  if (s.estado === "baja") return false;
  if (s.alimentaPlanilla === false) return false;
  if (s.alimentaPlanilla == null && esArtSeguro(s.tipo)) return false;
  return montoMensualSeguro(s) > 0;
}

// True si el mes "yyyy-mm" cae dentro de la vigencia del seguro. Vigencia vacía = sin límite por ese lado.
export function mesEnVigencia(monthKey: string, vigenciaDesde: string, vigenciaHasta: string): boolean {
  const m = monthKey.slice(0, 7);
  const desde = (vigenciaDesde || "").slice(0, 7);
  const hasta = (vigenciaHasta || "").slice(0, 7);
  if (desde && m < desde) return false;
  if (hasta && m > hasta) return false;
  return true;
}

export type SeguroPrevisionEntry = {
  seguroId: number;
  company: string;
  date: string; // ISO yyyy-mm-dd (día de débito, acotado al último día del mes)
  amount: number;
  administration: "blanco" | "negro";
  conceptKey: string;
  tipo: string;
  descripcion: string;
};

// Último día de un mes "yyyy-mm" (para acotar el día de débito: 31 en febrero -> 28/29).
function ultimoDiaDelMes(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// Genera las previsiones mensuales de seguros para los meses dados (del año fiscal).
export function segurosPrevisionMensual(seguros: Seguro[], monthKeys: string[]): SeguroPrevisionEntry[] {
  const out: SeguroPrevisionEntry[] = [];
  seguros.forEach((s) => {
    if (!seguroGeneraPrevision(s)) return;
    const amount = montoMensualSeguro(s);
    const conceptKey = conceptKeyForSeguro(s);
    const dia = Math.min(Math.max(1, Math.round(Number(s.diaDebito || 10))), 31);
    monthKeys.forEach((monthKey) => {
      if (!mesEnVigencia(monthKey, s.vigenciaDesde, s.vigenciaHasta)) return;
      const diaAcotado = Math.min(dia, ultimoDiaDelMes(monthKey));
      out.push({
        seguroId: s.id,
        company: s.company,
        date: `${monthKey}-${String(diaAcotado).padStart(2, "0")}`,
        amount,
        administration: s.administration === "negro" ? "negro" : "blanco",
        conceptKey,
        tipo: s.tipo,
        descripcion: s.descripcion,
      });
    });
  });
  return out;
}
