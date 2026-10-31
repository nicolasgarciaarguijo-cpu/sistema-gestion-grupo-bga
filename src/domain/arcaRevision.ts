// REVISION DEL LISTADO DE ARCA (Nicolas, 2026-10-31): "debe SUGERIR, no cargar sola. Si reconoce al proveedor,
// sugiere donde se guarda. Detecta si la factura ya esta cargada. En cualquier caso exige una corroboracion
// manual, para que no haya proveedores ni facturas duplicados."
//
// El import arma una PROPUESTA (renglon por comprobante) y nada se guarda hasta que el usuario confirma en la
// ventana de revision. Aca vive lo pensable: reconocer al proveedor y que hacer por defecto con cada renglon.
// Puro.
import { nombreParecido } from "./arcaCruce";

const digitos = (s: string) => String(s || "").replace(/\D/g, "");

export type ProveedorR = { id: number; name: string; taxId: string; aliases?: string; active?: boolean; grupoCosto?: string; tipoGasto?: string; tipoGastoLocked?: boolean; currentAccount?: boolean };

export type ProveedorDeArca =
  | { estado: "reconocido"; proveedor: ProveedorR; por: "cuit" | "nombre" }
  | { estado: "nuevo"; parecidos: ProveedorR[] };

// Por CUIT manda; si el proveedor del sistema no tiene CUIT, por nombre parecido (y se le completa el CUIT).
// Si no hay ninguno, es NUEVO, pero se muestran los de nombre parecido para no dar de alta un duplicado
// (el mismo proveedor cargado con otro CUIT o sin CUIT).
export function proveedorDeArca(nombre: string, cuit: string, proveedores: ProveedorR[]): ProveedorDeArca {
  const c = digitos(cuit);
  const activos = proveedores.filter((p) => p.active !== false);
  if (c.length >= 11) {
    const porCuit = activos.find((p) => digitos(p.taxId) === c);
    if (porCuit) return { estado: "reconocido", proveedor: porCuit, por: "cuit" };
  }
  const parecidos = activos.filter((p) => nombreParecido(p.name, nombre) || String(p.aliases || "").split(",").some((a) => a.trim() && nombreParecido(a, nombre)));
  const sinCuit = parecidos.filter((p) => digitos(p.taxId).length < 11);
  if (sinCuit.length === 1 && parecidos.length === 1) return { estado: "reconocido", proveedor: sinCuit[0], por: "nombre" };
  return { estado: "nuevo", parecidos };
}

export type AccionProveedor = { tipo: "existente"; proveedorId: number } | { tipo: "alta" } | { tipo: "ninguno" };

export type RenglonRevision = {
  key: string;
  direccion: "recibidas" | "emitidas";
  esNotaCredito: boolean;
  company: string;
  fecha: string;
  numero: string; // pto vta - numero
  tipo: string;
  contraparte: string;
  cuit: string;
  total: number;
  // Ya cargada: la factura del sistema con la que coincide (no se vuelve a cargar).
  duplicadaDe?: { id: number; texto: string } | null;
  proveedor?: ProveedorDeArca; // solo recibidas
  // Lo que el usuario decide (arranca con lo sugerido).
  cargar: boolean;
  accionProveedor: AccionProveedor;
  sugerencia: string; // "va a Proveedor X · grupo Y"
};

export function sugerenciaDe(p: ProveedorDeArca | undefined, nombreGrupo: (clave?: string) => string): string {
  if (!p) return "";
  if (p.estado === "nuevo") return p.parecidos.length ? `proveedor nuevo · ¿es ${p.parecidos.map((x) => x.name).slice(0, 3).join(" / ")}?` : "proveedor nuevo: se da de alta al confirmar";
  const g = p.proveedor.grupoCosto ? nombreGrupo(p.proveedor.grupoCosto) : "";
  return `va a ${p.proveedor.name}${p.proveedor.currentAccount ? " (cuenta corriente)" : ""}${g ? ` · ${g}` : ""}${p.por === "nombre" ? " · reconocido por nombre: se le completa el CUIT" : ""}`;
}

// Lo que se propone por defecto: lo duplicado NO se carga; lo nuevo se carga con el proveedor reconocido o,
// si es nuevo sin parecidos, con alta. Con parecidos queda SIN decidir (hay que elegir a mano).
export function accionPorDefecto(r: Pick<RenglonRevision, "duplicadaDe" | "proveedor" | "direccion">): { cargar: boolean; accionProveedor: AccionProveedor } {
  if (r.duplicadaDe) return { cargar: false, accionProveedor: { tipo: "ninguno" } };
  if (r.direccion === "emitidas" || !r.proveedor) return { cargar: true, accionProveedor: { tipo: "ninguno" } };
  if (r.proveedor.estado === "reconocido") return { cargar: true, accionProveedor: { tipo: "existente", proveedorId: r.proveedor.proveedor.id } };
  return r.proveedor.parecidos.length ? { cargar: false, accionProveedor: { tipo: "ninguno" } } : { cargar: true, accionProveedor: { tipo: "alta" } };
}

// Falta decidir: una recibida que se va a cargar sin proveedor elegido (ni alta ni existente).
export const faltaDecidir = (r: RenglonRevision) => r.cargar && r.direccion === "recibidas" && !r.esNotaCredito && r.accionProveedor.tipo === "ninguno";
