// LISTADOS DEL SISTEMA (Nicolas, 31/10/2026): "los listados de todo el sistema los quiero poder editar. Siempre. No quiero
// que queden fijados solo desde aca." El codigo trae solo los valores POR DEFECTO; lo que se edita en el bloque "Listados del
// sistema" (solapa Acceso) se guarda en el modulo "configuracion" y manda. Una lista que nunca se toco vale la de siempre.
//
// Dos clases de listas:
//  - De NOMBRES (categorias del gremio, grupos de Stock...): los registros guardan el nombre, asi que renombrar arrastra el
//    nombre nuevo a los registros (lo hace App). Los que leen las cuentas ("General", grupos de maquinas) no se tocan.
//  - Por VALOR (medios de pago, motivos de baja, unidades...): los registros guardan un valor interno que leen las cuentas;
//    lo que se edita es como se LLAMA. Los del sistema se renombran y pausan pero no se borran; los nuevos se suman con su
//    nombre como valor.
// `aplicarListasVigentes` vuelca lo editado en las listas que ya leen las pantallas (se reemplaza su contenido), asi cada
// pantalla muestra lo vigente sin cambiar como las lee.
import { PAYMENT_METHOD_OPTIONS, PERSONAL_PROVISION_KINDS } from "./types";
import { TERMINATION_REASON_OPTIONS } from "./employeeStatus";
import { TIPOS_DEUDA } from "./desendeudamiento";
import { ESTADOS_MAQUINA, GRUPOS_MAQUINAS } from "./mantenimiento";
import { UNIDADES_TAREA } from "./organizacionDiaria";
import { GRUPOS_GASTO } from "./analisisGastos";
import { TIPOS_SEGURO_SUGERIDOS } from "./seguros";
import { TIPOS_INVERSION_SUGERIDOS } from "./inversiones";
import { RUBRO_POR_GRUPO_STOCK, type RubroChecklist } from "./checklistProduccion";

export type ItemLista = {
  nombre: string;
  // Listas por valor: lo que guardan los registros (ausente = el nombre).
  valor?: string;
  codigo?: string;
  activo?: boolean;
  // Grupos de Stock: a que rubro del checklist antes de produccion va ("fuera" = no se pide; ausente = por el nombre) y si
  // sus articulos son maquinas o herramientas (Mantenimiento).
  rubro?: RubroChecklist | "fuera";
  maquinas?: boolean;
};
export type ListaKey =
  | "categoriasGremio"
  | "gruposStock"
  | "tiposTrabajo"
  | "gruposMarcadores"
  | "provisionesPersonal"
  | "motivosBaja"
  | "estadosMaquina"
  | "unidadesTarea"
  | "gruposGasto"
  | "tiposSeguro"
  | "tiposInversion"
  | "mediosPago"
  | "tiposDeuda";
export type ListasSistema = Partial<Record<ListaKey, ItemLista[]>>;

export type DefinicionLista = {
  key: ListaKey;
  titulo: string;
  descripcion: string;
  conCodigo?: boolean;
  porValor?: boolean;
  // No se suman nuevos (las cuentas los reparten por su valor).
  sinAgregar?: boolean;
  porDefecto: ItemLista[];
  // Nombres (o valores, en las listas por valor) que leen las cuentas.
  fijos?: string[];
};

const items = (nombres: readonly string[]): ItemLista[] => nombres.map((nombre) => ({ nombre }));
const porValor = (lista: ReadonlyArray<{ value: string; label: string }>): ItemLista[] => lista.map((x) => ({ nombre: x.label, valor: x.value }));
const PREFIJOS_STOCK: Record<string, string> = {
  Melaminas: "MEL",
  Enchapado: "ENC",
  MDF: "MDF",
  Maderas: "MAD",
  Tapacantos: "TPC",
  "Insumos carpinteria": "ICA",
  "Insumos pintureria": "IPI",
  "Insumos herreria": "IHR",
  Pinturas: "PIN",
  Hierros: "HIE",
  Aluminio: "ALU",
  Herrajes: "HER",
  "Maquinas pesadas": "MPS",
  "Maquinas manuales": "MMA",
  Herramientas: "HTA",
};

