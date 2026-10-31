// CHECKLIST ANTES DE LANZAR A PRODUCCION (Nicolas, 30/10/2026): "van a haber ciertos requisitos a lograr antes de poder
// lanzar un trabajo a produccion. 1. contar con los materiales 2. contar con los insumos 3. contar con los herrajes y
// accesorios. Una vez que se da el ok al check list, el cual deberia estar conectado con la solapa de stock y tambien
// tener la posibilidad de completarse manualmente, empieza el sistema a encontrarle un momento en la produccion".
//
// Cada punto se da por cumplido SOLO (el stock alcanza para todo lo de ese rubro, ya repartido entre los trabajos que
// arrancan antes: domain/materialNeeds) o A MANO (queda quien lo firmo y cuando: el stock todavia no esta completo).
// Un rubro que el presupuesto no lleva (sin herrajes, por ejemplo) se da por cumplido. Pero si el presupuesto no tiene
// NINGUN renglon (presupuestos sin detalle de materiales) no se sabe nada: cada punto pide el ok a mano.
//
// Puro: el llamador resuelve el stock y pasa los faltantes por renglon.
import type { BudgetSnapshot, Material } from "./types";

export type RubroChecklist = "materiales" | "insumos" | "herrajes";
export const RUBROS_CHECKLIST: RubroChecklist[] = ["materiales", "insumos", "herrajes"];
export const ETIQUETA_RUBRO: Record<RubroChecklist, string> = {
  materiales: "Materiales",
  insumos: "Insumos",
  herrajes: "Herrajes y accesorios",
};

// El ok A MANO de un rubro. Firma siempre el usuario que opera (como los pagos).
export type MarcaChecklist = { ok: boolean; firmante: string; firmadoEn: string; nota?: string };
export type ChecklistProduccion = Partial<Record<RubroChecklist, MarcaChecklist>>;

// A que rubro del checklist va un renglon del presupuesto. Los insumos basicos del presupuesto son insumos; del resto
// manda el grupo de Stock. Los servicios (corte tercerizado, flete) no son algo que se tenga: quedan afuera.
// Lo elegido por grupo de Stock en Acceso → Listados del sistema (nombre normalizado → rubro); manda sobre el nombre.
export const RUBRO_POR_GRUPO_STOCK: Record<string, RubroChecklist | "fuera"> = {};
const normGrupo = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function rubroDeRenglon(stockGroup: string | undefined, deInsumosBasicos: boolean): RubroChecklist | null {
  const elegido = deInsumosBasicos ? undefined : RUBRO_POR_GRUPO_STOCK[normGrupo(String(stockGroup || ""))];
  if (elegido) return elegido === "fuera" ? null : elegido;
  const g = String(stockGroup || "").toLowerCase();
  if (/servicio/.test(g)) return null;
  if (deInsumosBasicos || /insumo/.test(g)) return "insumos";
  if (/herraj|accesori|electric/.test(g)) return "herrajes";
  return "materiales";
}

export type RenglonTrabajo = Material & { rubro: RubroChecklist };

// TODO lo que pide el trabajo: lo suelto del presupuesto Y lo de cada bloque (subpresupuesto) por su cantidad. Los
// presupuestos armados en bloques guardan ahi todo el detalle (el 3429 de Migueletes tiene 21 bloques y nada suelto).
export function renglonesDelTrabajo(snapshot: Pick<BudgetSnapshot, "materials" | "basicSupplies" | "subBudgets"> | undefined): RenglonTrabajo[] {
  if (!snapshot) return [];
  const out: RenglonTrabajo[] = [];
  const sumar = (lista: Material[] | undefined, deInsumos: boolean, veces: number) =>
    (lista || []).forEach((m) => {
      const rubro = rubroDeRenglon(m.stockGroup, deInsumos);
      const qty = Number(m.qty || 0) * veces;
      if (rubro && qty > 0) out.push({ ...m, qty, rubro });
    });
  sumar(snapshot.materials, false, 1);
  sumar(snapshot.basicSupplies, true, 1);
  (snapshot.subBudgets || []).forEach((b) => {
    const veces = Number(b.quantity) > 0 ? Number(b.quantity) : 1;
    sumar(b.materials, false, veces);
    sumar(b.basicSupplies, true, veces);
  });
  return out;
}

export type FaltanteChecklist = { description: string; unit: string; missing: number };
export type EstadoRubro = {
  rubro: RubroChecklist;
  renglones: number;
  faltantes: FaltanteChecklist[];
  // "stock": alcanza con lo que hay · "a_mano": lo firmo alguien · "no_lleva": el presupuesto no tiene · "falta" ·
  // "sin_detalle": el presupuesto no tiene ningun material cargado (no se puede saber: ok a mano)
  estado: "stock" | "a_mano" | "no_lleva" | "falta" | "sin_detalle";
  marca?: MarcaChecklist;
};
export type EstadoChecklist = { rubros: EstadoRubro[]; listo: boolean; cumplidos: number };

// Estado del checklist de un trabajo: los renglones con su rubro y lo que le falta a cada uno (ya repartido el stock).
export function estadoChecklist(
  renglones: Array<{ rubro: RubroChecklist }>,
  faltantes: Array<FaltanteChecklist & { rubro: RubroChecklist }>,
  marcas: ChecklistProduccion | undefined
): EstadoChecklist {
  const rubros = RUBROS_CHECKLIST.map<EstadoRubro>((rubro) => {
    const n = renglones.filter((r) => r.rubro === rubro).length;
    const f = faltantes.filter((x) => x.rubro === rubro && x.missing > 0).map(({ description, unit, missing }) => ({ description, unit, missing }));
    const marca = marcas?.[rubro]?.ok ? marcas[rubro] : undefined;
    const estado: EstadoRubro["estado"] = marca ? "a_mano" : renglones.length === 0 ? "sin_detalle" : n === 0 ? "no_lleva" : f.length === 0 ? "stock" : "falta";
    return { rubro, renglones: n, faltantes: f, estado, marca };
  });
  const cumplidos = rubros.filter((r) => r.estado !== "falta" && r.estado !== "sin_detalle").length;
  return { rubros, listo: cumplidos === rubros.length, cumplidos };
}
