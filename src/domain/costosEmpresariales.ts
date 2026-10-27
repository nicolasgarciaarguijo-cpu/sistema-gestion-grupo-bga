import { aggregateCosts, type CostSourceRow } from "./costs";
import type { CompanyName, CostGroup, CostKind, FixedMarker, WorkTypeName } from "./types";

// Costos empresariales (Marcadores): lo que cada empresa gasto en los ULTIMOS 3 MESES CERRADOS,
// grupo por grupo. El promedio es la SUGERENCIA de cuanto cargarle a los presupuestos; al costado
// se puede escribir otro valor y ese manda. Siempre por empresa: cada empresa con sus costos, y en
// cada grupo se elige si impacta en los presupuestos de esa empresa sola, de las dos o de ninguna.

export const MESES_DEL_PROMEDIO = 3;

export type ImpactoCosto = "empresa" | "ambas" | "ninguna";

// Los N meses anteriores al de hoy (el mes en curso no entra: esta a medio cargar).
export function ultimosMesesCerrados(hoy: string, n = MESES_DEL_PROMEDIO): string[] {
  const [y, m] = hoy.slice(0, 7).split("-").map(Number);
  const meses: string[] = [];
  for (let i = n; i >= 1; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return meses;
}

export type CostoEmpresarial = {
  company: CompanyName;
  group: string;
  kind: CostKind;
  auto: boolean;
  porMes: number[]; // alineado con los meses del promedio
  promedio: number; // suma de los 3 meses / 3
  // Lo escrito a mano (suma de los marcadores del grupo que no siguen el promedio); null = usa el promedio.
  valorManual: number | null;
  valorAUsar: number;
  impacta: ImpactoCosto;
  marcadores: FixedMarker[]; // los marcadores activos de este grupo y empresa
};

// Si nunca se eligio: los grupos fijos cargados a mano impactan en su empresa. Los variables y los
// automaticos (Personal) no, porque ya entran al presupuesto por otro lado (materiales,
// mano de obra) y se contarian dos veces.
export function impactoPorDefecto(kind: CostKind, auto: boolean): ImpactoCosto {
  return kind === "fijo" && !auto ? "empresa" : "ninguna";
}

const esDelGrupo = (m: FixedMarker, company: CompanyName, group: string) =>
  m.active && m.company === company && m.group === group;

export function costosEmpresariales(input: {
  hoy: string;
  company: CompanyName;
  groups: CostGroup[];
  rows: CostSourceRow[];
  marcadores: FixedMarker[];
}): CostoEmpresarial[] {
  const meses = ultimosMesesCerrados(input.hoy);
  const grupos = input.groups.filter((g) => g.company === input.company || g.company === "General");
  const agregado = aggregateCosts({ months: meses, groups: grupos, rows: input.rows, companyScope: input.company });
  return agregado.rows.map((r) => {
    const marcadores = input.marcadores.filter((m) => esDelGrupo(m, input.company, r.group));
    const manuales = marcadores.filter((m) => !m.sigueSugerido);
    const promedio = r.total / MESES_DEL_PROMEDIO;
    const valorManual = manuales.length ? manuales.reduce((a, m) => a + Number(m.amount || 0), 0) : null;
    const elegido = marcadores.find((m) => m.impactaEn)?.impactaEn;
    return {
      company: input.company,
      group: r.group,
      kind: r.kind,
      auto: r.auto,
      porMes: meses.map((m) => r.byMonth[m] || 0),
      promedio,
      valorManual,
      valorAUsar: valorManual ?? promedio,
      impacta: elegido ?? (manuales.length ? "empresa" : impactoPorDefecto(r.kind, r.auto)),
      marcadores,
    };
  });
}

// Id fijo para el renglon "promedio de 3 meses" de un grupo (no es un marcador guardado): el
// presupuesto lo reconoce igual al actualizar precios.
function idSintetico(company: string, group: string): number {
  let h = 0;
  const s = `${company}|${group}`;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 1_000_000_007;
  return -1_000_000_000 - h;
}

// Lo que entra como costos fijos al presupuesto de UNA empresa: sus costos empresariales que
// impactan, los de la otra empresa marcados "ambas", y los marcadores sueltos (de grupos que no
// estan en Costos) de esa empresa o marcados "ambas".
export function marcadoresParaPresupuesto(input: {
  empresa: CompanyName;
  workType: WorkTypeName;
  costos: CostoEmpresarial[]; // de todas las empresas
  marcadores: FixedMarker[];
}): FixedMarker[] {
  const tipoOk = (m: FixedMarker) => m.workType === input.workType || m.workType === "General";
  const llega = (company: CompanyName, impacta: ImpactoCosto) =>
    impacta === "ambas" || (impacta === "empresa" && company === input.empresa);

  const out: FixedMarker[] = [];
  const cubiertos = new Set<string>();
  input.costos.forEach((c) => {
    cubiertos.add(`${c.company}|${c.group}`);
    if (!llega(c.company, c.impacta)) return;
    if (c.valorManual != null) {
      out.push(...c.marcadores.filter((m) => !m.sigueSugerido && tipoOk(m)));
    } else if (c.promedio > 0) {
      out.push({
        id: idSintetico(c.company, c.group),
        company: c.company,
        workType: "General",
        group: c.group,
        description: `Promedio ${MESES_DEL_PROMEDIO} meses`,
        amount: Math.round(c.promedio),
        active: true,
        notes: "",
      });
    }
  });
  input.marcadores.forEach((m) => {
    if (!m.active || m.sigueSugerido || !tipoOk(m) || cubiertos.has(`${m.company}|${m.group}`)) return;
    if (llega(m.company, m.impactaEn ?? "empresa")) out.push(m);
  });
  return out;
}

// --- Ediciones desde el bloque: devuelven la lista de marcadores nueva ------------------------

// Escribir el "valor a usar": un marcador -> ese monto; varios -> se reparten en proporcion
// (no se pierde el detalle de cada concepto); ninguno -> se crea uno.
export function fijarValor(marcadores: FixedMarker[], c: CostoEmpresarial, valor: number, nuevoId: () => number, nota: string): FixedMarker[] {
  const ids = new Set(c.marcadores.map((m) => m.id));
  if (ids.size === 0) {
    return [
      ...marcadores,
      { id: nuevoId(), company: c.company, workType: "General", group: c.group, description: c.group, amount: Math.round(valor), active: true, notes: nota, impactaEn: c.impacta },
    ];
  }
  const suma = c.marcadores.reduce((a, m) => a + Number(m.amount || 0), 0);
  return marcadores.map((m) => {
    if (!ids.has(m.id)) return m;
    const monto = suma > 0 ? (Number(m.amount || 0) / suma) * valor : valor / ids.size;
    return { ...m, amount: Math.round(monto), sigueSugerido: false, impactaEn: c.impacta };
  });
}

// Volver al promedio: los marcadores quedan (con su monto viejo a la vista) pero dejan de mandar.
export function volverAlSugerido(marcadores: FixedMarker[], c: CostoEmpresarial): FixedMarker[] {
  const ids = new Set(c.marcadores.map((m) => m.id));
  return marcadores.map((m) => (ids.has(m.id) ? { ...m, sigueSugerido: true } : m));
}

// Elegir en que presupuestos impacta. Sin marcadores se crea uno que solo guarda la eleccion y
// sigue el promedio.
export function elegirImpacto(marcadores: FixedMarker[], c: CostoEmpresarial, impacta: ImpactoCosto, nuevoId: () => number): FixedMarker[] {
  if (c.marcadores.length === 0) {
    return [
      ...marcadores,
      { id: nuevoId(), company: c.company, workType: "General", group: c.group, description: c.group, amount: 0, active: true, notes: "", impactaEn: impacta, sigueSugerido: true },
    ];
  }
  const ids = new Set(c.marcadores.map((m) => m.id));
  return marcadores.map((m) => (ids.has(m.id) ? { ...m, impactaEn: impacta } : m));
}
