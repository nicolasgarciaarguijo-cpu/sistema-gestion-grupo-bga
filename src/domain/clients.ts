import type { CrmClient } from "./types";

// Clave normalizada de un nombre de cliente (para matchear sin importar mayúsculas/espacios).
export const normalizeClientName = (text: string): string => (text || "").trim().toLowerCase();

// Busca un cliente-entidad por nombre normalizado (para el typeahead/autocompletado).
export function findClientByName(clients: CrmClient[], name: string): CrmClient | null {
  const nk = normalizeClientName(name);
  if (!nk) return null;
  return clients.find((c) => normalizeClientName(c.name) === nk) || null;
}

export type CrmRow = {
  key: string; // identidad de fila para la UI (c:<id> si hay cliente, n:<nombre> si no)
  clientId?: number;
  client: string;
  clientTaxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientNotes: string;
  quotes: any[];
  approvedCount: number;
  totalSpent: number;
  companyLabels: string[];
  latestQuote: any | null;
  customerType: "Cliente habitual" | "Nuevo cliente";
  bought: boolean;
  isStandalone: boolean; // tiene registro de cliente (entidad), no solo derivado de presupuestos
};

type Accum = {
  key: string;
  clientId?: number;
  client: string;
  clientTaxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientNotes: string;
  quotes: any[];
  companyLabels: string[];
  isStandalone: boolean;
};

