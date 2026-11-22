// LA CANTIDAD SE CORRIGE DE LOS DOS LADOS (Nicolas, 22/11/2026): "el control de stock lo quiero en ambas opciones,
// hay quienes no usan el sistema pero si podrian corregir la planilla".
//
// Para saber QUIEN cambio la cantidad, la planilla lleva dos columnas:
//   - "Cantidad": la que corrige la gente en el Excel.
//   - "Cantidad sistema": la que el sistema escribio la ultima vez que sincronizo. No se toca a mano.
// Con eso, por cada codigo:
//   - Cantidad = Cantidad sistema            -> nadie la toco en la planilla. No hay nada que traer.
//   - Cantidad != Cantidad sistema, y el sistema sigue en ese valor -> la corrigieron en la planilla: es un recuento.
//   - Cambiaron las dos y no coinciden       -> CHOQUE: se muestra y elige una persona. No viene tildado.
//   - No hay "Cantidad sistema" (planilla vieja) -> no se sabe quien cambio: se muestra, no viene tildado.
// "Sugerir antes que automatizar": comparar no cambia nada; se aplica lo tildado y queda como movimiento de stock.
import { aNumero, type HojaPlanilla } from "./planillaStock";

const norm = (v: any) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export type FilaCantidad = { hoja: string; fila: number; codigo: string; descripcion: string; cantidad: number | null; base: number | null };

const esCodigo = (t: string) => t === "codigo" || t === "cod" || t === "cod.";
const esCantidad = (t: string) => t === "cantidad" || t === "cant" || t === "cant." || t === "stock";
const esBase = (t: string) => t.startsWith("cantidad sistema") || t.startsWith("cant. sistema") || t === "sistema";

/** Una cantidad de la planilla. "5.000" sin coma se lee como cinco mil: en cantidades no hay precios con centavos. */
const aCantidad = (v: any): number | null => {
  if (typeof v === "string" && /^\s*-?\d{1,3}(\.\d{3})+\s*$/.test(v)) return Number(v.replace(/[.\s]/g, ""));
  return aNumero(v);
};

/** Las filas con codigo de las hojas que tienen columna "Cantidad". Las que no la tienen se saltean. */
export function leerCantidades(hojas: HojaPlanilla[]): { filas: FilaCantidad[]; hojasLeidas: string[]; tieneBase: boolean } {
  const filas: FilaCantidad[] = [];
  const hojasLeidas: string[] = [];
  let tieneBase = false;
  hojas.forEach((hoja) => {
    let iEnc = -1;
    let enc: string[] = [];
    for (let i = 0; i < Math.min(15, hoja.filas.length); i++) {
      const fila = (hoja.filas[i] || []).map(norm);
      if (fila.some(esCodigo)) {
        iEnc = i;
        enc = fila;
        break;
      }
    }
    const cCodigo = enc.findIndex(esCodigo);
    const cCant = enc.findIndex(esCantidad);
    if (iEnc < 0 || cCant < 0) return;
    const cBase = enc.findIndex(esBase);
    const cDesc = enc.findIndex((t) => t.startsWith("descrip"));
    if (cBase >= 0) tieneBase = true;
    hojasLeidas.push(hoja.nombre);
    for (let i = iEnc + 1; i < hoja.filas.length; i++) {
      const f = hoja.filas[i] || [];
      const codigo = String(f[cCodigo] ?? "").trim().toUpperCase();
      if (!codigo) continue;
      filas.push({
        hoja: hoja.nombre,
        fila: i + 1,
        codigo,
        descripcion: cDesc >= 0 ? String(f[cDesc] ?? "").trim() : "",
        cantidad: aCantidad(f[cCant]),
        base: cBase >= 0 ? aCantidad(f[cBase]) : null,
      });
    }
  });
  return { filas, hojasLeidas, tieneBase };
}

