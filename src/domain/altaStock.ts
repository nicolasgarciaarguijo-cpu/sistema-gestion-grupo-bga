// ALTA DE UN ARTICULO DE STOCK: UNA SOLA PUERTA (Nicolas, 16/11/2026).
//
// Un articulo de stock se daba de alta desde SEIS lugares distintos: la solapa Stock, el material de un
// presupuesto, el remito que se revisa, la ficha de una maquina, las provisiones de personal y la entrega
// a un empleado. Cada lugar armaba el objeto a mano, asi que cualquier campo nuevo o cualquier regla (como
// el codigo) quedaba en cinco lugares y mal en el sexto. Misma idea que domain/altaProveedor.ts.
//
// EL CODIGO es lo que cruza el material del presupuesto con el stock (domain/stockMatch), asi que dos
// articulos con el mismo codigo hacen que un presupuesto mire el articulo equivocado. Por eso el proximo
// numero se calcula POR PREFIJO y sobre TODOS los articulos, no por grupo: dos grupos pueden compartir
// prefijo, y en ese caso los dos arrancaban en 001.

export type ArticuloStock = {
  id: number;
  company: string;
  kind: string;
  shared: boolean;
  group: string;
  location: string;
  sortOrder: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  periodicityMonths: number;
  active: boolean;
};

export type OrigenAltaStock =
  | "stock" // la solapa Stock, a mano
  | "material" // un material del presupuesto que se pasa al stock
  | "remito" // el remito que se revisa y entra
  | "maquina" // la ficha de una maquina
  | "personal" // las provisiones de personal (EPP, insumos)
  | "empleado"; // una entrega a un empleado

export type DatosAltaStock = {
  origen: OrigenAltaStock;
  company: string;
  group: string;
  description?: string;
  kind?: string;
  shared?: boolean;
  location?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  periodicityMonths?: number;
};

const secuenciaDelCodigo = (code: string): number => {
  const m = String(code || "").match(/-(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};

// El proximo codigo del grupo: <PREFIJO>-001, contando TODO lo que ya usa ese prefijo (de cualquier grupo
// y de cualquier tipo), asi dos grupos que comparten prefijo no arrancan los dos en 001.
export function proximoCodigoStock(
  items: Array<{ id: number; code: string }>,
  group: string,
  prefijoDeGrupo: (grupo: string) => string,
  excluirId?: number
): string {
  const prefijo = prefijoDeGrupo(group);
  const max = items
    .filter((it) => it.id !== excluirId && String(it.code || "").toUpperCase().startsWith(`${prefijo}-`))
    .reduce((acc, it) => Math.max(acc, secuenciaDelCodigo(it.code)), 0);
  return `${prefijo}-${String(max + 1).padStart(3, "0")}`;
}

const proximoOrden = (items: Array<{ sortOrder?: number }>): number =>
  items.reduce((acc, it) => Math.max(acc, Number(it.sortOrder || 0)), 0) + 1;

// El articulo nuevo, completo y con el codigo que le toca. Los valores por defecto son los mismos para
// todos los origenes: lo que cambia lo dice `datos`.
export function nuevoArticuloStock(
  id: number,
  datos: DatosAltaStock,
  items: ArticuloStock[],
  prefijoDeGrupo: (grupo: string) => string
): ArticuloStock {
  const kind = datos.kind || "general";
  return {
    id,
    company: datos.company,
    kind,
    // Compartido: lo ven las dos empresas. Las provisiones de personal y las maquinas se comparten.
    shared: datos.shared ?? (datos.company === "General" || datos.origen === "maquina" || datos.origen === "personal"),
    group: datos.group,
    location: datos.location || "",
    sortOrder: proximoOrden(items),
    code: proximoCodigoStock(items, datos.group, prefijoDeGrupo),
    description: (datos.description || "").trim(),
    unit: datos.unit || "u",
    quantity: Number(datos.quantity || 0),
    unitPrice: Number(datos.unitPrice || 0),
    // Las provisiones de personal se entregan cada tantos meses; el resto no tiene periodicidad.
    periodicityMonths: Number(datos.periodicityMonths ?? (datos.origen === "personal" || datos.origen === "empleado" ? 6 : 0)),
    active: true,
  };
}

// Lo que le falta al articulo para servir (la descripcion es con lo que se lo busca; el codigo es con lo
// que lo encuentra el material del presupuesto).
export function faltaDelArticulo(it: { code?: string; description?: string; group?: string; unit?: string }): string[] {
  const falta: string[] = [];
  if (!String(it.description || "").trim()) falta.push("la descripción");
  if (!String(it.code || "").trim()) falta.push("el código");
  if (!String(it.group || "").trim()) falta.push("el grupo");
  if (!String(it.unit || "").trim()) falta.push("la unidad");
  return falta;
}

export const textoFaltaArticulo = (falta: string[]): string =>
  falta.length === 0 ? "" : `⚠ falta ${falta.join(", ")}`;

// Los codigos que quedaron repetidos: el material del presupuesto cruza por codigo, asi que uno repetido
// hace que mire el articulo equivocado. Devuelve, por codigo, todos los articulos que lo usan.
export function codigosRepetidos(
  items: Array<{ id: number; code: string; description?: string; company?: string }>
): Map<string, Array<{ id: number; code: string; description?: string; company?: string }>> {
  const porCodigo = new Map<string, Array<{ id: number; code: string; description?: string; company?: string }>>();
  items.forEach((it) => {
    const clave = String(it.code || "").trim().toUpperCase();
    if (!clave) return;
    if (!porCodigo.has(clave)) porCodigo.set(clave, []);
    porCodigo.get(clave)!.push(it);
  });
  return new Map(Array.from(porCodigo.entries()).filter(([, lista]) => lista.length > 1));
}