// Copias de lo de siempre, tomadas antes de cualquier edicion (aplicarListasVigentes reemplaza el contenido de las originales).
const ORIGINALES = {
  mediosPago: porValor(PAYMENT_METHOD_OPTIONS),
  motivosBaja: porValor(TERMINATION_REASON_OPTIONS),
  tiposDeuda: porValor(TIPOS_DEUDA),
  estadosMaquina: porValor(ESTADOS_MAQUINA),
  unidadesTarea: porValor(UNIDADES_TAREA),
  gruposGasto: GRUPOS_GASTO.map((g) => ({ nombre: g.label, valor: g.key })),
  provisionesPersonal: items(PERSONAL_PROVISION_KINDS),
  tiposSeguro: items(TIPOS_SEGURO_SUGERIDOS),
  tiposInversion: items(TIPOS_INVERSION_SUGERIDOS),
  colores: Object.fromEntries(ESTADOS_MAQUINA.map((e) => [e.value, e.color])) as Record<string, string>,
  detalleGasto: Object.fromEntries(GRUPOS_GASTO.map((g) => [g.key, g.detalle])) as Record<string, string>,
};
const MAQUINAS = [...GRUPOS_MAQUINAS];

export const LISTAS: DefinicionLista[] = [
  {
    key: "categoriasGremio",
    titulo: "Categorías del gremio",
    descripcion: "Las del convenio (las que liquidan): se eligen en la ficha de cada empleado y se vinculan con las categorías internas. Su valor sale de la escala salarial.",
    porDefecto: items(["Ayudante", "Medio oficial", "Oficial especializado", "Oficial general", "Oficial multiple", "Operario act. industrial"]),
  },
  {
    key: "gruposStock",
    titulo: "Grupos de Stock",
    descripcion: "Los grupos de los artículos de Stock, con el prefijo de sus códigos, a qué rubro del checklist antes de producción van y si son máquinas o herramientas (Mantenimiento). De acá salen los grupos de los materiales e insumos genéricos. Los tres grupos de máquinas de siempre no se renombran ni se borran.",
    conCodigo: true,
    porDefecto: Object.entries(PREFIJOS_STOCK).map(([nombre, codigo]) => ({ nombre, codigo, ...(MAQUINAS.includes(nombre) ? { maquinas: true, rubro: "fuera" as const } : {}) })),
    fijos: MAQUINAS,
  },
  {
    key: "tiposTrabajo",
    titulo: "Tipos de trabajo",
    descripcion: "Se eligen en el presupuesto y en los marcadores (cada marcador vale para un tipo de trabajo o para todos). \"General\" es el que vale para todos: no se renombra ni se borra.",
    porDefecto: items(["General", "Mobiliario", "Cocina", "Vestidor", "Oficina", "Local comercial", "Obra especial"]),
    fijos: ["General"],
  },
  {
    key: "gruposMarcadores",
    titulo: "Grupos de marcadores",
    descripcion: "Los grupos de los costos fijos en Marcadores. Además aparecen solos los grupos de Costos y los que ya tienen marcadores.",
    porDefecto: items(["Administrativos", "Comerciales", "Financieros", "Edilicios", "Operativos"]),
  },
  {
    key: "provisionesPersonal",
    titulo: "Provisiones de personal",
    descripcion: "Lo que se le provee a cada persona (EPP, exámenes...): se usa en Personal, Stock y Marcadores. Los cuatro de siempre no se borran.",
    porDefecto: ORIGINALES.provisionesPersonal,
    fijos: [...PERSONAL_PROVISION_KINDS],
  },
  {
    key: "motivosBaja",
    titulo: "Motivos de baja",
    descripcion: "Al dar de baja a una persona. Se pueden renombrar todos; los de siempre no se borran.",
    porValor: true,
    porDefecto: ORIGINALES.motivosBaja,
    fijos: ORIGINALES.motivosBaja.map((x) => x.valor as string),
  },
  {
    key: "estadosMaquina",
    titulo: "Estados de máquinas",
    descripcion: "Mantenimiento: solo \"Operativa\" cuenta como disponible; cualquier otro estado frena las tareas que usan la máquina. Los de siempre no se borran.",
    porValor: true,
    porDefecto: ORIGINALES.estadosMaquina,
    fijos: ORIGINALES.estadosMaquina.map((x) => x.valor as string),
  },
  {
    key: "unidadesTarea",
    titulo: "Unidades de las tareas",
    descripcion: "En qué se mide cada paso de una Tarea. Las de siempre salen de las medidas del mueble; una unidad nueva se cuenta por mueble.",
    porValor: true,
    porDefecto: ORIGINALES.unidadesTarea,
    fijos: ORIGINALES.unidadesTarea.map((x) => x.valor as string),
  },
  {
    key: "mediosPago",
    titulo: "Medios de pago",
    descripcion: "Los de todas las ventanas de pago. Los de siempre los leen las cuentas (qué sale del banco, qué es efectivo o tarjeta): se renombran pero no se borran. Uno nuevo se cuenta como pago que no sale del banco.",
    porValor: true,
    porDefecto: ORIGINALES.mediosPago,
    fijos: ORIGINALES.mediosPago.map((x) => x.valor as string),
  },
  {
    key: "tiposDeuda",
    titulo: "Tipos de deuda",
    descripcion: "Desendeudamiento. Los de siempre se renombran pero no se borran.",
    porValor: true,
    porDefecto: ORIGINALES.tiposDeuda,
    fijos: ORIGINALES.tiposDeuda.map((x) => x.valor as string),
  },
  {
    key: "gruposGasto",
    titulo: "Grupos del análisis de gastos",
    descripcion: "Cómo se llaman los grupos del análisis de gastos. Cada renglón del Calendario va a su grupo por cuentas del sistema: se renombran, no se suman ni se borran.",
    porValor: true,
    sinAgregar: true,
    porDefecto: ORIGINALES.gruposGasto,
    fijos: ORIGINALES.gruposGasto.map((x) => x.valor as string),
  },
  {
    key: "tiposSeguro",
    titulo: "Tipos de seguro",
    descripcion: "Los que se sugieren al cargar un seguro (se puede escribir otro).",
    porDefecto: ORIGINALES.tiposSeguro,
  },
  {
    key: "tiposInversion",
    titulo: "Tipos de inversión",
    descripcion: "Los que se sugieren al cargar una inversión (se puede escribir otro).",
    porDefecto: ORIGINALES.tiposInversion,
  },
];