export type ArticuloConCantidad = { id: number; code?: string; description?: string; unit?: string; quantity?: number };
export type CambioDeCantidad = {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  hoja: string;
  enSistema: number; // la cantidad de hoy en el sistema
  enPlanilla: number; // la que escribieron en el Excel
  base: number | null; // la de la ultima sincronizacion
  diferencia: number; // enPlanilla - enSistema
};
export type ComparacionCantidades = {
  recuentos: CambioDeCantidad[]; // corregido solo en la planilla: vienen tildados
  choques: CambioDeCantidad[]; // cambiaron los dos lados: sin tildar
  sinReferencia: CambioDeCantidad[]; // planilla sin "Cantidad sistema": sin tildar
  iguales: number;
  noAplicables: Array<{ codigo: string; descripcion: string; hoja: string; motivo: string }>;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const igual = (a: number, b: number) => Math.abs(a - b) < 0.0005;

export function compararCantidades(filas: FilaCantidad[], articulos: ArticuloConCantidad[]): ComparacionCantidades {
  const out: ComparacionCantidades = { recuentos: [], choques: [], sinReferencia: [], iguales: 0, noAplicables: [] };
  const porCodigo = new Map<string, ArticuloConCantidad[]>();
  articulos.forEach((a) => {
    const c = String(a.code || "").trim().toUpperCase();
    if (c) porCodigo.set(c, [...(porCodigo.get(c) || []), a]);
  });
  const vistos = new Map<string, FilaCantidad[]>();
  filas.forEach((f) => vistos.set(f.codigo, [...(vistos.get(f.codigo) || []), f]));

  vistos.forEach((grupo, codigo) => {
    const f = grupo[0];
    const no = (motivo: string) => out.noAplicables.push({ codigo, descripcion: f.descripcion, hoja: f.hoja, motivo });
    if (grupo.length > 1 && new Set(grupo.map((g) => g.cantidad)).size > 1) return no(`está ${grupo.length} veces en la planilla con cantidades distintas`);
    // Celda vacia = no contaron ese articulo. No es un cero.
    if (f.cantidad == null) return;
    if (f.cantidad < 0) return no("la cantidad de la planilla es negativa");
    const arts = porCodigo.get(codigo) || [];
    if (arts.length === 0) return no("no está en el stock del sistema");
    if (arts.length > 1) return no(`el código está en ${arts.length} artículos del sistema: hay que corregirlo antes`);
    const a = arts[0];
    const enSistema = r3(Number(a.quantity || 0));
    const enPlanilla = r3(f.cantidad);
    if (igual(enPlanilla, enSistema)) {
      out.iguales += 1;
      return;
    }
    const cambio: CambioDeCantidad = {
      id: a.id,
      codigo,
      descripcion: String(a.description || ""),
      unidad: String(a.unit || ""),
      hoja: f.hoja,
      enSistema,
      enPlanilla,
      base: f.base,
      diferencia: r3(enPlanilla - enSistema),
    };
    if (f.base == null) return void out.sinReferencia.push(cambio);
    // La planilla sigue en la ultima sincronizacion: el que cambio fue el sistema. Se escribe al sincronizar, no se trae.
    if (igual(enPlanilla, f.base)) {
      out.iguales += 1;
      return;
    }
    (igual(enSistema, f.base) ? out.recuentos : out.choques).push(cambio);
  });
  const orden = (a: CambioDeCantidad, b: CambioDeCantidad) => a.codigo.localeCompare(b.codigo, "es", { numeric: true });
  out.recuentos.sort(orden);
  out.choques.sort(orden);
  out.sinReferencia.sort(orden);
  out.noAplicables.sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  return out;
}

export const recuentosTildados = (c: ComparacionCantidades): number[] => c.recuentos.map((x) => x.id);

type ConMovimientos = { id: number; quantity?: number; movements?: Array<{ id: number; date: string; type: "entrada" | "salida"; quantity: number; note: string }> };

/**
 * Aplica los recuentos elegidos: la cantidad queda en la de la planilla y la diferencia se anota como movimiento
 * (entrada si sobraba, salida si faltaba), para que el ajuste se vea en el historial del articulo.
 */
export function aplicarRecuentos<T extends ConMovimientos>(
  articulos: T[],
  cambios: Array<{ id: number; enPlanilla: number }>,
  fecha: string,
  nuevoId: () => number,
  nota = "Recuento corregido en la planilla"
): T[] {
  const nuevo = new Map(cambios.map((c) => [c.id, c.enPlanilla]));
  if (nuevo.size === 0) return articulos;
  return articulos.map((a) => {
    if (!nuevo.has(a.id)) return a;
    const antes = r3(Number(a.quantity || 0));
    const despues = r3(nuevo.get(a.id)!);
    if (igual(antes, despues)) return a;
    const movimiento = { id: nuevoId(), date: fecha, type: despues > antes ? ("entrada" as const) : ("salida" as const), quantity: r3(Math.abs(despues - antes)), note: `${nota} (de ${antes} a ${despues})` };
    return { ...a, quantity: despues, movements: [movimiento, ...(a.movements || [])] };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// EL SISTEMA ESCRIBE LA PLANILLA. "Si cambio algo del sistema debe cambiarse en esta planilla" (Nicolas, 22/11/2026).
// Aca solo se ARMA la lista de celdas a escribir (se puede testear); el archivo lo toca lib/planillaVinculada.
// Que escribe: Ubicacion, Cantidad y Cantidad sistema de cada codigo, y los articulos del sistema que la planilla no
// trae (en la hoja de su grupo, o en una hoja nueva con el nombre del grupo).
// Que NO toca: precios, descripciones y unidades de lo que ya esta (eso entra por las listas de los proveedores), ni
// la Cantidad que alguien corrigio en la planilla y todavia no se resolvio.
export type ArticuloParaPlanilla = ArticuloConCantidad & { group?: string; location?: string; unitPrice?: number; kind?: string; active?: boolean };
export type CeldaAEscribir = { hoja: string; fila: number; col: number; valor: string | number }; // fila y col desde 0
export type PlanDeEscritura = {
  celdas: CeldaAEscribir[];
  hojasNuevas: string[];
  resumen: { cantidades: number; ubicaciones: number; altas: number; pendientes: number };
};

const TITULOS_NUEVOS = ["Ubicación", "Cantidad", "Cantidad sistema"] as const;
const esUbicacion = (t: string) => t.startsWith("ubicacion");
const columnaDePrecio = (enc: string[]) => {
  const pruebas: Array<(t: string) => boolean> = [(t) => t.startsWith("costo neto"), (t) => t === "precio unitario" || t === "precio", (t) => t.startsWith("precio") && !t.includes("kg"), (t) => t === "costo"];
  for (const p of pruebas) {
    const i = enc.findIndex((t) => !!t && p(t));
    if (i >= 0) return i;
  }
  return -1;
};
const mismoTexto = (a: any, b: any) => String(a ?? "").trim() === String(b ?? "").trim();

export function planDeEscritura(hojas: HojaPlanilla[], articulos: ArticuloParaPlanilla[], sistemaGana: Set<number> = new Set()): PlanDeEscritura {
  const plan: PlanDeEscritura = { celdas: [], hojasNuevas: [], resumen: { cantidades: 0, ubicaciones: 0, altas: 0, pendientes: 0 } };
  const porCodigo = new Map<string, ArticuloParaPlanilla[]>();
  articulos.forEach((a) => {
    const c = String(a.code || "").trim().toUpperCase();
    if (c) porCodigo.set(c, [...(porCodigo.get(c) || []), a]);
  });
  const enPlanilla = new Set<string>();
  // Por hoja con encabezado: donde esta cada columna y cual es la primera fila libre (para las altas).
  const hojasConLista: Array<{ nombre: string; cols: Record<string, number>; libre: number }> = [];

  hojas.forEach((hoja) => {
    let iEnc = -1;
    let enc: string[] = [];
    for (let i = 0; i < Math.min(15, hoja.filas.length); i++) {
      const fila = (hoja.filas[i] || []).map(norm);
      if (fila.some(esCodigo)) {
        iEnc = i;
        enc = fila;
        break;
      }
    }
    if (iEnc < 0) return;
    const cols: Record<string, number> = {
      codigo: enc.findIndex(esCodigo),
      descripcion: enc.findIndex((t) => t.startsWith("descrip")),
      unidad: enc.findIndex((t) => t === "unidad" || t === "u.m." || t === "um"),
      precio: columnaDePrecio(enc),
      ubicacion: enc.findIndex(esUbicacion),
      cantidad: enc.findIndex(esCantidad),
      base: enc.findIndex(esBase),
    };
    // Solo las hojas con forma de lista (codigo + precio, o codigo + cantidad). Las de trabajo ("DAC - a revisar")
    // tienen codigos pero no son el stock: no se les agrega nada.
    if ((cols.precio < 0 && cols.cantidad < 0) || norm(hoja.nombre).includes("revisar")) return;
    // Las columnas que faltan se agregan al final del encabezado, en orden.
    let ultima = enc.reduce((m, t, i) => (t ? i : m), -1);
    (["ubicacion", "cantidad", "base"] as const).forEach((clave, i) => {
      if (cols[clave] >= 0) return;
      ultima += 1;
      cols[clave] = ultima;
      plan.celdas.push({ hoja: hoja.nombre, fila: iEnc, col: ultima, valor: TITULOS_NUEVOS[i] });
    });
    let libre = iEnc + 1;
    for (let i = iEnc + 1; i < hoja.filas.length; i++) {
      const f = hoja.filas[i] || [];
      if (f.some((v) => String(v ?? "").trim() !== "")) libre = i + 1;
      const codigo = String(f[cols.codigo] ?? "").trim().toUpperCase();
      if (!codigo) continue;
      enPlanilla.add(codigo);
      const arts = porCodigo.get(codigo) || [];
      if (arts.length !== 1) continue; // no esta en el sistema o esta repetido: no se toca
      const a = arts[0];
      const enSistema = r3(Number(a.quantity || 0));
      const escribir = (col: number, valor: string | number, cuenta: "cantidades" | "ubicaciones") => {
        const actual = f[col];
        const n = typeof valor === "number" ? aCantidad(actual) : null;
        const igualYa = typeof valor === "number" ? n != null && igual(n, valor) : mismoTexto(actual, valor);
        if (igualYa) return;
        plan.celdas.push({ hoja: hoja.nombre, fila: i, col, valor });
        plan.resumen[cuenta] += 1;
      };
      escribir(cols.ubicacion, String(a.location || "").trim(), "ubicaciones");
      const cant = aCantidad(f[cols.cantidad]);
      const base = aCantidad(f[cols.base]);
      // Alguien corrigio la Cantidad en la planilla y todavia no se resolvio: no se le pisa. Se resuelve desde la
      // ventana (vale la planilla -> el sistema ya quedo igual; vale el sistema -> viene en `sistemaGana`).
      const pendiente = cant != null && !igual(cant, enSistema) && (base == null || !igual(cant, base)) && !sistemaGana.has(a.id);
      if (pendiente) {
        plan.resumen.pendientes += 1;
        continue;
      }
      // Dos celdas (Cantidad y Cantidad sistema) pero UN articulo: en el resumen se cuenta una vez.
      const antes = plan.resumen.cantidades;
      escribir(cols.cantidad, enSistema, "cantidades");
      escribir(cols.base, enSistema, "cantidades");
      if (plan.resumen.cantidades > antes) plan.resumen.cantidades = antes + 1;
    }
    hojasConLista.push({ nombre: hoja.nombre, cols, libre });
  });

  // Altas: lo que esta en el sistema (activo, con codigo, de stock general) y la planilla no trae.
  const COLS_NUEVA: Record<string, number> = { codigo: 0, descripcion: 1, unidad: 2, precio: 3, ubicacion: 4, cantidad: 5, base: 6 };
  const nombresUsados = new Set(hojas.map((h) => norm(h.nombre)));
  const faltan = articulos
    .filter((a) => a.active !== false && (a.kind == null || a.kind === "general"))
    .filter((a) => {
      const c = String(a.code || "").trim().toUpperCase();
      return !!c && !enPlanilla.has(c) && (porCodigo.get(c) || []).length === 1;
    })
    .sort((a, b) => String(a.code).localeCompare(String(b.code), "es", { numeric: true }));
  faltan.forEach((a) => {
    const grupo = String(a.group || "").trim() || "Sin grupo";
    let destino = hojasConLista.find((h) => norm(h.nombre) === norm(grupo));
    if (!destino) {
      // Excel: nombre de hoja de hasta 31 caracteres y sin \ / ? * [ ] :
      let nombre = grupo.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sin grupo";
      if (nombresUsados.has(norm(nombre))) nombre = `${nombre.slice(0, 24)} (alta)`;
      nombresUsados.add(norm(nombre));
      plan.hojasNuevas.push(nombre);
      ["Código", "Descripción", "Unidad", "Costo neto", ...TITULOS_NUEVOS].forEach((t, col) => plan.celdas.push({ hoja: nombre, fila: 0, col, valor: t }));
      destino = { nombre, cols: COLS_NUEVA, libre: 1 };
      hojasConLista.push(destino);
    }
    const { nombre, cols } = destino;
    const fila = destino.libre;
    destino.libre += 1;
    const enSistema = r3(Number(a.quantity || 0));
    const poner = (col: number, valor: string | number) => {
      if (col >= 0) plan.celdas.push({ hoja: nombre, fila, col, valor });
    };
    poner(cols.codigo, String(a.code).trim().toUpperCase());
    poner(cols.descripcion, String(a.description || ""));
    poner(cols.unidad, String(a.unit || ""));
    poner(cols.precio, Math.round(Number(a.unitPrice || 0) * 100) / 100);
    poner(cols.ubicacion, String(a.location || "").trim());
    poner(cols.cantidad, enSistema);
    poner(cols.base, enSistema);
    plan.resumen.altas += 1;
  });
  return plan;
}

/** Aplica el plan sobre las hojas leidas (para tests y para volver a comparar): devuelve las hojas como quedarian. */
export function aplicarPlan(hojas: HojaPlanilla[], plan: PlanDeEscritura): HojaPlanilla[] {
  const out = [...hojas.map((h) => ({ nombre: h.nombre, filas: h.filas.map((f) => [...(f || [])]) })), ...plan.hojasNuevas.map((nombre) => ({ nombre, filas: [] as any[][] }))];
  plan.celdas.forEach((c) => {
    const h = out.find((x) => x.nombre === c.hoja);
    if (!h) return;
    while (h.filas.length <= c.fila) h.filas.push([]);
    const f = h.filas[c.fila];
    while (f.length <= c.col) f.push("");
    f[c.col] = c.valor;
  });
  return out;
}