// Lista del CRM con los CLIENTES como fuente de verdad: combina los clientes-entidad con los
// derivados de presupuestos. Vínculo primario por clientId; fallback por nombre normalizado
// (datos viejos sin clientId no se pierden). Si clients=[], el resultado es equivalente al
// agrupado por nombre histórico.
// Migración idempotente: deriva clientes-entidad del historial (uno por nombre normalizado),
// tomando contacto del presupuesto más reciente. makeId genera los ids estables (impuro afuera).
export function deriveClientsFromHistory(
  savedBudgets: any[],
  approvedJobs: any[],
  makeId: () => number
): CrmClient[] {
  const latestByName = new Map<string, any>();
  savedBudgets.forEach((b) => {
    const k = normalizeClientName(b.client);
    if (!k) return;
    const prev = latestByName.get(k);
    if (!prev || (b.date || "").localeCompare(prev.date || "") > 0) latestByName.set(k, b);
  });

  const byName = new Map<string, CrmClient>();
  latestByName.forEach((b, k) => {
    const snap = b.snapshot?.budget || {};
    byName.set(k, {
      id: makeId(),
      name: b.client,
      taxId: snap.clientTaxId || "",
      contactName: snap.contactName || "",
      contactPhone: snap.contactPhone || "",
      contactEmail: snap.contactEmail || "",
      notes: snap.clientNotes || "",
      company: b.company,
      createdAt: b.date || "",
    });
  });

  approvedJobs.forEach((j) => {
    const k = normalizeClientName(j.client);
    if (!k || byName.has(k)) return;
    byName.set(k, {
      id: makeId(),
      name: j.client,
      taxId: j.taxId || "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      notes: "",
      company: j.company,
      createdAt: j.approvalDate || j.date || "",
    });
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildCrmRows(params: {
  savedBudgets: any[];
  approvedJobs: any[];
  clients: CrmClient[];
  getCompanyShort: (company: string) => string;
}): CrmRow[] {
  const { savedBudgets, approvedJobs, clients, getCompanyShort } = params;

  const clientById = new Map<number, CrmClient>();
  const clientByName = new Map<string, CrmClient>();
  clients.forEach((c) => {
    clientById.set(c.id, c);
    const nk = normalizeClientName(c.name);
    if (!clientByName.has(nk)) clientByName.set(nk, c);
  });

  const resolveClient = (clientId: unknown, name: string): CrmClient | null => {
    if (typeof clientId === "number" && clientById.has(clientId)) return clientById.get(clientId)!;
    return clientByName.get(normalizeClientName(name)) || null;
  };
  const groupKey = (c: CrmClient | null, name: string) =>
    c ? `c:${c.id}` : `n:${normalizeClientName(name)}`;

  const groups = new Map<string, Accum>();

  // Asegura una fila por cada cliente-entidad (aunque no tenga presupuestos).
  clients.forEach((c) => {
    const key = `c:${c.id}`;
    groups.set(key, {
      key,
      clientId: c.id,
      client: c.name,
      clientTaxId: c.taxId || "",
      contactName: c.contactName || "",
      contactPhone: c.contactPhone || "",
      contactEmail: c.contactEmail || "",
      clientNotes: c.notes || "",
      quotes: [],
      companyLabels: c.company ? [getCompanyShort(c.company)] : [],
      isStandalone: true,
    });
  });

  savedBudgets.forEach((item) => {
    const c = resolveClient(item.clientId, item.client);
    const key = groupKey(c, item.client);
    const snap = item.snapshot?.budget || {};
    const current =
      groups.get(key) ||
      ({
        key,
        clientId: c?.id,
        client: c?.name || item.client,
        clientTaxId: snap.clientTaxId || "",
        contactName: snap.contactName || "",
        contactPhone: snap.contactPhone || "",
        contactEmail: snap.contactEmail || "",
        clientNotes: snap.clientNotes || "",
        quotes: [],
        companyLabels: [],
        isStandalone: !!c,
      } as Accum);

    current.quotes.push(item);
    // El cliente-entidad manda; si no, se completan los vacíos desde el presupuesto.
    if (!current.isStandalone) {
      if (!current.clientTaxId) current.clientTaxId = snap.clientTaxId || "";
      if (!current.contactName) current.contactName = snap.contactName || "";
      if (!current.contactPhone) current.contactPhone = snap.contactPhone || "";
      if (!current.contactEmail) current.contactEmail = snap.contactEmail || "";
      if (!current.clientNotes) current.clientNotes = snap.clientNotes || "";
    }
    current.companyLabels = Array.from(
      new Set([...current.companyLabels, getCompanyShort(item.company)])
    );
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((row) => {
      const approvedForRow = approvedJobs.filter((job) => {
        const jc = resolveClient(job.clientId, job.client);
        return groupKey(jc, job.client) === row.key;
      });
      const approvedCount = approvedForRow.length;
      const totalSpent = approvedForRow.reduce(
        (acc, job) => acc + Number(job.soldGrossPrice || 0),
        0
      );
      const quotes = [...row.quotes].sort((a, b) => {
        const byDate = (b.date || "").localeCompare(a.date || "");
        if (byDate !== 0) return byDate;
        return (b.revisionNumber || 1) - (a.revisionNumber || 1);
      });
      return {
        ...row,
        quotes,
        approvedCount,
        totalSpent,
        latestQuote: quotes[0] || null,
        customerType:
          quotes.length > 1 || approvedCount > 0
            ? ("Cliente habitual" as const)
            : ("Nuevo cliente" as const),
        bought: approvedCount > 0,
      };
    })
    .sort((a, b) => a.client.localeCompare(b.client));
}

// CLIENTES PARA COTIZAR (Nicolas, 2026-10-22: "no veo los clientes viejos cuando empiezo a cotizar, entonces
// es mas dificil llamar al mismo cliente"). El buscador de Presupuestos junta los clientes del CRM con los que
// solo estan en el HISTORIAL (presupuestos guardados y trabajos aprobados de antes del CRM), sin repetir por
// nombre, y a cada uno le suma su historia: cuantos presupuestos, el ultimo y cuantos se aprobaron.
export type ClienteParaCotizar = {
  key: string;
  id?: number; // solo si esta en el CRM
  enCrm: boolean;
  name: string;
  taxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  presupuestos: number;
  aprobados: number;
  ultimo?: { fecha: string; numero: string; proyecto: string };
  // Proyectos de sus presupuestos y trabajos (para reconocerlo por proyecto aunque el nombre este distinto).
  proyectos: string[];
};

export function clientesParaCotizar(crmClients: CrmClient[], savedBudgets: any[], approvedJobs: any[]): ClienteParaCotizar[] {
  const porNombre = new Map<string, ClienteParaCotizar>();
  crmClients.forEach((c) => {
    const k = normalizeClientName(c.name);
    if (!k || porNombre.has(k)) return;
    porNombre.set(k, {
      key: `c:${c.id}`,
      id: c.id,
      enCrm: true,
      name: c.name,
      taxId: c.taxId || "",
      contactName: c.contactName || "",
      contactPhone: c.contactPhone || "",
      contactEmail: c.contactEmail || "",
      notes: c.notes || "",
      presupuestos: 0,
      aprobados: 0,
      proyectos: [],
    });
  });
  let n = 0;
  deriveClientsFromHistory(savedBudgets || [], approvedJobs || [], () => --n).forEach((c) => {
    const k = normalizeClientName(c.name);
    const ya = porNombre.get(k);
    if (ya) {
      // Del CRM manda lo cargado; lo que falte se completa con el historial.
      ya.taxId = ya.taxId || c.taxId;
      ya.contactName = ya.contactName || c.contactName;
      ya.contactPhone = ya.contactPhone || c.contactPhone;
      ya.contactEmail = ya.contactEmail || c.contactEmail;
      return;
    }
    porNombre.set(k, {
      key: `h:${k}`,
      enCrm: false,
      name: c.name,
      taxId: c.taxId,
      contactName: c.contactName,
      contactPhone: c.contactPhone,
      contactEmail: c.contactEmail,
      notes: c.notes,
      presupuestos: 0,
      aprobados: 0,
      proyectos: [],
    });
  });
  (savedBudgets || []).forEach((b) => {
    const c = porNombre.get(normalizeClientName(b.client));
    if (!c) return;
    c.presupuestos += 1;
    if (b.project && !c.proyectos.includes(b.project)) c.proyectos.push(b.project);
    if (!c.ultimo || (b.date || "") > c.ultimo.fecha) c.ultimo = { fecha: b.date || "", numero: String(b.number || ""), proyecto: b.project || "" };
  });
  (approvedJobs || []).forEach((j) => {
    const c = porNombre.get(normalizeClientName(j.client));
    if (!c) return;
    c.aprobados += 1;
    if (j.project && !c.proyectos.includes(j.project)) c.proyectos.push(j.project);
  });
  return Array.from(porNombre.values()).sort(
    (a, b) => (b.ultimo?.fecha || "").localeCompare(a.ultimo?.fecha || "") || a.name.localeCompare(b.name)
  );
}

/** Busca por nombre, CUIT, contacto, telefono o mail (sin acentos ni mayusculas). */
export function filtrarClientes(lista: ClienteParaCotizar[], texto: string): ClienteParaCotizar[] {
  const norm = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = norm(texto).trim();
  if (!q) return lista;
  const digitos = q.replace(/\D/g, "");
  return lista.filter((c) => {
    const texto = norm([c.name, c.contactName, c.contactEmail, c.notes].join(" "));
    if (texto.includes(q)) return true;
    return digitos.length >= 3 && (c.taxId.replace(/\D/g, "").includes(digitos) || c.contactPhone.replace(/\D/g, "").includes(digitos));
  });
}

// ---------------------------------------------------------------------------------------------------------
// POSIBLES COINCIDENCIAS (Nicolas, 2026-10-22: "que me aparezca la lista de los posibles matches, porque
// quizas lo cargue parecido y no igual y es el mismo cliente... que se vinculen por telefono, proyecto, CUIT").
// No decide nada: arma la lista de candidatos con un puntaje y el porque, y la persona elige.
// ---------------------------------------------------------------------------------------------------------

const sinAcentos = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Palabras que no identifican a nadie: tipo de sociedad, titulos, "familia"...
const PALABRAS_VACIAS_NOMBRE = new Set([
  "sa", "srl", "sas", "sh", "sci", "saic", "sacif", "cia", "hnos", "hermanos", "sociedad", "anonima",
  "estudio", "arq", "arqs", "arquitecto", "arquitecta", "arquitectos", "arquitectura", "ing", "dr", "dra", "sr", "sra",
  "familia", "flia", "fam", "de", "del", "la", "las", "los", "el", "y", "e",
]);
// Palabras de proyecto demasiado comunes para vincular a alguien por si solas.
const PALABRAS_VACIAS_PROYECTO = new Set([
  "cocina", "cocinas", "placard", "placares", "vestidor", "bano", "banos", "vanitory", "mueble", "muebles",
  "casa", "depto", "dpto", "departamento", "obra", "proyecto", "escritorio", "dormitorio", "living", "lavadero",
  "de", "del", "la", "las", "los", "el", "y", "en", "con", "para",
]);

const tokens = (texto: string, vacias: Set<string>): string[] =>
  sinAcentos(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !vacias.has(t));

/** Nombre normalizado para comparar: sin acentos, sin puntuacion, sin "SRL", "Estudio", "Arq", "Flia"... */
export const nombreParaComparar = (nombre: string): string => tokens(nombre, PALABRAS_VACIAS_NOMBRE).join(" ");

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Parecido entre dos palabras (0..1). Las cortas (<=3 letras) tienen que ser iguales.
const parecidoPalabra = (a: string, b: string): number => {
  if (a === b) return 1;
  if (Math.min(a.length, b.length) <= 3) return 0;
  const sim = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return sim >= 0.75 ? sim : 0;
};

/**
 * Parecido entre dos nombres (0..1), sin importar el orden de las palabras ni acentos ni "SRL"/"Estudio":
 * "Gomez Carlos" ~ "Carlos Gómez" = 1; "Perez" ~ "Peres"; "Perez" ~ "Juan Perez" (alto pero menor que 1).
 */
export function parecidoNombre(a: string, b: string): number {
  const ta = tokens(a, PALABRAS_VACIAS_NOMBRE);
  const tb = tokens(b, PALABRAS_VACIAS_NOMBRE);
  if (!ta.length || !tb.length) return 0;
  const [corta, larga] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const suma = corta.reduce((acc, t) => acc + Math.max(...larga.map((u) => parecidoPalabra(t, u))), 0);
  // 70% "todas las palabras del mas corto estan en el otro" + 30% "cuantas palabras comparten en total".
  const solape = suma / corta.length;
  const total = suma / ((corta.length + larga.length) / 2);
  return Math.round((0.7 * solape + 0.3 * total) * 1000) / 1000;
}

const digitos = (s: string) => String(s || "").replace(/\D/g, "");
const ultimos8 = (tel: string) => digitos(tel).slice(-8);
const proyectoClave = (p: string) => tokens(p, PALABRAS_VACIAS_PROYECTO).join(" ");

export type DatosParaCoincidir = {
  nombre?: string;
  telefono?: string;
  cuit?: string;
  email?: string;
  proyecto?: string;
  // Cliente ya elegido (para no sugerirse a si mismo).
  clientId?: number;
};

export type Coincidencia = { cliente: ClienteParaCotizar; puntaje: number; motivos: string[] };

export const UMBRAL_COINCIDENCIA = 30;

// Puntaje de un candidato contra los datos (sin excluir a nadie). Lo usan el buscador y los duplicados del CRM.
function puntuar(datos: DatosParaCoincidir, c: ClienteParaCotizar, proyectosExtra: string[] = []): { puntaje: number; motivos: string[] } {
  let puntaje = 0;
  const motivos: string[] = [];
  const nombre = (datos.nombre || "").trim();
  if (nombre.length >= 3) {
    const sim = parecidoNombre(nombre, c.name);
    if (sim >= 0.7) {
      puntaje += Math.round(sim * 60);
      // "mismo nombre" = mismas palabras (en cualquier orden); si no, "parecido".
      const ordenado = (s: string) => nombreParaComparar(s).split(" ").sort().join(" ");
      motivos.push(ordenado(nombre) === ordenado(c.name) ? "mismo nombre" : "nombre parecido");
    }
  }
  const tel = ultimos8(datos.telefono || "");
  if (tel.length >= 6 && tel === ultimos8(c.contactPhone)) {
    puntaje += 50;
    motivos.push("mismo teléfono");
  }
  const cuit = digitos(datos.cuit || "");
  if (cuit.length >= 7 && cuit === digitos(c.taxId)) {
    puntaje += 80;
    motivos.push("mismo CUIT");
  }
  const mail = sinAcentos(datos.email || "").trim();
  if (mail.includes("@") && mail === sinAcentos(c.contactEmail).trim()) {
    puntaje += 60;
    motivos.push("mismo mail");
  }
  const proy = proyectoClave(datos.proyecto || "");
  if (proy.length >= 4) {
    const suyos = Array.from(new Set([...(c.proyectos || []), ...proyectosExtra])).map(proyectoClave).filter((p) => p.length >= 4);
    if (suyos.some((p) => p === proy)) {
      puntaje += 40;
      motivos.push("mismo proyecto");
    } else if (suyos.some((p) => Math.min(p.length, proy.length) >= 6 && (p.includes(proy) || proy.includes(p)))) {
      puntaje += 30;
      motivos.push("mismo proyecto");
    }
  }
  return { puntaje, motivos };
}

/**
 * Candidatos a ser el MISMO cliente que se esta cargando (por nombre parecido, telefono, CUIT, mail o
 * proyecto), ordenados por puntaje. Excluye al cliente ya elegido y al que tiene exactamente el nombre tipeado.
 * savedBudgets es opcional: si viene, suma los proyectos de esos presupuestos a cada cliente.
 */
export function posiblesCoincidencias(
  lista: ClienteParaCotizar[],
  datos: DatosParaCoincidir,
  savedBudgets?: any[]
): Coincidencia[] {
  const nombreExacto = normalizeClientName(datos.nombre || "");
  const proyectosPorNombre = new Map<string, string[]>();
  (savedBudgets || []).forEach((b) => {
    const k = normalizeClientName(b.client);
    if (!k || !b.project) return;
    proyectosPorNombre.set(k, [...(proyectosPorNombre.get(k) || []), b.project]);
  });
  return (lista || [])
    .filter((c) => c && c.name)
    .filter((c) => !(datos.clientId != null && c.enCrm && c.id === datos.clientId))
    .filter((c) => !nombreExacto || normalizeClientName(c.name) !== nombreExacto)
    .map((c) => ({ cliente: c, ...puntuar(datos, c, proyectosPorNombre.get(normalizeClientName(c.name)) || []) }))
    .filter((x) => x.puntaje >= UMBRAL_COINCIDENCIA)
    .sort((a, b) => b.puntaje - a.puntaje || a.cliente.name.localeCompare(b.cliente.name));
}

// ---------------------------------------------------------------------------------------------------------
// FICHA DEL CLIENTE en el CRM: que le falta, sus presupuestos/trabajos y los posibles duplicados.
// ---------------------------------------------------------------------------------------------------------

/** Lo que le falta a la ficha para estar completa (en el orden en que conviene pedirlo). */
export function faltantesDeCliente(c: CrmClient): string[] {
  const falta: string[] = [];
  const vacio = (s: unknown) => !String(s ?? "").trim();
  if (vacio(c.name)) falta.push("nombre");
  if (vacio(c.taxId)) falta.push("CUIT");
  else if (digitos(c.taxId).length < 7) falta.push("CUIT incompleto");
  if (vacio(c.contactName)) falta.push("contacto");
  if (vacio(c.contactPhone)) falta.push("teléfono");
  if (vacio(c.contactEmail)) falta.push("mail");
  else if (!String(c.contactEmail).includes("@")) falta.push("mail incompleto");
  if (vacio(c.direccion)) falta.push("dirección");
  return falta;
}

/** ¿Este presupuesto / trabajo es de este cliente? Por clientId; si no tiene clientId, por nombre. */
export function esDelCliente(c: CrmClient, item: { clientId?: number; client?: string }): boolean {
  if (typeof item?.clientId === "number") return item.clientId === c.id;
  return !!normalizeClientName(c.name) && normalizeClientName(item?.client || "") === normalizeClientName(c.name);
}

// Un cliente del CRM visto como candidato (mismos campos que el buscador de Presupuestos).
function comoCandidato(c: CrmClient, savedBudgets: any[]): ClienteParaCotizar {
  const suyos = (savedBudgets || []).filter((b) => esDelCliente(c, b));
  return {
    key: `c:${c.id}`,
    id: c.id,
    enCrm: true,
    name: c.name,
    taxId: c.taxId || "",
    contactName: c.contactName || "",
    contactPhone: c.contactPhone || "",
    contactEmail: c.contactEmail || "",
    notes: c.notes || "",
    presupuestos: suyos.length,
    aprobados: 0,
    proyectos: Array.from(new Set(suyos.map((b) => b.project).filter(Boolean))),
  };
}

export type ParDuplicado = { a: CrmClient; b: CrmClient; puntaje: number; motivos: string[] };

/**
 * Pares de clientes del CRM que parecen ser la misma persona/empresa (mismas reglas que el buscador:
 * nombre parecido, telefono, CUIT, mail o un proyecto en comun). Para unificarlos o corregirlos.
 */
export function duplicadosEnCrm(clients: CrmClient[], savedBudgets: any[] = []): ParDuplicado[] {
  const lista = (clients || []).filter((c) => c && (c.name || "").trim());
  const cands = lista.map((c) => comoCandidato(c, savedBudgets));
  const pares: ParDuplicado[] = [];
  for (let i = 0; i < lista.length; i++) {
    const a = cands[i];
    const datos: DatosParaCoincidir = { nombre: a.name, telefono: a.contactPhone, cuit: a.taxId, email: a.contactEmail };
    for (let j = i + 1; j < lista.length; j++) {
      const b = cands[j];
      let { puntaje, motivos } = puntuar(datos, b);
      // Un proyecto en comun (cualquiera de los de A contra los de B).
      if (!motivos.includes("mismo proyecto") && a.proyectos.some((p) => puntuar({ proyecto: p }, b).puntaje > 0)) {
        puntaje += 30;
        motivos = [...motivos, "mismo proyecto"];
      }
      if (puntaje >= UMBRAL_COINCIDENCIA) pares.push({ a: lista[i], b: lista[j], puntaje, motivos });
    }
  }
  return pares.sort((x, y) => y.puntaje - x.puntaje || x.a.name.localeCompare(y.a.name));
}

/** Duplicados de UN cliente (para su ficha). */
export function duplicadosDeCliente(c: CrmClient, pares: ParDuplicado[]): Array<{ cliente: CrmClient; puntaje: number; motivos: string[] }> {
  return pares
    .filter((p) => p.a.id === c.id || p.b.id === c.id)
    .map((p) => ({ cliente: p.a.id === c.id ? p.b : p.a, puntaje: p.puntaje, motivos: p.motivos }));
}
