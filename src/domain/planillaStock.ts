// PLANILLA DE PRECIOS DEL STOCK (Nicolas, 21/11/2026): "quiero que se vincule con una planilla Excel, la cual se
// actualiza, y que exista un boton que lea la planilla y actualice lo que tenga que actualizar".
//
// La planilla es la de costos (una hoja por grupo: Codigo | Descripcion | Unidad | Costo neto). El cruce es POR
// CODIGO, que es la misma clave con la que el presupuesto encuentra el articulo.
//
// Dos reglas que ya estaban dichas y aca se cumplen:
//  - "sugerir antes que automatizar": leer NO cambia nada. Arma la lista de lo que cambiaria y se aplica lo tildado.
//  - "los precios no pueden bajar" (28/08/2026): lo que baja se muestra aparte y NO viene tildado.
// Solo se tocan PRECIOS. La planilla no crea articulos, no borra, no cambia cantidades ni descripciones.

export type HojaPlanilla = { nombre: string; filas: any[][] };
// masBarato / proveedorMasBarato (23/11/2026): "el precio mas bajo y quien es el proveedor que lo vende". Son las dos
// columnas de referencia de la planilla. undefined = la hoja no trae esas columnas (no se toca lo que haya anotado).
export type FilaPlanilla = { hoja: string; fila: number; codigo: string; descripcion: string; unidad: string; precio: number | null; masBarato?: number | null; proveedorMasBarato?: string };

const norm = (v: any) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Un numero de la planilla: ya numero, o texto a la argentina ("1.234,56") o a la inglesa ("1234.56"). */
export function aNumero(v: any): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").replace(/[$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  // "5.000" sin coma puede ser cinco o cinco mil: no se adivina, queda sin precio y se avisa.
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

const buscarColumna = (encabezado: string[], pruebas: Array<(t: string) => boolean>): number => {
  for (const prueba of pruebas) {
    const i = encabezado.findIndex((t) => t && prueba(t));
    if (i >= 0) return i;
  }
  return -1;
};

/**
 * Las filas con codigo de todas las hojas que tienen forma de lista de precios. Una hoja sirve si en sus primeras
 * filas hay un encabezado con "Codigo" y una columna de precio. Las demas (Resumen, "a revisar") se saltean.
 */
export function leerPlanilla(hojas: HojaPlanilla[]): { filas: FilaPlanilla[]; hojasLeidas: string[]; hojasSalteadas: string[] } {
  const filas: FilaPlanilla[] = [];
  const hojasLeidas: string[] = [];
  const hojasSalteadas: string[] = [];
  hojas.forEach((hoja) => {
    let iEnc = -1;
    let enc: string[] = [];
    for (let i = 0; i < Math.min(15, hoja.filas.length); i++) {
      const fila = (hoja.filas[i] || []).map(norm);
      if (fila.some((t) => t === "codigo" || t === "cod" || t === "cod.")) {
        iEnc = i;
        enc = fila;
        break;
      }
    }
    const cCodigo = enc.findIndex((t) => t === "codigo" || t === "cod" || t === "cod.");
    const cPrecio = buscarColumna(enc, [
      (t) => t === "costo neto",
      (t) => t.startsWith("costo neto"),
      (t) => t === "precio unitario" || t === "precio",
      (t) => t.startsWith("precio") && !t.includes("kg"),
      (t) => t === "costo",
    ]);
    if (iEnc < 0 || cPrecio < 0) {
      hojasSalteadas.push(hoja.nombre);
      return;
    }
    const cDesc = enc.findIndex((t) => t.startsWith("descrip"));
    const cUnidad = enc.findIndex((t) => t === "unidad" || t === "u.m." || t === "um");
    // Hierro: el costo neto es una formula. Con Kg/barra es Kg/barra x $/kg; sin Kg/barra (lo que se vende por
    // kilo, m2 o unidad) es el precio de lista tal cual. Si el Excel no la dejo calculada (la planilla real venia
    // asi: 663 formulas sin valor guardado), se hace la misma cuenta aca.
    const cKg = enc.findIndex((t) => t.startsWith("kg/barra") || t.startsWith("kg / barra"));
    const cPorKg = enc.findIndex((t) => t.includes("$/kg"));
    const cProveedor = enc.findIndex((t) => t.startsWith("proveedor mas barato"));
    const cMasBarato = enc.findIndex((t) => t.startsWith("mas barato"));
    const conReferencia = cProveedor >= 0 && cMasBarato >= 0;
    hojasLeidas.push(hoja.nombre);
    for (let i = iEnc + 1; i < hoja.filas.length; i++) {
      const f = hoja.filas[i] || [];
      const codigo = String(f[cCodigo] ?? "").trim().toUpperCase();
      if (!codigo) continue;
      let precio = aNumero(f[cPrecio]);
      if (precio == null && cPorKg >= 0) {
        const kg = cKg >= 0 ? aNumero(f[cKg]) : null;
        const porKg = aNumero(f[cPorKg]);
        if (porKg != null && porKg > 0) precio = Math.round((kg != null && kg > 0 ? kg * porKg : porKg) * 100) / 100;
      }
      filas.push({
        hoja: hoja.nombre,
        fila: i + 1,
        codigo,
        descripcion: cDesc >= 0 ? String(f[cDesc] ?? "").trim() : "",
        unidad: cUnidad >= 0 ? String(f[cUnidad] ?? "").trim() : "",
        precio: precio != null && precio > 0 ? Math.round(precio * 100) / 100 : null,
        ...(conReferencia
          ? (() => {
              const mb = aNumero(f[cMasBarato]);
              return { masBarato: mb != null && mb > 0 ? Math.round(mb * 100) / 100 : null, proveedorMasBarato: String(f[cProveedor] ?? "").trim() };
            })()
          : {}),
      });
    }
  });
  return { filas, hojasLeidas, hojasSalteadas };
}