export const definicionDe = (key: ListaKey) => LISTAS.find((l) => l.key === key) as DefinicionLista;
export const listaVigente = (listas: ListasSistema | undefined, key: ListaKey): ItemLista[] => listas?.[key] ?? definicionDe(key).porDefecto;
export const activos = (listas: ListasSistema | undefined, key: ListaKey) => listaVigente(listas, key).filter((x) => x.activo !== false && x.nombre.trim());
export const nombresActivos = (listas: ListasSistema | undefined, key: ListaKey): string[] => activos(listas, key).map((x) => x.nombre);
export const valorDe = (it: ItemLista) => it.valor ?? it.nombre;
export const esFijo = (key: ListaKey, it: ItemLista | string) => (definicionDe(key).fijos || []).includes(typeof it === "string" ? it : valorDe(it));

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Prefijo del codigo de un grupo de Stock: el cargado; si no, el de siempre; si no, las 3 primeras letras.
export function prefijoDeGrupo(listas: ListasSistema | undefined, grupo: string): string {
  const it = listaVigente(listas, "gruposStock").find((x) => norm(x.nombre) === norm(grupo));
  const cod = (it?.codigo || PREFIJOS_STOCK[grupo] || "").trim().toUpperCase();
  if (cod) return cod;
  const letras = norm(grupo).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
  return letras || "ITM";
}

// ---- Ediciones (devuelven la lista nueva) ------------------------------------------------------------------------
export type Edicion = { ok: true; lista: ItemLista[] } | { ok: false; motivo: string };

export function agregar(lista: ItemLista[], nombre: string, codigo?: string, key?: ListaKey): Edicion {
  const n = nombre.trim();
  const def = key ? definicionDe(key) : undefined;
  if (def?.sinAgregar) return { ok: false, motivo: "En esta lista no se suman nuevos." };
  if (!n) return { ok: false, motivo: "Falta el nombre." };
  if (lista.some((x) => norm(x.nombre) === norm(n) || norm(valorDe(x)) === norm(n))) return { ok: false, motivo: `"${n}" ya está en la lista.` };
  return { ok: true, lista: [...lista, { nombre: n, ...(def?.porValor ? { valor: n } : {}), ...(codigo?.trim() ? { codigo: codigo.trim().toUpperCase() } : {}) }] };
}

