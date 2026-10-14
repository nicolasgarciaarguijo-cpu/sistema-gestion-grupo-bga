// FASE 5 · STOCK Y REMITOS (Nicolas, 2026-10-14).
//
// Tres tipos de remito, todos con historial (ya no se borran al cargarlos):
//   - RECEPCION: el material que llega del proveedor. Es lo que hace ENTRAR el material al stock. La
//     factura de compra se vincula al remito y NO vuelve a sumar. Si llega una factura sin remito, sus
//     renglones cargan una recepcion vinculada a esa factura (la reemplaza).
//   - SALIDA POR TRABAJO: el material que se usa en un trabajo aprobado. Descuenta del stock, imputado a
//     ese trabajo (sirve para el costo real).
//   - ENTREGA AL CLIENTE: el remito que acompana lo que se entrega del trabajo. Es un documento: no mueve
//     stock (es producto terminado).
// Solo las compras de MATERIALES van al stock.
//
// Funciones puras: el remito se puede editar o quitar y el stock se corrige solo (se deshace el efecto
// anterior y se aplica el nuevo).

export type TipoRemito = "recepcion" | "salida" | "entrega";

export const TIPOS_REMITO: Record<TipoRemito, { label: string; prefijo: string }> = {
  recepcion: { label: "Recepción de proveedor", prefijo: "R" },
  salida: { label: "Salida de stock por trabajo", prefijo: "S" },
  entrega: { label: "Entrega al cliente", prefijo: "E" },
};

export type RenglonRemito = {
  id: number;
  stockItemId: number | null;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  grupo?: string; // grupo de stock, para dar de alta un item nuevo
};

export type Remito = {
  id: number;
  company: string;
  tipo: TipoRemito;
  numero: string; // el del proveedor en una recepcion; el nuestro (R-/S-/E-0001) en salidas y entregas
  fecha: string;
  proveedor?: string;
  taxId?: string;
  purchaseInvoiceId?: number | null; // factura que paga / respalda esta recepcion
  jobId?: number | null; // trabajo (salida y entrega)
  cliente?: string;
  destino?: string;
  renglones: RenglonRemito[];
  notas: string;
  archivo?: string;
  creadoEl: string;
};

export type MovimientoStock = {
  id: number;
  date: string;
  type: "entrada" | "salida";
  quantity: number;
  note: string;
  remitoId?: number;
  jobId?: number;
};

export type ItemStockLike = {
  id: number;
  quantity: number;
  unitPrice: number;
  movements?: MovimientoStock[];
};

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

// Cuanto mueve el remito cada item del stock (+ entra, - sale). La entrega no mueve stock.
export function efectoEnStock(r: Remito | null | undefined): Map<number, number> {
  const out = new Map<number, number>();
  if (!r || r.tipo === "entrega") return out;
  const signo = r.tipo === "recepcion" ? 1 : -1;
  r.renglones.forEach((g) => {
    if (g.stockItemId == null) return;
    const q = num(g.cantidad);
    if (!q) return;
    out.set(g.stockItemId, (out.get(g.stockItemId) || 0) + signo * q);
  });
  return out;
}

const textoMovimiento = (r: Remito) =>
  r.tipo === "recepcion"
    ? `Remito ${r.numero || "s/n"}${r.proveedor ? " · " + r.proveedor : ""}`
    : `Salida ${r.numero || ""}${r.cliente ? " · " + r.cliente : ""}`.trim();

// Aplica (o corrige) el efecto de un remito sobre el stock: deshace el `anterior` y aplica el `nuevo`.
// Para quitar un remito: nuevo = null. Para uno nuevo: anterior = null.
// En una recepcion NUEVA, el precio del item pasa a ser el promedio ponderado (como se hacia antes).
export function aplicarRemito<T extends ItemStockLike>(
  items: T[],
  anterior: Remito | null,
  nuevo: Remito | null,
  nuevoIdMovimiento: () => number
): T[] {
  const viejo = efectoEnStock(anterior);
  const actual = efectoEnStock(nuevo);
  const remitoId = (nuevo || anterior)?.id;
  const tocados = new Set<number>([...Array.from(viejo.keys()), ...Array.from(actual.keys())]);
  if (!tocados.size) return items;
  const precioNuevo = new Map<number, number>();
  if (nuevo && !anterior && nuevo.tipo === "recepcion") {
    nuevo.renglones.forEach((g) => {
      if (g.stockItemId != null && num(g.precioUnitario) > 0) precioNuevo.set(g.stockItemId, num(g.precioUnitario));
    });
  }
  return items.map((it) => {
    if (!tocados.has(it.id)) return it;
    const delta = (actual.get(it.id) || 0) - (viejo.get(it.id) || 0);
    const qAntes = num(it.quantity);
    const qDespues = Math.round((qAntes + delta) * 1000) / 1000;
    let unitPrice = num(it.unitPrice);
    const pIn = precioNuevo.get(it.id);
    if (pIn != null && delta > 0) {
      const base = Math.max(0, qAntes);
      unitPrice = base + delta > 0 ? Number(((base * unitPrice + delta * pIn) / (base + delta)).toFixed(2)) : pIn;
    }
    const movimientos = (it.movements || []).filter((m) => m.remitoId !== remitoId);
    const q = actual.get(it.id);
    if (nuevo && q) {
      movimientos.unshift({
        id: nuevoIdMovimiento(),
        date: nuevo.fecha,
        type: q > 0 ? "entrada" : "salida",
        quantity: Math.abs(q),
        note: textoMovimiento(nuevo),
        remitoId: nuevo.id,
        ...(nuevo.jobId != null ? { jobId: nuevo.jobId } : {}),
      });
    }
    return { ...it, quantity: qDespues, unitPrice, movements: movimientos };
  });
}

// Proximo numero propio por empresa y tipo: R-0001, S-0001, E-0001.
export function proximoNumero(remitos: Remito[], company: string, tipo: TipoRemito): string {
  const pre = TIPOS_REMITO[tipo].prefijo + "-";
  const max = remitos
    .filter((r) => r.company === company && r.tipo === tipo && r.numero.startsWith(pre))
    .reduce((m, r) => Math.max(m, Number(r.numero.slice(pre.length)) || 0), 0);
  return pre + String(max + 1).padStart(4, "0");
}

// Una compra va al stock si es de MATERIALES: su grupo de costo habla de materiales o insumos.
export const esCompraDeMateriales = (grupoCosto?: string) => /materia|insumo/i.test(String(grupoCosto || ""));

const normal = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Recepciones del proveedor que todavia no tienen factura (para vincular desde la factura).
export function recepcionesSinFactura(remitos: Remito[], company: string, proveedor: string, taxId = ""): Remito[] {
  const p = normal(proveedor);
  const c = normal(taxId);
  return remitos.filter(
    (r) =>
      r.tipo === "recepcion" &&
      r.company === company &&
      r.purchaseInvoiceId == null &&
      ((c && normal(r.taxId || "") === c) || (p && normal(r.proveedor || "") === p))
  );
}

// Lo que salio del stock para un trabajo (costo real de materiales).
export function costoSalidasDelTrabajo(remitos: Remito[], jobId: number) {
  return remitos
    .filter((r) => r.tipo === "salida" && r.jobId === jobId)
    .reduce((a, r) => a + r.renglones.reduce((x, g) => x + num(g.cantidad) * num(g.precioUnitario), 0), 0);
}