export type ArticuloConPrecio = { id: number; code?: string; description?: string; unitPrice?: number; cheapestPrice?: number; cheapestSupplier?: string };
// La referencia de "mas barato" que la planilla trae distinta de la anotada en el articulo. masBarato null = la
// planilla la dejo vacia (se borra la anotada).
export type ReferenciaMasBarato = { id: number; masBarato: number | null; proveedor: string };
export type CambioDePrecio = {
  id: number;
  codigo: string;
  descripcion: string; // la del sistema
  descripcionPlanilla: string;
  hoja: string;
  antes: number;
  despues: number;
  pct: number | null; // null si antes era cero
  // La descripcion de la planilla no se parece a la del sistema: el codigo puede estar apuntando a otro articulo.
  descripcionDistinta: boolean;
};
export type NoAplicable = { codigo: string; descripcion: string; hoja: string; motivo: string };
export type ComparacionPlanilla = {
  suben: CambioDePrecio[];
  bajan: CambioDePrecio[];
  iguales: number;
  // Lo que la planilla trae y no se puede aplicar, con el motivo (no esta en el sistema, sin precio, repetido).
  noAplicables: NoAplicable[];
  // Articulos del sistema con codigo que la planilla no trae.
  faltanEnPlanilla: number;
  // Referencias de "mas barato" a anotar. No son precios: no cambian con que se cotiza.
  referencias?: ReferenciaMasBarato[];
};

const soloLetrasYNumeros = (v: any) => norm(v).replace(/[^a-z0-9]+/g, "");

