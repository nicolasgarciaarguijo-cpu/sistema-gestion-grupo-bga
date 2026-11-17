// REVISAR EL PADRON DE PROVEEDORES (Nicolas, 16/11/2026: "sí, proveedores").
//
// El padron se fue llenando de los extractos, de ARCA y de la caja chica, asi que tiene duplicados, gente
// que no es proveedor y proveedores a medio cargar. Antes esto era una lista que yo armaba leyendo la base;
// ahora lo calcula el sistema y se corrige desde la app, que es donde se puede (el autosave del navegador
// pisa la escritura directa: ver la regla de carga directa).
//
// Nada de esto borra ni cambia solo: cada cosa se decide en la app. Lo que hace este modulo es ENCONTRARLAS.

export type ProveedorPadron = {
  id: number;
  company: string;
  name: string;
  taxId?: string;
  condicionPago?: unknown;
  grupoCosto?: string;
  debitoAutomatico?: boolean;
};

// Lo que el proveedor tiene cargado (sale del ledger de compras).
export type UsoProveedor = { facturas: number; comprado: number; pagado: number; deuda: number };

export const digitos = (v?: string): string => String(v || "").replace(/\D/g, "");

export const normNombre = (v?: string): string =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?r\.?l|s\.?a\.?|sas|srl|sa)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");

export type MotivoDuplicado = "nombre" | "cuit" | "cuit-digito" | "contiene";

export const MOTIVO_DUPLICADO: Record<MotivoDuplicado, string> = {
  nombre: "el mismo nombre",
  cuit: "el mismo CUIT",
  "cuit-digito": "el mismo CUIT con otro dígito verificador",
  contiene: "un nombre está adentro del otro",
};

// Un nombre adentro del otro: "HERRAJES MAGLIOLA S A" y "Cima de herrajes magliola", "Expocolor" y
// "Lacapol EXPOCOLOR", "Estacionamiento" y "Estacionamiento Angelo". Se pide 6 letras para no marcar
// cualquier cosa, y se saca la forma societaria del final (quedaba "herrajesmagliolasa" y no entraba).
const LARGO_MINIMO_CONTENCION = 6;

// Para comparar por contencion: igual que normNombre pero sin el S.A./S.R.L. del final, que normNombre
// solo saca cuando viene como palabra suelta ("S A" con espacio no entra). Es solo para SUGERIR el par:
// si se pasa de listo, Nicolas lo ve y no hace nada.
export const normNombreSinForma = (v?: string): string =>
  normNombre(v).replace(/(sa|srl|sas|sh|sca)$/, "");

export type GrupoDuplicado = {
  motivo: MotivoDuplicado;
  clave: string;
  proveedores: ProveedorPadron[];
};

// Duplicados por nombre (sin acentos, sin S.R.L. ni S.A., sin espacios), por CUIT y por CUIT con el digito
// verificador distinto (paso de verdad: la estacion de servicio cargada dos veces, ...132-2 y ...132-3).
export function duplicadosDelPadron(ps: ProveedorPadron[]): GrupoDuplicado[] {
  const out: GrupoDuplicado[] = [];
  const yaAgrupado = new Set<number>();

  const agrupar = (motivo: MotivoDuplicado, clave: (p: ProveedorPadron) => string) => {
    const porClave = new Map<string, ProveedorPadron[]>();
    ps.forEach((p) => {
      const k = clave(p);
      if (!k) return;
      if (!porClave.has(k)) porClave.set(k, []);
      porClave.get(k)!.push(p);
    });
    Array.from(porClave.entries())
      .filter(([, lista]) => lista.length > 1)
      // No repetir un par que ya salio por un motivo anterior.
      .filter(([, lista]) => !lista.every((p) => yaAgrupado.has(p.id)))
      .forEach(([clave, lista]) => {
        lista.forEach((p) => yaAgrupado.add(p.id));
        out.push({ motivo, clave, proveedores: lista });
      });
  };

  agrupar("cuit", (p) => (digitos(p.taxId).length === 11 ? digitos(p.taxId) : ""));
  agrupar("nombre", (p) => normNombre(p.name));
  // Mismo CUIT salvo el ultimo digito (el verificador): casi siempre es el mismo tipeado mal.
  agrupar("cuit-digito", (p) => (digitos(p.taxId).length === 11 ? digitos(p.taxId).slice(0, 10) : ""));

  // Un nombre adentro del otro. No se puede agrupar por clave: se comparan de a pares.
  const sueltos = ps.filter((p) => !yaAgrupado.has(p.id) && normNombreSinForma(p.name).length >= LARGO_MINIMO_CONTENCION);
  sueltos.forEach((a, i) => {
    sueltos.slice(i + 1).forEach((b) => {
      if (yaAgrupado.has(a.id) && yaAgrupado.has(b.id)) return;
      const na = normNombreSinForma(a.name);
      const nb = normNombreSinForma(b.name);
      if (na === nb || !(na.includes(nb) || nb.includes(na))) return;
      yaAgrupado.add(a.id);
      yaAgrupado.add(b.id);
      out.push({ motivo: "contiene", clave: na.length < nb.length ? na : nb, proveedores: [a, b] });
    });
  });
  return out;
}

