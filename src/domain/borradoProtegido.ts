// BORRADO PROTEGIDO (Nicolas, 12/11/2026): "siempre que sea dentro de la hora se puede borrar; cualquier persona
// autorizada podria borrarlo. Si la carga supera la hora, el borrado dispara una alerta que solo yo debo poder
// autorizar como superadmin. Y cada vez que abra el sistema me deberia aparecer el listado de cosas por autorizar".
//
// Como funciona (App.tsx `vigilar`): cada coleccion de registros pasa por aca en sus cambios hechos por el usuario
// (los set con funcion). Lo que aparece nuevo se sella con `creadoEn`. Lo que desaparece se mira uno por uno: si se
// cargo hace menos de una hora (o lo borra el superadmin) se borra; si no, se repone en su lugar y queda un pedido
// de borrado. Lo cargado antes de que existiera el sello no tiene `creadoEn`: cuenta como viejo (pide autorizacion).
// La carga desde la base (arrays, no funciones) no pasa por aca: no sella ni bloquea lo que borro otra sesion.

export const VENTANA_BORRADO_MS = 60 * 60 * 1000;

// "Solo yo autorizo" (Nicolas, 12/11/2026): el unico que autoriza pedidos y borra directo es su usuario. Los demas
// superadmin (ej. "Usuario de prueba (capturas)") borran como cualquiera: dentro de la hora, o con pedido.
export const AUTORIZADOR_BORRADOS_ID = "2ce5a4ec-4af2-488e-993b-15793f3bf030";

type ConId = { id: number | string; creadoEn?: string; [k: string]: any };

export type ItemBloqueado = {
  coleccion: string;
  refId: number | string;
  // Si es un hijo (un cobro dentro de un trabajo): de que padre y en que lista.
  padreId?: number | string;
  hijo?: string;
  company?: string;
  resumen: string;
  creadoEn?: string;
};

export type PedidoBorrado = {
  id: number;
  company: string;
  pedidoPor: string;
  pedidoEn: string;
  estado: "pendiente" | "autorizado" | "rechazado";
  resueltoPor?: string;
  resueltoEn?: string;
  items: ItemBloqueado[];
};

export const esReciente = (creadoEn: string | undefined, ahora: number) => {
  if (!creadoEn) return false;
  const t = Date.parse(creadoEn);
  return Number.isFinite(t) && ahora - t >= -5 * 60 * 1000 && ahora - t < VENTANA_BORRADO_MS;
};

const fechaCorta = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** Una linea para reconocer el registro: fecha, nombre o detalle y monto. */
export function resumenDe(item: any): string {
  if (!item || typeof item !== "object") return String(item);
  const fecha = fechaCorta(item.date || item.fecha || item.invoiceDate || item.deliveredDate || item.approvalDate || item.closingDate || item.fechaInicio);
  const nombre =
    item.supplier || item.responsible || item.name || item.client || item.persona || item.person || item.nombre || item.titulo || item.title || "";
  const detalle = item.description || item.descripcion || item.concept || item.motivo || item.invoiceNumber || item.notes || "";
  const montoN = Number(item.amount ?? item.monto ?? item.total ?? item.assignedAmount ?? item.soldNetPrice ?? NaN);
  const monto = Number.isFinite(montoN) && montoN !== 0 ? `$ ${Math.round(montoN).toLocaleString("es-AR")}` : "";
  return [fecha, nombre, detalle && detalle !== nombre ? String(detalle).slice(0, 80) : "", monto].filter(Boolean).join(" · ") || `#${item.id}`;
}

const sellarLista = (prev: ConId[] | undefined, next: ConId[], ahora: string): ConId[] => {
  const antes = new Set((prev || []).map((x) => x?.id));
  let cambio = false;
  const out = next.map((x) => {
    if (!x || typeof x !== "object" || x.id == null || antes.has(x.id) || x.creadoEn) return x;
    cambio = true;
    return { ...x, creadoEn: ahora };
  });
  return cambio ? out : next;
};

/** Sella `creadoEn` en lo nuevo (y en los hijos nuevos de las listas `hijos`). */
export function sellarAltas<T extends ConId>(prev: T[], next: T[], ahora: number, hijos: string[] = []): T[] {
  const iso = new Date(ahora).toISOString();
  let out = sellarLista(prev, next, iso) as T[];
  if (hijos.length) {
    const prevPorId = new Map(prev.map((p) => [p.id, p]));
    let cambio = false;
    const conHijos = out.map((padre) => {
      const anterior = prevPorId.get(padre.id);
      let p = padre;
      hijos.forEach((h) => {
        const lista = (p as any)[h];
        if (!Array.isArray(lista)) return;
        const sellada = sellarLista(anterior ? (anterior as any)[h] : [], lista, iso);
        if (sellada !== lista) {
          p = { ...p, [h]: sellada };
          cambio = true;
        }
      });
      return p;
    });
    if (cambio) out = conHijos;
  }
  return out;
}

