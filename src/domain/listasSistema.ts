// LISTADOS DEL SISTEMA (Nicolas, 31/10/2026): "los listados de todo el sistema los quiero poder editar. Siempre. No quiero
// que queden fijados solo desde aca." El codigo trae solo los valores POR DEFECTO; lo que se edita en el bloque "Listados del
// sistema" (solapa Acceso) se guarda en el modulo "configuracion" y manda. Una lista que nunca se toco vale la de siempre.
// Algunos nombres los usan las cuentas (el tipo de trabajo "General" vale para todos; los grupos de maquinas los lee
// Mantenimiento): esos no se renombran ni se borran. Renombrar arrastra el nombre nuevo a los registros (lo hace App).

export type ItemLista = { nombre: string; codigo?: string; activo?: boolean };
export type ListaKey = "categoriasGremio" | "gruposStock" | "tiposTrabajo" | "gruposMarcadores";
export type ListasSistema = Partial<Record<ListaKey, ItemLista[]>>;

export type DefinicionLista = {
  key: ListaKey;
  titulo: string;
  descripcion: string;
  // Los grupos de Stock llevan el prefijo del codigo de sus articulos (MEL-0001).
  conCodigo?: boolean;
  porDefecto: ItemLista[];
  fijos?: string[];
};

const items = (nombres: string[]): ItemLista[] => nombres.map((nombre) => ({ nombre }));
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
    descripcion: "Los grupos de los artículos de Stock, con el prefijo de sus códigos. De acá salen los grupos de los materiales e insumos genéricos. Los de máquinas y herramientas los usa Mantenimiento: no se renombran ni se borran.",
    conCodigo: true,
    porDefecto: Object.entries(PREFIJOS_STOCK).map(([nombre, codigo]) => ({ nombre, codigo })),
    fijos: ["Maquinas pesadas", "Maquinas manuales", "Herramientas"],
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
];

export const definicionDe = (key: ListaKey) => LISTAS.find((l) => l.key === key) as DefinicionLista;
export const listaVigente = (listas: ListasSistema | undefined, key: ListaKey): ItemLista[] => listas?.[key] ?? definicionDe(key).porDefecto;
export const nombresActivos = (listas: ListasSistema | undefined, key: ListaKey): string[] =>
  listaVigente(listas, key).filter((x) => x.activo !== false && x.nombre.trim()).map((x) => x.nombre);
export const esFijo = (key: ListaKey, nombre: string) => (definicionDe(key).fijos || []).includes(nombre);

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

export function agregar(lista: ItemLista[], nombre: string, codigo?: string): Edicion {
  const n = nombre.trim();
  if (!n) return { ok: false, motivo: "Falta el nombre." };
  if (lista.some((x) => norm(x.nombre) === norm(n))) return { ok: false, motivo: `"${n}" ya está en la lista.` };
  return { ok: true, lista: [...lista, { nombre: n, ...(codigo?.trim() ? { codigo: codigo.trim().toUpperCase() } : {}) }] };
}

export function renombrar(key: ListaKey, lista: ItemLista[], viejo: string, nuevo: string): Edicion {
  const n = nuevo.trim();
  if (esFijo(key, viejo)) return { ok: false, motivo: `"${viejo}" lo usan las cuentas del sistema: no se renombra.` };
  if (!n) return { ok: false, motivo: "El nombre no puede quedar vacío." };
  if (n !== viejo && lista.some((x) => x.nombre !== viejo && norm(x.nombre) === norm(n))) return { ok: false, motivo: `"${n}" ya está en la lista.` };
  return { ok: true, lista: lista.map((x) => (x.nombre === viejo ? { ...x, nombre: n } : x)) };
}

export function quitar(key: ListaKey, lista: ItemLista[], nombre: string, enUso: number): Edicion {
  if (esFijo(key, nombre)) return { ok: false, motivo: `"${nombre}" lo usan las cuentas del sistema: no se borra.` };
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