// El que no tiene NADA cargado: ni una factura ni un pago. Son los candidatos a borrar (o a completar).
export function sinNadaCargado(ps: ProveedorPadron[], uso: (p: ProveedorPadron) => UsoProveedor): ProveedorPadron[] {
  return ps.filter((p) => {
    const u = uso(p);
    return u.facturas === 0 && Math.abs(u.comprado) < 1 && Math.abs(u.pagado) < 1;
  });
}

// SIN CONDICION DE PAGO Y CON DEUDA: sus facturas impagas no toman fecha, asi que no entran al cash flow.
// Es el agujero mas caro del padron: se arregla cargandole la condicion de pago en su ficha.
export function sinCondicionConDeuda(
  ps: ProveedorPadron[],
  uso: (p: ProveedorPadron) => UsoProveedor
): Array<{ proveedor: ProveedorPadron; deuda: number }> {
  return ps
    .filter((p) => !p.debitoAutomatico && !String(p.condicionPago ?? "").trim())
    .map((p) => ({ proveedor: p, deuda: uso(p).deuda }))
    .filter((x) => x.deuda > 1)
    .sort((a, b) => b.deuda - a.deuda);
}

export type MotivoCuit = "falta" | "corto" | "repetido";

export const MOTIVO_CUIT: Record<MotivoCuit, string> = {
  falta: "sin CUIT",
  corto: "el CUIT no tiene 11 dígitos",
  repetido: "el CUIT está en otro proveedor",
};

// El CUIT es con lo que se cruza ARCA y el banco: sin el, o mal, la factura no encuentra a su proveedor.
export function cuitParaRevisar(ps: ProveedorPadron[]): Array<{ proveedor: ProveedorPadron; motivo: MotivoCuit }> {
  const veces = new Map<string, number>();
  ps.forEach((p) => {
    const d = digitos(p.taxId);
    if (d.length === 11) veces.set(d, (veces.get(d) || 0) + 1);
  });
  const out: Array<{ proveedor: ProveedorPadron; motivo: MotivoCuit }> = [];
  ps.forEach((p) => {
    const d = digitos(p.taxId);
    if (!d) out.push({ proveedor: p, motivo: "falta" });
    else if (d.length !== 11) out.push({ proveedor: p, motivo: "corto" });
    else if ((veces.get(d) || 0) > 1) out.push({ proveedor: p, motivo: "repetido" });
  });
  return out;
}

// FACTURAS MELLIZAS: el mismo monto, el mismo dia y la misma empresa, pero de DOS proveedores distintos.
// Suele ser un honorario cargado dos veces (paso con los dos estudios contables, $2,2M). No se toca nada:
// se avisa para que lo mire.
export type FacturaDelPadron = {
  id: number;
  company: string;
  supplier: string;
  taxId?: string;
  date: string;
  total: number;
  // Cuando se pago (si se pago): con esto se sugiere la condicion de pago desde el historial.
  pagadaEl?: string;
};

export type Mellizas = {
  company: string;
  date: string;
  total: number;
  facturas: FacturaDelPadron[];
};

export function facturasMellizas(facturas: FacturaDelPadron[]): Mellizas[] {
  const porClave = new Map<string, FacturaDelPadron[]>();
  facturas.forEach((f) => {
    const monto = Math.round(Number(f.total || 0));
    if (monto <= 0 || !f.date) return;
    const k = `${f.company}|${String(f.date).slice(0, 10)}|${monto}`;
    if (!porClave.has(k)) porClave.set(k, []);
    porClave.get(k)!.push(f);
  });
  return Array.from(porClave.values())
    .filter((lista) => new Set(lista.map((f) => normNombre(f.supplier))).size > 1)
    .map((lista) => ({
      company: lista[0].company,
      date: String(lista[0].date).slice(0, 10),
      total: Number(lista[0].total || 0),
      facturas: lista,
    }))
    .sort((a, b) => b.total - a.total);
}

export type ResumenPadron = {
  total: number;
  duplicados: number;
  vacios: number;
  sinCondicionConDeuda: number;
  plataFueraDelCashFlow: number;
  cuitParaRevisar: number;
  mellizas: number;
  plataMellizas: number;
};

export function resumenPadron(
  ps: ProveedorPadron[],
  uso: (p: ProveedorPadron) => UsoProveedor,
  facturas: FacturaDelPadron[] = []
): ResumenPadron {
  const dup = duplicadosDelPadron(ps);
  const sinCond = sinCondicionConDeuda(ps, uso);
  const mell = facturasMellizas(facturas);
  return {
    total: ps.length,
    duplicados: dup.reduce((a, g) => a + g.proveedores.length, 0),
    vacios: sinNadaCargado(ps, uso).length,
    sinCondicionConDeuda: sinCond.length,
    plataFueraDelCashFlow: sinCond.reduce((a, x) => a + x.deuda, 0),
    cuitParaRevisar: cuitParaRevisar(ps).length,
    mellizas: mell.length,
    plataMellizas: mell.reduce((a, m) => a + m.total * (m.facturas.length - 1), 0),
  };
}
