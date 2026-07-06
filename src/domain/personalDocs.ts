// Carga de documentacion/EPP/insumos del personal desde la carpeta. El nombre del archivo trae la
// fecha ("AAAA-MM-DD Item.ext") y el item; la subcarpeta trae el tipo. El sistema calcula la vigencia:
// - Documentacion: la fecha del nombre ES el vencimiento.
// - EPP/Insumos/Examenes/Capacitaciones: vigencia = fecha (entrega/realizacion) + periodicidad.
// Pura y testeable; el matcheo al empleado y el guardado se hacen en App.
import type { PersonalProvisionKind } from "./types";

export type ProvisionCatalogItem = {
  code: string;
  description: string;
  kind: string;
  periodicityMonths: number;
};

export type ResolvedPersonalDoc = {
  target: "document" | "provision";
  kind: PersonalProvisionKind | null;
  stockCode: string;
  itemName: string;
  deliveryDate: string; // fecha del nombre
  dueDate: string; // vigencia calculada
  attachmentName: string;
};

const norm = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Suma meses a una fecha ISO (yyyy-mm-dd) y devuelve ISO.
export function addMonthsIso(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const base = new Date(y, m - 1 + months, d);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(
    base.getDate()
  ).padStart(2, "0")}`;
}

// Separa la fecha (prefijo AAAA-MM-DD) del nombre del item, quitando la extension.
export function parsePersonalFileName(fileName: string): { date: string; itemName: string } {
  const noExt = fileName.replace(/\.[a-z0-9]+$/i, "");
  const m = noExt.match(/^(\d{4}-\d{2}-\d{2})[\s_.\-]*(.*)$/);
  if (m) return { date: m[1], itemName: (m[2] || "").trim() || noExt };
  return { date: "", itemName: noExt.trim() };
}

const SUBAREA_TARGET: Record<string, PersonalProvisionKind | "document" | null> = {
  documentacion: "document",
  documentos: "document",
  epp: "EPP",
  seguridad: "EPP",
  insumos: "Insumos",
  examenes: "Examenes",
  capacitaciones: "Capacitaciones",
  recibos: null, // recibos de sueldo: solo se archivan
};

const DEFAULT_PERIODICITY: Record<PersonalProvisionKind, number> = {
  EPP: 6,
  Insumos: 6,
  Examenes: 12,
  Capacitaciones: 12,
};

// Resuelve un archivo de personal a un documento o item de provision con su vigencia. Devuelve null
// si no aplica (subcarpeta sin vigencia, o sin fecha en el nombre -> solo se archiva).
export function resolvePersonalDoc(
  fileName: string,
  subArea: string | undefined,
  catalog: ProvisionCatalogItem[]
): ResolvedPersonalDoc | null {
  const target = SUBAREA_TARGET[norm(subArea || "")];
  if (target == null) return null;
  const { date, itemName } = parsePersonalFileName(fileName);
  if (!date) return null;

  if (target === "document") {
    return {
      target: "document",
      kind: null,
      stockCode: "",
      itemName,
      deliveryDate: date,
      dueDate: date, // la fecha del nombre es el vencimiento
      attachmentName: fileName,
    };
  }

  const kind = target;
  const match =
    catalog.find((c) => norm(c.kind) === norm(kind) && norm(c.description) === norm(itemName)) ||
    catalog.find(
      (c) => norm(c.kind) === norm(kind) && norm(itemName).includes(norm(c.description))
    );
  const periodicity = match?.periodicityMonths || DEFAULT_PERIODICITY[kind];
  return {
    target: "provision",
    kind,
    stockCode: match?.code || "",
    itemName,
    deliveryDate: date,
    dueDate: addMonthsIso(date, periodicity),
    attachmentName: fileName,
  };
}