export function compararPlanilla(filas: FilaPlanilla[], articulos: ArticuloConPrecio[]): ComparacionPlanilla {
  const out: ComparacionPlanilla = { suben: [], bajan: [], iguales: 0, noAplicables: [], faltanEnPlanilla: 0, referencias: [] };
  const porCodigo = new Map<string, ArticuloConPrecio[]>();
  articulos.forEach((a) => {
    const c = String(a.code || "").trim().toUpperCase();
    if (!c) return;
    porCodigo.set(c, [...(porCodigo.get(c) || []), a]);
  });
  const enPlanilla = new Map<string, FilaPlanilla[]>();
  filas.forEach((f) => enPlanilla.set(f.codigo, [...(enPlanilla.get(f.codigo) || []), f]));

  enPlanilla.forEach((grupo, codigo) => {
    const f = grupo[0];
    const no = (motivo: string) => out.noAplicables.push({ codigo, descripcion: f.descripcion, hoja: f.hoja, motivo });
    const precios = new Set(grupo.map((g) => g.precio));
    if (grupo.length > 1 && precios.size > 1) return no(`está ${grupo.length} veces en la planilla con precios distintos`);
    if (f.precio == null) return no("no tiene precio en la planilla");
    const arts = porCodigo.get(codigo) || [];
    if (arts.length === 0) return no("no está en el stock del sistema (la planilla no da de alta artículos)");
    if (arts.length > 1) return no(`el código está en ${arts.length} artículos del sistema: hay que corregirlo antes`);
    const a = arts[0];
    if (f.masBarato !== undefined && grupo.length === 1) {
      const proveedor = f.masBarato != null ? f.proveedorMasBarato || "" : "";
      const anotado = Number(a.cheapestPrice || 0) > 0 ? Math.round(Number(a.cheapestPrice) * 100) / 100 : null;
      const distinto = f.masBarato == null ? anotado != null : anotado == null || Math.abs(anotado - f.masBarato) >= 0.005;
      if (distinto || proveedor !== String(a.cheapestSupplier || "")) out.referencias!.push({ id: a.id, masBarato: f.masBarato, proveedor });
    }
    const antes = Math.round(Number(a.unitPrice || 0) * 100) / 100;
    const despues = f.precio;
    if (Math.abs(despues - antes) < 0.005) {
      out.iguales += 1;
      return;
    }
    const dp = soloLetrasYNumeros(f.descripcion);
    const ds = soloLetrasYNumeros(a.description);
    const cambio: CambioDePrecio = {
      id: a.id,
      codigo,
      descripcion: String(a.description || ""),
      descripcionPlanilla: f.descripcion,
      hoja: f.hoja,
      antes,
      despues,
      pct: antes > 0 ? Math.round(((despues - antes) / antes) * 1000) / 10 : null,
      descripcionDistinta: !!dp && !!ds && dp !== ds && !dp.includes(ds) && !ds.includes(dp),
    };
    (despues > antes ? out.suben : out.bajan).push(cambio);
  });
  porCodigo.forEach((_, codigo) => {
    if (!enPlanilla.has(codigo)) out.faltanEnPlanilla += 1;
  });
  const orden = (a: CambioDePrecio, b: CambioDePrecio) => a.codigo.localeCompare(b.codigo, "es", { numeric: true });
  out.suben.sort(orden);
  out.bajan.sort(orden);
  out.noAplicables.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  return out;
}

/** Lo que viene tildado: las subas cuya descripcion coincide. Las bajas y las dudosas se tildan a mano. */
export const tildadosPorDefecto = (c: ComparacionPlanilla): number[] => c.suben.filter((x) => !x.descripcionDistinta).map((x) => x.id);

/** Aplica los precios elegidos. No toca nada mas del articulo, ni los articulos que no estan en la lista. */
export function aplicarPrecios<T extends { id: number; unitPrice?: number }>(articulos: T[], cambios: Array<{ id: number; despues: number }>): T[] {
  const nuevo = new Map(cambios.map((c) => [c.id, c.despues]));
  if (nuevo.size === 0) return articulos;
  return articulos.map((a) => (nuevo.has(a.id) ? { ...a, unitPrice: nuevo.get(a.id)! } : a));
}

/** Anota la referencia de "mas barato" en los articulos. Es informativa: el precio con que se cotiza no se toca. */
export function aplicarReferencias<T extends { id: number; cheapestPrice?: number; cheapestSupplier?: string }>(articulos: T[], referencias: ReferenciaMasBarato[]): T[] {
  const nuevo = new Map(referencias.map((r) => [r.id, r]));
  if (nuevo.size === 0) return articulos;
  return articulos.map((a) => {
    const r = nuevo.get(a.id);
    if (!r) return a;
    return { ...a, cheapestPrice: r.masBarato ?? undefined, cheapestSupplier: r.masBarato != null ? r.proveedor : undefined };
  });
}