// Repone `quitados` en `lista` en el lugar que tenian en `original`.
const reponer = <T extends ConId>(original: T[], lista: T[], quitados: T[]): T[] => {
  if (!quitados.length) return lista;
  const out = [...lista];
  quitados.forEach((q) => {
    const idx = original.findIndex((o) => o.id === q.id);
    out.splice(Math.min(Math.max(idx, 0), out.length), 0, q);
  });
  return out;
};

/**
 * Separa lo que se puede borrar de lo que necesita autorizacion. Devuelve la lista con lo bloqueado repuesto y lo
 * bloqueado. Si todo lo que cambio fue un borrado bloqueado, devuelve `prev` tal cual (sin render de mas).
 */
export function separarBorrado<T extends ConId>(
  coleccion: string,
  prev: T[],
  next: T[],
  opciones: { puedeTodo: boolean; ahora: number; hijos?: string[] }
): { lista: T[]; bloqueados: ItemBloqueado[] } {
  if (opciones.puedeTodo || !Array.isArray(prev) || !Array.isArray(next)) return { lista: next, bloqueados: [] };
  const bloqueados: ItemBloqueado[] = [];
  const quedan = new Set(next.map((x) => x?.id));
  // Lo que el sistema arma solo (autoGenerated: los reflejos de los trabajos en el calendario) se rehace solo: no es una
  // carga de nadie y no se protege.
  const quitadosBloqueados = prev.filter((x) => x && x.id != null && !x.autoGenerated && !quedan.has(x.id) && !esReciente(x.creadoEn, opciones.ahora));
  quitadosBloqueados.forEach((x) =>
    bloqueados.push({ coleccion, refId: x.id, company: x.company, resumen: resumenDe(x), creadoEn: x.creadoEn })
  );
  let lista = reponer(prev, next, quitadosBloqueados);

  const hijos = opciones.hijos || [];
  if (hijos.length) {
    const prevPorId = new Map(prev.map((p) => [p.id, p]));
    lista = lista.map((padre) => {
      const anterior = prevPorId.get(padre.id);
      if (!anterior || anterior === padre) return padre;
      let p = padre;
      hijos.forEach((h) => {
        const antes: ConId[] = Array.isArray((anterior as any)[h]) ? (anterior as any)[h] : [];
        const ahoraL: ConId[] = Array.isArray((p as any)[h]) ? (p as any)[h] : [];
        const siguen = new Set(ahoraL.map((x) => x?.id));
        const bloq = antes.filter((x) => x && x.id != null && !siguen.has(x.id) && !esReciente(x.creadoEn, opciones.ahora));
        if (!bloq.length) return;
        bloq.forEach((x) =>
          bloqueados.push({
            coleccion,
            refId: x.id,
            padreId: padre.id,
            hijo: h,
            company: (padre as any).company,
            resumen: `${resumenDe(padre)} → ${resumenDe(x)}`,
            creadoEn: x.creadoEn,
          })
        );
        p = { ...p, [h]: reponer(antes as any, ahoraL as any, bloq as any) };
      });
      return p;
    });
  }

  if (bloqueados.length && lista.length === prev.length) {
    // Si lo unico que cambio era el borrado, se queda todo como estaba.
    const igual = lista.every((x, i) => x === prev[i] || JSON.stringify(x) === JSON.stringify(prev[i]));
    if (igual) return { lista: prev, bloqueados };
  }
  return { lista, bloqueados };
}

/** Borra de verdad (lo autorizado): saca el registro o el hijo de su padre. */
export function aplicarBorrado<T extends ConId>(lista: T[], items: ItemBloqueado[]): T[] {
  const sueltos = new Set(items.filter((i) => i.padreId == null).map((i) => i.refId));
  let out = sueltos.size ? lista.filter((x) => !sueltos.has(x.id)) : lista;
  const deHijos = items.filter((i) => i.padreId != null && i.hijo);
  if (deHijos.length) {
    out = out.map((p) => {
      const mios = deHijos.filter((i) => i.padreId === p.id);
      if (!mios.length) return p;
      let q: any = p;
      mios.forEach((i) => {
        const l = Array.isArray(q[i.hijo!]) ? q[i.hijo!] : [];
        q = { ...q, [i.hijo!]: l.filter((x: ConId) => x.id !== i.refId) };
      });
      return q;
    });
  }
  return out;
}

/** Saca de los bloqueados lo que ya esta pedido (pendiente) para no repetir el pedido. */
export function sinYaPedidos(bloqueados: ItemBloqueado[], pedidos: PedidoBorrado[]): ItemBloqueado[] {
  const clave = (i: ItemBloqueado) => `${i.coleccion}|${i.padreId ?? ""}|${i.hijo ?? ""}|${i.refId}`;
  const ya = new Set(pedidos.filter((p) => p.estado === "pendiente").flatMap((p) => p.items.map(clave)));
  const vistos = new Set<string>();
  return bloqueados.filter((i) => {
    const k = clave(i);
    if (ya.has(k) || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}