// En las listas por valor se renombra lo que se ve (tambien los del sistema); en las de nombres, los fijos no.
export function renombrar(key: ListaKey, lista: ItemLista[], viejo: string, nuevo: string): Edicion {
  const n = nuevo.trim();
  const def = definicionDe(key);
  const it = lista.find((x) => x.nombre === viejo);
  if (!def.porValor && it && esFijo(key, it)) return { ok: false, motivo: `"${viejo}" lo usan las cuentas del sistema: no se renombra.` };
  if (!n) return { ok: false, motivo: "El nombre no puede quedar vacío." };
  if (n !== viejo && lista.some((x) => x.nombre !== viejo && norm(x.nombre) === norm(n))) return { ok: false, motivo: `"${n}" ya está en la lista.` };
  return { ok: true, lista: lista.map((x) => (x.nombre === viejo ? { ...x, nombre: n, ...(def.porValor ? { valor: valorDe(x) } : {}) } : x)) };
}

export function quitar(key: ListaKey, lista: ItemLista[], nombre: string, enUso: number): Edicion {
  const it = lista.find((x) => x.nombre === nombre);
  if (it && esFijo(key, it)) return { ok: false, motivo: `"${nombre}" lo usan las cuentas del sistema: no se borra (se puede pausar).` };
  if (enUso > 0) return { ok: false, motivo: `"${nombre}" está en uso (${enUso}): pausalo para que no se ofrezca más, o renombralo.` };
  return { ok: true, lista: lista.filter((x) => x.nombre !== nombre) };
}

export function mover(lista: ItemLista[], nombre: string, d: -1 | 1): ItemLista[] {
  const i = lista.findIndex((x) => x.nombre === nombre);
  const j = i + d;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const out = [...lista];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export const cambiar = (lista: ItemLista[], nombre: string, cambios: Partial<ItemLista>): ItemLista[] =>
  lista.map((x) => (x.nombre === nombre ? { ...x, ...cambios } : x));

// ---- Volcar lo vigente en las listas que leen las pantallas -------------------------------------------------------
const reemplazar = <T,>(destino: readonly T[], nuevo: T[]) => (destino as T[]).splice(0, destino.length, ...nuevo);
let ultimo: ListasSistema | undefined;

export function aplicarListasVigentes(listas: ListasSistema | undefined) {
  if (listas === ultimo) return;
  ultimo = listas;
  const act = (key: ListaKey) => activos(listas, key);
  const etiquetas = (key: ListaKey) => act(key).map((x) => ({ value: valorDe(x), label: x.nombre }));
  reemplazar(PAYMENT_METHOD_OPTIONS, etiquetas("mediosPago") as typeof PAYMENT_METHOD_OPTIONS);
  reemplazar(TERMINATION_REASON_OPTIONS, etiquetas("motivosBaja") as typeof TERMINATION_REASON_OPTIONS);
  reemplazar(TIPOS_DEUDA, etiquetas("tiposDeuda") as typeof TIPOS_DEUDA);
  reemplazar(UNIDADES_TAREA, etiquetas("unidadesTarea") as typeof UNIDADES_TAREA);
  reemplazar(ESTADOS_MAQUINA, etiquetas("estadosMaquina").map((e) => ({ ...e, color: ORIGINALES.colores[e.value] || "#64748b" })) as typeof ESTADOS_MAQUINA);
  // Los grupos del analisis no se suman ni se borran: solo cambia como se llaman.
  GRUPOS_GASTO.forEach((g) => {
    const it = listaVigente(listas, "gruposGasto").find((x) => valorDe(x) === g.key);
    g.label = it?.nombre || ORIGINALES.gruposGasto.find((x) => x.valor === g.key)?.nombre || g.label;
    g.detalle = ORIGINALES.detalleGasto[g.key] || g.detalle;
  });
  reemplazar(PERSONAL_PROVISION_KINDS, act("provisionesPersonal").map(valorDe) as typeof PERSONAL_PROVISION_KINDS);
  reemplazar(TIPOS_SEGURO_SUGERIDOS as readonly string[], act("tiposSeguro").map(valorDe));
  reemplazar(TIPOS_INVERSION_SUGERIDOS as readonly string[], act("tiposInversion").map(valorDe));
  // Grupos de Stock: cuales son de maquinas (los de siempre siempre lo son) y a que rubro del checklist va cada uno.
  const grupos = listaVigente(listas, "gruposStock");
  reemplazar(GRUPOS_MAQUINAS, Array.from(new Set([...MAQUINAS, ...grupos.filter((g) => g.maquinas).map((g) => g.nombre)])));
  Object.keys(RUBRO_POR_GRUPO_STOCK).forEach((k) => delete RUBRO_POR_GRUPO_STOCK[k]);
  grupos.forEach((g) => {
    if (g.rubro) RUBRO_POR_GRUPO_STOCK[norm(g.nombre)] = g.rubro;
  });
}
