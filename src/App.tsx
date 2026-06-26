import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  money,
  pct,
  formatDateDisplay,
  localDateKey,
  localMonthKey,
  todayIso,
  normalizeCompanyText,
} from "./lib/format";
import { WORK_TYPE_OPTIONS } from "./domain/types";
import { getScaleForCategory as getScaleForCategoryPure } from "./domain/scale";
import {
  splitModuleDataByCompany,
  mergeModuleDataByCompany,
  applyCompanyModuleSlice,
  GENERAL_COMPANY,
} from "./domain/companyState";
import { newId } from "./domain/id";
import { createPortal } from "react-dom";
import type {
  CompanyName,
  CompanyScope,
  WorkTypeName,
  TabKey,
  PrintMode,
  Material,
  LaborRow,
  FixedCost,
  MarkerFixedGroup,
  FixedMarker,
  SupplyMarkerSubtype,
  SupplyMarker,
  LaborMarker,
  PersonalProvisionKind,
  PersonalProvisionMarker,
  BudgetImage,
  BudgetDiscount,
  BudgetIncrease,
  BudgetSectionTotals,
  BudgetSection,
  BudgetData,
  BudgetSnapshot,
  SavedBudget,
  Invoice,
  Payment,
  Retention,
  LegacyApprovedInvoice,
  LegacyApprovedPayment,
  LegacyApprovedRetention,
  LegacyApprovedAdditional,
  LegacyApprovedImportRow,
  AdditionalItem,
  CommissionPayment,
  ApprovedJob,
  FinancialItemType,
  FinancialItemStatus,
  FinancialCalendarItem,
  PurchaseInvoice,
  PettyCashFund,
  PettyCashExpense,
  DebtPlan,
  BankStatementEntry,
  StockItem,
  CompanyAsset,
  CostAnalysisGroup,
  CostAnalysisEntry,
  RemitoDraftRow,
  RemitoDraft,
  SupabaseActiveSession,
  SupabaseInternalChatMessage,
  SupabaseDirectoryUser,
  SupabaseSnapshotRecord,
  InternalAssistantMessage,
  WorkspaceNotification,
  AppUser,
  EmployeeDocument,
  EmployeeProvisionKind,
  EmployeeProvisionItem,
  AttendanceStatus,
  AttendanceRecord,
  EmployeePayroll,
  Employee,
  EmployeeBaseDocument,
  EmployeeBaseProvisionTemplate,
  EmployeeBaseConfig,
  ScaleRow,
} from "./domain/types";

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (input: { data: ArrayBuffer }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNumber: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str?: string }>;
            }>;
          }>;
        }>;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
    Tesseract?: {
      recognize: (
        file: File,
        languages: string,
        options?: { logger?: (event: unknown) => void }
      ) => Promise<{ data: { text: string } }>;
    };
    __externalScriptPromises?: Record<string, Promise<void>>;
  }
}

const APP_TITLE = "Sistema de Gestion Grupo BGA";
const INVOICE_VAT_PCT = 21;

type CompanyOption = {
  value: string;
  short: string;
  primary: string;
  soft: string;
  taxId: string;
  bankName: string;
  bankAlias: string;
  bankCbu: string;
  bankAccount: string;
};

const DEFAULT_COMPANY_OPTIONS: CompanyOption[] = [
  {
    value: "BGA estudio de diseño y produccion industrial s.r.l",
    short: "BGA",
    primary: "#14213d",
    soft: "#dbe7f7",
    taxId: "30-71527468-6",
    bankName: "Santander",
    bankAlias: "GRUPOBGA",
    bankCbu: "0720082320000000448536",
    bankAccount: "CC$ 082-004485/3",
  },
  {
    value: "De raiz s.r.l",
    short: "De raiz",
    primary: "#b7791f",
    soft: "#fef3c7",
    taxId: "30-71769540-9",
    bankName: "Banco Patagonia",
    bankAlias: "DERAIZSRL",
    bankCbu: "0340041800419997078004",
    bankAccount: "CC $ 041-419997078-000",
  },
];

let runtimeCompanyOptions: CompanyOption[] = [...DEFAULT_COMPANY_OPTIONS];
const COMPANY_OPTIONS = DEFAULT_COMPANY_OPTIONS;

const STOCK_GENERAL_GROUP_OPTIONS = [
  "Melaminas",
  "Enchapado",
  "MDF",
  "Maderas",
  "Tapacantos",
  "Insumos carpinteria",
  "Insumos pintureria",
  "Insumos herreria",
  "Pinturas",
  "Hierros",
  "Aluminio",
  "Herrajes",
  "Maquinas pesadas",
  "Maquinas manuales",
] as const;

type StockGeneralGroupName = (typeof STOCK_GENERAL_GROUP_OPTIONS)[number];

const STOCK_GROUP_CODE_PREFIX: Record<StockGeneralGroupName, string> = {
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
};

const TAB_OPTIONS: Array<{ key: TabKey; label: string }> = [
  { key: "acceso", label: "Acceso" },
  { key: "cashflow", label: "Cash flow y resultados" },
  { key: "facturacion", label: "Facturacion y cobranzas" },
  { key: "aprobados", label: "Trabajos aprobados" },
  { key: "fabricacion", label: "Fabricacion" },
  { key: "compras", label: "Compras" },
  { key: "cajaChica", label: "Caja chica" },
  { key: "presupuesto", label: "Presupuesto actual" },
  { key: "historial", label: "CRM" },
  { key: "stock", label: "Stock, agenda y analisis de costos" },
  { key: "personal", label: "Personal" },
  { key: "marcadores", label: "Marcadores" },
];

const NETA_TAB_KEYS: TabKey[] = ["presupuesto", "historial", "stock", "marcadores"];
const BRUTA_TAB_KEYS: TabKey[] = [
  "cashflow",
  "facturacion",
  "aprobados",
  "fabricacion",
  "compras",
  "cajaChica",
  "personal",
];

const resolveCompanyNameFromCatalogItem = (
  item: { code?: string | null; name?: string | null; label?: string | null },
  options: CompanyOption[]
): CompanyName | null => {
  const code = normalizeCompanyText(item.code || "");
  const name = normalizeCompanyText(item.name || "");
  const label = normalizeCompanyText(item.label || "");

  const exactCodeMatch = options.find((option) => {
    const short = normalizeCompanyText(option.short);
    const value = normalizeCompanyText(option.value);

    return (
      code === short ||
      code === value ||
      code === short.replace(/\s+/g, "") ||
      code === value.replace(/\s+/g, "")
    );
  });

  if (exactCodeMatch) return exactCodeMatch.value;

  const nameMatch = options.find((option) => {
    const optionValue = normalizeCompanyText(option.value);
    const optionShort = normalizeCompanyText(option.short);

    return (
      name === optionValue ||
      name === optionShort ||
      label === optionValue ||
      label === optionShort ||
      (name && optionValue.includes(name)) ||
      (name && name.includes(optionValue)) ||
      (label && optionValue.includes(label)) ||
      (label && label.includes(optionValue))
    );
  });

  return nameMatch?.value || null;
};

const getCompanyMeta = (company: CompanyName) =>
  runtimeCompanyOptions.find((item) => item.value === company) ?? runtimeCompanyOptions[0];

const getCompanyScopeLabel = (company: CompanyScope) =>
  company === "General" ? "General" : getCompanyMeta(company).short;

const getAllCompanyOptions = () => runtimeCompanyOptions;

const getPettyCashAdministration = (
  expense: Pick<PettyCashExpense, "invoiceNumber" | "attachmentName">
) =>
  String(expense.invoiceNumber || "").trim() ||
  String(expense.attachmentName || "").trim()
    ? "blanco"
    : "negro";

const getTabAdministrationType = (tab: TabKey) => {
  if (tab === "acceso") return "Sistema";
  if (NETA_TAB_KEYS.includes(tab)) return "Administracion neta";
  return "Administracion bruta";
};

const getTabLabel = (tabKey: string) =>
  TAB_OPTIONS.find((item) => item.key === tabKey)?.label || tabKey;

const TAB_SHORT_LABELS: Record<TabKey, string> = {
  acceso: "AC",
  cashflow: "CF",
  fabricacion: "FB",
  compras: "CP",
  cajaChica: "CC",
  presupuesto: "PR",
  marcadores: "MK",
  historial: "CRM",
  aprobados: "TA",
  facturacion: "FC",
  stock: "SA",
  personal: "PE",
};

const buildBlankRemitoDraftRow = (company: CompanyScope): RemitoDraftRow => ({
  id: newId(),
  company,
  description: "",
  group: "",
  location: "",
  unit: "u",
  quantity: 0,
  unitPrice: 0,
  matchedStockId: null,
});

const getCompanyTaxId = (company: CompanyName) => getCompanyMeta(company).taxId;

const getCompanyBankingLines = (company: CompanyName) => {
  const companyMeta = getCompanyMeta(company);
  return [
    companyMeta.bankName ? `Banco: ${companyMeta.bankName}` : "",
    companyMeta.bankAlias ? `Alias: ${companyMeta.bankAlias}` : "",
    companyMeta.bankCbu ? `CBU: ${companyMeta.bankCbu}` : "",
    companyMeta.bankAccount ? `Cuenta: ${companyMeta.bankAccount}` : "",
    companyMeta.taxId ? `CUIT: ${companyMeta.taxId}` : "",
  ].filter(Boolean);
};

const buildBudgetNumberFromParts = (prefix: string, value: number, width: number) =>
  `${prefix}${String(Math.max(0, value)).padStart(width, "0")}`;

const getNextBudgetNumber = (existingNumbers: string[], currentNumber: string) => {
  const currentMatch = (currentNumber || "").trim().match(/^(.*?)(\d+)$/);
  const prefix = currentMatch?.[1] ?? "P-";
  const width = currentMatch?.[2]?.length ?? 4;
  const candidates = [...existingNumbers, currentNumber]
    .map((item) => (item || "").trim().match(/^(.*?)(\d+)$/))
    .filter((match): match is RegExpMatchArray => !!match && match[1] === prefix)
    .map((match) => Number(match[2] || 0));
  const maxNumber = candidates.reduce((acc, value) => Math.max(acc, value), 0);
  return buildBudgetNumberFromParts(prefix, maxNumber + 1, width);
};

const parseLeadDays = (deliveryTerm: string) => {
  const cleaned = (deliveryTerm || "").replace(/[^0-9]/g, " ").trim();
  const first = cleaned.split(/\s+/)[0];
  return first ? Number(first) : 0;
};

// Semaforo de estado por urgencia de fecha (verde = bien, amarillo = mas o menos, rojo = complicado).
// Semantica de ESTADO (no de empresa): verde si esta hecho o con margen; amarillo si vence pronto;
// rojo si esta vencido. Reutilizable para cobros, pagos y fechas.
type SemaphoreLevel = "verde" | "amarillo" | "rojo";
const SEMAPHORE_PALETTE: Record<SemaphoreLevel, { color: string; soft: string }> = {
  verde: { color: "#16a34a", soft: "rgba(22,163,74,0.15)" },
  amarillo: { color: "#f59e0b", soft: "rgba(245,158,11,0.15)" },
  rojo: { color: "#dc2626", soft: "rgba(220,38,38,0.15)" },
};
const SEMAPHORE_SOON_DAYS = 7;
const daysUntilDate = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};
const getDateSemaphore = (
  dateStr: string,
  done: boolean,
  doneLabel = "hecho"
): { level: SemaphoreLevel; color: string; soft: string; label: string } => {
  if (done) return { level: "verde", ...SEMAPHORE_PALETTE.verde, label: doneLabel };
  const days = daysUntilDate(dateStr);
  if (days === null) return { level: "amarillo", ...SEMAPHORE_PALETTE.amarillo, label: "sin fecha" };
  if (days < 0)
    return { level: "rojo", ...SEMAPHORE_PALETTE.rojo, label: `vencio hace ${Math.abs(days)} d` };
  if (days <= SEMAPHORE_SOON_DAYS)
    return {
      level: "amarillo",
      ...SEMAPHORE_PALETTE.amarillo,
      label: days === 0 ? "vence hoy" : `vence en ${days} d`,
    };
  return { level: "verde", ...SEMAPHORE_PALETTE.verde, label: `en ${days} d` };
};

// Semaforo de un trabajo aprobado: rojo si falta fecha de inicio (dato critico),
// verde si finalizado, amarillo si en curso/pendiente.
const getJobSemaphore = (job: {
  startDate?: string;
  executionStatus?: string;
}): { level: SemaphoreLevel; label: string } => {
  if (!job.startDate) return { level: "rojo", label: "sin fecha de inicio" };
  if (job.executionStatus === "finalizado") return { level: "verde", label: "finalizado" };
  if (job.executionStatus === "en_curso") return { level: "amarillo", label: "en curso" };
  return { level: "amarillo", label: "pendiente" };
};

// Semaforo de un presupuesto del historial: aprobado=verde, no aprobado=rojo, y si sigue
// en borrador/pendiente, vencido (paso la validez) = rojo, vigente = amarillo.
const getBudgetSemaphore = (budget: {
  status?: string;
  date?: string;
  snapshot?: { budget?: { validity?: string } };
}): { level: SemaphoreLevel; label: string } => {
  if (budget.status === "aprobado") return { level: "verde", label: "aprobado" };
  if (budget.status === "no_aprobado") return { level: "rojo", label: "no aprobado" };
  const validityDays = Number(/(\d+)/.exec(budget.snapshot?.budget?.validity || "")?.[1] || 0);
  if (validityDays > 0 && budget.date) {
    const [y, m, d] = budget.date.slice(0, 10).split("-").map(Number);
    if (y && m && d) {
      const venc = new Date(y, m - 1, d + validityDays);
      const vencStr = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}-${String(
        venc.getDate()
      ).padStart(2, "0")}`;
      const left = daysUntilDate(vencStr);
      if (left !== null && left < 0) return { level: "rojo", label: "vencido" };
    }
  }
  return { level: "amarillo", label: "vigente" };
};

// Semaforo de stock/faltante de un material: verde cubierto, amarillo parcial, rojo faltante total.
const getStockSemaphore = (row: {
  available: number;
  missing: number;
}): { level: SemaphoreLevel; label: string } => {
  if (Number(row.missing) <= 0) return { level: "verde", label: "cubierto" };
  if (Number(row.available) > 0) return { level: "amarillo", label: "parcial" };
  return { level: "rojo", label: "faltante" };
};

// Semaforo de un fondo de caja chica: rojo si se agoto el saldo, amarillo si queda poco (<20%).
const getFundSemaphore = (
  remaining: number,
  assigned: number
): { level: SemaphoreLevel; label: string } => {
  if (Number(remaining) <= 0) return { level: "rojo", label: "saldo agotado" };
  if (Number(assigned) > 0 && Number(remaining) < Number(assigned) * 0.2)
    return { level: "amarillo", label: "saldo bajo" };
  return { level: "verde", label: "con saldo" };
};

// Semaforo de un cliente del CRM: rojo si no hay CUIT ni contacto, amarillo si falta uno, verde completo.
const getClientSemaphore = (row: {
  clientTaxId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}): { level: SemaphoreLevel; label: string } => {
  const hasTax = !!(row.clientTaxId || "").trim();
  const hasContact = !!(
    (row.contactName || "").trim() ||
    (row.contactPhone || "").trim() ||
    (row.contactEmail || "").trim()
  );
  if (!hasTax && !hasContact) return { level: "rojo", label: "sin CUIT ni contacto" };
  if (!hasTax || !hasContact) return { level: "amarillo", label: "datos incompletos" };
  return { level: "verde", label: "datos completos" };
};

const parsePaymentPercents = (paymentTerms: string) => {
  const regex = /(\d{1,3})(?:[.,]\d+)?\s*%/g;
  const matches: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(paymentTerms)) !== null) {
    matches.push(Number(match[1] || 0));
  }

  const anticipoPct = Math.min(100, Math.max(0, matches[0] ?? 0));
  const saldoPct =
    matches.length > 1
      ? Math.min(100, Math.max(0, matches[1] ?? 0))
      : Math.max(0, 100 - anticipoPct);
  return { anticipoPct, saldoPct };
};

const buildDeliveryDateFromTerm = (baseDateText: string, deliveryTerm: string) => {
  const leadDays = parseLeadDays(deliveryTerm);
  if (!baseDateText || !leadDays) return "";
  const baseDate = new Date(baseDateText);
  if (Number.isNaN(baseDate.getTime())) return "";
  return new Date(baseDate.getTime() + leadDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};

// Comprime/reduce una imagen (data URL) via canvas para que NO se guarden fotos full-res
// en base64 dentro del estado (eso disparaba "Out of Memory"). Reduce la dimension maxima
// y la recodifica. Devuelve la mas chica entre original y comprimida.
type ImageReadOpts = { maxDimension?: number; mimeType?: string; quality?: number };

const compressImageDataUrl = (
  dataUrl: string,
  maxDimension: number,
  mimeType: string,
  quality: number
) =>
  new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, maxDimension / longest);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL(mimeType, quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const readImage = (file: File, opts?: ImageReadOpts) =>
  new Promise<BudgetImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = String(reader.result || "");
      try {
        const compressed = await compressImageDataUrl(
          raw,
          opts?.maxDimension ?? 1400,
          opts?.mimeType ?? "image/jpeg",
          opts?.quality ?? 0.72
        );
        resolve({
          name: file.name,
          preview: compressed.length < raw.length ? compressed : raw,
        });
      } catch {
        resolve({ name: file.name, preview: raw });
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Convierte la imagen comprimida a Blob para subirla a Storage (en vez de base64 en el estado).
const compressImageToBlob = (file: File, opts?: ImageReadOpts) =>
  new Promise<{ blob: Blob; contentType: string; ext: string }>((resolve, reject) => {
    const maxDimension = opts?.maxDimension ?? 1400;
    const mimeType = opts?.mimeType ?? "image/jpeg";
    const quality = opts?.quality ?? 0.72;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const longest = Math.max(img.width, img.height) || 1;
        const scale = Math.min(1, maxDimension / longest);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen."));
              return;
            }
            resolve({ blob, contentType: mimeType, ext: mimeType === "image/png" ? "png" : "jpg" });
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => reject(new Error("Imagen invalida."));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });

// Sube la imagen a Supabase Storage (en el estado queda solo la URL -> liviano, escala con
// muchos planos). Si Storage falla, CAE a base64 comprimido para que la imagen nunca se pierda.
const uploadBudgetImage = async (file: File, opts?: ImageReadOpts): Promise<BudgetImage> => {
  try {
    const { blob, contentType, ext } = await compressImageToBlob(file, opts);
    const path = `budgets/${newId()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
    const { error } = await supabase.storage
      .from("budget-images")
      .upload(path, blob, { contentType, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("budget-images").getPublicUrl(path);
    return { name: file.name, preview: data.publicUrl };
  } catch (err) {
    console.error("[budget-image] Fallo la subida a Storage, usando base64:", err);
    return readImage(file, opts);
  }
};

const LOGO_IMAGE_OPTS: ImageReadOpts = { maxDimension: 480, mimeType: "image/png", quality: 1 };

// Espera a que carguen las imagenes (URLs de Storage) antes de imprimir, para que aparezcan
// en el PDF. base64 carga al instante; las URLs tienen un tope de 4s por las dudas.
const preloadImages = (urls: string[]) =>
  Promise.all(
    urls
      .filter((src) => !!src)
      .map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            const done = () => resolve();
            img.onload = done;
            img.onerror = done;
            img.src = src;
            if (img.complete) resolve();
            window.setTimeout(done, 4000);
          })
      )
  ).then(() => undefined);

const readTextFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });

const inferRemitoSourceType = (fileName: string): RemitoDraft["sourceType"] => {
  const lowered = fileName.toLowerCase();
  if (lowered.endsWith(".pdf")) return "pdf";
  if (
    lowered.endsWith(".xlsx") ||
    lowered.endsWith(".xls") ||
    lowered.endsWith(".csv") ||
    lowered.endsWith(".tsv")
  ) {
    return "excel";
  }
  return "otro";
};

const parseDelimitedRemitoRows = (text: string, company: CompanyScope): RemitoDraftRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const separator = lines.some((line) => line.includes(";"))
    ? ";"
    : lines.some((line) => line.includes("\t"))
    ? "\t"
    : ",";

  const parsedRows = lines
    .map((line) => line.split(separator).map((cell) => cell.trim()))
    .filter((cells) => cells.length > 0)
    .slice(1)
    .map((cells, index) => ({
      id: newId(),
      company,
      description: cells[0] || "",
      group: cells[1] || "",
      location: cells[2] || "",
      unit: cells[3] || "u",
      quantity: Number(String(cells[4] || "0").replace(",", ".")) || 0,
      unitPrice: Number(String(cells[5] || "0").replace(",", ".")) || 0,
      matchedStockId: null,
    }))
    .filter((row) => row.description || row.quantity || row.unitPrice);

  return parsedRows;
};

const parseMonthKey = (month: string) => {
  const [yearText, monthText] = (month || localMonthKey()).split("-");
  const today = new Date();
  const year = Number(yearText) || today.getFullYear();
  const monthIndex = Math.min(11, Math.max(0, (Number(monthText) || today.getMonth() + 1) - 1));
  return { year, monthIndex };
};

const shiftMonthKey = (month: string, amount: number) => {
  const { year, monthIndex } = parseMonthKey(month);
  return localMonthKey(new Date(year, monthIndex + amount, 1));
};

// Mes "YYYY-MM" al que pertenece un item segun su fecha. Si no tiene fecha valida,
// cae al mes corriente para que el item siga siendo alcanzable (no queda huerfano).
const itemMonthKey = (dateValue: unknown): string => {
  if (typeof dateValue === "string" && /^\d{4}-\d{2}/.test(dateValue)) {
    return dateValue.slice(0, 7);
  }
  return localMonthKey();
};

// Estampa una fecha valida: si el valor esta vacio o no parece una fecha, devuelve HOY.
// Se aplica al guardar (buildPersistedAppData) para que ningun item quede sin fecha y su
// mes quede FIJADO de forma permanente (no se recalcula a "hoy" en cada vista). Additivo:
// nunca pisa una fecha existente.
const stampDate = (value: unknown): string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value : todayIso();

const ATTENDANCE_WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const monthLabel = (month: string) => {
  if (!month) return "-";
  const { year, monthIndex } = parseMonthKey(month);
  const monthName = new Date(year, monthIndex, 1).toLocaleDateString("es-AR", {
    month: "long",
  });
  return `${monthName} ${year}`;
};

const categoryAliases: Record<string, string> = {
  "OFICIAL MULTIPLE": "Oficial multiple",
  "OFICIAL ESPECIALIZADO": "Oficial especializado",
  "OFICIAL GENERAL": "Oficial general",
  "MEDIO OFICIAL": "Medio oficial",
  AYUDANTE: "Ayudante",
  "OPERARIO ACT. INDUSTRIAL": "Operario act. industrial",
  "OPERARIO ACT INDUSTRIAL": "Operario act. industrial",
};

const CATEGORY_OPTIONS = [
  "Ayudante",
  "Medio oficial",
  "Oficial especializado",
  "Oficial general",
  "Oficial multiple",
  "Operario act. industrial",
] as const;

const seededScaleRows: ScaleRow[] = [
  { id: 1, month: "2026-04", category: "Oficial multiple", baseHourly: 7403.78, nonRemHourly: 347.98, vht: 7751.76, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 2, month: "2026-05", category: "Oficial multiple", baseHourly: 7403.78, nonRemHourly: 555.28, vht: 7959.06, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 3, month: "2026-04", category: "Oficial especializado", baseHourly: 6689.32, nonRemHourly: 314.40, vht: 7003.72, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 4, month: "2026-05", category: "Oficial especializado", baseHourly: 6689.32, nonRemHourly: 501.70, vht: 7191.02, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 5, month: "2026-04", category: "Oficial general", baseHourly: 6219.91, nonRemHourly: 292.34, vht: 6512.25, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 6, month: "2026-05", category: "Oficial general", baseHourly: 6219.91, nonRemHourly: 466.49, vht: 6686.40, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 7, month: "2026-04", category: "Medio oficial", baseHourly: 5684.84, nonRemHourly: 267.19, vht: 5952.03, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 8, month: "2026-05", category: "Medio oficial", baseHourly: 5684.84, nonRemHourly: 426.36, vht: 6111.20, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 9, month: "2026-04", category: "Ayudante", baseHourly: 5467.28, nonRemHourly: 256.96, vht: 5724.24, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 10, month: "2026-05", category: "Ayudante", baseHourly: 5467.28, nonRemHourly: 410.05, vht: 5877.33, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 11, month: "2026-04", category: "Operario act. industrial", baseHourly: 5391.93, nonRemHourly: 253.42, vht: 5645.35, sourceFileName: "2026-04 a 05 Escala.pdf" },
  { id: 12, month: "2026-05", category: "Operario act. industrial", baseHourly: 5391.93, nonRemHourly: 404.39, vht: 5796.32, sourceFileName: "2026-04 a 05 Escala.pdf" },
];

const defaultBudget: BudgetData = {
  company: "BGA estudio de diseño y produccion industrial s.r.l",
  workType: "General",
  number: "P-4001",
  date: new Date().toISOString().slice(0, 10),
  client: "Cliente Demo",
  clientTaxId: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  clientNotes: "",
  cuit: "30-71527468-6",
  project: "Mobiliario integral",
  paymentTerms: "70% anticipo / 30% contraentrega",
  deliveryTerm: "60 dias",
  validity: "7 dias",
  notes: "Fabricacion e instalacion de mobiliario a medida.",
  scope: "Incluye materiales, fabricacion, armado e instalacion.",
  deliveryDestination: "Obra / domicilio del cliente",
  projectManager: "Responsable asignado",
  maxRequirementDate: "2026-04-30",
  billedPct: 100,
  isUpdate: false,
  updateLabel: "",
  logos: [],
  referenceImages: [],
};

const defaultBudgetDiscounts: BudgetDiscount[] = [];
const defaultBudgetIncreases: BudgetIncrease[] = [];

const defaultMaterials: Material[] = [
  { id: 1, description: "Melamina blanca", qty: 8, unit: "placas", unitPrice: 42500, stockCode: "MEL-001", stockGroup: "Melaminas", sortOrder: 1 },
  { id: 2, description: "Herrajes Hafele", qty: 1, unit: "set", unitPrice: 138000, stockCode: "HER-001", stockGroup: "Herrajes", sortOrder: 2 },
  { id: 3, description: "Laca poliuretanica", qty: 4, unit: "lt", unitPrice: 18500, stockCode: "PIN-001", stockGroup: "Pinturas", sortOrder: 3 },
];

const defaultBasicSupplies: Material[] = [
  { id: 101, description: "Insumos basicos", qty: 1, unit: "global", unitPrice: 0 },
  { id: 102, description: "Flete", qty: 1, unit: "servicio", unitPrice: 0 },
  { id: 103, description: "Entrega", qty: 1, unit: "servicio", unitPrice: 0 },
];

const defaultLabor: LaborRow[] = [
  { id: 1, category: "Oficial multiple", employees: 2, monthlyHoursPerEmployee: 198, hourlyRate: 7959.06, jobHours: 42 },
  { id: 2, category: "Ayudante", employees: 1, monthlyHoursPerEmployee: 198, hourlyRate: 5877.33, jobHours: 24 },
];

const defaultFixedCosts: FixedCost[] = [
  { id: 1, description: "Alquiler taller", amount: 420000 },
  { id: 2, description: "Servicios", amount: 135000 },
  { id: 3, description: "Administracion", amount: 180000 },
];

const DEFAULT_FIXED_MARKER_GROUPS: MarkerFixedGroup[] = [
  "Administrativos",
  "Comerciales",
  "Financieros",
  "Edilicios",
  "Operativos",
];

const defaultFixedMarkers: FixedMarker[] = [
  {
    id: 1,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    group: "Administrativos",
    description: "Administracion general",
    amount: 180000,
    active: true,
    notes: "",
  },
  {
    id: 2,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    group: "Edilicios",
    description: "Alquiler taller",
    amount: 420000,
    active: true,
    notes: "",
  },
  {
    id: 3,
    company: "De raiz s.r.l",
    workType: "General",
    group: "Operativos",
    description: "Servicios de planta",
    amount: 135000,
    active: true,
    notes: "",
  },
];

const defaultSupplyMarkers: SupplyMarker[] = [
  {
    id: 1,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    subtype: "Insumos basicos",
    description: "Insumos basicos",
    qty: 1,
    unit: "global",
    unitPrice: 0,
    active: true,
    notes: "",
  },
  {
    id: 2,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    subtype: "Flete",
    description: "Flete",
    qty: 1,
    unit: "servicio",
    unitPrice: 0,
    active: true,
    notes: "",
  },
  {
    id: 3,
    company: "De raiz s.r.l",
    workType: "General",
    subtype: "Entrega",
    description: "Entrega",
    qty: 1,
    unit: "servicio",
    unitPrice: 0,
    active: true,
    notes: "",
  },
];

const defaultLaborMarkers: LaborMarker[] = [
  {
    id: 1,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    category: "Oficial multiple",
    employees: 1,
    monthlyHoursPerEmployee: 198,
    hourlyRate: 7959.06,
    hoursBase: 24,
    active: true,
    notes: "",
  },
  {
    id: 2,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    workType: "General",
    category: "Ayudante",
    employees: 1,
    monthlyHoursPerEmployee: 198,
    hourlyRate: 5877.33,
    hoursBase: 16,
    active: true,
    notes: "",
  },
];

const defaultPersonalProvisionMarkers: PersonalProvisionMarker[] = [
  {
    id: 1,
    company: COMPANY_OPTIONS[0].value,
    shared: true,
    kind: "EPP",
    description: "Ropa de trabajo",
    amountPerDelivery: 0,
    periodicityMonths: 6,
    active: true,
    notes: "",
  },
  {
    id: 2,
    company: COMPANY_OPTIONS[0].value,
    shared: true,
    kind: "EPP",
    description: "Zapatos de seguridad",
    amountPerDelivery: 0,
    periodicityMonths: 6,
    active: true,
    notes: "",
  },
  {
    id: 3,
    company: COMPANY_OPTIONS[0].value,
    shared: true,
    kind: "Insumos",
    description: "Mascarillas y guantes",
    amountPerDelivery: 0,
    periodicityMonths: 6,
    active: true,
    notes: "",
  },
];

const defaultStockItems: StockItem[] = [
  { id: 1, company: "General", kind: "general", shared: true, group: "Melaminas", location: "Deposito general", sortOrder: 1, code: "MEL-001", description: "Melamina blanca", unit: "placas", quantity: 3, unitPrice: 43000, periodicityMonths: 0, active: true },
  { id: 2, company: "General", kind: "general", shared: true, group: "Herrajes", location: "Sector herrajes", sortOrder: 2, code: "HER-001", description: "Herrajes Hafele", unit: "set", quantity: 2, unitPrice: 140000, periodicityMonths: 0, active: true },
  { id: 3, company: "General", kind: "general", shared: true, group: "Pinturas", location: "Deposito pinturas", sortOrder: 3, code: "PIN-001", description: "Laca poliuretanica", unit: "lt", quantity: 0, unitPrice: 18500, periodicityMonths: 0, active: true },
  { id: 4, company: "General", kind: "EPP", shared: true, group: "EPP", location: "Vestuario", sortOrder: 4, code: "EPP-001", description: "Ropa de trabajo", unit: "equipo", quantity: 10, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 5, company: "General", kind: "EPP", shared: true, group: "EPP", location: "Vestuario", sortOrder: 5, code: "EPP-002", description: "Zapatos de seguridad", unit: "par", quantity: 10, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 6, company: "General", kind: "Insumos", shared: true, group: "Insumos", location: "Deposito insumos", sortOrder: 6, code: "INS-001", description: "Guantes", unit: "pack", quantity: 20, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 7, company: "General", kind: "Insumos", shared: true, group: "Insumos", location: "Deposito insumos", sortOrder: 7, code: "INS-002", description: "Mascarillas", unit: "pack", quantity: 20, unitPrice: 0, periodicityMonths: 6, active: true },
];

const defaultCostAnalysisGroups: CostAnalysisGroup[] = DEFAULT_FIXED_MARKER_GROUPS.map(
  (name, index) => ({
    id: index + 1,
    name,
    company: "General",
    active: true,
    notes: "",
  })
);

const defaultCostAnalysisEntries: CostAnalysisEntry[] = [];
const defaultRemitoDrafts: RemitoDraft[] = [];

const defaultBaseConfig: EmployeeBaseConfig = {
  category: "Ayudante",
  seniorityYears: 0,
  hourlyNetManual: 0,
  hourlyGrossManual: 0,
  normalHoursDefault: 198,
  presentismoPct: 10,
  seniorityPctPerYear: 1,
  employerContributionPct: 22,
  employerInsurancePct: 1.6,
  unionPct: 3,
  insurancePct: 1.5,
  aguinaldoAnnualMonths: 1,
  eppSemiannualCost: 0,
  suppliesSemiannualCost: 0,
  requiredDocuments: [
    { id: 1, name: "DNI" },
    { id: 2, name: "Apto medico" },
    { id: 3, name: "ART" },
  ],
  provisionTemplates: [
    { id: 1, stockCode: "EPP-001", kind: "EPP", quantity: 1, validityMonths: 6 },
    { id: 2, stockCode: "EPP-002", kind: "EPP", quantity: 1, validityMonths: 6 },
    { id: 3, stockCode: "INS-001", kind: "Insumos", quantity: 1, validityMonths: 6 },
    { id: 4, stockCode: "INS-002", kind: "Insumos", quantity: 1, validityMonths: 6 },
  ],
};

const defaultEmployees: Employee[] = [
  {
    id: 1,
    company: "De raiz s.r.l",
    legajo: "5",
    name: "MAXIMILIANO EZEQUIEL PACIFICO",
    category: "Medio oficial",
    nominalHours: 198,
    seniorityYears: 3,
    hourlyNetManual: 0,
    hourlyGrossManual: 0,
    attendance: [],
    documents: [
      { id: 11, name: "DNI", dueDate: "", attachmentName: "" },
      { id: 12, name: "Apto medico", dueDate: "", attachmentName: "" },
    ],
    provisionItems: [],
    eppDueDate: "",
    eppAttachmentName: "",
    suppliesDueDate: "",
    suppliesAttachmentName: "",
    skills: "Armado e instalacion",
    notes: "",
    payrolls: [
      {
        month: "2026-04",
        normalHours: 180,
        holidayHours: 18,
        extra50Hours: 0,
        extra100Hours: 0,
        night50Hours: 0,
        nightHours: 0,
        unjustifiedAbsenceHours: 0,
        justifiedAbsenceHours: 0,
        vacationsDays: 0,
        anticipos: 0,
        cashBonus: 0,
        presentismoPctOverride: 10,
        employerExtraPct: 22,
        manualOverride: false,
        savedAt: "",
        notes: "",
      },
    ],
  },
];

const defaultFinancialItems: FinancialCalendarItem[] = [
  {
    id: 1,
    company: "BGA estudio de diseño y produccion industrial s.r.l",
    date: "2026-04-28",
    type: "facturacion",
    status: "pendiente",
    title: "Emitir factura anticipo",
    jobCode: "P-4001",
    client: "Cliente Demo",
    amount: 180000,
    notes: "",
  },
  {
    id: 2,
    company: "De raiz s.r.l",
    date: "2026-04-30",
    type: "cobranza",
    status: "pendiente",
    title: "Seguimiento cobranza",
    jobCode: "P-3998",
    client: "Cliente Demo 2",
    amount: 240000,
    notes: "",
  },
];

const defaultPurchaseInvoices: PurchaseInvoice[] = [];

const defaultPettyCashFunds: PettyCashFund[] = [
  {
    id: 1,
    company: COMPANY_OPTIONS[0].value,
    description: "Caja operativa principal",
    responsible: "Encargado taller",
    assignedAmount: 250000,
    deliveredDate: todayIso(),
    rechargeDate: "",
    notes: "Fondo operativo inicial",
    active: true,
    closed: false,
    closedDate: "",
  },
];

const defaultPettyCashExpenses: PettyCashExpense[] = [];

const defaultDebtPlans: DebtPlan[] = [
  {
    id: 1,
    company: COMPANY_OPTIONS[0].value,
    concept: "Plan IVA",
    dueDay: 10,
    nextInstallmentAmount: 1307496.56,
    remainingInstallments: 9,
    nextDueDate: "2026-05-10",
    notes: "Base tomada de planillas auxiliares",
    active: true,
  },
  {
    id: 2,
    company: COMPANY_OPTIONS[1].value,
    concept: "Aguinaldo",
    dueDay: 17,
    nextInstallmentAmount: 207064.64,
    remainingInstallments: 5,
    nextDueDate: "2026-05-17",
    notes: "Base tomada de resumen de desendeudamiento",
    active: true,
  },
];

const defaultBankStatementEntries: BankStatementEntry[] = [];

const defaultCompanyAssets: CompanyAsset[] = [
  {
    id: 1,
    company: COMPANY_OPTIONS[0].value,
    category: "Maquina pesada",
    description: "Seccionadora escuadradora",
    value: 0,
    usefulLifeMonths: 60,
    active: true,
    notes: "",
  },
  {
    id: 2,
    company: COMPANY_OPTIONS[1].value,
    category: "Vehiculo",
    description: "Utilitario",
    value: 0,
    usefulLifeMonths: 60,
    active: true,
    notes: "",
  },
];

const defaultAppUsers: AppUser[] = [];

const LEGACY_APPROVED_IMPORT_ROWS: LegacyApprovedImportRow[] = [
  { budgetNumber: "3162", client: "CONTRACT RENT SA", project: "REVESTIMIENTO OFICINA", approvalDate: "2026-08-20", deliveryTerm: "90 DIAS", paymentTerms: "TRANSFERENCIA", commissionAmount: 0, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 81764066.38, businessName: "CONTRACT RENT SA", taxId: "30-69115033-6", invoiceNumber: "A 347/356/359", invoices: [{ invoiceDate: "2026-01-12", subtotal: 12264609.94, vat: 2575568.0874, total: 14840178.0274 }, { invoiceDate: "2026-02-02", subtotal: 8176406.63, vat: 1717045.3923, total: 9893452.0223 }, { invoiceDate: "2026-08-20", subtotal: 57234846.4, vat: 12019317.744, total: 69254164.144 }, { invoiceDate: "2026-01-12", subtotal: 1155108.4, vat: 242572.764, total: 1397681.164 }, { invoiceDate: "2026-02-02", subtotal: 886688.45, vat: 186204.5745, total: 1072893.0245 }], payments: [], retentions: [], additionals: [{ description: "AJUSTE CAC", amount: 2041796.85, date: "2026-01-12" }] },
  { budgetNumber: "3199", client: "RICARDO GRANILLO", project: "DESPENSA Y BODEGA", approvalDate: "2026-11-12", deliveryTerm: "60 DIAS", paymentTerms: "100% FACTURADO", commissionAmount: 190563.5658, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 6352118.86, businessName: "SPARKMEDIA SA", taxId: "30-71423569-5", invoiceNumber: "A 353/355/364", invoices: [{ invoiceDate: "2026-12-17", subtotal: 2117372.95, vat: 444648.3195, total: 2562021.2695 }, { invoiceDate: "2026-01-08", subtotal: 2117372.95, vat: 444648.3195, total: 2562021.2695 }, { invoiceDate: "2026-04-09", subtotal: 2117372.95, vat: 444648.3195, total: 2562021.2695 }], payments: [{ paymentDate: "", amount: 2562021.2695 }], retentions: [], additionals: [{ description: "CERRADURA", amount: 198442, date: "" }] },
  { budgetNumber: "3169", client: "CANDE ARQ (MITRE C )", project: "DESPENSA Y BODEGA", approvalDate: "2026-12-26", deliveryTerm: "60 DIAS", paymentTerms: "100% FACTURADO", commissionAmount: 644000, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 6441893.7, businessName: "MITRE CONSTRUCCIONES SA", taxId: "30-71034691-3", invoiceNumber: "A 352/365", invoices: [{ invoiceDate: "2026-11-18", subtotal: 4509325.59, vat: 946958.3739, total: 5456283.9639 }, { invoiceDate: "2026-04-09", subtotal: 1932568.11, vat: 405839.3031, total: 2338407.4131 }, { invoiceDate: "", subtotal: 107500, vat: 22575, total: 130075 }], payments: [{ paymentDate: "2026-11-20", amount: 5456283.9639 }], retentions: [], additionals: [{ description: "ADICIONALES", amount: 107500, date: "2026-04-09" }] },
  { budgetNumber: "3250", client: "JNP", project: "PINTURA OFICINA + REPARACIONES", approvalDate: "2026-02-09", deliveryTerm: "", paymentTerms: "50% FACTURADO ", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 1928400, businessName: "JNP RE CORREDOR DE REASEGUROS SA", taxId: "30-71116333-2", invoiceNumber: "A 362", invoices: [{ invoiceDate: "2026-03-18", subtotal: 964200, vat: 202482, total: 1166682 }], payments: [{ paymentDate: "2026-03-20", amount: 1166682 }, { paymentDate: "2026-04-13", amount: 970000 }], retentions: [], additionals: [] },
  { budgetNumber: "3259", client: "CONTRACT RENT SA", project: "ETAPA2", approvalDate: "", deliveryTerm: "90 DIAS", paymentTerms: "100% FACTURADO", commissionAmount: 0, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 120103069.95, businessName: "CONTRACT RENT SA", taxId: "30-69115033-6", invoiceNumber: "", invoices: [], payments: [], retentions: [], additionals: [{ description: "ADICIONALES ETAPA 2", amount: 23805161.22, date: "" }] },
  { budgetNumber: "3200", client: "GUILLERMO OZORES", project: "REFORMA LA SERENE", approvalDate: "2026-01-12", deliveryTerm: "60 DIAS", paymentTerms: "30% FACTURADO RESTO EN NEGRO", commissionAmount: 1070858.8557, observations: "FALTARIA CALCULAR LOS ADICIONALES ", notes: "", executionStatus: "en_curso", soldNetPrice: 35695295.19, businessName: "UTECH", taxId: "30-71640674-8", invoiceNumber: "A 110", invoices: [{ invoiceDate: "2026-01-12", subtotal: 10250978.17, vat: 2152705.4157, total: 12403683.5857 }], payments: [{ paymentDate: "2026-01-13", amount: 1052453.5 }, { paymentDate: "2026-01-13", amount: 11351230.09 }, { paymentDate: "2026-01-13", amount: 11939500 }], retentions: [], additionals: [] },
  { budgetNumber: "3206", client: "CANDE ARQ (CRISTINA)", project: "DESARME Y ARMADO DE MUEBLES DEPTO 3", approvalDate: "2026-01-13", deliveryTerm: "", paymentTerms: "EFECTIVO 50% FACTURA", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 1363242.41, businessName: "CANDE ARQ (CRISTINA)", taxId: "", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 681621.205, vat: 143140.45305, total: 824761.65805 }], payments: [{ paymentDate: "2026-01-13", amount: 1450000 }], retentions: [], additionals: [] },
  { budgetNumber: "3217", client: "CANDE ARQ (CRISTINA)", project: "RELAQUEADO DE PUERTAS", approvalDate: "2026-01-24", deliveryTerm: "45 DIAS", paymentTerms: "EFECTIVO 50% FACTURA", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 3637318.83, businessName: "CANDE ARQ (CRISTINA)", taxId: "", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 1818659.415, vat: 381918.47715, total: 2200577.89215 }], payments: [{ paymentDate: "2026-01-24", amount: 2376000 }], retentions: [], additionals: [] },
  { budgetNumber: "3241", client: "ALONSO FRANCHINI", project: "PROYECTO CAPDEVILLA", approvalDate: "2026-02-03", deliveryTerm: "45 DIAS", paymentTerms: "50% FACTURADO ", commissionAmount: 57.97, observations: "COMISION PAGA", notes: "", executionStatus: "finalizado", soldNetPrice: 13747502.29, businessName: "BENSIMON  MARIA CANDEL", taxId: "27-34866284-3", invoiceNumber: "B 7", invoices: [{ invoiceDate: "2026-04-01", subtotal: 6873751.145, vat: 1443487.74045, total: 8317238.88545 }], payments: [{ paymentDate: "2026-02-03", amount: 10259500 }, { paymentDate: "2026-03-30", amount: 4932000 }], retentions: [], additionals: [] },
  { budgetNumber: "3262", client: "SOFIA SCHNYDER (FLORENCIA)", project: "MOBILIARIO COCINA", approvalDate: "", deliveryTerm: "60 DIAS", paymentTerms: "70% FACTURADO", commissionAmount: 0, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 9869055.04, businessName: "CONTRACT RENT SA", taxId: "30-69115033-6", invoiceNumber: "A 114", invoices: [{ invoiceDate: "2026-02-19", subtotal: 6908338.528, vat: 1450751.09088, total: 8359089.61888 }], payments: [{ paymentDate: "2026-02-27", amount: 8290006.23 }], retentions: [{ retentionType: "RET. SUSS", amount: 69083.39 }], additionals: [] },
  { budgetNumber: "3265", client: "ERI JOSEVICH", project: "VANITORY", approvalDate: "2026-02-05", deliveryTerm: "30 DIAS", paymentTerms: "100% FACTURADO", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 1290090.13, businessName: "OSP SA", taxId: "30-54321793-6", invoiceNumber: "A 112/119", invoices: [{ invoiceDate: "2026-02-05", subtotal: 903063, vat: 189643.23, total: 1092706.23 }, { invoiceDate: "2026-04-09", subtotal: 387027.039, vat: 81275.67819, total: 468302.71719 }], payments: [{ paymentDate: "2026-02-05", amount: 1070094.34 }, { paymentDate: "2026-04-13", amount: 468302.72 }], retentions: [{ retentionType: "RET. GG", amount: 13581.26 }, { retentionType: "RET. SUSS", amount: 9030.63 }], additionals: [] },
  { budgetNumber: "3283", client: "FEDE ARROYO", project: "PUERTAS ESCALERA", approvalDate: "2026-02-12", deliveryTerm: "30 DIAS", paymentTerms: "50% FACTURADO ", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 1151076, businessName: "MARTINA IRIBARREN", taxId: "27-34343944-5", invoiceNumber: "B - 06", invoices: [{ invoiceDate: "2026-02-18", subtotal: 575538, vat: 120862.98, total: 696400.98 }], payments: [{ paymentDate: "2026-02-12", amount: 696400 }, { paymentDate: "2026-02-12", amount: 193956.3 }, { paymentDate: "", amount: 381582.69 }], retentions: [], additionals: [] },
  { budgetNumber: "3298", client: "CANDE ARQ (CRISTINA)", project: "PUERTAS CORREDIZAS + LATERAL ESCALERA + NICHO LAQUEADO", approvalDate: "", deliveryTerm: "30 DIAS", paymentTerms: "EFECTIVO 50% FACTURA", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 4174816.47, businessName: "CANDE ARQ (CRISTINA)", taxId: "", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 2087408.235, vat: 438355.72935, total: 2525763.96435 }], payments: [{ paymentDate: "", amount: 3348000 }], retentions: [], additionals: [] },
  { budgetNumber: "3303", client: "VALENTINA CUAN (EMILIANO)", project: "REVESTIMIENTOS DE DORMITORIO", approvalDate: "2026-02-24", deliveryTerm: "45 DIAS", paymentTerms: "30% FACTURADO ", commissionAmount: 604360, observations: "EL PAGO DEL 13/3 $743.180 SON ECHEQS LOS $850.000 SON EN EFEECTIVO", notes: "", executionStatus: "en_curso", soldNetPrice: 12087356.97, businessName: "ETEX SA", taxId: "30-71287770-3", invoiceNumber: "A 117", invoices: [{ invoiceDate: "2026-02-25", subtotal: 3626207.091, vat: 761503.48911, total: 4387710.58011 }], payments: [{ paymentDate: "2026-02-25", amount: 6000000 }, { paymentDate: "2026-03-09", amount: 2000000 }, { paymentDate: "2026-03-13", amount: 1593180 }], retentions: [], additionals: [] },
  { budgetNumber: "3239", client: "CANDE ARQ (CRISTINA)", project: "ARMADO DE MESA + AJUSTES", approvalDate: "", deliveryTerm: "", paymentTerms: "EFECTIVO 50% FACTURA", commissionAmount: 0, observations: "", notes: "", executionStatus: "finalizado", soldNetPrice: 561856.2, businessName: "CANDE ARQ (CRISTINA)", taxId: "", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 280928.1, vat: 58994.901, total: 339923.001 }], payments: [], retentions: [], additionals: [] },
  { budgetNumber: "3043", client: "FACUNDO RIOS", project: "VARIOS REFORMA YEBAL", approvalDate: "2026-03-27", deliveryTerm: "360 DIAS", paymentTerms: "50% FACTURADO ", commissionAmount: 0, observations: "FALTARIA ACTUALIZAR EL VALOR ", notes: "", executionStatus: "en_curso", soldNetPrice: 30046830, businessName: "RAS DESARROLLADORA", taxId: "30-71700076-1", invoiceNumber: "A 75", invoices: [{ invoiceDate: "2026-08-01", subtotal: 13719730.23, vat: 2881143.3483, total: 16600873.5783 }], payments: [{ paymentDate: "2026-03-27", amount: 16600873.58 }, { paymentDate: "2026-05-12", amount: 8300436.79 }], retentions: [], additionals: [] },
  { budgetNumber: "3305", client: "ERI JOSEVICH(GUIDO Y STEFI)", project: "VESTIDOR STEFI", approvalDate: "2026-02-26", deliveryTerm: "60 DIAS", paymentTerms: "50% FACTURADO ", commissionAmount: 1637790, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 16377931.9, businessName: "TECNE OBRAS SA", taxId: "30-71574043-1", invoiceNumber: "A118", invoices: [{ invoiceDate: "2026-04-01", subtotal: 8188965.95, vat: 1719682.8495, total: 9908648.7995 }], payments: [{ paymentDate: "2026-02-27", amount: 11000000 }, { paymentDate: "2026-04-01", amount: 2000000 }], retentions: [], additionals: [] },
  { budgetNumber: "3261", client: "JAVIER MADARIAGA", project: "VARIOS KIRI ENCHAPADO", approvalDate: "2026-03-23", deliveryTerm: "90 DIAS", paymentTerms: "100% NEGRO", commissionAmount: 0, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 59286815, businessName: "JAVIER MADARIAGA", taxId: "", invoiceNumber: "", invoices: [], payments: [{ paymentDate: "2026-03-27", amount: 41500000 }], retentions: [], additionals: [] },
  { budgetNumber: "3366", client: "CANDE ARQ (CRISTINA)", project: "LIJADA + LUSTRE DE MUEBLE + PUERTAS NUEVAS ´ ZOCALOS", approvalDate: "", deliveryTerm: "", paymentTerms: "FALTA LOS ZOCALOS ", commissionAmount: 0, observations: "", notes: "", executionStatus: "en_curso", soldNetPrice: 732800, businessName: "CANDE ARQ (CRISTINA)", taxId: "", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 366400, vat: 76944, total: 443344 }], payments: [], retentions: [], additionals: [] },
  { budgetNumber: "3365", client: "GUILLERMO OZORES", project: "ETAPA 2", approvalDate: "2026-04-14", deliveryTerm: "45", paymentTerms: "25% FACTURADO RESTO NEGRO ", commissionAmount: 0, observations: "ENTREGARON 10.000 USD (1380)", notes: "", executionStatus: "en_curso", soldNetPrice: 41098257.68, businessName: "UTECH", taxId: "30-71640674-8", invoiceNumber: "", invoices: [{ invoiceDate: "", subtotal: 10274564.42, vat: 2157658.5282, total: 12432222.9482 }], payments: [{ paymentDate: "2026-04-14", amount: 138000 }, { paymentDate: "", amount: 17126438.9042 }], retentions: [], additionals: [] },
];

const cloneBudget = (budget: BudgetData): BudgetData => ({
  ...budget,
  logos: budget.logos.map((image) => ({ ...image })),
  referenceImages: budget.referenceImages.map((image) => ({ ...image })),
});

const buildBudgetSummaryLabel = (input: {
  number: string;
  client?: string;
  project?: string;
}) => {
  const parts = [input.number, input.client || "", input.project || ""]
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Presupuesto";
};

const buildBlankBudgetDraft = (input: {
  company: CompanyName;
  workType: WorkTypeName;
  number: string;
  scope?: string;
  projectManager?: string;
  logos?: BudgetImage[];
}): BudgetData => ({
  ...cloneBudget(defaultBudget),
  company: input.company,
  workType: input.workType,
  number: input.number,
  date: todayIso(),
  client: "",
  clientTaxId: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  clientNotes: "",
  cuit: getCompanyTaxId(input.company),
  project: "",
  notes: "",
  scope: input.scope ?? defaultBudget.scope,
  deliveryDestination: "",
  projectManager: input.projectManager ?? defaultBudget.projectManager,
  maxRequirementDate: "",
  billedPct: 100,
  isUpdate: false,
  updateLabel: "",
  logos: (input.logos || []).map((image) => ({ ...image })),
  referenceImages: [],
});

const cloneBudgetDiscounts = (items: BudgetDiscount[]) =>
  items.map((item) => ({ ...item }));

const normalizePdfText = (text: string) =>
  text
    .replace(/\0/g, " ")
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const monthMap: Record<string, string> = {
  ENERO: "01",
  FEBRERO: "02",
  MARZO: "03",
  ABRIL: "04",
  MAYO: "05",
  JUNIO: "06",
  JULIO: "07",
  AGOSTO: "08",
  SEPTIEMBRE: "09",
  OCTUBRE: "10",
  NOVIEMBRE: "11",
  DICIEMBRE: "12",
};

const parseSpanishNumber = (text: string) => Number(text.replace(/\./g, "").replace(",", "."));

async function parseScalePdf(file: File): Promise<ScaleRow[]> {
  const buffer = await file.arrayBuffer();
  const text = normalizePdfText(new TextDecoder("latin1").decode(new Uint8Array(buffer)));

  const monthRegex =
    /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*(20\d{2})/g;
  const monthMatches: RegExpExecArray[] = [];
  let monthMatch: RegExpExecArray | null;

  while ((monthMatch = monthRegex.exec(text)) !== null) {
    monthMatches.push(monthMatch);
  }

  const monthKeys = monthMatches
    .slice(0, 2)
    .map((match) => `${match[2]}-${monthMap[match[1]]}`);

  if (monthKeys.length < 2) {
    throw new Error("No pude detectar dos meses de vigencia en el PDF.");
  }

  const categoryKeys = Object.keys(categoryAliases);
  const rows: ScaleRow[] = [];

  categoryKeys.forEach((pdfCategory, index) => {
    const start = text.indexOf(pdfCategory);
    if (start === -1) return;

    const nextStartCandidates = categoryKeys
      .slice(index + 1)
      .map((name) => text.indexOf(name))
      .filter((value) => value > start);
    const end = nextStartCandidates.length > 0 ? Math.min(...nextStartCandidates) : text.length;
    const block = text.slice(start, end);
    const numberRegex = /\d{1,5},\d{2}/g;
    const numbers: number[] = [];
    let numberMatch: RegExpExecArray | null;

    while ((numberMatch = numberRegex.exec(block)) !== null) {
      numbers.push(parseSpanishNumber(numberMatch[0]));
    }

    if (numbers.length < 3) return;
    const baseHourly = numbers[0];
    const vhtValues = numbers.filter((value) => value > baseHourly).slice(-2);
    if (vhtValues.length < 2) return;

    rows.push(
      {
        id: newId(),
        month: monthKeys[0],
        category: categoryAliases[pdfCategory],
        baseHourly,
        nonRemHourly: Number((vhtValues[0] - baseHourly).toFixed(2)),
        vht: vhtValues[0],
        sourceFileName: file.name,
      },
      {
        id: newId(),
        month: monthKeys[1],
        category: categoryAliases[pdfCategory],
        baseHourly,
        nonRemHourly: Number((vhtValues[1] - baseHourly).toFixed(2)),
        vht: vhtValues[1],
        sourceFileName: file.name,
      }
    );
  });

  if (rows.length === 0) {
    throw new Error("No pude leer categorias y valores del PDF. Puedes dejarlos manuales.");
  }

  return rows;
}

const getFinancialTypeLabel = (type: FinancialItemType) => {
  if (type === "facturacion") return "Facturacion";
  if (type === "cobranza") return "Cobranza";
  return "Pago";
};

const normalizeClientKey = (text: string) => text.trim().toLowerCase();

const normalizeBudgetNumberKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getSavedBudgetDisplayLabel = (item: {
  number: string;
  client?: string;
  project?: string;
  isUpdate?: boolean;
  revisionNumber?: number;
  snapshot?: BudgetSnapshot;
}) => {
  const baseLabel = buildBudgetSummaryLabel({
    number: item.number,
    client: item.client || item.snapshot?.budget.client || "",
    project: item.project || item.snapshot?.budget.project || "",
  });

  const updateCount = Math.max(0, (item.revisionNumber || 1) - 1);

  const updateSuffix = `Actualizaciones: ${updateCount}`;

  return item.isUpdate || item.snapshot?.budget.isUpdate || updateCount > 0
    ? `${baseLabel} - ${updateSuffix}`
    : baseLabel;
};

const getLatestBudgetRevisions = (items: SavedBudget[]) => {
  const grouped = new Map<number, SavedBudget>();

  items.forEach((item) => {
    const key = item.rootBudgetId || item.id;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, item);
      return;
    }

    const currentRevision = current.revisionNumber || 1;
    const nextRevision = item.revisionNumber || 1;
    if (
      nextRevision > currentRevision ||
      (nextRevision === currentRevision && item.date >= current.date)
    ) {
      grouped.set(key, item);
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return (b.revisionNumber || 1) - (a.revisionNumber || 1);
  });
};

const getApprovedJobSourceLabel = (job: Pick<ApprovedJob, "sourceType">) =>
  job.sourceType === "from_budget"
    ? "Desde presupuesto"
    : job.sourceType === "direct"
    ? "Directo"
    : "Importado";

const buildPlaceholderBudgetSnapshot = (input: {
  company: CompanyName;
  workType?: WorkTypeName;
  budgetNumber: string;
  client: string;
  project: string;
  approvalDate?: string;
  deliveryTerm?: string;
  paymentTerms?: string;
  soldNetPrice?: number;
  notes?: string;
  vatPct?: number;
}): BudgetSnapshot => {
  const netPrice = Number(input.soldNetPrice || 0);
  const placeholderVatPct = Number(input.vatPct ?? INVOICE_VAT_PCT);
  const finalPrice = Number((netPrice * (1 + placeholderVatPct / 100)).toFixed(2));
  return {
    budget: {
      ...cloneBudget(defaultBudget),
      company: input.company,
      workType: input.workType || "General",
      number: input.budgetNumber,
      date: input.approvalDate || todayIso(),
      client: input.client,
      cuit: getCompanyTaxId(input.company),
      project: input.project,
      paymentTerms: input.paymentTerms || defaultBudget.paymentTerms,
      deliveryTerm: input.deliveryTerm || defaultBudget.deliveryTerm,
      notes: input.notes || "",
      scope: "",
      deliveryDestination: "",
      projectManager: "",
      maxRequirementDate: "",
      isUpdate: false,
      updateLabel: "",
      logos: [],
      referenceImages: [],
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      clientNotes: "",
      validity: defaultBudget.validity,
    },
    subBudgets: [],
    materials: [],
    basicSupplies: [],
    labor: [],
    fixedCosts: [],
    increases: [],
    discounts: [],
    params: {
      deviationPct: 5,
      markupPct: 30,
      vatPct: placeholderVatPct,
      allocationMode: "auto",
      manualAllocationPct: 18.75,
      laborDeviationPct: 0,
      commissionPct: 0,
    },
    totals: {
      totalMaterials: 0,
      totalBasicSupplies: 0,
      totalLabor: 0,
      laborDeviationPct: 0,
      laborDeviationAmount: 0,
      fixedCostsApplied: 0,
      deviationAmount: 0,
      totalCost: 0,
      totalIncreaseAmount: 0,
      preDiscountNetPrice: netPrice,
      totalDiscountAmount: 0,
      netPrice,
      finalPrice,
      commissionAmount: 0,
      totalJobHours: 0,
      totalAvailableHours: 0,
      occupancyPct: 0,
    },
  };
};

const APP_PERSISTENCE_DB_NAME = "grupo-bga-app";
const APP_PERSISTENCE_STORE_NAME = "app-state";
const APP_PERSISTENCE_RECORD_KEY = "main";
const APP_PERSISTENCE_VERSION = 1;
const SUPABASE_APP_STATE_TABLE = "app_state_snapshots";
const SUPABASE_APP_STATE_MODULES_TABLE = "app_state_modules";
// Fase 4: la app lee/escribe la tabla particionada por (module_key, company).
// La vieja `app_state_modules` queda solo como fallback hasta el cutover.
const SUPABASE_APP_STATE_MODULES_V2_TABLE = "app_state_modules_v2";
const SUPABASE_APP_STATE_RECORD_KEY = "main";
const SUPABASE_CRM_CLIENTS_TABLE = "crm_clients";
const SUPABASE_BUDGETS_TABLE = "crm_budgets";
const SUPABASE_AUTH_REDIRECT_URL =
  process.env.REACT_APP_SUPABASE_AUTH_REDIRECT_URL || "";
const SUPABASE_ACTIVE_SESSIONS_TABLE = "app_active_sessions";
const SUPABASE_INTERNAL_CHAT_TABLE = "app_internal_chat_messages";
const SUPABASE_COLLAB_CHANNEL = "grupo-bga-collaboration";
const LOCAL_AUTOSAVE_DELAY_MS = 1200;
// Cuantos pasos de "Atras" (deshacer) se guardan en memoria. Cada paso es un snapshot
// JSON completo del estado; con las imagenes ya en Storage (solo URLs) esto es liviano.
const UNDO_HISTORY_LIMIT = 25;
const SUPABASE_AUTOSAVE_MIN_INTERVAL_MS = 6000;
const SUPABASE_SAVE_TIMEOUT_MS = 15000;
const SUPABASE_SAVE_RETRY_DELAYS_MS = [800, 1800] as const;
const SUPABASE_MODULE_WRITE_BATCH_SIZE = 12;
// Firma de la ultima fila (module_key, company) escrita con exito por usuario, para no
// reescribir empresas cuyo contenido no cambio. Clave: `${userId}|${module}|${company}`.
const supabaseModuleCompanySignatures = new Map<string, string>();
const COLLABORATION_POLL_INTERVAL_MS = 30000;

const MONTHLY_HISTORY_TAB_KEYS = [
  "cashflow",
  "facturacion",
  "aprobados",
  "fabricacion",
  "compras",
  "cajaChica",
  "historial",
] as const satisfies readonly TabKey[];

type MonthlyManagedTabKey = (typeof MONTHLY_HISTORY_TAB_KEYS)[number];

type MonthlyHistorySnapshot = {
  id: number;
  tabKey: MonthlyManagedTabKey;
  tabLabel: string;
  month: string;
  monthLabel: string;
  companyScope: CompanyScope;
  savedAt: string;
  savedBy?: string;
  data: Record<string, unknown>;
};

const MONTHLY_HISTORY_TAB_SET = new Set<TabKey>([...MONTHLY_HISTORY_TAB_KEYS]);

const isMonthlyHistoryTab = (tab: TabKey): tab is MonthlyManagedTabKey =>
  MONTHLY_HISTORY_TAB_SET.has(tab);

// Modo de reporte imprimible que corresponde a cada solapa (reutilizado por el boton
// "Reporte del mes" del header y por el aviso que aparece despues de guardar).
const getReportModeForTab = (tab: TabKey): PrintMode =>
  tab === "cashflow"
    ? "report-cashflow"
    : tab === "compras"
    ? "report-compras"
    : tab === "cajaChica"
    ? "report-caja-chica"
    : tab === "presupuesto"
    ? "client-budget"
    : tab === "marcadores"
    ? "report-marcadores"
    : tab === "historial"
    ? "report-crm"
    : tab === "aprobados"
    ? "report-aprobados"
    : tab === "stock"
    ? "report-stock"
    : tab === "facturacion"
    ? "report-facturacion"
    : "report-personal";

type PersistedAppStateData = {
  companyCatalog: CompanyOption[];
  operationalMonth: string;
  monthlyHistorySnapshots: MonthlyHistorySnapshot[];
  budget: BudgetData;
  subBudgets: BudgetSection[];
  subBudgetTitle: string;
  subBudgetNotes: string;
  materials: Material[];
  basicSupplies: Material[];
  labor: LaborRow[];
  fixedCosts: FixedCost[];
  budgetIncreases: BudgetIncrease[];
  budgetDiscounts: BudgetDiscount[];
  fixedMarkers: FixedMarker[];
  supplyMarkers: SupplyMarker[];
  laborMarkers: LaborMarker[];
  personalProvisionMarkers: PersonalProvisionMarker[];
  savedBudgets: SavedBudget[];
  approvedJobs: ApprovedJob[];
  financialItems: FinancialCalendarItem[];
  purchaseInvoices: PurchaseInvoice[];
  pettyCashFunds: PettyCashFund[];
  pettyCashExpenses: PettyCashExpense[];
  debtPlans: DebtPlan[];
  bankStatementEntries: BankStatementEntry[];
  stockItems: StockItem[];
  costAnalysisGroups: CostAnalysisGroup[];
  costAnalysisEntries: CostAnalysisEntry[];
  remitoDrafts: RemitoDraft[];
  companyAssets: CompanyAsset[];
  employees: Employee[];
  employeeBaseConfig: EmployeeBaseConfig;
  scaleRows: ScaleRow[];
  allocationMode: "auto" | "manual";
  manualAllocationPct: number;
  deviationPct: number;
  markupPct: number;
  vatPct: number;
  laborDeviationPct: number;
  commissionPct: number;
  stockIncreasePct: number;
  editingBudgetId: number | null;
};

type PersistedAppState = {
  version: number;
  savedAt: string;
  data: PersistedAppStateData;
};

type PersistedAppStateField = keyof PersistedAppStateData;

const APP_STATE_MODULE_DEFINITIONS = [
  {
    key: "configuracion",
    label: "configuracion general",
    fields: ["companyCatalog", "allocationMode", "manualAllocationPct"] as const,
  },
  {
    key: "mensuales",
    label: "Periodos mensuales",
    fields: ["operationalMonth", "monthlyHistorySnapshots"] as const,
  },
  {
    key: "presupuestos",
    label: "Presupuestos",
    fields: [
      "budget",
      "subBudgets",
      "subBudgetTitle",
      "subBudgetNotes",
      "materials",
      "basicSupplies",
      "labor",
      "fixedCosts",
      "budgetIncreases",
      "budgetDiscounts",
      "deviationPct",
      "markupPct",
      "vatPct",
      "laborDeviationPct",
      "commissionPct",
      "stockIncreasePct",
      "editingBudgetId",
    ] as const,
  },
  {
    key: "historial-crm",
    label: "Historial de presupuestos",
    fields: ["savedBudgets"] as const,
  },
  {
    key: "trabajos-aprobados",
    label: "Trabajos aprobados",
    fields: ["approvedJobs"] as const,
  },
  {
    key: "cash-flow",
    label: "Cash flow y resultados",
    fields: ["financialItems", "debtPlans", "bankStatementEntries"] as const,
  },
  {
    key: "compras",
    label: "Compras",
    fields: ["purchaseInvoices", "remitoDrafts"] as const,
  },
  {
    key: "caja-chica",
    label: "Caja chica",
    fields: ["pettyCashFunds", "pettyCashExpenses"] as const,
  },
  {
    key: "stock-costos",
    label: "Stock, agenda y analisis de costos",
    fields: ["stockItems", "costAnalysisGroups", "costAnalysisEntries"] as const,
  },
  {
    key: "personal",
    label: "Personal",
    fields: ["employees", "employeeBaseConfig", "scaleRows"] as const,
  },
  {
    key: "marcadores",
    label: "Marcadores",
    fields: [
      "fixedMarkers",
      "supplyMarkers",
      "laborMarkers",
      "personalProvisionMarkers",
    ] as const,
  },
  {
    key: "archivos",
    label: "Archivos, logos y datos de empresas",
    fields: ["companyAssets"] as const,
  },
] as const satisfies readonly {
  key: string;
  label: string;
  fields: readonly PersistedAppStateField[];
}[];

type AppStateModuleKey = (typeof APP_STATE_MODULE_DEFINITIONS)[number]["key"];

const ALL_APP_STATE_MODULE_KEYS: AppStateModuleKey[] =
  APP_STATE_MODULE_DEFINITIONS.map((item) => item.key);

const TAB_PERSISTENCE_MODULE_KEYS: Partial<Record<TabKey, AppStateModuleKey[]>> = {
  cashflow: ["mensuales", "cash-flow"],
  facturacion: ["mensuales", "cash-flow", "trabajos-aprobados", "caja-chica", "compras"],
  aprobados: ["mensuales", "trabajos-aprobados"],
  fabricacion: ["mensuales", "trabajos-aprobados", "compras", "stock-costos"],
  compras: ["mensuales", "compras", "caja-chica"],
  cajaChica: ["mensuales", "caja-chica", "compras", "cash-flow"],
  presupuesto: ["presupuestos", "historial-crm", "trabajos-aprobados"],
  historial: ["mensuales", "historial-crm", "presupuestos"],
  stock: ["stock-costos", "marcadores", "trabajos-aprobados"],
  personal: ["personal"],
  marcadores: ["marcadores", "stock-costos", "personal"],
};

const getPersistenceModuleKeysForTab = (tab: TabKey): AppStateModuleKey[] =>
  TAB_PERSISTENCE_MODULE_KEYS[tab] || ALL_APP_STATE_MODULE_KEYS;

type PersistedAppStateModulePayload = {
  version: number;
  savedAt: string;
  moduleKey: AppStateModuleKey;
  moduleLabel: string;
  data: Partial<PersistedAppStateData>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const normalizeSupabaseInternalChatMessage = (
  value: unknown
): SupabaseInternalChatMessage | null => {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  if (!Number.isFinite(id)) return null;

  return {
    id,
    user_id: normalizeStringValue(value.user_id),
    email: normalizeStringValue(value.email),
    full_name: normalizeStringValue(value.full_name, "Usuario"),
    message: normalizeStringValue(value.message),
    recipient_user_id:
      typeof value.recipient_user_id === "string" ? value.recipient_user_id : null,
    recipient_email:
      typeof value.recipient_email === "string" ? value.recipient_email : null,
    recipient_full_name:
      typeof value.recipient_full_name === "string"
        ? value.recipient_full_name
        : null,
    read_by: Array.isArray(value.read_by)
      ? value.read_by.filter((item): item is string => typeof item === "string")
      : [],
    created_at: normalizeStringValue(value.created_at, new Date().toISOString()),
  };
};

const openPersistenceDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Este navegador no soporta guardado local avanzado."));
      return;
    }
    const request = window.indexedDB.open(APP_PERSISTENCE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(APP_PERSISTENCE_STORE_NAME)) {
        db.createObjectStore(APP_PERSISTENCE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("No pude abrir la base local del navegador."));
  });

const readPersistedAppState = async (): Promise<PersistedAppState | null> => {
  const db = await openPersistenceDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(APP_PERSISTENCE_STORE_NAME, "readonly");
    const store = transaction.objectStore(APP_PERSISTENCE_STORE_NAME);
    const request = store.get(APP_PERSISTENCE_RECORD_KEY);

    request.onsuccess = () => {
      resolve(normalizePersistedAppState(request.result));
      db.close();
    };
    request.onerror = () => {
      reject(request.error || new Error("No pude leer el guardado local."));
      db.close();
    };
  });
};

const writePersistedAppState = async (payload: PersistedAppState) => {
  const db = await openPersistenceDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(APP_PERSISTENCE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(APP_PERSISTENCE_STORE_NAME);
    const request = store.put(payload, APP_PERSISTENCE_RECORD_KEY);

    request.onsuccess = () => {
      resolve();
      db.close();
    };
    request.onerror = () => {
      reject(request.error || new Error("No pude guardar los datos en el navegador."));
      db.close();
    };
  });
};

const clearPersistedAppState = async () => {
  const db = await openPersistenceDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(APP_PERSISTENCE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(APP_PERSISTENCE_STORE_NAME);
    const request = store.delete(APP_PERSISTENCE_RECORD_KEY);

    request.onsuccess = () => {
      resolve();
      db.close();
    };
    request.onerror = () => {
      reject(request.error || new Error("No pude borrar el guardado local."));
      db.close();
    };
  });
};

const readSupabasePersistedAppState = async (): Promise<PersistedAppState | null> => {
  const record = await readSupabasePersistedAppStateRecord();
  if (!record?.payload) return null;

  return normalizePersistedAppState({
    ...(record.payload as Record<string, unknown>),
    savedAt:
      typeof record.saved_at === "string" ? record.saved_at : new Date().toISOString(),
  });
};

const getSupabaseErrorMessage = (error: unknown) => {
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return error instanceof Error ? error.message : "Error desconocido de Supabase.";
};

const isSupabaseMissingTableError = (error: unknown, tableName: string) => {
  if (!isRecord(error) && !(error instanceof Error)) return false;
  const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
  const message = getSupabaseErrorMessage(error).toLowerCase();
  return (
    code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes(`relation "${tableName.toLowerCase()}"`)
  );
};

class SupabasePersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabasePersistError";
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${context} tardo mas de ${Math.round(timeoutMs / 1000)} segundos.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const writeSupabaseWithRetry = async <T,>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  let lastError: unknown = null;
  const maxAttempts = SUPABASE_SAVE_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await withTimeout(operation(), SUPABASE_SAVE_TIMEOUT_MS, context);
    } catch (error) {
      lastError = error;
      const retryDelay = SUPABASE_SAVE_RETRY_DELAYS_MS[attempt];
      if (retryDelay === undefined) break;
      await delay(retryDelay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${context}: ${getSupabaseErrorMessage(lastError)}`);
};

const getAppStateModuleDefinition = (moduleKey: string) =>
  APP_STATE_MODULE_DEFINITIONS.find((item) => item.key === moduleKey);

const getAppStateModuleLabel = (moduleKey: string) =>
  getAppStateModuleDefinition(moduleKey)?.label || "el sistema";

const formatPersistenceModuleList = (moduleKeys?: readonly string[]) => {
  const labels = Array.from(
    new Set(
      (moduleKeys || [])
        .map((moduleKey) => getAppStateModuleLabel(moduleKey))
        .filter(Boolean)
    )
  );

  if (labels.length === 0) return "el sistema";
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
};

const pickPersistedModuleData = (
  data: PersistedAppStateData,
  fields: readonly PersistedAppStateField[]
) => {
  const picked = {} as Partial<PersistedAppStateData>;
  fields.forEach((field) => {
    (picked as Record<string, unknown>)[field] = data[field];
  });
  return picked;
};

const cloneMonthlySnapshotValue = (value: unknown): unknown => {
  if (value === undefined) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const pickMonthlySnapshotDataForTab = (
  tab: MonthlyManagedTabKey,
  data: PersistedAppStateData
): Record<string, unknown> => {
  const fields = new Set<PersistedAppStateField>();

  getPersistenceModuleKeysForTab(tab).forEach((moduleKey) => {
    if (moduleKey === "mensuales") return;
    getAppStateModuleDefinition(moduleKey)?.fields.forEach((field) => fields.add(field));
  });

  const snapshotData: Record<string, unknown> = {};
  fields.forEach((field) => {
    snapshotData[field] = cloneMonthlySnapshotValue(data[field]);
  });
  return snapshotData;
};

const buildPersistedModuleSignatures = (data: PersistedAppStateData) =>
  APP_STATE_MODULE_DEFINITIONS.reduce<Record<string, string>>((acc, moduleDefinition) => {
    acc[moduleDefinition.key] = JSON.stringify(
      pickPersistedModuleData(data, moduleDefinition.fields)
    );
    return acc;
  }, {});

const getChangedPersistedModuleKeys = (
  data: PersistedAppStateData,
  previousSignatures: Record<string, string>
) => {
  const nextSignatures = buildPersistedModuleSignatures(data);
  const changedModuleKeys = APP_STATE_MODULE_DEFINITIONS.filter(
    (moduleDefinition) =>
      nextSignatures[moduleDefinition.key] !== previousSignatures[moduleDefinition.key]
  ).map((moduleDefinition) => moduleDefinition.key);

  return {
    changedModuleKeys,
    nextSignatures,
  };
};

const mergePersistedModuleSignatures = (
  previousSignatures: Record<string, string>,
  nextSignatures: Record<string, string>,
  moduleKeys?: readonly AppStateModuleKey[]
) => {
  if (!moduleKeys || moduleKeys.length === 0) return nextSignatures;

  return moduleKeys.reduce<Record<string, string>>(
    (acc, moduleKey) => {
      acc[moduleKey] = nextSignatures[moduleKey];
      return acc;
    },
    { ...previousSignatures }
  );
};

const buildPersistedAppStateModules = (
  payload: PersistedAppState,
  moduleKeys?: AppStateModuleKey[]
) => {
  const allowedModuleKeys = moduleKeys ? new Set(moduleKeys) : null;

  return APP_STATE_MODULE_DEFINITIONS.filter(
    (moduleDefinition) => !allowedModuleKeys || allowedModuleKeys.has(moduleDefinition.key)
  ).map((moduleDefinition): PersistedAppStateModulePayload => ({
    version: payload.version,
    savedAt: payload.savedAt,
    moduleKey: moduleDefinition.key,
    moduleLabel: moduleDefinition.label,
    data: pickPersistedModuleData(payload.data, moduleDefinition.fields),
  }));
};

const normalizePersistedAppStateModule = (
  value: unknown,
  fallbackModuleKey: string
): PersistedAppStateModulePayload | null => {
  if (!isRecord(value) || !isRecord(value.data)) return null;

  const typedModuleKey = getAppStateModuleDefinition(
    typeof value.moduleKey === "string" ? value.moduleKey : fallbackModuleKey
  )?.key;

  if (!typedModuleKey) return null;

  return {
    version:
      typeof value.version === "number" ? value.version : APP_PERSISTENCE_VERSION,
    savedAt:
      typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    moduleKey: typedModuleKey,
    moduleLabel:
      typeof value.moduleLabel === "string"
        ? value.moduleLabel
        : getAppStateModuleLabel(typedModuleKey),
    data: value.data as Partial<PersistedAppStateData>,
  };
};

const readSupabasePersistedLegacyAppStateRecord =
  async (): Promise<SupabaseSnapshotRecord | null> => {
    const { data, error } = await supabase
      .from(SUPABASE_APP_STATE_TABLE)
      .select("payload,saved_at,updated_by")
      .eq("id", SUPABASE_APP_STATE_RECORD_KEY)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.payload) return null;

    return {
      payload: data.payload,
      saved_at:
        typeof data.saved_at === "string" ? data.saved_at : new Date().toISOString(),
      updated_by: typeof data.updated_by === "string" ? data.updated_by : null,
    };
  };

const readSupabasePersistedModuleRecords = async (): Promise<
  {
    module_key: string;
    company: string;
    payload: unknown;
    saved_at: string;
    updated_by: string | null;
  }[]
> => {
  // Lee v2 (1 fila por module_key+company). RLS ya limita a las empresas del usuario.
  const { data, error } = await supabase
    .from(SUPABASE_APP_STATE_MODULES_V2_TABLE)
    .select("module_key,company,payload,saved_at,updated_by")
    .order("module_key", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((item) => ({
    module_key: String(item.module_key || ""),
    company: typeof item.company === "string" ? item.company : GENERAL_COMPANY,
    payload: item.payload,
    saved_at: typeof item.saved_at === "string" ? item.saved_at : new Date().toISOString(),
    updated_by: typeof item.updated_by === "string" ? item.updated_by : null,
  }));
};

const mergeSupabaseAppStateRecords = (
  legacyRecord: SupabaseSnapshotRecord | null,
  moduleRecords: Awaited<ReturnType<typeof readSupabasePersistedModuleRecords>>
): SupabaseSnapshotRecord | null => {
  const legacySnapshot = legacyRecord?.payload
    ? normalizePersistedAppState({
        ...(legacyRecord.payload as Record<string, unknown>),
        savedAt: legacyRecord.saved_at,
      })
    : null;

  const mergedData = legacySnapshot
    ? ({ ...legacySnapshot.data } as Partial<PersistedAppStateData>)
    : ({} as Partial<PersistedAppStateData>);
  let latestSavedAt = legacyRecord?.saved_at || legacySnapshot?.savedAt || "";
  let latestUpdatedBy = legacyRecord?.updated_by || null;
  let latestModuleTime = 0;
  const latestModuleKeys: string[] = [];

  // Agrupar filas por modulo: puede haber varias (una por empresa) para el mismo
  // module_key. Se mergean con mergeModuleDataByCompany hacia el estado plano.
  const recordsByModule = new Map<
    string,
    { company: string; data: Partial<PersistedAppStateData> }[]
  >();

  moduleRecords.forEach((record) => {
    const moduleDefinition = getAppStateModuleDefinition(record.module_key);
    if (!moduleDefinition) return;

    const modulePayload = normalizePersistedAppStateModule(
      record.payload,
      record.module_key
    );
    if (!modulePayload) return;

    const group = recordsByModule.get(moduleDefinition.key) || [];
    group.push({ company: record.company, data: modulePayload.data });
    recordsByModule.set(moduleDefinition.key, group);

    const recordTime = new Date(record.saved_at).getTime();
    if (Number.isFinite(recordTime)) {
      const currentLatestTime = latestSavedAt ? new Date(latestSavedAt).getTime() : 0;
      if (!Number.isFinite(currentLatestTime) || recordTime >= currentLatestTime) {
        latestSavedAt = record.saved_at;
        latestUpdatedBy = record.updated_by;
      }

      if (recordTime > latestModuleTime) {
        latestModuleTime = recordTime;
        latestModuleKeys.splice(0, latestModuleKeys.length, moduleDefinition.key);
      } else if (
        recordTime === latestModuleTime &&
        !latestModuleKeys.includes(moduleDefinition.key)
      ) {
        latestModuleKeys.push(moduleDefinition.key);
      }
    }
  });

  recordsByModule.forEach((rows, moduleKey) => {
    Object.assign(mergedData, mergeModuleDataByCompany(moduleKey, rows));
  });

  if (!legacySnapshot && Object.keys(mergedData).length === 0) return null;

  const payload: PersistedAppState = {
    version: APP_PERSISTENCE_VERSION,
    savedAt: latestSavedAt || new Date().toISOString(),
    data: mergedData as PersistedAppStateData,
  };

  return {
    payload,
    saved_at: payload.savedAt,
    updated_by: latestUpdatedBy,
    module_keys: latestModuleKeys,
  };
};

const readSupabasePersistedAppStateRecord =
  async (): Promise<SupabaseSnapshotRecord | null> => {
  const sessionResult = await supabase.auth.getSession();
  if (!sessionResult.data.session?.user) return null;

  let legacyRecord: SupabaseSnapshotRecord | null = null;
  let moduleRecords: Awaited<ReturnType<typeof readSupabasePersistedModuleRecords>> = [];

  try {
    legacyRecord = await readSupabasePersistedLegacyAppStateRecord();
  } catch (error) {
    throw new Error(`No pude leer Supabase: ${getSupabaseErrorMessage(error)}`);
  }

  try {
    moduleRecords = await readSupabasePersistedModuleRecords();
  } catch (error) {
    if (!isSupabaseMissingTableError(error, SUPABASE_APP_STATE_MODULES_V2_TABLE)) {
      throw new Error(`No pude leer Supabase: ${getSupabaseErrorMessage(error)}`);
    }
  }

  return mergeSupabaseAppStateRecords(legacyRecord, moduleRecords);
};

const writeSupabasePersistedLegacyAppState = async (
  payload: PersistedAppState,
  userId: string
) => {
  await writeSupabaseWithRetry(
    async () => {
      const { error } = await supabase.from(SUPABASE_APP_STATE_TABLE).upsert(
        {
          id: SUPABASE_APP_STATE_RECORD_KEY,
          payload,
          saved_at: payload.savedAt,
          updated_by: userId,
        },
        { onConflict: "id" }
      );

      if (error) {
        throw error;
      }
    },
    "guardar estado compatible en Supabase"
  );
};

const writeSupabasePersistedAppStateModules = async (
  payload: PersistedAppState,
  userId: string,
  writableCompanies: readonly string[],
  moduleKeys?: AppStateModuleKey[]
): Promise<AppStateModuleKey[]> => {
  const modulePayloads = buildPersistedAppStateModules(payload, moduleKeys);

  if (modulePayloads.length === 0) return [];

  // Sin empresas escribibles (race con la carga de permisos) abortamos antes de
  // escribir: si no, los items por-empresa se descartarian. El guardado local ya
  // ocurrio; el autosave a Supabase se reintenta en el proximo cambio.
  if (writableCompanies.length === 0) {
    throw new SupabasePersistError(
      "No pude guardar en Supabase: todavia no se cargaron las empresas habilitadas."
    );
  }

  // Cada modulo se parte en 1 fila por (module_key, company), con su firma de contenido.
  const candidateRows = modulePayloads.flatMap((modulePayload) => {
    const buckets = splitModuleDataByCompany(
      modulePayload.moduleKey,
      modulePayload.data,
      writableCompanies
    );
    return Object.entries(buckets).map(([company, data]) => ({
      row: {
        module_key: modulePayload.moduleKey,
        company,
        payload: {
          version: modulePayload.version,
          savedAt: modulePayload.savedAt,
          moduleKey: modulePayload.moduleKey,
          moduleLabel: modulePayload.moduleLabel,
          data: data as Partial<PersistedAppStateData>,
        } satisfies PersistedAppStateModulePayload,
        saved_at: payload.savedAt,
        updated_by: userId,
      },
      cacheKey: `${userId}|${modulePayload.moduleKey}|${company}`,
      signature: buildPersistedDataSignature(data as PersistedAppStateData),
      label: modulePayload.moduleLabel,
    }));
  });

  // Solo escribir las filas cuyo contenido cambio respecto a lo ultimo guardado OK
  // (editar una empresa ya no reescribe las otras dos -> menos viajes de red).
  const rowsToWrite = candidateRows.filter(
    (entry) => supabaseModuleCompanySignatures.get(entry.cacheKey) !== entry.signature
  );

  for (const batch of chunkArray(rowsToWrite, SUPABASE_MODULE_WRITE_BATCH_SIZE)) {
    const batchLabels = Array.from(new Set(batch.map((entry) => entry.label))).join(", ");
    await writeSupabaseWithRetry(
      async () => {
        const { error } = await supabase.from(SUPABASE_APP_STATE_MODULES_V2_TABLE).upsert(
          batch.map((entry) => entry.row),
          { onConflict: "module_key,company" }
        );

        if (error) {
          throw error;
        }
      },
      `guardar modulos en Supabase (${batchLabels})`
    );
    // Recien tras escribir OK actualizamos la firma cacheada.
    for (const entry of batch) {
      supabaseModuleCompanySignatures.set(entry.cacheKey, entry.signature);
    }
  }

  return modulePayloads.map((modulePayload) => modulePayload.moduleKey);
};

const writeSupabasePersistedAppState = async (
  payload: PersistedAppState,
  options?: { moduleKeys?: AppStateModuleKey[]; writableCompanies?: readonly string[] }
): Promise<{
  mode: "modules" | "legacy";
  moduleKeys: AppStateModuleKey[];
}> => {
  const sessionResult = await supabase.auth.getSession();
  const userId = sessionResult.data.session?.user?.id;

  if (!userId) {
    throw new Error("No hay una sesion de Supabase activa para guardar.");
  }

  try {
    const writtenModuleKeys = await writeSupabasePersistedAppStateModules(
      payload,
      userId,
      options?.writableCompanies || [],
      options?.moduleKeys
    );

    return {
      mode: "modules",
      moduleKeys: writtenModuleKeys,
    };
  } catch (error) {
    if (!isSupabaseMissingTableError(error, SUPABASE_APP_STATE_MODULES_V2_TABLE)) {
      throw new SupabasePersistError(
        `No pude guardar en Supabase: ${getSupabaseErrorMessage(error)}`
      );
    }

    await writeSupabasePersistedLegacyAppState(payload, userId);

    return {
      mode: "legacy",
      moduleKeys: options?.moduleKeys || ALL_APP_STATE_MODULE_KEYS,
    };
  }
};

function normalizePersistedAppState(value: unknown): PersistedAppState | null {
  if (!isRecord(value)) return null;

  if ("data" in value && isRecord(value.data)) {
    return {
      version:
        typeof value.version === "number" ? value.version : APP_PERSISTENCE_VERSION,
      savedAt:
        typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
      data: value.data as PersistedAppStateData,
    };
  }

  if ("budget" in value || "savedBudgets" in value || "employees" in value) {
    return {
      version: APP_PERSISTENCE_VERSION,
      savedAt: new Date().toISOString(),
      data: value as PersistedAppStateData,
    };
  }

  return null;
}

const buildPersistedDataSignature = (data: PersistedAppStateData) =>
  JSON.stringify(data);

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const formatDateTimeDisplay = (dateText: string) => {
  if (!dateText) return "-";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getNextStockCode = (
  items: StockItem[],
  group: string,
  excludeId?: number
) => {
  const typedGroup = group as StockGeneralGroupName;
  const prefix = STOCK_GROUP_CODE_PREFIX[typedGroup] || "ITM";
  const maxSeq = items
    .filter(
      (item) =>
        item.kind === "general" &&
        item.group === group &&
        item.id !== excludeId
    )
    .map((item) => {
      const match = item.code.match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((acc, value) => Math.max(acc, value), 0);

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
};

export default function App() {
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [supabaseProfile, setSupabaseProfile] = useState<any>(null);
  const [supabaseCompaniesCatalog, setSupabaseCompaniesCatalog] = useState<any[]>([]);
  const [supabaseCompanyPermissions, setSupabaseCompanyPermissions] = useState<any[]>([]);
  const [supabaseTabPermissions, setSupabaseTabPermissions] = useState<any[]>([]);
  const [companyCatalog, setCompanyCatalog] = useState<CompanyOption[]>(DEFAULT_COMPANY_OPTIONS);
  const [workspaceCompanyScope, setWorkspaceCompanyScope] = useState<CompanyScope>("General");
  const [newCompanyDraft, setNewCompanyDraft] = useState<CompanyOption>({
    value: "",
    short: "",
    primary: "#1d4ed8",
    soft: "#dbeafe",
    taxId: "",
    bankName: "",
    bankAlias: "",
    bankCbu: "",
    bankAccount: "",
  });
  const [activeTab, setActiveTab] = useState<TabKey>("acceso");
  const [budget, setBudget] = useState<BudgetData>(defaultBudget);
  const [materials, setMaterials] = useState<Material[]>(defaultMaterials);
  const [basicSupplies, setBasicSupplies] = useState<Material[]>(defaultBasicSupplies);
  const [labor, setLabor] = useState<LaborRow[]>(defaultLabor);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(defaultFixedCosts);
  const [budgetIncreases, setBudgetIncreases] = useState<BudgetIncrease[]>(defaultBudgetIncreases);
  const [budgetDiscounts, setBudgetDiscounts] = useState<BudgetDiscount[]>(defaultBudgetDiscounts);
  const [subBudgets, setSubBudgets] = useState<BudgetSection[]>([]);
  const [subBudgetTitle, setSubBudgetTitle] = useState("");
  const [subBudgetNotes, setSubBudgetNotes] = useState("");
  const [fixedMarkers, setFixedMarkers] = useState<FixedMarker[]>(defaultFixedMarkers);
  const [supplyMarkers, setSupplyMarkers] = useState<SupplyMarker[]>(defaultSupplyMarkers);
  const [laborMarkers, setLaborMarkers] = useState<LaborMarker[]>(defaultLaborMarkers);
  const [personalProvisionMarkers, setPersonalProvisionMarkers] = useState<PersonalProvisionMarker[]>(defaultPersonalProvisionMarkers);
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [approvedJobs, setApprovedJobs] = useState<ApprovedJob[]>([]);
  const [financialItems, setFinancialItems] = useState<FinancialCalendarItem[]>(defaultFinancialItems);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(defaultPurchaseInvoices);
  const [pettyCashFunds, setPettyCashFunds] = useState<PettyCashFund[]>(defaultPettyCashFunds);
  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(defaultPettyCashExpenses);
  const [pettyCashRechargeDrafts, setPettyCashRechargeDrafts] = useState<Record<number, string>>({});
  const [pettyCashRechargeDateDrafts, setPettyCashRechargeDateDrafts] = useState<Record<number, string>>({});
  const [debtPlans, setDebtPlans] = useState<DebtPlan[]>(defaultDebtPlans);
  const [bankStatementEntries, setBankStatementEntries] = useState<BankStatementEntry[]>(defaultBankStatementEntries);
  const [stockItems, setStockItems] = useState<StockItem[]>(defaultStockItems);
  const [costAnalysisGroups, setCostAnalysisGroups] = useState<CostAnalysisGroup[]>(
    defaultCostAnalysisGroups
  );
  const [costAnalysisEntries, setCostAnalysisEntries] = useState<CostAnalysisEntry[]>(
    defaultCostAnalysisEntries
  );
  const [remitoDrafts, setRemitoDrafts] = useState<RemitoDraft[]>(defaultRemitoDrafts);
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>(defaultCompanyAssets);
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees);
  const [employeeBaseConfig, setEmployeeBaseConfig] = useState<EmployeeBaseConfig>(defaultBaseConfig);
  const [scaleRows, setScaleRows] = useState<ScaleRow[]>(seededScaleRows);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [expandedRevisionsRoot, setExpandedRevisionsRoot] = useState<number | null>(null);
  const [selectedApprovedJobId, setSelectedApprovedJobId] = useState<number | null>(null);
  const [selectedCrmClientKey, setSelectedCrmClientKey] = useState<string | null>(null);
  const [selectedFinancialItemId, setSelectedFinancialItemId] = useState<number | null>(
    defaultFinancialItems[0]?.id ?? null
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    null
  );
  const [isEmployeeSetupModalOpen, setIsEmployeeSetupModalOpen] = useState(false);
  const [newEmployeeDraft, setNewEmployeeDraft] = useState<{
    company: CompanyName;
    legajo: string;
    name: string;
    category: string;
    nominalHours: number;
  }>({
    company: DEFAULT_COMPANY_OPTIONS[0].value,
    legajo: "",
    name: "",
    category: defaultBaseConfig.category,
    nominalHours: defaultBaseConfig.normalHoursDefault,
  });
  const [employeeDocumentModal, setEmployeeDocumentModal] = useState<{
    employeeId: number;
    name: string;
    dueDate: string;
  } | null>(null);
  const [employeeProvisionModal, setEmployeeProvisionModal] = useState<{
    employeeId: number;
    kind: EmployeeProvisionKind;
    title: string;
    dueDate: string;
    unitPrice: number;
  } | null>(null);
  const [operationalMonth, setOperationalMonth] = useState(() => localMonthKey());
  const [monthlyHistorySnapshots, setMonthlyHistorySnapshots] = useState<MonthlyHistorySnapshot[]>([]);
  const [financialMonth, setFinancialMonth] = useState(() => localMonthKey());
  const [purchaseMonth, setPurchaseMonth] = useState(() => localMonthKey());
  const [payrollMonth, setPayrollMonth] = useState(() => localMonthKey());
  const [personalReportCompany, setPersonalReportCompany] = useState<CompanyScope>("General");
  const [, setPrintMode] = useState<PrintMode>("");
  const [allocationMode, setAllocationMode] = useState<"auto" | "manual">("auto");
  const [manualAllocationPct, setManualAllocationPct] = useState(18.75);
  const [deviationPct, setDeviationPct] = useState(5);
  const [markupPct, setMarkupPct] = useState(30);
  const [vatPct, setVatPct] = useState(21);
  const [laborDeviationPct, setLaborDeviationPct] = useState(0);
  const [commissionPct, setCommissionPct] = useState(0);
  const [stockIncreasePct, setStockIncreasePct] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [storageMessage, setStorageMessage] = useState("");
  // Solapa donde se acaba de guardar: ofrece el "reporte del mes" sin abrirse solo.
  const [monthReportPromptTab, setMonthReportPromptTab] = useState<TabKey | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const [isSupabaseSnapshotReady, setIsSupabaseSnapshotReady] = useState(false);
  const [isSupabaseManualSaveInProgress, setIsSupabaseManualSaveInProgress] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [supabaseLoginEmail, setSupabaseLoginEmail] = useState("");
  const [supabaseLoginPassword, setSupabaseLoginPassword] = useState("");
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState("");
  const [isSupabaseRecoveryMode, setIsSupabaseRecoveryMode] = useState(false);
  const [supabaseNewPassword, setSupabaseNewPassword] = useState("");
  const [supabaseNewPasswordConfirm, setSupabaseNewPasswordConfirm] = useState("");
  const [supabaseUserDirectory, setSupabaseUserDirectory] = useState<SupabaseDirectoryUser[]>([]);
  const [supabaseActiveSessions, setSupabaseActiveSessions] = useState<SupabaseActiveSession[]>([]);
  const [supabaseChatMessages, setSupabaseChatMessages] = useState<SupabaseInternalChatMessage[]>([]);
  const [supabaseChatDraft, setSupabaseChatDraft] = useState("");
  const [selectedChatRecipientId, setSelectedChatRecipientId] = useState<string | null>(null);
  const [selectedChatRecipientName, setSelectedChatRecipientName] = useState<string>("Canal general");
  const [workspaceWidgetOpen, setWorkspaceWidgetOpen] = useState(false);
  const [workspaceWidgetMode, setWorkspaceWidgetMode] = useState<"chat" | "assistant">("chat");
  const [showChatContacts, setShowChatContacts] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [pendingRealtimeRefresh, setPendingRealtimeRefresh] = useState<{
    text: string;
    savedAt: string;
  } | null>(null);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<InternalAssistantMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Puedo ayudarte con reportes rapidos del sistema: presupuestos, stock, caja chica, compras, usuarios activos y guardado compartido.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isCommunicationExpanded, setIsCommunicationExpanded] = useState(false);
  const lastSupabaseSnapshotSavedAtRef = useRef("");
  const lastMarkerSourceKeyRef = useRef("");
  const collaborationSessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}`
  );
  const collaborationChannelRef = useRef<any | null>(null);
  const lastAppliedRemoteSnapshotAtRef = useRef(0);
  const lastSnapshotEventKeyRef = useRef("");
  const lastPersistedDataSignatureRef = useRef("");
  // --- "Atras" (deshacer) ---
  // Pila de snapshots JSON del estado (del mas viejo al mas reciente). undoBaselineRef es
  // el estado "asentado" actual contra el que se compara el proximo cambio.
  const undoStackRef = useRef<string[]>([]);
  // Pila de "Rehacer": estados que se deshicieron y se pueden re-aplicar. Se vacia en cuanto
  // el usuario hace una edicion nueva (esa edicion invalida el "futuro" que se podia rehacer).
  const redoStackRef = useRef<string[]>([]);
  const undoBaselineRef = useRef<string | null>(null);
  // Cuando la restauracion/sync cambia el estado de forma programatica, esto evita que ese
  // cambio se registre como un paso de deshacer del usuario.
  const suppressUndoCaptureRef = useRef(false);
  const [undoAvailable, setUndoAvailable] = useState(0);
  const [redoAvailable, setRedoAvailable] = useState(0);
  const lastSupabaseModuleSignaturesRef = useRef<Record<string, string>>({});
  const lastRealtimeModuleMergeSavedAtRef = useRef("");
  const lastRealtimeModuleMergedDataRef = useRef<PersistedAppStateData | null>(null);
  const lastSupabaseAutosaveAtRef = useRef(0);
  const pendingRemoteSnapshotRef = useRef<PersistedAppState | null>(null);
  // Guard anti-pérdida: solo permitimos ESCRIBIR en Supabase despues de una carga
  // inicial EXITOSA del estado remoto. Si la carga falla (base caida/lenta) o aun no
  // ocurrio, el autosave NO sube nada -> nunca pisa los datos buenos con estado vacio.
  const supabaseHydratedOkRef = useRef(false);
  const presenceAnnouncementReadyRef = useRef(false);
  const knownOtherSessionIdsRef = useRef<string[]>([]);
  const isSupabaseLoggedIn = !!supabaseSession?.user;
  const isChatWidgetVisible = workspaceWidgetOpen && workspaceWidgetMode === "chat";
  const isAssistantWidgetVisible = workspaceWidgetOpen && workspaceWidgetMode === "assistant";
  runtimeCompanyOptions = companyCatalog.length > 0 ? companyCatalog : DEFAULT_COMPANY_OPTIONS;
  const COMPANY_OPTIONS = companyCatalog.length > 0 ? companyCatalog : DEFAULT_COMPANY_OPTIONS;

  const getSupabaseAuthRedirectUrl = () => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin || "";
      const isCodeSandboxOrigin =
        origin.includes("codesandbox.io") || origin.includes("csb.app");

      if (origin && !isCodeSandboxOrigin) {
        return origin;
      }
    }

    return SUPABASE_AUTH_REDIRECT_URL;
  };

  const clearSupabasePasswordDrafts = () => {
    setSupabaseNewPassword("");
    setSupabaseNewPasswordConfirm("");
  };

  const loadSupabaseActiveSessions = async () => {
    const { data, error } = await supabase
      .from(SUPABASE_ACTIVE_SESSIONS_TABLE)
      .select("*")
      .order("last_seen_at", { ascending: false });

    if (error) {
      throw new Error(`No pude leer los usuarios activos: ${error.message}`);
    }

    const threshold = Date.now() - 1000 * 90;
    setSupabaseActiveSessions(
      (data || []).filter((item) => {
        const lastSeen = new Date(item.last_seen_at || 0).getTime();
        return Number.isFinite(lastSeen) && lastSeen >= threshold;
      }) as SupabaseActiveSession[]
    );
  };

  const syncSupabasePresence = async () => {
    const sessionResult = await supabase.auth.getSession();
    const user = sessionResult.data.session?.user;

    if (!user) return;

    const { error } = await supabase.from(SUPABASE_ACTIVE_SESSIONS_TABLE).upsert(
      {
        session_id: collaborationSessionIdRef.current,
        user_id: user.id,
        email: user.email || "",
        full_name: supabaseProfile?.full_name || user.email || "Usuario",
        active_tab: activeTab,
        current_company: budget.company || "General",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      throw new Error(`No pude actualizar presencia de usuarios: ${error.message}`);
    }
  };

  const clearSupabasePresence = async () => {
    try {
      const { error } = await supabase
        .from(SUPABASE_ACTIVE_SESSIONS_TABLE)
        .delete()
        .eq("session_id", collaborationSessionIdRef.current);

      if (error) {
        console.log("CLEAR PRESENCE ERROR:", error);
      }
    } catch (error) {
      console.log("CLEAR PRESENCE ERROR:", error);
    }
  };

  const loadSupabaseChatMessages = async () => {
    const { data, error } = await supabase
      .from(SUPABASE_INTERNAL_CHAT_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      throw new Error(`No pude leer el chat interno: ${error.message}`);
    }

    setSupabaseChatMessages(
      (data || [])
        .map((item) => normalizeSupabaseInternalChatMessage(item))
        .filter((item): item is SupabaseInternalChatMessage => Boolean(item))
        .reverse()
    );
  };

  const sendSupabaseChatMessage = async () => {
    const message = supabaseChatDraft.trim();
    if (!message) return;

    const sessionResult = await supabase.auth.getSession();
    const user = sessionResult.data.session?.user;

    if (!user) {
      setStorageMessage("Necesitas iniciar sesion para escribir en el chat.");
      return;
    }

    const { data, error } = await supabase
      .from(SUPABASE_INTERNAL_CHAT_TABLE)
      .insert({
        user_id: user.id,
        email: user.email || "",
        full_name: supabaseProfile?.full_name || user.email || "Usuario",
        message,
        recipient_user_id: selectedChatRecipientId,
        recipient_full_name: selectedChatRecipientId ? selectedChatRecipientName : null,
        read_by: [user.id],
      })
      .select("*")
      .single();

    if (error) {
      setStorageMessage(`No pude enviar el mensaje interno: ${error.message}`);
      return;
    }

    setSupabaseChatDraft("");
    const insertedMessage = normalizeSupabaseInternalChatMessage(data);
    if (insertedMessage) {
      setSupabaseChatMessages((prev) => {
        const withoutDuplicate = prev.filter(
          (messageItem) => messageItem.id !== insertedMessage.id
        );
        return [...withoutDuplicate, insertedMessage]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(-80);
      });
    }
  };

  const markChatThreadAsRead = async (peerUserId: string) => {
    const currentUserId = supabaseSession?.user?.id;
    if (!currentUserId) return;

    const unreadRows = supabaseChatMessages.filter(
      (message) =>
        message.recipient_user_id === currentUserId &&
        message.user_id === peerUserId &&
        !(message.read_by || []).includes(currentUserId)
    );

    await Promise.all(
      unreadRows.map((message) => {
        const nextReadBy = [...(message.read_by || []), currentUserId].filter(
          (value, index, array) => array.indexOf(value) === index
        );

        return supabase
          .from(SUPABASE_INTERNAL_CHAT_TABLE)
          .update({ read_by: nextReadBy })
          .eq("id", message.id);
      })
    );
  };

  const markGroupChatAsRead = async () => {
    const currentUserId = supabaseSession?.user?.id;
    if (!currentUserId) return;

    const unreadRows = supabaseChatMessages.filter(
      (message) =>
        !message.recipient_user_id &&
        message.user_id !== currentUserId &&
        !(message.read_by || []).includes(currentUserId)
    );

    await Promise.all(
      unreadRows.map((message) => {
        const nextReadBy = [...(message.read_by || []), currentUserId].filter(
          (value, index, array) => array.indexOf(value) === index
        );

        return supabase
          .from(SUPABASE_INTERNAL_CHAT_TABLE)
          .update({ read_by: nextReadBy })
          .eq("id", message.id);
      })
    );
  };

  const refreshSupabaseAccess = async () => {
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session || null;

    setSupabaseSession(session);

    if (!session?.user) {
      supabaseHydratedOkRef.current = false;
      setIsSupabaseSnapshotReady(false);
      setSupabaseProfile(null);
      setSupabaseCompaniesCatalog([]);
      setSupabaseCompanyPermissions([]);
      setSupabaseTabPermissions([]);
      setSupabaseUserDirectory([]);
      setSupabaseActiveSessions([]);
      setSupabaseChatMessages([]);
      return;
    }

    const companiesCatalogResult = await supabase.from("companies").select("*");
    const profileResult = await supabase
      .from("profiles")
      .select("id, full_name, is_superadmin, active")
      .order("full_name", { ascending: true });
    const companyPermissionsResult = await supabase
      .from("user_company_permissions")
      .select("*");
    const tabPermissionsResult = await supabase
      .from("user_tab_permissions")
      .select("*");

    setSupabaseCompaniesCatalog(companiesCatalogResult.data || []);
    const profileDirectory = (profileResult.data || []) as SupabaseDirectoryUser[];
    setSupabaseUserDirectory(profileDirectory);
    setSupabaseProfile(
      profileDirectory.find((item) => item.id === session.user.id) || null
    );
    setSupabaseCompanyPermissions(companyPermissionsResult.data || []);
    setSupabaseTabPermissions(tabPermissionsResult.data || []);
    try {
      await loadSupabaseActiveSessions();
      await loadSupabaseChatMessages();
    } catch (error) {
      console.log("COLLAB LOAD ERROR:", error);
    }
  };

  const loginSupabaseTest = async () => {
    if (!supabaseLoginEmail.trim() || !supabaseLoginPassword.trim()) {
      setSupabaseAuthMessage("Completa el mail y la contrasena de Supabase.");
      return;
    }

    setIsSupabaseSnapshotReady(false);

    const result = await supabase.auth.signInWithPassword({
      email: supabaseLoginEmail.trim(),
      password: supabaseLoginPassword,
    });

    if (result.error) {
      setSupabaseAuthMessage(result.error.message || "No se pudo iniciar sesion en Supabase.");
      return;
    }

    setSupabaseAuthMessage("Sesion Supabase iniciada correctamente.");
    setSupabaseLoginPassword("");
    await refreshSupabaseAccess();
    await restoreFromSupabaseSave();
    setIsSupabaseSnapshotReady(true);
  };

  const sendSupabasePasswordRecovery = async () => {
    if (!supabaseLoginEmail.trim()) {
      setSupabaseAuthMessage("Escribe primero tu mail de Supabase para enviarte el cambio de contrasena.");
      return;
    }

    const result = await supabase.auth.resetPasswordForEmail(supabaseLoginEmail.trim(), {
      redirectTo: getSupabaseAuthRedirectUrl(),
    });

    if (result.error) {
      setSupabaseAuthMessage(
        result.error.message || "No se pudo enviar el mail para cambiar la contrasena."
      );
      return;
    }

    setSupabaseAuthMessage(
      "Te enviamos un mail para cambiar la contrasena. Abre ese link y volveras a esta misma pantalla."
    );
  };

  const updateSupabasePassword = async () => {
    if (!supabaseNewPassword || !supabaseNewPasswordConfirm) {
      setSupabaseAuthMessage("Completa la nueva contrasena en ambos campos.");
      return;
    }

    if (supabaseNewPassword !== supabaseNewPasswordConfirm) {
      setSupabaseAuthMessage("Las contrasenas no coinciden.");
      return;
    }

    if (supabaseNewPassword.length < 8) {
      setSupabaseAuthMessage("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }

    const result = await supabase.auth.updateUser({
      password: supabaseNewPassword,
    });

    if (result.error) {
      setSupabaseAuthMessage(
        result.error.message || "No se pudo actualizar la contrasena."
      );
      return;
    }

    clearSupabasePasswordDrafts();
    setIsSupabaseRecoveryMode(false);
    setSupabaseAuthMessage("La contrasena se actualizo correctamente.");
    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const logoutSupabaseTest = async () => {
    await clearSupabasePresence();
    const result = await supabase.auth.signOut();

    setSupabaseAuthMessage("Sesion Supabase cerrada.");
    setIsSupabaseRecoveryMode(false);
    clearSupabasePasswordDrafts();
    setIsSupabaseSnapshotReady(false);
    await refreshSupabaseAccess();
  };

  useEffect(() => {
    const testSupabase = async () => {
      await refreshSupabaseAccess();

      if (typeof window !== "undefined") {
        const authPayload = `${window.location.hash}${window.location.search}`.toLowerCase();
        if (authPayload.includes("type=recovery")) {
          setActiveTab("acceso");
          setIsSupabaseRecoveryMode(true);
          setSupabaseAuthMessage(
            "Ingresa tu nueva contrasena para completar el cambio."
          );
        }
      }
    };

    testSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setActiveTab("acceso");
        setIsSupabaseRecoveryMode(true);
        setSupabaseAuthMessage("Ingresa tu nueva contrasena para completar el cambio.");
      }
      refreshSupabaseAccess();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseLoggedIn) return;

    const runCollaborationSync = async () => {
      try {
        await syncSupabasePresence();
        await loadSupabaseActiveSessions();
        await loadSupabaseChatMessages();

        const remoteRecord = await readSupabasePersistedAppStateRecord();
        applyIncomingSupabaseSnapshot(remoteRecord, "poll");
        // Carga remota OK: recien ahora habilitamos la escritura a Supabase.
        supabaseHydratedOkRef.current = true;
      } catch (error) {
        console.log("COLLAB SYNC ERROR:", error);
      }
    };

    runCollaborationSync();
    const intervalId = window.setInterval(
      runCollaborationSync,
      COLLABORATION_POLL_INTERVAL_MS
    );
    const handleBeforeUnload = () => {
      void clearSupabasePresence();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    isSupabaseLoggedIn,
    activeTab,
    budget.company,
    supabaseProfile?.full_name,
    supabaseSession?.user?.id,
  ]);

  useEffect(() => {
    if (!isSupabaseLoggedIn || !supabaseSession?.user?.id) {
      presenceAnnouncementReadyRef.current = false;
      knownOtherSessionIdsRef.current = [];
      if (collaborationChannelRef.current) {
        void supabase.removeChannel(collaborationChannelRef.current);
        collaborationChannelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`${SUPABASE_COLLAB_CHANNEL}-${collaborationSessionIdRef.current}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: SUPABASE_ACTIVE_SESSIONS_TABLE,
        },
        () => {
          void loadSupabaseActiveSessions().catch((error) =>
            console.log("ACTIVE SESSIONS REALTIME ERROR:", error)
          );
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: SUPABASE_INTERNAL_CHAT_TABLE,
        },
        (payload: any) => {
          const nextMessage = normalizeSupabaseInternalChatMessage(payload?.new);
          const oldRow = isRecord(payload?.old) ? payload.old : null;
          const oldId = Number(oldRow?.id);
          const eventType =
            typeof payload?.eventType === "string" ? payload.eventType : "";

          if (!nextMessage && eventType !== "DELETE") {
            void loadSupabaseChatMessages().catch((error) =>
              console.log("CHAT REALTIME ERROR:", error)
            );
            return;
          }

          setSupabaseChatMessages((prev) => {
            if (eventType === "DELETE" && Number.isFinite(oldId)) {
              return prev.filter((message) => message.id !== oldId);
            }

            if (!nextMessage) return prev;

            const existingMessage = prev.some(
              (message) => message.id === nextMessage.id
            );
            const nextMessages = existingMessage
              ? prev.map((message) =>
                  message.id === nextMessage.id ? nextMessage : message
                )
              : [...prev, nextMessage];

            return nextMessages
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .slice(-80);
          });
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: SUPABASE_APP_STATE_TABLE,
          filter: `id=eq.${SUPABASE_APP_STATE_RECORD_KEY}`,
        },
        () => {
          void readSupabasePersistedAppStateRecord()
            .then((nextRecord) => {
              applyIncomingSupabaseSnapshot(nextRecord, "realtime");
            })
            .catch((error) => {
              console.log("COLLAB REALTIME SNAPSHOT ERROR:", error);
            });
        }
      )
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: SUPABASE_APP_STATE_MODULES_V2_TABLE,
        },
        (payload: any) => {
          const nextRow = isRecord(payload?.new) ? payload.new : null;
          const moduleKey =
            nextRow && typeof nextRow.module_key === "string"
              ? nextRow.module_key
              : "";
          const rowCompany =
            nextRow && typeof nextRow.company === "string"
              ? nextRow.company
              : GENERAL_COMPANY;
          const modulePayload =
            nextRow && moduleKey
              ? normalizePersistedAppStateModule(nextRow.payload, moduleKey)
              : null;

          if (modulePayload) {
            const savedAt =
              typeof nextRow?.saved_at === "string"
                ? nextRow.saved_at
                : modulePayload.savedAt;
            const updatedBy =
              typeof nextRow?.updated_by === "string" ? nextRow.updated_by : null;
            const currentData =
              lastRealtimeModuleMergeSavedAtRef.current === savedAt &&
              lastRealtimeModuleMergedDataRef.current
                ? lastRealtimeModuleMergedDataRef.current
                : buildPersistedAppData();
            // Reemplaza SOLO la porcion de esa empresa, sin pisar las demas.
            const mergedModuleData = applyCompanyModuleSlice(
              modulePayload.moduleKey,
              currentData,
              rowCompany,
              modulePayload.data
            ) as PersistedAppStateData;
            lastRealtimeModuleMergeSavedAtRef.current = savedAt;
            lastRealtimeModuleMergedDataRef.current = mergedModuleData;
            applyIncomingSupabaseSnapshot(
              {
                payload: {
                  version: APP_PERSISTENCE_VERSION,
                  savedAt,
                  data: mergedModuleData,
                },
                saved_at: savedAt,
                updated_by: updatedBy,
                module_keys: [modulePayload.moduleKey],
              },
              "realtime"
            );
            return;
          }

          void readSupabasePersistedAppStateRecord()
            .then((nextRecord) => {
              applyIncomingSupabaseSnapshot(
                nextRecord && moduleKey
                  ? { ...nextRecord, module_keys: [moduleKey] }
                  : nextRecord,
                "realtime"
              );
            })
            .catch((error) => {
              console.log("COLLAB REALTIME MODULE SNAPSHOT ERROR:", error);
            });
        }
      )
      .subscribe((status: string) => {
        console.log("COLLAB REALTIME STATUS:", status);
      });

    collaborationChannelRef.current = channel;

    return () => {
      if (collaborationChannelRef.current) {
        void supabase.removeChannel(collaborationChannelRef.current);
        collaborationChannelRef.current = null;
      }
    };
  }, [isSupabaseLoggedIn, supabaseSession?.user?.id]);

  const totalMaterials = useMemo(
    () => materials.reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0), 0),
    [materials]
  );

  const isSupabaseAdmin = !!supabaseProfile?.is_superadmin;
  const effectiveIsAdmin = isSupabaseLoggedIn && isSupabaseAdmin;

  const supabaseAllowedCompanies = useMemo<CompanyName[]>(() => {
    if (!isSupabaseLoggedIn) return [];
    const allowedIds = new Set(
      supabaseCompanyPermissions.map((item) => Number(item.company_id))
    );

    return Array.from(
      new Set(
        supabaseCompaniesCatalog
      .filter((item) => allowedIds.has(Number(item.id)))
          .map((item) => resolveCompanyNameFromCatalogItem(item, companyCatalog))
          .filter((name): name is CompanyName => !!name)
      )
    );
  }, [isSupabaseLoggedIn, supabaseCompanyPermissions, supabaseCompaniesCatalog, companyCatalog]);

  const supabaseAllowedTabs = useMemo<TabKey[]>(() => {
    if (!isSupabaseLoggedIn) return [];
    return supabaseTabPermissions
      .map((item) => item.tab_key)
      .filter((key): key is TabKey => TAB_OPTIONS.some((tab) => tab.key === key));
  }, [isSupabaseLoggedIn, supabaseTabPermissions]);

  const allowedCompaniesForSession = useMemo(
    () =>
      effectiveIsAdmin
        ? companyCatalog.map((item) => item.value)
        : isSupabaseLoggedIn
        ? supabaseAllowedCompanies
        : [],
    [companyCatalog, effectiveIsAdmin, isSupabaseLoggedIn, supabaseAllowedCompanies]
  );

  // Aislamiento reactivo: para un usuario restringido, mantener SIEMPRE limpios todos los
  // arrays por-empresa en memoria (sacar cualquier item de una empresa no permitida), sin
  // importar de donde vino la data (cache local, defaults, Supabase, realtime) ni el orden
  // de carga. Asi NINGUN render -se vea o no, use el array crudo o el filtrado- puede mostrar
  // datos de otra empresa. No toca al superadmin. El guardado sigue intacto (el split solo
  // escribe las empresas escribibles; las filas de las otras empresas no se tocan).
  useEffect(() => {
    if (!isSupabaseLoggedIn || effectiveIsAdmin) return;
    const allowedCompany = (company: unknown) =>
      company === "General" ||
      (typeof company === "string" &&
        allowedCompaniesForSession.includes(company as CompanyName));
    const prune = <T extends { company?: unknown }>(
      items: T[],
      setItems: (next: T[]) => void
    ) => {
      const filtered = items.filter((item) => allowedCompany(item?.company));
      if (filtered.length !== items.length) setItems(filtered);
    };
    prune(savedBudgets, setSavedBudgets);
    prune(approvedJobs, setApprovedJobs);
    prune(financialItems, setFinancialItems);
    prune(purchaseInvoices, setPurchaseInvoices);
    prune(pettyCashFunds, setPettyCashFunds);
    prune(pettyCashExpenses, setPettyCashExpenses);
    prune(debtPlans, setDebtPlans);
    prune(bankStatementEntries, setBankStatementEntries);
    prune(stockItems, setStockItems);
    prune(costAnalysisGroups, setCostAnalysisGroups);
    prune(costAnalysisEntries, setCostAnalysisEntries);
    prune(remitoDrafts, setRemitoDrafts);
    prune(companyAssets, setCompanyAssets);
    prune(employees, setEmployees);
    prune(fixedMarkers, setFixedMarkers);
    prune(supplyMarkers, setSupplyMarkers);
    prune(laborMarkers, setLaborMarkers);
    prune(personalProvisionMarkers, setPersonalProvisionMarkers);
  }, [
    isSupabaseLoggedIn,
    effectiveIsAdmin,
    allowedCompaniesForSession,
    savedBudgets,
    approvedJobs,
    financialItems,
    purchaseInvoices,
    pettyCashFunds,
    pettyCashExpenses,
    debtPlans,
    bankStatementEntries,
    stockItems,
    costAnalysisGroups,
    costAnalysisEntries,
    remitoDrafts,
    companyAssets,
    employees,
    fixedMarkers,
    supplyMarkers,
    laborMarkers,
    personalProvisionMarkers,
  ]);

  const canAccessCompany = (company: CompanyName | "General") => {
    if (!isSupabaseLoggedIn) return false;
    const hasPermission =
      effectiveIsAdmin ||
      company === "General" ||
      allowedCompaniesForSession.includes(company as CompanyName);

    if (!hasPermission) return false;

    if (workspaceCompanyScope === "General") return true;

    return company === "General" || company === workspaceCompanyScope;
  };

  const visibleTabOptions = useMemo(() => {
    const accessTab = TAB_OPTIONS.find((item) => item.key === "acceso");
    const withAccess = (items: Array<{ key: TabKey; label: string }>) =>
      accessTab
        ? [accessTab, ...items.filter((item) => item.key !== "acceso")]
        : items;

    if (!isSupabaseLoggedIn) {
      return accessTab ? [accessTab] : [];
    }

    if (effectiveIsAdmin) {
      return withAccess(TAB_OPTIONS);
    }

    if (isSupabaseLoggedIn) {
      return withAccess(
        TAB_OPTIONS.filter((item) => item.key === "acceso" || supabaseAllowedTabs.includes(item.key))
      );
    }

    return withAccess(TAB_OPTIONS.filter((item) => item.key === "acceso"));
  }, [effectiveIsAdmin, isSupabaseLoggedIn, supabaseAllowedTabs]);

  const sidebarSections = useMemo(() => {
    const accessTabs = visibleTabOptions.filter((item) => item.key === "acceso");
    const brutaTabs = visibleTabOptions.filter((item) => BRUTA_TAB_KEYS.includes(item.key));
    const netaTabs = visibleTabOptions.filter((item) => NETA_TAB_KEYS.includes(item.key));

    return [
      { title: "Sistema", hint: "Acceso y seguridad", tabs: accessTabs },
      { title: "Administracion bruta", hint: "Operacion y resultados", tabs: brutaTabs },
      { title: "Administracion neta", hint: "Costos y presupuestacion", tabs: netaTabs },
    ].filter((section) => section.tabs.length > 0);
  }, [visibleTabOptions]);

  const visibleSavedBudgets = useMemo(
    () =>
      getLatestBudgetRevisions(savedBudgets).filter((item) =>
        canAccessCompany(item.company)
      ),
    [savedBudgets, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  // Versiones anteriores de un presupuesto (mismas raiz, distinto id), mas nuevas primero.
  // Sirve para avisar en el historial que hay actualizaciones previas y poder revisarlas.
  const getPriorBudgetRevisions = (item: SavedBudget) => {
    const root = item.rootBudgetId || item.id;
    return savedBudgets
      .filter((other) => (other.rootBudgetId || other.id) === root && other.id !== item.id)
      .sort((a, b) => (b.revisionNumber || 1) - (a.revisionNumber || 1));
  };

  const otherActiveSessions = useMemo(
    () =>
      supabaseActiveSessions.filter(
        (item) => item.session_id !== collaborationSessionIdRef.current
      ),
    [supabaseActiveSessions]
  );

  const visibleChatMessages = useMemo(() => {
    if (!selectedChatRecipientId) {
      return supabaseChatMessages.filter((item) => !item.recipient_user_id);
    }

    return supabaseChatMessages.filter((item) => {
      const senderIsPeer = item.user_id === selectedChatRecipientId;
      const receiverIsPeer = item.recipient_user_id === selectedChatRecipientId;
      const senderIsMe = item.user_id === supabaseSession?.user?.id;
      const receiverIsMe = item.recipient_user_id === supabaseSession?.user?.id;
      return (senderIsPeer && receiverIsMe) || (senderIsMe && receiverIsPeer);
    });
  }, [selectedChatRecipientId, supabaseChatMessages, supabaseSession?.user?.id]);

  const privateUnreadByUser = useMemo(() => {
    const currentUserId = supabaseSession?.user?.id;
    const summary: Record<string, number> = {};
    if (!currentUserId) return summary;

    supabaseChatMessages.forEach((message) => {
      if (
        message.recipient_user_id === currentUserId &&
        message.user_id !== currentUserId &&
        !(message.read_by || []).includes(currentUserId)
      ) {
        summary[message.user_id] = (summary[message.user_id] || 0) + 1;
      }
    });

    return summary;
  }, [supabaseChatMessages, supabaseSession?.user?.id]);

  const groupUnreadCount = useMemo(() => {
    const currentUserId = supabaseSession?.user?.id;
    if (!currentUserId) return 0;

    return supabaseChatMessages.filter(
      (message) =>
        !message.recipient_user_id &&
        message.user_id !== currentUserId &&
        !(message.read_by || []).includes(currentUserId)
    ).length;
  }, [supabaseChatMessages, supabaseSession?.user?.id]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const chatPeers = useMemo(() => {
    const currentUserId = supabaseSession?.user?.id;
    const peers = new Map<
      string,
      {
        user_id: string;
        full_name: string;
        email: string;
        isActive: boolean;
        last_seen_at: string;
      }
    >();

    otherActiveSessions.forEach((session) => {
      peers.set(session.user_id, {
        user_id: session.user_id,
        full_name: session.full_name,
        email: session.email,
        isActive: true,
        last_seen_at: session.last_seen_at,
      });
    });

    supabaseChatMessages.forEach((message) => {
      const peerUserId =
        message.user_id === currentUserId
          ? message.recipient_user_id
          : message.user_id;

      if (!peerUserId || peerUserId === currentUserId) return;
      if (peers.has(peerUserId)) return;

      peers.set(peerUserId, {
        user_id: peerUserId,
        full_name:
          message.user_id === peerUserId
            ? message.full_name || message.email || "Usuario"
            : message.recipient_full_name || message.recipient_email || "Usuario",
        email:
          message.user_id === peerUserId
            ? message.email || ""
            : message.recipient_email || "",
        isActive: false,
        last_seen_at: message.created_at,
      });
    });

    supabaseUserDirectory.forEach((user) => {
      if (!user.id || user.id === currentUserId || peers.has(user.id)) return;

      peers.set(user.id, {
        user_id: user.id,
        full_name: user.full_name || "Usuario",
        email: "",
        isActive: false,
        last_seen_at: "",
      });
    });

    return Array.from(peers.values()).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.last_seen_at || "").localeCompare(a.last_seen_at || "");
    });
  }, [
    otherActiveSessions,
    supabaseChatMessages,
    supabaseSession?.user?.id,
    supabaseUserDirectory,
  ]);

  useEffect(() => {
    if (!isSupabaseLoggedIn) {
      presenceAnnouncementReadyRef.current = false;
      knownOtherSessionIdsRef.current = [];
      return;
    }

    const nextIds = otherActiveSessions.map((item) => item.session_id).sort();

    if (!presenceAnnouncementReadyRef.current) {
      presenceAnnouncementReadyRef.current = true;
      knownOtherSessionIdsRef.current = nextIds;
      return;
    }

    knownOtherSessionIdsRef.current = nextIds;
  }, [isSupabaseLoggedIn, otherActiveSessions]);

  useEffect(() => {
    if (notificationsOpen) {
      markNotificationsAsRead();
    }
  }, [notificationsOpen]);

  const visibleApprovedJobs = useMemo(
    () => approvedJobs.filter((item) => canAccessCompany(item.company)),
    [approvedJobs, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleFinancialItems = useMemo(
    () => financialItems.filter((item) => canAccessCompany(item.company)),
    [financialItems, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visiblePurchaseInvoices = useMemo(
    () => purchaseInvoices.filter((item) => canAccessCompany(item.company)),
    [purchaseInvoices, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visiblePettyCashFunds = useMemo(
    () => pettyCashFunds.filter((item) => canAccessCompany(item.company)),
    [pettyCashFunds, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const normalizedPettyCashExpenses = useMemo(
    () =>
      pettyCashExpenses.map((item) => ({
        ...item,
        administration: getPettyCashAdministration(item),
      })),
    [pettyCashExpenses]
  );

  const visiblePettyCashExpenses = useMemo(
    () => normalizedPettyCashExpenses.filter((item) => canAccessCompany(item.company)),
    [normalizedPettyCashExpenses, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const pettyCashTrackingRows = useMemo(
    () =>
      visiblePettyCashExpenses
        .map((expense) => {
          const fund = visiblePettyCashFunds.find((item) => item.id === expense.fundId) || null;
          return {
            id: expense.id,
            fundId: expense.fundId,
            company: fund?.company || expense.company,
            fundDescription: fund?.description || "Caja chica sin descripcion",
            responsible: fund?.responsible || "Sin responsable asignado",
            amount: Number(expense.amount || 0),
            date: expense.date,
            administration: expense.administration,
            description: expense.description,
          };
        })
        .sort((a, b) => {
          const dateCompare = (b.date || "").localeCompare(a.date || "");
          return dateCompare !== 0 ? dateCompare : b.id - a.id;
        }),
    [visiblePettyCashExpenses, visiblePettyCashFunds]
  );

  const visibleDebtPlans = useMemo(
    () => debtPlans.filter((item) => canAccessCompany(item.company)),
    [debtPlans, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleBankStatementEntries = useMemo(
    () => bankStatementEntries.filter((item) => canAccessCompany(item.company)),
    [bankStatementEntries, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  // --- Silos por mes (vista filtrada por fecha) ---
  // Las solapas mensuales muestran/editan SOLO los items del mes activo. El dato vivo sigue
  // siendo la lista continua completa: los reportes y los consumidores cross-mes (analisis anual,
  // stock, fabricacion) siguen leyendo visible*/los arrays globales, asi que NUNCA quedan vacios.
  // operationalMonth/financialMonth/purchaseMonth van en lockstep via syncOperationalMonth.
  const monthBankStatementEntries = useMemo(
    () => visibleBankStatementEntries.filter((item) => itemMonthKey(item.date) === operationalMonth),
    [visibleBankStatementEntries, operationalMonth]
  );
  const monthPettyCashExpenses = useMemo(
    () => visiblePettyCashExpenses.filter((item) => itemMonthKey(item.date) === operationalMonth),
    [visiblePettyCashExpenses, operationalMonth]
  );
  const monthPurchaseInvoices = useMemo(
    () => visiblePurchaseInvoices.filter((item) => itemMonthKey(item.invoiceDate) === purchaseMonth),
    [visiblePurchaseInvoices, purchaseMonth]
  );
  // Fecha por defecto para altas: hoy si estamos en el mes corriente; si no, el 1ro del mes activo.
  // Asi un alta nueva cae en el mes que el usuario esta viendo (y no "desaparece" a otro mes).
  const defaultDateForActiveMonth = () =>
    operationalMonth === localMonthKey() ? todayIso() : `${operationalMonth}-01`;

  const visibleStockItems = useMemo(
    () => stockItems.filter((item) => canAccessCompany(item.company)),
    [stockItems, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleCompanyAssets = useMemo(
    () => companyAssets.filter((item) => canAccessCompany(item.company)),
    [companyAssets, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleEmployees = useMemo(
    () => employees.filter((item) => canAccessCompany(item.company)),
    [employees, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const totalBasicSupplies = useMemo(
    () =>
      basicSupplies.reduce(
        (acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0),
        0
      ),
    [basicSupplies]
  );

  const nominalLaborHoursPerEmployee = Number(employeeBaseConfig.normalHoursDefault || 198);

  const laborRows = useMemo(
    () =>
      labor.map((item) => {
        const baseHourlyRate = Number(item.hourlyRate || 0);
        const adjustedHourlyRate = baseHourlyRate * (1 + laborDeviationPct / 100);
        const capacityHours =
          Number(item.employees || 0) * Number(nominalLaborHoursPerEmployee || 198);
        const laborDeviationAmount =
          Number(item.jobHours || 0) * Math.max(0, adjustedHourlyRate - baseHourlyRate);

        return {
          ...item,
          baseHourlyRate,
          adjustedHourlyRate,
          laborDeviationAmount,
          subtotal: Number(item.jobHours || 0) * adjustedHourlyRate,
          totalMonthlyHours: capacityHours,
        };
      }),
    [labor, laborDeviationPct, nominalLaborHoursPerEmployee]
  );

  const totalLabor = useMemo(
    () => laborRows.reduce((acc, item) => acc + item.subtotal, 0),
    [laborRows]
  );

  const totalLaborDeviationAmount = useMemo(
    () => laborRows.reduce((acc, item) => acc + Number(item.laborDeviationAmount || 0), 0),
    [laborRows]
  );

  const totalJobHours = useMemo(
    () => laborRows.reduce((acc, item) => acc + Number(item.jobHours || 0), 0),
    [laborRows]
  );

  const totalAvailableHours = useMemo(
    () => laborRows.reduce((acc, item) => acc + Number(item.totalMonthlyHours || 0), 0),
    [laborRows]
  );

  const occupancyPct = totalAvailableHours > 0 ? (totalJobHours / totalAvailableHours) * 100 : 0;
  const totalFixedCosts = useMemo(
    () => fixedCosts.reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [fixedCosts]
  );

  const allocationPctUsed = allocationMode === "auto" ? occupancyPct : manualAllocationPct;
  const fixedCostsApplied = totalFixedCosts * (allocationPctUsed / 100);
  const deviationAmount = (totalMaterials + totalBasicSupplies + totalLabor) * (deviationPct / 100);
  const totalCost = totalMaterials + totalBasicSupplies + totalLabor + fixedCostsApplied + deviationAmount;
  const markupAmount = totalCost * (markupPct / 100);
  const preDiscountNetPrice = totalCost + markupAmount;
  const totalIncreaseAmount = budgetIncreases.reduce(
    (acc, item) => acc + preDiscountNetPrice * (Number(item.pct || 0) / 100),
    0
  );
  const priceBeforeDiscounts = preDiscountNetPrice + totalIncreaseAmount;
  const totalDiscountAmount = budgetDiscounts.reduce(
    (acc, item) =>
      acc +
      (item.mode === "porcentaje"
        ? priceBeforeDiscounts * (Number(item.pct || 0) / 100)
        : Number(item.amount || 0)),
    0
  );
  const netPrice = Math.max(0, priceBeforeDiscounts - totalDiscountAmount);
  const commissionAmount = netPrice * (commissionPct / 100);
  const finalPrice = netPrice * (1 + vatPct / 100);
  const budgetEstimatedDeliveryDate = buildDeliveryDateFromTerm(budget.date, budget.deliveryTerm);

  const stockByDescription = useMemo(() => {
    const map = new Map<string, StockItem>();
    visibleStockItems.forEach((item) => map.set(item.description.trim().toLowerCase(), item));
    return map;
  }, [visibleStockItems]);

  const stockByCode = useMemo(() => {
    const map = new Map<string, StockItem>();
    visibleStockItems.forEach((item) => map.set(item.code.trim().toLowerCase(), item));
    return map;
  }, [visibleStockItems]);

  const stockSearchOptions = useMemo(
    () =>
      stockItems
        .filter((item) => canAccessCompany(item.company))
        .filter((item) => item.kind === "general" && item.active)
        .sort((a, b) => {
          const groupCompare = (a.group || "").localeCompare(b.group || "");
          if (groupCompare !== 0) return groupCompare;
          return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
        }),
    [stockItems, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const displayedMaterials = useMemo(
    () =>
      [...materials].sort((a, b) => {
        const groupCompare = (a.stockGroup || "ZZZ").localeCompare(b.stockGroup || "ZZZ");
        if (groupCompare !== 0) return groupCompare;
        const orderCompare = Number(a.sortOrder ?? 999999) - Number(b.sortOrder ?? 999999);
        if (orderCompare !== 0) return orderCompare;
        return a.description.localeCompare(b.description);
      }),
    [materials]
  );

  const stockPersonalItems = useMemo(
    () => visibleStockItems.filter((item) => item.kind === "EPP" || item.kind === "Insumos"),
    [visibleStockItems]
  );

  const getStockPersonalItemForCompany = (stockCode: string, company: CompanyName) => {
    const exact = stockPersonalItems.find(
      (item) => item.active && item.code === stockCode && item.company === company
    );
    if (exact) return exact;
    const shared = stockPersonalItems.find(
      (item) =>
        item.active &&
        item.code === stockCode &&
        (item.shared || item.company === "General")
    );
    return shared || null;
  };

  const baseProvisionTemplateRows = useMemo(
    () =>
      employeeBaseConfig.provisionTemplates.map((template) => {
        const stockItem = stockPersonalItems.find((item) => item.code === template.stockCode) || null;
        return {
          ...template,
          description: stockItem?.description || template.stockCode,
          unitPrice: Number(stockItem?.unitPrice || 0),
          availableQty: Number(stockItem?.quantity || 0),
          monthlyCostPerEmployee:
            (Number(template.quantity || 0) * Number(stockItem?.unitPrice || 0)) /
            Math.max(Number(template.validityMonths || 1), 1),
        };
      }),
    [employeeBaseConfig.provisionTemplates, stockPersonalItems]
  );

  const totalStockValue = useMemo(
    () =>
      visibleStockItems
        .filter((item) => item.active)
        .reduce(
          (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
          0
        ),
    [visibleStockItems]
  );

  const personalProvisionAlerts = useMemo(() => {
    const rows: Array<{
      employeeName: string;
      company: CompanyName;
      kind: PersonalProvisionKind;
      itemName: string;
      availableQty: number;
      dueDate: string;
      daysLeft: number;
      state: "vencido" | "vence_pronto";
    }> = [];

    employees.forEach((employee) => {
      employee.provisionItems.forEach((item) => {
        if (!item.dueDate) return;
        const daysLeft = Math.ceil(
          (new Date(item.dueDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 30) {
          const stockItem = getStockPersonalItemForCompany(item.stockCode, employee.company);
          rows.push({
            employeeName: employee.name,
            company: employee.company,
            kind: item.kind,
            itemName: stockItem?.description || item.stockCode,
            availableQty: Number(stockItem?.quantity || 0),
            dueDate: item.dueDate,
            daysLeft,
            state: daysLeft < 0 ? "vencido" : "vence_pronto",
          });
        }
      });
    });

    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [employees, stockPersonalItems]);

  const getEmployeeProvisionSummary = (
    employee: Employee,
    kind: EmployeeProvisionKind
  ) => {
    const deliveredItems = employee.provisionItems.filter((item) => item.kind === kind);
    if (deliveredItems.length === 0) return { label: "Sin cargar", tone: "red" as const };

    let hasMissing = false;
    let hasExpiring = false;

    deliveredItems.forEach((delivered) => {
      if (
        !delivered.stockCode ||
        !delivered.attachmentName ||
        !delivered.dueDate ||
        Number(delivered.quantity || 0) <= 0
      ) {
        hasMissing = true;
        return;
      }

      const diff =
        (new Date(delivered.dueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff < 0) {
        hasMissing = true;
        return;
      }
      if (diff <= 30) {
        hasExpiring = true;
      }
    });

    if (hasMissing) return { label: "Faltante", tone: "red" as const };
    if (hasExpiring) return { label: "Vence pronto", tone: "yellow" as const };
    return { label: "Al dia", tone: "green" as const };
  };

  const restorePersonalProvisionMarkersFromStock = () => {
    setPersonalProvisionMarkers((prev) => {
      const manualRows = prev.filter((item) => !item.sourceStockCode);
      const mappedRows = employeeBaseConfig.provisionTemplates
        .map((template) => {
          const stockItem =
            stockPersonalItems.find((item) => item.code === template.stockCode && item.active) ||
            null;
          if (!stockItem) return null;
          return {
            id: newId(),
            company:
              stockItem.company === "General"
                ? COMPANY_OPTIONS[0].value
                : (stockItem.company as CompanyName),
            shared: stockItem.shared,
            kind: template.kind,
            sourceStockCode: stockItem.code,
            description: `${stockItem.description} x ${template.quantity}`,
            amountPerDelivery: Number(stockItem.unitPrice || 0) * Number(template.quantity || 0),
            periodicityMonths: Number(template.validityMonths || 6),
            active: stockItem.active,
            notes: "Restaurado desde Configuracion base + Stock",
          };
        })
        .filter(Boolean) as PersonalProvisionMarker[];

      return [...mappedRows, ...manualRows];
    });
  };

  const currentSnapshot: BudgetSnapshot = useMemo(
    () => ({
      budget: cloneBudget(budget),
      subBudgets: subBudgets.map((item) => ({
        ...item,
        materials: item.materials.map((row) => ({ ...row })),
        basicSupplies: item.basicSupplies.map((row) => ({ ...row })),
        labor: item.labor.map((row) => ({ ...row })),
        fixedCosts: item.fixedCosts.map((row) => ({ ...row })),
        increases: item.increases.map((row) => ({ ...row })),
        discounts: item.discounts.map((row) => ({ ...row })),
        totals: { ...item.totals },
      })),
      materials: materials.map((item) => ({ ...item })),
      basicSupplies: basicSupplies.map((item) => ({ ...item })),
      labor: labor.map((item) => ({ ...item })),
      fixedCosts: fixedCosts.map((item) => ({ ...item })),
      increases: budgetIncreases.map((item) => ({ ...item })),
      discounts: cloneBudgetDiscounts(budgetDiscounts),
      params: {
        deviationPct,
        markupPct,
        vatPct,
        allocationMode,
        manualAllocationPct,
        laborDeviationPct,
        commissionPct,
      },
      totals: {
        totalMaterials,
        totalBasicSupplies,
        totalLabor,
        laborDeviationPct,
        laborDeviationAmount: totalLaborDeviationAmount,
        fixedCostsApplied,
        deviationAmount,
        totalCost,
        totalIncreaseAmount,
        preDiscountNetPrice,
        totalDiscountAmount,
        netPrice,
        finalPrice,
        commissionAmount,
        totalJobHours,
        totalAvailableHours,
        occupancyPct,
      },
    }),
    [budget, subBudgets, materials, basicSupplies, labor, fixedCosts, budgetIncreases, budgetDiscounts, deviationPct, markupPct, vatPct, allocationMode, manualAllocationPct, laborDeviationPct, commissionPct, totalMaterials, totalBasicSupplies, totalLabor, totalLaborDeviationAmount, fixedCostsApplied, deviationAmount, totalCost, totalIncreaseAmount, preDiscountNetPrice, totalDiscountAmount, netPrice, finalPrice, commissionAmount, totalJobHours, totalAvailableHours, occupancyPct]
  );

  const latestBudgetRevisions = useMemo(() => {
    return getLatestBudgetRevisions(savedBudgets);
  }, [savedBudgets]);

  const exportedBudgetsCount = latestBudgetRevisions.filter((item) => !!item.exportedAt).length;
  const pendingExportBudgetsCount = latestBudgetRevisions.length - exportedBudgetsCount;

  const currentWorkingSectionTotals: BudgetSectionTotals = useMemo(
    () => ({
      totalMaterials,
      totalBasicSupplies,
      totalLabor,
      laborDeviationAmount: totalLaborDeviationAmount,
      fixedCostsApplied,
      deviationAmount,
      totalCost,
      totalIncreaseAmount,
      preDiscountNetPrice,
      totalDiscountAmount,
      netPrice,
      finalPrice,
      totalJobHours,
      totalAvailableHours,
      occupancyPct,
    }),
    [
      totalMaterials,
      totalBasicSupplies,
      totalLabor,
      totalLaborDeviationAmount,
      fixedCostsApplied,
      deviationAmount,
      totalCost,
      totalIncreaseAmount,
      preDiscountNetPrice,
      totalDiscountAmount,
      netPrice,
      finalPrice,
      totalJobHours,
      totalAvailableHours,
      occupancyPct,
    ]
  );

  const currentWorkingHasContent =
    materials.some((item) => item.description.trim() || Number(item.qty || 0) || Number(item.unitPrice || 0)) ||
    basicSupplies.some((item) => item.description.trim() || Number(item.qty || 0) || Number(item.unitPrice || 0)) ||
    labor.some((item) => item.category.trim() || Number(item.jobHours || 0) || Number(item.hourlyRate || 0)) ||
    fixedCosts.some((item) => item.description.trim() || Number(item.amount || 0)) ||
    budgetIncreases.some((item) => item.description.trim() || Number(item.pct || 0)) ||
    budgetDiscounts.some((item) => item.description.trim() || Number(item.amount || 0));

  const workingBudgetSections = useMemo(
    () => [
      ...subBudgets,
      ...(currentWorkingHasContent
        ? [
            {
              id: -1,
              title: subBudgetTitle.trim() || "Bloque actual",
              notes: subBudgetNotes,
              materials: materials.map((item) => ({ ...item })),
              basicSupplies: basicSupplies.map((item) => ({ ...item })),
              labor: labor.map((item) => ({ ...item })),
              fixedCosts: fixedCosts.map((item) => ({ ...item })),
              increases: budgetIncreases.map((item) => ({ ...item })),
              discounts: budgetDiscounts.map((item) => ({ ...item })),
              totals: { ...currentWorkingSectionTotals },
              savedAt: "",
            } as BudgetSection,
          ]
        : []),
    ],
    [
      subBudgets,
      currentWorkingHasContent,
      subBudgetTitle,
      subBudgetNotes,
      materials,
      basicSupplies,
      labor,
      fixedCosts,
      budgetIncreases,
      budgetDiscounts,
      currentWorkingSectionTotals,
    ]
  );

  const consolidatedBudgetTotals = useMemo(
    () => {
      const reduced = workingBudgetSections.reduce(
        (acc, section) => ({
          totalMaterials: acc.totalMaterials + Number(section.totals.totalMaterials || 0),
          totalBasicSupplies:
            acc.totalBasicSupplies + Number(section.totals.totalBasicSupplies || 0),
          totalLabor: acc.totalLabor + Number(section.totals.totalLabor || 0),
          laborDeviationAmount:
            acc.laborDeviationAmount + Number(section.totals.laborDeviationAmount || 0),
          fixedCostsApplied:
            acc.fixedCostsApplied + Number(section.totals.fixedCostsApplied || 0),
          deviationAmount: acc.deviationAmount + Number(section.totals.deviationAmount || 0),
          totalCost: acc.totalCost + Number(section.totals.totalCost || 0),
          totalIncreaseAmount:
            acc.totalIncreaseAmount + Number(section.totals.totalIncreaseAmount || 0),
          preDiscountNetPrice:
            acc.preDiscountNetPrice + Number(section.totals.preDiscountNetPrice || 0),
          totalDiscountAmount:
            acc.totalDiscountAmount + Number(section.totals.totalDiscountAmount || 0),
          netPrice: acc.netPrice + Number(section.totals.netPrice || 0),
          finalPrice: acc.finalPrice + Number(section.totals.finalPrice || 0),
          totalJobHours: acc.totalJobHours + Number(section.totals.totalJobHours || 0),
          totalAvailableHours:
            acc.totalAvailableHours + Number(section.totals.totalAvailableHours || 0),
          occupancyPct: 0,
        }),
        {
          totalMaterials: 0,
          totalBasicSupplies: 0,
          totalLabor: 0,
          laborDeviationAmount: 0,
          fixedCostsApplied: 0,
          deviationAmount: 0,
          totalCost: 0,
          totalIncreaseAmount: 0,
          preDiscountNetPrice: 0,
          totalDiscountAmount: 0,
          netPrice: 0,
          finalPrice: 0,
          totalJobHours: 0,
          totalAvailableHours: 0,
          occupancyPct: 0,
        } as BudgetSectionTotals
      );

      return {
        ...reduced,
        occupancyPct:
          reduced.totalAvailableHours > 0
            ? (reduced.totalJobHours / reduced.totalAvailableHours) * 100
            : 0,
      };
    },
    [workingBudgetSections]
  );

  const consolidatedCommissionAmount =
    consolidatedBudgetTotals.netPrice * (commissionPct / 100);

  const billedPctNormalized = Math.max(0, Math.min(100, Number(budget.billedPct || 0)));
  const budgetWhiteNet = consolidatedBudgetTotals.netPrice * (billedPctNormalized / 100);
  const budgetWhiteVat = budgetWhiteNet * (vatPct / 100);
  const budgetWhiteTotal = budgetWhiteNet + budgetWhiteVat;
  const budgetBlackTotal = Math.max(0, consolidatedBudgetTotals.netPrice - budgetWhiteNet);

  const groupedSavedBudgets = useMemo(
    () =>
      COMPANY_OPTIONS.map((company) => ({
        ...company,
        items: visibleSavedBudgets.filter((item) => item.company === company.value),
      })).filter((group) => group.items.length > 0),
    [visibleSavedBudgets]
  );

  const approvedJobsSummary = useMemo(
    () =>
      visibleApprovedJobs.map((job) => {
        const billedNetFromPct = job.soldNetPrice * (job.billedPct / 100);
        const billedNet = job.invoices.length > 0
          ? job.invoices.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
          : billedNetFromPct;
        const invoiceVatAmount = job.invoices.length > 0
          ? job.invoices.reduce((acc, item) => acc + Number(item.vat || 0), 0)
          : billedNet * (Number(job.snapshot?.params?.vatPct ?? INVOICE_VAT_PCT) / 100);
        const billedGross = billedNet + invoiceVatAmount;
        const blackNet = Math.max(0, Number(job.soldNetPrice || 0) - billedNet);
        const additionalsTotal = (job.additionals || []).reduce(
          (acc, item) => acc + Number(item.amount || 0),
          0
        );
        const valueToCollect = job.soldNetPrice + additionalsTotal + invoiceVatAmount;
        const estimatedProductionDays =
          totalAvailableHours > 0 ? job.estimatedJobHours / (totalAvailableHours / 22 || 1) : 0;
        const paymentsTotal = job.payments.reduce((acc, item) => acc + Number(item.amount || 0), 0);
        const retentionsTotal = job.retentions.reduce((acc, item) => acc + Number(item.amount || 0), 0);
        const commissionPaidTotal = (job.commissionPayments || []).reduce(
          (acc, item) => acc + Number(item.amount || 0),
          0
        );
        const calendarCollected = visibleFinancialItems
          .filter(
            (item) =>
              item.jobCode === job.budgetNumber &&
              item.status === "realizado" &&
              item.type === "cobranza"
          )
          .reduce((acc, item) => acc + item.amount, 0);
        const financialCollected = paymentsTotal + retentionsTotal + calendarCollected;

        return {
          ...job,
          billedNet,
          invoiceVatAmount,
          billedGross,
          blackNet,
          valueToCollect,
          paymentsTotal,
          retentionsTotal,
          additionalsTotal,
          commissionPaidTotal,
          commissionPending: Math.max(0, Number(job.commissionAmount || 0) - commissionPaidTotal),
          collectedTotal: financialCollected,
          remainingToPay: Math.max(0, valueToCollect - financialCollected),
          estimatedProductionDays,
          estimatedDeliveryDate: job.deliveryDate,
        };
      }),
    [visibleApprovedJobs, visibleFinancialItems, totalAvailableHours]
  );

  const groupedApprovedJobs = useMemo(
    () =>
      COMPANY_OPTIONS.map((company) => ({
        ...company,
        items: approvedJobsSummary.filter((item) => item.company === company.value),
      })).filter((group) => group.items.length > 0),
    [approvedJobsSummary]
  );

  const crmClientRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        client: string;
        clientTaxId: string;
        contactName: string;
        contactPhone: string;
        contactEmail: string;
        clientNotes: string;
        quotes: SavedBudget[];
        approvedCount: number;
        totalSpent: number;
        companyLabels: string[];
      }
    >();

    visibleSavedBudgets.forEach((item) => {
      const key = normalizeClientKey(item.client);
      const approvedForClient = approvedJobsSummary.filter(
        (job) => normalizeClientKey(job.client) === key
      );
      const current = grouped.get(key) || {
        key,
        client: item.client,
        clientTaxId: item.snapshot.budget.clientTaxId || "",
        contactName: item.snapshot.budget.contactName,
        contactPhone: item.snapshot.budget.contactPhone,
        contactEmail: item.snapshot.budget.contactEmail,
        clientNotes: item.snapshot.budget.clientNotes,
        quotes: [],
        approvedCount: approvedForClient.length,
        totalSpent: approvedForClient.reduce((acc, job) => acc + Number(job.soldGrossPrice || 0), 0),
        companyLabels: [],
      };

      current.quotes.push(item);
      if (!current.clientTaxId) current.clientTaxId = item.snapshot.budget.clientTaxId || "";
      if (!current.contactName) current.contactName = item.snapshot.budget.contactName;
      if (!current.contactPhone) current.contactPhone = item.snapshot.budget.contactPhone;
      if (!current.contactEmail) current.contactEmail = item.snapshot.budget.contactEmail;
      if (!current.clientNotes) current.clientNotes = item.snapshot.budget.clientNotes;
      current.companyLabels = Array.from(
        new Set([...current.companyLabels, getCompanyMeta(item.company).short])
      );
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((row) => {
        const quotes = [...row.quotes].sort((a, b) => {
          const byDate = b.date.localeCompare(a.date);
          if (byDate !== 0) return byDate;
          return (b.revisionNumber || 1) - (a.revisionNumber || 1);
        });
        return {
          ...row,
          quotes,
          latestQuote: quotes[0] || null,
          customerType:
            quotes.length > 1 || row.approvedCount > 0 ? "Cliente habitual" : "Nuevo cliente",
          bought: row.approvedCount > 0,
        };
      })
      .sort((a, b) => a.client.localeCompare(b.client));
  }, [visibleSavedBudgets, approvedJobsSummary]);

  const selectedCrmClient =
    selectedCrmClientKey !== null
      ? crmClientRows.find((item) => item.key === selectedCrmClientKey) || null
      : null;

  const saveCrmAndBudgetsToSupabase = async () => {
    if (!isSupabaseLoggedIn) {
      setStorageMessage("Inicia sesion en Supabase para guardar CRM y presupuestos.");
      return;
    }

    try {
      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user?.id;
      if (!userId) {
        throw new Error("No hay una sesion activa de Supabase.");
      }

      const budgetRows = savedBudgets.map((item) => ({
        local_id: item.id,
        root_budget_id: item.rootBudgetId,
        revision_number: item.revisionNumber,
        is_update: item.isUpdate,
        status: item.status,
        exported_as: item.exportedAs,
        number: item.number,
        company: item.company,
        client_key: normalizeClientKey(item.client),
        client_name: item.client,
        project: item.project,
        budget_date: item.date || null,
        delivery_term: item.deliveryTerm || "",
        delivery_destination: item.deliveryDestination || "",
        project_manager: item.projectManager || "",
        max_requirement_date: item.maxRequirementDate || null,
        commission_pct: Number(item.commissionPct || 0),
        commission_amount: Number(item.commissionAmount || 0),
        total_discount_amount: Number(item.totalDiscountAmount || 0),
        net_price: Number(item.netPrice || 0),
        final_price: Number(item.finalPrice || 0),
        labor_occupancy_pct: Number(item.laborOccupancyPct || 0),
        exported_at: item.exportedAt || null,
        snapshot: item.snapshot,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }));

      const crmRows = crmClientRows.map((row) => ({
        client_key: row.key,
        client_name: row.client,
        tax_id: row.clientTaxId || "",
        contact_name: row.contactName || "",
        contact_phone: row.contactPhone || "",
        contact_email: row.contactEmail || "",
        client_notes: row.clientNotes || "",
        customer_type: row.customerType,
        bought: row.bought,
        total_spent: Number(row.totalSpent || 0),
        quotes_count: row.quotes.length,
        pending_export_count: row.quotes.filter((item) => !item.exportedAt).length,
        latest_quote_label: row.latestQuote ? getSavedBudgetDisplayLabel(row.latestQuote) : "",
        company_labels: row.companyLabels,
        payload: row,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }));

      if (budgetRows.length > 0) {
        const { error } = await supabase
          .from(SUPABASE_BUDGETS_TABLE)
          .upsert(budgetRows, { onConflict: "local_id" });
        if (error) {
          throw new Error(`No pude guardar presupuestos en Supabase: ${error.message}`);
        }
      }

      if (crmRows.length > 0) {
        const { error } = await supabase
          .from(SUPABASE_CRM_CLIENTS_TABLE)
          .upsert(crmRows, { onConflict: "client_key" });
        if (error) {
          throw new Error(`No pude guardar CRM en Supabase: ${error.message}`);
        }
      }

      if (effectiveIsAdmin) {
        const { data: existingBudgetRows, error: existingBudgetsError } = await supabase
          .from(SUPABASE_BUDGETS_TABLE)
          .select("local_id");
        if (existingBudgetsError) {
          throw new Error(
            `No pude revisar presupuestos existentes en Supabase: ${existingBudgetsError.message}`
          );
        }

        const existingBudgetIds = (existingBudgetRows || []).map((row) => Number(row.local_id));
        const currentBudgetIds = new Set(savedBudgets.map((item) => Number(item.id)));
        const budgetIdsToDelete = existingBudgetIds.filter((id) => !currentBudgetIds.has(id));
        if (budgetIdsToDelete.length > 0) {
          const { error } = await supabase
            .from(SUPABASE_BUDGETS_TABLE)
            .delete()
            .in("local_id", budgetIdsToDelete);
          if (error) {
            throw new Error(`No pude limpiar presupuestos viejos: ${error.message}`);
          }
        }

        const { data: existingClientRows, error: existingClientsError } = await supabase
          .from(SUPABASE_CRM_CLIENTS_TABLE)
          .select("client_key");
        if (existingClientsError) {
          throw new Error(
            `No pude revisar clientes CRM existentes en Supabase: ${existingClientsError.message}`
          );
        }

        const existingClientKeys = (existingClientRows || []).map((row) => String(row.client_key));
        const currentClientKeys = new Set(crmClientRows.map((item) => item.key));
        const clientKeysToDelete = existingClientKeys.filter((key) => !currentClientKeys.has(key));
        if (clientKeysToDelete.length > 0) {
          const { error } = await supabase
            .from(SUPABASE_CRM_CLIENTS_TABLE)
            .delete()
            .in("client_key", clientKeysToDelete);
          if (error) {
            throw new Error(`No pude limpiar clientes CRM viejos: ${error.message}`);
          }
        }
      }

      setStorageMessage("CRM y presupuestos guardados en tablas reales de Supabase.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error
          ? error.message
          : "No pude guardar CRM y presupuestos en Supabase."
      );
    }
  };

  const restoreCrmAndBudgetsFromSupabase = async () => {
    if (!isSupabaseLoggedIn) {
      setStorageMessage("Inicia sesion en Supabase para restaurar CRM y presupuestos.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from(SUPABASE_BUDGETS_TABLE)
        .select("*")
        .order("budget_date", { ascending: false });

      if (error) {
        throw new Error(`No pude leer presupuestos reales desde Supabase: ${error.message}`);
      }

      const restoredBudgets = ((data || []) as any[])
        .map((row): SavedBudget | null => {
          const snapshot = row.snapshot as BudgetSnapshot | null;
          const company = row.company as CompanyName;
          if (!snapshot || !COMPANY_OPTIONS.some((item) => item.value === company)) {
            return null;
          }

          return {
            id: Number(row.local_id),
            rootBudgetId: Number(row.root_budget_id || row.local_id),
            revisionNumber: Number(row.revision_number || 1),
            isUpdate: !!row.is_update,
            status: row.status as SavedBudget["status"],
            exportedAs: "presupuesto",
            number: row.number || snapshot.budget.number,
            company,
            client: row.client_name || snapshot.budget.client,
            project: row.project || snapshot.budget.project,
            date: row.budget_date || snapshot.budget.date,
            deliveryTerm: row.delivery_term || snapshot.budget.deliveryTerm || "",
            deliveryDestination:
              row.delivery_destination || snapshot.budget.deliveryDestination || "",
            projectManager: row.project_manager || snapshot.budget.projectManager || "",
            maxRequirementDate:
              row.max_requirement_date || snapshot.budget.maxRequirementDate || "",
            commissionPct: Number(row.commission_pct || 0),
            commissionAmount: Number(row.commission_amount || 0),
            totalDiscountAmount: Number(row.total_discount_amount || 0),
            netPrice: Number(row.net_price || 0),
            finalPrice: Number(row.final_price || 0),
            laborOccupancyPct: Number(row.labor_occupancy_pct || 0),
            exportedAt: row.exported_at || undefined,
            snapshot,
          };
        })
        .filter((item): item is SavedBudget => item !== null);

      setSavedBudgets(restoredBudgets);
      setSelectedHistoryId(null);
      setSelectedCrmClientKey(null);
      setStorageMessage("CRM y presupuestos restaurados desde tablas reales de Supabase.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error
          ? error.message
          : "No pude restaurar CRM y presupuestos desde Supabase."
      );
    }
  };

  const stockNeedRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        description: string;
        unit: string;
        required: number;
        available: number;
        missing: number;
        estimatedCost: number;
        companyLabels: string[];
        jobs: string[];
      }
    >();

    approvedJobsSummary
      .filter((job) => job.executionStatus !== "finalizado")
      .forEach((job) => {
        job.snapshot.materials.forEach((material) => {
          const key = material.description.trim().toLowerCase();
          const stockMatch = stockByDescription.get(key);
          const available = Number(stockMatch?.quantity || 0);
          const existing = grouped.get(key);
          const required = (existing?.required ?? 0) + Number(material.qty || 0);
          const missing = Math.max(0, required - available);
          grouped.set(key, {
            description: material.description,
            unit: material.unit,
            required,
            available,
            missing,
            estimatedCost: missing * Number(material.unitPrice || 0),
            companyLabels: existing
              ? Array.from(new Set([...existing.companyLabels, getCompanyMeta(job.company).short]))
              : [getCompanyMeta(job.company).short],
            jobs: existing ? [...existing.jobs, job.budgetNumber] : [job.budgetNumber],
          });
        });
      });

    return Array.from(grouped.values()).sort((a, b) =>
      a.description.localeCompare(b.description)
    );
  }, [approvedJobsSummary, stockByDescription]);

  const purchaseCalendarRows = useMemo(
    () =>
      approvedJobsSummary
        .filter((job) => job.startDate)
        .map((job) => ({
          id: job.id,
          company: job.company,
          budgetNumber: job.budgetNumber,
          client: job.client,
          startDate: job.startDate,
          deadlineDate: job.startDate,
          missingCount: job.snapshot.materials.filter((material) => {
            const stockMatch = stockByDescription.get(material.description.trim().toLowerCase());
            return Number(stockMatch?.quantity || 0) < Number(material.qty || 0);
          }).length,
        }))
        .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate)),
    [approvedJobsSummary, stockByDescription]
  );

  const totalPurchaseNeed = useMemo(
    () => stockNeedRows.reduce((acc, item) => acc + Number(item.estimatedCost || 0), 0),
    [stockNeedRows]
  );

  const pettyCashSummary = useMemo(() => {
    const assignedTotal = visiblePettyCashFunds
      .filter((item) => item.active)
      .reduce((acc, item) => acc + Number(item.assignedAmount || 0), 0);
    const renderedTotal = visiblePettyCashExpenses.reduce(
      (acc, item) => acc + Number(item.amount || 0),
      0
    );
    const whiteTotal = visiblePettyCashExpenses
      .filter((item) => item.administration === "blanco")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const blackTotal = visiblePettyCashExpenses
      .filter((item) => item.administration === "negro")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      assignedTotal,
      renderedTotal,
      whiteTotal,
      blackTotal,
      pendingBalance: assignedTotal - renderedTotal,
    };
  }, [visiblePettyCashFunds, visiblePettyCashExpenses]);

  const pettyCashFundSummaries = useMemo(
    () =>
      visiblePettyCashFunds.map((fund) => {
        const expenses = visiblePettyCashExpenses
          .filter((item) => item.fundId === fund.id)
          .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id);
        const renderedTotal = expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0);
        const whiteTotal = expenses
          .filter((item) => item.administration === "blanco")
          .reduce((acc, item) => acc + Number(item.amount || 0), 0);
        const blackTotal = expenses
          .filter((item) => item.administration === "negro")
          .reduce((acc, item) => acc + Number(item.amount || 0), 0);
        return {
          fund,
          expenses,
          renderedTotal,
          whiteTotal,
          blackTotal,
          remainingBalance: Number(fund.assignedAmount || 0) - renderedTotal,
        };
      }),
    [visiblePettyCashExpenses, visiblePettyCashFunds]
  );

  // Neteo de deuda por responsable: si una caja se sobregira, la empresa le queda debiendo al
  // responsable. Cuando se le asigna OTRA caja, lo que le queda por gastar se descuenta de esa deuda
  // (figura como "Ajuste de deuda" en la caja nueva). Procesa las cajas del responsable por orden de
  // creacion arrastrando la deuda. Devuelve por caja: ajuste aplicado y saldo real para gastar; y la
  // deuda neta total que la empresa sigue debiendo a los responsables.
  const { fundDebtAdjustments, totalResponsibleDebt } = useMemo(() => {
    const map = new Map<number, { ajuste: number; adjustedRemaining: number }>();
    const byResponsible = new Map<string, typeof pettyCashFundSummaries>();
    pettyCashFundSummaries.forEach((entry) => {
      const key =
        (entry.fund.responsible || "").trim().toLowerCase() || `__sin_responsable_${entry.fund.id}`;
      const list = byResponsible.get(key) || [];
      list.push(entry);
      byResponsible.set(key, list);
    });
    let totalDebt = 0;
    byResponsible.forEach((funds) => {
      const ordered = funds.slice().sort((a, b) => a.fund.id - b.fund.id);
      let carriedDebt = 0;
      ordered.forEach((entry) => {
        const own = entry.remainingBalance; // asignado - rendido
        if (own < 0) {
          carriedDebt += -own;
          map.set(entry.fund.id, { ajuste: 0, adjustedRemaining: own });
        } else if (carriedDebt > 0) {
          const ajuste = Math.min(own, carriedDebt);
          carriedDebt -= ajuste;
          map.set(entry.fund.id, { ajuste, adjustedRemaining: own - ajuste });
        } else {
          map.set(entry.fund.id, { ajuste: 0, adjustedRemaining: own });
        }
      });
      totalDebt += carriedDebt;
    });
    return { fundDebtAdjustments: map, totalResponsibleDebt: totalDebt };
  }, [pettyCashFundSummaries]);

  // Rendicion por responsable: agrupa las cajas de cada responsable para ver su evolucion y la
  // posicion neta (asignado - rendido). net<0 = la empresa le debe; net>0 = tiene saldo a rendir
  // (plata de la empresa en su poder); net=0 = al dia.
  const responsibleRendicion = useMemo(() => {
    const map = new Map<
      string,
      {
        responsible: string;
        funds: typeof pettyCashFundSummaries;
        totalAssigned: number;
        totalRendered: number;
      }
    >();
    pettyCashFundSummaries.forEach((entry) => {
      const name = (entry.fund.responsible || "").trim() || "Sin responsable";
      const key = name.toLowerCase();
      const cur =
        map.get(key) || { responsible: name, funds: [], totalAssigned: 0, totalRendered: 0 };
      cur.funds.push(entry);
      cur.totalAssigned += Number(entry.fund.assignedAmount || 0);
      cur.totalRendered += entry.renderedTotal;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, net: r.totalAssigned - r.totalRendered }))
      .sort((a, b) => a.responsible.localeCompare(b.responsible));
  }, [pettyCashFundSummaries]);

  useEffect(() => {
    setPettyCashFunds((prev) => {
      let changed = false;
      const next = prev.map((fund) => {
        const renderedTotal = pettyCashExpenses
          .filter((item) => item.fundId === fund.id)
          .reduce((acc, item) => acc + Number(item.amount || 0), 0);
        const remainingBalance = Number(fund.assignedAmount || 0) - renderedTotal;

        if (remainingBalance <= 0 && !fund.closed) {
          changed = true;
          return {
            ...fund,
            active: false,
            closed: true,
            closedDate: todayIso(),
          };
        }

        return fund;
      });

      return changed ? next : prev;
    });
  }, [pettyCashExpenses]);

  const appendAssistantMessage = (role: "user" | "assistant", text: string) => {
    setAssistantMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role,
        text,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const pushNotification = (text: string) => {
    setNotifications((prev) => [
      {
        id: newId(),
        text,
        created_at: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const announceSystemChange = (text: string) => {
    pushNotification(text);
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const addCompanyCatalogEntry = () => {
    const value = newCompanyDraft.value.trim();
    const short = newCompanyDraft.short.trim();

    if (!value || !short) {
      setStorageMessage("Para agregar una empresa nueva, completa razon social y nombre corto.");
      return;
    }

    if (companyCatalog.some((item) => item.value.toLowerCase() === value.toLowerCase())) {
      setStorageMessage("Esa empresa ya existe en el sistema.");
      return;
    }

    const nextCatalog = [...companyCatalog, { ...newCompanyDraft, value, short }];
    setCompanyCatalog(nextCatalog);
    runtimeCompanyOptions = nextCatalog;
    setNewCompanyDraft({
      value: "",
      short: "",
      primary: "#1d4ed8",
      soft: "#dbeafe",
      taxId: "",
      bankName: "",
      bankAlias: "",
      bankCbu: "",
      bankAccount: "",
    });
    setStorageMessage(
      "Empresa agregada al sistema. Recuerda darla de alta tambien en Supabase para permisos y seguridad."
    );
  };

  const describeCollaboratorContext = (userId: string | null | undefined) => {
    const session = supabaseActiveSessions.find((item) => item.user_id === userId);
    const actorName =
      session?.full_name || session?.email || (userId === supabaseSession?.user?.id ? "Tu usuario" : "Otro usuario");

    if (!session) {
      return { actorName, location: "en el sistema" };
    }

    const tabLabel = getTabLabel(session.active_tab);
    const companyLabel =
      typeof session.current_company === "string" &&
      session.current_company &&
      session.current_company !== "General"
        ? ` (${getCompanyMeta(session.current_company as CompanyName).short})`
        : "";

    return {
      actorName,
      location: `en ${tabLabel}${companyLabel}`,
    };
  };

  const applyIncomingSupabaseSnapshot = (
    record: SupabaseSnapshotRecord | null,
    source: "realtime" | "poll"
  ) => {
    if (!record?.payload || !record.saved_at) return;

    const eventModuleKey = (record.module_keys || []).join("|");
    const eventKey = `${record.updated_by || "sin-usuario"}__${record.saved_at}__${eventModuleKey}`;
    if (lastSnapshotEventKeyRef.current === eventKey) return;

    const remoteSavedAt = new Date(record.saved_at).getTime();
    const localSnapshotSavedAt = lastSupabaseSnapshotSavedAtRef.current;
    const localSavedAt = localSnapshotSavedAt
      ? new Date(localSnapshotSavedAt).getTime()
      : 0;

    if (!Number.isFinite(remoteSavedAt) || remoteSavedAt < localSavedAt) return;

    lastSnapshotEventKeyRef.current = eventKey;

    if (record.updated_by && record.updated_by === supabaseSession?.user?.id) {
      lastSupabaseSnapshotSavedAtRef.current = record.saved_at;
      return;
    }

    const normalized = normalizePersistedAppState({
      ...(record.payload as Record<string, unknown>),
      savedAt: record.saved_at,
    });

    if (!normalized) return;

    const incomingSignature = buildPersistedDataSignature(normalized.data);
    if (incomingSignature === lastPersistedDataSignatureRef.current) {
      pendingRemoteSnapshotRef.current = null;
      setPendingRealtimeRefresh(null);
      lastSupabaseSnapshotSavedAtRef.current = normalized.savedAt;
      lastSupabaseModuleSignaturesRef.current = buildPersistedModuleSignatures(
        normalized.data
      );
      lastRealtimeModuleMergeSavedAtRef.current = normalized.savedAt;
      lastRealtimeModuleMergedDataRef.current = normalized.data;
      return;
    }

    lastSupabaseSnapshotSavedAtRef.current = normalized.savedAt;
    const currentSignature = buildPersistedDataSignature(buildPersistedAppData());
    const hasLocalUnsyncedChanges =
      currentSignature !== lastPersistedDataSignatureRef.current;
    const collaborator = describeCollaboratorContext(record.updated_by);
    const moduleText = formatPersistenceModuleList(record.module_keys);
    const changeText = `${collaborator.actorName} guardo cambios en ${moduleText}.`;

    if (hasLocalUnsyncedChanges) {
      pendingRemoteSnapshotRef.current = normalized;
      setPendingRealtimeRefresh({
        text: changeText,
        savedAt: normalized.savedAt,
      });
      setStorageMessage(
        "Hay una version mas nueva guardada en Supabase. Pulsa Refresh antes de seguir para no perder tus cambios locales."
      );
      announceSystemChange(
        `${collaborator.actorName} guardo cambios en ${moduleText} ${collaborator.location}. Pulsa refresh para cargar la ultima version compartida sin pisar tus cambios locales.`
      );
      return;
    }

    pendingRemoteSnapshotRef.current = null;
    lastAppliedRemoteSnapshotAtRef.current = Date.now();
    applyPersistedAppData(normalized.data);
    lastPersistedDataSignatureRef.current = incomingSignature;
    lastSupabaseModuleSignaturesRef.current = buildPersistedModuleSignatures(
      normalized.data
    );
    lastRealtimeModuleMergeSavedAtRef.current = normalized.savedAt;
    lastRealtimeModuleMergedDataRef.current = normalized.data;
    setLastSavedAt(normalized.savedAt);
    setPendingRealtimeRefresh(null);
    setStorageMessage(
      source === "realtime"
        ? `Se actualizo automaticamente ${moduleText} desde Supabase.`
        : `Se recupero automaticamente una version mas nueva de ${moduleText} desde Supabase.`
    );
    announceSystemChange(
      `${collaborator.actorName} guardo cambios en ${moduleText} ${collaborator.location}. ${
        source === "realtime"
          ? "La version compartida ya se aplico automaticamente."
          : "La sincronizacion recupero una version mas nueva."
      }`
    );
  };

  const buildSystemAssistantReply = (question: string) => {
    const normalized = question.trim().toLowerCase();

    if (!normalized) {
      return "Escribe una consulta y te doy un resumen del sistema.";
    }

    if (
      normalized.includes("guardado") ||
      normalized.includes("supabase") ||
      normalized.includes("sincron")
    ) {
      return `El ultimo guardado visible figura en ${formatDateTimeDisplay(lastSavedAt)}. ${
        storageMessage || "No hay alertas de guardado en este momento."
      }`;
    }

    if (
      normalized.includes("usuario") ||
      normalized.includes("simult") ||
      normalized.includes("operando") ||
      normalized.includes("equipo")
    ) {
      return otherActiveSessions.length === 0
        ? "Ahora no detecto otros usuarios operando en simultaneo."
        : `Hay ${otherActiveSessions.length} usuario(s) operando: ${otherActiveSessions
            .map((item) => `${item.full_name || item.email} en ${getTabLabel(item.active_tab)}`)
            .join(", ")}.`;
    }

    if (normalized.includes("presupuesto") || normalized.includes("presupuestos")) {
      return `Hoy tienes ${visibleSavedBudgets.length} presupuesto(s) visibles para esta sesion. El presupuesto actual esta configurado para ${getCompanyMeta(
        budget.company
      ).short} y cliente ${budget.client || "sin cliente cargado"}.`;
    }

    if (normalized.includes("stock") || normalized.includes("material")) {
      const stockValue = visibleStockItems.reduce(
        (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      );
      return `Hay ${visibleStockItems.length} item(s) de stock visibles. El valor estimado total del stock visible es ${money(
        stockValue
      )}.`;
    }

    if (normalized.includes("caja") || normalized.includes("chica")) {
      return `Caja chica muestra ${pettyCashTrackingRows.length} gasto(s) aplicado(s). Monto asignado ${money(
        pettyCashSummary.assignedTotal
      )}, rendido ${money(pettyCashSummary.renderedTotal)} y saldo pendiente ${money(
        pettyCashSummary.pendingBalance
      )}.`;
    }

    if (
      normalized.includes("compra") ||
      normalized.includes("compras") ||
      normalized.includes("factura")
    ) {
      return `Hay ${visiblePurchaseInvoices.length} factura(s) de compra visibles en esta sesion. Si quieres, puedo ayudarte a revisar pendientes y fechas de pago.`;
    }

    if (
      normalized.includes("crm") ||
      normalized.includes("historial") ||
      normalized.includes("cliente")
    ) {
      return `CRM muestra ${crmClientRows.length} cliente(s) consolidado(s) en esta sesion. El historial completo de presupuestos esta al final de Presupuesto actual.`;
    }

    return "Puedo darte un resumen rapido de presupuestos, stock, caja chica, compras, CRM, guardado compartido y usuarios activos. Prueba con una pregunta concreta.";
  };

  const sendAssistantQuestion = () => {
    const trimmed = assistantDraft.trim();
    if (!trimmed) return;
    appendAssistantMessage("user", trimmed);
    appendAssistantMessage("assistant", buildSystemAssistantReply(trimmed));
    setAssistantDraft("");
  };

  const purchaseInvoicesWithPettyCashWhite = useMemo(() => {
    const linkedWhiteInvoices: PurchaseInvoice[] = visiblePettyCashExpenses
      .filter((item) => item.administration === "blanco")
      .map((item) => ({
        id: Number(item.linkedPurchaseInvoiceId || item.id),
        company: item.company,
        administration: "blanco",
        source: "caja_chica",
        pettyCashExpenseId: item.id,
        supplier: item.supplier || "Caja chica",
        taxId: "",
        receiptKind: "Factura caja chica",
        receiptLetter: "",
        invoiceNumber: item.invoiceNumber || "",
        invoiceDate: item.date,
        currency: "ARS",
        exemptAmount: 0,
        net21: Number(item.amount || 0),
        subtotal: Number(item.amount || 0),
        vat: 0,
        total: Number(item.amount || 0),
        notes: item.notes || "Importado desde caja chica",
        attachmentName: item.attachmentName,
        extractedAutomatically: false,
      }));

    return [...visiblePurchaseInvoices, ...linkedWhiteInvoices];
  }, [visiblePurchaseInvoices, visiblePettyCashExpenses]);

  const purchaseInvoiceSummary = useMemo(() => {
    const invoicesCount = purchaseInvoicesWithPettyCashWhite.length;
    const autoLoadedCount = purchaseInvoicesWithPettyCashWhite.filter((item) => item.extractedAutomatically).length;
    const exemptAmount = purchaseInvoicesWithPettyCashWhite.reduce(
      (acc, item) => acc + Number(item.exemptAmount || 0),
      0
    );
    const net21 = purchaseInvoicesWithPettyCashWhite.reduce((acc, item) => acc + Number(item.net21 || 0), 0);
    const vatAmount = purchaseInvoicesWithPettyCashWhite.reduce((acc, item) => acc + Number(item.vat || 0), 0);
    const totalAmount = purchaseInvoicesWithPettyCashWhite.reduce((acc, item) => acc + Number(item.total || 0), 0);
    return {
      invoicesCount,
      autoLoadedCount,
      exemptAmount,
      net21,
      vatAmount,
      totalAmount,
    };
  }, [purchaseInvoicesWithPettyCashWhite]);

  const approvedJobsTimelineRows = useMemo(
    () =>
      approvedJobsSummary.map((job) => {
        const start = job.startDate || job.approvalDate;
        const end = job.deliveryDate || start;
        const totalDays = Math.max(
          1,
          Math.ceil(
            (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
          )
        );
        const elapsedDays = Math.max(
          0,
          Math.ceil(
            (new Date(todayIso()).getTime() - new Date(start).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const timeProgressPct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
        const statusProgressPct =
          job.executionStatus === "finalizado"
            ? 100
            : job.executionStatus === "en_curso"
            ? 60
            : 12;
        const materialMissingCount = job.snapshot.materials.filter((material) => {
          const stockMatch = stockByDescription.get(material.description.trim().toLowerCase());
          return Number(stockMatch?.quantity || 0) < Number(material.qty || 0);
        }).length;
        return {
          ...job,
          start,
          end,
          totalDays,
          elapsedDays,
          timeProgressPct,
          statusProgressPct,
          materialMissingCount,
        };
      }),
    [approvedJobsSummary, stockByDescription]
  );

  const activeAssetsMonthlyDepreciation = useMemo(
    () =>
      visibleCompanyAssets
        .filter((item) => item.active)
        .reduce(
          (acc, item) => acc + Number(item.value || 0) / Math.max(Number(item.usefulLifeMonths || 1), 1),
          0
        ),
    [visibleCompanyAssets]
  );

  const cashFlowSummary = useMemo(() => {
    const pendingCollections = approvedJobsSummary.reduce(
      (acc, item) => acc + Number(item.remainingToPay || 0),
      0
    );
    const billedGross = approvedJobsSummary.reduce(
      (acc, item) => acc + Number(item.billedGross || 0),
      0
    );
    const collected = approvedJobsSummary.reduce(
      (acc, item) => acc + Number(item.collectedTotal || 0),
      0
    );
    const purchaseInvoicesTotal = purchaseInvoicesWithPettyCashWhite.reduce(
      (acc, item) => acc + Number(item.total || 0),
      0
    );
    const approvedJobsBlackTotal = approvedJobsSummary.reduce(
      (acc, item) => acc + Number(item.blackNet || 0),
      0
    );
    const pettyCashBlackTotal = visiblePettyCashExpenses
      .filter((item) => item.administration === "negro")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const pettyCashWhiteTotal = visiblePettyCashExpenses
      .filter((item) => item.administration === "blanco")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const commissionsPending = approvedJobsSummary.reduce(
      (acc, item) => acc + Number(item.commissionPending || 0),
      0
    );
    const bankCredits = visibleBankStatementEntries
      .filter((item) => item.movementType === "credito")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const bankDebits = visibleBankStatementEntries
      .filter((item) => item.movementType === "debito")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      billedGross,
      collected,
      pendingCollections,
      purchaseInvoicesTotal,
      pettyCashWhiteTotal,
      pettyCashBlackTotal,
      commissionsPending,
      bankCredits,
      bankDebits,
      operatingResultWhite:
        collected -
        purchaseInvoicesTotal -
        commissionsPending -
        activeAssetsMonthlyDepreciation -
        bankDebits +
        bankCredits,
      operatingResultBlack: approvedJobsBlackTotal - pettyCashBlackTotal,
      operatingResult:
        collected -
        purchaseInvoicesTotal -
        pettyCashBlackTotal -
        commissionsPending -
        activeAssetsMonthlyDepreciation -
        bankDebits +
        bankCredits,
    };
  }, [
    approvedJobsSummary,
    purchaseInvoicesWithPettyCashWhite,
    approvedJobsSummary,
    visiblePettyCashExpenses,
    activeAssetsMonthlyDepreciation,
    visibleBankStatementEntries,
  ]);

  const fabricationPendingPurchases = useMemo(
    () => stockNeedRows.filter((row) => Number(row.missing || 0) > 0),
    [stockNeedRows]
  );

  const fabricationCompletedPurchases = useMemo(
    () =>
      [...visiblePurchaseInvoices].sort((a, b) => {
        const byDate = (b.invoiceDate || "").localeCompare(a.invoiceDate || "");
        if (byDate !== 0) return byDate;
        return String(b.invoiceNumber || "").localeCompare(String(a.invoiceNumber || ""));
      }),
    [visiblePurchaseInvoices]
  );

  const fabricationCalendarRows = useMemo(
    () =>
      [...approvedJobsTimelineRows].sort((a, b) => {
        const aDate = a.start || a.approvalDate || "";
        const bDate = b.start || b.approvalDate || "";
        return aDate.localeCompare(bDate);
      }),
    [approvedJobsTimelineRows]
  );

  const fabricationGanttTimeline = useMemo(() => {
    if (fabricationCalendarRows.length === 0) {
      return {
        start: todayIso(),
        end: todayIso(),
        dayLabels: [] as Array<{ key: string; label: string; weekend: boolean }>,
        totalDays: 1,
      };
    }

    const starts = fabricationCalendarRows.map((job) => new Date(job.start || job.approvalDate || todayIso()).getTime());
    const ends = fabricationCalendarRows.map((job) => new Date(job.end || job.deliveryDate || job.start || todayIso()).getTime());
    const minTime = Math.min(...starts);
    const maxTime = Math.max(...ends);
    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);

    startDate.setDate(startDate.getDate() - 3);
    endDate.setDate(endDate.getDate() + 3);

    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const dayLabels = Array.from({ length: totalDays }).map((_, index) => {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + index);
      const weekday = current.getDay();
      return {
        key: current.toISOString().slice(0, 10),
        label: `${String(current.getDate()).padStart(2, "0")}/${String(
          current.getMonth() + 1
        ).padStart(2, "0")}`,
        weekend: weekday === 0 || weekday === 6,
      };
    });

    return {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
      dayLabels,
      totalDays,
    };
  }, [fabricationCalendarRows]);

  const fabricationOpenJobsCount = fabricationCalendarRows.filter(
    (job) => job.executionStatus !== "finalizado"
  ).length;

  const fabricationInProgressCount = fabricationCalendarRows.filter(
    (job) => job.executionStatus === "en_curso"
  ).length;

  const fabricationUpcomingDeliveries = fabricationCalendarRows.filter(
    (job) => job.executionStatus !== "finalizado" && !!job.deliveryDate
  ).length;

  const fabricationOccupancyAvailablePct = Math.max(0, 100 - Number(occupancyPct || 0));

  const selectedBudget = selectedHistoryId
    ? visibleSavedBudgets.find((item) => item.id === selectedHistoryId) || null
    : null;

  const openBudgetHistoryItem = (budgetId: number) => {
    if (!visibleTabOptions.some((item) => item.key === "presupuesto")) {
      setStorageMessage("Necesitas acceso a Presupuesto actual para ver el historial completo.");
      return;
    }

    setSelectedHistoryId(budgetId);
    setActiveTab("presupuesto");
  };

  const selectedApprovedJob = selectedApprovedJobId
    ? approvedJobsSummary.find((item) => item.id === selectedApprovedJobId) || null
    : null;

  const currentClientHistory = useMemo(
    () =>
      budget.client.trim()
        ? visibleSavedBudgets
            .filter((item) => normalizeClientKey(item.client) === normalizeClientKey(budget.client))
            .sort((a, b) => {
              const byDate = b.date.localeCompare(a.date);
              if (byDate !== 0) return byDate;
              return (b.revisionNumber || 1) - (a.revisionNumber || 1);
            })
        : [],
    [visibleSavedBudgets, budget.client]
  );

  const buildAutoFinancialItemsForJob = (job: ApprovedJob): FinancialCalendarItem[] => {
    const { anticipoPct } = parsePaymentPercents(job.snapshot.budget.paymentTerms || "");
    const anticipoAmount = Number(
      ((job.soldGrossPrice || 0) * (anticipoPct / 100)).toFixed(2)
    );
    const saldoAmount = Number(Math.max(0, (job.soldGrossPrice || 0) - anticipoAmount).toFixed(2));
    const facturaAmount = Number(
      (((job.soldGrossPrice || 0) * Number(job.billedPct || 0)) / 100).toFixed(2)
    );

    return [
      {
        id: newId(),
        company: job.company,
        date: job.approvalDate,
        type: "facturacion",
        status: "pendiente",
        title: "Factura vinculada al trabajo aprobado",
        jobCode: job.budgetNumber,
        client: job.client,
        amount: facturaAmount,
        notes: "Generado automaticamente desde Trabajos aprobados.",
        autoGenerated: true,
        sourceJobId: job.id,
        preset: "factura",
      },
      {
        id: newId(),
        company: job.company,
        date: job.approvalDate,
        type: "cobranza",
        status: "pendiente",
        title: "Pago anticipo",
        jobCode: job.budgetNumber,
        client: job.client,
        amount: anticipoAmount,
        notes: "Anticipo calculado desde la forma de pago del presupuesto.",
        autoGenerated: true,
        sourceJobId: job.id,
        preset: "anticipo",
      },
      {
        id: newId(),
        company: job.company,
        date: job.deliveryDate,
        type: "cobranza",
        status: "pendiente",
        title: "Pago saldo",
        jobCode: job.budgetNumber,
        client: job.client,
        amount: saldoAmount,
        notes: "Saldo calculado como diferencia entre el total y el anticipo.",
        autoGenerated: true,
        sourceJobId: job.id,
        preset: "saldo",
      },
    ];
  };

  const selectedFinancialItem = selectedFinancialItemId
    ? visibleFinancialItems.find((item) => item.id === selectedFinancialItemId) || null
    : null;

  const selectedEmployee = selectedEmployeeId
    ? visibleEmployees.find((item) => item.id === selectedEmployeeId) || null
    : null;

  useEffect(() => {
    let cancelled = false;

    const restoreInitialState = async () => {
      try {
        const sessionResult = await supabase.auth.getSession();
        const hasSupabaseSession = !!sessionResult.data.session?.user;
        const persisted = hasSupabaseSession
          ? (await readSupabasePersistedAppState()) || (await readPersistedAppState())
          : await readPersistedAppState();
        if (cancelled) return;
        if (persisted) {
          applyPersistedAppData(persisted.data);
          lastPersistedDataSignatureRef.current = buildPersistedDataSignature(
            persisted.data
          );
          if (!hasSupabaseSession) setActiveTab("acceso");
          setLastSavedAt(persisted.savedAt);
          setStorageMessage(
            hasSupabaseSession
              ? "Guardado restaurado desde Supabase. Ya puedes seguir trabajando."
              : "Guardado local restaurado. Ya puedes seguir trabajando."
          );
        }
        if (hasSupabaseSession) {
          setIsSupabaseSnapshotReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setStorageMessage(
            error instanceof Error
              ? error.message
              : "No pude restaurar el guardado local."
          );
        }
      } finally {
        if (!cancelled) setIsPersistenceReady(true);
      }
    };

    restoreInitialState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseLoggedIn) {
      if (activeTab !== "acceso") setActiveTab("acceso");
      return;
    }
    if (!visibleTabOptions.some((item) => item.key === activeTab)) {
      setActiveTab(visibleTabOptions[0]?.key || "acceso");
    }
  }, [activeTab, isSupabaseLoggedIn, visibleTabOptions]);

  useEffect(() => {
    if (!isSupabaseLoggedIn || effectiveIsAdmin) return;
    if (!allowedCompaniesForSession.includes(budget.company)) {
      const fallbackCompany = allowedCompaniesForSession[0];
      if (!fallbackCompany) return;
      setBudget((prev) => ({
        ...prev,
        company: fallbackCompany,
        cuit: getCompanyTaxId(fallbackCompany),
      }));
    }
  }, [budget.company, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]);

  useEffect(() => {
    if (
      selectedEmployeeId !== null &&
      !visibleEmployees.some((item) => item.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId(null);
    }
  }, [visibleEmployees, selectedEmployeeId]);

  useEffect(() => {
    if (visibleFinancialItems.length > 0 && !visibleFinancialItems.some((item) => item.id === selectedFinancialItemId)) {
      setSelectedFinancialItemId(visibleFinancialItems[0].id);
    }
  }, [visibleFinancialItems, selectedFinancialItemId]);

  useEffect(() => {
    setFinancialItems((prev) => {
      const manualItems = prev.filter((item) => !item.autoGenerated);
      const previousAuto = prev.filter((item) => item.autoGenerated);
      const rebuiltAuto = approvedJobs.flatMap((job) =>
        buildAutoFinancialItemsForJob(job).map((generated) => {
          const existing = previousAuto.find(
            (item) =>
              item.sourceJobId === generated.sourceJobId && item.preset === generated.preset
          );
          return existing
            ? {
                ...generated,
                id: existing.id,
                status: existing.status,
                notes: existing.notes || generated.notes,
              }
            : generated;
        })
      );
      return [...rebuiltAuto, ...manualItems];
    });
  }, [approvedJobs]);

  const companyTheme = getCompanyMeta(budget.company);
  const workspaceTheme = useMemo(() => {
    if (workspaceCompanyScope === "General") {
      return {
        short: "General",
        primary: "#475569",
        soft: "#e2e8f0",
        pageBackground:
          "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 45%, #f8fafc 100%)",
        sidebarGradient:
          "linear-gradient(180deg, #334155 0%, #475569 100%)",
        sidebarActiveBackground:
          "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
        sidebarActiveBorder: "#cbd5e1",
        sidebarActiveShadow: "0 10px 24px rgba(71,85,105,0.18)",
        toolbarBackground: "#f8fafc",
        toolbarBorder: "#cbd5e1",
        bannerBackground: "#f8fafc",
        bannerBorder: "#cbd5e1",
      };
    }

    const meta = getCompanyMeta(workspaceCompanyScope);
    return {
      short: meta.short,
      primary: meta.primary,
      soft: meta.soft,
      pageBackground: `linear-gradient(180deg, ${hexToRgba(meta.soft, 0.78)} 0%, ${hexToRgba(
        meta.primary,
        0.08
      )} 52%, #f8fafc 100%)`,
      sidebarGradient: `linear-gradient(180deg, ${hexToRgba(meta.primary, 0.98)} 0%, ${hexToRgba(
        meta.primary,
        0.84
      )} 100%)`,
      sidebarActiveBackground: `linear-gradient(135deg, ${meta.soft} 0%, #ffffff 100%)`,
      sidebarActiveBorder: hexToRgba(meta.primary, 0.26),
      sidebarActiveShadow: `0 10px 24px ${hexToRgba(meta.primary, 0.2)}`,
      toolbarBackground: hexToRgba(meta.soft, 0.85),
      toolbarBorder: hexToRgba(meta.primary, 0.18),
      bannerBackground: hexToRgba(meta.soft, 0.78),
      bannerBorder: hexToRgba(meta.primary, 0.2),
    };
  }, [workspaceCompanyScope, companyCatalog]);

  const activeFixedMarkersForBudget = useMemo(
    () =>
      fixedMarkers.filter(
        (item) =>
          item.active &&
          (item.workType === budget.workType || item.workType === "General")
      ),
    [fixedMarkers, budget.workType]
  );

  const activeSupplyMarkersForBudget = useMemo(
    () =>
      supplyMarkers.filter(
        (item) =>
          item.active &&
          (item.workType === budget.workType || item.workType === "General")
      ),
    [supplyMarkers, budget.workType]
  );

  const activeLaborMarkersForBudget = useMemo(
    () =>
      laborMarkers.filter(
        (item) =>
          item.active &&
          (item.workType === budget.workType || item.workType === "General")
      ),
    [laborMarkers, budget.workType]
  );

  const activePersonalProvisionMonthlyTotal = useMemo(
    () =>
      personalProvisionMarkers
        .filter((item) => item.active)
        .reduce(
          (acc, item) =>
            acc +
            Number(item.amountPerDelivery || 0) /
              Math.max(Number(item.periodicityMonths || 1), 1),
          0
        ),
    [personalProvisionMarkers]
  );

  const mapFixedMarkerToBudgetRow = (item: FixedMarker): FixedCost => ({
    id: newId(),
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    description: `${item.group} - ${item.description}`,
    amount: item.amount,
  });

  const mapSupplyMarkerToBudgetRow = (item: SupplyMarker): Material => ({
    id: newId(),
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    description: item.description,
    qty: item.qty,
    unit: item.unit,
    unitPrice: item.unitPrice,
  });

  const mapLaborMarkerToBudgetRow = (item: LaborMarker): LaborRow => ({
    id: newId(),
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    category: item.category,
    employees: item.employees,
    monthlyHoursPerEmployee: item.monthlyHoursPerEmployee,
    hourlyRate: item.hourlyRate,
    jobHours: item.hoursBase,
  });

  const fixedMarkerGroupOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_FIXED_MARKER_GROUPS,
          ...fixedMarkers.map((item) => item.group.trim()).filter(Boolean),
          ...costAnalysisGroups.map((item) => item.name.trim()).filter(Boolean),
        ])
      ),
    [fixedMarkers, costAnalysisGroups]
  );

  const activeCostAnalysisEntriesForBudget = useMemo(
    () =>
      costAnalysisEntries
        .map((item) => ({
          ...item,
          groupMeta: costAnalysisGroups.find((group) => group.id === item.groupId) || null,
        }))
        .filter(
          (item) =>
            item.active &&
            item.groupMeta?.active &&
            (item.company === budget.company || item.company === "General") &&
            item.groupMeta.name.trim()
        ),
    [costAnalysisEntries, costAnalysisGroups, budget.company]
  );

  const derivedCostAnalysisFixedCostsForBudget = useMemo(() => {
    const grouped = new Map<string, number>();

    activeCostAnalysisEntriesForBudget.forEach((item) => {
      const groupName = item.groupMeta?.name?.trim() || "Analisis de costos";
      const current = grouped.get(groupName) || 0;
      grouped.set(
        groupName,
        current + Number(item.quantity || 0) * Number(item.unitCost || 0)
      );
    });

    return Array.from(grouped.entries()).map(([group, amount], index) => ({
      id: -100000 - index,
      description: `${group} - Analisis de costos`,
      amount,
    }));
  }, [activeCostAnalysisEntriesForBudget]);

  const activeFixedCostsFromSourcesForBudget = useMemo(
    () => [
      ...activeFixedMarkersForBudget.map(mapFixedMarkerToBudgetRow),
      ...derivedCostAnalysisFixedCostsForBudget,
    ],
    [activeFixedMarkersForBudget, derivedCostAnalysisFixedCostsForBudget]
  );

  const fixedMarkersByGroup = useMemo(
    () =>
      fixedMarkerGroupOptions.map((group) => {
        const markerTotal = fixedMarkers
          .filter(
            (item) =>
              item.group === group &&
              item.active &&
              (item.workType === budget.workType || item.workType === "General")
          )
          .reduce((acc, item) => acc + Number(item.amount || 0), 0);

        const analysisTotal = activeCostAnalysisEntriesForBudget
          .filter((item) => item.groupMeta?.name === group)
          .reduce(
            (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitCost || 0),
            0
          );

        return {
          group,
          total: markerTotal + analysisTotal,
        };
      }),
    [fixedMarkerGroupOptions, fixedMarkers, budget.workType, activeCostAnalysisEntriesForBudget]
  );

  const exportPrint = async (mode: PrintMode) => {
    if (!mode) return;
    if (mode === "client-budget") {
      // Marcar como exportado el presupuesto que corresponde, este o no en modo edicion:
      // si hay uno abierto se usa ese; si no, se busca la ultima revision guardada con el
      // mismo numero y empresa. Asi NO hace falta reabrirlo para que quede marcado.
      const exportTimestamp = new Date().toISOString();
      const candidates = editingBudgetId
        ? savedBudgets.filter((item) => item.id === editingBudgetId)
        : savedBudgets.filter(
            (item) => item.number === budget.number && item.company === budget.company
          );
      const target = candidates.length
        ? candidates.reduce((a, b) =>
            (b.revisionNumber || 1) >= (a.revisionNumber || 1) ? b : a
          )
        : null;
      if (target) {
        setSavedBudgets((prev) =>
          prev.map((item) =>
            item.id === target.id ? { ...item, exportedAt: exportTimestamp } : item
          )
        );
        setStorageMessage(`Presupuesto ${target.number} marcado como exportado.`);
      } else {
        setStorageMessage(
          "PDF exportado. Guarda el presupuesto en el historial para que quede marcado como exportado."
        );
      }
    }
    const previousTitle = document.title;
    if (mode === "client-budget") {
      document.title = buildBudgetSummaryLabel({
        number: budget.number,
        client: budget.client,
        project: budget.project,
      });
    }
    setPrintMode(mode);
    document.body.setAttribute("data-print-mode", mode);
    if (mode === "client-budget") {
      await preloadImages([
        ...budget.logos.map((image) => image.preview),
        ...budget.referenceImages.map((image) => image.preview),
      ]);
    }
    window.print();
    document.body.removeAttribute("data-print-mode");
    setPrintMode("");
    document.title = previousTitle;
  };

  const exportPersonalReport = (company: CompanyScope) => {
    setPersonalReportCompany(company);
    window.setTimeout(() => exportPrint("report-personal"), 0);
  };

  const loadBudgetFromSnapshot = (snapshot: BudgetSnapshot, budgetId?: number | null) => {
    lastMarkerSourceKeyRef.current = `${snapshot.budget.company}__${snapshot.budget.workType}`;
    setSelectedHistoryId(null);
    setSelectedApprovedJobId(null);
    setBudget({
      ...cloneBudget(defaultBudget),
      ...cloneBudget(snapshot.budget),
      contactName: snapshot.budget.contactName || "",
      contactPhone: snapshot.budget.contactPhone || "",
      contactEmail: snapshot.budget.contactEmail || "",
      clientNotes: snapshot.budget.clientNotes || "",
      isUpdate: !!snapshot.budget.isUpdate,
      updateLabel: snapshot.budget.updateLabel || "",
    });
    setSubBudgets(
      (snapshot.subBudgets || []).map((item) => ({
        ...item,
        materials: item.materials.map((row) => ({ ...row })),
        basicSupplies: item.basicSupplies.map((row) => ({ ...row })),
        labor: item.labor.map((row) => ({ ...row })),
        fixedCosts: item.fixedCosts.map((row) => ({ ...row })),
        increases: (item.increases || []).map((row) => ({ ...row })),
        discounts: item.discounts.map((row) => ({ ...row })),
        totals: { ...item.totals },
      }))
    );
    setSubBudgetTitle("");
    setSubBudgetNotes("");
    setMaterials(snapshot.materials.map((item) => ({ ...item })));
    setBasicSupplies(snapshot.basicSupplies.map((item) => ({ ...item })));
    setLabor(snapshot.labor.map((item) => ({ ...item })));
    setFixedCosts(snapshot.fixedCosts.map((item) => ({ ...item })));
    setBudgetIncreases((snapshot.increases || []).map((item) => ({ ...item })));
    setBudgetDiscounts(cloneBudgetDiscounts(snapshot.discounts || []));
    setDeviationPct(snapshot.params?.deviationPct ?? 5);
    setMarkupPct(snapshot.params?.markupPct ?? 30);
    setVatPct(snapshot.params?.vatPct ?? 21);
    setAllocationMode(snapshot.params?.allocationMode ?? "auto");
    setManualAllocationPct(snapshot.params?.manualAllocationPct ?? 18.75);
    setLaborDeviationPct(
      snapshot.params?.laborDeviationPct ?? snapshot.totals?.laborDeviationPct ?? 0
    );
    setCommissionPct(snapshot.params?.commissionPct ?? 0);
    setEditingBudgetId(budgetId ?? null);
    setActiveTab("presupuesto");
  };

  const resetBudgetWorkspace = (nextNumber?: string) => {
    const generatedNumber = nextNumber
      ? nextNumber
      : getNextBudgetNumber(
          getLatestBudgetRevisions(savedBudgets).map((item) => item.number),
          budget.number
        );
    const nextBudget = buildBlankBudgetDraft({
      company: budget.company,
      workType: budget.workType,
      number: generatedNumber,
      scope: budget.scope || defaultBudget.scope,
      projectManager: budget.projectManager || defaultBudget.projectManager,
      logos: budget.logos,
    });

    setEditingBudgetId(null);
    setBudget(nextBudget);
    setMaterials([]);
    setBasicSupplies([]);
    setLabor([]);
    setFixedCosts([]);
    setBudgetIncreases(defaultBudgetIncreases.map((item) => ({ ...item })));
    setBudgetDiscounts(cloneBudgetDiscounts(defaultBudgetDiscounts));
    setSubBudgets([]);
    setSubBudgetTitle("");
    setSubBudgetNotes("");
    // Los parametros economicos (markup, desvio, IVA, comision, etc.) NO se resetean aca: se fijan
    // desde el bloque "Parametros economicos" en Marcadores (fuente de verdad) y se mantienen al
    // armar un presupuesto nuevo.
  };

  const resetBudgetEditingState = () => {
    resetBudgetWorkspace();
  };

  const buildPersistedAppData = (): PersistedAppStateData => ({
    companyCatalog: companyCatalog.map((item) => ({ ...item })),
    operationalMonth,
    monthlyHistorySnapshots: monthlyHistorySnapshots.map((item) => ({
      ...item,
      data: { ...item.data },
    })),
    budget: cloneBudget(budget),
    subBudgets: subBudgets.map((item) => ({
      ...item,
      materials: item.materials.map((row) => ({ ...row })),
      basicSupplies: item.basicSupplies.map((row) => ({ ...row })),
      labor: item.labor.map((row) => ({ ...row })),
      fixedCosts: item.fixedCosts.map((row) => ({ ...row })),
      increases: item.increases.map((row) => ({ ...row })),
      discounts: item.discounts.map((row) => ({ ...row })),
      totals: { ...item.totals },
    })),
    subBudgetTitle,
    subBudgetNotes,
    materials: materials.map((item) => ({ ...item })),
    basicSupplies: basicSupplies.map((item) => ({ ...item })),
    labor: labor.map((item) => ({ ...item })),
    fixedCosts: fixedCosts.map((item) => ({ ...item })),
    budgetIncreases: budgetIncreases.map((item) => ({ ...item })),
    budgetDiscounts: cloneBudgetDiscounts(budgetDiscounts),
    fixedMarkers: fixedMarkers.map((item) => ({ ...item })),
    supplyMarkers: supplyMarkers.map((item) => ({ ...item })),
    laborMarkers: laborMarkers.map((item) => ({ ...item })),
    personalProvisionMarkers: personalProvisionMarkers.map((item) => ({ ...item })),
    savedBudgets: savedBudgets.map((item) => ({ ...item })),
    approvedJobs: approvedJobs.map((item) => ({ ...item })),
    // Estampado de fecha al guardar: ningun movimiento mensual queda sin fecha (queda fijado
    // en su mes para siempre). Solo rellena los vacios; nunca pisa una fecha ya puesta.
    financialItems: financialItems.map((item) => ({ ...item, date: stampDate(item.date) })),
    purchaseInvoices: purchaseInvoices.map((item) => ({
      ...item,
      invoiceDate: stampDate(item.invoiceDate),
    })),
    pettyCashFunds: pettyCashFunds.map((item) => ({ ...item })),
    pettyCashExpenses: pettyCashExpenses.map((item) => ({ ...item, date: stampDate(item.date) })),
    debtPlans: debtPlans.map((item) => ({ ...item })),
    bankStatementEntries: bankStatementEntries.map((item) => ({
      ...item,
      date: stampDate(item.date),
    })),
    stockItems: stockItems.map((item) => ({ ...item })),
    costAnalysisGroups: costAnalysisGroups.map((item) => ({ ...item })),
    costAnalysisEntries: costAnalysisEntries.map((item) => ({ ...item })),
    remitoDrafts: remitoDrafts.map((draft) => ({
      ...draft,
      rows: draft.rows.map((row) => ({ ...row })),
    })),
    companyAssets: companyAssets.map((item) => ({ ...item })),
    employees: employees.map((item) => ({ ...item })),
    employeeBaseConfig: {
      ...employeeBaseConfig,
      requiredDocuments: employeeBaseConfig.requiredDocuments.map((item) => ({ ...item })),
      provisionTemplates: employeeBaseConfig.provisionTemplates.map((item) => ({ ...item })),
    },
    scaleRows: scaleRows.map((item) => ({ ...item })),
    allocationMode,
    manualAllocationPct,
    deviationPct,
    markupPct,
    vatPct,
    laborDeviationPct,
    commissionPct,
    stockIncreasePct,
    editingBudgetId,
  });

  const buildPersistedAppDataWithOverrides = (
    overrides: Partial<PersistedAppStateData> = {}
  ): PersistedAppStateData => ({
    ...buildPersistedAppData(),
    ...overrides,
  });

  const persistAppStateImmediately = async (
    data: PersistedAppStateData,
    options?: {
      saveToSupabase?: boolean;
      moduleKeys?: AppStateModuleKey[];
      allowSupabaseWithPendingRemote?: boolean;
    }
  ) => {
    const payload: PersistedAppState = {
      version: APP_PERSISTENCE_VERSION,
      savedAt: new Date().toISOString(),
      data,
    };

    const payloadSignature = buildPersistedDataSignature(payload.data);
    await writePersistedAppState(payload);
    setLastSavedAt(payload.savedAt);

    const shouldWriteSupabase =
      options?.saveToSupabase !== false &&
      isSupabaseLoggedIn &&
      supabaseHydratedOkRef.current &&
      (!pendingRemoteSnapshotRef.current ||
        options?.allowSupabaseWithPendingRemote === true);

    let savedToSupabase = false;
    let supabaseSaveMode: "modules" | "legacy" | null = null;
    let savedModuleKeys: AppStateModuleKey[] = [];

    if (shouldWriteSupabase) {
      const { changedModuleKeys, nextSignatures } = getChangedPersistedModuleKeys(
        payload.data,
        lastSupabaseModuleSignaturesRef.current
      );
      const explicitModuleKeys = options?.moduleKeys;
      const shouldSeedAllModules =
        !explicitModuleKeys &&
        Object.keys(lastSupabaseModuleSignaturesRef.current).length === 0;
      const moduleKeysToSave =
        explicitModuleKeys && explicitModuleKeys.length > 0
          ? explicitModuleKeys
          : shouldSeedAllModules
            ? undefined
            : changedModuleKeys;

      if (shouldSeedAllModules || (moduleKeysToSave && moduleKeysToSave.length > 0)) {
        const supabaseWriteResult = await writeSupabasePersistedAppState(payload, {
          moduleKeys: moduleKeysToSave,
          writableCompanies: allowedCompaniesForSession,
        });
        lastSupabaseAutosaveAtRef.current = Date.now();
        lastSupabaseSnapshotSavedAtRef.current = payload.savedAt;
        lastSupabaseModuleSignaturesRef.current = shouldSeedAllModules
          ? nextSignatures
          : mergePersistedModuleSignatures(
              lastSupabaseModuleSignaturesRef.current,
              nextSignatures,
              supabaseWriteResult.moduleKeys
            );
        setPendingRealtimeRefresh(null);
        supabaseSaveMode = supabaseWriteResult.mode;
        savedModuleKeys = supabaseWriteResult.moduleKeys;
        savedToSupabase = true;
      }
    }

    lastPersistedDataSignatureRef.current = payloadSignature;

    return {
      savedAt: payload.savedAt,
      savedToSupabase,
      supabaseSaveMode,
      savedModuleKeys,
    };
  };

  const applyPersistedAppData = (data: Partial<PersistedAppStateData>) => {
    // Toda restauracion programatica (load inicial, sync remoto, restore, deshacer) no debe
    // generar un paso de "Atras": el proximo barrido de captura lo ignora y solo re-asienta.
    suppressUndoCaptureRef.current = true;
    // Defensa de aislamiento: un usuario restringido nunca debe tener en memoria datos
    // de empresas que no le corresponden, venga la data de Supabase, del cache local o
    // de los defaults sembrados. Asi cualquier render (filtrado o no) queda seguro.
    const restrictByCompany = isSupabaseLoggedIn && !effectiveIsAdmin;
    const keepAccessibleByCompany = <T extends { company?: unknown }>(
      items: readonly T[]
    ): T[] => {
      if (!restrictByCompany) return items as T[];
      return items.filter((item) => {
        const company = item?.company;
        return (
          company === "General" ||
          (typeof company === "string" &&
            allowedCompaniesForSession.includes(company as CompanyName))
        );
      });
    };

    const nextBudget = {
      ...cloneBudget(defaultBudget),
      ...(data.budget ? cloneBudget(data.budget) : {}),
    };

    lastMarkerSourceKeyRef.current = `${nextBudget.company}__${nextBudget.workType}`;

    const nextCompanyCatalog = (data.companyCatalog || DEFAULT_COMPANY_OPTIONS).map((item) => ({
      ...item,
    }));
    setCompanyCatalog(nextCompanyCatalog);
    runtimeCompanyOptions = nextCompanyCatalog;
    setBudget(nextBudget);
    const nextOperationalMonth =
      typeof data.operationalMonth === "string" && data.operationalMonth
        ? data.operationalMonth
        : localMonthKey();
    setOperationalMonth(nextOperationalMonth);
    setFinancialMonth(nextOperationalMonth);
    setPurchaseMonth(nextOperationalMonth);
    setMonthlyHistorySnapshots(
      (data.monthlyHistorySnapshots || []).map((item) => ({
        ...item,
        data: { ...(item.data || {}) },
      }))
    );
    setSubBudgets(
      (data.subBudgets || []).map((item) => ({
        ...item,
        materials: item.materials.map((row) => ({ ...row })),
        basicSupplies: item.basicSupplies.map((row) => ({ ...row })),
        labor: item.labor.map((row) => ({ ...row })),
        fixedCosts: item.fixedCosts.map((row) => ({ ...row })),
        increases: (item.increases || []).map((row) => ({ ...row })),
        discounts: item.discounts.map((row) => ({ ...row })),
        totals: { ...item.totals },
      }))
    );
    setSubBudgetTitle(data.subBudgetTitle || "");
    setSubBudgetNotes(data.subBudgetNotes || "");
    setMaterials((data.materials || defaultMaterials).map((item) => ({ ...item })));
    setBasicSupplies((data.basicSupplies || defaultBasicSupplies).map((item) => ({ ...item })));
    setLabor((data.labor || defaultLabor).map((item) => ({ ...item })));
    setFixedCosts((data.fixedCosts || defaultFixedCosts).map((item) => ({ ...item })));
    setBudgetIncreases((data.budgetIncreases || defaultBudgetIncreases).map((item) => ({ ...item })));
    setBudgetDiscounts(cloneBudgetDiscounts(data.budgetDiscounts || defaultBudgetDiscounts));
    setFixedMarkers(keepAccessibleByCompany(data.fixedMarkers || defaultFixedMarkers).map((item) => ({ ...item })));
    setSupplyMarkers(keepAccessibleByCompany(data.supplyMarkers || defaultSupplyMarkers).map((item) => ({ ...item })));
    setLaborMarkers(keepAccessibleByCompany(data.laborMarkers || defaultLaborMarkers).map((item) => ({ ...item })));
    setPersonalProvisionMarkers(
      keepAccessibleByCompany(data.personalProvisionMarkers || defaultPersonalProvisionMarkers).map((item) => ({
        ...item,
      }))
    );
    setSavedBudgets(keepAccessibleByCompany(data.savedBudgets || []).map((item) => ({ ...item })));
    setApprovedJobs(
      keepAccessibleByCompany(data.approvedJobs || []).map((item) => ({
        ...item,
        sourceType: item.sourceType || "from_budget",
        legacyImported: item.legacyImported ?? false,
      }))
    );
    setFinancialItems(keepAccessibleByCompany(data.financialItems || defaultFinancialItems).map((item) => ({ ...item })));
    setPurchaseInvoices(keepAccessibleByCompany(data.purchaseInvoices || defaultPurchaseInvoices).map((item) => ({ ...item })));
    setPettyCashFunds(
      keepAccessibleByCompany(data.pettyCashFunds || defaultPettyCashFunds).map((item) => ({
        ...item,
        description: item.description || "",
        rechargeDate: item.rechargeDate || "",
        closed: Boolean(item.closed),
        closedDate: item.closedDate || "",
      }))
    );
    setPettyCashExpenses(keepAccessibleByCompany(data.pettyCashExpenses || defaultPettyCashExpenses).map((item) => ({ ...item })));
    setDebtPlans(keepAccessibleByCompany(data.debtPlans || defaultDebtPlans).map((item) => ({ ...item })));
    setBankStatementEntries(
      keepAccessibleByCompany(data.bankStatementEntries || defaultBankStatementEntries).map((item) => ({ ...item }))
    );
    setStockItems(
      keepAccessibleByCompany(data.stockItems || defaultStockItems).map((item) => ({
        ...item,
        location: item.location || "",
      }))
    );
    setCostAnalysisGroups(
      keepAccessibleByCompany(data.costAnalysisGroups || defaultCostAnalysisGroups).map((item) => ({ ...item }))
    );
    setCostAnalysisEntries(
      keepAccessibleByCompany(data.costAnalysisEntries || defaultCostAnalysisEntries).map((item) => ({ ...item }))
    );
    setRemitoDrafts(
      keepAccessibleByCompany(data.remitoDrafts || defaultRemitoDrafts).map((draft) => ({
        ...draft,
        rows: draft.rows.map((row) => ({ ...row })),
      }))
    );
    setCompanyAssets(keepAccessibleByCompany(data.companyAssets || defaultCompanyAssets).map((item) => ({ ...item })));
    setEmployees(keepAccessibleByCompany(data.employees || defaultEmployees).map((item) => ({ ...item })));
    setEmployeeBaseConfig({
      ...defaultBaseConfig,
      ...(data.employeeBaseConfig || {}),
      requiredDocuments:
        data.employeeBaseConfig?.requiredDocuments?.map((item) => ({ ...item })) ||
        defaultBaseConfig.requiredDocuments.map((item) => ({ ...item })),
      provisionTemplates:
        data.employeeBaseConfig?.provisionTemplates?.map((item) => ({ ...item })) ||
        defaultBaseConfig.provisionTemplates.map((item) => ({ ...item })),
    });
    setScaleRows((data.scaleRows || seededScaleRows).map((item) => ({ ...item })));
    setAllocationMode(data.allocationMode || "auto");
    setManualAllocationPct(data.manualAllocationPct ?? 18.75);
    setDeviationPct(data.deviationPct ?? 5);
    setMarkupPct(data.markupPct ?? 30);
    setVatPct(data.vatPct ?? 21);
    setLaborDeviationPct(data.laborDeviationPct ?? 0);
    setCommissionPct(data.commissionPct ?? 0);
    setStockIncreasePct(data.stockIncreasePct ?? 0);
    setEditingBudgetId(data.editingBudgetId ?? null);
  };

  // "Atras": restaura el snapshot inmediatamente anterior. Reusa applyPersistedAppData
  // (mismo camino probado del load remoto, respeta el aislamiento por empresa) y deja que
  // el autosave re-sincronice el estado restaurado. Solo deshace cambios propios.
  const handleUndo = () => {
    if (undoStackRef.current.length === 0) {
      setStorageMessage("No hay cambios para deshacer.");
      return;
    }
    const previous = undoStackRef.current.pop();
    setUndoAvailable(undoStackRef.current.length);
    if (!previous) return;
    let data: PersistedAppStateData;
    try {
      data = JSON.parse(previous) as PersistedAppStateData;
    } catch {
      setStorageMessage("No pude deshacer el ultimo cambio.");
      return;
    }
    // Guardar el estado que estamos dejando para poder REHACER.
    if (undoBaselineRef.current !== null) {
      redoStackRef.current.push(undoBaselineRef.current);
      if (redoStackRef.current.length > UNDO_HISTORY_LIMIT) {
        redoStackRef.current.shift();
      }
      setRedoAvailable(redoStackRef.current.length);
    }
    applyPersistedAppData(data);
    setStorageMessage("Listo: deshice el ultimo cambio.");
  };

  // "Rehacer": vuelve a aplicar el ultimo estado deshecho. Simetrico a handleUndo.
  const handleRedo = () => {
    if (redoStackRef.current.length === 0) {
      setStorageMessage("No hay nada para rehacer.");
      return;
    }
    const next = redoStackRef.current.pop();
    setRedoAvailable(redoStackRef.current.length);
    if (!next) return;
    let data: PersistedAppStateData;
    try {
      data = JSON.parse(next) as PersistedAppStateData;
    } catch {
      setStorageMessage("No pude rehacer el cambio.");
      return;
    }
    // Guardar el estado actual en la pila de deshacer para poder volver atras.
    if (undoBaselineRef.current !== null) {
      undoStackRef.current.push(undoBaselineRef.current);
      if (undoStackRef.current.length > UNDO_HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
      setUndoAvailable(undoStackRef.current.length);
    }
    applyPersistedAppData(data);
    setStorageMessage("Listo: rehice el cambio.");
  };

  const restoreFromLocalSave = async () => {
    try {
      const persisted = await readPersistedAppState();
      if (!persisted) {
        setStorageMessage("Todavia no hay un guardado local para restaurar.");
        return;
      }
      applyPersistedAppData(persisted.data);
      lastPersistedDataSignatureRef.current = buildPersistedDataSignature(
        persisted.data
      );
      lastSupabaseModuleSignaturesRef.current = buildPersistedModuleSignatures(
        persisted.data
      );
      setLastSavedAt(persisted.savedAt);
      setStorageMessage("Datos restaurados desde el guardado local del navegador.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude restaurar el guardado local."
      );
    }
  };

  const restoreFromSupabaseSave = async () => {
    try {
      const persisted = await readSupabasePersistedAppState();
      if (!persisted) {
        setIsSupabaseSnapshotReady(true);
        setStorageMessage("Todavia no hay un guardado de Supabase para restaurar.");
        return;
      }
      applyPersistedAppData(persisted.data);
      lastPersistedDataSignatureRef.current = buildPersistedDataSignature(
        persisted.data
      );
      lastSupabaseModuleSignaturesRef.current = buildPersistedModuleSignatures(
        persisted.data
      );
      pendingRemoteSnapshotRef.current = null;
      lastAppliedRemoteSnapshotAtRef.current = Date.now();
      setLastSavedAt(persisted.savedAt);
      lastSupabaseSnapshotSavedAtRef.current = persisted.savedAt;
      setIsSupabaseSnapshotReady(true);
      setPendingRealtimeRefresh(null);
      setStorageMessage("Datos restaurados desde Supabase.");
    } catch (error) {
      setIsSupabaseSnapshotReady(false);
      setStorageMessage(
        error instanceof Error ? error.message : "No pude restaurar los datos desde Supabase."
      );
    }
  };

  const saveToSupabaseNow = async () => {
    if (isSupabaseManualSaveInProgress) return;

    setIsSupabaseManualSaveInProgress(true);
    setStorageMessage("Guardando en este navegador y sincronizando con Supabase...");

    try {
      const moduleKeys =
        activeTab === "acceso" ? undefined : getPersistenceModuleKeysForTab(activeTab);
      const scopeText =
        activeTab === "acceso" ? "todo el sistema" : getTabLabel(activeTab);
      const persistResult = await persistAppStateImmediately(buildPersistedAppData(), {
        moduleKeys,
        allowSupabaseWithPendingRemote: activeTab !== "acceso",
      });

      if (!persistResult.savedToSupabase) {
        setStorageMessage(
          pendingRemoteSnapshotRef.current
            ? activeTab === "acceso"
              ? "Guardado local realizado. Hay una version remota pendiente: pulsa Refresh antes de guardar todo el sistema en Supabase."
              : `Guardado local realizado. No hubo cambios nuevos para subir en ${scopeText}.`
            : activeTab === "acceso"
              ? "Guardado local realizado. No hubo cambios nuevos para subir en Supabase."
              : `Guardado local realizado. No hubo cambios nuevos para subir en ${scopeText}.`
        );
        return;
      }

      const savedModuleText = formatPersistenceModuleList(
        persistResult.savedModuleKeys
      );
      announceSystemChange(
        persistResult.supabaseSaveMode === "modules"
          ? `Guardado manual confirmado en Supabase: ${savedModuleText}.`
          : "Guardado manual confirmado en Supabase en modo compatible. Ejecuta la query de guardado por modulos para activar la sincronizacion liviana."
      );
      setStorageMessage(
        persistResult.supabaseSaveMode === "modules"
          ? `Datos guardados en Supabase para ${scopeText}: ${savedModuleText}.`
          : "Datos guardados en Supabase en modo compatible y en este navegador. Falta ejecutar la query de guardado por modulos para reducir la carga."
      );
    } catch (error) {
      setStorageMessage(
        error instanceof SupabasePersistError
          ? `El guardado local quedo hecho, pero Supabase no confirmo todavia: ${error.message}`
          : error instanceof Error
            ? error.message
            : "No pude guardar los datos en Supabase."
      );
    } finally {
      setIsSupabaseManualSaveInProgress(false);
      setMonthReportPromptTab(activeTab);
    }
  };

  const saveMonthlyHistorySnapshot = async () => {
    if (!isMonthlyHistoryTab(activeTab)) return;

    const baseData = buildPersistedAppData();
    const snapshot: MonthlyHistorySnapshot = {
      id: newId(),
      tabKey: activeTab,
      tabLabel: getTabLabel(activeTab),
      month: operationalMonth,
      monthLabel: monthLabel(operationalMonth),
      companyScope: workspaceCompanyScope,
      savedAt: new Date().toISOString(),
      savedBy: supabaseProfile?.full_name || supabaseSession?.user?.email || "Usuario",
      data: pickMonthlySnapshotDataForTab(activeTab, baseData),
    };
    const nextSnapshots = [
      snapshot,
      ...monthlyHistorySnapshots.filter(
        (item) =>
          !(
            item.tabKey === snapshot.tabKey &&
            item.month === snapshot.month &&
            item.companyScope === snapshot.companyScope
          )
      ),
    ];

    try {
      setMonthlyHistorySnapshots(nextSnapshots);
      setMonthReportPromptTab(activeTab);
      const moduleKeys: AppStateModuleKey[] = Array.from(
        new Set(["mensuales", ...getPersistenceModuleKeysForTab(activeTab)] as AppStateModuleKey[])
      );
      const persistResult = await persistAppStateImmediately(
        buildPersistedAppDataWithOverrides({
          operationalMonth,
          monthlyHistorySnapshots: nextSnapshots,
        }),
        { moduleKeys, allowSupabaseWithPendingRemote: true }
      );
      const savedModuleText = formatPersistenceModuleList(persistResult.savedModuleKeys);
      announceSystemChange(
        `Mes guardado: ${snapshot.tabLabel} - ${snapshot.monthLabel} (${getCompanyScopeLabel(snapshot.companyScope)}).`
      );
      setStorageMessage(
        persistResult.savedToSupabase
          ? `Mes guardado en Supabase: ${savedModuleText}.`
          : `Mes guardado localmente. Pulsa Guardar en Supabase para compartir ${snapshot.monthLabel}.`
      );
    } catch (error) {
      setMonthlyHistorySnapshots(monthlyHistorySnapshots);
      setStorageMessage(
        error instanceof Error ? error.message : "No pude guardar el cierre mensual."
      );
    }
  };

  const downloadBackupFile = async () => {
    try {
      const payload: PersistedAppState = {
        version: APP_PERSISTENCE_VERSION,
        savedAt: new Date().toISOString(),
        data: buildPersistedAppData(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grupo-bga-backup-${todayIso()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStorageMessage("Backup descargado correctamente.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude descargar el backup."
      );
    }
  };

  const importBackupFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizePersistedAppState(parsed);
      if (!normalized) {
        throw new Error("El archivo no tiene un formato de backup valido.");
      }
      applyPersistedAppData(normalized.data);
      const importedSavedAt = new Date().toISOString();
      await writePersistedAppState({
        ...normalized,
        savedAt: importedSavedAt,
      });
      lastPersistedDataSignatureRef.current = buildPersistedDataSignature(
        normalized.data
      );
      let importSupabaseMode: "modules" | "legacy" | null = null;
      if (isSupabaseLoggedIn) {
        const supabaseWriteResult = await writeSupabasePersistedAppState(
          {
            ...normalized,
            savedAt: importedSavedAt,
          },
          { writableCompanies: allowedCompaniesForSession }
        );
        importSupabaseMode = supabaseWriteResult.mode;
        lastSupabaseAutosaveAtRef.current = Date.now();
        lastSupabaseSnapshotSavedAtRef.current = importedSavedAt;
        lastSupabaseModuleSignaturesRef.current = buildPersistedModuleSignatures(
          normalized.data
        );
      }
      setLastSavedAt(importedSavedAt);
      setStorageMessage(
        isSupabaseLoggedIn
          ? importSupabaseMode === "modules"
            ? "Backup importado y guardado en Supabase por modulos y localmente."
            : "Backup importado y guardado en Supabase en modo compatible. Falta ejecutar la query de guardado por modulos para reducir la carga."
          : "Backup importado y guardado localmente."
      );
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude importar el backup."
      );
    }
  };

  const clearLocalSave = async () => {
    const confirmed = window.confirm(
      "Esto borra el guardado local de este navegador. La pantalla actual no se borra, pero si recargas ya no se restaurara automaticamente. ¿Quieres continuar?"
    );
    if (!confirmed) return;

    try {
      await clearPersistedAppState();
      setLastSavedAt("");
      setStorageMessage("Guardado local borrado. Puedes seguir trabajando o importar un backup.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude borrar el guardado local."
      );
    }
  };

  const saveBudgetSnapshot = async () => {
    const currentBudgetNumberKey = normalizeBudgetNumberKey(budget.number);
    const existing = editingBudgetId
      ? savedBudgets.find((item) => item.id === editingBudgetId) || null
      : savedBudgets.find(
          (item) =>
            currentBudgetNumberKey.length > 0 &&
            normalizeBudgetNumberKey(item.number) === currentBudgetNumberKey &&
            item.company === budget.company
        ) || null;
    const rootBudgetId = existing?.rootBudgetId ?? existing?.id ?? newId();
    const revisionNumber = existing
      ? Math.max(
          ...savedBudgets
            .filter((item) => (item.rootBudgetId || item.id) === rootBudgetId)
            .map((item) => item.revisionNumber || 1),
          existing.revisionNumber || 1
        ) + 1
      : 1;
    const nextBudgetData: BudgetData = {
      ...cloneBudget(budget),
      isUpdate: !!existing,
      updateLabel: existing ? `Actualizacion ${revisionNumber - 1}` : "",
    };
    const nextSnapshot: BudgetSnapshot = {
      budget: nextBudgetData,
      subBudgets: subBudgets.map((item) => ({
        ...item,
        materials: item.materials.map((row) => ({ ...row })),
        basicSupplies: item.basicSupplies.map((row) => ({ ...row })),
        labor: item.labor.map((row) => ({ ...row })),
        fixedCosts: item.fixedCosts.map((row) => ({ ...row })),
        increases: (item.increases || []).map((row) => ({ ...row })),
        discounts: item.discounts.map((row) => ({ ...row })),
        totals: { ...item.totals },
      })),
      materials: materials.map((item) => ({ ...item })),
      basicSupplies: basicSupplies.map((item) => ({ ...item })),
      labor: labor.map((item) => ({ ...item })),
      fixedCosts: fixedCosts.map((item) => ({ ...item })),
      increases: budgetIncreases.map((item) => ({ ...item })),
      discounts: cloneBudgetDiscounts(budgetDiscounts),
      params: {
        deviationPct,
        markupPct,
        vatPct,
        allocationMode,
        manualAllocationPct,
        laborDeviationPct,
        commissionPct,
      },
      totals: {
        totalMaterials: consolidatedBudgetTotals.totalMaterials,
        totalBasicSupplies: consolidatedBudgetTotals.totalBasicSupplies,
        totalLabor: consolidatedBudgetTotals.totalLabor,
        laborDeviationPct,
        laborDeviationAmount: consolidatedBudgetTotals.laborDeviationAmount,
        fixedCostsApplied: consolidatedBudgetTotals.fixedCostsApplied,
        deviationAmount: consolidatedBudgetTotals.deviationAmount,
        totalCost: consolidatedBudgetTotals.totalCost,
        totalIncreaseAmount: consolidatedBudgetTotals.totalIncreaseAmount,
        preDiscountNetPrice: consolidatedBudgetTotals.preDiscountNetPrice,
        totalDiscountAmount: consolidatedBudgetTotals.totalDiscountAmount,
        netPrice: consolidatedBudgetTotals.netPrice,
        finalPrice: consolidatedBudgetTotals.finalPrice,
        commissionAmount: consolidatedCommissionAmount,
        totalJobHours: consolidatedBudgetTotals.totalJobHours,
        totalAvailableHours: consolidatedBudgetTotals.totalAvailableHours,
        occupancyPct: consolidatedBudgetTotals.occupancyPct,
      },
    };
    const next: SavedBudget = {
      // id NUEVO por cada version: la revision anterior queda guardada (misma rootBudgetId)
      // para poder revisarla, en vez de pisarse.
      id: newId(),
      rootBudgetId,
      revisionNumber,
      isUpdate: !!existing,
      status: existing?.status ?? "borrador",
      exportedAs: "presupuesto",
      number: nextBudgetData.number,
      company: nextBudgetData.company,
      client: nextBudgetData.client,
      project: nextBudgetData.project,
      date: nextBudgetData.date,
      deliveryTerm: nextBudgetData.deliveryTerm,
      deliveryDestination: nextBudgetData.deliveryDestination,
      projectManager: nextBudgetData.projectManager,
      maxRequirementDate: nextBudgetData.maxRequirementDate,
      commissionPct,
      commissionAmount: consolidatedCommissionAmount,
      totalDiscountAmount: consolidatedBudgetTotals.totalDiscountAmount,
      netPrice: consolidatedBudgetTotals.netPrice,
      finalPrice: consolidatedBudgetTotals.finalPrice,
      laborOccupancyPct: consolidatedBudgetTotals.occupancyPct,
      exportedAt: undefined,
      snapshot: nextSnapshot,
    };

    // Conservar TODAS las versiones (no colapsar a la ultima). El historial muestra la
    // ultima via getLatestBudgetRevisions; las anteriores quedan guardadas y revisables.
    const nextSavedBudgets = [next, ...savedBudgets];
    const nextApprovedJobs = approvedJobs.map((job) =>
      job.rootBudgetId === rootBudgetId || job.budgetId === existing?.id
        ? {
            ...job,
            budgetId: next.id,
            rootBudgetId,
            revisionNumber,
            isUpdate: !!existing,
            budgetNumber: next.number,
            company: next.company,
            client: next.client,
            project: next.project,
            date: next.date,
            deliveryTerm: next.deliveryTerm,
            deliveryDestination: next.deliveryDestination,
            projectManager: next.projectManager,
            maxRequirementDate: next.maxRequirementDate,
            soldNetPrice: next.netPrice,
            soldGrossPrice: next.finalPrice,
            commissionPct: next.commissionPct,
            commissionAmount: next.commissionAmount,
            totalDiscountAmount: next.totalDiscountAmount,
            deliveryDate: buildDeliveryDateFromTerm(job.approvalDate, next.deliveryTerm),
            snapshot: next.snapshot,
          }
        : job
    );

    const nextDraftNumber = getNextBudgetNumber(
      getLatestBudgetRevisions(nextSavedBudgets).map((item) => item.number),
      next.number
    );
    const nextDraftBudget = buildBlankBudgetDraft({
      company: budget.company,
      workType: budget.workType,
      number: nextDraftNumber,
      scope: budget.scope || defaultBudget.scope,
      projectManager: budget.projectManager || defaultBudget.projectManager,
      logos: budget.logos,
    });
    const updateCount = Math.max(0, revisionNumber - 1);
    const saveStatusText = existing
      ? `Presupuesto actualizado. Actualizaciones acumuladas: ${updateCount}.`
      : "Presupuesto guardado.";

    // Guardado OPTIMISTA: la UI se actualiza al instante (el presupuesto aparece y el
    // formulario se limpia) sin esperar a Supabase. La persistencia local + la sync con
    // Supabase corren en segundo plano, asi el boton nunca queda "guardando".
    setSavedBudgets(nextSavedBudgets);
    setApprovedJobs(nextApprovedJobs);
    resetBudgetWorkspace(nextDraftNumber);
    setStorageMessage(`${saveStatusText} Sincronizando en segundo plano...`);
    setMonthReportPromptTab(activeTab);

    void persistAppStateImmediately(
      buildPersistedAppDataWithOverrides({
        budget: cloneBudget(nextDraftBudget),
        subBudgets: [],
        subBudgetTitle: "",
        subBudgetNotes: "",
        materials: [],
        basicSupplies: [],
        labor: [],
        fixedCosts: [],
        budgetIncreases: defaultBudgetIncreases.map((item) => ({ ...item })),
        budgetDiscounts: cloneBudgetDiscounts(defaultBudgetDiscounts),
        savedBudgets: nextSavedBudgets.map((item) => ({ ...item })),
        approvedJobs: nextApprovedJobs.map((item) => ({ ...item })),
        allocationMode: "auto",
        manualAllocationPct: 18.75,
        deviationPct: 5,
        markupPct: 30,
        vatPct: 21,
        laborDeviationPct: 0,
        commissionPct: 0,
        editingBudgetId: null,
      }),
      {
        allowSupabaseWithPendingRemote: true,
        moduleKeys: ["presupuestos", "historial-crm", "trabajos-aprobados"],
      }
    )
      .then((persistResult) => {
        const syncedModuleText = formatPersistenceModuleList(
          persistResult.savedModuleKeys
        );
        if (persistResult.savedToSupabase) {
          announceSystemChange(
            persistResult.supabaseSaveMode === "modules"
              ? `${saveStatusText} Guardado confirmado en Supabase: ${syncedModuleText}.`
              : `${saveStatusText} Guardado confirmado en Supabase en modo compatible.`
          );
        }
        setStorageMessage(
          persistResult.savedToSupabase
            ? `${saveStatusText} Sincronizado: ${syncedModuleText}.`
            : `${saveStatusText} Guardado en este navegador (se sincroniza solo al recuperar conexion).`
        );
      })
      .catch((error) => {
        setStorageMessage(
          error instanceof Error
            ? `${saveStatusText} Guardado local OK; la sincronizacion con Supabase reintentara (${error.message}).`
            : `${saveStatusText} Guardado local OK; la sincronizacion con Supabase reintentara.`
        );
      });
  };

  const approveBudget = (item: SavedBudget) => {
    const approvalDate = todayIso();
    const startDate = approvalDate;
    const deliveryDate = buildDeliveryDateFromTerm(approvalDate, item.deliveryTerm);

    setSavedBudgets((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status: "aprobado" } : row))
    );

    setApprovedJobs((prev) => {
      const existing = prev.find(
        (row) => row.budgetId === item.id || row.rootBudgetId === (item.rootBudgetId || item.id)
      );
      const nextJob: ApprovedJob = {
        id: existing?.id ?? newId(),
        budgetId: item.id,
        rootBudgetId: item.rootBudgetId || item.id,
        revisionNumber: item.revisionNumber || 1,
        isUpdate: item.isUpdate,
        sourceType: "from_budget",
        legacyImported: false,
        budgetNumber: item.number,
        company: item.company,
        client: item.client,
        project: item.project,
        date: item.date,
        approvalDate: existing?.approvalDate || approvalDate,
        startDate: existing?.startDate || startDate,
        deliveryDate: existing?.deliveryDate || deliveryDate,
        deliveryTerm: item.deliveryTerm,
        deliveryDestination: item.deliveryDestination,
        projectManager: item.projectManager,
        maxRequirementDate: item.maxRequirementDate,
        soldNetPrice: item.netPrice,
        soldGrossPrice: item.finalPrice,
        billedPct: existing?.billedPct ?? 100,
        commissionPct: item.commissionPct,
        commissionAmount: item.commissionAmount,
        totalDiscountAmount: item.totalDiscountAmount,
        estimatedJobHours: item.snapshot.totals.totalJobHours,
        estimatedOccupancyPct: item.laborOccupancyPct,
        estimatedMaterialCost: item.snapshot.totals.totalMaterials,
        executionStatus: existing?.executionStatus ?? "pendiente",
        notes: existing?.notes ?? "",
        workFiles: existing?.workFiles ?? [],
        additionals: existing?.additionals ?? [],
        commissionPayments: existing?.commissionPayments ?? [],
        invoices: existing?.invoices ?? [],
        payments: existing?.payments ?? [],
        retentions: existing?.retentions ?? [],
        snapshot: item.snapshot,
      };

      return existing
        ? prev.map((row) => (row.budgetId === item.id ? nextJob : row))
        : [nextJob, ...prev];
    });
  };

  const createDirectApprovedJob = () => {
    const approvalDate = todayIso();
    const deliveryTerm = budget.deliveryTerm || "30 dias";
    const generatedId = newId();
    const syntheticBudgetId = -generatedId;
    const budgetNumber = `DIR-${String(Date.now()).slice(-6)}`;
    const placeholderSnapshot = buildPlaceholderBudgetSnapshot({
      company: budget.company,
      workType: budget.workType,
      budgetNumber,
      client: budget.client || "Cliente directo",
      project: budget.project || "Trabajo directo",
      approvalDate,
      deliveryTerm,
      paymentTerms: budget.paymentTerms || "50% anticipo / 50% saldo",
      soldNetPrice: 0,
      notes: "Trabajo aprobado cargado sin presupuesto previo.",
    });

    const nextJob: ApprovedJob = {
      id: generatedId,
      budgetId: syntheticBudgetId,
      rootBudgetId: syntheticBudgetId,
      revisionNumber: 1,
      isUpdate: false,
      sourceType: "direct",
      legacyImported: false,
      budgetNumber,
      company: budget.company,
      client: budget.client || "Cliente directo",
      project: budget.project || "Trabajo directo",
      date: approvalDate,
      approvalDate,
      startDate: approvalDate,
      deliveryDate: buildDeliveryDateFromTerm(approvalDate, deliveryTerm),
      deliveryTerm,
      deliveryDestination: budget.deliveryDestination || "",
      projectManager: budget.projectManager || "",
      maxRequirementDate: budget.maxRequirementDate || "",
      soldNetPrice: 0,
      soldGrossPrice: 0,
      billedPct: 0,
      commissionPct: 0,
      commissionAmount: 0,
      totalDiscountAmount: 0,
      estimatedJobHours: 0,
      estimatedOccupancyPct: 0,
      estimatedMaterialCost: 0,
      executionStatus: "pendiente",
      notes: "Trabajo directo creado sin presupuesto previo.",
      workFiles: [],
      additionals: [],
      commissionPayments: [],
      invoices: [],
      payments: [],
      retentions: [],
      snapshot: placeholderSnapshot,
    };

    setApprovedJobs((prev) => [nextJob, ...prev]);
    setSelectedApprovedJobId(nextJob.id);
    setActiveTab("aprobados");
  };

  const importLegacyApprovedJobs = () => {
    const existingNumbers = new Set(approvedJobs.map((item) => item.budgetNumber.trim()));
    const importBaseId = Date.now();
    const importedRows = LEGACY_APPROVED_IMPORT_ROWS.filter(
      (item) => !existingNumbers.has(item.budgetNumber.trim())
    ).map((item, index) => {
      const syntheticBudgetId = -(importBaseId + index + 1);
      const billedNet = item.invoices.reduce<number>(
        (acc, invoice) => acc + Number(invoice.subtotal || 0),
        0
      );
      const billedPct =
        Number(item.soldNetPrice || 0) > 0
          ? Math.max(0, Math.min(100, (billedNet / Number(item.soldNetPrice || 1)) * 100))
          : 0;
      const approvalDate = item.approvalDate || todayIso();
      const notes = [item.observations, item.notes].filter(Boolean).join(" | ");
      const snapshot = buildPlaceholderBudgetSnapshot({
        company: COMPANY_OPTIONS[0].value,
        workType: "General",
        budgetNumber: item.budgetNumber,
        client: item.client,
        project: item.project,
        approvalDate,
        deliveryTerm: item.deliveryTerm || "30 dias",
        paymentTerms: item.paymentTerms || "",
        soldNetPrice: item.soldNetPrice,
        notes,
      });

      const commissionPayments =
        (item.observations || "").toUpperCase().includes("COMISION PAGA") &&
        Number(item.commissionAmount || 0) > 0
          ? [
              {
                id: importBaseId + index + 10000,
                paymentDate: approvalDate,
                amount: Number(item.commissionAmount || 0),
                note: "Importado desde planilla historica",
                attachmentName: "",
              },
            ]
          : [];

      return {
        id: importBaseId + index + 1,
        budgetId: syntheticBudgetId,
        rootBudgetId: syntheticBudgetId,
        revisionNumber: 1,
        isUpdate: false,
        sourceType: "imported",
        legacyImported: true,
        budgetNumber: item.budgetNumber,
        company: COMPANY_OPTIONS[0].value,
        client: item.client,
        project: item.project,
        date: approvalDate,
        approvalDate,
        startDate: approvalDate,
        deliveryDate: buildDeliveryDateFromTerm(
          approvalDate,
          item.deliveryTerm || "30 dias"
        ),
        deliveryTerm: item.deliveryTerm || "",
        deliveryDestination: "",
        projectManager: "",
        maxRequirementDate: "",
        soldNetPrice: Number(item.soldNetPrice || 0),
        soldGrossPrice: Number((Number(item.soldNetPrice || 0) * 1.21).toFixed(2)),
        billedPct: Number(billedPct.toFixed(2)),
        commissionPct: 0,
        commissionAmount: Number(item.commissionAmount || 0),
        totalDiscountAmount: 0,
        estimatedJobHours: 0,
        estimatedOccupancyPct: 0,
        estimatedMaterialCost: 0,
        executionStatus: item.executionStatus,
        notes,
        workFiles: [],
        additionals: item.additionals.map((additional, additionalIndex) => ({
          id: importBaseId + index * 100 + additionalIndex + 1,
          date: additional.date || approvalDate,
          description: additional.description,
          amount: Number(additional.amount || 0),
          notes: "Importado desde historico",
        })),
        commissionPayments,
        invoices: item.invoices.map((invoice, invoiceIndex) => ({
          id: importBaseId + index * 1000 + invoiceIndex + 1,
          businessName: item.businessName || item.client,
          taxId: item.taxId || "",
          invoiceType: item.invoiceNumber || "A",
          invoiceNumber: item.invoiceNumber || "",
          invoiceDate: invoice.invoiceDate || "",
          subtotal: Number(invoice.subtotal || 0),
          vat: Number(invoice.vat || 0),
          total: Number(invoice.total || 0),
          attachmentName: "",
        })),
        payments: item.payments.map((payment, paymentIndex) => ({
          id: importBaseId + index * 1000 + paymentIndex + 101,
          paymentNumber: "",
          paymentDate: payment.paymentDate || "",
          transactionType: "transferencia" as const,
          amount: Number(payment.amount || 0),
          attachmentName: "",
        })),
        retentions: item.retentions.map((retention, retentionIndex) => ({
          id: importBaseId + index * 1000 + retentionIndex + 201,
          retentionNumber: "",
          retentionDate: "",
          retentionType: retention.retentionType,
          amount: Number(retention.amount || 0),
          attachmentName: "",
        })),
        snapshot,
      } as ApprovedJob;
    });

    if (importedRows.length === 0) {
      window.alert("No encontre trabajos nuevos para importar. Los numeros ya existen en el sistema.");
      return;
    }

    setApprovedJobs((prev) => [...importedRows, ...prev]);
    setSelectedApprovedJobId(importedRows[0].id);
    setActiveTab("aprobados");
    window.alert(`Se importaron ${importedRows.length} trabajos historicos para completar luego uno por uno.`);
  };

  const rejectBudget = (id: number) => {
    setSavedBudgets((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: "no_aprobado" } : row))
    );
  };

  const updateApprovedJob = (
    jobId: number,
    field: keyof ApprovedJob,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        if (field === "executionStatus" && value === "finalizado") {
          const commissionPaid = job.commissionPayments.reduce(
            (acc, item) => acc + Number(item.amount || 0),
            0
          );
          if (Math.max(0, Number(job.commissionAmount || 0) - commissionPaid) > 0) {
            window.alert("No puedes finalizar el trabajo si la comision sigue pendiente.");
            return job;
          }
        }
        const nextJob = { ...job, [field]: value } as ApprovedJob;
        if (field === "approvalDate") {
          nextJob.startDate = String(value);
          nextJob.deliveryDate = buildDeliveryDateFromTerm(String(value), nextJob.deliveryTerm);
        }
        if (field === "deliveryTerm") {
          nextJob.deliveryDate = buildDeliveryDateFromTerm(nextJob.approvalDate, String(value));
        }
        return nextJob;
      })
    );
  };

  const addInvoice = (jobId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              invoices: [
                {
                  id: newId(),
                  businessName: job.client,
                  taxId: "",
                  invoiceType: "A",
                  invoiceNumber: "",
                  invoiceDate: "",
                  subtotal: 0,
                  vat: 0,
                  total: 0,
                },
                ...job.invoices,
              ],
            }
          : job
      )
    );
  };

  const updateInvoice = (
    jobId: number,
    invoiceId: number,
    field: keyof Invoice,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              invoices: job.invoices.map((invoice) => {
                if (invoice.id !== invoiceId) return invoice;
                const nextInvoice = { ...invoice, [field]: value } as Invoice;
                if (field === "subtotal" || field === "vat") {
                  nextInvoice.total =
                    Number(nextInvoice.subtotal || 0) + Number(nextInvoice.vat || 0);
                }
                return nextInvoice;
              }),
            }
          : job
      )
    );
  };

  const addPayment = (jobId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              payments: [
                {
                  id: newId(),
                  paymentNumber: "",
                  paymentDate: "",
                  transactionType: "transferencia",
                  amount: 0,
                },
                ...job.payments,
              ],
            }
          : job
      )
    );
  };

  const updatePayment = (
    jobId: number,
    paymentId: number,
    field: keyof Payment,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              payments: job.payments.map((payment) =>
                payment.id === paymentId ? { ...payment, [field]: value } : payment
              ),
            }
          : job
      )
    );
  };

  const addRetention = (jobId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              retentions: [
                {
                  id: newId(),
                  retentionNumber: "",
                  retentionDate: "",
                  retentionType: "",
                  amount: 0,
                },
                ...job.retentions,
              ],
            }
          : job
      )
    );
  };

  const updateRetention = (
    jobId: number,
    retentionId: number,
    field: keyof Retention,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              retentions: job.retentions.map((retention) =>
                retention.id === retentionId ? { ...retention, [field]: value } : retention
              ),
            }
          : job
      )
    );
  };

  const addAdditional = (jobId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              additionals: [
                {
                  id: newId(),
                  date: todayIso(),
                  description: "Adicional",
                  amount: 0,
                  notes: "",
                },
                ...job.additionals,
              ],
            }
          : job
      )
    );
  };

  const updateAdditional = (
    jobId: number,
    additionalId: number,
    field: keyof AdditionalItem,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              additionals: job.additionals.map((item) =>
                item.id === additionalId ? { ...item, [field]: value } : item
              ),
            }
          : job
      )
    );
  };

  const removeAdditional = (jobId: number, additionalId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              additionals: job.additionals.filter((item) => item.id !== additionalId),
            }
          : job
      )
    );
  };

  const addCommissionPayment = (jobId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              commissionPayments: [
                {
                  id: newId(),
                  paymentDate: todayIso(),
                  amount: 0,
                  note: "",
                },
                ...job.commissionPayments,
              ],
            }
          : job
      )
    );
  };

  const updateCommissionPayment = (
    jobId: number,
    paymentId: number,
    field: keyof CommissionPayment,
    value: string | number
  ) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              commissionPayments: job.commissionPayments.map((item) =>
                item.id === paymentId ? { ...item, [field]: value } : item
              ),
            }
          : job
      )
    );
  };

  const removeCommissionPayment = (jobId: number, paymentId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              commissionPayments: job.commissionPayments.filter((item) => item.id !== paymentId),
            }
          : job
      )
    );
  };

  const uploadApprovedJobFile = (
    jobId: number,
    section: "invoices" | "payments" | "retentions" | "commissionPayments",
    itemId: number,
    file: File | null
  ) => {
    if (!file) return;
    setApprovedJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        return {
          ...job,
          [section]: job[section].map((item) =>
            item.id === itemId ? { ...item, attachmentName: file.name } : item
          ),
        };
      })
    );
  };

  const addMaterial = () =>
    setMaterials((prev) => [
      ...prev,
      {
        id: newId(),
        description: "",
        qty: 1,
        unit: "u",
        unitPrice: 0,
        sortOrder: prev.length + 1,
      },
    ]);

  const removeMaterial = (itemId: number) => {
    setMaterials((prev) => prev.filter((item) => item.id !== itemId));
  };

  const saveCurrentAsSubBudget = () => {
    if (!currentWorkingHasContent) {
      setStorageMessage("No hay contenido cargado para guardar como subpresupuesto.");
      return;
    }

    const nextSection: BudgetSection = {
      id: newId(),
      title: subBudgetTitle.trim() || `Subpresupuesto ${subBudgets.length + 1}`,
      notes: subBudgetNotes.trim(),
      materials: materials.map((item) => ({ ...item })),
      basicSupplies: basicSupplies.map((item) => ({ ...item })),
      labor: labor.map((item) => ({ ...item })),
      fixedCosts: fixedCosts.map((item) => ({ ...item })),
      increases: budgetIncreases.map((item) => ({ ...item })),
      discounts: budgetDiscounts.map((item) => ({ ...item })),
      totals: { ...currentWorkingSectionTotals },
      savedAt: new Date().toISOString(),
    };

    // El contenido editable (materiales, mano de obra, insumos, costos fijos, etc.) NO se
    // resetea al guardar un bloque: queda igual en pantalla para ajustar y guardar el siguiente.
    setSubBudgets((prev) => [...prev, nextSection]);
    setStorageMessage(
      `${nextSection.title} guardado. El contenido quedo en pantalla para que ajustes y guardes el siguiente bloque.`
    );
    setMonthReportPromptTab(activeTab);
  };

  const removeSubBudget = (subBudgetId: number) => {
    setSubBudgets((prev) => prev.filter((item) => item.id !== subBudgetId));
  };

  const loadSubBudgetIntoEditor = (subBudgetId: number) => {
    const target = subBudgets.find((item) => item.id === subBudgetId);
    if (!target) return;

    setSubBudgetTitle(target.title);
    setSubBudgetNotes(target.notes);
    setMaterials(target.materials.map((item) => ({ ...item })));
    setBasicSupplies(target.basicSupplies.map((item) => ({ ...item })));
    setLabor(target.labor.map((item) => ({ ...item })));
    setFixedCosts(target.fixedCosts.map((item) => ({ ...item })));
    setBudgetIncreases((target.increases || []).map((item) => ({ ...item })));
    setBudgetDiscounts(target.discounts.map((item) => ({ ...item })));
    setSubBudgets((prev) => prev.filter((item) => item.id !== subBudgetId));
  };

  const findGeneralStockMatch = (rawValue: string) => {
    const normalized = rawValue.trim().toLowerCase();
    if (!normalized) return null;

    return (
      stockSearchOptions.find(
        (item) => item.code.trim().toLowerCase() === normalized
      ) ||
      stockSearchOptions.find(
        (item) => item.description.trim().toLowerCase() === normalized
      ) ||
      stockSearchOptions.find(
        (item) =>
          `${item.code} - ${item.description}`.trim().toLowerCase() === normalized
      ) ||
      null
    );
  };

  const applyStockSuggestionToMaterial = (itemId: number, rawValue: string) => {
    const stockMatch = findGeneralStockMatch(rawValue);

    setMaterials((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (!stockMatch) {
          return {
            ...item,
            description: rawValue,
            stockCode: undefined,
            stockGroup: undefined,
            stockLocation: undefined,
          };
        }

        return {
          ...item,
          description: stockMatch.description,
          stockCode: stockMatch.code,
          stockGroup: stockMatch.group,
          stockLocation: stockMatch.location,
          unit: stockMatch.unit || item.unit,
          unitPrice: Number(stockMatch.unitPrice || 0),
          sortOrder:
            item.sortOrder ??
            Number(stockMatch.sortOrder || prev.findIndex((row) => row.id === itemId) + 1),
        };
      })
    );
  };

  const addMaterialToStock = (itemId: number) => {
    const source = materials.find((item) => item.id === itemId);
    if (!source || !source.description.trim()) return;

    const nextGroup = (source.stockGroup as StockGeneralGroupName) || "Melaminas";
    const nextSortOrder =
      Math.max(
        0,
        ...stockItems
          .filter((item) => item.kind === "general")
          .map((item) => Number(item.sortOrder || 0))
      ) + 1;

    const newStockItem: StockItem = {
      id: newId(),
      company: "General",
      kind: "general",
      shared: true,
      group: nextGroup,
      location: source.stockLocation || "",
      sortOrder: nextSortOrder,
      code: getNextStockCode(stockItems, nextGroup),
      description: source.description,
      unit: source.unit || "u",
      quantity: 0,
      unitPrice: Number(source.unitPrice || 0),
      periodicityMonths: 0,
      active: true,
    };

    setStockItems((prev) => [...prev, newStockItem]);
    setMaterials((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              stockCode: newStockItem.code,
              stockGroup: newStockItem.group,
              stockLocation: newStockItem.location,
              sortOrder: item.sortOrder ?? newStockItem.sortOrder,
            }
          : item
      )
    );
    setActiveTab("stock");
  };

  const moveMaterial = (itemId: number, direction: -1 | 1) => {
    const ordered = [...displayedMaterials];
    const currentIndex = ordered.findIndex((item) => item.id === itemId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const nextOrdered = [...ordered];
    const [moved] = nextOrdered.splice(currentIndex, 1);
    nextOrdered.splice(targetIndex, 0, moved);

    setMaterials((prev) =>
      prev.map((item) => {
        const newIndex = nextOrdered.findIndex((row) => row.id === item.id);
        return newIndex >= 0 ? { ...item, sortOrder: newIndex + 1 } : item;
      })
    );
  };

  const addBudgetDiscount = () =>
    setBudgetDiscounts((prev) => [
      ...prev,
      { id: newId(), description: "Descuento comercial", amount: 0 },
    ]);

  const addBudgetIncrease = () =>
    setBudgetIncreases((prev) => [
      ...prev,
      { id: newId(), description: "Actualizacion comercial", pct: 0 },
    ]);

  const removeBudgetIncrease = (increaseId: number) => {
    setBudgetIncreases((prev) => prev.filter((item) => item.id !== increaseId));
  };

  const removeBudgetDiscount = (discountId: number) => {
    setBudgetDiscounts((prev) => prev.filter((item) => item.id !== discountId));
  };

  const addBasicSupply = () =>
    setBasicSupplies((prev) => [
      ...prev,
      { id: newId(), description: "", qty: 1, unit: "u", unitPrice: 0 },
    ]);

  const promptAndCreateCostAnalysisGroup = (company: CompanyScope = "General") => {
    const name = window.prompt("Nombre del nuevo grupo o categoria:");
    const normalized = (name || "").trim();
    if (!normalized) return null;

    const existing = costAnalysisGroups.find(
      (item) => item.name.trim().toLowerCase() === normalized.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    const createdGroup: CostAnalysisGroup = {
      id: newId(),
      name: normalized,
      company,
      active: true,
      notes: "",
    };
    setCostAnalysisGroups((prev) => [
      ...prev,
      createdGroup,
    ]);
    return createdGroup;
  };

  const addFixedMarker = () =>
    setFixedMarkers((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        workType: budget.workType,
        group: fixedMarkerGroupOptions[0] || "Administrativos",
        description: "",
        amount: 0,
        active: true,
        notes: "",
      },
    ]);

  const addSupplyMarker = () =>
    setSupplyMarkers((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        workType: budget.workType,
        subtype: "Insumos basicos",
        description: "",
        qty: 1,
        unit: "u",
        unitPrice: 0,
        active: true,
        notes: "",
      },
    ]);

  const addLaborMarker = () =>
    setLaborMarkers((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        workType: budget.workType,
        category: "",
        employees: 1,
        monthlyHoursPerEmployee: nominalLaborHoursPerEmployee,
        hourlyRate: 0,
        hoursBase: 0,
        active: true,
        notes: "",
      },
    ]);

  const addPersonalProvisionMarker = () =>
    setPersonalProvisionMarkers((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        shared: true,
        kind: "EPP",
        description: "",
        amountPerDelivery: 0,
        periodicityMonths: 6,
        active: true,
        notes: "",
      },
    ]);

  const addCostAnalysisGroup = () => {
    promptAndCreateCostAnalysisGroup("General");
  };

  const addCostAnalysisEntry = () => {
    const fallbackGroup =
      costAnalysisGroups[0] ?? promptAndCreateCostAnalysisGroup("General");
    if (!fallbackGroup) return;

    setCostAnalysisEntries((prev) => [
      ...prev,
      {
        id: newId(),
        groupId: fallbackGroup.id,
        company: "General",
        description: "",
        unit: "u",
        quantity: 0,
        unitCost: 0,
        active: true,
        notes: "",
      },
    ]);
  };

  const updateCostAnalysisGroup = (
    groupId: number,
    field: keyof CostAnalysisGroup,
    value: string | boolean
  ) => {
    setCostAnalysisGroups((prev) =>
      prev.map((item) => (item.id === groupId ? { ...item, [field]: value } : item))
    );
  };

  const removeCostAnalysisGroup = (groupId: number) => {
    setCostAnalysisGroups((prev) => prev.filter((item) => item.id !== groupId));
    setCostAnalysisEntries((prev) => prev.filter((item) => item.groupId !== groupId));
  };

  const updateCostAnalysisEntry = (
    entryId: number,
    field: keyof CostAnalysisEntry,
    value: string | number | boolean
  ) => {
    setCostAnalysisEntries((prev) =>
      prev.map((item) => (item.id === entryId ? { ...item, [field]: value } : item))
    );
  };

  const removeCostAnalysisEntry = (entryId: number) => {
    setCostAnalysisEntries((prev) => prev.filter((item) => item.id !== entryId));
  };

  const addRemitoDraftRow = (draftId: number) => {
    setRemitoDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              rows: [...draft.rows, buildBlankRemitoDraftRow(draft.company)],
            }
          : draft
      )
    );
  };

  const removeRemitoDraft = (draftId: number) => {
    setRemitoDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const updateRemitoDraft = (
    draftId: number,
    field: keyof Omit<RemitoDraft, "id" | "rows" | "sourceType">,
    value: string
  ) => {
    setRemitoDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              [field]: value,
              rows:
                field === "company"
                  ? draft.rows.map((row) => ({ ...row, company: value as CompanyScope }))
                  : draft.rows,
            }
          : draft
      )
    );
  };

  const updateRemitoDraftRow = (
    draftId: number,
    rowId: number,
    field: keyof RemitoDraftRow,
    value: string | number | null
  ) => {
    setRemitoDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              rows: draft.rows.map((row) =>
                row.id === rowId ? { ...row, [field]: value } : row
              ),
            }
          : draft
      )
    );
  };

  const removeRemitoDraftRow = (draftId: number, rowId: number) => {
    setRemitoDrafts((prev) =>
      prev.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              rows: draft.rows.filter((row) => row.id !== rowId),
            }
          : draft
      )
    );
  };

  const handleRemitoFiles = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;

    const drafts: RemitoDraft[] = [];

    for (const file of selectedFiles) {
      const sourceType = inferRemitoSourceType(file.name);
      let rows: RemitoDraftRow[] = [];
      let notes = "";

      if (/\.(csv|tsv|txt)$/i.test(file.name)) {
        try {
          const text = await readTextFile(file);
          rows = parseDelimitedRemitoRows(text, budget.company);
          if (rows.length === 0) {
            notes =
              "No se detectaron filas claras en el archivo. Revise y complete manualmente antes de cargar al stock.";
          }
        } catch (error) {
          notes =
            "No se pudo leer el archivo automaticamente. Revise y complete manualmente antes de cargar al stock.";
        }
      } else {
        notes =
          "Archivo cargado para revision manual. Controle descripcion, grupo, ubicacion, unidad, cantidad y precio antes de pasarlo al stock.";
      }

      drafts.push({
        id: newId(),
        fileName: file.name,
        sourceType,
        company: budget.company,
        notes,
        rows: rows.length > 0 ? rows : [buildBlankRemitoDraftRow(budget.company)],
      });
    }

    setRemitoDrafts((prev) => [...drafts, ...prev]);
  };

  const commitRemitoDraftToStock = (draftId: number) => {
    const draft = remitoDrafts.find((item) => item.id === draftId);
    if (!draft) return;

    const validRows = draft.rows.filter(
      (row) => row.description.trim() || Number(row.quantity || 0) || Number(row.unitPrice || 0)
    );

    if (validRows.length === 0) {
      window.alert("No hay filas validas para cargar al stock.");
      return;
    }

    setStockItems((prev) => {
      const nextStock = [...prev];

      validRows.forEach((row) => {
        const normalizedDescription = row.description.trim().toLowerCase();
        const matchedIndex =
          row.matchedStockId != null
            ? nextStock.findIndex((item) => item.id === row.matchedStockId)
            : nextStock.findIndex(
                (item) =>
                  item.kind === "general" &&
                  item.description.trim().toLowerCase() === normalizedDescription &&
                  (item.company === row.company ||
                    item.company === "General" ||
                    row.company === "General")
              );

        if (matchedIndex >= 0) {
          const existing = nextStock[matchedIndex];
          const incomingQuantity = Number(row.quantity || 0);
          const existingQuantity = Number(existing.quantity || 0);
          const incomingPrice = Number(row.unitPrice || 0);
          const existingPrice = Number(existing.unitPrice || 0);
          const totalQuantity = existingQuantity + incomingQuantity;
          const weightedPrice =
            totalQuantity > 0
              ? (existingQuantity * existingPrice + incomingQuantity * incomingPrice) / totalQuantity
              : existingPrice;

          nextStock[matchedIndex] = {
            ...existing,
            company: row.company === "General" ? existing.company : row.company,
            group: row.group || existing.group,
            location: row.location || existing.location,
            unit: row.unit || existing.unit,
            quantity: totalQuantity,
            unitPrice: Number(weightedPrice.toFixed(2)),
            active: true,
          };
          return;
        }

        const nextGroup = row.group.trim() || "Melaminas";
        nextStock.push({
          id: newId(),
          company: row.company,
          kind: "general",
          shared: row.company === "General",
          group: nextGroup,
          location: row.location,
          sortOrder:
            Math.max(
              0,
              ...nextStock
                .filter((item) => item.kind === "general")
                .map((item) => Number(item.sortOrder || 0))
            ) + 1,
          code: getNextStockCode(nextStock, nextGroup as StockGeneralGroupName),
          description: row.description.trim(),
          unit: row.unit || "u",
          quantity: Number(row.quantity || 0),
          unitPrice: Number(row.unitPrice || 0),
          periodicityMonths: 0,
          active: true,
        });
      });

      return nextStock;
    });

    setRemitoDrafts((prev) => prev.filter((item) => item.id !== draftId));
  };

  const removeFixedMarker = (markerId: number) => {
    setFixedMarkers((prev) => prev.filter((item) => item.id !== markerId));
  };

  const removeSupplyMarker = (markerId: number) => {
    setSupplyMarkers((prev) => prev.filter((item) => item.id !== markerId));
  };

  const removeLaborMarker = (markerId: number) => {
    setLaborMarkers((prev) => prev.filter((item) => item.id !== markerId));
  };

  const removePersonalProvisionMarker = (markerId: number) => {
    setPersonalProvisionMarkers((prev) => prev.filter((item) => item.id !== markerId));
  };

  const applyMarkersToBudget = () => {
    restoreAllBudgetBlocksFromMarkers();
  };

  const restoreFixedCostsFromMarkers = () => {
    setFixedCosts((prev) => {
      const manualRows = prev.filter((item) => !item.sourceMarkerId);
      return [...activeFixedCostsFromSourcesForBudget, ...manualRows];
    });
  };

  const restoreBasicSuppliesFromMarkers = () => {
    setBasicSupplies((prev) => {
      const manualRows = prev.filter((item) => !item.sourceMarkerId);
      return [...activeSupplyMarkersForBudget.map(mapSupplyMarkerToBudgetRow), ...manualRows];
    });
  };

  const restoreLaborFromMarkers = () => {
    setLabor((prev) => {
      const manualRows = prev.filter((item) => !item.sourceMarkerId);
      return [...activeLaborMarkersForBudget.map(mapLaborMarkerToBudgetRow), ...manualRows];
    });
  };

  const restoreAllBudgetBlocksFromMarkers = () => {
    setFixedCosts(activeFixedCostsFromSourcesForBudget);
    setBasicSupplies(activeSupplyMarkersForBudget.map(mapSupplyMarkerToBudgetRow));
    setLabor(activeLaborMarkersForBudget.map(mapLaborMarkerToBudgetRow));
  };

  const addLabor = () =>
    setLabor((prev) => [
      ...prev,
      {
        id: newId(),
        category: "Ayudante",
        employees: 1,
        monthlyHoursPerEmployee: nominalLaborHoursPerEmployee,
        hourlyRate: 0,
        jobHours: 0,
      },
    ]);

  const addFixedCost = () =>
    setFixedCosts((prev) => [...prev, { id: newId(), description: "Nuevo costo", amount: 0 }]);

  const removeBasicSupply = (itemId: number) => {
    setBasicSupplies((prev) => prev.filter((item) => item.id !== itemId));
  };

  const removeLabor = (itemId: number) => {
    setLabor((prev) => prev.filter((item) => item.id !== itemId));
  };

  const removeFixedCost = (itemId: number) => {
    setFixedCosts((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Marcadores: ya NO se reaplican automaticamente al cambiar empresa o tipo de
  // trabajo (eso borraba filas cargadas a mano). Se aplican solo desde los botones
  // "Aplicar al presupuesto actual" y "Restaurar desde marcadores".

  useEffect(() => {
    if (!isPersistenceReady) return;

    let supabaseTimeoutId: number | undefined;

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload: PersistedAppState = {
          version: APP_PERSISTENCE_VERSION,
          savedAt: new Date().toISOString(),
          data: buildPersistedAppData(),
        };
        const payloadSignature = buildPersistedDataSignature(payload.data);

        // --- Captura para "Atras" (deshacer) ---
        // Corre en cada estado asentado. Si el cambio vino de una restauracion/sync
        // (suppress) o es la primera vez, solo re-asienta la baseline sin crear un paso.
        const currentUndoJson = JSON.stringify(payload.data);
        if (suppressUndoCaptureRef.current) {
          suppressUndoCaptureRef.current = false;
          undoBaselineRef.current = currentUndoJson;
        } else if (undoBaselineRef.current === null) {
          undoBaselineRef.current = currentUndoJson;
        } else if (currentUndoJson !== undoBaselineRef.current) {
          undoStackRef.current.push(undoBaselineRef.current);
          if (undoStackRef.current.length > UNDO_HISTORY_LIMIT) {
            undoStackRef.current.shift();
          }
          undoBaselineRef.current = currentUndoJson;
          setUndoAvailable(undoStackRef.current.length);
          // Una edicion nueva invalida lo que se podia rehacer.
          if (redoStackRef.current.length > 0) {
            redoStackRef.current = [];
            setRedoAvailable(0);
          }
        }

        if (payloadSignature === lastPersistedDataSignatureRef.current) {
          return;
        }
        await writePersistedAppState(payload);
        lastPersistedDataSignatureRef.current = payloadSignature;
        setLastSavedAt(payload.savedAt);

        const canAutosaveSupabase =
          isSupabaseLoggedIn &&
          isSupabaseSnapshotReady &&
          supabaseHydratedOkRef.current &&
          !pendingRemoteSnapshotRef.current &&
          Date.now() - lastAppliedRemoteSnapshotAtRef.current > 1500;

        if (!canAutosaveSupabase) return;

        const { changedModuleKeys, nextSignatures } = getChangedPersistedModuleKeys(
          payload.data,
          lastSupabaseModuleSignaturesRef.current
        );
        const shouldSeedAllModules =
          Object.keys(lastSupabaseModuleSignaturesRef.current).length === 0;

        if (!shouldSeedAllModules && changedModuleKeys.length === 0) return;

        const msUntilRemoteSave = Math.max(
          0,
          SUPABASE_AUTOSAVE_MIN_INTERVAL_MS -
            (Date.now() - lastSupabaseAutosaveAtRef.current)
        );

        supabaseTimeoutId = window.setTimeout(async () => {
          try {
            const supabaseWriteResult = await writeSupabasePersistedAppState(payload, {
              moduleKeys: shouldSeedAllModules ? undefined : changedModuleKeys,
              writableCompanies: allowedCompaniesForSession,
            });
            lastSupabaseAutosaveAtRef.current = Date.now();
            lastSupabaseSnapshotSavedAtRef.current = payload.savedAt;
            lastSupabaseModuleSignaturesRef.current = nextSignatures;
            const savedModuleText = formatPersistenceModuleList(
              supabaseWriteResult.moduleKeys
            );
            setStorageMessage(
              supabaseWriteResult.mode === "modules"
                ? shouldSeedAllModules
                  ? "Guardado compartido inicial sincronizado por modulos."
                  : `Guardado compartido actualizado: ${savedModuleText}.`
                : "Guardado compartido actualizado en modo compatible. Ejecuta la query de guardado por modulos para reducir la carga."
            );
          } catch (error) {
            lastPersistedDataSignatureRef.current = "";
            setStorageMessage(
              error instanceof Error
                ? error.message
                : "No pude guardar los datos automaticamente en Supabase."
            );
          }
        }, msUntilRemoteSave);
      } catch (error) {
        setStorageMessage(
          error instanceof Error
            ? error.message
            : "No pude guardar los datos automaticamente."
        );
      }
    }, LOCAL_AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
      if (supabaseTimeoutId !== undefined) {
        window.clearTimeout(supabaseTimeoutId);
      }
    };
  }, [
    operationalMonth,
    monthlyHistorySnapshots,
    budget,
    subBudgets,
    subBudgetTitle,
    subBudgetNotes,
    materials,
    basicSupplies,
    labor,
    fixedCosts,
    budgetIncreases,
    budgetDiscounts,
    fixedMarkers,
    supplyMarkers,
    laborMarkers,
    personalProvisionMarkers,
    savedBudgets,
    approvedJobs,
    financialItems,
    purchaseInvoices,
    pettyCashFunds,
    pettyCashExpenses,
    debtPlans,
    bankStatementEntries,
    stockItems,
    costAnalysisGroups,
    costAnalysisEntries,
    remitoDrafts,
    companyAssets,
    employees,
    employeeBaseConfig,
    scaleRows,
    allocationMode,
    manualAllocationPct,
    deviationPct,
    markupPct,
    vatPct,
    laborDeviationPct,
    commissionPct,
    stockIncreasePct,
    editingBudgetId,
    isPersistenceReady,
    isSupabaseLoggedIn,
    isSupabaseSnapshotReady,
  ]);

  const updateArrayItem = <T extends { id: number }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: number,
    field: keyof T,
    value: T[keyof T]
  ) => {
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addFinancialItem = (date?: string, company?: CompanyName) => {
    const item: FinancialCalendarItem = {
      id: newId(),
      company: company ?? budget.company,
      date: date ?? `${financialMonth}-01`,
      type: "facturacion",
      status: "pendiente",
      title: "",
      jobCode: "",
      client: "",
      amount: 0,
      notes: "",
    };
    setFinancialItems((prev) => [item, ...prev]);
    setSelectedFinancialItemId(item.id);
  };

  const addStockItem = () => {
    setStockItems((prev) => [
      ...prev,
      {
        id: newId(),
        company: "General",
        kind: "general",
        shared: true,
        group: "Melaminas",
        location: "",
        sortOrder:
          Math.max(
            0,
            ...prev.filter((item) => item.kind === "general").map((item) => Number(item.sortOrder || 0))
          ) + 1,
        code: getNextStockCode(prev, "Melaminas"),
        description: "",
        unit: "u",
        quantity: 0,
        unitPrice: 0,
        periodicityMonths: 0,
        active: true,
      },
    ]);
  };

  const addPurchaseInvoice = () => {
    setPurchaseInvoices((prev) => [
      {
        id: newId(),
        company: budget.company,
        administration: "blanco",
        source: "compras",
        pettyCashExpenseId: undefined,
        supplier: "",
        taxId: "",
        receiptKind: "Factura",
        receiptLetter: "A",
        invoiceNumber: "",
        invoiceDate: defaultDateForActiveMonth(),
        currency: "ARS",
        exemptAmount: 0,
        net21: 0,
        subtotal: 0,
        vat: 0,
        total: 0,
        notes: "",
        extractedAutomatically: false,
      },
      ...prev,
    ]);
  };

  const updatePurchaseInvoice = (
    invoiceId: number,
    field: keyof PurchaseInvoice,
    value: string | number | boolean
  ) => {
    setPurchaseInvoices((prev) =>
      prev.map((item) => {
        if (item.id !== invoiceId) return item;
        const next = { ...item, [field]: value } as PurchaseInvoice;
        if (field === "subtotal" || field === "vat") {
          next.total = Number(next.subtotal || 0) + Number(next.vat || 0);
        }
        return next;
      })
    );
  };

  const removePurchaseInvoice = (invoiceId: number) => {
    setPurchaseInvoices((prev) => prev.filter((item) => item.id !== invoiceId));
  };

  const addPettyCashFund = () => {
    setPettyCashFunds((prev) => [
      {
        id: newId(),
        company: budget.company,
        description: "",
        responsible: "",
        assignedAmount: 0,
        deliveredDate: todayIso(),
        rechargeDate: "",
        notes: "",
        active: true,
        closed: false,
        closedDate: "",
      },
      ...prev,
    ]);
  };

  const removePettyCashFund = (fundId: number) => {
    setPettyCashFunds((prev) => prev.filter((item) => item.id !== fundId));
    setPettyCashRechargeDrafts((prev) => {
      const next = { ...prev };
      delete next[fundId];
      return next;
    });
    setPettyCashRechargeDateDrafts((prev) => {
      const next = { ...prev };
      delete next[fundId];
      return next;
    });
    setPettyCashExpenses((prev) =>
      prev.map((item) =>
        item.fundId === fundId ? { ...item, fundId: null } : item
      )
    );
  };

  const addPettyCashExpense = (fundId?: number | null) => {
    const selectedFund =
      typeof fundId === "number"
        ? pettyCashFunds.find((item) => item.id === fundId) || null
        : visiblePettyCashFunds[0] || null;
    setPettyCashExpenses((prev) => [
      {
        id: newId(),
        company: selectedFund?.company || budget.company,
        fundId: selectedFund?.id ?? null,
        date: defaultDateForActiveMonth(),
        category: "Gasto operativo",
        description: "",
        amount: 0,
        administration: "negro",
        supplier: "",
        invoiceNumber: "",
        notes: "",
        attachmentName: "",
        linkedPurchaseInvoiceId: null,
      },
      ...prev,
    ]);
  };

  const updatePettyCashExpense = (
    expenseId: number,
    field: keyof PettyCashExpense,
    value: string | number | null
  ) => {
    setPettyCashExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== expenseId) return item;
        const next = { ...item, [field]: value } as PettyCashExpense;
        next.administration = getPettyCashAdministration(next);
        return next;
      })
    );
  };

  const removePettyCashExpense = (expenseId: number) => {
    setPettyCashExpenses((prev) => prev.filter((item) => item.id !== expenseId));
    setPurchaseInvoices((prev) =>
      prev.filter((item) => item.pettyCashExpenseId !== expenseId)
    );
  };

  const uploadPettyCashFile = (expenseId: number, file: File | null) => {
    if (!file) return;
    setPettyCashExpenses((prev) =>
      prev.map((item) => {
        if (item.id !== expenseId) return item;
        const next = {
          ...item,
          attachmentName: file.name,
        };
        return {
          ...next,
          administration: getPettyCashAdministration(next),
        };
      })
    );
  };

  const rechargePettyCashFund = (fundId: number) => {
    const amount = Number(pettyCashRechargeDrafts[fundId] || 0);
    const rechargeDate = pettyCashRechargeDateDrafts[fundId] || todayIso();
    if (!Number.isFinite(amount) || amount <= 0) {
      setStorageMessage("Para recargar un fondo, carga un importe mayor a cero.");
      return;
    }
    setPettyCashFunds((prev) =>
      prev.map((item) =>
        item.id === fundId
          ? {
              ...item,
              assignedAmount: Number(item.assignedAmount || 0) + amount,
              rechargeDate,
              active: true,
              closed: false,
              closedDate: "",
            }
          : item
      )
    );
    setPettyCashRechargeDrafts((prev) => ({ ...prev, [fundId]: "" }));
    setPettyCashRechargeDateDrafts((prev) => ({ ...prev, [fundId]: todayIso() }));
    setStorageMessage("Fondo de caja chica recargado correctamente.");
  };

  const reopenPettyCashFund = (fundId: number) => {
    setPettyCashFunds((prev) =>
      prev.map((item) =>
        item.id === fundId
          ? { ...item, active: true, closed: false, closedDate: "" }
          : item
      )
    );
    setStorageMessage("Caja chica reabierta para continuar operando.");
  };

  const addDebtPlan = () => {
    setDebtPlans((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        concept: "",
        dueDay: 1,
        nextInstallmentAmount: 0,
        remainingInstallments: 0,
        nextDueDate: todayIso(),
        notes: "",
        active: true,
      },
    ]);
  };

  const removeDebtPlan = (debtId: number) => {
    setDebtPlans((prev) => prev.filter((item) => item.id !== debtId));
  };

  const addBankStatementEntry = () => {
    setBankStatementEntries((prev) => [
      {
        id: newId(),
        company: budget.company,
        date: defaultDateForActiveMonth(),
        bank: "",
        movementType: "credito",
        concept: "",
        amount: 0,
        balance: 0,
        notes: "",
        extractedAutomatically: false,
      },
      ...prev,
    ]);
  };

  const removeBankStatementEntry = (entryId: number) => {
    setBankStatementEntries((prev) => prev.filter((item) => item.id !== entryId));
  };

  const updateBankStatementEntry = (
    entryId: number,
    field: keyof BankStatementEntry,
    value: string | number | boolean
  ) => {
    setBankStatementEntries((prev) =>
      prev.map((item) => (item.id === entryId ? { ...item, [field]: value } : item))
    );
  };

  const uploadBankStatementFile = (entryId: number, file: File | null) => {
    if (!file) return;
    const bareName = file.name.replace(/\.[^.]+$/, "");
    const normalizedName = bareName.replace(/[_-]+/g, " ");
    const isDebit = /egreso|debito|pago/i.test(normalizedName);
    setBankStatementEntries((prev) =>
      prev.map((item) =>
        item.id === entryId
          ? {
              ...item,
              attachmentName: file.name,
              extractedAutomatically: true,
              bank: item.bank || normalizedName,
              concept: item.concept || "Resumen bancario importado",
              movementType: isDebit ? "debito" : item.movementType,
            }
          : item
      )
    );
  };

  const uploadPurchaseInvoiceFile = (invoiceId: number, file: File | null) => {
    if (!file) return;
    const bareName = file.name.replace(/\.[^.]+$/, "");
    const amountMatch = bareName.match(/(\d+(?:[.,]\d{1,2})?)/);
    const parsedAmount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : 0;

    setPurchaseInvoices((prev) =>
      prev.map((item) =>
        item.id === invoiceId
          ? {
              ...item,
              attachmentName: file.name,
              extractedAutomatically: true,
              supplier: item.supplier || bareName,
              subtotal: item.subtotal || parsedAmount,
              total: item.total || parsedAmount,
            }
          : item
      )
    );
  };

  const addCompanyAsset = () => {
    setCompanyAssets((prev) => [
      ...prev,
      {
        id: newId(),
        company: budget.company,
        category: "Activo fijo",
        description: "",
        value: 0,
        usefulLifeMonths: 60,
        active: true,
        notes: "",
      },
    ]);
  };

  const removeCompanyAsset = (assetId: number) => {
    setCompanyAssets((prev) => prev.filter((item) => item.id !== assetId));
  };

  const addPersonalStockItem = (kind: "EPP" | "Insumos") => {
    setStockItems((prev) => [
      ...prev,
      {
        id: newId(),
        company: "General",
        kind,
        shared: true,
        group: kind,
        location: "",
        sortOrder:
          Math.max(0, ...prev.map((item) => Number(item.sortOrder || 0))) + 1,
        code: `${kind === "EPP" ? "EPP" : "INS"}-${prev.length + 1}`,
        description: "",
        unit: "u",
        quantity: 0,
        unitPrice: 0,
        periodicityMonths: 6,
        active: true,
      },
    ]);
  };

  const removeStockItem = (itemId: number) => {
    setStockItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateStockItem = (
    itemId: number,
    field: keyof StockItem,
    value: string | number | boolean
  ) => {
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (field === "group" && item.kind === "general") {
          const nextGroup = String(value);
          return {
            ...item,
            group: nextGroup,
            code: getNextStockCode(prev, nextGroup as StockGeneralGroupName, itemId),
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const removeSavedBudget = (budgetId: number) => {
    const target = savedBudgets.find((item) => item.id === budgetId);
    if (!target) return;

    const confirmed = window.confirm(
      `Vas a quitar ${getSavedBudgetDisplayLabel(target)} del historial y del CRM. ¿Quieres continuar?`
    );
    if (!confirmed) return;

    const remainingBudgets = savedBudgets.filter((item) => item.id !== budgetId);
    setSavedBudgets(remainingBudgets);
    setSelectedHistoryId((prev) => (prev === budgetId ? null : prev));
    if (editingBudgetId === budgetId) {
      resetBudgetEditingState();
    }

    const sameRootRemaining = remainingBudgets
      .filter((item) => (item.rootBudgetId || item.id) === (target.rootBudgetId || target.id))
      .sort((a, b) => (b.revisionNumber || 1) - (a.revisionNumber || 1));
    const latestRemaining = sameRootRemaining[0] || null;

    setApprovedJobs((prev) =>
      prev.flatMap((job) => {
        if (job.budgetId !== budgetId && job.rootBudgetId !== (target.rootBudgetId || target.id)) {
          return [job];
        }
        if (!latestRemaining) return [];
        if (job.budgetId !== budgetId) return [job];

        return [
          {
            ...job,
            budgetId: latestRemaining.id,
            rootBudgetId: latestRemaining.rootBudgetId || latestRemaining.id,
            revisionNumber: latestRemaining.revisionNumber || 1,
            isUpdate: latestRemaining.isUpdate,
            budgetNumber: latestRemaining.number,
            company: latestRemaining.company,
            client: latestRemaining.client,
            project: latestRemaining.project,
            date: latestRemaining.date,
            deliveryTerm: latestRemaining.deliveryTerm,
            deliveryDestination: latestRemaining.deliveryDestination,
            projectManager: latestRemaining.projectManager,
            maxRequirementDate: latestRemaining.maxRequirementDate,
            soldNetPrice: latestRemaining.netPrice,
            soldGrossPrice: latestRemaining.finalPrice,
            commissionPct: latestRemaining.commissionPct,
            commissionAmount: latestRemaining.commissionAmount,
            totalDiscountAmount: latestRemaining.totalDiscountAmount,
            snapshot: latestRemaining.snapshot,
          },
        ];
      })
    );
  };

  const updateFinancialItem = (
    itemId: number,
    field: keyof FinancialCalendarItem,
    value: string | number
  ) => {
    setFinancialItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    );
  };

  const removeFinancialItem = (itemId: number) => {
    setFinancialItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const uploadApprovedJobWorkFiles = (
    jobId: number,
    kind: "plano" | "referencia",
    files: FileList | null
  ) => {
    const fileList = Array.from(files || []);
    if (fileList.length === 0) return;
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              workFiles: [
                ...job.workFiles,
                ...fileList.map((file) => ({
                  id: newId(),
                  kind,
                  name: file.name,
                })),
              ],
            }
          : job
      )
    );
  };

  const applyStockIncrease = () => {
    if (!Number.isFinite(stockIncreasePct) || stockIncreasePct === 0) return;
    setStockItems((prev) =>
      prev.map((item) => ({
        ...item,
        unitPrice: Number((Number(item.unitPrice || 0) * (1 + stockIncreasePct / 100)).toFixed(2)),
      }))
    );
    setStockIncreasePct(0);
  };

  const removeApprovedJobWorkFile = (jobId: number, fileId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              workFiles: job.workFiles.filter((item) => item.id !== fileId),
            }
          : job
      )
    );
  };

  const removeInvoice = (jobId: number, invoiceId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, invoices: job.invoices.filter((invoice) => invoice.id !== invoiceId) }
          : job
      )
    );
  };

  const removePayment = (jobId: number, paymentId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, payments: job.payments.filter((payment) => payment.id !== paymentId) }
          : job
      )
    );
  };

  const removeRetention = (jobId: number, retentionId: number) => {
    setApprovedJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? {
              ...job,
              retentions: job.retentions.filter((retention) => retention.id !== retentionId),
            }
          : job
      )
    );
  };

  const syncOperationalMonth = (month: string) => {
    const safeMonth = month || localMonthKey();
    setOperationalMonth(safeMonth);
    setFinancialMonth(safeMonth);
    setPurchaseMonth(safeMonth);
  };

  const shiftOperationalMonth = (delta: number) => {
    syncOperationalMonth(shiftMonthKey(operationalMonth, delta));
  };

  const shiftFinancialMonth = (delta: number) => {
    syncOperationalMonth(shiftMonthKey(financialMonth, delta));
  };

  const shiftPurchaseMonth = (delta: number) => {
    syncOperationalMonth(shiftMonthKey(purchaseMonth, delta));
  };

  const financialMonthData = useMemo(() => {
    const [year, month] = financialMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const previousMonthDays = new Date(year, month - 1, 0).getDate();
    const cells: Array<{ date: string; day: number; inCurrentMonth: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const relativeDay = index - firstWeekday + 1;
      let cellDate: Date;
      let dayNumber: number;
      let inCurrentMonth = true;

      if (relativeDay <= 0) {
        cellDate = new Date(year, month - 2, previousMonthDays + relativeDay);
        dayNumber = previousMonthDays + relativeDay;
        inCurrentMonth = false;
      } else if (relativeDay > daysInMonth) {
        cellDate = new Date(year, month - 1, relativeDay);
        dayNumber = relativeDay - daysInMonth;
        inCurrentMonth = false;
      } else {
        cellDate = new Date(year, month - 1, relativeDay);
        dayNumber = relativeDay;
      }

      cells.push({
        date: cellDate.toISOString().slice(0, 10),
        day: dayNumber,
        inCurrentMonth,
      });
    }

    return {
      label: firstDay.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      }),
      cells,
    };
  }, [financialMonth]);

  const financialItemsByDate = useMemo(() => {
    const map = new Map<string, FinancialCalendarItem[]>();
    visibleFinancialItems.forEach((item) => {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    });
    return map;
  }, [visibleFinancialItems]);

  // Semaforo resumen de cobros / pagos / fechas (sobre TODO lo visible, no solo el mes,
  // para que un vencido de otro mes igual se vea). verde/amarillo/rojo + conteo.
  const financialSemaphoreSummary = useMemo(() => {
    const summarize = (items: FinancialCalendarItem[]) => {
      let vencidos = 0;
      let porVencer = 0;
      items.forEach((item) => {
        if (item.status === "realizado") return;
        const level = getDateSemaphore(item.date, false).level;
        if (level === "rojo") vencidos += 1;
        else if (level === "amarillo") porVencer += 1;
      });
      const level: SemaphoreLevel = vencidos > 0 ? "rojo" : porVencer > 0 ? "amarillo" : "verde";
      const label =
        vencidos > 0
          ? `${vencidos} vencida${vencidos > 1 ? "s" : ""}`
          : porVencer > 0
            ? `${porVencer} por vencer`
            : "al dia";
      return { level, label };
    };
    return {
      cobros: summarize(visibleFinancialItems.filter((item) => item.type === "cobranza")),
      pagos: summarize(visibleFinancialItems.filter((item) => item.type === "pago")),
      fechas: summarize(visibleFinancialItems.filter((item) => item.type === "facturacion")),
    };
  }, [visibleFinancialItems]);

  // Semaforo resumen de trabajos aprobados (verde finalizado / amarillo en curso / rojo sin fecha inicio).
  const jobSemaphoreSummary = useMemo(() => {
    let rojo = 0;
    let amarillo = 0;
    let verde = 0;
    visibleApprovedJobs.forEach((job) => {
      const level = getJobSemaphore(job).level;
      if (level === "rojo") rojo += 1;
      else if (level === "amarillo") amarillo += 1;
      else verde += 1;
    });
    return { rojo, amarillo, verde };
  }, [visibleApprovedJobs]);

  // Semaforo resumen del historial de presupuestos (verde aprobado / amarillo vigente / rojo vencido o no aprobado).
  const budgetSemaphoreSummary = useMemo(() => {
    let rojo = 0;
    let amarillo = 0;
    let verde = 0;
    getLatestBudgetRevisions(visibleSavedBudgets).forEach((budget) => {
      const level = getBudgetSemaphore(budget).level;
      if (level === "rojo") rojo += 1;
      else if (level === "amarillo") amarillo += 1;
      else verde += 1;
    });
    return { rojo, amarillo, verde };
  }, [visibleSavedBudgets]);

  // Semaforos resumen de stock (faltantes), fondos de caja chica, clientes CRM y fechas limite de compra.
  const stockSemaphoreSummary = useMemo(() => {
    let rojo = 0, amarillo = 0, verde = 0;
    stockNeedRows.forEach((row) => {
      const level = getStockSemaphore(row).level;
      if (level === "rojo") rojo += 1;
      else if (level === "amarillo") amarillo += 1;
      else verde += 1;
    });
    return { rojo, amarillo, verde };
  }, [stockNeedRows]);

  const fundSemaphoreSummary = useMemo(() => {
    let rojo = 0, amarillo = 0, verde = 0;
    pettyCashFundSummaries.forEach((f) => {
      const level = getFundSemaphore(f.remainingBalance, f.fund.assignedAmount).level;
      if (level === "rojo") rojo += 1;
      else if (level === "amarillo") amarillo += 1;
      else verde += 1;
    });
    return { rojo, amarillo, verde };
  }, [pettyCashFundSummaries]);

  const crmSemaphoreSummary = useMemo(() => {
    let rojo = 0, amarillo = 0, verde = 0;
    crmClientRows.forEach((row) => {
      const level = getClientSemaphore(row).level;
      if (level === "rojo") rojo += 1;
      else if (level === "amarillo") amarillo += 1;
      else verde += 1;
    });
    return { rojo, amarillo, verde };
  }, [crmClientRows]);

  const purchaseDeadlineSemaphore = useMemo(() => {
    let vencidas = 0, proximas = 0;
    purchaseCalendarRows.forEach((row) => {
      const level = getDateSemaphore(row.deadlineDate, false).level;
      if (level === "rojo") vencidas += 1;
      else if (level === "amarillo") proximas += 1;
    });
    const level: SemaphoreLevel = vencidas > 0 ? "rojo" : proximas > 0 ? "amarillo" : "verde";
    const label = vencidas > 0 ? `${vencidas} vencida(s)` : proximas > 0 ? `${proximas} proxima(s)` : "al dia";
    return { level, label };
  }, [purchaseCalendarRows]);

  const purchaseMonthData = useMemo(() => {
    const [year, month] = purchaseMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const previousMonthDays = new Date(year, month - 1, 0).getDate();
    const cells: Array<{ date: string; day: number; inCurrentMonth: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const relativeDay = index - firstWeekday + 1;
      let cellDate: Date;
      let dayNumber: number;
      let inCurrentMonth = true;

      if (relativeDay <= 0) {
        cellDate = new Date(year, month - 2, previousMonthDays + relativeDay);
        dayNumber = previousMonthDays + relativeDay;
        inCurrentMonth = false;
      } else if (relativeDay > daysInMonth) {
        cellDate = new Date(year, month - 1, relativeDay);
        dayNumber = relativeDay - daysInMonth;
        inCurrentMonth = false;
      } else {
        cellDate = new Date(year, month - 1, relativeDay);
        dayNumber = relativeDay;
      }

      cells.push({
        date: cellDate.toISOString().slice(0, 10),
        day: dayNumber,
        inCurrentMonth,
      });
    }

    return {
      label: firstDay.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      }),
      cells,
    };
  }, [purchaseMonth]);

  const purchaseItemsByDate = useMemo(() => {
    const map = new Map<string, typeof purchaseCalendarRows>();
    purchaseCalendarRows.forEach((item) => {
      const list = map.get(item.deadlineDate) ?? [];
      list.push(item);
      map.set(item.deadlineDate, list);
    });
    return map;
  }, [purchaseCalendarRows]);

  const analysisYear = useMemo(() => Number(financialMonth.split("-")[0]), [financialMonth]);

  const annualDebtRows = useMemo(() => {
    const rows: Array<{
      id: string;
      company: CompanyName;
      concept: string;
      date: string;
      amount: number;
      installmentNumber: number;
      totalInstallments: number;
    }> = [];

    visibleDebtPlans
      .filter((item) => item.active && item.nextDueDate)
      .forEach((item) => {
        const remaining = Math.max(0, Number(item.remainingInstallments || 0));
        for (let index = 0; index < remaining; index += 1) {
          const baseDate = new Date(item.nextDueDate);
          baseDate.setMonth(baseDate.getMonth() + index);
          const dueDate = baseDate.toISOString().slice(0, 10);
          if (baseDate.getFullYear() !== analysisYear) continue;
          rows.push({
            id: `${item.id}-${index}`,
            company: item.company,
            concept: item.concept,
            date: dueDate,
            amount: Number(item.nextInstallmentAmount || 0),
            installmentNumber: index + 1,
            totalInstallments: remaining,
          });
        }
      });

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [analysisYear, visibleDebtPlans]);

  const annualDebtByMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const key = `${analysisYear}-${String(monthIndex + 1).padStart(2, "0")}`;
      const items = annualDebtRows.filter((item) => item.date.startsWith(key));
      return {
        key,
        label: new Date(analysisYear, monthIndex, 1).toLocaleDateString("es-AR", {
          month: "long",
        }),
        items,
        total: items.reduce((acc, item) => acc + Number(item.amount || 0), 0),
      };
    });
  }, [analysisYear, annualDebtRows]);

  const bankStatementSummary = useMemo(() => {
    const credits = visibleBankStatementEntries
      .filter((item) => item.movementType === "credito")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const debits = visibleBankStatementEntries
      .filter((item) => item.movementType === "debito")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const lastBalance = [...visibleBankStatementEntries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1)?.balance || 0;
    return {
      credits,
      debits,
      net: credits - debits,
      lastBalance,
    };
  }, [visibleBankStatementEntries]);

  const annualCashFlowEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      date: string;
      company: CompanyName;
      title: string;
      kind:
        | "facturacion"
        | "cobranza"
        | "pago"
        | "compra"
        | "caja-chica"
        | "desendeudamiento"
        | "banco"
        | "trabajo";
      amount: number;
      statusLabel: string;
    }> = [];

    visibleFinancialItems.forEach((item) => {
      if (!item.date || !item.date.startsWith(String(analysisYear))) return;
      entries.push({
        id: `financial-${item.id}`,
        date: item.date,
        company: item.company,
        title: item.title || item.jobCode || "Movimiento financiero",
        kind: item.type,
        amount: Number(item.amount || 0),
        statusLabel: item.status,
      });
    });

    purchaseCalendarRows.forEach((item) => {
      if (!item.deadlineDate || !item.deadlineDate.startsWith(String(analysisYear))) return;
      entries.push({
        id: `purchase-${item.id}`,
        date: item.deadlineDate,
        company: item.company,
        title: `Compra limite ${item.budgetNumber}`,
        kind: "compra",
        amount: 0,
        statusLabel: `${item.missingCount} faltantes`,
      });
    });

    annualDebtRows.forEach((item) => {
      entries.push({
        id: `debt-${item.id}`,
        date: item.date,
        company: item.company,
        title: `${item.concept} cuota ${item.installmentNumber}/${item.totalInstallments}`,
        kind: "desendeudamiento",
        amount: Number(item.amount || 0),
        statusLabel: "Compromiso",
      });
    });

    visiblePurchaseInvoices.forEach((item) => {
      if (!item.invoiceDate || !item.invoiceDate.startsWith(String(analysisYear))) return;
      entries.push({
        id: `purchase-invoice-${item.id}`,
        date: item.invoiceDate,
        company: item.company,
        title: item.supplier || "Factura de compra",
        kind: "compra",
        amount: Number(item.total || 0),
        statusLabel: item.receiptKind || "Factura",
      });
    });

    visiblePettyCashExpenses.forEach((item) => {
      if (!item.date || !item.date.startsWith(String(analysisYear))) return;
      entries.push({
        id: `petty-cash-${item.id}`,
        date: item.date,
        company: item.company,
        title: item.description || item.supplier || "Caja chica",
        kind: "caja-chica",
        amount: Number(item.amount || 0),
        statusLabel: item.administration === "blanco" ? "Caja blanca" : "Caja negra",
      });
    });

    visibleBankStatementEntries.forEach((item) => {
      if (!item.date || !item.date.startsWith(String(analysisYear))) return;
      entries.push({
        id: `bank-${item.id}`,
        date: item.date,
        company: item.company,
        title: `${item.bank || "Banco"} · ${item.concept || "Movimiento"}`,
        kind: "banco",
        amount: Number(item.amount || 0),
        statusLabel: item.movementType,
      });
    });

    approvedJobsSummary.forEach((item) => {
      const relevantDate = item.startDate || item.approvalDate;
      if (!relevantDate || !relevantDate.startsWith(String(analysisYear))) return;
      entries.push({
        id: `job-${item.id}`,
        date: relevantDate,
        company: item.company,
        title: `${item.budgetNumber} · ${item.client}`,
        kind: "trabajo",
        amount: Number(item.soldNetPrice || 0),
        statusLabel: item.executionStatus,
      });
    });

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [
    analysisYear,
    annualDebtRows,
    approvedJobsSummary,
    visibleBankStatementEntries,
    visibleFinancialItems,
    visiblePettyCashExpenses,
    purchaseCalendarRows,
    visiblePurchaseInvoices,
  ]);

  const annualCashFlowByMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const key = `${analysisYear}-${String(monthIndex + 1).padStart(2, "0")}`;
      const items = annualCashFlowEntries.filter((item) => item.date.startsWith(key));
      return {
        key,
        label: new Date(analysisYear, monthIndex, 1).toLocaleDateString("es-AR", {
          month: "long",
        }),
        items,
      };
    });
  }, [analysisYear, annualCashFlowEntries]);

  const getFinancialItemStyle = (item: FinancialCalendarItem) => {
    if (item.status === "realizado") return styles.financialDone;
    if (item.type === "facturacion") return styles.financialBrown;
    if (item.type === "cobranza") return styles.financialBlack;
    return styles.financialRed;
  };

  const addEmployee = () => {
    const cleanName = newEmployeeDraft.name.trim();
    if (!cleanName) return;
    const nominalHours = Number(
      newEmployeeDraft.nominalHours || employeeBaseConfig.normalHoursDefault || 198
    );
    const employee: Employee = {
      id: newId(),
      company: newEmployeeDraft.company,
      legajo: newEmployeeDraft.legajo.trim(),
      name: cleanName,
      category: newEmployeeDraft.category || employeeBaseConfig.category,
      nominalHours,
      seniorityYears: 0,
      hourlyNetManual: 0,
      hourlyGrossManual: 0,
      attendance: [],
      documents: [],
      provisionItems: [],
      eppDueDate: "",
      eppAttachmentName: "",
      suppliesDueDate: "",
      suppliesAttachmentName: "",
      skills: "",
      notes: "",
      payrolls: [
        {
          month: payrollMonth,
          normalHours: nominalHours,
          holidayHours: 0,
          extra50Hours: 0,
          extra100Hours: 0,
          night50Hours: 0,
          nightHours: 0,
          unjustifiedAbsenceHours: 0,
          justifiedAbsenceHours: 0,
          vacationsDays: 0,
          anticipos: 0,
          cashBonus: 0,
          presentismoPctOverride: employeeBaseConfig.presentismoPct,
          employerExtraPct: employeeBaseConfig.employerContributionPct,
          manualOverride: false,
          savedAt: "",
          notes: "",
        },
      ],
    };

    setEmployees((prev) => [employee, ...prev]);
    setSelectedEmployeeId(employee.id);
    setIsEmployeeSetupModalOpen(false);
    setNewEmployeeDraft({
      company: newEmployeeDraft.company,
      legajo: "",
      name: "",
      category: employeeBaseConfig.category,
      nominalHours: employeeBaseConfig.normalHoursDefault,
    });
  };

  const removeEmployee = (employeeId: number) => {
    setEmployees((prev) => prev.filter((item) => item.id !== employeeId));
  };

  const ensureEmployeePayroll = (employee: Employee, month: string): EmployeePayroll => {
    return (
      employee.payrolls.find((item) => item.month === month) || {
        month,
        normalHours: employee.nominalHours || employeeBaseConfig.normalHoursDefault,
        holidayHours: 0,
        extra50Hours: 0,
        extra100Hours: 0,
        night50Hours: 0,
        nightHours: 0,
        unjustifiedAbsenceHours: 0,
        justifiedAbsenceHours: 0,
        vacationsDays: 0,
        anticipos: 0,
        cashBonus: 0,
        presentismoPctOverride: employeeBaseConfig.presentismoPct,
        employerExtraPct: employeeBaseConfig.employerContributionPct,
        manualOverride: false,
        savedAt: "",
        notes: "",
      }
    );
  };

  const updateEmployeeField = (
    employeeId: number,
    field: keyof Employee,
    value:
      | string
      | number
      | AttendanceRecord[]
      | EmployeeDocument[]
      | EmployeePayroll[]
      | EmployeeProvisionItem[]
  ) => {
    setEmployees((prev) =>
      prev.map((employee) => (employee.id === employeeId ? { ...employee, [field]: value } : employee))
    );
  };

  const updateEmployeePayroll = (
    employeeId: number,
    month: string,
    field: keyof EmployeePayroll,
    value: string | number | boolean | null
  ) => {
    setEmployees((prev) =>
      prev.map((employee) => {
        if (employee.id !== employeeId) return employee;
        const exists = employee.payrolls.some((item) => item.month === month);
        const nextPayrolls = exists
          ? employee.payrolls.map((item) =>
              item.month === month ? { ...item, [field]: value } : item
            )
          : [...employee.payrolls, { ...ensureEmployeePayroll(employee, month), [field]: value }];
        return { ...employee, payrolls: nextPayrolls };
      })
    );
  };

  const updateEmployeePayrollManual = (
    employeeId: number,
    month: string,
    field: keyof EmployeePayroll,
    value: string | number | null
  ) => {
    updateEmployeePayroll(employeeId, month, field, value);
    if (field !== "manualOverride" && field !== "savedAt") {
      updateEmployeePayroll(employeeId, month, "manualOverride", true);
    }
  };

  const saveEmployeePayrollMonth = (employeeId: number, month: string) => {
    updateEmployeePayroll(employeeId, month, "savedAt", new Date().toISOString());
  };

  const updateAttendanceRecord = (
    employeeId: number,
    date: string,
    field: keyof AttendanceRecord,
    value: string | number
  ) => {
    setEmployees((prev) =>
      prev.map((employee) => {
        if (employee.id !== employeeId) return employee;
        const month = date.slice(0, 7);
        const standardDayHours = Number(
          ((employee.nominalHours || employeeBaseConfig.normalHoursDefault || 176) / 22).toFixed(2)
        );
        const recalcMonthPayroll = (attendanceRows: AttendanceRecord[]) => {
          const monthAttendance = attendanceRows.filter((item) => item.date.startsWith(`${month}-`));
          const normalHours = monthAttendance.reduce(
            (acc, item) => acc + Number(item.normalHours || 0),
            0
          );
          const extra50Hours = monthAttendance.reduce(
            (acc, item) => acc + Number(item.extra50Hours || 0),
            0
          );
          const extra100Hours = monthAttendance.reduce(
            (acc, item) => acc + Number(item.extra100Hours || 0),
            0
          );
          const justifiedAbsenceHours =
            monthAttendance.filter((item) => item.status === "ausente_justificado").length *
            standardDayHours;
          const unjustifiedAbsenceHours =
            monthAttendance.filter((item) => item.status === "ausente_injustificado").length *
            standardDayHours;
          const vacationsDays = monthAttendance.filter((item) => item.status === "vacaciones").length;

          return {
            normalHours,
            extra50Hours,
            extra100Hours,
            justifiedAbsenceHours,
            unjustifiedAbsenceHours,
            vacationsDays,
          };
        };

        const exists = employee.attendance.some((item) => item.date === date);
        const nextAttendance = exists
          ? employee.attendance.map((item) =>
              item.date === date
                ? {
                    ...item,
                    [field]: value,
                    ...((
                      field === "normalHours" ||
                      field === "extra50Hours" ||
                      field === "extra100Hours"
                    ) &&
                    Number(value || 0) > 0 &&
                    item.status === "sin_cargar"
                      ? { status: "presente" as AttendanceStatus }
                      : {}),
                    ...(field === "status" &&
                    value === "presente" &&
                    Number(item.normalHours || 0) === 0 &&
                    Number(item.extra50Hours || 0) === 0 &&
                    Number(item.extra100Hours || 0) === 0
                      ? { normalHours: standardDayHours }
                      : {}),
                    ...(field === "status" && value !== "presente"
                      ? { normalHours: 0, extra50Hours: 0, extra100Hours: 0 }
                      : {}),
                  }
                : item
            )
          : [
              ...employee.attendance,
              {
                date,
                status:
                  field === "status"
                    ? (value as AttendanceStatus)
                    : (
                        field === "normalHours" ||
                        field === "extra50Hours" ||
                        field === "extra100Hours"
                      ) && Number(value || 0) > 0
                    ? "presente"
                    : "sin_cargar",
                normalHours:
                  field === "normalHours"
                    ? Number(value || 0)
                    : field === "status" && value === "presente"
                    ? standardDayHours
                    : 0,
                extra50Hours: field === "extra50Hours" ? Number(value || 0) : 0,
                extra100Hours: field === "extra100Hours" ? Number(value || 0) : 0,
                attachmentName: "",
                notes: "",
                [field]: value,
              },
            ];
        const monthPayrollFromAttendance = recalcMonthPayroll(nextAttendance);
        const existsPayroll = employee.payrolls.some((item) => item.month === month);
        const nextPayrolls = existsPayroll
          ? employee.payrolls.map((item) =>
              item.month === month
                ? {
                    ...item,
                    ...monthPayrollFromAttendance,
                    manualOverride: false,
                  }
                : item
            )
          : [
              ...employee.payrolls,
              {
                ...ensureEmployeePayroll(employee, month),
                ...monthPayrollFromAttendance,
                manualOverride: false,
              },
            ];
        return { ...employee, attendance: nextAttendance, payrolls: nextPayrolls };
      })
    );
  };

  const updateEmployeeDocument = (
    employeeId: number,
    documentId: number,
    field: keyof EmployeeDocument,
    value: string
  ) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              documents: employee.documents.map((doc) =>
                doc.id === documentId ? { ...doc, [field]: value } : doc
              ),
            }
          : employee
      )
    );
  };

  const addEmployeeDocument = (employeeId: number) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              documents: [
                ...employee.documents,
                { id: newId(), name: "", dueDate: "", attachmentName: "" },
              ],
            }
          : employee
      )
    );
  };

  const createEmployeeDocumentFromModal = () => {
    if (!employeeDocumentModal) return;
    const cleanName = employeeDocumentModal.name.trim();
    if (!cleanName) return;
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeDocumentModal.employeeId
          ? {
              ...employee,
              documents: [
                ...employee.documents,
                {
                  id: newId(),
                  name: cleanName,
                  dueDate: employeeDocumentModal.dueDate,
                  attachmentName: "",
                },
              ],
            }
          : employee
      )
    );
    setEmployeeDocumentModal(null);
  };

  const removeEmployeeDocument = (employeeId: number, documentId: number) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              documents: employee.documents.filter((doc) => doc.id !== documentId),
            }
          : employee
      )
    );
  };

  const handleEmployeeDocumentUpload = (
    employeeId: number,
    documentId: number,
    file: File | null
  ) => {
    if (!file) return;
    updateEmployeeDocument(employeeId, documentId, "attachmentName", file.name);
  };

  const handleAttendanceAttachment = (
    employeeId: number,
    date: string,
    file: File | null
  ) => {
    if (!file) return;
    updateAttendanceRecord(employeeId, date, "attachmentName", file.name);
  };

  const applyBaseConfigToAllEmployees = () => {
    setEmployees((prev) =>
      prev.map((employee) => ({
        ...employee,
        category: employee.category || employeeBaseConfig.category,
        seniorityYears: employee.seniorityYears || employeeBaseConfig.seniorityYears,
        hourlyNetManual: employee.hourlyNetManual || employeeBaseConfig.hourlyNetManual,
        hourlyGrossManual: employee.hourlyGrossManual || employeeBaseConfig.hourlyGrossManual,
          documents: [
            ...employee.documents,
            ...employeeBaseConfig.requiredDocuments
              .filter(
                (doc) =>
                !employee.documents.some(
                  (item) => item.name.trim().toLowerCase() === doc.name.trim().toLowerCase()
                )
            )
            .map((doc) => ({
              id: newId(),
              name: doc.name,
                dueDate: "",
                attachmentName: "",
              })),
          ],
          provisionItems: [
            ...employee.provisionItems,
            ...employeeBaseConfig.provisionTemplates
              .filter(
                (template) =>
                  !employee.provisionItems.some(
                    (item) => item.stockCode === template.stockCode && item.kind === template.kind
                  )
              )
              .map((template) => ({
                id: newId(),
                stockCode: template.stockCode,
                kind: template.kind,
                quantity: template.quantity,
                dueDate: "",
                attachmentName: "",
                notes: "",
              })),
          ],
        }))
      );
    };

  // Logica pura extraida a src/domain/scale.ts (testeada). Aca solo se le pasa el estado.
  const getScaleForCategory = (category: string, month: string) =>
    getScaleForCategoryPure(scaleRows, category, month);

  // Semaforo de la escala salarial de una categoria respecto del mes de liquidacion (payrollMonth):
  // - verde "vigente": ya hay escala cargada para un mes POSTERIOR (cubierto con margen).
  // - amarillo "por actualizar": la ultima escala es justo el mes actual -> estamos en el ultimo
  //   mes que cubre, proximo al vencimiento, conviene cargar la siguiente.
  // - rojo: este mes ya NO hay escala actualizada (la ultima es de un mes anterior) o no hay ninguna.
  const getScaleSemaphore = (category: string): { level: SemaphoreLevel; label: string } => {
    const cat = (category || "").trim().toLowerCase();
    if (!cat) return { level: "amarillo", label: "sin categoria" };
    const rows = scaleRows.filter((row) => row.category.toLowerCase() === cat);
    if (rows.length === 0) return { level: "rojo", label: "sin escala cargada" };
    const latest = rows.reduce((a, b) => (b.month > a.month ? b : a)).month;
    const [ly, lm] = latest.split("-").map(Number);
    const [cy, cm] = (payrollMonth || localMonthKey()).split("-").map(Number);
    const diff = (cy - ly) * 12 + (cm - lm); // meses que el mes de liquidacion adelanta a la ultima escala
    if (diff < 0) return { level: "verde", label: `vigente (escala ${monthLabel(latest)})` };
    if (diff === 0)
      return { level: "amarillo", label: `por actualizar (ultimo mes vigente: ${monthLabel(latest)})` };
    return { level: "rojo", label: `sin escala actualizada este mes (ultima ${monthLabel(latest)})` };
  };

  const getCurrentPayroll = (employee: Employee) => ensureEmployeePayroll(employee, payrollMonth);

  const getAttendanceSummary = (employee: Employee) => {
    const monthPrefix = `${payrollMonth}-`;
    const monthRecords = employee.attendance.filter((item) => item.date.startsWith(monthPrefix));
    const today = monthRecords.find((item) => item.date === todayIso());
    const record = today || monthRecords[monthRecords.length - 1];
    if (!record || record.status === "sin_cargar") {
      return { label: "Sin cargar", tone: "gray" as const };
    }
    if (record.status === "presente") {
      return { label: "Presente", tone: "green" as const };
    }
    if (record.status === "ausente_injustificado") {
      return { label: "Ausente sin justificar", tone: "red" as const };
    }
    if (record.status === "ausente_justificado") {
      return { label: "Ausente justificado", tone: "yellow" as const };
    }
    return { label: "Vacaciones", tone: "blue" as const };
  };

  const getEmployeeDocumentState = (doc: EmployeeDocument) => {
    if (!doc.attachmentName) return "faltante";
    if (!doc.dueDate) return "vigente";
    const diff =
      (new Date(doc.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "vencido";
    if (diff <= 30) return "vence_pronto";
    return "vigente";
  };

  const getEmployeeDocumentSummary = (employee: Employee) => {
    if (employee.documents.length === 0) {
      return { label: "Sin documentacion", tone: "red" as const };
    }
    const states = employee.documents.map(getEmployeeDocumentState);
    if (states.includes("faltante") || states.includes("vencido")) {
      return { label: "Faltantes o vencidos", tone: "red" as const };
    }
    if (states.includes("vence_pronto")) {
      return { label: "Documentacion por vencer", tone: "yellow" as const };
    }
    return { label: "Documentacion al dia", tone: "green" as const };
  };

  // Semaforo del empleado: rojo si faltan datos basicos o hay documentacion/EPP vencida/faltante,
  // amarillo si algo esta por vencer, verde si la ficha esta completa. Avisa donde falta cargar.
  const getEmployeeSemaphore = (employee: Employee): { level: SemaphoreLevel; label: string } => {
    if (
      !employee.legajo?.trim() ||
      !employee.name?.trim() ||
      !employee.category?.trim() ||
      Number(employee.nominalHours) <= 0
    ) {
      return { level: "rojo", label: "faltan datos basicos (legajo/nombre/categoria/horas)" };
    }
    const tones = [
      getEmployeeDocumentSummary(employee).tone,
      getEmployeeProvisionSummary(employee, "EPP").tone,
      getEmployeeProvisionSummary(employee, "Insumos").tone,
    ];
    const scale = getScaleSemaphore(employee.category);
    if (tones.includes("red")) return { level: "rojo", label: "documentacion / EPP faltante o vencida" };
    if (scale.level === "rojo")
      return { level: "amarillo", label: "categoria sin escala actualizada este mes" };
    if (tones.includes("yellow") || scale.level === "amarillo")
      return {
        level: "amarillo",
        label: scale.level === "amarillo" ? "escala salarial por actualizar" : "documentacion por vencer",
      };
    return { level: "verde", label: "ficha completa" };
  };

  const getProvisionState = (dueDate: string, attachmentName: string) => {
    if (!attachmentName) return { label: "Faltante", tone: "red" as const };
    if (!dueDate) return { label: "Al dia", tone: "green" as const };
    const diff =
      (new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { label: "Vencido", tone: "red" as const };
    if (diff <= 30) return { label: "Vence pronto", tone: "yellow" as const };
    return { label: "Al dia", tone: "green" as const };
  };

  const getMonthlyProvisionMarkerCostForCompany = (company: CompanyName) => {
    const templateCost = employeeBaseConfig.provisionTemplates.reduce((acc, template) => {
      const stockItem = getStockPersonalItemForCompany(template.stockCode, company);
      return (
        acc +
        (Number(template.quantity || 0) * Number(stockItem?.unitPrice || 0)) /
          Math.max(Number(template.validityMonths || 1), 1)
      );
    }, 0);
    if (templateCost > 0) {
      return templateCost;
    }

    const matching = personalProvisionMarkers.filter(
      (item) => item.active && (item.shared || item.company === company)
    );
    if (matching.length === 0) {
      const stockFallback = stockPersonalItems.filter(
        (item) =>
          item.active &&
          (item.shared || item.company === "General" || item.company === company)
      );
      if (stockFallback.length > 0) {
        return stockFallback.reduce(
          (acc, item) =>
            acc +
            Number(item.unitPrice || 0) /
              Math.max(Number(item.periodicityMonths || 1), 1),
          0
        );
      }
      return ((employeeBaseConfig.eppSemiannualCost || 0) * 2 + (employeeBaseConfig.suppliesSemiannualCost || 0) * 2) / 12;
    }
    return matching.reduce(
      (acc, item) => acc + Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1),
      0
    );
  };

  const getPayrollSummaryForScenario = ({
    company,
    category,
    seniorityYears,
    hourlyNetManual,
    hourlyGrossManual,
    payroll,
  }: {
    company: CompanyName;
    category: string;
    seniorityYears: number;
    hourlyNetManual: number;
    hourlyGrossManual: number;
    payroll: EmployeePayroll;
  }) => {
    const scale = getScaleForCategory(category, payroll.month);

    const baseHourly = hourlyGrossManual || scale?.baseHourly || scale?.vht || 0;
    const nonRemHourly = Math.max(0, scale?.nonRemHourly || 0);
    const grossReference = hourlyGrossManual || scale?.vht || baseHourly;
    const payableHours =
      payroll.normalHours +
      payroll.holidayHours +
      payroll.justifiedAbsenceHours -
      payroll.unjustifiedAbsenceHours;

    const grossNormal = baseHourly * payroll.normalHours;
    const grossHoliday = baseHourly * payroll.holidayHours;
    const extra50 = baseHourly * 1.5 * payroll.extra50Hours;
    const extra100 = baseHourly * 2 * payroll.extra100Hours;
    const night50 = baseHourly * 1.5 * 1.133333333 * payroll.night50Hours;
    const night = baseHourly * 1.133333333 * payroll.nightHours;
    const seniorityBonus =
      (grossNormal + grossHoliday + extra50 + extra100 + night50 + night) *
      ((employeeBaseConfig.seniorityPctPerYear * seniorityYears) / 100);
    const presentismoPct =
      payroll.presentismoPctOverride === null
        ? 0
        : payroll.presentismoPctOverride;
    const presentismo =
      payroll.unjustifiedAbsenceHours > 0 ? 0 : grossNormal * (presentismoPct / 100);
    const nonRem = nonRemHourly * Math.max(payableHours, 0);
    const grossRem =
      grossNormal + grossHoliday + extra50 + extra100 + night50 + night + seniorityBonus + presentismo;
    const totalGross = grossRem + nonRem;
    const jubilacion = grossRem * 0.11;
    const ley19032 = grossRem * 0.03;
    const obraSocial = grossRem * 0.03;
    const sindicato = grossRem * (employeeBaseConfig.unionPct / 100);
    const seguro = grossRem * (employeeBaseConfig.insurancePct / 100);
    const descuentos = jubilacion + ley19032 + obraSocial + sindicato + seguro;
    const cashBonus = Number(payroll.cashBonus || 0);
    const net = totalGross - descuentos - payroll.anticipos;
    const netWithCashBonus = net + cashBonus;
    const employerContrib = grossRem * ((payroll.employerExtraPct || 0) / 100);
    const employerInsurance = grossRem * ((employeeBaseConfig.employerInsurancePct || 0) / 100);
    const monthlyProvisionCost = getMonthlyProvisionMarkerCostForCompany(company);
    const annualSACBase = totalGross * (employeeBaseConfig.aguinaldoAnnualMonths || 0);
    const annualSACCharges =
      annualSACBase *
      (((payroll.employerExtraPct || 0) + (employeeBaseConfig.employerInsurancePct || 0)) / 100);
    const annualCompanyCost =
      12 * (totalGross + employerContrib + employerInsurance + monthlyProvisionCost) +
      annualSACBase +
      annualSACCharges;
    const annualBaseHours = (employeeBaseConfig.normalHoursDefault || 198) * 12;
    const monthlySACProration = (annualSACBase + annualSACCharges) / 12;
    const employerImpact =
      totalGross +
      employerContrib +
      employerInsurance +
      monthlyProvisionCost +
      monthlySACProration;
    const hourlyCost = annualBaseHours > 0 ? annualCompanyCost / annualBaseHours : 0;
    const netHourly = hourlyNetManual || Math.max(net / Math.max(payableHours || 1, 1), 0);

    return {
      scale,
      baseHourly,
      grossReference,
      nonRemHourly,
      grossNormal,
      grossRem,
      totalGross,
      nonRem,
      seniorityBonus,
      presentismo,
      employerContrib,
      employerInsurance,
      monthlyProvisionCost,
      annualSACBase,
      monthlySACProration,
      descuentos,
      net,
      cashBonus,
      netWithCashBonus,
      employerImpact,
      hourlyCost,
      netHourly,
    };
  };

  const getEmployeePayrollSummary = (employee: Employee) => {
    const payroll = getCurrentPayroll(employee);
    return getPayrollSummaryForScenario({
      company: employee.company,
      category: employee.category,
      seniorityYears: employee.seniorityYears,
      hourlyNetManual: employee.hourlyNetManual,
      hourlyGrossManual: employee.hourlyGrossManual,
      payroll,
    });
  };

  const employeesSortedByPay = useMemo(
    () =>
      [...visibleEmployees].sort((a, b) => {
        const salaryDiff =
          getEmployeePayrollSummary(b).hourlyCost -
          getEmployeePayrollSummary(a).hourlyCost;
        if (salaryDiff !== 0) return salaryDiff;
        return a.name.localeCompare(b.name);
      }),
    [visibleEmployees, payrollMonth, scaleRows, employeeBaseConfig, visibleStockItems, personalProvisionMarkers]
  );

  const categoryBaseRows = useMemo(
    () =>
      COMPANY_OPTIONS.filter((company) => canAccessCompany(company.value)).flatMap((company) =>
        CATEGORY_OPTIONS.map((category) => {
          const payroll: EmployeePayroll = {
            month: payrollMonth,
            normalHours: employeeBaseConfig.normalHoursDefault,
            holidayHours: 0,
            extra50Hours: 0,
            extra100Hours: 0,
            night50Hours: 0,
            nightHours: 0,
            unjustifiedAbsenceHours: 0,
            justifiedAbsenceHours: 0,
            vacationsDays: 0,
            anticipos: 0,
            cashBonus: 0,
            presentismoPctOverride: employeeBaseConfig.presentismoPct,
            employerExtraPct: employeeBaseConfig.employerContributionPct,
            manualOverride: false,
            savedAt: "",
            notes: "",
          };

          return {
            company: company.value,
            companyShort: company.short,
            category,
            summary: getPayrollSummaryForScenario({
              company: company.value,
              category,
              seniorityYears: 0,
              hourlyNetManual: 0,
              hourlyGrossManual: 0,
              payroll,
            }),
          };
        })
      ),
    [payrollMonth, scaleRows, employeeBaseConfig, personalProvisionMarkers, stockItems]
  );

  const companyCategoryCostRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        company: CompanyName;
        category: string;
        employeeCount: number;
        totalSeniorityYears: number;
        totalPresentismoPct: number;
        totalMonthlyProvisionCost: number;
        totalGross: number;
        totalNet: number;
        totalEmployerImpact: number;
        totalHourlyCost: number;
      }
    >();

    employees.forEach((employee) => {
      const salary = getEmployeePayrollSummary(employee);
      const payroll = getCurrentPayroll(employee);
      const key = `${employee.company}__${employee.category}`;
      const current = grouped.get(key) || {
        company: employee.company,
        category: employee.category,
        employeeCount: 0,
        totalSeniorityYears: 0,
        totalPresentismoPct: 0,
        totalMonthlyProvisionCost: 0,
        totalGross: 0,
        totalNet: 0,
        totalEmployerImpact: 0,
        totalHourlyCost: 0,
      };

      current.employeeCount += 1;
      current.totalSeniorityYears += Number(employee.seniorityYears || 0);
      current.totalPresentismoPct += Number(
        payroll.presentismoPctOverride ?? employeeBaseConfig.presentismoPct
      );
      current.totalMonthlyProvisionCost += Number(salary.monthlyProvisionCost || 0);
      current.totalGross += Number(salary.totalGross || 0);
      current.totalNet += Number(salary.net || 0);
      current.totalEmployerImpact += Number(salary.employerImpact || 0);
      current.totalHourlyCost += Number(salary.hourlyCost || 0);

      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((row) => ({
        ...row,
        avgSeniorityYears:
          row.employeeCount > 0 ? row.totalSeniorityYears / row.employeeCount : 0,
        avgPresentismoPct:
          row.employeeCount > 0 ? row.totalPresentismoPct / row.employeeCount : 0,
        avgMonthlyProvisionCost:
          row.employeeCount > 0 ? row.totalMonthlyProvisionCost / row.employeeCount : 0,
        avgGross: row.employeeCount > 0 ? row.totalGross / row.employeeCount : 0,
        avgNet: row.employeeCount > 0 ? row.totalNet / row.employeeCount : 0,
        avgEmployerImpact:
          row.employeeCount > 0 ? row.totalEmployerImpact / row.employeeCount : 0,
        avgHourlyCost:
          row.employeeCount > 0 ? row.totalHourlyCost / row.employeeCount : 0,
      }))
      .sort((a, b) => {
        const companyCompare = getCompanyMeta(a.company).short.localeCompare(
          getCompanyMeta(b.company).short
        );
        return companyCompare !== 0
          ? companyCompare
          : a.category.localeCompare(b.category);
      });
  }, [employees, payrollMonth, scaleRows, employeeBaseConfig, personalProvisionMarkers, stockItems]);

  const buildLaborMarkersFromPersonal = (currentMarkers: LaborMarker[]) => {
    const sourceMonthLabel = monthLabel(payrollMonth);
    const syncNote = `Sincronizado desde Personal - ${sourceMonthLabel}`;
    const next = [...currentMarkers];

    companyCategoryCostRows.forEach((row) => {
      const existingIndex = next.findIndex(
        (item) =>
          item.company === row.company &&
          item.workType === "General" &&
          item.category.trim().toLowerCase() === row.category.trim().toLowerCase()
      );

      if (existingIndex >= 0) {
        const previousNotes = next[existingIndex].notes || "";
        next[existingIndex] = {
          ...next[existingIndex],
          employees: row.employeeCount,
          monthlyHoursPerEmployee: employeeBaseConfig.normalHoursDefault,
          hourlyRate: Number(row.avgHourlyCost.toFixed(2)),
          active: true,
          notes:
            !previousNotes || previousNotes.startsWith("Sincronizado desde Personal")
              ? syncNote
              : previousNotes,
        };
        return;
      }

      next.push({
        id: newId(),
        company: row.company,
        workType: "General",
        category: row.category,
        employees: row.employeeCount,
        monthlyHoursPerEmployee: employeeBaseConfig.normalHoursDefault,
        hourlyRate: Number(row.avgHourlyCost.toFixed(2)),
        hoursBase: 0,
        active: true,
        notes: syncNote,
      });
    });

    return next;
  };

  const syncLaborMarkersFromPersonal = async () => {
    if (companyCategoryCostRows.length === 0) {
      setStorageMessage("No hay costos de Personal para volcar a Marcadores.");
      return;
    }

    const nextLaborMarkers = buildLaborMarkersFromPersonal(laborMarkers);
    const moduleKeys: AppStateModuleKey[] = ["marcadores", "personal"];
    setLaborMarkers(nextLaborMarkers);

    try {
      const persistResult = await persistAppStateImmediately(
        buildPersistedAppDataWithOverrides({ laborMarkers: nextLaborMarkers }),
        {
          moduleKeys,
          allowSupabaseWithPendingRemote: true,
        }
      );
      const savedModuleText = formatPersistenceModuleList(persistResult.savedModuleKeys);
      setStorageMessage(
        persistResult.savedToSupabase
          ? `Costo hora actualizado desde Personal y guardado en Supabase: ${savedModuleText}.`
          : "Costo hora actualizado desde Personal. Queda local hasta reconectar Supabase."
      );
      announceSystemChange(
        `Costo hora de presupuestos actualizado desde Personal (${monthLabel(payrollMonth)}).`
      );
    } catch (error) {
      setStorageMessage(
        error instanceof Error
          ? error.message
          : "Actualice el costo hora, pero no pude confirmarlo en Supabase."
      );
    }
  };

  const addEmployeeProvisionItem = (employeeId: number, kind: EmployeeProvisionKind) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              provisionItems: [
                ...employee.provisionItems,
                {
                  id: newId(),
                  stockCode:
                    employeeBaseConfig.provisionTemplates.find((item) => item.kind === kind)?.stockCode || "",
                  kind,
                  quantity: 1,
                  dueDate: "",
                  attachmentName: "",
                  notes: "",
                },
              ],
            }
          : employee
      )
    );
  };

  const createEmployeeProvisionFromModal = () => {
    if (!employeeProvisionModal) return;
    const employee = employees.find((item) => item.id === employeeProvisionModal.employeeId);
    const title = employeeProvisionModal.title.trim();
    if (!employee || !title) return;
    const stockId = newId();
    const codePrefix = employeeProvisionModal.kind === "EPP" ? "EPP" : "INS";
    const stockCode = `${codePrefix}-${stockId}`;

    setStockItems((prev) => [
      ...prev,
      {
        id: stockId,
        company: employee.company,
        kind: employeeProvisionModal.kind,
        shared: false,
        group: employeeProvisionModal.kind,
        location: "",
        sortOrder: Math.max(0, ...prev.map((item) => Number(item.sortOrder || 0))) + 1,
        code: stockCode,
        description: title,
        unit: "u",
        quantity: 0,
        unitPrice: Number(employeeProvisionModal.unitPrice || 0),
        periodicityMonths: 6,
        active: true,
      },
    ]);
    setEmployees((prev) =>
      prev.map((row) =>
        row.id === employee.id
          ? {
              ...row,
              provisionItems: [
                ...row.provisionItems,
                {
                  id: stockId + 1,
                  stockCode,
                  kind: employeeProvisionModal.kind,
                  quantity: 1,
                  dueDate: employeeProvisionModal.dueDate,
                  attachmentName: "",
                  notes: "",
                },
              ],
            }
          : row
      )
    );
    setEmployeeProvisionModal(null);
  };

  const updateEmployeeProvisionItem = (
    employeeId: number,
    itemId: number,
    field: keyof EmployeeProvisionItem,
    value: string | number
  ) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              provisionItems: employee.provisionItems.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      [field]: value,
                      ...(field === "stockCode"
                        ? {
                            kind:
                              getStockPersonalItemForCompany(String(value), employee.company)?.kind === "EPP"
                                ? "EPP"
                                : "Insumos",
                          }
                        : {}),
                    }
                  : item
              ),
            }
          : employee
      )
    );
  };

  const removeEmployeeProvisionItem = (employeeId: number, itemId: number) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              provisionItems: employee.provisionItems.filter((item) => item.id !== itemId),
            }
          : employee
      )
    );
  };

  const handleEmployeeProvisionUpload = (
    employeeId: number,
    itemId: number,
    file: File | null
  ) => {
    if (!file) return;
    updateEmployeeProvisionItem(employeeId, itemId, "attachmentName", file.name);
  };

  const totalCompanyPayroll = useMemo(
    () =>
      COMPANY_OPTIONS.map((company) => ({
        company: company.value,
        label: company.short,
        totalNet: employees
          .filter((employee) => employee.company === company.value)
          .reduce((acc, employee) => acc + getEmployeePayrollSummary(employee).net, 0),
        totalImpact: employees
          .filter((employee) => employee.company === company.value)
          .reduce((acc, employee) => acc + getEmployeePayrollSummary(employee).employerImpact, 0),
      })),
    [employees, payrollMonth, scaleRows, employeeBaseConfig, personalProvisionMarkers, stockItems]
  );

  const attendanceMonthData = useMemo(() => {
    const { year, monthIndex } = parseMonthKey(payrollMonth);
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
    const dayCells = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, monthIndex, index + 1);
      return {
        key: localDateKey(date),
        day: index + 1,
        weekday: date.toLocaleDateString("es-AR", { weekday: "short" }),
      };
    });
    const cells: (typeof dayCells[number] | null)[] = [
      ...Array.from({ length: leadingEmptyDays }, () => null),
      ...dayCells,
    ];

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const weeks = Array.from({ length: Math.max(1, cells.length / 7) }, (_, index) =>
      cells.slice(index * 7, index * 7 + 7)
    );

    return {
      label: monthLabel(payrollMonth),
      labelUpper: monthLabel(payrollMonth).toUpperCase(),
      weekdays: ATTENDANCE_WEEKDAY_LABELS,
      weeks,
    };
  }, [payrollMonth]);

  const getAttendanceRecord = (employee: Employee, date: string) =>
    employee.attendance.find((item) => item.date === date) || null;

  const handleScalePdfUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const parsedRows = await parseScalePdf(file);
      setScaleRows((prev) => {
        const withoutSameMonths = prev.filter(
          (row) => !parsedRows.some((parsed) => parsed.month === row.month && parsed.category === row.category)
        );
        return [...withoutSameMonths, ...parsedRows].sort((a, b) =>
          `${a.month}-${a.category}`.localeCompare(`${b.month}-${b.category}`)
        );
      });
      setUploadMessage(`Escala cargada desde ${file.name}.`);
    } catch (error) {
      setUploadMessage(
        error instanceof Error
          ? `${error.message} Se mantienen las escalas editables actuales.`
          : "No pude leer el PDF. Se mantienen las escalas editables actuales."
      );
    }
  };

  const companyHistorySections = groupedSavedBudgets.length > 0 ? groupedSavedBudgets : [];
  const companyApprovedSections = groupedApprovedJobs.length > 0 ? groupedApprovedJobs : [];
  const activeMonthlyTab = isMonthlyHistoryTab(activeTab) ? activeTab : null;
  const activeMonthlyHistory = activeMonthlyTab
    ? monthlyHistorySnapshots.filter(
        (item) =>
          item.tabKey === activeMonthlyTab &&
          item.companyScope === workspaceCompanyScope
      )
    : [];
  const latestMonthlyHistorySnapshot = activeMonthlyHistory[0];
  const currentSystemMonth = localMonthKey();
  const operationalMonthStatus =
    operationalMonth === currentSystemMonth
      ? "Mes corriente"
      : operationalMonth < currentSystemMonth
      ? "Mes atrasado"
      : "Mes futuro";

  const renderBudgetHistoryBlock = () => (
    <>
      <Panel title="Semaforo de presupuestos">
        <SemaforoResumen
          items={[
            { level: "verde", label: "Aprobados", value: String(budgetSemaphoreSummary.verde) },
            { level: "amarillo", label: "Vigentes", value: String(budgetSemaphoreSummary.amarillo) },
            { level: "rojo", label: "Vencidos / no aprobados", value: String(budgetSemaphoreSummary.rojo) },
          ]}
        />
      </Panel>
      <Panel
        title="Historial de presupuestos por empresa"
        actions={<ButtonLike onClick={() => exportPrint("report-historial")} secondary>Reporte</ButtonLike>}
      >
        {visibleSavedBudgets.length === 0 ? (
          <div style={styles.empty}>Todavia no hay presupuestos guardados.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Proyecto</th>
                <th>% ocupacion</th>
                <th>Comision</th>
                <th>Exportado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyHistorySections.map((group) => (
                <React.Fragment key={group.value}>
                  <tr>
                    <td colSpan={9} style={styles.sectionCell}>
                      <div
                        style={{
                          ...styles.sectionHeader,
                          background: group.soft,
                          color: group.primary,
                          borderColor: group.primary,
                        }}
                      >
                        {group.short} · {group.value}
                      </div>
                    </td>
                  </tr>
                  {group.items.map((item, index) => {
                    const priorRevisions = getPriorBudgetRevisions(item);
                    const revisionsKey = item.rootBudgetId || item.id;
                    const revisionsOpen = expandedRevisionsRoot === revisionsKey;
                    return (
                      <React.Fragment key={`history-${group.value}-${item.id}-${index}`}>
                        <tr
                          style={
                            selectedHistoryId === item.id
                              ? { background: group.soft }
                              : { background: `${group.soft}66` }
                          }
                        >
                          <td>
                            {getSavedBudgetDisplayLabel(item)}
                            {priorRevisions.length > 0 && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: group.primary, marginTop: 2 }}>
                                {priorRevisions.length} version(es) anterior(es)
                              </div>
                            )}
                          </td>
                          <td>{formatDateDisplay(item.date)}</td>
                          <td>{item.client}</td>
                          <td>{item.project}</td>
                          <td>{pct(item.laborOccupancyPct)}</td>
                          <td>{money(item.commissionAmount)}</td>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                ...(item.exportedAt ? styles.statusGreen : styles.statusRed),
                              }}
                            >
                              {item.exportedAt ? "Exportado" : "Sin exportar"}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const sb = getBudgetSemaphore(item);
                              return (
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Semaforo level={sb.level} size={10} title={sb.label} />
                                  <span>{item.status}</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={styles.smallBtn} onClick={() => approveBudget(item)}>
                              Aprobar
                            </button>
                            <button style={styles.smallBtn} onClick={() => rejectBudget(item.id)}>
                              No aprobado
                            </button>
                            {selectedHistoryId === item.id ? (
                              <button style={styles.smallBtn} onClick={() => setSelectedHistoryId(null)}>
                                Cerrar
                              </button>
                            ) : (
                              <button style={styles.smallBtn} onClick={() => openBudgetHistoryItem(item.id)}>
                                Abrir
                              </button>
                            )}
                            <button
                              style={styles.smallBtn}
                              onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}
                            >
                              Editar
                            </button>
                            {priorRevisions.length > 0 && (
                              <button
                                style={styles.smallBtn}
                                onClick={() =>
                                  setExpandedRevisionsRoot(revisionsOpen ? null : revisionsKey)
                                }
                              >
                                {revisionsOpen
                                  ? "Ocultar anteriores"
                                  : `Ver anteriores (${priorRevisions.length})`}
                              </button>
                            )}
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeSavedBudget(item.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                        {revisionsOpen && priorRevisions.length > 0 && (
                          <tr>
                            <td colSpan={9} style={{ background: `${group.soft}40`, padding: "8px 12px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: group.primary, marginBottom: 6 }}>
                                Versiones anteriores de {getSavedBudgetDisplayLabel(item)}
                              </div>
                              {priorRevisions.map((rev) => (
                                <div
                                  key={rev.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "5px 0",
                                    borderTop: "0.5px solid #e2e8f0",
                                    fontSize: 12,
                                  }}
                                >
                                  <span style={{ minWidth: 70 }}>Rev. {rev.revisionNumber || 1}</span>
                                  <span style={{ minWidth: 90 }}>{formatDateDisplay(rev.date)}</span>
                                  <span style={{ flex: 1 }}>{money(rev.finalPrice)}</span>
                                  <button
                                    style={styles.smallBtn}
                                    onClick={() => loadBudgetFromSnapshot(rev.snapshot, rev.id)}
                                  >
                                    Ver / editar
                                  </button>
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {selectedBudget && (
        <Panel
          title={`Detalle ${getSavedBudgetDisplayLabel(selectedBudget)}`}
          actions={<ButtonLike onClick={() => setSelectedHistoryId(null)} secondary>Cerrar detalle</ButtonLike>}
        >
          <div style={styles.metricGrid}>
            <MiniMetric label="Empresa" value={getCompanyMeta(selectedBudget.company).short} />
            <MiniMetric label="Fecha" value={formatDateDisplay(selectedBudget.date)} />
            <MiniMetric label="Entrega" value={formatDateDisplay(buildDeliveryDateFromTerm(selectedBudget.date, selectedBudget.deliveryTerm))} />
            <MiniMetric label="Encargado" value={selectedBudget.projectManager || "-"} />
            <MiniMetric label="Comision" value={money(selectedBudget.commissionAmount)} />
          </div>

          <div style={styles.grid2}>
            <Panel title="Presupuesto enviado" nested>
              <div><strong>Descripcion:</strong> {selectedBudget.snapshot.budget.notes}</div>
              <div style={{ marginTop: 10 }}><strong>Alcance:</strong> {selectedBudget.snapshot.budget.scope}</div>
            </Panel>

            <Panel title="Detalle faltantes" nested>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Material</th>
                    <th>Req.</th>
                    <th>Stock</th>
                    <th>Comprar</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBudget.snapshot.materials.map((material, index) => {
                    const stock = stockByDescription.get(material.description.trim().toLowerCase());
                    const available = stock?.quantity ?? 0;
                    const missing = Math.max(0, material.qty - available);
                    const tone =
                      available >= material.qty ? styles.statusGreen : available > 0 ? styles.statusYellow : styles.statusRed;
                    const label = available >= material.qty ? "Completo" : available > 0 ? "Parcial" : "Faltante";
                    return (
                      <tr key={`selected-budget-material-${material.id}-${index}`}>
                        <td><span style={{ ...styles.statusPill, ...tone }}>{label}</span></td>
                        <td>{material.description}</td>
                        <td>{material.qty} {material.unit}</td>
                        <td>{available} {material.unit}</td>
                        <td>{missing} {material.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          </div>
        </Panel>
      )}
    </>
  );

  return (
    <div style={{ ...styles.page, background: workspaceTheme.pageBackground }}>
      <style>{`
        table th, table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
        table th { text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; }
        @media print {
          @page { size: A4; margin: 0; }
          body[data-print-mode]:not([data-print-mode="client-budget"]) * { visibility: hidden !important; }
          body[data-print-mode="client-budget"] #root { display: none !important; }
          body[data-print-mode="client-budget"] #client-budget-pdf { display: block !important; padding: 14mm !important; }
          body[data-print-mode="report-marcadores"] #report-marcadores,
          body[data-print-mode="report-marcadores"] #report-marcadores * { visibility: visible !important; }
          body[data-print-mode="report-historial"] #report-historial,
          body[data-print-mode="report-historial"] #report-historial * { visibility: visible !important; }
          body[data-print-mode="report-crm"] #report-crm,
          body[data-print-mode="report-crm"] #report-crm * { visibility: visible !important; }
          body[data-print-mode="report-aprobados"] #report-aprobados,
          body[data-print-mode="report-aprobados"] #report-aprobados * { visibility: visible !important; }
          body[data-print-mode="report-stock"] #report-stock,
          body[data-print-mode="report-stock"] #report-stock * { visibility: visible !important; }
          body[data-print-mode="report-personal"] #report-personal,
          body[data-print-mode="report-personal"] #report-personal * { visibility: visible !important; }
          body[data-print-mode="report-facturacion"] #report-facturacion,
          body[data-print-mode="report-facturacion"] #report-facturacion * { visibility: visible !important; }
          body[data-print-mode="report-cashflow"] #report-cashflow,
          body[data-print-mode="report-cashflow"] #report-cashflow * { visibility: visible !important; }
          body[data-print-mode="report-compras"] #report-compras,
          body[data-print-mode="report-compras"] #report-compras * { visibility: visible !important; }
          body[data-print-mode="report-caja-chica"] #report-caja-chica,
          body[data-print-mode="report-caja-chica"] #report-caja-chica * { visibility: visible !important; }
          #report-cashflow,
          #report-compras,
          #report-caja-chica,
          #report-marcadores,
          #report-historial,
          #report-crm,
          #report-aprobados,
          #report-stock,
          #report-personal,
          #report-facturacion {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 24px;
            box-sizing: border-box;
          }
        }
      `}</style>
      <div style={{ ...styles.headerBar, borderTop: `8px solid ${workspaceTheme.primary}` }}>
        <div>
          <div style={{ ...styles.companyRibbon, background: workspaceTheme.soft, color: workspaceTheme.primary }}>
            {workspaceTheme.short}
          </div>
          <h1 style={{ margin: "8px 0 0 0" }}>{APP_TITLE}</h1>
          <div style={styles.muted}>Fechas visibles en formato dia-mes-año</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {activeTab !== "acceso" && (
            <>
              <ButtonLike onClick={handleUndo} secondary disabled={undoAvailable === 0}>
                {undoAvailable > 0 ? `Atras (${undoAvailable})` : "Atras"}
              </ButtonLike>
              <ButtonLike onClick={handleRedo} secondary disabled={redoAvailable === 0}>
                {redoAvailable > 0 ? `Rehacer (${redoAvailable})` : "Rehacer"}
              </ButtonLike>
              <ButtonLike
                onClick={() => {
                  if (activeTab === "presupuesto") {
                    void saveBudgetSnapshot();
                  } else {
                    void saveToSupabaseNow();
                  }
                }}
              >
                {activeTab === "presupuesto" && editingBudgetId ? "Actualizar" : "Guardar"}
              </ButtonLike>
              {editingBudgetId && (
                <ButtonLike onClick={resetBudgetEditingState} secondary>
                  Salir de edicion
                </ButtonLike>
              )}
              {activeTab !== "personal" && (
                <ButtonLike
                  onClick={() => exportPrint(getReportModeForTab(activeTab))}
                  secondary
                >
                  Reporte del mes
                </ButtonLike>
              )}
            </>
          )}
        </div>
      </div>

      {monthReportPromptTab === activeTab && activeTab !== "acceso" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            background: workspaceTheme.soft,
            border: `1px solid ${workspaceTheme.primary}`,
            color: workspaceTheme.primary,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 12,
          }}
        >
          <span style={{ flex: 1, fontSize: 13, minWidth: 200 }}>
            Guardado. ¿Querés revisar el reporte del mes de esta solapa?
          </span>
          <ButtonLike
            onClick={() => {
              exportPrint(getReportModeForTab(activeTab));
              setMonthReportPromptTab(null);
            }}
          >
            Ver reporte del mes
          </ButtonLike>
          <ButtonLike secondary onClick={() => setMonthReportPromptTab(null)}>
            Cerrar
          </ButtonLike>
        </div>
      )}

      <div style={styles.workspaceShell}>
        <aside
          style={{
            ...styles.sidebar,
            width: isSidebarExpanded ? 270 : 84,
            background: workspaceTheme.sidebarGradient,
          }}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <div style={styles.sidebarTitle}>
            {isSidebarExpanded ? "Menu del sistema" : "Menu"}
          </div>
          <div style={styles.sidebarTabs}>
            {sidebarSections.map((section) => (
              <div key={section.title} style={styles.sidebarSection}>
                {isSidebarExpanded && (
                  <div style={styles.sidebarSectionTitleWrap}>
                    <div style={styles.sidebarSectionTitle}>{section.title}</div>
                    <div style={styles.sidebarSectionHint}>{section.hint}</div>
                  </div>
                )}
                {section.tabs.map((tab) => (
                  <button
                    key={tab.key}
                    style={{
                      ...styles.sidebarTab,
                      ...(activeTab === tab.key
                        ? {
                            ...styles.sidebarTabActive,
                            background: workspaceTheme.sidebarActiveBackground,
                            borderColor: workspaceTheme.sidebarActiveBorder,
                            boxShadow: workspaceTheme.sidebarActiveShadow,
                          }
                        : {}),
                    }}
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    title={tab.label}
                  >
                    <span style={styles.sidebarTabBadge}>{TAB_SHORT_LABELS[tab.key]}</span>
                    {isSidebarExpanded && (
                      <span style={styles.sidebarTabTextWrap}>
                        <span>{tab.label}</span>
                        <span style={styles.sidebarTabCaption}>
                          {getTabAdministrationType(tab.key)}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {isSupabaseLoggedIn && (
            <div style={styles.sidebarFooter}>
              <button
                type="button"
                style={styles.assistantDockButton}
                onClick={() => {
                  setWorkspaceWidgetMode("assistant");
                  setWorkspaceWidgetOpen(true);
                }}
                title="Abrir asistente del sistema"
              >
                <span style={styles.assistantDockIcon}>AI</span>
                {isSidebarExpanded && (
                  <span style={styles.assistantDockTextWrap}>
                    <span>Asistente del sistema</span>
                    <span style={styles.assistantDockCaption}>
                      Consultas, avisos y soporte operativo
                    </span>
                  </span>
                )}
              </button>
            </div>
          )}
        </aside>

        <div style={styles.workspaceMain}>
          {isSupabaseLoggedIn && (
            <div
              style={{
                ...styles.collaborationBanner,
                background: workspaceTheme.bannerBackground,
                borderColor: workspaceTheme.bannerBorder,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong>Operacion compartida:</strong>{" "}
                {otherActiveSessions.length === 0
                  ? "No hay otros usuarios activos en este momento."
                  : `${otherActiveSessions.length} usuario(s) trabajando ahora.`}
              </div>
              {pendingRealtimeRefresh && (
                <div style={styles.collaborationBannerActions}>
                  <div style={styles.collaborationBannerMeta}>
                    {pendingRealtimeRefresh.text}
                  </div>
                  <ButtonLike onClick={restoreFromSupabaseSave} secondary>
                    Refresh
                  </ButtonLike>
                </div>
              )}
              {otherActiveSessions.length > 0 && (
                <div style={styles.collaborationBannerMeta}>
                  {otherActiveSessions
                    .map((item) => `${item.full_name || item.email} en ${getTabLabel(item.active_tab)}`)
                    .join(" | ")}
                </div>
              )}
            </div>
          )}

          {isSupabaseLoggedIn && (
            <div
              style={{
                ...styles.workspaceToolbar,
                background: workspaceTheme.toolbarBackground,
                borderColor: workspaceTheme.toolbarBorder,
              }}
            >
              <div style={styles.workspaceToolbarBlock}>
                <div style={styles.label}>Vista operativa por empresa</div>
                <select
                  style={styles.input}
                  value={workspaceCompanyScope}
                  onChange={(e) => setWorkspaceCompanyScope(e.target.value)}
                >
                  <option value="General">General / todo el grupo</option>
                  {COMPANY_OPTIONS.map((company) => (
                    <option key={`scope-${company.value}`} value={company.value}>
                      {company.short}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.workspaceToolbarInfo}>
                {workspaceCompanyScope === "General"
                  ? "Estas viendo informacion general y compartida entre empresas."
                  : `Estas trabajando enfocado en ${getCompanyMeta(workspaceCompanyScope).short}, pero los registros generales siguen visibles.`}
              </div>
            </div>
          )}

          {isSupabaseLoggedIn && activeMonthlyTab && (
            <div
              style={{
                ...styles.workspaceToolbar,
                background: workspaceTheme.toolbarBackground,
                borderColor: workspaceTheme.toolbarBorder,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 210 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: "#475569",
                  }}
                >
                  Mes en pantalla
                </span>
                <strong style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                  {monthLabel(operationalMonth)}
                </strong>
              </div>
              <div style={styles.workspaceToolbarBlock}>
                <div style={styles.label}>Mes operativo</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <ButtonLike onClick={() => shiftOperationalMonth(-1)} secondary>
                    Mes anterior
                  </ButtonLike>
                  <input
                    type="month"
                    value={operationalMonth}
                    onChange={(event) => syncOperationalMonth(event.target.value || localMonthKey())}
                    style={{ ...styles.input, maxWidth: 170 }}
                  />
                  <ButtonLike onClick={() => shiftOperationalMonth(1)} secondary>
                    Mes siguiente
                  </ButtonLike>
                  <ButtonLike onClick={() => syncOperationalMonth(localMonthKey())} secondary>
                    Mes actual
                  </ButtonLike>
                </div>
              </div>
              <div style={styles.workspaceToolbarInfo}>
                <strong>{monthLabel(operationalMonth)}</strong> - {operationalMonthStatus}. Este
                periodo ordena {getTabLabel(activeMonthlyTab)} para{" "}
                {getCompanyScopeLabel(workspaceCompanyScope)}.
                <br />
                Ultimo cierre:{" "}
                {latestMonthlyHistorySnapshot
                  ? `${latestMonthlyHistorySnapshot.monthLabel} por ${
                      latestMonthlyHistorySnapshot.savedBy || "Usuario"
                    }`
                  : "sin cierre guardado todavia"}
                .
              </div>
              <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                <ButtonLike onClick={saveMonthlyHistorySnapshot}>Guardar mes</ButtonLike>
                <span style={styles.muted}>{activeMonthlyHistory.length} cierre(s)</span>
              </div>
            </div>
          )}

      {activeTab === "acceso" && (
        !isSupabaseLoggedIn ? (
          <div style={styles.accessShell}>
            <div style={styles.accessCard}>
              <div style={styles.accessBrand}>
                {budget.logos[0]?.preview ? (
                  <img src={budget.logos[0].preview} alt="Logo Grupo BGA" style={styles.accessLogo} />
                ) : (
                  <div style={styles.accessLogoPlaceholder}>BGA</div>
                )}
                <div style={styles.accessTitle}>Grupo BGA</div>
                <div style={styles.accessSubtitle}>Acceso al sistema</div>
                <div style={styles.accessSubcompaniesHint}>
                  Luego agregaremos aqui los logos de las subempresas.
                </div>
              </div>

              <div style={styles.accessFormCard}>
                <div style={styles.accessFormTitle}>
                  {isSupabaseRecoveryMode
                    ? "Definir nueva contrasena"
                    : "Iniciar sesion con Supabase"}
                </div>
                <div style={styles.accessFormText}>
                  {isSupabaseRecoveryMode
                    ? "Estas dentro del flujo de recuperacion. Escribe tu nueva contrasena para terminar el cambio."
                    : "Usa tu mail y contrasena habilitados en Supabase para entrar al sistema compartido."}
                </div>
                {isSupabaseRecoveryMode ? (
                  <>
                    <div style={styles.accessInputStack}>
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseNewPassword}
                        onChange={(e) => setSupabaseNewPassword(e.target.value)}
                        placeholder="Nueva contrasena"
                        autoComplete="new-password"
                      />
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseNewPasswordConfirm}
                        onChange={(e) => setSupabaseNewPasswordConfirm(e.target.value)}
                        placeholder="Repetir nueva contrasena"
                        autoComplete="new-password"
                      />
                    </div>
                    <button style={styles.accessSubmitBtn} onClick={updateSupabasePassword}>
                      Guardar nueva contrasena
                    </button>
                    <button
                      style={styles.accessSecondaryBtn}
                      onClick={() => {
                        setIsSupabaseRecoveryMode(false);
                        clearSupabasePasswordDrafts();
                      }}
                    >
                      Volver al ingreso
                    </button>
                  </>
                ) : (
                  <>
                    <div style={styles.accessInputStack}>
                      <input
                        style={styles.accessInput}
                        value={supabaseLoginEmail}
                        onChange={(e) => setSupabaseLoginEmail(e.target.value)}
                        placeholder="Mail de Supabase"
                        autoComplete="username"
                      />
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseLoginPassword}
                        onChange={(e) => setSupabaseLoginPassword(e.target.value)}
                        placeholder="Contrasena de Supabase"
                        autoComplete="current-password"
                      />
                    </div>
                    <button style={styles.accessSubmitBtn} onClick={loginSupabaseTest}>
                      Ingresar al sistema
                    </button>
                    <button style={styles.accessSecondaryBtn} onClick={sendSupabasePasswordRecovery}>
                      Olvide mi contrasena
                    </button>
                  </>
                )}
                <div style={styles.accessHelpText}>
                  El acceso local fue deshabilitado. Todo el sistema usa autenticacion por Supabase.
                </div>
                {supabaseAuthMessage && (
                  <div style={styles.accessFeedback}>{supabaseAuthMessage}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.column}>
            <Panel
              title="Sesion Supabase"
              span="half"
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ButtonLike onClick={logoutSupabaseTest} secondary>
                    Cerrar sesion Supabase
                  </ButtonLike>
                </div>
              }
            >
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Sesion actual</div>
                  <div style={styles.muted}>
                    Usuario: <strong>{supabaseSession?.user?.email || "Usuario Supabase"}</strong>
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Rol: {supabaseProfile?.is_superadmin ? "Administrador Supabase" : "Usuario Supabase"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Permisos cargados</div>
                  <div style={styles.muted}>
                    Empresas: {supabaseAllowedCompanies.map((item) => getCompanyMeta(item).short).join(", ") || "-"}
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Solapas: {visibleTabOptions.map((item) => item.label).join(", ") || "-"}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Seguridad de acceso" span="half">
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Cambiar contrasena</div>
                  <div style={styles.muted}>
                    Puedes actualizarla directamente desde aqui, sin salir del sistema.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    style={styles.input}
                    type="password"
                    value={supabaseNewPassword}
                    onChange={(e) => setSupabaseNewPassword(e.target.value)}
                    placeholder="Nueva contrasena"
                    autoComplete="new-password"
                  />
                  <input
                    style={styles.input}
                    type="password"
                    value={supabaseNewPasswordConfirm}
                    onChange={(e) => setSupabaseNewPasswordConfirm(e.target.value)}
                    placeholder="Repetir nueva contrasena"
                    autoComplete="new-password"
                  />
                  <div>
                    <ButtonLike onClick={updateSupabasePassword}>Actualizar contrasena</ButtonLike>
                  </div>
                </div>
              </div>
            </Panel>

            {effectiveIsAdmin && (
              <Panel title="Usuarios creados en Supabase" span="wide">
                {supabaseUserDirectory.length === 0 ? (
                  <div style={styles.empty}>
                    No pude leer perfiles todavia. Si esto sigue vacio, corre el SQL de
                    colaboracion actualizado para habilitar el directorio interno.
                  </div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>En linea</th>
                        <th>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supabaseUserDirectory.map((user) => {
                        const activeSession = supabaseActiveSessions.find(
                          (session) => session.user_id === user.id
                        );
                        return (
                          <tr key={`directory-user-${user.id}`}>
                            <td>{user.full_name || "Usuario sin nombre"}</td>
                            <td>{user.is_superadmin ? "Administrador" : "Operativo"}</td>
                            <td>{user.active === false ? "Inactivo" : "Activo"}</td>
                            <td>{activeSession ? "Conectado" : "Sin sesion"}</td>
                            <td>{user.id.slice(0, 8)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Panel>
            )}

            {effectiveIsAdmin && (
              <Panel title="Empresas del sistema" span="wide">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={styles.label}>Empresas activas</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "start" }}>
                      {COMPANY_OPTIONS.map((company) => (
                        <div key={`company-card-${company.value}`} style={styles.subCard}>
                          <div style={styles.inlineActions}>
                            <div
                              style={{
                                ...styles.companyRibbonMini,
                                background: company.soft,
                                color: company.primary,
                              }}
                            >
                              {company.short}
                            </div>
                            <strong>{company.value}</strong>
                          </div>
                          <div style={styles.muted}>CUIT: {company.taxId || "-"}</div>
                          <div style={styles.muted}>Banco: {company.bankName || "-"}</div>
                          <div style={styles.muted}>Alias: {company.bankAlias || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Agregar nueva empresa</div>
                    <div style={styles.grid2}>
                      <input
                        style={styles.input}
                        value={newCompanyDraft.value}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, value: e.target.value }))
                        }
                        placeholder="Razon social"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.short}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, short: e.target.value }))
                        }
                        placeholder="Nombre corto"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.taxId}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, taxId: e.target.value }))
                        }
                        placeholder="CUIT"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankName}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        placeholder="Banco"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankAlias}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankAlias: e.target.value }))
                        }
                        placeholder="Alias"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankCbu}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankCbu: e.target.value }))
                        }
                        placeholder="CBU"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankAccount}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankAccount: e.target.value }))
                        }
                        placeholder="Cuenta"
                      />
                      <div style={styles.inlineActions}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="color"
                          value={newCompanyDraft.primary}
                          onChange={(e) =>
                            setNewCompanyDraft((prev) => ({ ...prev, primary: e.target.value }))
                          }
                        />
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="color"
                          value={newCompanyDraft.soft}
                          onChange={(e) =>
                            setNewCompanyDraft((prev) => ({ ...prev, soft: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <ButtonLike onClick={addCompanyCatalogEntry}>Agregar empresa</ButtonLike>
                    </div>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Esto la suma al sistema publicado. Despues hay que darla de alta tambien en Supabase para permisos y seguridad.
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            <Panel
              title="Datos y guardado"
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ButtonLike onClick={restoreFromLocalSave} secondary>
                    Restaurar guardado local
                  </ButtonLike>
                  <ButtonLike onClick={restoreFromSupabaseSave} secondary>
                    Restaurar Supabase
                  </ButtonLike>
                  <ButtonLike
                    onClick={saveToSupabaseNow}
                    secondary
                    disabled={isSupabaseManualSaveInProgress}
                  >
                    {isSupabaseManualSaveInProgress ? "Guardando..." : "Guardar en Supabase"}
                  </ButtonLike>
                  <ButtonLike onClick={downloadBackupFile} secondary>
                    Descargar backup
                  </ButtonLike>
                  <label style={styles.buttonLikeLabel}>
                    Cargar backup
                    <input
                      type="file"
                      accept="application/json,.json,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => importBackupFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <ButtonLike onClick={clearLocalSave} secondary>
                    Borrar guardado local
                  </ButtonLike>
                </div>
              }
            >
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Guardado automatico</div>
                  <div style={styles.muted}>
                    {isPersistenceReady
                      ? "Activo en este navegador y sincronizado con Supabase en tiempo real mientras la sesion este iniciada."
                      : "Preparando el guardado automatico..."}
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Ultimo guardado: {formatDateTimeDisplay(lastSavedAt)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Uso recomendado</div>
                  <div style={styles.muted}>
                    Los cambios ahora se comparten en tiempo real. Usa Guardar en Supabase como confirmacion manual adicional antes de cerrar.
                  </div>
                  {storageMessage && (
                    <div style={{ ...styles.muted, marginTop: 6 }}>{storageMessage}</div>
                  )}
                  {supabaseAuthMessage && (
                    <div style={{ ...styles.muted, marginTop: 6 }}>{supabaseAuthMessage}</div>
                  )}
                </div>
              </div>
            </Panel>

          </div>
        )
      )}

      {activeTab === "cashflow" && (
        <div style={styles.column}>
          <Panel title="Cash flow y estado de resultados" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturado bruto" value={money(cashFlowSummary.billedGross)} />
              <MiniMetric label="Cobrado" value={money(cashFlowSummary.collected)} />
              <MiniMetric label="Pendiente de cobro" value={money(cashFlowSummary.pendingCollections)} />
              <MiniMetric label="Compras cargadas" value={money(cashFlowSummary.purchaseInvoicesTotal)} />
              <MiniMetric label="Caja chica negro" value={money(cashFlowSummary.pettyCashBlackTotal)} />
              <MiniMetric label="Caja chica blanco" value={money(cashFlowSummary.pettyCashWhiteTotal)} />
              <MiniMetric label="Comisiones pendientes" value={money(cashFlowSummary.commissionsPending)} />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} />
            </div>
          </Panel>

          <Panel title="Resultado preliminar" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos cobrados" value={money(cashFlowSummary.collected)} />
              <MiniMetric label="Compras" value={money(cashFlowSummary.purchaseInvoicesTotal)} />
              <MiniMetric label="Egresos negro" value={money(cashFlowSummary.pettyCashBlackTotal)} />
              <MiniMetric label="Comisiones" value={money(cashFlowSummary.commissionsPending)} />
              <MiniMetric label="Amortizacion" value={money(activeAssetsMonthlyDepreciation)} />
              <MiniMetric label="Creditos bancarios" value={money(cashFlowSummary.bankCredits)} />
              <MiniMetric label="Debitos bancarios" value={money(cashFlowSummary.bankDebits)} />
              <MiniMetric label="Resultado blanco" value={money(cashFlowSummary.operatingResultWhite)} />
              <MiniMetric label="Resultado negro" value={money(cashFlowSummary.operatingResultBlack)} />
              <MiniMetric label="Resultado operativo" value={money(cashFlowSummary.operatingResult)} />
            </div>
            <div style={styles.noticeBox}>
              Esta solapa ya queda preparada como tablero inicial. Luego podemos separar flujo de caja real, devengado, impuestos y estado de resultados por empresa.
            </div>
          </Panel>

          <Panel title={`Calendario anual unificado ${analysisYear}`} span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Eventos del año" value={String(annualCashFlowEntries.length)} />
              <MiniMetric label="Mov. bancarios" value={String(bankStatementEntries.length)} />
              <MiniMetric label="Compromisos deuda" value={String(annualDebtRows.length)} />
              <MiniMetric label="Ultimo saldo banco" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.yearCalendarGrid}>
              {annualCashFlowByMonth.map((month) => (
                <div key={month.key} style={styles.yearCalendarCard}>
                  <div style={styles.yearCalendarTitle}>{month.label}</div>
                  {month.items.length === 0 ? (
                    <div style={styles.calendarEmpty}>Sin movimientos</div>
                  ) : (
                    month.items.slice(0, 10).map((item) => {
                      const companyMetaItem = getCompanyMeta(item.company);
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...styles.yearCalendarEvent,
                            borderLeft: `6px solid ${companyMetaItem.primary}`,
                            background: `${companyMetaItem.soft}`,
                          }}
                        >
                          <div style={styles.yearCalendarEventTitle}>
                            {formatDateDisplay(item.date)} · {item.title}
                          </div>
                          <div style={styles.calendarItemMeta}>
                            {item.kind} · {item.statusLabel}
                            {item.amount ? ` · ${money(item.amount)}` : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {month.items.length > 10 && (
                    <div style={styles.calendarItemMeta}>+ {month.items.length - 10} eventos mas</div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Desendeudamiento"
            span="wide"
            actions={<ButtonLike onClick={addDebtPlan}>Agregar compromiso</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Deuda proxima"
                value={money(
                  debtPlans.filter((item) => item.active).reduce(
                    (acc, item) => acc + Number(item.nextInstallmentAmount || 0),
                    0
                  )
                )}
              />
              <MiniMetric
                label="Compromisos activos"
                value={String(debtPlans.filter((item) => item.active).length)}
              />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Concepto</th>
                  <th>Dia</th>
                  <th>Proxima cuota</th>
                  <th>Cuotas restantes</th>
                  <th>Prox. vencimiento</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {debtPlans.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input type="checkbox" checked={item.active} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "active", e.target.checked)} />
                    </td>
                    <td>
                      <select style={styles.input} value={item.company} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "company", e.target.value)}>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input style={styles.input} value={item.concept} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "concept", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.dueDay} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "dueDay", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.nextInstallmentAmount} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "nextInstallmentAmount", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.remainingInstallments} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "remainingInstallments", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="date" value={item.nextDueDate} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "nextDueDate", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={item.notes} onChange={(e) => updateArrayItem(setDebtPlans, item.id, "notes", e.target.value)} />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeDebtPlan(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title={`Calendario anual de desendeudamiento ${analysisYear}`} span="wide">
            <div style={styles.yearCalendarGrid}>
              {annualDebtByMonth.map((month) => (
                <div key={month.key} style={styles.yearCalendarCard}>
                  <div style={styles.yearCalendarTitle}>
                    {month.label} · {money(month.total)}
                  </div>
                  {month.items.length === 0 ? (
                    <div style={styles.calendarEmpty}>Sin cuotas</div>
                  ) : (
                    month.items.map((item) => {
                      const companyMetaItem = getCompanyMeta(item.company);
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...styles.yearCalendarEvent,
                            borderLeft: `6px solid ${companyMetaItem.primary}`,
                            background: `${companyMetaItem.soft}`,
                          }}
                        >
                          <div style={styles.yearCalendarEventTitle}>
                            {formatDateDisplay(item.date)} · {item.concept}
                          </div>
                          <div style={styles.calendarItemMeta}>
                            Cuota {item.installmentNumber}/{item.totalInstallments} · {money(item.amount)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title={`Movimientos bancarios - ${monthLabel(operationalMonth)}`}
            span="full"
            actions={<ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos banco" value={money(bankStatementSummary.credits)} />
              <MiniMetric label="Egresos banco" value={money(bankStatementSummary.debits)} />
              <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
              <MiniMetric label="Ultimo saldo" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.noticeBox}>
              Las métricas de arriba son <strong>acumuladas</strong> (todos los meses); la lista de abajo
              muestra solo <strong>{monthLabel(operationalMonth)}</strong> — usá la barra de mes para navegar.
              Este bloque también alimenta el calendario anual de cash flow.
            </div>
            {monthBankStatementEntries.length === 0 ? (
              <div style={styles.empty}>No hay movimientos bancarios en {monthLabel(operationalMonth)}.</div>
            ) : (
              monthBankStatementEntries.map((entry) => (
                <div key={entry.id} style={styles.subCard}>
                  <div style={styles.inlineActions}>
                    <button style={styles.smallBtn} onClick={() => removeBankStatementEntry(entry.id)}>
                      Quitar movimiento
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={entry.company}
                        onChange={(e) => updateBankStatementEntry(entry.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fecha">
                      <input
                        style={styles.input}
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateBankStatementEntry(entry.id, "date", e.target.value)}
                      />
                    </Field>
                    <Field label="Banco">
                      <input
                        style={styles.input}
                        value={entry.bank}
                        onChange={(e) => updateBankStatementEntry(entry.id, "bank", e.target.value)}
                      />
                    </Field>
                    <Field label="Tipo">
                      <select
                        style={styles.input}
                        value={entry.movementType}
                        onChange={(e) =>
                          updateBankStatementEntry(
                            entry.id,
                            "movementType",
                            e.target.value as "credito" | "debito"
                          )
                        }
                      >
                        <option value="credito">Credito</option>
                        <option value="debito">Debito</option>
                      </select>
                    </Field>
                    <Field label="Concepto">
                      <input
                        style={styles.input}
                        value={entry.concept}
                        onChange={(e) => updateBankStatementEntry(entry.id, "concept", e.target.value)}
                      />
                    </Field>
                    <Field label="Monto">
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateBankStatementEntry(entry.id, "amount", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Saldo">
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.balance}
                        onChange={(e) => updateBankStatementEntry(entry.id, "balance", Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Carga asistida">
                      <input style={styles.input} value={entry.extractedAutomatically ? "Si" : "Manual"} readOnly />
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea
                      style={styles.textarea}
                      value={entry.notes}
                      onChange={(e) => updateBankStatementEntry(entry.id, "notes", e.target.value)}
                    />
                  </Field>
                  <div style={styles.uploadActions}>
                    <label style={styles.buttonLikeLabel}>
                      Cargar resumen / comprobante
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => uploadBankStatementFile(entry.id, e.target.files?.[0] || null)}
                      />
                    </label>
                    {entry.attachmentName && <div style={styles.fileName}>{entry.attachmentName}</div>}
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}

      {activeTab === "compras" && (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de compras">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Materiales cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Compra parcial", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
            <div style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Semaforo level={purchaseDeadlineSemaphore.level} size={24} ring />
              <div>
                <div style={styles.metricLabel}>Fechas limite de compra</div>
                <div style={{ fontWeight: 700 }}>{purchaseDeadlineSemaphore.label}</div>
              </div>
            </div>
          </Panel>
          <Panel title="Resumen de compras pendientes" span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items faltantes" value={String(stockNeedRows.length)} />
              <MiniMetric label="Costo estimado" value={money(totalPurchaseNeed)} />
              <MiniMetric label="Trabajos con fecha limite" value={String(purchaseCalendarRows.length)} />
            </div>
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay compras pendientes detectadas desde stock y trabajos aprobados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresas</th>
                    <th>Material</th>
                    <th>Requerido</th>
                    <th>Stock</th>
                    <th>Faltante</th>
                    <th>Costo estimado</th>
                    <th>Trabajos</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => (
                    <tr key={row.description}>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.description}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                      <td>{money(row.estimatedCost)}</td>
                      <td>{row.jobs.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Resumen administrativo de compras" span="half">
            <div style={styles.metricGrid}>
              <MiniMetric label="Facturas cargadas" value={String(purchaseInvoiceSummary.invoicesCount)} />
              <MiniMetric label="Carga asistida" value={String(purchaseInvoiceSummary.autoLoadedCount)} />
              <MiniMetric label="Exento" value={money(purchaseInvoiceSummary.exemptAmount)} />
              <MiniMetric label="Neto 21%" value={money(purchaseInvoiceSummary.net21)} />
              <MiniMetric label="IVA credito fiscal" value={money(purchaseInvoiceSummary.vatAmount)} />
              <MiniMetric label="Total compras" value={money(purchaseInvoiceSummary.totalAmount)} />
              <MiniMetric label="Caja chica blanco" value={money(pettyCashSummary.whiteTotal)} />
            </div>
            <div style={styles.noticeBox}>
              Este bloque ya queda armado siguiendo la lógica de sus planillas auxiliares: proveedor, comprobante, moneda, neto gravado, exento e IVA separado para luego exportar al estudio contable.
            </div>
          </Panel>

          <Panel title={`Facturas blancas vinculadas desde caja chica - ${monthLabel(purchaseMonth)}`} span="half">
            {monthPettyCashExpenses.filter((item) => item.administration === "blanco").length === 0 ? (
              <div style={styles.empty}>No hay gastos de caja chica en blanco en {monthLabel(purchaseMonth)} para levantar dentro de compras.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Descripcion</th>
                    <th>Factura</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthPettyCashExpenses
                    .filter((item) => item.administration === "blanco")
                    .map((item) => (
                      <tr key={`pc-white-${item.id}`}>
                        <td>{getCompanyMeta(item.company).short}</td>
                        <td>{formatDateDisplay(item.date)}</td>
                        <td>{item.supplier || "-"}</td>
                        <td>{item.description}</td>
                        <td>{item.invoiceNumber || "-"}</td>
                        <td>{money(item.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Calendario de fechas limite de compra"
            span="wide"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftPurchaseMonth(-1)} secondary>Mes anterior</ButtonLike>
                <div style={styles.calendarMonthLabel}>{purchaseMonthData.label}</div>
                <ButtonLike onClick={() => shiftPurchaseMonth(1)} secondary>Mes siguiente</ButtonLike>
              </div>
            }
          >
            <div style={styles.calendarWeekdays}>
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} style={styles.calendarWeekdayCell}>{day}</div>
              ))}
            </div>
            <div style={styles.calendarGrid}>
              {purchaseMonthData.cells.map((cell) => {
                const items = purchaseItemsByDate.get(cell.date) ?? [];
                return (
                  <div
                    key={cell.date}
                    style={{
                      ...styles.calendarCell,
                      ...(cell.inCurrentMonth ? {} : styles.calendarCellMuted),
                    }}
                  >
                    <div style={styles.calendarCellHeader}>
                      <strong>{cell.day}</strong>
                    </div>
                    {items.length === 0 ? (
                      <div style={styles.calendarEmpty}>Sin fecha</div>
                    ) : (
                      items.map((item) => {
                        const meta = getCompanyMeta(item.company);
                        return (
                          <div
                            key={`${item.id}-${item.deadlineDate}`}
                            style={{
                              ...styles.calendarItem,
                              background: `${meta.soft}`,
                              color: meta.primary,
                              borderLeft: `8px solid ${meta.primary}`,
                            }}
                          >
                            <div><strong>{item.budgetNumber}</strong></div>
                            <div>{item.client}</div>
                            <div style={styles.calendarItemMeta}>{item.missingCount} faltantes</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Gantt de compras" span="full">
            {purchaseCalendarRows.length === 0 ? (
              <div style={styles.empty}>Carga fechas de inicio de fabricacion para ver el avance de compras.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseCalendarRows.map((row) => {
                    const job = approvedJobsSummary.find((item) => item.id === row.id);
                    const start = job?.approvalDate || row.deadlineDate;
                    const end = row.deadlineDate;
                    const totalDays = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
                    const elapsedDays = Math.max(0, Math.ceil((new Date(todayIso()).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
                    const progressPct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
                    const meta = getCompanyMeta(row.company);
                    return (
                      <tr key={`gantt-purchase-${row.id}`}>
                        <td>{meta.short}</td>
                        <td>{row.budgetNumber}</td>
                        <td>{row.client}</td>
                        <td>{formatDateDisplay(start)}</td>
                        <td>{formatDateDisplay(end)}</td>
                        <td>
                          <div style={styles.ganttTrack}>
                            <div style={{ ...styles.ganttFill, width: `${progressPct}%`, background: meta.primary }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title={`Facturas de compra - ${monthLabel(purchaseMonth)}`}
            actions={<ButtonLike onClick={addPurchaseInvoice}>Agregar factura</ButtonLike>}
          >
            <div style={styles.noticeBox}>
              Mostrando las facturas de <strong>{monthLabel(purchaseMonth)}</strong> — usá la barra de mes para navegar.
              Puedes cargar una imagen o PDF y dejar que el sistema precomplete una base editable. Después podremos mejorar esta lectura automática con OCR más fino.
            </div>
            {monthPurchaseInvoices.length === 0 ? (
              <div style={styles.empty}>No hay facturas de compra cargadas en {monthLabel(purchaseMonth)}.</div>
            ) : (
              monthPurchaseInvoices.map((invoice) => (
                <div key={invoice.id} style={styles.subCard}>
                  <div style={styles.inlineActions}>
                    <button style={styles.smallBtn} onClick={() => removePurchaseInvoice(invoice.id)}>
                      Quitar factura
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={invoice.company}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Administracion">
                      <select
                        style={styles.input}
                        value={invoice.administration}
                        onChange={(e) => updatePurchaseInvoice(invoice.id, "administration", e.target.value)}
                      >
                        <option value="blanco">Blanco</option>
                        <option value="negro">Negro</option>
                      </select>
                    </Field>
                    <Field label="Origen">
                      <input style={styles.input} value={invoice.source} readOnly />
                    </Field>
                    <Field label="Proveedor">
                      <input style={styles.input} value={invoice.supplier} onChange={(e) => updatePurchaseInvoice(invoice.id, "supplier", e.target.value)} />
                    </Field>
                    <Field label="CUIT / CUIL">
                      <input style={styles.input} value={invoice.taxId} onChange={(e) => updatePurchaseInvoice(invoice.id, "taxId", e.target.value)} />
                    </Field>
                    <Field label="Tipo de comprobante">
                      <input style={styles.input} value={invoice.receiptKind} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptKind", e.target.value)} />
                    </Field>
                    <Field label="Letra / tipo">
                      <input style={styles.input} value={invoice.receiptLetter} onChange={(e) => updatePurchaseInvoice(invoice.id, "receiptLetter", e.target.value)} />
                    </Field>
                    <Field label="Numero">
                      <input style={styles.input} value={invoice.invoiceNumber} onChange={(e) => updatePurchaseInvoice(invoice.id, "invoiceNumber", e.target.value)} />
                    </Field>
                    <Field label="Fecha">
                      <input style={styles.input} type="date" value={invoice.invoiceDate} onChange={(e) => updatePurchaseInvoice(invoice.id, "invoiceDate", e.target.value)} />
                    </Field>
                    <Field label="Moneda">
                      <input style={styles.input} value={invoice.currency} onChange={(e) => updatePurchaseInvoice(invoice.id, "currency", e.target.value)} />
                    </Field>
                    <Field label="Exento">
                      <input style={styles.input} type="number" value={invoice.exemptAmount} onChange={(e) => updatePurchaseInvoice(invoice.id, "exemptAmount", Number(e.target.value))} />
                    </Field>
                    <Field label="Neto 21%">
                      <input style={styles.input} type="number" value={invoice.net21} onChange={(e) => updatePurchaseInvoice(invoice.id, "net21", Number(e.target.value))} />
                    </Field>
                    <Field label="Subtotal">
                      <input style={styles.input} type="number" value={invoice.subtotal} onChange={(e) => updatePurchaseInvoice(invoice.id, "subtotal", Number(e.target.value))} />
                    </Field>
                    <Field label="IVA">
                      <input style={styles.input} type="number" value={invoice.vat} onChange={(e) => updatePurchaseInvoice(invoice.id, "vat", Number(e.target.value))} />
                    </Field>
                    <Field label="Total">
                      <input style={styles.input} type="number" value={invoice.total} onChange={(e) => updatePurchaseInvoice(invoice.id, "total", Number(e.target.value))} />
                    </Field>
                    <Field label="Carga automatica">
                      <input style={styles.input} value={invoice.extractedAutomatically ? "Si" : "Manual"} readOnly />
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea style={styles.textarea} value={invoice.notes} onChange={(e) => updatePurchaseInvoice(invoice.id, "notes", e.target.value)} />
                  </Field>
                  <div style={styles.uploadActions}>
                    <FileDropButton
                      label="Cargar imagen o PDF"
                      fileName={invoice.attachmentName}
                      onFileSelected={(file) => uploadPurchaseInvoiceFile(invoice.id, file)}
                    />
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}

      {activeTab === "cajaChica" && (
        <div style={styles.column}>
          <Panel span="full" title="Semaforo de caja chica">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Fondos con saldo", value: String(fundSemaphoreSummary.verde) },
                { level: "amarillo", label: "Saldo bajo", value: String(fundSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Saldo agotado", value: String(fundSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="Resumen de caja chica" span="full">
            <div style={styles.metricGrid}>
              <MiniMetric label="Fondos activos" value={String(visiblePettyCashFunds.filter((item) => item.active).length)} />
              <MiniMetric label="Monto asignado" value={money(pettyCashSummary.assignedTotal)} />
              <MiniMetric label="Rendido" value={money(pettyCashSummary.renderedTotal)} />
              <MiniMetric label="Saldo pendiente" value={money(pettyCashSummary.pendingBalance)} />
              <MiniMetric label="Deuda con responsables" value={money(totalResponsibleDebt)} />
              <MiniMetric label="Administracion blanco" value={money(pettyCashSummary.whiteTotal)} />
              <MiniMetric label="Administracion negro" value={money(pettyCashSummary.blackTotal)} />
            </div>
            <div style={styles.noticeBox}>
              Caja chica queda pensada como administracion fuera del circuito bancario. Si un gasto se marca en blanco, tambien queda referenciado dentro de Compras para seguimiento contable.
            </div>
          </Panel>

          <Panel title="Rendicion por responsable" span="wide">
            {responsibleRendicion.length === 0 ? (
              <div style={styles.empty}>Todavia no hay responsables con cajas asignadas.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                {responsibleRendicion.map((r) => {
                  const estado =
                    r.net < 0
                      ? { texto: `La empresa le debe ${money(Math.abs(r.net))}`, color: "#dc2626" }
                      : r.net > 0
                        ? { texto: `Saldo a rendir (en su poder) ${money(r.net)}`, color: "#b7791f" }
                        : { texto: "Al dia", color: "#16a34a" };
                  return (
                    <div key={r.responsible} style={styles.nestedCard}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <Semaforo level={r.net < 0 ? "rojo" : r.net > 0 ? "amarillo" : "verde"} size={18} ring />
                        <strong style={{ fontSize: 15 }}>{r.responsible}</strong>
                      </div>
                      <div style={{ ...styles.metricLabel, color: estado.color, marginBottom: 8 }}>
                        {estado.texto}
                      </div>
                      <div style={styles.metricGrid}>
                        <MiniMetric label="Cajas asignadas" value={String(r.funds.length)} />
                        <MiniMetric label="Total asignado" value={money(r.totalAssigned)} />
                        <MiniMetric label="Total rendido" value={money(r.totalRendered)} />
                      </div>
                      <table style={{ ...styles.table, marginTop: 10 }}>
                        <thead>
                          <tr>
                            <th>Caja</th>
                            <th>Asignado</th>
                            <th>Rendido</th>
                            <th>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.funds
                            .slice()
                            .sort((a, b) => a.fund.id - b.fund.id)
                            .map((f) => (
                              <tr key={f.fund.id}>
                                <td>
                                  {f.fund.description || "Caja sin descripcion"} ·{" "}
                                  {getCompanyMeta(f.fund.company).short}
                                </td>
                                <td>{money(Number(f.fund.assignedAmount || 0))}</td>
                                <td>{money(f.renderedTotal)}</td>
                                <td style={f.remainingBalance < 0 ? { color: "#dc2626" } : undefined}>
                                  {money(f.remainingBalance)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Responsabilidad y fondos"
            span="wide"
            actions={<ButtonLike onClick={addPettyCashFund}>Agregar caja chica</ButtonLike>}
          >
            <datalist id="petty-cash-responsibles">
              {Array.from(
                new Set(visiblePettyCashFunds.map((f) => (f.responsible || "").trim()).filter(Boolean))
              ).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {visiblePettyCashFunds.length === 0 ? (
              <div style={styles.empty}>Todavia no hay fondos de caja chica cargados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Empresa</th>
                    <th>Descripcion caja chica</th>
                    <th>Responsable</th>
                    <th>Monto asignado</th>
                    <th>Entrega</th>
                    <th>Recarga</th>
                    <th>Rendido</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePettyCashFunds.map((fund) => {
                    const rendered = visiblePettyCashExpenses
                      .filter((item) => item.fundId === fund.id)
                      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
                    return (
                      <tr key={fund.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={fund.active}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "active", e.target.checked)}
                          />
                        </td>
                        <td>
                          <select
                            style={styles.input}
                            value={fund.company}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "company", e.target.value as CompanyName)}
                          >
                            {COMPANY_OPTIONS.map((company) => (
                              <option key={company.value} value={company.value}>
                                {company.short}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            value={fund.description}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "description", e.target.value)}
                            placeholder="Ej: Caja montaje, Caja compras chicas"
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="petty-cash-responsibles"
                            value={fund.responsible}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "responsible", e.target.value)}
                            placeholder="Responsable"
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={fund.assignedAmount}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "assignedAmount", Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="date"
                            value={fund.deliveredDate}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "deliveredDate", e.target.value)}
                          />
                        </td>
                        <td>{fund.rechargeDate ? formatDateDisplay(fund.rechargeDate) : "-"}</td>
                        <td>{money(rendered)}</td>
                        <td>{money(Number(fund.assignedAmount || 0) - rendered)}</td>
                        <td>
                          {fund.closed || Number(fund.assignedAmount || 0) - rendered <= 0
                            ? `Cerrada${fund.closedDate ? ` · ${formatDateDisplay(fund.closedDate)}` : ""}`
                            : "Activa"}
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            value={fund.notes}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "notes", e.target.value)}
                          />
                        </td>
                        <td>
                          <button style={styles.smallBtn} onClick={() => removePettyCashFund(fund.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Fondos operativos y rendicion" span="full">
            {pettyCashFundSummaries.length === 0 ? (
              <div style={styles.empty}>Agrega una caja chica para empezar a rendir gastos.</div>
            ) : (
              <div style={styles.pettyCashFundGrid}>
                {pettyCashFundSummaries.map(({ fund, expenses, renderedTotal, whiteTotal, blackTotal, remainingBalance }) => (
                  <div key={fund.id} style={styles.pettyCashFundCard}>
                    <div style={styles.pettyCashFundHeader}>
                      <div style={styles.pettyCashFundTitle}>
                        <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Semaforo
                            level={getFundSemaphore(remainingBalance, fund.assignedAmount).level}
                            size={12}
                            title={getFundSemaphore(remainingBalance, fund.assignedAmount).label}
                          />
                          {fund.description || "Caja chica sin descripcion"}
                        </strong>
                        <span style={styles.muted}>
                          {fund.responsible || "Sin responsable"} · {getCompanyMeta(fund.company).short}
                        </span>
                        <span style={styles.pettyCashFundState}>
                          {(fund.closed || remainingBalance <= 0)
                            ? `Caja cerrada${fund.closedDate ? ` el ${formatDateDisplay(fund.closedDate)}` : ""}`
                            : "Caja activa"}
                        </span>
                      </div>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => addPettyCashExpense(fund.id)}>
                          Agregar gasto
                        </button>
                        {(fund.closed || remainingBalance <= 0) && (
                          <button style={styles.smallBtn} onClick={() => reopenPettyCashFund(fund.id)}>
                            Reabrir caja
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={styles.pettyCashFundSummary}>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Saldo restante</div>
                        <strong style={remainingBalance < 0 ? { color: "#dc2626" } : undefined}>
                          {money(remainingBalance)}
                        </strong>
                      </div>
                      {(fundDebtAdjustments.get(fund.id)?.ajuste || 0) > 0 && (
                        <>
                          <div style={styles.pettyCashFundMetric}>
                            <div style={styles.label}>
                              Ajuste de deuda (repago a {fund.responsible || "responsable"})
                            </div>
                            <strong style={{ color: "#b7791f" }}>
                              - {money(fundDebtAdjustments.get(fund.id)?.ajuste || 0)}
                            </strong>
                          </div>
                          <div style={styles.pettyCashFundMetric}>
                            <div style={styles.label}>Saldo para gastar</div>
                            <strong>
                              {money(fundDebtAdjustments.get(fund.id)?.adjustedRemaining ?? remainingBalance)}
                            </strong>
                          </div>
                        </>
                      )}
                      {remainingBalance < 0 && (
                        <div style={styles.pettyCashFundMetric}>
                          <div style={styles.label}>
                            DEBE: la empresa a {fund.responsible || "responsable"}
                          </div>
                          <strong style={{ color: "#dc2626" }}>{money(Math.abs(remainingBalance))}</strong>
                        </div>
                      )}
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Comprado en blanco</div>
                        <strong>{money(whiteTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Comprado en negro</div>
                        <strong>{money(blackTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Rendido total</div>
                        <strong>{money(renderedTotal)}</strong>
                      </div>
                      <div style={styles.pettyCashFundMetric}>
                        <div style={styles.label}>Ultima recarga</div>
                        <strong>{fund.rechargeDate ? formatDateDisplay(fund.rechargeDate) : "-"}</strong>
                      </div>
                    </div>

                    <div style={styles.inlineForm}>
                      <Field label="Recargar fondo">
                        <input
                          style={styles.input}
                          type="number"
                          value={pettyCashRechargeDrafts[fund.id] || ""}
                          onChange={(e) =>
                            setPettyCashRechargeDrafts((prev) => ({
                              ...prev,
                              [fund.id]: e.target.value,
                            }))
                          }
                          placeholder="Importe de recarga"
                        />
                      </Field>
                      <Field label="Fecha de recarga">
                        <input
                          style={styles.input}
                          type="date"
                          value={pettyCashRechargeDateDrafts[fund.id] || fund.rechargeDate || todayIso()}
                          onChange={(e) =>
                            setPettyCashRechargeDateDrafts((prev) => ({
                              ...prev,
                              [fund.id]: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => rechargePettyCashFund(fund.id)}>
                          Recargar fondo
                        </button>
                      </div>
                    </div>

                    {expenses.filter((expense) => itemMonthKey(expense.date) === operationalMonth).length === 0 ? (
                      <div style={styles.empty}>No hay gastos cargados en {monthLabel(operationalMonth)} para esta caja chica (el saldo de arriba es acumulado de todos los meses).</div>
                    ) : (
                      expenses
                        .filter((expense) => itemMonthKey(expense.date) === operationalMonth)
                        .map((expense) => (
                        <details key={expense.id} style={styles.pettyCashInlineBubble}>
                          <summary style={styles.pettyCashExpenseSummary}>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              <strong>{expense.description || "Gasto sin descripcion"}</strong>
                            </span>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              {money(Number(expense.amount || 0))}
                            </span>
                            <span style={styles.pettyCashExpenseSummaryLine}>
                              {formatDateDisplay(expense.date)}
                            </span>
                          </summary>
                          <div style={styles.inlineActions}>
                            <span style={styles.muted}>
                              Fecha {formatDateDisplay(expense.date)} · {expense.administration === "blanco" ? "Compra en blanco" : "Compra en negro"}
                            </span>
                            <button style={styles.smallBtn} onClick={() => removePettyCashExpense(expense.id)}>
                              Quitar gasto
                            </button>
                          </div>
                          <div style={styles.grid2}>
                            <Field label="Descripcion">
                              <input
                                style={styles.input}
                                value={expense.description}
                                onChange={(e) => updatePettyCashExpense(expense.id, "description", e.target.value)}
                              />
                            </Field>
                            <Field label="Proveedor">
                              <input
                                style={styles.input}
                                value={expense.supplier}
                                onChange={(e) => updatePettyCashExpense(expense.id, "supplier", e.target.value)}
                              />
                            </Field>
                            <Field label="Monto">
                              <input
                                style={styles.input}
                                type="number"
                                value={expense.amount}
                                onChange={(e) => updatePettyCashExpense(expense.id, "amount", Number(e.target.value))}
                              />
                            </Field>
                            <Field label="Categoria">
                              <input
                                style={styles.input}
                                value={expense.category}
                                onChange={(e) => updatePettyCashExpense(expense.id, "category", e.target.value)}
                              />
                            </Field>
                            <Field label="Fecha">
                              <input
                                style={styles.input}
                                type="date"
                                value={expense.date}
                                onChange={(e) => updatePettyCashExpense(expense.id, "date", e.target.value)}
                              />
                            </Field>
                            <Field label="Factura / comprobante">
                              <input
                                style={styles.input}
                                value={expense.invoiceNumber}
                                onChange={(e) => updatePettyCashExpense(expense.id, "invoiceNumber", e.target.value)}
                                placeholder="Si hay factura, la compra pasa a blanco"
                              />
                            </Field>
                          </div>
                          <Field label="Notas">
                            <textarea
                              style={styles.textarea}
                              value={expense.notes}
                              onChange={(e) => updatePettyCashExpense(expense.id, "notes", e.target.value)}
                            />
                          </Field>
                          <div style={styles.uploadActions}>
                            <FileDropButton
                              label="Adjuntar factura o ticket"
                              fileName={expense.attachmentName}
                              onFileSelected={(file) => uploadPettyCashFile(expense.id, file)}
                            />
                          </div>
                          <div style={styles.noticeBox}>
                            Salida de dinero: siempre administracion negra. Compra: {expense.administration === "blanco" ? "blanca (hay factura/adjunto)." : "negra (sin factura)." }
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Seguimiento de gastos aplicados" span="wide">
            {pettyCashTrackingRows.length === 0 ? (
              <div style={styles.empty}>
                Todavia no hay gastos aplicados para seguir.
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Caja chica</th>
                    <th>Responsable asignado</th>
                    <th>Monto</th>
                    <th>Fecha de pago</th>
                    <th>Administracion</th>
                    <th>Descripcion</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pettyCashTrackingRows.map((row) => (
                    <tr key={`pc-track-${row.id}`}>
                      <td>{getCompanyMeta(row.company).short}</td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.fundId ?? ""}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "fundId", Number(e.target.value))
                          }
                        >
                          {visiblePettyCashFunds.map((fund) => (
                            <option key={fund.id} value={fund.id}>
                              {fund.description || "Caja sin descripcion"} · {getCompanyMeta(fund.company).short}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{row.responsible}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "amount", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="date"
                          value={row.date}
                          onChange={(e) => updatePettyCashExpense(row.id, "date", e.target.value)}
                        />
                      </td>
                      <td>{row.administration === "blanco" ? "Blanco" : "Negro"}</td>
                      <td>
                        <input
                          style={styles.input}
                          value={row.description}
                          onChange={(e) =>
                            updatePettyCashExpense(row.id, "description", e.target.value)
                          }
                          placeholder="Descripcion"
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removePettyCashExpense(row.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "presupuesto" && (
        <div style={styles.budgetLayout}>
          <div style={styles.budgetMainTop}>
            <Panel title="Datos del presupuesto">
              <TwoCol>
                <Field label="Empresa">
                  <select
                    style={{
                      ...styles.input,
                      borderColor: companyTheme.primary,
                      color: companyTheme.primary,
                      fontWeight: 700,
                    }}
                    value={budget.company}
                    disabled={!effectiveIsAdmin && allowedCompaniesForSession.length <= 1}
                    onChange={(e) => {
                      const company = e.target.value as CompanyName;
                      setBudget({ ...budget, company, cuit: getCompanyTaxId(company) });
                    }}
                  >
                    {COMPANY_OPTIONS.filter((option) => canAccessCompany(option.value)).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="CUIT empresa">
                  <input
                    style={styles.input}
                    value={budget.cuit}
                    readOnly
                  />
                </Field>
                <Field label="Numero">
                  <input
                    style={styles.input}
                    value={budget.number}
                    onChange={(e) => setBudget({ ...budget, number: e.target.value })}
                  />
                </Field>
                <Field label="Fecha">
                  <input
                    style={styles.input}
                    type="date"
                    value={budget.date}
                    onChange={(e) => setBudget({ ...budget, date: e.target.value })}
                  />
                </Field>
                <Field label="Fecha de entrega estimada">
                  <input style={styles.input} value={formatDateDisplay(budgetEstimatedDeliveryDate)} readOnly />
                </Field>
                <Field label="Cliente">
                  <input
                    style={styles.input}
                    value={budget.client}
                    onChange={(e) => setBudget({ ...budget, client: e.target.value })}
                  />
                </Field>
                <Field label="Contacto">
                  <input
                    style={styles.input}
                    value={budget.contactName}
                    onChange={(e) => setBudget({ ...budget, contactName: e.target.value })}
                  />
                </Field>
                <Field label="Telefono">
                  <input
                    style={styles.input}
                    value={budget.contactPhone}
                    onChange={(e) => setBudget({ ...budget, contactPhone: e.target.value })}
                  />
                </Field>
                <Field label="Email">
                  <input
                    style={styles.input}
                    value={budget.contactEmail}
                    onChange={(e) => setBudget({ ...budget, contactEmail: e.target.value })}
                  />
                </Field>
                <Field label="CUIT/CUIL cliente">
                  <input
                    style={styles.input}
                    value={budget.clientTaxId}
                    onChange={(e) => setBudget({ ...budget, clientTaxId: e.target.value })}
                  />
                </Field>
                <Field label="Proyecto">
                  <input
                    style={styles.input}
                    value={budget.project}
                    onChange={(e) => setBudget({ ...budget, project: e.target.value })}
                  />
                </Field>
                <Field label="Tipo de trabajo">
                  <select
                    style={styles.input}
                    value={budget.workType}
                    onChange={(e) => setBudget({ ...budget, workType: e.target.value as WorkTypeName })}
                  >
                    {WORK_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Forma de pago">
                  <input
                    style={styles.input}
                    value={budget.paymentTerms}
                    onChange={(e) => setBudget({ ...budget, paymentTerms: e.target.value })}
                  />
                </Field>
                <Field label="% facturado / blanco">
                  <input
                    style={styles.input}
                    type="number"
                    value={budget.billedPct}
                    onChange={(e) =>
                      setBudget({
                        ...budget,
                        billedPct: Math.max(0, Math.min(100, Number(e.target.value))),
                      })
                    }
                  />
                </Field>
                <Field label="Plazo">
                  <input
                    style={styles.input}
                    value={budget.deliveryTerm}
                    onChange={(e) => setBudget({ ...budget, deliveryTerm: e.target.value })}
                  />
                </Field>
                <Field label="Validez">
                  <input
                    style={styles.input}
                    value={budget.validity}
                    onChange={(e) => setBudget({ ...budget, validity: e.target.value })}
                  />
                </Field>
                <Field label="Destino entrega">
                  <input
                    style={styles.input}
                    value={budget.deliveryDestination}
                    onChange={(e) => setBudget({ ...budget, deliveryDestination: e.target.value })}
                  />
                </Field>
                <Field label="Encargado">
                  <input
                    style={styles.input}
                    value={budget.projectManager}
                    onChange={(e) => setBudget({ ...budget, projectManager: e.target.value })}
                  />
                </Field>
                <Field label="Fecha maxima requerimiento">
                  <input
                    style={styles.input}
                    type="date"
                    value={budget.maxRequirementDate}
                    onChange={(e) => setBudget({ ...budget, maxRequirementDate: e.target.value })}
                  />
                </Field>
              </TwoCol>

              <Field label="Datos bancarios empresa">
                <textarea
                  style={{ ...styles.textarea, minHeight: 96 }}
                  value={
                    getCompanyBankingLines(budget.company).join("\n") ||
                    "Sin datos bancarios cargados para esta empresa."
                  }
                  readOnly
                />
              </Field>

              <Field label="Descripcion">
                <textarea
                  style={styles.textarea}
                  value={budget.notes}
                  onChange={(e) => setBudget({ ...budget, notes: e.target.value })}
                />
              </Field>
              <Field label="Alcance">
                <textarea
                  style={styles.textarea}
                  value={budget.scope}
                  onChange={(e) => setBudget({ ...budget, scope: e.target.value })}
                />
              </Field>
              <Field label="Notas CRM del cliente">
                <textarea
                  style={styles.textarea}
                  value={budget.clientNotes}
                  onChange={(e) => setBudget({ ...budget, clientNotes: e.target.value })}
                />
              </Field>
            </Panel>

            {false && (
            <Panel title="Imagenes">
              <div style={styles.grid2}>
                <Field label="Logos">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(
                        files.map((file) => uploadBudgetImage(file, LOGO_IMAGE_OPTS))
                      );
                      setBudget((prev) => ({ ...prev, logos: [...prev.logos, ...images] }));
                    }}
                  />
                </Field>
                <Field label="Referencias">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(files.map((file) => uploadBudgetImage(file)));
                      setBudget((prev) => ({
                        ...prev,
                        referenceImages: [...prev.referenceImages, ...images],
                      }));
                    }}
                  />
                </Field>
              </div>
              {budget.referenceImages.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.referenceImages.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            referenceImages: prev.referenceImages.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {budget.logos.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.logos.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <div style={styles.muted}>
                        {index === 0 ? "Logo principal / marca de agua" : "Logo adicional"}
                      </div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            logos: prev.logos.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            )}

            <Panel title="CRM del cliente">
              {budget.client.trim() === "" ? (
                <div style={styles.empty}>Carga el nombre del cliente para ver si ya cotizo antes con ustedes.</div>
              ) : currentClientHistory.length === 0 ? (
                <div style={styles.empty}>No hay antecedentes para este cliente. Quedara como nuevo cliente en CRM.</div>
              ) : (
                <>
                  <div style={styles.metricGrid}>
                    <MiniMetric
                      label="Tipo de cliente"
                      value={currentClientHistory.length > 1 ? "Cliente habitual" : "Nuevo cliente"}
                    />
                    <MiniMetric label="Presupuestos previos" value={String(currentClientHistory.length)} />
                    <MiniMetric
                      label="Ultimo presupuesto"
                      value={getSavedBudgetDisplayLabel(currentClientHistory[0])}
                    />
                    <MiniMetric
                      label="Ultima fecha"
                      value={formatDateDisplay(currentClientHistory[0].date)}
                    />
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Presupuesto</th>
                        <th>Fecha</th>
                        <th>Proyecto</th>
                        <th>Estado</th>
                        <th>Compra</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClientHistory.slice(0, 5).map((item) => {
                        const wasBought = approvedJobs.some(
                          (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                        );
                        return (
                          <tr key={item.id}>
                            <td>{getSavedBudgetDisplayLabel(item)}</td>
                            <td>{formatDateDisplay(item.date)}</td>
                            <td>{item.project}</td>
                            <td>{item.status}</td>
                            <td>{wasBought ? "Compro" : "No compro"}</td>
                            <td>
                              <button
                                style={styles.smallBtn}
                                onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}
                              >
                                Cargar para editar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </Panel>

            {false && (
            <>
            <Panel
              title="Parametros economicos"
              actions={<ButtonLike onClick={restoreAllBudgetBlocksFromMarkers}>Restaurar todo desde marcadores</ButtonLike>}
            >
              <TwoCol>
                <Field label="Desvio %">
                  <input
                    style={styles.input}
                    type="number"
                    value={deviationPct}
                    onChange={(e) => setDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Markup %">
                  <input
                    style={styles.input}
                    type="number"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="IVA %">
                  <input
                    style={styles.input}
                    type="number"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Desvio mano de obra %">
                  <input
                    style={styles.input}
                    type="number"
                    value={laborDeviationPct}
                    onChange={(e) => setLaborDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Costo fijo">
                  <select
                    style={styles.input}
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}
                  >
                    <option value="auto">Automatico por ocupacion</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>
                {allocationMode === "manual" && (
                  <Field label="% costo fijo manual">
                    <input
                      style={styles.input}
                      type="number"
                      value={manualAllocationPct}
                      onChange={(e) => setManualAllocationPct(Number(e.target.value))}
                    />
                  </Field>
                )}
              </TwoCol>
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion real" value={pct(occupancyPct)} />
                <MiniMetric label="% imputado" value={pct(allocationPctUsed)} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Desvio" value={money(deviationAmount)} />
                <MiniMetric label="Resultado markup" value={money(markupAmount)} />
                <MiniMetric label="Costo fijo imputado" value={money(fixedCostsApplied)} />
              </div>
            </Panel>

            <Panel
              title="Comisiones y descuentos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={addBudgetIncrease} secondary>Agregar aumento</ButtonLike>
                  <ButtonLike onClick={addBudgetDiscount}>Agregar descuento</ButtonLike>
                </div>
              }
            >
              {editingBudgetId && (
                <div style={styles.noticeBox}>
                  Estás editando un presupuesto ya guardado. Al actualizarlo también se refresca el trabajo aprobado vinculado.
                </div>
              )}
              <TwoCol>
                <Field label="Comision % sobre neto">
                  <input
                    style={styles.input}
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Comision total presupuesto">
                  <input style={styles.input} value={money(consolidatedCommissionAmount)} readOnly />
                </Field>
              </TwoCol>
              {budgetIncreases.length === 0 ? (
                <div style={styles.empty}>No hay aumentos cargados para esta actualizacion.</div>
              ) : (
                <table style={{ ...styles.table, marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th>Descripcion interna</th>
                      <th>% aumento</th>
                      <th>Resultado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetIncreases.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.pct}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "pct", Number(e.target.value))
                            }
                          />
                        </td>
                        <td>{money(preDiscountNetPrice * (Number(item.pct || 0) / 100))}</td>
                        <td>
                          <button style={styles.smallBtn} onClick={() => removeBudgetIncrease(item.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {budgetDiscounts.length === 0 ? (
                <div style={styles.empty}>No hay descuentos cargados.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Descripcion visible</th>
                      <th>Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetDiscounts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(
                                setBudgetDiscounts,
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select
                              style={{ ...styles.input, maxWidth: 80 }}
                              value={item.mode || "monto"}
                              onChange={(e) =>
                                updateArrayItem(setBudgetDiscounts, item.id, "mode", e.target.value)
                              }
                            >
                              <option value="monto">$</option>
                              <option value="porcentaje">%</option>
                            </select>
                            {item.mode === "porcentaje" ? (
                              <input
                                style={styles.input}
                                type="number"
                                value={item.pct ?? 0}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "pct",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            ) : (
                              <input
                                style={styles.input}
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "amount",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => removeBudgetDiscount(item.id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={styles.metricGrid}>
                <MiniMetric label="Neto base bloque" value={money(preDiscountNetPrice)} />
                <MiniMetric label="Aumentos internos" value={money(totalIncreaseAmount)} />
                <MiniMetric label="Descuentos bloque" value={money(totalDiscountAmount)} />
                <MiniMetric label="Neto total" value={money(consolidatedBudgetTotals.netPrice)} />
                <MiniMetric label="Comision total" value={money(consolidatedCommissionAmount)} />
                <MiniMetric label="% blanco" value={pct(billedPctNormalized)} />
                <MiniMetric label="Circuito blanco" value={money(budgetWhiteTotal)} />
                <MiniMetric label="Circuito negro" value={money(budgetBlackTotal)} />
              </div>
            </Panel>
            </>)}
          </div>

          <div style={styles.budgetMainBottom}>
            <Panel title="Materiales" actions={<ButtonLike onClick={addMaterial}>Agregar</ButtonLike>}>
              <datalist id="materials-stock-options">
                {stockSearchOptions.flatMap((stockItem) => [
                  <option
                    key={`${stockItem.id}-combo`}
                    value={`${stockItem.code} - ${stockItem.description}`}
                  />,
                  <option key={`${stockItem.id}-code`} value={stockItem.code} />,
                  <option key={`${stockItem.id}-desc`} value={stockItem.description} />,
                ])}
              </datalist>
              <datalist id="stock-general-group-options">
                {STOCK_GENERAL_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Descripcion</th>
                    <th>Grupo</th>
                    <th>Stock</th>
                    <th>Ubicacion</th>
                    <th>Cant.</th>
                    <th>Unidad</th>
                    <th>$ Unit.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMaterials.map((item) => {
                    const stockMatch =
                      (item.stockCode ? stockByCode.get(item.stockCode.trim().toLowerCase()) : null) ||
                      stockByDescription.get(item.description.trim().toLowerCase());
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={styles.inlineActions}>
                            <button style={styles.smallBtn} onClick={() => moveMaterial(item.id, -1)}>
                              ↑
                            </button>
                            <button style={styles.smallBtn} onClick={() => moveMaterial(item.id, 1)}>
                              ↓
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="materials-stock-options"
                            value={item.description}
                            onChange={(e) => applyStockSuggestionToMaterial(item.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            list="stock-general-group-options"
                            value={item.stockGroup || stockMatch?.group || ""}
                            onChange={(e) =>
                              updateArrayItem(setMaterials, item.id, "stockGroup", e.target.value)
                            }
                            placeholder="Grupo"
                          />
                        </td>
                        <td>{stockMatch ? `${stockMatch.quantity} ${stockMatch.unit}` : "-"}</td>
                        <td>{stockMatch?.location || item.stockLocation || "-"}</td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "qty", Number(e.target.value))}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            value={item.unit}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "unit", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateArrayItem(setMaterials, item.id, "unitPrice", Number(e.target.value))}
                          />
                        </td>
                        <td>{money(item.qty * item.unitPrice)}</td>
                        <td>
                          <div style={styles.inlineActions}>
                            {!stockMatch && item.description.trim() && (
                              <button
                                style={styles.smallBtn}
                                onClick={() => addMaterialToStock(item.id)}
                              >
                                Agregar a stock
                              </button>
                            )}
                            <button style={styles.smallBtn} onClick={() => removeMaterial(item.id)}>
                              Quitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={styles.rightStrong}>Total materiales: {money(totalMaterials)}</div>
            </Panel>

            <Panel
              title="Insumos y fletes"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreBasicSuppliesFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Descripcion</th>
                    <th>Cant.</th>
                    <th>Unidad</th>
                    <th>$ Unit.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {basicSupplies.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "description", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "qty", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.unit}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "unit", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateArrayItem(setBasicSupplies, item.id, "unitPrice", Number(e.target.value))
                          }
                        />
                      </td>
                      <td>{money(item.qty * item.unitPrice)}</td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeBasicSupply(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={styles.rightStrong}>Total insumos y fletes: {money(totalBasicSupplies)}</div>
            </Panel>

            <Panel
              title="Mano de obra"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreLaborFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Categoria</th>
                    <th>Empleados</th>
                    <th>Hs base c/u</th>
                    <th>Hs capacidad</th>
                    <th>$ Hora base</th>
                    <th>Desvio %</th>
                    <th>$ Hora final</th>
                    <th>Hs trabajo</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {laborRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.category}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "category", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.employees}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "employees", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={nominalLaborHoursPerEmployee}
                          readOnly
                        />
                      </td>
                      <td>{Number(item.totalMonthlyHours.toFixed(2))}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.hourlyRate}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "hourlyRate", Number(e.target.value))}
                        />
                      </td>
                      <td>{pct(laborDeviationPct)}</td>
                      <td>{money(item.adjustedHourlyRate)}</td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.jobHours}
                          onChange={(e) => updateArrayItem(setLabor, item.id, "jobHours", Number(e.target.value))}
                        />
                      </td>
                      <td>{money(item.subtotal)}</td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeLabor(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={styles.metricGrid}>
                <MiniMetric label="Horas disponibles" value={String(Number(totalAvailableHours.toFixed(2)))} />
                <MiniMetric label="Horas trabajo" value={String(Number(totalJobHours.toFixed(2)))} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Total mano de obra" value={money(totalLabor)} />
              </div>
            </Panel>

            <Panel title="Personal de referencia para presupuestar">
              {employeesSortedByPay.length === 0 ? (
                <div style={styles.empty}>Todavia no hay empleados cargados.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Nombre</th>
                      <th>Categoria</th>
                      <th>Antig.</th>
                      <th>Costo hora</th>
                      <th>Impacto empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesSortedByPay.map((employee) => {
                      const meta = getCompanyMeta(employee.company);
                      const summary = getEmployeePayrollSummary(employee);
                      return (
                        <tr key={`budget-employee-${employee.id}`} style={{ background: `${meta.soft}44` }}>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                background: meta.soft,
                                color: meta.primary,
                              }}
                            >
                              {meta.short}
                            </span>
                          </td>
                          <td>{employee.name}</td>
                          <td>{employee.category}</td>
                          <td>{employee.seniorityYears}</td>
                          <td>{money(summary.hourlyCost)}</td>
                          <td>{money(summary.employerImpact)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              title="Costos fijos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={restoreFixedCostsFromMarkers} secondary>Restaurar</ButtonLike>
                </div>
              }
            >
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Descripcion</th>
                    <th>Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {fixedCosts.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.sourceCompany ? (
                          <span style={{ ...styles.companyRibbonMini, background: getCompanyMeta(item.sourceCompany).soft, color: getCompanyMeta(item.sourceCompany).primary }}>
                            {getCompanyMeta(item.sourceCompany).short}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setFixedCosts, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateArrayItem(setFixedCosts, item.id, "amount", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removeFixedCost(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={styles.rightStrong}>Total costos fijos: {money(totalFixedCosts)}</div>
            </Panel>
          </div>

          <div style={styles.budgetAside}>
            <Panel
              title="Subpresupuestos dentro de esta cotizacion"
              actions={
                <ButtonLike onClick={saveCurrentAsSubBudget}>
                  Guardar bloque actual
                </ButtonLike>
              }
            >
              <Field label="Titulo del subpresupuesto">
                <input
                  style={styles.input}
                  value={subBudgetTitle}
                  onChange={(e) => setSubBudgetTitle(e.target.value)}
                  placeholder="Ej. Cocina, vestidor, oficina"
                />
              </Field>
              <Field label="Notas del bloque">
                <textarea
                  style={styles.textarea}
                  value={subBudgetNotes}
                  onChange={(e) => setSubBudgetNotes(e.target.value)}
                  placeholder="Observaciones internas o alcance de este bloque"
                />
              </Field>

              <div style={styles.metricGrid}>
                <MiniMetric label="Subpresupuestos guardados" value={String(subBudgets.length)} />
                <MiniMetric
                  label="Bloques totales"
                  value={String(workingBudgetSections.length)}
                />
                <MiniMetric
                  label="Neto bloque actual"
                  value={money(currentWorkingSectionTotals.netPrice)}
                />
                <MiniMetric
                  label="Neto presupuesto total"
                  value={money(consolidatedBudgetTotals.netPrice)}
                />
              </div>

              {subBudgets.length === 0 ? (
                <div style={styles.empty}>
                  Todavia no guardaste subpresupuestos parciales. Cuando cierres un bloque,
                  guárdalo y luego sigue cargando el siguiente.
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {subBudgets.map((item, index) => (
                    <div key={item.id} style={styles.subCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          <strong>{item.title || `Subpresupuesto ${index + 1}`}</strong>
                          <div style={styles.muted}>
                            Guardado: {formatDateDisplay(item.savedAt.slice(0, 10))}
                          </div>
                        </div>
                        <div style={styles.inlineActions}>
                          <button
                            style={styles.smallBtn}
                            onClick={() => loadSubBudgetIntoEditor(item.id)}
                          >
                            Editar bloque
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => removeSubBudget(item.id)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                      {item.notes && <div style={{ marginTop: 8 }}>{item.notes}</div>}
                      <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                        <MiniMetric label="Materiales" value={money(item.totals.totalMaterials)} />
                        <MiniMetric
                          label="Insumos y fletes"
                          value={money(item.totals.totalBasicSupplies)}
                        />
                        <MiniMetric label="Mano de obra" value={money(item.totals.totalLabor)} />
                        <MiniMetric label="Valor neto" value={money(item.totals.netPrice)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Parametros economicos"
              actions={<ButtonLike onClick={restoreAllBudgetBlocksFromMarkers}>Restaurar todo desde marcadores</ButtonLike>}
            >
              <TwoCol>
                <Field label="Desvio %">
                  <input
                    style={styles.input}
                    type="number"
                    value={deviationPct}
                    onChange={(e) => setDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Markup %">
                  <input
                    style={styles.input}
                    type="number"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="IVA %">
                  <input
                    style={styles.input}
                    type="number"
                    value={vatPct}
                    onChange={(e) => setVatPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Desvio mano de obra %">
                  <input
                    style={styles.input}
                    type="number"
                    value={laborDeviationPct}
                    onChange={(e) => setLaborDeviationPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Costo fijo">
                  <select
                    style={styles.input}
                    value={allocationMode}
                    onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}
                  >
                    <option value="auto">Automatico por ocupacion</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>
                {allocationMode === "manual" && (
                  <Field label="% costo fijo manual">
                    <input
                      style={styles.input}
                      type="number"
                      value={manualAllocationPct}
                      onChange={(e) => setManualAllocationPct(Number(e.target.value))}
                    />
                  </Field>
                )}
              </TwoCol>
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion real" value={pct(occupancyPct)} />
                <MiniMetric label="% imputado" value={pct(allocationPctUsed)} />
                <MiniMetric label="Desvio MO" value={money(totalLaborDeviationAmount)} />
                <MiniMetric label="Desvio" value={money(deviationAmount)} />
                <MiniMetric label="Resultado markup" value={money(markupAmount)} />
                <MiniMetric label="Costo fijo imputado" value={money(fixedCostsApplied)} />
              </div>
            </Panel>

            <Panel
              title="Comisiones y descuentos"
              actions={
                <div style={styles.inlineActions}>
                  <ButtonLike onClick={addBudgetIncrease} secondary>Agregar aumento</ButtonLike>
                  <ButtonLike onClick={addBudgetDiscount}>Agregar descuento</ButtonLike>
                </div>
              }
            >
              {editingBudgetId && (
                <div style={styles.noticeBox}>
                  Estás editando un presupuesto ya guardado. Al actualizarlo también se refresca el trabajo aprobado vinculado.
                </div>
              )}
              <TwoCol>
                <Field label="Comision % sobre neto">
                  <input
                    style={styles.input}
                    type="number"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Number(e.target.value))}
                  />
                </Field>
                <Field label="Comision total presupuesto">
                  <input style={styles.input} value={money(consolidatedCommissionAmount)} readOnly />
                </Field>
              </TwoCol>
              {budgetIncreases.length === 0 ? (
                <div style={styles.empty}>No hay aumentos cargados para esta actualizacion.</div>
              ) : (
                <table style={{ ...styles.table, marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th>Descripcion interna</th>
                      <th>% aumento</th>
                      <th>Resultado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetIncreases.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            style={styles.input}
                            type="number"
                            value={item.pct}
                            onChange={(e) =>
                              updateArrayItem(setBudgetIncreases, item.id, "pct", Number(e.target.value))
                            }
                          />
                        </td>
                        <td>{money(preDiscountNetPrice * (Number(item.pct || 0) / 100))}</td>
                        <td>
                          <button style={styles.smallBtn} onClick={() => removeBudgetIncrease(item.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {budgetDiscounts.length === 0 ? (
                <div style={styles.empty}>No hay descuentos cargados.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Descripcion visible</th>
                      <th>Monto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetDiscounts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) =>
                              updateArrayItem(
                                setBudgetDiscounts,
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select
                              style={{ ...styles.input, maxWidth: 80 }}
                              value={item.mode || "monto"}
                              onChange={(e) =>
                                updateArrayItem(setBudgetDiscounts, item.id, "mode", e.target.value)
                              }
                            >
                              <option value="monto">$</option>
                              <option value="porcentaje">%</option>
                            </select>
                            {item.mode === "porcentaje" ? (
                              <input
                                style={styles.input}
                                type="number"
                                value={item.pct ?? 0}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "pct",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            ) : (
                              <input
                                style={styles.input}
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  updateArrayItem(
                                    setBudgetDiscounts,
                                    item.id,
                                    "amount",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => removeBudgetDiscount(item.id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={styles.metricGrid}>
                <MiniMetric label="Neto base bloque" value={money(preDiscountNetPrice)} />
                <MiniMetric label="Aumentos internos" value={money(totalIncreaseAmount)} />
                <MiniMetric label="Descuentos bloque" value={money(totalDiscountAmount)} />
                <MiniMetric label="Neto total" value={money(consolidatedBudgetTotals.netPrice)} />
                <MiniMetric label="Comision total" value={money(consolidatedCommissionAmount)} />
                <MiniMetric label="% blanco" value={pct(billedPctNormalized)} />
                <MiniMetric label="Circuito blanco" value={money(budgetWhiteTotal)} />
                <MiniMetric label="Circuito negro" value={money(budgetBlackTotal)} />
              </div>
            </Panel>

            <Panel title="Resumen economico">
              <div style={styles.previewBlock}>
                <strong>Bloque en edicion</strong>
                <SummaryRow label="Valor neto bloque" value={money(currentWorkingSectionTotals.netPrice)} />
                <SummaryRow label="Final bloque c/IVA" value={money(currentWorkingSectionTotals.finalPrice)} />
              </div>
              <SummaryRow label="Materiales" value={money(consolidatedBudgetTotals.totalMaterials)} />
              <SummaryRow label="Insumos y fletes" value={money(consolidatedBudgetTotals.totalBasicSupplies)} />
              <SummaryRow label="Mano de obra" value={money(consolidatedBudgetTotals.totalLabor)} />
              <SummaryRow label="Desvio mano de obra incl." value={money(consolidatedBudgetTotals.laborDeviationAmount)} />
              <SummaryRow label="Costos fijos imputados" value={money(consolidatedBudgetTotals.fixedCostsApplied)} />
              <SummaryRow label="Desvio" value={money(consolidatedBudgetTotals.deviationAmount)} />
              <SummaryRow label="Costo total" value={money(consolidatedBudgetTotals.totalCost)} strong />
              <SummaryRow label="Neto antes descuento" value={money(consolidatedBudgetTotals.preDiscountNetPrice)} />
              <SummaryRow label="Aumentos internos" value={money(consolidatedBudgetTotals.totalIncreaseAmount)} />
              <SummaryRow label="Descuentos" value={money(consolidatedBudgetTotals.totalDiscountAmount)} />
              <SummaryRow label="Valor neto" value={money(consolidatedBudgetTotals.netPrice)} strong />
              <SummaryRow label="% a facturar" value={pct(billedPctNormalized)} />
              <SummaryRow label="Administracion blanco" value={money(budgetWhiteTotal)} />
              <SummaryRow label="Administracion negro" value={money(budgetBlackTotal)} />
              <SummaryRow label="Comision pendiente" value={money(consolidatedCommissionAmount)} />
              <SummaryRow label="Final c/IVA" value={money(consolidatedBudgetTotals.finalPrice)} strong />
              <div style={styles.metricGrid}>
                <MiniMetric label="% ocupacion" value={pct(consolidatedBudgetTotals.occupancyPct)} />
                <MiniMetric label="Horas trabajo" value={String(Number(consolidatedBudgetTotals.totalJobHours.toFixed(2)))} />
                <MiniMetric label="Horas disponibles" value={String(Number(consolidatedBudgetTotals.totalAvailableHours.toFixed(2)))} />
                <MiniMetric label="Entrega" value={formatDateDisplay(budgetEstimatedDeliveryDate)} />
              </div>
            </Panel>

            <Panel title="Imagenes">
              <div style={styles.grid2}>
                <Field label="Logos">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(
                        files.map((file) => uploadBudgetImage(file, LOGO_IMAGE_OPTS))
                      );
                      setBudget((prev) => ({ ...prev, logos: [...prev.logos, ...images] }));
                    }}
                  />
                </Field>
                <Field label="Referencias">
                  <input
                    style={styles.input}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const images = await Promise.all(files.map((file) => uploadBudgetImage(file)));
                      setBudget((prev) => ({
                        ...prev,
                        referenceImages: [...prev.referenceImages, ...images],
                      }));
                    }}
                  />
                </Field>
              </div>
              {budget.referenceImages.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.referenceImages.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            referenceImages: prev.referenceImages.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {budget.logos.length > 0 && (
                <div style={styles.referenceGrid}>
                  {budget.logos.map((image, index) => (
                    <div key={`${image.name}-${index}`} style={styles.referenceCard}>
                      <img
                        src={image.preview}
                        alt={image.name}
                        style={styles.referenceThumb}
                      />
                      <div style={styles.fileName}>{image.name}</div>
                      <div style={styles.muted}>
                        {index === 0 ? "Logo principal / marca de agua" : "Logo adicional"}
                      </div>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setBudget((prev) => ({
                            ...prev,
                            logos: prev.logos.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Vista previa"
              actions={<ButtonLike onClick={() => exportPrint("client-budget")}>Exportar PDF cliente</ButtonLike>}
            >
              <div style={styles.previewCard}>
                <div style={styles.previewHeader}>
                  <div>
                    {budget.logos.length > 0 && (
                      <div style={styles.previewLogoRow}>
                        {budget.logos.map((image, index) => (
                          <img
                            key={`${image.name}-${index}`}
                            src={image.preview}
                            alt={image.name}
                            style={styles.previewLogo}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ ...styles.companyRibbon, background: companyTheme.soft, color: companyTheme.primary }}>
                      {companyTheme.short}
                    </div>
                    {budget.isUpdate && (
                      <div style={{ ...styles.statusPill, ...styles.statusBlue, marginTop: 8 }}>
                        {budget.updateLabel || "Actualizacion"}
                      </div>
                    )}
                    <h2 style={{ margin: "8px 0 0 0" }}>{budget.project}</h2>
                    <div>{budget.client}</div>
                  </div>
                  <div style={styles.previewMeta}>
                    <div><strong>N°:</strong> {budget.number}</div>
                    <div><strong>Fecha:</strong> {formatDateDisplay(budget.date)}</div>
                    <div><strong>Entrega:</strong> {formatDateDisplay(budgetEstimatedDeliveryDate)}</div>
                  </div>
                </div>
                {workingBudgetSections.map((section, index) => (
                  <div key={section.id} style={styles.previewBlock}>
                    <strong>{section.title || `Subpresupuesto ${index + 1}`}</strong>
                    {section.notes && <div style={{ marginTop: 6, marginBottom: 8 }}>{section.notes}</div>}
                    <div style={{ ...styles.metricGrid, marginBottom: 10 }}>
                      <MiniMetric label="Materiales" value={money(section.totals.totalMaterials)} />
                      <MiniMetric label="Insumos" value={money(section.totals.totalBasicSupplies)} />
                      <MiniMetric label="Mano de obra" value={money(section.totals.totalLabor)} />
                      <MiniMetric label="Valor neto" value={money(section.totals.netPrice)} />
                    </div>
                    <div style={styles.materialColumns}>
                      {section.materials.length === 0 ? (
                        <div style={styles.muted}>Sin materiales cargados en este bloque.</div>
                      ) : (
                        section.materials.map((item) => (
                          <div key={item.id} style={styles.materialColumnItem}>
                            {item.description}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                {budget.referenceImages.length > 0 && (
                  <div style={styles.previewBlock}>
                    <strong>Referencias visuales</strong>
                    <div style={styles.referenceGrid}>
                      {budget.referenceImages.map((image, index) => (
                        <img
                          key={`${image.name}-${index}`}
                          src={image.preview}
                          alt={image.name}
                          style={styles.previewImage}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div style={styles.previewBlock}>
                  {consolidatedBudgetTotals.totalDiscountAmount > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <strong>Descuento aplicado:</strong> {money(consolidatedBudgetTotals.totalDiscountAmount)}
                    </div>
                  )}
                  <div style={{ marginBottom: 6 }}>
                    <strong>Valor neto total:</strong> {money(consolidatedBudgetTotals.netPrice)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>% facturado / blanco:</strong> {pct(billedPctNormalized)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Administracion blanco:</strong> {money(budgetWhiteTotal)}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <strong>Administracion negro:</strong> {money(budgetBlackTotal)}
                  </div>
                  <strong>Total final con IVA:</strong> {money(consolidatedBudgetTotals.finalPrice)}
                </div>
              </div>
            </Panel>
          </div>

          <div style={styles.budgetHistorySection}>
            {renderBudgetHistoryBlock()}
          </div>
        </div>
      )}

      {activeTab === "marcadores" && (
        <div style={styles.column}>
          <Panel span="wide" title="Parametros economicos (fuente de verdad)">
            <div style={styles.noticeBox}>
              Estos valores se aplican a los presupuestos y se toman de aca al armar uno nuevo. Editalos
              una vez y quedan fijos para todos los presupuestos siguientes.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Field label="Markup / ganancia (%)">
                <input style={styles.input} type="number" value={markupPct}
                  onChange={(e) => setMarkupPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio de costos (%)">
                <input style={styles.input} type="number" value={deviationPct}
                  onChange={(e) => setDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="Desvio mano de obra (%)">
                <input style={styles.input} type="number" value={laborDeviationPct}
                  onChange={(e) => setLaborDeviationPct(Number(e.target.value))} />
              </Field>
              <Field label="IVA (%)">
                <input style={styles.input} type="number" value={vatPct}
                  onChange={(e) => setVatPct(Number(e.target.value))} />
              </Field>
              <Field label="Comision (%)">
                <input style={styles.input} type="number" value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))} />
              </Field>
              <Field label="Aumento de stock (%)">
                <input style={styles.input} type="number" value={stockIncreasePct}
                  onChange={(e) => setStockIncreasePct(Number(e.target.value))} />
              </Field>
              <Field label="Asignacion de costos fijos">
                <select style={styles.input} value={allocationMode}
                  onChange={(e) => setAllocationMode(e.target.value as "auto" | "manual")}>
                  <option value="auto">Automatica</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              {allocationMode === "manual" && (
                <Field label="Asignacion manual (%)">
                  <input style={styles.input} type="number" value={manualAllocationPct}
                    onChange={(e) => setManualAllocationPct(Number(e.target.value))} />
                </Field>
              )}
            </div>
          </Panel>
          <Panel
            title="Marcadores base por empresa y tipo de trabajo"
            span="wide"
            actions={<ButtonLike onClick={applyMarkersToBudget}>Aplicar al presupuesto actual</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric
                label="Costos fijos activos"
                value={money(
                  activeFixedMarkersForBudget.reduce((acc, item) => acc + Number(item.amount || 0), 0)
                )}
              />
              <MiniMetric
                label="Insumos y fletes activos"
                value={money(
                  activeSupplyMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0),
                    0
                  )
                )}
              />
              <MiniMetric
                label="Mano de obra base"
                value={money(
                  activeLaborMarkersForBudget.reduce(
                    (acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0),
                    0
                  )
                )}
              />
              <MiniMetric label="Provision personal mensual" value={money(activePersonalProvisionMonthlyTotal)} />
              <MiniMetric label="Tipo de trabajo" value={budget.workType} />
              <MiniMetric
                label="Empresas activas"
                value={Array.from(new Set([...activeFixedMarkersForBudget, ...activeSupplyMarkersForBudget, ...activeLaborMarkersForBudget].map((item) => getCompanyMeta(item.company).short))).join(", ") || "-"}
              />
            </div>
          </Panel>

          <Panel title="Costos fijos por grupo" span="wide" actions={<ButtonLike onClick={addFixedMarker}>Agregar marcador</ButtonLike>}>
            <div style={styles.metricGrid}>
              {fixedMarkersByGroup.map((row) => (
                <MiniMetric key={row.group} label={row.group} value={money(row.total)} />
              ))}
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Grupo</th>
                  <th>Concepto</th>
                  <th>Monto mensual</th>
                  <th>Observacion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fixedMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setFixedMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setFixedMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.group}
                        onChange={(e) => {
                          if (e.target.value === "__add_group__") {
                            const createdGroup = promptAndCreateCostAnalysisGroup("General");
                            if (createdGroup) {
                              updateArrayItem(
                                setFixedMarkers,
                                item.id,
                                "group",
                                createdGroup.name as MarkerFixedGroup
                              );
                            }
                            return;
                          }
                          updateArrayItem(
                            setFixedMarkers,
                            item.id,
                            "group",
                            e.target.value as MarkerFixedGroup
                          );
                        }}
                      >
                        {fixedMarkerGroupOptions.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                        <option value="__add_group__">+ Agregar grupo...</option>
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "amount", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.notes}
                        onChange={(e) => updateArrayItem(setFixedMarkers, item.id, "notes", e.target.value)}
                      />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeFixedMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </Panel>

          <Panel title="Insumos y fletes base" span="wide" actions={<ButtonLike onClick={addSupplyMarker}>Agregar marcador</ButtonLike>}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Subtipo</th>
                  <th>Descripcion</th>
                  <th>Cant.</th>
                  <th>Unidad</th>
                  <th>$ Unit.</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {supplyMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setSupplyMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setSupplyMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.subtype}
                        onChange={(e) =>
                          updateArrayItem(
                            setSupplyMarkers,
                            item.id,
                            "subtype",
                            e.target.value as SupplyMarkerSubtype
                          )
                        }
                      >
                        {["Insumos basicos", "Flete", "Entrega", "Embalaje", "Viaticos"].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "qty", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.unit}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "unit", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateArrayItem(setSupplyMarkers, item.id, "unitPrice", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.qty * item.unitPrice)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeSupplyMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total marcadores de insumos y fletes:{" "}
              {money(
                supplyMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0), 0)
              )}
            </div>
          </Panel>

          <Panel
            span="wide"
            title="Mano de obra base"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={syncLaborMarkersFromPersonal} secondary>
                  Tomar costo hora desde personal
                </ButtonLike>
                <ButtonLike onClick={addLaborMarker}>Agregar marcador</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Tipo trabajo</th>
                  <th>Categoria</th>
                  <th>Empleados</th>
                  <th>Hs/mes c/u</th>
                  <th>$ Hora</th>
                  <th>Hs base</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {laborMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                  <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                      <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                        {markerCompany.short}
                      </div>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.workType}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "workType", e.target.value as WorkTypeName)
                        }
                      >
                        {WORK_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.category}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "category", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.employees}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "employees", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.monthlyHoursPerEmployee}
                        onChange={(e) =>
                          updateArrayItem(setLaborMarkers, item.id, "monthlyHoursPerEmployee", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.hourlyRate}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hourlyRate", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.hoursBase}
                        onChange={(e) => updateArrayItem(setLaborMarkers, item.id, "hoursBase", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.hoursBase * item.hourlyRate)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeLaborMarker(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total marcadores de mano de obra:{" "}
              {money(
                laborMarkers
                  .filter((item) => item.active)
                  .reduce((acc, item) => acc + Number(item.hoursBase || 0) * Number(item.hourlyRate || 0), 0)
              )}
            </div>
          </Panel>

          <Panel
            span="wide"
            title="Informacion de personal: EPP e insumos"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={restorePersonalProvisionMarkersFromStock} secondary>
                  Restaurar basicos desde stock
                </ButtonLike>
                <ButtonLike onClick={addPersonalProvisionMarker}>Agregar item</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Compartido</th>
                  <th>Tipo</th>
                  <th>Descripcion</th>
                  <th>Costo por entrega</th>
                  <th>Periodicidad (meses)</th>
                  <th>Costo mensual</th>
                  <th>Observacion</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {personalProvisionMarkers.map((item) => {
                  const markerCompany = getCompanyMeta(item.company);
                  return (
                    <tr key={item.id} style={{ background: `${markerCompany.soft}55` }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "active", e.target.checked)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.company}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "company", e.target.value as CompanyName)}
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.short}
                            </option>
                          ))}
                        </select>
                        <div style={{ ...styles.companyRibbonMini, background: markerCompany.soft, color: markerCompany.primary }}>
                          {markerCompany.short}
                        </div>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.shared}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "shared", e.target.checked)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={item.kind}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "kind", e.target.value as PersonalProvisionKind)}
                        >
                          <option value="EPP">EPP</option>
                          <option value="Insumos">Insumos</option>
                        </select>
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.description}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "description", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          value={item.amountPerDelivery}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "amountPerDelivery", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          type="number"
                          min={1}
                          value={item.periodicityMonths}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "periodicityMonths", Number(e.target.value))}
                        />
                      </td>
                      <td>{money(Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1))}</td>
                      <td>
                        <input
                          style={styles.input}
                          value={item.notes}
                          onChange={(e) => updateArrayItem(setPersonalProvisionMarkers, item.id, "notes", e.target.value)}
                        />
                      </td>
                      <td>
                        <button style={styles.smallBtn} onClick={() => removePersonalProvisionMarker(item.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={styles.rightStrong}>
              Total provision mensual de personal:{" "}
              {money(
                personalProvisionMarkers
                  .filter((item) => item.active)
                  .reduce(
                    (acc, item) =>
                      acc + Number(item.amountPerDelivery || 0) / Math.max(Number(item.periodicityMonths || 1), 1),
                    0
                  )
              )}
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "historial" && (
        <div style={styles.column}>
          <Panel
            title="Resumen comercial"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={restoreCrmAndBudgetsFromSupabase} secondary>
                  Restaurar CRM Supabase
                </ButtonLike>
                <ButtonLike onClick={saveCrmAndBudgetsToSupabase}>
                  Guardar CRM y presupuestos
                </ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Presupuestos realizados" value={String(exportedBudgetsCount)} />
              <MiniMetric label="Presupuestos faltantes" value={String(pendingExportBudgetsCount)} />
              <MiniMetric label="Clientes en CRM" value={String(crmClientRows.length)} />
              <MiniMetric label="Presupuestos guardados" value={String(visibleSavedBudgets.length)} />
            </div>
          </Panel>

          <Panel span="wide" title="Semaforo de clientes">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Datos completos", value: String(crmSemaphoreSummary.verde) },
                { level: "amarillo", label: "Datos incompletos", value: String(crmSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Sin CUIT ni contacto", value: String(crmSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="CRM de clientes" span="wide" actions={<ButtonLike onClick={() => exportPrint("report-crm")} secondary>Reporte</ButtonLike>}>
            {crmClientRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay clientes en CRM porque no hay presupuestos guardados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Contacto</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th>CUIT/CUIL</th>
                    <th>Presupuestos</th>
                    <th>Pend. exportar</th>
                    <th>Compro</th>
                    <th>Gasto acumulado</th>
                    <th>Ultimo enviado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {crmClientRows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {(() => {
                          const sc = getClientSemaphore(row);
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={sc.level} size={10} title={sc.label} />
                              <span>{row.client}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.customerType === "Cliente habitual"
                              ? styles.statusYellow
                              : styles.statusBlue),
                          }}
                        >
                          {row.customerType}
                        </span>
                      </td>
                      <td>{row.contactName || "-"}</td>
                      <td>{row.contactPhone || "-"}</td>
                      <td>{row.contactEmail || "-"}</td>
                      <td>{row.clientTaxId || "-"}</td>
                      <td>{row.quotes.length}</td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(!row.latestQuote?.exportedAt
                              ? styles.statusRed
                              : styles.statusGreen),
                          }}
                        >
                          {!row.latestQuote?.exportedAt ? "Pendiente" : "Entregado"}
                        </span>
                      </td>
                      <td>{row.bought ? "Si" : "No"}</td>
                      <td>{money(row.totalSpent)}</td>
                      <td>{row.latestQuote ? getSavedBudgetDisplayLabel(row.latestQuote) : "-"}</td>
                      <td>
                        {selectedCrmClientKey === row.key ? (
                          <button style={styles.smallBtn} onClick={() => setSelectedCrmClientKey(null)}>
                            Cerrar
                          </button>
                        ) : (
                          <button style={styles.smallBtn} onClick={() => setSelectedCrmClientKey(row.key)}>
                            Abrir CRM
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          {selectedCrmClient && (
            <Panel
              span="half"
              title={`CRM ${selectedCrmClient.client}`}
              actions={<ButtonLike onClick={() => setSelectedCrmClientKey(null)} secondary>Cerrar CRM</ButtonLike>}
            >
              <div style={styles.metricGrid}>
                <MiniMetric label="Tipo" value={selectedCrmClient.customerType} />
                <MiniMetric label="Presupuestos" value={String(selectedCrmClient.quotes.length)} />
                <MiniMetric label="Compro" value={selectedCrmClient.bought ? "Si" : "No"} />
                <MiniMetric label="Gasto acumulado" value={money(selectedCrmClient.totalSpent)} />
              </div>
              <div style={styles.grid2}>
                <Panel title="Contacto" nested>
                  <div><strong>Persona:</strong> {selectedCrmClient.contactName || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Telefono:</strong> {selectedCrmClient.contactPhone || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Email:</strong> {selectedCrmClient.contactEmail || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>CUIT/CUIL:</strong> {selectedCrmClient.clientTaxId || "-"}</div>
                  <div style={{ marginTop: 8 }}><strong>Notas:</strong> {selectedCrmClient.clientNotes || "-"}</div>
                </Panel>
                <Panel title="Empresas vinculadas" nested>
                  <div>{selectedCrmClient.companyLabels.join(", ") || "-"}</div>
                </Panel>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Presupuesto</th>
                    <th>Fecha</th>
                    <th>Proyecto</th>
                    <th>Estado</th>
                    <th>Compra</th>
                    <th>Exportado</th>
                    <th>Neto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCrmClient.quotes.map((item) => {
                    const wasBought = approvedJobs.some(
                      (job) => job.rootBudgetId === item.rootBudgetId || job.budgetId === item.id
                    );
                    return (
                      <tr key={item.id}>
                        <td>{getSavedBudgetDisplayLabel(item)}</td>
                        <td>{formatDateDisplay(item.date)}</td>
                        <td>{item.project}</td>
                        <td>{item.status}</td>
                        <td>{wasBought ? "Compro" : "No compro"}</td>
                        <td>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(item.exportedAt ? styles.statusGreen : styles.statusRed),
                            }}
                          >
                            {item.exportedAt ? "Si" : "No"}
                          </span>
                        </td>
                        <td>{money(item.netPrice)}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={styles.smallBtn} onClick={() => openBudgetHistoryItem(item.id)}>
                            Ver
                          </button>
                          <button style={styles.smallBtn} onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}>
                            Editar
                          </button>
                          <button style={styles.smallBtn} onClick={() => removeSavedBudget(item.id)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
          )}

        </div>
      )}

      {activeTab === "aprobados" && (
        <div style={styles.column}>
          <Panel span="full" title="Semaforo de trabajos">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Finalizados", value: String(jobSemaphoreSummary.verde) },
                { level: "amarillo", label: "En curso / pendientes", value: String(jobSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Sin fecha de inicio", value: String(jobSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
    <Panel
      span="full"
      title="Trabajos aprobados por empresa"
      actions={
        <div style={styles.inlineActions}>
                <ButtonLike onClick={createDirectApprovedJob}>Nuevo trabajo directo</ButtonLike>
                <ButtonLike onClick={importLegacyApprovedJobs} secondary>
                  Importar historicos BGA
                </ButtonLike>
                <ButtonLike onClick={() => exportPrint("report-aprobados")} secondary>
                  Reporte
                </ButtonLike>
              </div>
            }
          >
            {approvedJobsSummary.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Presupuesto</th>
                    <th>Origen</th>
                    <th>Cliente</th>
                    <th>Aprobacion</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Neto presupuesto</th>
                    <th>% facturado</th>
                    <th>Comision</th>
                    <th>Comision pend.</th>
                    <th>Valor a cobrar</th>
                    <th>Cobrado</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {companyApprovedSections.map((group) => (
                    <React.Fragment key={group.value}>
                      <tr>
                        <td colSpan={14} style={styles.sectionCell}>
                          <div
                            style={{
                              ...styles.sectionHeader,
                              background: group.soft,
                              color: group.primary,
                              borderColor: group.primary,
                            }}
                          >
                            {group.short} · {group.value}
                          </div>
                        </td>
                      </tr>
                      {group.items.map((job) => (
                        <tr key={job.id} style={job.executionStatus === "finalizado" ? styles.rowGreen : undefined}>
                          <td>{job.isUpdate ? `${job.budgetNumber} · Act. ${job.revisionNumber - 1}` : job.budgetNumber}</td>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                ...(job.sourceType === "from_budget"
                                  ? styles.statusBlue
                                  : job.sourceType === "direct"
                                  ? styles.statusYellow
                                  : styles.statusGray),
                              }}
                            >
                              {getApprovedJobSourceLabel(job)}
                            </span>
                          </td>
                          <td>{job.client}</td>
                          <td>{formatDateDisplay(job.approvalDate)}</td>
                          <td>{formatDateDisplay(job.startDate)}</td>
                          <td>{formatDateDisplay(job.estimatedDeliveryDate)}</td>
                          <td>{money(job.soldNetPrice)}</td>
                          <td>{pct(job.billedPct)}</td>
                          <td>{money(job.commissionAmount)}</td>
                          <td>{money(job.commissionPending)}</td>
                          <td>{money(job.valueToCollect)}</td>
                          <td>{money(job.collectedTotal)}</td>
                          <td>
                            {(() => {
                              const sj = getJobSemaphore(job);
                              return (
                                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <Semaforo level={sj.level} size={10} title={sj.label} />
                                  <span>{job.executionStatus}</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td>
                            {selectedApprovedJobId === job.id ? (
                              <button style={styles.smallBtn} onClick={() => setSelectedApprovedJobId(null)}>
                                Cerrar
                              </button>
                            ) : (
                              <button style={styles.smallBtn} onClick={() => setSelectedApprovedJobId(job.id)}>
                                Abrir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Evolucion de trabajos" span="full">
            {approvedJobsTimelineRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados para mostrar en la linea de tiempo.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Tiempo</th>
                    <th>Estado</th>
                    <th>Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedJobsTimelineRows.map((row) => {
                    const companyMetaRow = getCompanyMeta(row.company);
                    return (
                      <tr key={`timeline-${row.id}`} style={{ background: `${companyMetaRow.soft}33` }}>
                        <td>{companyMetaRow.short}</td>
                        <td>{row.isUpdate ? `${row.budgetNumber} · Act. ${row.revisionNumber - 1}` : row.budgetNumber}</td>
                        <td>{row.client}</td>
                        <td>{formatDateDisplay(row.start)}</td>
                        <td>{formatDateDisplay(row.end)}</td>
                        <td>
                          <div style={styles.timelineBlock}>
                            <div style={styles.timelineLabel}>{row.elapsedDays} / {row.totalDays} dias</div>
                            <div style={styles.ganttTrack}>
                              <div
                                style={{
                                  ...styles.ganttFill,
                                  width: `${row.timeProgressPct}%`,
                                  background: companyMetaRow.primary,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={styles.timelineBlock}>
                            <div style={styles.timelineLabel}>{row.executionStatus}</div>
                            <div style={styles.ganttTrack}>
                              <div
                                style={{
                                  ...styles.ganttFill,
                                  width: `${row.statusProgressPct}%`,
                                  background:
                                    row.executionStatus === "finalizado"
                                      ? "#166534"
                                      : row.executionStatus === "en_curso"
                                      ? companyMetaRow.primary
                                      : "#92400e",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(row.materialMissingCount > 0 ? styles.statusYellow : styles.statusGreen),
                            }}
                          >
                            {row.materialMissingCount > 0
                              ? `${row.materialMissingCount} faltantes`
                              : "Completo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          {selectedApprovedJob && (
            <Panel
              title={`Detalle ${selectedApprovedJob.isUpdate ? `${selectedApprovedJob.budgetNumber} · Act. ${selectedApprovedJob.revisionNumber - 1}` : selectedApprovedJob.budgetNumber}`}
              green={selectedApprovedJob.executionStatus === "finalizado"}
              actions={<ButtonLike onClick={() => setSelectedApprovedJobId(null)} secondary>Cerrar detalle</ButtonLike>}
            >
              <div style={styles.metricGrid}>
                <MiniMetric label="Empresa" value={getCompanyMeta(selectedApprovedJob.company).short} />
                <MiniMetric label="Origen" value={getApprovedJobSourceLabel(selectedApprovedJob)} />
                <MiniMetric label="Cliente" value={selectedApprovedJob.client} />
                <MiniMetric label="Aprobacion" value={formatDateDisplay(selectedApprovedJob.approvalDate)} />
                <MiniMetric label="Entrega" value={formatDateDisplay(selectedApprovedJob.deliveryDate)} />
                <MiniMetric label="Neto presupuesto" value={money(selectedApprovedJob.soldNetPrice)} />
                <MiniMetric label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} />
              </div>

              <div style={styles.grid2}>
                <Panel
                  title="Gestion del trabajo"
                  nested
                  actions={
                    <ButtonLike
                      onClick={() =>
                        loadBudgetFromSnapshot(
                          selectedApprovedJob.snapshot,
                          selectedApprovedJob.budgetId
                        )
                      }
                      secondary
                    >
                      Editar cotizacion
                    </ButtonLike>
                  }
                >
                  <TwoCol>
                    <Field label="Fecha aprobacion">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.approvalDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "approvalDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Fecha inicio">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.startDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "startDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Plazo">
                      <input
                        style={styles.input}
                        value={selectedApprovedJob.deliveryTerm}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "deliveryTerm", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Fecha entrega">
                      <input
                        style={styles.input}
                        type="date"
                        value={selectedApprovedJob.deliveryDate}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "deliveryDate", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="% facturado">
                      <input
                        style={styles.input}
                        type="number"
                        value={selectedApprovedJob.billedPct}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "billedPct", Number(e.target.value))
                        }
                      />
                    </Field>
                    <Field label="Estado">
                      <select
                        style={styles.input}
                        value={selectedApprovedJob.executionStatus}
                        onChange={(e) =>
                          updateApprovedJob(selectedApprovedJob.id, "executionStatus", e.target.value)
                        }
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_curso">En curso</option>
                        <option value="finalizado">Finalizado</option>
                      </select>
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea
                      style={styles.textarea}
                      value={selectedApprovedJob.notes}
                      onChange={(e) =>
                        updateApprovedJob(selectedApprovedJob.id, "notes", e.target.value)
                      }
                    />
                  </Field>
                </Panel>

                <Panel title="Resumen economico" nested>
                  <SummaryRow label="Neto presupuesto" value={money(selectedApprovedJob.soldNetPrice)} />
                  <SummaryRow label="Descuentos" value={money(selectedApprovedJob.totalDiscountAmount)} />
                  <SummaryRow label="% facturado" value={pct(selectedApprovedJob.billedPct)} />
                  <SummaryRow label="Neto factura" value={money(selectedApprovedJob.billedNet)} />
                  <SummaryRow label="Circuito negro" value={money(selectedApprovedJob.blackNet)} />
                  <SummaryRow label="IVA 21%" value={money(selectedApprovedJob.invoiceVatAmount)} />
                  <SummaryRow label="Adicionales" value={money(selectedApprovedJob.additionalsTotal)} />
                  <SummaryRow label="Valor a cobrar" value={money(selectedApprovedJob.valueToCollect)} strong />
                  <SummaryRow label="Cobrado" value={money(selectedApprovedJob.collectedTotal)} />
                  <SummaryRow label="Saldo" value={money(selectedApprovedJob.remainingToPay)} strong />
                  <SummaryRow label="Comision" value={money(selectedApprovedJob.commissionAmount)} />
                  <SummaryRow label="Comision pagada" value={money(selectedApprovedJob.commissionPaidTotal)} />
                  <SummaryRow label="Comision pendiente" value={money(selectedApprovedJob.commissionPending)} strong />
                </Panel>
              </div>

              <Panel title="Planos y archivos de referencia" nested>
                <div style={styles.uploadActions}>
                  <FileDropButton
                    label="Cargar planos"
                    allowMultiple
                    accept="image/*,.pdf,application/pdf"
                    onFilesSelected={(files) =>
                      uploadApprovedJobWorkFiles(
                        selectedApprovedJob.id,
                        "plano",
                        files
                      )
                    }
                  />
                  <FileDropButton
                    label="Cargar referencias"
                    allowMultiple
                    accept="image/*,.pdf,application/pdf"
                    onFilesSelected={(files) =>
                      uploadApprovedJobWorkFiles(
                        selectedApprovedJob.id,
                        "referencia",
                        files
                      )
                    }
                  />
                </div>
                {selectedApprovedJob.workFiles.length === 0 ? (
                  <div style={styles.empty}>No hay archivos vinculados a este trabajo.</div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Archivo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedApprovedJob.workFiles.map((file) => (
                        <tr key={file.id}>
                          <td>{file.kind === "plano" ? "Plano" : "Referencia"}</td>
                          <td>{file.name}</td>
                          <td>
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeApprovedJobWorkFile(selectedApprovedJob.id, file.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Panel>

              <div style={styles.grid2}>
                <Panel
                  title="Facturacion"
                  nested
                  actions={<ButtonLike onClick={() => addInvoice(selectedApprovedJob.id)}>Agregar factura</ButtonLike>}
                >
                  {selectedApprovedJob.invoices.length === 0 ? (
                    <div style={styles.empty}>No hay facturas cargadas.</div>
                  ) : (
                    selectedApprovedJob.invoices.map((invoice) => (
                      <div key={invoice.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeInvoice(selectedApprovedJob.id, invoice.id)}>
                            Quitar factura
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Nombre / razon social">
                            <input
                              style={styles.input}
                              value={invoice.businessName}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "businessName", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="CUIT / CUIL">
                            <input
                              style={styles.input}
                              value={invoice.taxId}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "taxId", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Tipo de factura">
                            <input
                              style={styles.input}
                              value={invoice.invoiceType}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceType", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Numero">
                            <input
                              style={styles.input}
                              value={invoice.invoiceNumber}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceNumber", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "invoiceDate", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Subtotal">
                            <input
                              style={styles.input}
                              type="number"
                              value={invoice.subtotal}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "subtotal", Number(e.target.value))
                              }
                            />
                          </Field>
                          <Field label="IVA">
                            <input
                              style={styles.input}
                              type="number"
                              value={invoice.vat}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "vat", Number(e.target.value))
                              }
                            />
                          </Field>
                          <Field label="Total">
                            <input
                              style={styles.input}
                              type="number"
                              value={invoice.total}
                              onChange={(e) =>
                                updateInvoice(selectedApprovedJob.id, invoice.id, "total", Number(e.target.value))
                              }
                            />
                          </Field>
                        </TwoCol>
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar factura digital
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "invoices",
                                  invoice.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {invoice.attachmentName && (
                            <div style={styles.fileName}>{invoice.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel
                  title="Pagos"
                  nested
                  actions={<ButtonLike onClick={() => addPayment(selectedApprovedJob.id)}>Agregar pago</ButtonLike>}
                >
                  {selectedApprovedJob.payments.length === 0 ? (
                    <div style={styles.empty}>No hay pagos cargados.</div>
                  ) : (
                    selectedApprovedJob.payments.map((payment) => (
                      <div key={payment.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removePayment(selectedApprovedJob.id, payment.id)}>
                            Quitar pago
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Numero">
                            <input
                              style={styles.input}
                              value={payment.paymentNumber}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "paymentNumber", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={payment.paymentDate}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "paymentDate", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Tipo">
                            <select
                              style={styles.input}
                              value={payment.transactionType}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "transactionType", e.target.value)
                              }
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="cheque">Cheque</option>
                              <option value="otros">Otros</option>
                            </select>
                          </Field>
                          <Field label="Monto">
                            <input
                              style={styles.input}
                              type="number"
                              value={payment.amount}
                              onChange={(e) =>
                                updatePayment(selectedApprovedJob.id, payment.id, "amount", Number(e.target.value))
                              }
                            />
                          </Field>
                        </TwoCol>
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar comprobante
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "payments",
                                  payment.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {payment.attachmentName && (
                            <div style={styles.fileName}>{payment.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>
              </div>

              <div style={styles.grid2}>
                <Panel
                  title="Adicionales"
                  nested
                  actions={<ButtonLike onClick={() => addAdditional(selectedApprovedJob.id)}>Agregar adicional</ButtonLike>}
                >
                  {selectedApprovedJob.additionals.length === 0 ? (
                    <div style={styles.empty}>
                      No hay adicionales cargados. Funcionan como continuidad del presupuesto original y suman al saldo a cobrar.
                    </div>
                  ) : (
                    selectedApprovedJob.additionals.map((item) => (
                      <div key={item.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeAdditional(selectedApprovedJob.id, item.id)}>
                            Quitar adicional
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={item.date}
                              onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "date", e.target.value)}
                            />
                          </Field>
                          <Field label="Monto">
                            <input
                              style={styles.input}
                              type="number"
                              value={item.amount}
                              onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "amount", Number(e.target.value))}
                            />
                          </Field>
                        </TwoCol>
                        <Field label="Descripcion">
                          <input
                            style={styles.input}
                            value={item.description}
                            onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "description", e.target.value)}
                          />
                        </Field>
                        <Field label="Notas">
                          <textarea
                            style={styles.textarea}
                            value={item.notes}
                            onChange={(e) => updateAdditional(selectedApprovedJob.id, item.id, "notes", e.target.value)}
                          />
                        </Field>
                      </div>
                    ))
                  )}
                </Panel>

                <Panel
                  title="Comision"
                  nested
                  actions={<ButtonLike onClick={() => addCommissionPayment(selectedApprovedJob.id)}>Agregar pago de comision</ButtonLike>}
                >
                  <div style={styles.metricGrid}>
                    <MiniMetric label="Comision" value={money(selectedApprovedJob.commissionAmount)} />
                    <MiniMetric label="Pagado" value={money(selectedApprovedJob.commissionPaidTotal)} />
                    <MiniMetric label="Pendiente" value={money(selectedApprovedJob.commissionPending)} />
                  </div>
                  {selectedApprovedJob.commissionPayments.length === 0 ? (
                    <div style={styles.empty}>No hay pagos de comision cargados.</div>
                  ) : (
                    selectedApprovedJob.commissionPayments.map((payment) => (
                      <div key={payment.id} style={styles.subCard}>
                        <div style={styles.inlineActions}>
                          <button style={styles.smallBtn} onClick={() => removeCommissionPayment(selectedApprovedJob.id, payment.id)}>
                            Quitar pago
                          </button>
                        </div>
                        <TwoCol>
                          <Field label="Fecha">
                            <input
                              style={styles.input}
                              type="date"
                              value={payment.paymentDate}
                              onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "paymentDate", e.target.value)}
                            />
                          </Field>
                          <Field label="Monto">
                            <input
                              style={styles.input}
                              type="number"
                              value={payment.amount}
                              onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "amount", Number(e.target.value))}
                            />
                          </Field>
                        </TwoCol>
                        <Field label="Nota">
                          <input
                            style={styles.input}
                            value={payment.note}
                            onChange={(e) => updateCommissionPayment(selectedApprovedJob.id, payment.id, "note", e.target.value)}
                          />
                        </Field>
                        <div style={styles.uploadActions}>
                          <label style={styles.buttonLikeLabel}>
                            Cargar comprobante
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                uploadApprovedJobFile(
                                  selectedApprovedJob.id,
                                  "commissionPayments",
                                  payment.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                          {payment.attachmentName && (
                            <div style={styles.fileName}>{payment.attachmentName}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Panel>
              </div>

              <Panel
                title="Retenciones"
                nested
                actions={<ButtonLike onClick={() => addRetention(selectedApprovedJob.id)}>Agregar retencion</ButtonLike>}
              >
                {selectedApprovedJob.retentions.length === 0 ? (
                  <div style={styles.empty}>No hay retenciones cargadas.</div>
                ) : (
                  selectedApprovedJob.retentions.map((retention) => (
                    <div key={retention.id} style={styles.subCard}>
                      <div style={styles.inlineActions}>
                        <button style={styles.smallBtn} onClick={() => removeRetention(selectedApprovedJob.id, retention.id)}>
                          Quitar retencion
                        </button>
                      </div>
                      <TwoCol>
                        <Field label="Numero">
                          <input
                            style={styles.input}
                            value={retention.retentionNumber}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionNumber", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Fecha">
                          <input
                            style={styles.input}
                            type="date"
                            value={retention.retentionDate}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionDate", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Tipo">
                          <input
                            style={styles.input}
                            value={retention.retentionType}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "retentionType", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Monto">
                          <input
                            style={styles.input}
                            type="number"
                            value={retention.amount}
                            onChange={(e) =>
                              updateRetention(selectedApprovedJob.id, retention.id, "amount", Number(e.target.value))
                            }
                          />
                        </Field>
                      </TwoCol>
                      <div style={styles.uploadActions}>
                        <label style={styles.buttonLikeLabel}>
                          Cargar formulario
                          <input
                            type="file"
                            style={{ display: "none" }}
                            onChange={(e) =>
                              uploadApprovedJobFile(
                                selectedApprovedJob.id,
                                "retentions",
                                retention.id,
                                e.target.files?.[0] || null
                              )
                            }
                          />
                        </label>
                        {retention.attachmentName && (
                          <div style={styles.fileName}>{retention.attachmentName}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </Panel>
            </Panel>
          )}
        </div>
      )}

      {activeTab === "facturacion" && (
        <div style={styles.masterDetailLayout}>
          <div style={styles.masterDetailMain}>
          <Panel title="Semaforo: cobros, pagos y fechas">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {([
                ["Cobros", financialSemaphoreSummary.cobros],
                ["Pagos", financialSemaphoreSummary.pagos],
                ["Fechas a facturar", financialSemaphoreSummary.fechas],
              ] as const).map(([label, s]) => (
                <div key={label} style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12 }}>
                  <Semaforo level={s.level} size={24} ring />
                  <div>
                    <div style={styles.metricLabel}>{label}</div>
                    <div style={{ fontWeight: 700 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Calendario de facturacion y cobranzas"
            actions={
              <div style={styles.monthToolbar}>
                <ButtonLike onClick={() => shiftFinancialMonth(-1)} secondary>Mes anterior</ButtonLike>
                <div style={styles.calendarMonthLabel}>{financialMonthData.label}</div>
                <ButtonLike onClick={() => shiftFinancialMonth(1)} secondary>Mes siguiente</ButtonLike>
                <ButtonLike onClick={() => addFinancialItem()}>Nuevo item</ButtonLike>
              </div>
            }
          >
            <div style={styles.calendarLegend}>
              <span style={{ ...styles.statusPill, ...styles.financialBrown }}>Facturacion pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialBlack }}>Cobranza pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialRed }}>Pago pendiente</span>
              <span style={{ ...styles.statusPill, ...styles.financialDone }}>Verde = realizado</span>
            </div>

            <div style={styles.calendarWeekdays}>
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day) => (
                <div key={day} style={styles.calendarWeekdayCell}>{day}</div>
              ))}
            </div>

            <div style={styles.calendarGrid}>
              {financialMonthData.cells.map((cell) => {
                const items = financialItemsByDate.get(cell.date) ?? [];
                return (
                  <div
                    key={cell.date}
                    style={{
                      ...styles.calendarCell,
                      ...(cell.inCurrentMonth ? {} : styles.calendarCellMuted),
                    }}
                  >
                    <div style={styles.calendarCellHeader}>
                      <strong>{cell.day}</strong>
                      <button style={styles.smallBtn} onClick={() => addFinancialItem(cell.date, budget.company)}>
                        +
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <div style={styles.calendarEmpty}>Sin items</div>
                    ) : (
                      items.map((item) => {
                        const companyMetaItem = getCompanyMeta(item.company);
                        return (
                          <button
                            key={item.id}
                            style={{
                              ...styles.calendarItem,
                              ...getFinancialItemStyle(item),
                              borderLeft: `8px solid ${companyMetaItem.primary}`,
                            }}
                            onClick={() =>
                              setSelectedFinancialItemId((prev) => (prev === item.id ? null : item.id))
                            }
                          >
                            <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    background: companyMetaItem.primary,
                                    display: "inline-block",
                                  }}
                                />
                                <strong>{companyMetaItem.short}</strong>
                              </span>
                              {(() => {
                                const sem = getDateSemaphore(item.date, item.status === "realizado");
                                return <Semaforo level={sem.level} size={10} title={sem.label} />;
                              })()}
                            </div>
                            <div>{item.title || "Sin titulo"}</div>
                            <div style={styles.calendarItemMeta}>
                              {getFinancialTypeLabel(item.type)} · {money(item.amount)}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
          </div>

          {selectedFinancialItem && (
            <div style={styles.masterDetailAside}>
            <Panel
              title="Editor dinamico del item"
              actions={<ButtonLike onClick={() => setSelectedFinancialItemId(null)} secondary>Cerrar editor</ButtonLike>}
            >
              <div style={styles.grid2}>
                <Field label="Empresa">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.company}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "company", e.target.value)
                    }
                  >
                    {COMPANY_OPTIONS.map((company) => (
                      <option key={company.value} value={company.value}>
                        {company.value}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha">
                  <input
                    style={styles.input}
                    type="date"
                    value={selectedFinancialItem.date}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "date", e.target.value)
                    }
                  />
                </Field>
                <Field label="Tipo">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.type}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "type", e.target.value)
                    }
                  >
                    <option value="facturacion">Facturacion</option>
                    <option value="cobranza">Cobranza</option>
                    <option value="pago">Pago</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select
                    style={styles.input}
                    value={selectedFinancialItem.status}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "status", e.target.value)
                    }
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </Field>
                <Field label="Titulo">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.title}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "title", e.target.value)
                    }
                  />
                </Field>
                <Field label="Codigo / presupuesto">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.jobCode}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "jobCode", e.target.value)
                    }
                  />
                </Field>
                <Field label="Cliente">
                  <input
                    style={styles.input}
                    value={selectedFinancialItem.client}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "client", e.target.value)
                    }
                  />
                </Field>
                <Field label="Monto">
                  <input
                    style={styles.input}
                    type="number"
                    value={selectedFinancialItem.amount}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "amount", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
                <Field label="Notas">
                  <textarea
                    style={styles.textarea}
                    value={selectedFinancialItem.notes}
                    onChange={(e) =>
                      updateFinancialItem(selectedFinancialItem.id, "notes", e.target.value)
                    }
                  />
                </Field>
                {selectedFinancialItem.autoGenerated && (
                  <div style={styles.noticeBox}>
                    Este item se genera automaticamente desde un trabajo aprobado. Si cambias aprobación, plazo o porcentaje facturado, fechas y montos se actualizan solos.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ButtonLike onClick={() => removeFinancialItem(selectedFinancialItem.id)} secondary>
                  Eliminar item
                </ButtonLike>
                <ButtonLike onClick={() => setSelectedFinancialItemId(null)} secondary>
                  Cerrar
                </ButtonLike>
                <ButtonLike onClick={() => exportPrint("report-facturacion")} secondary>
                  Reporte
                </ButtonLike>
              </div>
            </Panel>
            </div>
          )}
        </div>
      )}

      {activeTab === "fabricacion" && (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de fabricacion">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Materiales cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Compra parcial", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes para fabricar", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
            <div style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <Semaforo
                level={occupancyPct > 100 ? "rojo" : occupancyPct > 85 ? "amarillo" : "verde"}
                size={24}
                ring
              />
              <div>
                <div style={styles.metricLabel}>Ocupacion</div>
                <div style={{ fontWeight: 700 }}>{occupancyPct.toFixed(1)}%</div>
              </div>
            </div>
          </Panel>
          <Panel
            title="Tablero general de fabricacion"
            span="wide"
            actions={<ButtonLike onClick={() => exportPrint("report-fabricacion")} secondary>Reporte</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Trabajos activos" value={String(fabricationOpenJobsCount)} />
              <MiniMetric label="En curso" value={String(fabricationInProgressCount)} />
              <MiniMetric label="Compras pendientes" value={String(fabricationPendingPurchases.length)} />
              <MiniMetric label="Compras realizadas" value={String(fabricationCompletedPurchases.length)} />
              <MiniMetric label="Entregas a coordinar" value={String(fabricationUpcomingDeliveries)} />
              <MiniMetric label="Ocupacion usada" value={`${occupancyPct.toFixed(1)}%`} />
              <MiniMetric label="Ocupacion disponible" value={`${fabricationOccupancyAvailablePct.toFixed(1)}%`} />
              <MiniMetric label="Horas disponibles" value={totalAvailableHours.toFixed(1)} />
              <MiniMetric label="Horas comprometidas" value={totalJobHours.toFixed(1)} />
            </div>
            <div style={styles.noticeBox}>
              Esta solapa concentra seguimiento de fabricacion sin precios: compras necesarias,
              compras realizadas, estado de stock, ocupacion disponible, calendario y
              coordinacion de entregas para trabajar capacidad y faltantes.
            </div>
          </Panel>

          <Panel title="Compras pendientes para fabricacion" span="wide">
            {fabricationPendingPurchases.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos activos.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Material</th>
                    <th>Empresas</th>
                    <th>Trabajos</th>
                    <th>Requerido</th>
                    <th>Stock</th>
                    <th>Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationPendingPurchases.map((row) => (
                    <tr key={row.description}>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.available > 0 ? styles.statusYellow : styles.statusRed),
                          }}
                        >
                          {row.available > 0 ? "Parcial" : "Comprar"}
                        </span>
                      </td>
                      <td>{row.description}</td>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.jobs.join(", ")}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Compras realizadas" span="wide">
            {fabricationCompletedPurchases.length === 0 ? (
              <div style={styles.empty}>Todavia no hay facturas de compra cargadas.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Comprobante</th>
                    <th>Numero</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCompletedPurchases.map((item) => (
                    <tr key={item.id}>
                      <td>{getCompanyMeta(item.company).short}</td>
                      <td>{formatDateDisplay(item.invoiceDate)}</td>
                      <td>{item.supplier}</td>
                      <td>{[item.receiptKind, item.receiptLetter].filter(Boolean).join(" ") || "-"}</td>
                      <td>{item.invoiceNumber || "-"}</td>
                      <td>{item.source === "caja_chica" ? "Caja chica" : "Compras"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Estado de stock para fabricacion" span="wide">
            <div style={styles.metricGrid}>
              <MiniMetric label="Items visibles" value={String(visibleStockItems.filter((item) => item.kind === "general").length)} />
              <MiniMetric label="Items sin stock" value={String(visibleStockItems.filter((item) => item.kind === "general" && Number(item.quantity || 0) <= 0).length)} />
              <MiniMetric label="Items activos" value={String(visibleStockItems.filter((item) => item.kind === "general" && item.active).length)} />
              <MiniMetric label="Materiales con faltante" value={String(fabricationPendingPurchases.length)} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {visibleStockItems
                  .filter((item) => item.kind === "general")
                  .sort((a, b) => {
                    const stockCompare = Number(a.quantity || 0) - Number(b.quantity || 0);
                    if (stockCompare !== 0) return stockCompare;
                    return a.description.localeCompare(b.description);
                  })
                  .slice(0, 20)
                  .map((item) => (
                    <tr key={item.id}>
                      <td>{getCompanyScopeLabel(item.company)}</td>
                      <td>{item.group || "-"}</td>
                      <td>{item.code || "-"}</td>
                      <td>{item.description}</td>
                      <td>{item.location || "Sin ubicar"}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Calendario de fabricacion y entregas" span="full">
            {fabricationCalendarRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos aprobados para fabricar.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Presupuesto</th>
                    <th>Cliente</th>
                    <th>Inicio</th>
                    <th>Entrega</th>
                    <th>Encargado</th>
                    <th>Estado</th>
                    <th>Tiempo</th>
                    <th>Ocupacion</th>
                    <th>Faltantes</th>
                  </tr>
                </thead>
                <tbody>
                  {fabricationCalendarRows.map((job) => (
                    <tr key={job.id}>
                      <td>{getCompanyMeta(job.company).short}</td>
                      <td>{job.budgetNumber}</td>
                      <td>{job.client}</td>
                      <td>
                        <input
                          style={{ ...styles.input, minWidth: 140 }}
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateApprovedJob(job.id, "startDate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={{ ...styles.input, minWidth: 140 }}
                          type="date"
                          value={job.deliveryDate}
                          onChange={(e) => updateApprovedJob(job.id, "deliveryDate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          style={styles.input}
                          value={job.projectManager}
                          onChange={(e) => updateApprovedJob(job.id, "projectManager", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={job.executionStatus}
                          onChange={(e) => updateApprovedJob(job.id, "executionStatus", e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_curso">En curso</option>
                          <option value="finalizado">Finalizado</option>
                        </select>
                      </td>
                      <td>
                        <div style={styles.timelineBlock}>
                          <div style={styles.timelineLabel}>
                            {job.elapsedDays}/{job.totalDays} dias
                          </div>
                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${job.timeProgressPct}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={styles.timelineBlock}>
                          <div style={styles.timelineLabel}>
                            {job.statusProgressPct.toFixed(0)}%
                          </div>
                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${job.statusProgressPct}%`,
                                background: "#0f766e",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(job.materialMissingCount === 0
                              ? styles.statusGreen
                              : job.materialMissingCount <= 2
                              ? styles.statusYellow
                              : styles.statusRed),
                          }}
                        >
                          {job.materialMissingCount === 0
                            ? "Completo"
                            : `${job.materialMissingCount} faltantes`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="Gantt operativo de fabricacion" span="full">
            {fabricationCalendarRows.length === 0 ? (
              <div style={styles.empty}>Todavia no hay trabajos suficientes para mostrar el Gantt.</div>
            ) : (
              <div style={styles.fabricationGanttWrap}>
                <div style={styles.fabricationGanttHeader}>
                  <div style={styles.fabricationGanttMeta}>
                    Ventana visible: {formatDateDisplay(fabricationGanttTimeline.start)} al{" "}
                    {formatDateDisplay(fabricationGanttTimeline.end)}
                  </div>
                  <div style={styles.fabricationGanttLegend}>
                    <span style={styles.fabricationGanttLegendItem}>Barra: plazo comprometido</span>
                    <span style={styles.fabricationGanttLegendItem}>Color: empresa</span>
                  </div>
                </div>
                <div style={styles.fabricationGanttGrid}>
                  <div style={styles.fabricationGanttDays}>
                    {fabricationGanttTimeline.dayLabels.map((day) => (
                      <div
                        key={`gantt-day-${day.key}`}
                        style={{
                          ...styles.fabricationGanttDay,
                          ...(day.weekend ? styles.fabricationGanttDayWeekend : {}),
                        }}
                      >
                        {day.label}
                      </div>
                    ))}
                  </div>
                  {fabricationCalendarRows.map((job) => {
                    const companyMeta = getCompanyMeta(job.company);
                    const startTime = new Date(job.start || job.approvalDate || fabricationGanttTimeline.start).getTime();
                    const endTime = new Date(job.end || job.deliveryDate || job.start || fabricationGanttTimeline.end).getTime();
                    const timelineStart = new Date(fabricationGanttTimeline.start).getTime();
                    const totalRange = Math.max(
                      1,
                      new Date(fabricationGanttTimeline.end).getTime() - timelineStart
                    );
                    const leftPct = Math.max(0, ((startTime - timelineStart) / totalRange) * 100);
                    const widthPct = Math.max(
                      2,
                      ((Math.max(endTime, startTime) - startTime + 1000 * 60 * 60 * 24) / totalRange) * 100
                    );
                    return (
                      <div key={`gantt-row-${job.id}`} style={styles.fabricationGanttRow}>
                        <div style={styles.fabricationGanttJobMeta}>
                          <strong>
                            {job.budgetNumber} · {job.client}
                          </strong>
                          <span style={styles.muted}>
                            {companyMeta.short} · {job.projectManager || "Sin encargado"} ·{" "}
                            {job.executionStatus === "finalizado"
                              ? "Finalizado"
                              : job.executionStatus === "en_curso"
                              ? "En curso"
                              : "Pendiente"}
                          </span>
                        </div>
                        <div style={styles.fabricationGanttTrack}>
                          <div
                            style={{
                              ...styles.fabricationGanttBar,
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: `linear-gradient(90deg, ${companyMeta.primary}, ${companyMeta.primary}CC)`,
                            }}
                          >
                            <span style={styles.fabricationGanttBarLabel}>
                              {formatDateDisplay(job.start || job.approvalDate)} → {formatDateDisplay(job.end || job.deliveryDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "stock" && (
        <div style={styles.column}>
          <Panel span="wide" title="Semaforo de stock">
            <SemaforoResumen
              items={[
                { level: "verde", label: "Cubiertos", value: String(stockSemaphoreSummary.verde) },
                { level: "amarillo", label: "Parciales", value: String(stockSemaphoreSummary.amarillo) },
                { level: "rojo", label: "Faltantes", value: String(stockSemaphoreSummary.rojo) },
              ]}
            />
          </Panel>
          <Panel title="Agenda de fabricacion" span="wide" actions={<ButtonLike onClick={() => exportPrint("report-stock")} secondary>Reporte</ButtonLike>}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Presupuesto</th>
                  <th>Cliente</th>
                  <th>Inicio fabricacion</th>
                  <th>Dias para comprar</th>
                  <th>Estado</th>
                  <th>Faltantes</th>
                </tr>
              </thead>
              <tbody>
                {approvedJobsSummary.map((job) => {
                  const companyMetaItem = getCompanyMeta(job.company);
                  const daysUntilStart = job.startDate
                    ? Math.ceil(
                        (new Date(job.startDate).getTime() - new Date(todayIso()).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  const missingCount = job.snapshot.materials.filter((material) => {
                    const stockMatch = stockByDescription.get(material.description.trim().toLowerCase());
                    return Number(stockMatch?.quantity || 0) < Number(material.qty || 0);
                  }).length;
                  return (
                    <tr key={job.id} style={{ background: `${companyMetaItem.soft}66` }}>
                      <td>
                        <span style={{ ...styles.statusPill, background: companyMetaItem.soft, color: companyMetaItem.primary }}>
                          {companyMetaItem.short}
                        </span>
                      </td>
                      <td>{job.budgetNumber}</td>
                      <td>{job.client}</td>
                      <td>
                        <input
                          style={{ ...styles.input, minWidth: 140 }}
                          type="date"
                          value={job.startDate}
                          onChange={(e) => updateApprovedJob(job.id, "startDate", e.target.value)}
                        />
                      </td>
                      <td>
                        {daysUntilStart === null ? "-" : `${daysUntilStart} dias`}
                      </td>
                      <td>{job.executionStatus}</td>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(missingCount === 0
                              ? styles.statusGreen
                              : missingCount <= 2
                              ? styles.statusYellow
                              : styles.statusRed),
                          }}
                        >
                          {missingCount === 0 ? "Completo" : `${missingCount} faltantes`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <datalist id="stock-general-group-options-stock-tab">
            {Array.from(
              new Set([
                ...STOCK_GENERAL_GROUP_OPTIONS,
                ...fixedMarkerGroupOptions,
                ...visibleStockItems
                  .filter((item) => item.kind === "general")
                  .map((item) => item.group.trim())
                  .filter(Boolean),
              ])
            ).map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>

          <Panel
            title="Inventario y alertas"
            span="wide"
            actions={
              <div style={styles.inlineActions}>
                <span style={styles.muted}>Aumento %</span>
                <input
                  style={{ ...styles.input, width: 120 }}
                  type="number"
                  value={stockIncreasePct}
                  onChange={(e) => setStockIncreasePct(Number(e.target.value))}
                />
                <ButtonLike onClick={applyStockIncrease} secondary>
                  Aplicar aumento %
                </ButtonLike>
                <ButtonLike onClick={addStockItem}>Agregar item</ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Alerta</th>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Orden</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>$ Unit.</th>
                  <th>Valor stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleStockItems
                  .filter((item) => item.kind === "general")
                  .sort((a, b) => {
                    const groupCompare = (a.group || "").localeCompare(b.group || "");
                    if (groupCompare !== 0) return groupCompare;
                    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
                  })
                  .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...(Number(item.quantity || 0) > 0 ? styles.statusGreen : styles.statusRed),
                        }}
                      >
                        {Number(item.quantity || 0) > 0 ? "Con stock" : "Sin stock"}
                      </span>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) => updateStockItem(item.id, "company", e.target.value)}
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        list="stock-general-group-options-stock-tab"
                        value={item.group}
                        onChange={(e) => updateStockItem(item.id, "group", e.target.value)}
                        placeholder="Grupo"
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.sortOrder}
                        onChange={(e) => updateStockItem(item.id, "sortOrder", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.code}
                        onChange={(e) => updateStockItem(item.id, "code", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.description}
                        onChange={(e) => updateStockItem(item.id, "description", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.location}
                        onChange={(e) => updateStockItem(item.id, "location", e.target.value)}
                        placeholder="Sector / estante / deposito"
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.unit}
                        onChange={(e) => updateStockItem(item.id, "unit", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateStockItem(item.id, "quantity", Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateStockItem(item.id, "unitPrice", Number(e.target.value))}
                      />
                    </td>
                    <td>{money(item.quantity * item.unitPrice)}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeStockItem(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.metricGrid}>
              <MiniMetric label="Valor stock general" value={money(visibleStockItems.filter((item) => item.kind === "general" && item.active).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))} />
              <MiniMetric label="Valor total stock" value={money(totalStockValue)} />
            </div>
          </Panel>

          <Panel
            title="Analisis de costos"
            span="wide"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={addCostAnalysisGroup} secondary>
                  Agregar grupo
                </ButtonLike>
                <ButtonLike onClick={addCostAnalysisEntry}>Agregar item de costo</ButtonLike>
              </div>
            }
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Grupos activos" value={String(costAnalysisGroups.filter((item) => item.active).length)} />
              <MiniMetric label="Items activos" value={String(costAnalysisEntries.filter((item) => item.active).length)} />
              <MiniMetric
                label="Costo analizado total"
                value={money(
                  costAnalysisEntries
                    .filter((item) => item.active)
                    .reduce(
                      (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitCost || 0),
                      0
                    )
                )}
              />
            </div>

            <div style={styles.sectionHeader}>Grupos y categorias</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Grupo / categoria</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisGroups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={group.active}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "active", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={group.company}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={group.name}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "name", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={group.notes}
                        onChange={(e) =>
                          updateCostAnalysisGroup(group.id, "notes", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        style={styles.smallBtn}
                        onClick={() => removeCostAnalysisGroup(group.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.sectionHeader}>Items del analisis</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Grupo</th>
                  <th>Descripcion</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>$ Unit.</th>
                  <th>Subtotal</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {costAnalysisEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={entry.active}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "active", e.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.company}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.groupId}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "groupId", Number(e.target.value))
                        }
                      >
                        {costAnalysisGroups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} - {getCompanyScopeLabel(group.company)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.description}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "description", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.unit}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "unit", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.quantity}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "quantity", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        type="number"
                        value={entry.unitCost}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "unitCost", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>{money(Number(entry.quantity || 0) * Number(entry.unitCost || 0))}</td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.notes}
                        onChange={(e) =>
                          updateCostAnalysisEntry(entry.id, "notes", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        style={styles.smallBtn}
                        onClick={() => removeCostAnalysisEntry(entry.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.noticeBox}>
              Los grupos activos de este bloque alimentan automaticamente la solapa de
              marcadores y luego pueden restaurarse dentro del presupuesto.
            </div>
          </Panel>

          <Panel
            title="Remitos a cargar"
            span="wide"
            actions={
              <label style={styles.buttonLikeLabel}>
                Subir PDF / Excel / CSV
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.tsv,.txt"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    void handleRemitoFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            }
          >
            {remitoDrafts.length === 0 ? (
              <div style={styles.empty}>
                Todavia no hay remitos cargados para revisar. Primero subes el archivo, lo
                corriges aca y despues lo pasas al stock.
              </div>
            ) : (
              remitoDrafts.map((draft) => (
                <div key={draft.id} style={styles.nestedCard}>
                  <div style={styles.sectionHeader}>
                    {draft.fileName} - {draft.sourceType.toUpperCase()}
                  </div>
                  <div style={styles.grid2}>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={draft.company}
                        onChange={(e) =>
                          updateRemitoDraft(draft.id, "company", e.target.value)
                        }
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Notas de revision">
                      <input
                        style={styles.input}
                        value={draft.notes}
                        onChange={(e) =>
                          updateRemitoDraft(draft.id, "notes", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Descripcion</th>
                        <th>Grupo</th>
                        <th>Ubicacion</th>
                        <th>Unidad</th>
                        <th>Cantidad</th>
                        <th>$ Unit.</th>
                        <th>Relacionar con stock</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <select
                              style={styles.input}
                              value={row.company}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "company", e.target.value)
                              }
                            >
                              <option value="General">General</option>
                              {COMPANY_OPTIONS.map((company) => (
                                <option key={company.value} value={company.value}>
                                  {company.short}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.description}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              list="stock-general-group-options-stock-tab"
                              value={row.group}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "group", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.location}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "location",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              value={row.unit}
                              onChange={(e) =>
                                updateRemitoDraftRow(draft.id, row.id, "unit", e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "quantity",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "unitPrice",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </td>
                          <td>
                            <select
                              style={styles.input}
                              value={row.matchedStockId ?? ""}
                              onChange={(e) =>
                                updateRemitoDraftRow(
                                  draft.id,
                                  row.id,
                                  "matchedStockId",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                            >
                              <option value="">Nuevo item</option>
                              {visibleStockItems
                                .filter((item) => item.kind === "general")
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.description} - {item.group} - {item.location || "Sin ubicacion"}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td>
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeRemitoDraftRow(draft.id, row.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={styles.inlineActions}>
                    <ButtonLike onClick={() => addRemitoDraftRow(draft.id)} secondary>
                      Agregar fila
                    </ButtonLike>
                    <ButtonLike onClick={() => commitRemitoDraftToStock(draft.id)}>
                      Cargar a stock
                    </ButtonLike>
                    <ButtonLike onClick={() => removeRemitoDraft(draft.id)} secondary>
                      Descartar borrador
                    </ButtonLike>
                  </div>
                </div>
              ))
            )}
          </Panel>

          <Panel
            title="EPP e insumos"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={() => addPersonalStockItem("EPP")} secondary>
                  Agregar EPP
                </ButtonLike>
                <ButtonLike onClick={() => addPersonalStockItem("Insumos")}>
                  Agregar insumo
                </ButtonLike>
              </div>
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Compartido</th>
                  <th>Codigo</th>
                  <th>Descripcion</th>
                  <th>Ubicacion</th>
                  <th>Cantidad</th>
                  <th>$ por entrega</th>
                  <th>Valor stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stockPersonalItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.active}
                        onChange={(e) => updateStockItem(item.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.kind}
                        onChange={(e) => updateStockItem(item.id, "kind", e.target.value)}
                      >
                        <option value="EPP">EPP</option>
                        <option value="Insumos">Insumos</option>
                      </select>
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={item.company}
                        onChange={(e) => updateStockItem(item.id, "company", e.target.value)}
                      >
                        <option value="General">General</option>
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.shared}
                        onChange={(e) => updateStockItem(item.id, "shared", e.target.checked)}
                      />
                    </td>
                    <td>
                      <input style={styles.input} value={item.code} onChange={(e) => updateStockItem(item.id, "code", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={item.description} onChange={(e) => updateStockItem(item.id, "description", e.target.value)} />
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={item.location}
                        onChange={(e) => updateStockItem(item.id, "location", e.target.value)}
                        placeholder="Sector / estante / deposito"
                      />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.quantity} onChange={(e) => updateStockItem(item.id, "quantity", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={item.unitPrice} onChange={(e) => updateStockItem(item.id, "unitPrice", Number(e.target.value))} />
                    </td>
                    <td>{money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeStockItem(item.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={styles.inlineActions}>
              <ButtonLike onClick={restorePersonalProvisionMarkersFromStock} secondary>
                Llevar a marcadores
              </ButtonLike>
            </div>
            <div style={styles.rightStrong}>
              Valor total EPP e insumos: {money(stockPersonalItems.filter((item) => item.active).reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0))}
            </div>
          </Panel>

          <Panel title="Alertas de vigencia de EPP e insumos">
            {personalProvisionAlerts.length === 0 ? (
              <div style={styles.empty}>No hay vencimientos proximos cargados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Empresa</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Vence</th>
                    <th>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {personalProvisionAlerts.map((item) => (
                    <tr key={`${item.employeeName}-${item.kind}-${item.dueDate}`}>
                      <td>
                        <span style={{ ...styles.statusPill, ...(item.state === "vencido" ? styles.statusRed : styles.statusYellow) }}>
                          {item.state === "vencido" ? "Vencido" : "Vence pronto"}
                        </span>
                      </td>
                      <td>{getCompanyMeta(item.company).short}</td>
                      <td>{item.employeeName}</td>
                      <td>{item.kind}</td>
                      <td>{formatDateDisplay(item.dueDate)}</td>
                      <td>{item.daysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Activos y amortizacion"
            actions={<ButtonLike onClick={addCompanyAsset}>Agregar activo</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Activos activos" value={String(visibleCompanyAssets.filter((item) => item.active).length)} />
              <MiniMetric label="Valor de activos" value={money(visibleCompanyAssets.filter((item) => item.active).reduce((acc, item) => acc + Number(item.value || 0), 0))} />
              <MiniMetric label="Amortizacion mensual" value={money(activeAssetsMonthlyDepreciation)} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Empresa</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th>Valor</th>
                  <th>Vida util (meses)</th>
                  <th>Amortizacion</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanyAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={asset.active}
                        onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "active", e.target.checked)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={asset.company}
                        onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input style={styles.input} value={asset.category} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "category", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} value={asset.description} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "description", e.target.value)} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={asset.value} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "value", Number(e.target.value))} />
                    </td>
                    <td>
                      <input style={styles.input} type="number" value={asset.usefulLifeMonths} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "usefulLifeMonths", Number(e.target.value))} />
                    </td>
                    <td>{money(Number(asset.value || 0) / Math.max(Number(asset.usefulLifeMonths || 1), 1))}</td>
                    <td>
                      <input style={styles.input} value={asset.notes} onChange={(e) => updateArrayItem(setCompanyAssets, asset.id, "notes", e.target.value)} />
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeCompanyAsset(asset.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Detalle de faltantes sugeridos">
            {stockNeedRows.length === 0 ? (
              <div style={styles.empty}>No hay faltantes pendientes para trabajos abiertos.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Material</th>
                    <th>Empresas</th>
                    <th>Trabajos</th>
                    <th>Requerido</th>
                    <th>Stock</th>
                    <th>Faltante</th>
                    <th>Costo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockNeedRows.map((row) => (
                    <tr key={row.description}>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(row.missing === 0
                              ? styles.statusGreen
                              : row.available > 0
                              ? styles.statusYellow
                              : styles.statusRed),
                          }}
                        >
                          {row.missing === 0 ? "Completo" : row.available > 0 ? "Parcial" : "Comprar"}
                        </span>
                      </td>
                      <td>{row.description}</td>
                      <td>{row.companyLabels.join(", ")}</td>
                      <td>{row.jobs.join(", ")}</td>
                      <td>{row.required} {row.unit}</td>
                      <td>{row.available} {row.unit}</td>
                      <td>{row.missing} {row.unit}</td>
                      <td>{money(row.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "personal" && (
        <div style={styles.personalStack}>
          <div style={{ order: 5, gridColumn: "1 / -1" }}>
            <Panel
              title="Costo real por empresa y categoria"
              span="full"
              actions={
                <ButtonLike onClick={syncLaborMarkersFromPersonal}>
                  Volcar a mano de obra base
                </ButtonLike>
              }
            >
              <div style={styles.muted}>
                Este bloque consolida el costo integral real por empresa y categoria a partir de
                los empleados cargados. Sirve para actualizar la mano de obra base de Marcadores
                con un valor hora mas fiel, sin perder la edicion manual posterior.
              </div>

              <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                <MiniMetric label="Empleados totales" value={String(employees.length)} />
                <MiniMetric
                  label="Categorias activas"
                  value={String(companyCategoryCostRows.length)}
                />
              </div>

              {companyCategoryCostRows.length === 0 ? (
                <div style={{ ...styles.empty, marginTop: 12 }}>
                  Cuando cargues empleados, aqui vas a ver el costo real promedio por categoria y
                  empresa.
                </div>
              ) : (
                <table style={{ ...styles.table, marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Categoria</th>
                      <th>Empleados</th>
                      <th>Antig. prom.</th>
                      <th>Presentismo prom.</th>
                      <th>Descuentos prom.</th>
                      <th>Cargas + SAC prom.</th>
                      <th>Provision prom.</th>
                      <th>Bruto prom.</th>
                      <th>Neto prom.</th>
                      <th>Impacto prom.</th>
                      <th>Costo hora prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyCategoryCostRows.map((row) => {
                      const meta = getCompanyMeta(row.company);
                      return (
                        <tr key={`${row.company}-${row.category}`} style={{ background: `${meta.soft}55` }}>
                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                background: meta.soft,
                                color: meta.primary,
                              }}
                            >
                              {meta.short}
                            </span>
                          </td>
                          <td>{row.category}</td>
                          <td>{row.employeeCount}</td>
                          <td>{row.avgSeniorityYears.toFixed(1)}</td>
                          <td>{pct(row.avgPresentismoPct)}</td>
                          <td>{money(row.avgGross - row.avgNet)}</td>
                          <td>{money(row.avgEmployerImpact - row.avgGross - row.avgMonthlyProvisionCost)}</td>
                          <td>{money(row.avgMonthlyProvisionCost)}</td>
                          <td>{money(row.avgGross)}</td>
                          <td>{money(row.avgNet)}</td>
                          <td>{money(row.avgEmployerImpact)}</td>
                          <td>{money(row.avgHourlyCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

            {employeeDocumentModal && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title="Agregar documentacion importante"
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike onClick={createEmployeeDocumentFromModal}>
                          Crear item
                        </ButtonLike>
                        <ButtonLike onClick={() => setEmployeeDocumentModal(null)} secondary>
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Titulo">
                        <input
                          style={styles.input}
                          value={employeeDocumentModal.name}
                          onChange={(e) =>
                            setEmployeeDocumentModal({
                              ...employeeDocumentModal,
                              name: e.target.value,
                            })
                          }
                          placeholder="Ej: DNI, Apto medico, Certificado"
                        />
                      </Field>
                      <Field label="Vigencia / vencimiento">
                        <input
                          style={styles.input}
                          type="date"
                          value={employeeDocumentModal.dueDate}
                          onChange={(e) =>
                            setEmployeeDocumentModal({
                              ...employeeDocumentModal,
                              dueDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                  </Panel>
                </div>
              </div>
            )}

            {employeeProvisionModal && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title={`Agregar ${employeeProvisionModal.kind}`}
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike onClick={createEmployeeProvisionFromModal}>
                          Crear item
                        </ButtonLike>
                        <ButtonLike onClick={() => setEmployeeProvisionModal(null)} secondary>
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Titulo del item">
                        <input
                          style={styles.input}
                          value={employeeProvisionModal.title}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              title: e.target.value,
                            })
                          }
                          placeholder="Ej: Ropa de trabajo"
                        />
                      </Field>
                      <Field label="Vigencia / vencimiento">
                        <input
                          style={styles.input}
                          type="date"
                          value={employeeProvisionModal.dueDate}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              dueDate: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Costo neto">
                        <input
                          style={styles.input}
                          type="number"
                          value={employeeProvisionModal.unitPrice}
                          onChange={(e) =>
                            setEmployeeProvisionModal({
                              ...employeeProvisionModal,
                              unitPrice: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Al crear este item tambien se genera el item relacionado en Stock dentro de
                      EPP/Insumos.
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {isEmployeeSetupModalOpen && (
              <div style={styles.modalBackdrop}>
                <div style={styles.employeeSetupModal}>
                  <Panel
                    title="Agregar empleado"
                    span="full"
                    actions={
                      <div style={styles.inlineActions}>
                        <ButtonLike
                          onClick={() => {
                            addEmployee();
                            setIsEmployeeSetupModalOpen(false);
                          }}
                        >
                          Agregar empleado
                        </ButtonLike>
                        <ButtonLike
                          onClick={() => setIsEmployeeSetupModalOpen(false)}
                          secondary
                        >
                          Cancelar
                        </ButtonLike>
                      </div>
                    }
                  >
                    <TwoCol>
                      <Field label="Empresa">
                        <select
                          style={styles.input}
                          value={newEmployeeDraft.company}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              company: e.target.value as CompanyName,
                            })
                          }
                        >
                          {COMPANY_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.value}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Legajo">
                        <input
                          style={styles.input}
                          value={newEmployeeDraft.legajo}
                          onChange={(e) =>
                            setNewEmployeeDraft({ ...newEmployeeDraft, legajo: e.target.value })
                          }
                          placeholder="Ej: 24"
                        />
                      </Field>
                      <Field label="Nombre y apellido">
                        <input
                          style={styles.input}
                          value={newEmployeeDraft.name}
                          onChange={(e) =>
                            setNewEmployeeDraft({ ...newEmployeeDraft, name: e.target.value })
                          }
                          placeholder="Nombre completo"
                        />
                      </Field>
                      <Field label="Categoria base">
                        <select
                          style={styles.input}
                          value={newEmployeeDraft.category}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              category: e.target.value,
                            })
                          }
                        >
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Horas nominales">
                        <input
                          style={styles.input}
                          type="number"
                          value={newEmployeeDraft.nominalHours}
                          onChange={(e) =>
                            setNewEmployeeDraft({
                              ...newEmployeeDraft,
                              nominalHours: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    </TwoCol>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Con estos datos se crea el empleado. El resto se completa luego desde Abrir
                      ficha.
                    </div>
                    {/* Configuracion base anterior retirada: el alta solo pide los cinco datos iniciales.
                <div style={{ ...styles.muted, marginBottom: 10 }}>
                  Los costos de EPP e insumos del personal se toman prioritariamente desde
                  Marcadores. Los campos de esta seccion quedan como respaldo por si todavia no
                  cargaste ese desglose.
                </div>
                <TwoCol>
                  <Field label="Categoria base">
                    <select
                      style={styles.input}
                      value={employeeBaseConfig.category}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, category: e.target.value })}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Antiguedad base">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.seniorityYears}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, seniorityYears: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Horas nominales">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.normalHoursDefault}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, normalHoursDefault: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Presentismo %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.presentismoPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, presentismoPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Antiguedad % anual">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.seniorityPctPerYear}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, seniorityPctPerYear: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Impacto empresa %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.employerContributionPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, employerContributionPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Seguro patronal %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.employerInsurancePct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, employerInsurancePct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Sindicato %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.unionPct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, unionPct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Seguro %">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.insurancePct}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, insurancePct: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Aguinaldo (sueldos/año)">
                    <input
                      style={styles.input}
                      type="number"
                      step={0.01}
                      value={employeeBaseConfig.aguinaldoAnnualMonths}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, aguinaldoAnnualMonths: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="EPP cada 6 meses (respaldo)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.eppSemiannualCost}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, eppSemiannualCost: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Insumos cada 6 meses (respaldo)">
                    <input
                      style={styles.input}
                      type="number"
                      value={employeeBaseConfig.suppliesSemiannualCost}
                      onChange={(e) => setEmployeeBaseConfig({ ...employeeBaseConfig, suppliesSemiannualCost: Number(e.target.value) })}
                    />
                  </Field>
                </TwoCol>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.label}>EPP e insumos base por empleado</div>
                  {employeeBaseConfig.provisionTemplates.map((item) => {
                    const stockItem = stockPersonalItems.find((stock) => stock.code === item.stockCode);
                    return (
                      <div key={item.id} style={styles.configDocRow}>
                        <select
                          style={styles.input}
                          value={item.stockCode}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? {
                                      ...template,
                                      stockCode: e.target.value,
                                      kind:
                                        stockPersonalItems.find((stock) => stock.code === e.target.value)?.kind === "EPP"
                                          ? "EPP"
                                          : "Insumos",
                                    }
                                  : template
                              ),
                            }))
                          }
                        >
                          {stockPersonalItems.map((stock) => (
                            <option key={stock.code} value={stock.code}>
                              {stock.description}
                            </option>
                          ))}
                        </select>
                        <input
                          style={{ ...styles.input, maxWidth: 110 }}
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? { ...template, quantity: Number(e.target.value) }
                                  : template
                              ),
                            }))
                          }
                        />
                        <input
                          style={{ ...styles.input, maxWidth: 110 }}
                          type="number"
                          value={item.validityMonths}
                          onChange={(e) =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.map((template) =>
                                template.id === item.id
                                  ? { ...template, validityMonths: Number(e.target.value) }
                                  : template
                              ),
                            }))
                          }
                        />
                        <div style={{ minWidth: 120, fontSize: 12, color: "#475569" }}>
                          {stockItem ? money(stockItem.unitPrice) : "-"}
                        </div>
                        <button
                          style={styles.smallBtn}
                          onClick={() =>
                            setEmployeeBaseConfig((prev) => ({
                              ...prev,
                              provisionTemplates: prev.provisionTemplates.filter(
                                (template) => template.id !== item.id
                              ),
                            }))
                          }
                        >
                          x
                        </button>
                      </div>
                    );
                  })}
                  <button
                    style={styles.smallBtn}
                    onClick={() =>
                      setEmployeeBaseConfig((prev) => ({
                        ...prev,
                        provisionTemplates: [
                          ...prev.provisionTemplates,
                          {
                            id: newId(),
                            stockCode: stockPersonalItems[0]?.code || "",
                            kind: stockPersonalItems[0]?.kind === "EPP" ? "EPP" : "Insumos",
                            quantity: 1,
                            validityMonths: 6,
                          },
                        ],
                      }))
                    }
                  >
                    Agregar item base
                  </button>
                  <div style={{ ...styles.rightStrong, marginTop: 8 }}>
                    Provision mensual estimada por empleado:{" "}
                    {money(
                      baseProvisionTemplateRows.reduce(
                        (acc, item) => acc + Number(item.monthlyCostPerEmployee || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.label}>Documentacion requerida</div>
                  {employeeBaseConfig.requiredDocuments.map((doc) => (
                    <div key={doc.id} style={styles.configDocRow}>
                      <input
                        style={styles.input}
                        value={doc.name}
                        onChange={(e) =>
                          setEmployeeBaseConfig((prev) => ({
                            ...prev,
                            requiredDocuments: prev.requiredDocuments.map((item) =>
                              item.id === doc.id ? { ...item, name: e.target.value } : item
                            ),
                          }))
                        }
                      />
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          setEmployeeBaseConfig((prev) => ({
                            ...prev,
                            requiredDocuments: prev.requiredDocuments.filter((item) => item.id !== doc.id),
                          }))
                        }
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    style={styles.smallBtn}
                    onClick={() =>
                      setEmployeeBaseConfig((prev) => ({
                        ...prev,
                        requiredDocuments: [
                          ...prev.requiredDocuments,
                          { id: newId(), name: "" },
                        ],
                      }))
                    }
                  >
                    Agregar documento
                  </button>
                </div>
                    */}
                  </Panel>
                </div>
              </div>
            )}

          <div style={{ order: 6, gridColumn: "1 / -1" }}>
              <Panel title="Escalas salariales" span="full">
                <div style={styles.uploadActions}>
                  <label style={styles.buttonLikeLabel}>
                    Cargar PDF de escala
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => handleScalePdfUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                  {uploadMessage && <span style={styles.muted}>{uploadMessage}</span>}
                </div>

                <Field label="Mes de liquidacion">
                  <input
                    style={styles.input}
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                  />
                </Field>

                {(() => {
                  const cats = Array.from(
                    new Set([
                      ...visibleEmployees.map((e) => (e.category || "").trim()).filter(Boolean),
                      ...scaleRows.map((r) => r.category),
                    ])
                  ).sort();
                  if (cats.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={styles.label}>
                        Estado de escalas por categoria · {monthLabel(payrollMonth)}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        {cats.map((cat) => {
                          const s = getScaleSemaphore(cat);
                          return (
                            <div
                              key={cat}
                              style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 10 }}
                            >
                              <Semaforo level={s.level} size={16} ring title={s.label} />
                              <div>
                                <div style={{ fontWeight: 700 }}>{cat}</div>
                                <div style={styles.muted}>{s.label}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Categoria</th>
                      <th>Base hora</th>
                      <th>No remun./hora</th>
                      <th>VHT</th>
                      <th>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaleRows
                      .slice()
                      .sort((a, b) => `${a.month}-${a.category}`.localeCompare(`${b.month}-${b.category}`))
                      .map((row) => (
                        <tr key={row.id}>
                          <td>{monthLabel(row.month)}</td>
                          <td>
                            <select
                              style={styles.input}
                              value={row.category}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, category: e.target.value } : item
                                  )
                                )
                              }
                            >
                              {CATEGORY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.baseHourly}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, baseHourly: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.nonRemHourly}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, nonRemHourly: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.vht}
                              onChange={(e) =>
                                setScaleRows((prev) =>
                                  prev.map((item) =>
                                    item.id === row.id ? { ...item, vht: Number(e.target.value) } : item
                                  )
                                )
                              }
                            />
                          </td>
                          <td>{row.sourceFileName}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Panel>
          </div>

          <div style={{ order: 1, gridColumn: "1 / -1" }}>
          <Panel
            title="Resumen por empresa"
            span="full"
            actions={
              <div style={styles.inlineActions}>
                <ButtonLike onClick={() => exportPersonalReport("General")} secondary>
                  Reporte general
                </ButtonLike>
                {COMPANY_OPTIONS.filter((company) => canAccessCompany(company.value)).map((company) => (
                  <ButtonLike
                    key={`personal-report-${company.value}`}
                    onClick={() => exportPersonalReport(company.value)}
                    secondary
                  >
                    Reporte {company.short}
                  </ButtonLike>
                ))}
              </div>
            }
          >
            <div style={styles.metricGrid}>
              {totalCompanyPayroll.map((row) => {
                const meta = getCompanyMeta(row.company);
                return (
                  <div key={row.company} style={{ ...styles.metric, borderColor: meta.primary, background: meta.soft }}>
                    <div style={{ fontWeight: 800, color: meta.primary }}>{row.label}</div>
                    <div style={styles.muted}>Total neto</div>
                    <div style={{ fontWeight: 700 }}>{money(row.totalNet)}</div>
                    <div style={{ ...styles.muted, marginTop: 6 }}>Impacto empresa</div>
                    <div style={{ fontWeight: 700 }}>{money(row.totalImpact)}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
          </div>

          {!selectedEmployee && (
            <div style={{ order: 2, gridColumn: "1 / -1" }}>
              <Panel
                title="Alta de empleado"
                span="full"
                actions={
                  <ButtonLike onClick={() => setIsEmployeeSetupModalOpen(true)}>
                    Agregar empleado
                  </ButtonLike>
                }
              >
                <div style={styles.muted}>
                  Carga rapida: empresa, legajo, nombre, categoria base y horas nominales. La
                  ficha completa se edita luego desde el boton Abrir.
                </div>
              </Panel>
            </div>
          )}

          {!selectedEmployee && (
          <div style={{ order: 3, gridColumn: "1 / -1" }}>
          {(() => {
            let rojo = 0;
            let amarillo = 0;
            let verde = 0;
            employeesSortedByPay.forEach((employee) => {
              const level = getEmployeeSemaphore(employee).level;
              if (level === "rojo") rojo += 1;
              else if (level === "amarillo") amarillo += 1;
              else verde += 1;
            });
            return (
              <Panel span="full" title="Semaforo de personal">
                <SemaforoResumen
                  items={[
                    { level: "verde", label: "Fichas completas", value: String(verde) },
                    { level: "amarillo", label: "Documentacion por vencer", value: String(amarillo) },
                    { level: "rojo", label: "Falta info / vencidos", value: String(rojo) },
                  ]}
                />
              </Panel>
            );
          })()}
          <Panel title="Empleados" span="full">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Legajo</th>
                  <th>Nombre y apellido</th>
                  <th>Categoria base</th>
                  <th>Antig.</th>
                  <th>Asistencia</th>
                  <th>Documentacion</th>
                  <th>EPP</th>
                  <th>Insumos</th>
                  <th>Hs mes</th>
                  <th>Bruto</th>
                  <th>Neto</th>
                  <th>Impacto</th>
                  <th>Costo hora</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {employeesSortedByPay.map((employee) => {
                  const meta = getCompanyMeta(employee.company);
                  const att = getAttendanceSummary(employee);
                  const docs = getEmployeeDocumentSummary(employee);
                  const epp = getEmployeeProvisionSummary(employee, "EPP");
                  const supplies = getEmployeeProvisionSummary(employee, "Insumos");
                  const salary = getEmployeePayrollSummary(employee);
                  const toneStyle =
                    att.tone === "green"
                      ? styles.statusGreen
                      : att.tone === "red"
                      ? styles.statusRed
                      : att.tone === "yellow"
                      ? styles.statusYellow
                      : att.tone === "blue"
                      ? styles.statusBlue
                      : styles.statusGray;
                  const docsStyle =
                    docs.tone === "green"
                      ? styles.statusGreen
                      : docs.tone === "yellow"
                      ? styles.statusYellow
                      : styles.statusRed;
                  const eppStyle =
                    epp.tone === "green"
                      ? styles.statusGreen
                      : epp.tone === "yellow"
                      ? styles.statusYellow
                      : styles.statusRed;
                  const suppliesStyle =
                    supplies.tone === "green"
                      ? styles.statusGreen
                      : supplies.tone === "yellow"
                      ? styles.statusYellow
                      : styles.statusRed;
                  const payroll = getCurrentPayroll(employee);
                  return (
                    <tr key={employee.id} style={{ background: `${meta.soft}55` }}>
                      <td>
                        <span style={{ ...styles.statusPill, background: meta.soft, color: meta.primary }}>
                          {meta.short}
                        </span>
                      </td>
                      <td>{employee.legajo}</td>
                      <td>
                        {(() => {
                          const se = getEmployeeSemaphore(employee);
                          return (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Semaforo level={se.level} size={10} title={se.label} />
                              <span>{employee.name}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td>{employee.category}</td>
                      <td>{employee.seniorityYears}</td>
                      <td>
                        <span style={{ ...styles.statusPill, ...toneStyle }}>{att.label}</span>
                      </td>
                      <td>
                        <span style={{ ...styles.statusPill, ...docsStyle }}>{docs.label}</span>
                      </td>
                      <td>
                        <span style={{ ...styles.statusPill, ...eppStyle }}>{epp.label}</span>
                      </td>
                      <td>
                        <span style={{ ...styles.statusPill, ...suppliesStyle }}>{supplies.label}</span>
                      </td>
                      <td>{Number((payroll.normalHours + payroll.extra50Hours + payroll.extra100Hours).toFixed(2))}</td>
                      <td>{money(salary.totalGross)}</td>
                      <td>{money(salary.netWithCashBonus)}</td>
                      <td>{money(salary.employerImpact)}</td>
                      <td>{money(salary.hourlyCost)}</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedEmployeeId === employee.id ? (
                          <button style={styles.smallBtn} onClick={() => setSelectedEmployeeId(null)}>
                            Cerrar
                          </button>
                        ) : (
                          <button style={styles.smallBtn} onClick={() => setSelectedEmployeeId(employee.id)}>
                            Abrir
                          </button>
                        )}
                        <button style={styles.smallBtn} onClick={() => removeEmployee(employee.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          </div>
          )}

          {selectedEmployee && (
            <div style={{ order: 3, gridColumn: "1 / -1" }}>
            <Panel
              span="full"
              title={`Ficha del empleado: ${selectedEmployee.name || "Empleado"}`}
              actions={<ButtonLike onClick={() => setSelectedEmployeeId(null)} secondary>Cerrar ficha</ButtonLike>}
            >
              {(() => {
                const meta = getCompanyMeta(selectedEmployee.company);
                const semaphore = getAttendanceSummary(selectedEmployee);
                const documentSemaphore = getEmployeeDocumentSummary(selectedEmployee);
                const semaphoreStyle =
                  semaphore.tone === "green"
                    ? styles.statusGreen
                    : semaphore.tone === "red"
                    ? styles.statusRed
                    : semaphore.tone === "yellow"
                    ? styles.statusYellow
                    : semaphore.tone === "blue"
                    ? styles.statusBlue
                    : styles.statusGray;
                const payroll = getCurrentPayroll(selectedEmployee);
                const payrollSummary = getEmployeePayrollSummary(selectedEmployee);
                const eppSummary = getEmployeeProvisionSummary(selectedEmployee, "EPP");
                const suppliesSummary = getEmployeeProvisionSummary(selectedEmployee, "Insumos");
                const attendanceWeeks = attendanceMonthData.weeks;

                return (
                  <>
                    <div style={{ ...styles.semaphoreBanner, background: meta.soft, borderColor: meta.primary, color: meta.primary }}>
                      <span style={{ ...styles.statusPill, ...semaphoreStyle }}>{semaphore.label}</span>
                      <span
                        style={{
                          ...styles.statusPill,
                          ...(documentSemaphore.tone === "green"
                            ? styles.statusGreen
                            : documentSemaphore.tone === "yellow"
                            ? styles.statusYellow
                            : styles.statusRed),
                        }}
                      >
                        {documentSemaphore.label}
                      </span>
                      <span style={{ ...styles.statusPill, ...(eppSummary.tone === "green" ? styles.statusGreen : eppSummary.tone === "yellow" ? styles.statusYellow : styles.statusRed) }}>
                        EPP: {eppSummary.label}
                      </span>
                      <span style={{ ...styles.statusPill, ...(suppliesSummary.tone === "green" ? styles.statusGreen : suppliesSummary.tone === "yellow" ? styles.statusYellow : styles.statusRed) }}>
                        Insumos: {suppliesSummary.label}
                      </span>
                      <strong>{meta.short}</strong>
                      <span>Liquidacion: {monthLabel(payrollMonth)}</span>
                      <span>Categoria: {selectedEmployee.category}</span>
                    </div>

                    <div style={styles.personalFichaStack}>
                      <Panel title="Datos basicos empleado" span="full" nested>
                        <TwoCol>
                          <Field label="Empresa">
                            <select
                              style={styles.input}
                              value={selectedEmployee.company}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "company", e.target.value)}
                            >
                              {COMPANY_OPTIONS.map((company) => (
                                <option key={company.value} value={company.value}>
                                  {company.value}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Legajo">
                            <input
                              style={styles.input}
                              value={selectedEmployee.legajo}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "legajo", e.target.value)}
                            />
                          </Field>
                          <Field label="Nombre y apellido">
                            <input
                              style={styles.input}
                              value={selectedEmployee.name}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "name", e.target.value)}
                            />
                          </Field>
                          <Field label="Categoria base">
                            <select
                              style={styles.input}
                              value={selectedEmployee.category}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "category", e.target.value)}
                            >
                              {CATEGORY_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Horas nominales">
                            <input
                              style={styles.input}
                              type="number"
                              value={selectedEmployee.nominalHours}
                              onChange={(e) =>
                                updateEmployeeField(
                                  selectedEmployee.id,
                                  "nominalHours",
                                  Number(e.target.value)
                                )
                              }
                            />
                          </Field>
                        </TwoCol>

                        <div style={styles.employeeSubsection}>
                          <div style={styles.panelHeader}>
                            <h4 style={{ margin: 0, fontSize: 15 }}>Documentacion importante</h4>
                            <ButtonLike
                              onClick={() =>
                                setEmployeeDocumentModal({
                                  employeeId: selectedEmployee.id,
                                  name: "",
                                  dueDate: "",
                                })
                              }
                              secondary
                            >
                              Agregar documento
                            </ButtonLike>
                          </div>

                          {selectedEmployee.documents.length === 0 ? (
                            <div style={styles.empty}>Todavia no hay documentacion importante cargada.</div>
                          ) : (
                            selectedEmployee.documents.map((doc) => {
                              const docState = getEmployeeDocumentState(doc);
                              const docTone =
                                docState === "vigente"
                                  ? styles.statusGreen
                                  : docState === "vence_pronto"
                                  ? styles.statusYellow
                                  : styles.statusRed;
                              return (
                                <div key={doc.id} style={styles.subCard}>
                                  <div style={styles.inlineActions}>
                                    <button
                                      style={styles.smallBtn}
                                      onClick={() => removeEmployeeDocument(selectedEmployee.id, doc.id)}
                                    >
                                      Quitar documento
                                    </button>
                                  </div>
                                  <TwoCol>
                                    <Field label="Documento">
                                      <input
                                        style={styles.input}
                                        value={doc.name}
                                        onChange={(e) =>
                                          updateEmployeeDocument(
                                            selectedEmployee.id,
                                            doc.id,
                                            "name",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Field>
                                    <Field label="Vencimiento">
                                      <input
                                        style={styles.input}
                                        type="date"
                                        value={doc.dueDate}
                                        onChange={(e) =>
                                          updateEmployeeDocument(
                                            selectedEmployee.id,
                                            doc.id,
                                            "dueDate",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </Field>
                                  </TwoCol>
                                  <div style={styles.uploadActions}>
                                    <span style={{ ...styles.statusPill, ...docTone }}>{docState}</span>
                                    <FileDropButton
                                      label="Cargar documento"
                                      fileName={doc.attachmentName}
                                      accept="image/*,.pdf,application/pdf"
                                      onFileSelected={(file) =>
                                        handleEmployeeDocumentUpload(selectedEmployee.id, doc.id, file)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div style={styles.employeeSubsection}>
                          <div style={styles.panelHeader}>
                            <h4 style={{ margin: 0, fontSize: 15 }}>EPP e insumos de seguridad</h4>
                            <div style={styles.inlineActions}>
                              <ButtonLike
                                onClick={() =>
                                  setEmployeeProvisionModal({
                                    employeeId: selectedEmployee.id,
                                    kind: "EPP",
                                    title: "",
                                    dueDate: "",
                                    unitPrice: 0,
                                  })
                                }
                                secondary
                              >
                                Agregar EPP
                              </ButtonLike>
                              <ButtonLike
                                onClick={() =>
                                  setEmployeeProvisionModal({
                                    employeeId: selectedEmployee.id,
                                    kind: "Insumos",
                                    title: "",
                                    dueDate: "",
                                    unitPrice: 0,
                                  })
                                }
                              >
                                Agregar insumo
                              </ButtonLike>
                            </div>
                          </div>

                          {selectedEmployee.provisionItems.length === 0 ? (
                            <div style={styles.empty}>No hay entregas cargadas.</div>
                          ) : (
                            selectedEmployee.provisionItems.map((item) => {
                              const stockItem = getStockPersonalItemForCompany(item.stockCode, selectedEmployee.company);
                              const requirement = employeeBaseConfig.provisionTemplates.find(
                                (template) => template.stockCode === item.stockCode && template.kind === item.kind
                              );
                              const stockEnough = Number(stockItem?.quantity || 0) >= Number(requirement?.quantity || item.quantity || 0);
                              return (
                                <div key={item.id} style={styles.subCard}>
                                  <div style={styles.grid2}>
                                    <Field label="Item">
                                      <select
                                        style={styles.input}
                                        value={item.stockCode}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "stockCode", e.target.value)
                                        }
                                      >
                                        {stockPersonalItems.map((stock) => (
                                          <option key={stock.code} value={stock.code}>
                                            {stock.description}
                                          </option>
                                        ))}
                                      </select>
                                    </Field>
                                    <Field label="Tipo">
                                      <input style={styles.inputReadOnly} value={item.kind} readOnly />
                                    </Field>
                                    <Field label="Cantidad entregada">
                                      <input
                                        style={styles.input}
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "quantity", Number(e.target.value))
                                        }
                                      />
                                    </Field>
                                    <Field label="Vigencia / vence">
                                      <input
                                        style={styles.input}
                                        type="date"
                                        value={item.dueDate}
                                        onChange={(e) =>
                                          updateEmployeeProvisionItem(selectedEmployee.id, item.id, "dueDate", e.target.value)
                                        }
                                      />
                                    </Field>
                                  </div>
                                  <div style={styles.uploadActions}>
                                    <span style={{ ...styles.statusPill, ...(stockEnough ? styles.statusGreen : styles.statusRed) }}>
                                      {stockEnough ? `Reposicion disponible (${Number(stockItem?.quantity || 0)})` : `Reposicion faltante (${Number(stockItem?.quantity || 0)})`}
                                    </span>
                                    <span style={styles.muted}>
                                      Precio stock: {stockItem ? money(stockItem.unitPrice) : "-"}
                                    </span>
                                    <label style={styles.buttonLikeLabel}>
                                      Cargar certificado
                                      <input
                                        type="file"
                                        style={{ display: "none" }}
                                        onChange={(e) =>
                                          handleEmployeeProvisionUpload(
                                            selectedEmployee.id,
                                            item.id,
                                            e.target.files?.[0] || null
                                          )
                                        }
                                      />
                                    </label>
                                    {item.attachmentName && <div style={styles.fileName}>{item.attachmentName}</div>}
                                    <button
                                      style={styles.smallBtn}
                                      onClick={() => removeEmployeeProvisionItem(selectedEmployee.id, item.id)}
                                    >
                                      Quitar item
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </Panel>

                    </div>

                    <div style={styles.personalAttendancePayrollGrid}>
                      <div style={styles.personalAttendancePane}>
                    <Panel title="Presentismo y ausencias" span="full" nested>
                      <div style={styles.attendanceToolbar}>
                        <div>
                          <div style={styles.attendanceMonthTitle}>
                            {attendanceMonthData.labelUpper}
                          </div>
                          <div style={styles.muted}>
                            Al guardar el mes quedara registrado como {attendanceMonthData.label}.
                          </div>
                        </div>
                        <div style={styles.inlineActions}>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(shiftMonthKey(payrollMonth, -1))}
                          >
                            Mes anterior
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(localMonthKey())}
                          >
                            Mes actual
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => setPayrollMonth(shiftMonthKey(payrollMonth, 1))}
                          >
                            Mes siguiente
                          </button>
                        </div>
                      </div>
                      <div style={styles.attendanceWeekdayHeader}>
                        {attendanceMonthData.weekdays.map((weekday) => (
                          <div key={weekday} style={styles.attendanceWeekdayCell}>
                            {weekday}
                          </div>
                        ))}
                      </div>
                      <div style={styles.attendanceCalendar}>
                        {attendanceWeeks.map((week, weekIndex) => (
                          <div key={`attendance-week-${weekIndex}`} style={styles.attendanceWeek}>
                            <div style={styles.attendanceWeekTitle}>Semana {weekIndex + 1}</div>
                            <div style={styles.attendanceWeekGrid}>
                              {week.map((day, dayIndex) => {
                                if (!day) {
                                  return (
                                    <div
                                      key={`attendance-empty-${weekIndex}-${dayIndex}`}
                                      style={styles.attendanceEmptyCard}
                                    />
                                  );
                                }
                                const record = getAttendanceRecord(selectedEmployee, day.key);
                                const status = record?.status || "sin_cargar";
                                const statusStyle =
                                  status === "presente"
                                    ? styles.statusGreen
                                    : status === "ausente_injustificado"
                                    ? styles.statusRed
                                    : status === "ausente_justificado"
                                    ? styles.statusYellow
                                    : status === "vacaciones"
                                    ? styles.statusBlue
                                    : styles.statusGray;
                                return (
                                  <div key={day.key} style={styles.attendanceCard}>
                                    <div style={styles.attendanceDayTitle}>
                                      <strong>{day.day}</strong> {day.weekday}
                                    </div>
                                    <select
                                      style={styles.input}
                                      value={status}
                                      onChange={(e) =>
                                        updateAttendanceRecord(selectedEmployee.id, day.key, "status", e.target.value)
                                      }
                                    >
                                      <option value="sin_cargar">Sin cargar</option>
                                      <option value="presente">Presente</option>
                                      <option value="ausente_injustificado">Ausente sin justificar</option>
                                      <option value="ausente_justificado">Ausente justificado</option>
                                      <option value="vacaciones">Vacaciones</option>
                                    </select>
                                    <div style={{ marginTop: 8 }}>
                                      <span style={{ ...styles.statusPill, ...statusStyle }}>
                                        {status.replaceAll("_", " ")}
                                      </span>
                                    </div>
                                    <div style={styles.attendanceHoursGrid}>
                                      <Field label="Normales">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.normalHours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "normalHours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                      <Field label="50%">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.extra50Hours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "extra50Hours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                      <Field label="100%">
                                        <input
                                          style={styles.input}
                                          type="number"
                                          min={0}
                                          step={0.5}
                                          value={record?.extra100Hours ?? 0}
                                          onChange={(e) =>
                                            updateAttendanceRecord(
                                              selectedEmployee.id,
                                              day.key,
                                              "extra100Hours",
                                              Number(e.target.value)
                                            )
                                          }
                                        />
                                      </Field>
                                    </div>

                                    {status === "ausente_justificado" && (
                                      <div style={{ marginTop: 8 }}>
                                        <FileDropButton
                                          label="Cargar justificativo"
                                          fileName={record?.attachmentName}
                                          accept="image/*,.pdf,application/pdf"
                                          onFileSelected={(file) =>
                                            handleAttendanceAttachment(
                                              selectedEmployee.id,
                                              day.key,
                                              file
                                            )
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                      </div>

                      <div style={styles.personalPayrollPane}>
                        <Panel title="Liquidacion del mes" span="full" nested>
                          <div style={styles.liquidationColumn}>
                            <Field label="Horas normales (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.normalHours}
                                readOnly
                              />
                            </Field>
                            <Field label="Horas extra 50 (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.extra50Hours}
                                readOnly
                              />
                            </Field>
                            <Field label="Horas extra 100 (desde calendario)">
                              <input
                                style={styles.inputReadOnly}
                                type="number"
                                value={payroll.extra100Hours}
                                readOnly
                              />
                            </Field>
                            <Field label="Horas feriado">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.holidayHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "holidayHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Hs nocturnas 50">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.night50Hours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "night50Hours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Hs nocturnas">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.nightHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "nightHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Ausencias injustificadas (hs)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.unjustifiedAbsenceHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "unjustifiedAbsenceHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Ausencias justificadas (hs)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.justifiedAbsenceHours}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "justifiedAbsenceHours",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Vacaciones (dias)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.vacationsDays}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "vacationsDays",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Presentismo %">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.presentismoPctOverride ?? 0}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "presentismoPctOverride",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Anticipos">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.anticipos}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "anticipos",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Premio en efectivo (negro)">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.cashBonus}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "cashBonus",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Impacto empresa %">
                              <input
                                style={styles.input}
                                type="number"
                                value={payroll.employerExtraPct}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "employerExtraPct",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </Field>
                            <Field label="Notas de liquidacion">
                              <textarea
                                style={styles.textarea}
                                value={payroll.notes}
                                onChange={(e) =>
                                  updateEmployeePayrollManual(
                                    selectedEmployee.id,
                                    payrollMonth,
                                    "notes",
                                    e.target.value
                                  )
                                }
                              />
                            </Field>
                          </div>

                          <div style={{ ...styles.metricGrid, marginTop: 12 }}>
                            <MiniMetric label="Neto blanco" value={money(payrollSummary.net)} />
                            <MiniMetric label="Premio negro" value={money(payrollSummary.cashBonus)} />
                            <MiniMetric label="Total empleado" value={money(payrollSummary.netWithCashBonus)} />
                          </div>

                          {payroll.manualOverride && (
                            <div style={{ marginTop: 10 }}>
                              <span style={{ ...styles.statusPill, ...styles.statusYellow }}>
                                Corregido manualmente
                              </span>
                            </div>
                          )}

                          <div style={{ ...styles.inlineActions, marginTop: 12 }}>
                            <ButtonLike
                              onClick={() => saveEmployeePayrollMonth(selectedEmployee.id, payrollMonth)}
                            >
                              Guardar mes
                            </ButtonLike>
                            {payroll.savedAt && (
                              <span style={styles.muted}>
                                Guardado: {formatDateTimeDisplay(payroll.savedAt)}
                              </span>
                            )}
                          </div>

                          {selectedEmployee.payrolls.filter((item) => item.savedAt).length > 0 && (
                            <div style={styles.savedMonthsList}>
                              <strong>Meses guardados</strong>
                              {selectedEmployee.payrolls
                                .filter((item) => item.savedAt)
                                .slice()
                                .sort((a, b) => b.month.localeCompare(a.month))
                                .map((item) => (
                                  <button
                                    key={`${selectedEmployee.id}-${item.month}`}
                                    style={styles.smallBtn}
                                    onClick={() => setPayrollMonth(item.month)}
                                  >
                                    {monthLabel(item.month)} -{" "}
                                    {item.manualOverride ? "corregido manualmente" : "desde calendario"}
                                  </button>
                                ))}
                            </div>
                          )}
                        </Panel>
                      </div>
                    </div>

                    <div style={styles.personalFichaStack}>
                      <Panel title="Sueldo e impacto empresa" nested>
                        <div style={styles.metricGrid}>
                          <MiniMetric label="Escala mes" value={payrollSummary.scale ? `${payrollSummary.scale.category} · ${monthLabel(payrollSummary.scale.month)}` : "Manual"} />
                          <MiniMetric label="Hora base" value={money(payrollSummary.baseHourly)} />
                          <MiniMetric label="No remun./hora" value={money(payrollSummary.nonRemHourly)} />
                          <MiniMetric label="Hora neta ref." value={money(payrollSummary.netHourly)} />
                          <MiniMetric label="Bruto remunerativo" value={money(payrollSummary.grossRem)} />
                          <MiniMetric label="No remunerativo" value={money(payrollSummary.nonRem)} />
                          <MiniMetric label="Aportes empresa" value={money(payrollSummary.employerContrib + payrollSummary.employerInsurance)} />
                            <MiniMetric label="Provision mensual" value={money(payrollSummary.monthlyProvisionCost)} />
                            <MiniMetric label="SAC mensual" value={money(payrollSummary.monthlySACProration)} />
                            <MiniMetric label="Aguinaldo anual" value={money(payrollSummary.annualSACBase)} />
                          <MiniMetric label="Neto" value={money(payrollSummary.net)} />
                          <MiniMetric label="Impacto empresa" value={money(payrollSummary.employerImpact)} />
                          <MiniMetric label="Costo hora" value={money(payrollSummary.hourlyCost)} />
                        </div>
                        <Field label="Experiencias y destrezas">
                          <textarea style={styles.textarea} value={selectedEmployee.skills} onChange={(e) => updateEmployeeField(selectedEmployee.id, "skills", e.target.value)} />
                        </Field>
                        <Field label="Observaciones">
                          <textarea style={styles.textarea} value={selectedEmployee.notes} onChange={(e) => updateEmployeeField(selectedEmployee.id, "notes", e.target.value)} />
                        </Field>
                      </Panel>
                    </div>
                  </>
                );
              })()}
            </Panel>
            </div>
          )}
        </div>
      )}

        </div>

        {isSupabaseLoggedIn && (
        <aside
          style={{
            ...styles.communicationRail,
            width: isCommunicationExpanded ? 252 : 88,
            background: workspaceTheme.sidebarGradient,
          }}
          onMouseEnter={() => setIsCommunicationExpanded(true)}
          onMouseLeave={() => setIsCommunicationExpanded(false)}
        >
          <div style={styles.communicationRailTitle}>
            {isCommunicationExpanded ? "💬" : "💬"}
          </div>

          <div style={styles.communicationSection}>
            <button
              type="button"
              style={{
                ...styles.communicationSectionButton,
                justifyContent: isCommunicationExpanded ? "space-between" : "center",
                padding: isCommunicationExpanded ? "12px 14px" : "12px 10px",
              }}
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              <span>{isCommunicationExpanded ? "🔔 Notificaciones" : "🔔"}</span>
              {unreadNotificationCount > 0 && (
                <span style={styles.workspaceWidgetBadge}>{unreadNotificationCount}</span>
              )}
              </button>
              {isCommunicationExpanded && notificationsOpen && (
                <div style={styles.communicationCard}>
                  <div style={styles.workspaceWidgetTitle}>Cambios del sistema</div>
                  <div style={styles.chatStatus}>
                    Solo avisos de cambios guardados en el sistema compartido.
                  </div>
                  <div style={styles.notificationsList}>
                    {notifications.length === 0 ? (
                      <div style={styles.empty}>Todavia no hay notificaciones.</div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={`notification-${notification.id}`}
                          style={{
                            ...styles.notificationItem,
                            ...(notification.read ? {} : styles.notificationItemUnread),
                          }}
                        >
                          <div>{notification.text}</div>
                          <div style={styles.chatTimestamp}>
                            {formatDateTimeDisplay(notification.created_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          <div style={styles.communicationSection}>
            <button
              type="button"
              style={{
                ...styles.communicationSectionButton,
                justifyContent: isCommunicationExpanded ? "space-between" : "center",
                padding: isCommunicationExpanded ? "12px 14px" : "12px 10px",
              }}
              onClick={() => {
                setSelectedChatRecipientId(null);
                setSelectedChatRecipientName("Canal general");
                setWorkspaceWidgetMode("chat");
                setWorkspaceWidgetOpen(true);
              }}
            >
              <span>{isCommunicationExpanded ? "💬 Chats" : "💬"}</span>
              {(groupUnreadCount + Object.values(privateUnreadByUser).reduce((acc, value) => acc + value, 0)) > 0 && (
                <span style={styles.workspaceWidgetBadge}>
                  {groupUnreadCount + Object.values(privateUnreadByUser).reduce((acc, value) => acc + value, 0)}
                  </span>
                )}
              </button>

              {isCommunicationExpanded && (
                <div className="communication-contacts-list" style={styles.communicationContactsList}>
                  <button
                    type="button"
                    style={{
                      ...styles.chatContactBubble,
                      ...(selectedChatRecipientId === null ? styles.chatContactBubbleActive : {}),
                    }}
                    onClick={() => {
                      setSelectedChatRecipientId(null);
                      setSelectedChatRecipientName("Canal general");
                      void markGroupChatAsRead().then(() => {
                        void loadSupabaseChatMessages();
                      });
                      setWorkspaceWidgetMode("chat");
                      setWorkspaceWidgetOpen(true);
                      setShowChatContacts(true);
                    }}
                    title="Canal general"
                  >
                    <span style={styles.chatContactAvatar}>GR</span>
                    <span style={styles.chatContactLabel}>Canal general</span>
                    {groupUnreadCount > 0 && (
                      <span style={styles.chatContactUnread}>{groupUnreadCount}</span>
                    )}
                  </button>
                  {chatPeers.map((peer) => {
                    const unreadCount = privateUnreadByUser[peer.user_id] || 0;
                    const initials = (peer.full_name || peer.email || "U")
                      .split(" ")
                      .map((item) => item[0] || "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <button
                        key={`peer-bubble-${peer.user_id}`}
                        type="button"
                        style={{
                          ...styles.chatContactBubble,
                          ...(selectedChatRecipientId === peer.user_id
                            ? styles.chatContactBubbleActive
                            : {}),
                        }}
                        onClick={() => {
                          setSelectedChatRecipientId(peer.user_id);
                          setSelectedChatRecipientName(peer.full_name || peer.email || "Usuario");
                          void markChatThreadAsRead(peer.user_id).then(() => {
                            void loadSupabaseChatMessages();
                          });
                          setWorkspaceWidgetMode("chat");
                          setWorkspaceWidgetOpen(true);
                          setShowChatContacts(true);
                        }}
                        title={peer.full_name || peer.email}
                      >
                        <span style={styles.chatContactAvatar}>{initials}</span>
                        <span style={styles.chatContactLabel}>
                          {peer.full_name || peer.email || "Usuario"}
                        </span>
                        {unreadCount > 0 && (
                          <span style={styles.chatContactUnread}>{unreadCount}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {isSupabaseLoggedIn && isChatWidgetVisible && (
        <div style={styles.chatOverlay}>
          <div style={styles.workspaceWidgetHeader}>
            <div>
              <div style={styles.workspaceWidgetTitle}>Chat interno</div>
              <div style={styles.chatStatus}>
                {selectedChatRecipientId
                  ? `Chat privado con ${selectedChatRecipientName}`
                  : "Canal grupal del sistema"}
              </div>
            </div>
            <div style={styles.workspaceWidgetTabs}>
              {selectedChatRecipientId && (
                <ButtonLike
                  onClick={() => {
                    setSelectedChatRecipientId(null);
                    setSelectedChatRecipientName("Canal general");
                  }}
                  secondary
                >
                  Volver al grupal
                </ButtonLike>
              )}
              <button
                type="button"
                style={styles.workspaceWidgetClose}
                onClick={() => setWorkspaceWidgetOpen(false)}
              >
                Minimizar
              </button>
            </div>
          </div>
          <div style={styles.workspaceWidgetBody}>
            <div style={styles.chatPanel}>
              <div style={styles.chatMessagesLarge}>
                {visibleChatMessages.length === 0 ? (
                  <div style={styles.empty}>
                    {selectedChatRecipientId
                      ? "Todavia no hay mensajes privados en esta conversacion."
                      : "Todavia no hay mensajes internos. Puedes usar este chat para coordinar cambios mientras varias personas trabajan al mismo tiempo."}
                  </div>
                ) : (
                  visibleChatMessages.map((message) => {
                    const isOwnMessage =
                      message.user_id && message.user_id === supabaseSession?.user?.id;
                    return (
                      <div
                        key={`chat-${message.id}`}
                        style={{
                          ...styles.chatMessage,
                          ...(isOwnMessage ? styles.chatMessageOwn : styles.chatMessageOther),
                        }}
                      >
                        <div style={styles.chatMessageHeader}>
                          <strong>
                            {message.full_name || message.email}
                            {message.recipient_user_id
                              ? ` -> ${message.recipient_full_name || "Privado"}`
                              : ""}
                          </strong>
                          <span style={styles.chatTimestamp}>
                            {formatDateTimeDisplay(message.created_at)}
                          </span>
                        </div>
                        <div>{message.message}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={styles.chatComposer}>
                <div style={styles.chatStatus}>
                  Destino: {selectedChatRecipientId ? selectedChatRecipientName : "Canal general"}
                </div>
                <textarea
                  style={styles.chatTextarea}
                  value={supabaseChatDraft}
                  onChange={(e) => setSupabaseChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendSupabaseChatMessage();
                    }
                  }}
                  placeholder={
                    selectedChatRecipientId
                      ? "Escribe un mensaje privado..."
                      : "Escribe un mensaje rapido para el equipo..."
                  }
                />
                <div style={styles.chatActions}>
                  <ButtonLike onClick={loadSupabaseChatMessages} secondary>
                    Actualizar
                  </ButtonLike>
                  <ButtonLike onClick={sendSupabaseChatMessage}>Enviar</ButtonLike>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSupabaseLoggedIn && isAssistantWidgetVisible && (
        <div style={styles.assistantOverlay}>
          <div style={styles.workspaceWidgetHeader}>
            <div>
              <div style={styles.workspaceWidgetTitle}>Asistente del sistema</div>
              <div style={styles.chatStatus}>Consultas, avisos y soporte operativo</div>
            </div>
            <button
              type="button"
              style={styles.workspaceWidgetClose}
              onClick={() => setWorkspaceWidgetOpen(false)}
            >
              Minimizar
            </button>
          </div>
          <div style={styles.workspaceWidgetBody}>
            <div style={styles.chatPanel}>
              <div style={styles.assistantHint}>
                Preguntale por presupuestos, stock, caja chica, compras, CRM, usuarios activos o guardado compartido.
              </div>
              <div style={styles.assistantMessages}>
                {assistantMessages.map((message) => (
                  <div
                    key={`assistant-${message.id}`}
                    style={{
                      ...styles.assistantMessage,
                      ...(message.role === "assistant"
                        ? styles.assistantMessageBot
                        : styles.assistantMessageUser),
                    }}
                  >
                    <div style={styles.chatMessageHeader}>
                      <strong>
                        {message.role === "assistant"
                          ? "Asistente del sistema"
                          : "Tu consulta"}
                      </strong>
                      <span style={styles.chatTimestamp}>
                        {formatDateTimeDisplay(message.created_at)}
                      </span>
                    </div>
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>
              <div style={styles.assistantComposer}>
                <textarea
                  style={styles.chatTextarea}
                  value={assistantDraft}
                  onChange={(e) => setAssistantDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendAssistantQuestion();
                    }
                  }}
                  placeholder="Ejemplo: decime cuantos presupuestos hay, quien esta operando o como esta caja chica..."
                />
                <div style={styles.chatActions}>
                  <ButtonLike onClick={sendAssistantQuestion}>
                    Consultar asistente
                  </ButtonLike>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {createPortal(
        <div id="client-budget-pdf" style={{ display: "none" }}>
          <BudgetDocument
            budget={budget}
            sections={workingBudgetSections}
            consolidatedTotals={consolidatedBudgetTotals}
            vatPct={vatPct}
            estimatedDeliveryDate={budgetEstimatedDeliveryDate}
            companyTheme={companyTheme}
          />
        </div>,
        document.body
      )}

      <PrintReport id="report-cashflow" title="Reporte - Cash flow y resultados">
        <div style={styles.metricGrid}>
          <MiniMetric label="Facturado bruto" value={money(cashFlowSummary.billedGross)} />
          <MiniMetric label="Cobrado" value={money(cashFlowSummary.collected)} />
          <MiniMetric label="Pendiente" value={money(cashFlowSummary.pendingCollections)} />
          <MiniMetric label="Compras" value={money(cashFlowSummary.purchaseInvoicesTotal)} />
          <MiniMetric label="Caja negra" value={money(cashFlowSummary.pettyCashBlackTotal)} />
          <MiniMetric label="Caja blanca" value={money(cashFlowSummary.pettyCashWhiteTotal)} />
          <MiniMetric label="Comisiones" value={money(cashFlowSummary.commissionsPending)} />
          <MiniMetric label="Resultado" value={money(cashFlowSummary.operatingResult)} />
        </div>
        <div style={{ ...styles.metricGrid, marginTop: 12 }}>
          <MiniMetric label="Creditos banco" value={money(cashFlowSummary.bankCredits)} />
          <MiniMetric label="Debitos banco" value={money(cashFlowSummary.bankDebits)} />
          <MiniMetric label="Ultimo saldo banco" value={money(bankStatementSummary.lastBalance)} />
          <MiniMetric label="Resultado blanco" value={money(cashFlowSummary.operatingResultWhite)} />
          <MiniMetric label="Resultado negro" value={money(cashFlowSummary.operatingResultBlack)} />
          <MiniMetric
            label="Compromisos año"
            value={money(annualDebtRows.reduce((acc, item) => acc + Number(item.amount || 0), 0))}
          />
        </div>
      </PrintReport>

      <PrintReport id="report-compras" title="Reporte - Compras">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Material</th>
              <th>Empresas</th>
              <th>Requerido</th>
              <th>Stock</th>
              <th>Faltante</th>
              <th>Costo estimado</th>
            </tr>
          </thead>
          <tbody>
            {stockNeedRows.map((row) => (
              <tr key={row.description}>
                <td>{row.description}</td>
                <td>{row.companyLabels.join(", ")}</td>
                <td>{row.required} {row.unit}</td>
                <td>{row.available} {row.unit}</td>
                <td>{row.missing} {row.unit}</td>
                <td>{money(row.estimatedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-caja-chica" title="Reporte - Caja chica">
        <div style={styles.metricGrid}>
          <MiniMetric label="Monto asignado" value={money(pettyCashSummary.assignedTotal)} />
          <MiniMetric label="Rendido" value={money(pettyCashSummary.renderedTotal)} />
          <MiniMetric label="Saldo" value={money(pettyCashSummary.pendingBalance)} />
          <MiniMetric label="Blanco" value={money(pettyCashSummary.whiteTotal)} />
          <MiniMetric label="Negro" value={money(pettyCashSummary.blackTotal)} />
        </div>
        <table style={{ ...styles.table, marginTop: 12 }}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>Caja chica</th>
              <th>Responsable</th>
              <th>Descripcion</th>
              <th>Admin.</th>
              <th>Factura</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {visiblePettyCashExpenses.map((item) => {
              const fund = visiblePettyCashFunds.find((row) => row.id === item.fundId);
              return (
                <tr key={item.id}>
                  <td>{getCompanyMeta(item.company).short}</td>
                  <td>{formatDateDisplay(item.date)}</td>
                  <td>{fund?.description || "-"}</td>
                  <td>{fund?.responsible || "-"}</td>
                  <td>{item.description}</td>
                  <td>{item.administration}</td>
                  <td>{item.invoiceNumber || "-"}</td>
                  <td>{money(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-marcadores" title="Reporte - Marcadores">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {fixedMarkersByGroup.map((row) => (
              <tr key={row.group}>
                <td>{row.group}</td>
                <td>{money(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-historial" title="Reporte - Historial de presupuestos">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Numero</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Proyecto</th>
              <th>Comision</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibleSavedBudgets.map((item, index) => (
              <tr key={`budget-history-report-${item.id}-${index}`}>
                <td>{getCompanyMeta(item.company).short}</td>
                <td>{getSavedBudgetDisplayLabel(item)}</td>
                <td>{formatDateDisplay(item.date)}</td>
                <td>{item.client}</td>
                <td>{item.snapshot.budget.contactName || "-"}</td>
                <td>{item.project}</td>
                <td>{money(item.commissionAmount)}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-crm" title="Reporte - CRM de clientes">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Contacto</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>CUIT/CUIL</th>
              <th>Presupuestos</th>
              <th>Pend. exportar</th>
              <th>Compro</th>
              <th>Gasto acumulado</th>
              <th>Ultimo enviado</th>
            </tr>
          </thead>
          <tbody>
            {crmClientRows.map((row) => (
              <tr key={`crm-report-${row.key}`}>
                <td>{row.client}</td>
                <td>{row.customerType}</td>
                <td>{row.contactName || "-"}</td>
                <td>{row.contactPhone || "-"}</td>
                <td>{row.contactEmail || "-"}</td>
                <td>{row.clientTaxId || "-"}</td>
                <td>{row.quotes.length}</td>
                <td>{!row.latestQuote?.exportedAt ? "Pendiente" : "Entregado"}</td>
                <td>{row.bought ? "Si" : "No"}</td>
                <td>{money(row.totalSpent)}</td>
                <td>{row.latestQuote ? getSavedBudgetDisplayLabel(row.latestQuote) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-aprobados" title="Reporte - Trabajos aprobados">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Presupuesto</th>
              <th>Cliente</th>
              <th>Aprobacion</th>
              <th>Entrega</th>
              <th>Neto presupuesto</th>
              <th>Comision</th>
              <th>Comision pend.</th>
              <th>Estado</th>
              <th>Facturado</th>
              <th>Cobrado</th>
            </tr>
          </thead>
          <tbody>
            {approvedJobsSummary.map((job) => (
              <tr key={job.id}>
                <td>{getCompanyMeta(job.company).short}</td>
                <td>{job.isUpdate ? `${job.budgetNumber} · Act. ${job.revisionNumber - 1}` : job.budgetNumber}</td>
                <td>{job.client}</td>
                <td>{formatDateDisplay(job.approvalDate)}</td>
                <td>{formatDateDisplay(job.deliveryDate)}</td>
                <td>{money(job.soldNetPrice)}</td>
                <td>{money(job.commissionAmount)}</td>
                <td>{money(job.commissionPending)}</td>
                <td>{job.executionStatus}</td>
                <td>{money(job.billedGross)}</td>
                <td>{money(job.collectedTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-fabricacion" title="Reporte - Fabricacion">
        <div style={styles.metricGrid}>
          <MiniMetric label="Trabajos activos" value={String(fabricationOpenJobsCount)} />
          <MiniMetric label="En curso" value={String(fabricationInProgressCount)} />
          <MiniMetric label="Compras pendientes" value={String(fabricationPendingPurchases.length)} />
          <MiniMetric label="Compras realizadas" value={String(fabricationCompletedPurchases.length)} />
          <MiniMetric label="Ocupacion usada" value={`${occupancyPct.toFixed(1)}%`} />
          <MiniMetric label="Ocupacion disponible" value={`${fabricationOccupancyAvailablePct.toFixed(1)}%`} />
        </div>
        <div style={{ marginTop: 20 }}>
          <strong>Calendario y seguimiento</strong>
          <table style={{ ...styles.table, marginTop: 8 }}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Presupuesto</th>
                <th>Cliente</th>
                <th>Inicio</th>
                <th>Entrega</th>
                <th>Encargado</th>
                <th>Estado</th>
                <th>Faltantes</th>
              </tr>
            </thead>
            <tbody>
              {fabricationCalendarRows.map((job) => (
                <tr key={job.id}>
                  <td>{getCompanyMeta(job.company).short}</td>
                  <td>{job.budgetNumber}</td>
                  <td>{job.client}</td>
                  <td>{formatDateDisplay(job.startDate)}</td>
                  <td>{formatDateDisplay(job.deliveryDate)}</td>
                  <td>{job.projectManager || "-"}</td>
                  <td>{job.executionStatus}</td>
                  <td>{job.materialMissingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 20 }}>
          <strong>Compras pendientes</strong>
          <table style={{ ...styles.table, marginTop: 8 }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Empresas</th>
                <th>Trabajos</th>
                <th>Requerido</th>
                <th>Stock</th>
                <th>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {fabricationPendingPurchases.map((row) => (
                <tr key={row.description}>
                  <td>{row.description}</td>
                  <td>{row.companyLabels.join(", ")}</td>
                  <td>{row.jobs.join(", ")}</td>
                  <td>{row.required} {row.unit}</td>
                  <td>{row.available} {row.unit}</td>
                  <td>{row.missing} {row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PrintReport>

        <PrintReport id="report-stock" title="Reporte - Stock y agenda">
          <table style={styles.table}>
          <thead>
            <tr>
              <th>Presupuesto</th>
              <th>Cliente</th>
              <th>Inicio fabricacion</th>
              <th>Dias para comprar</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {approvedJobsSummary.map((job) => {
              const daysUntilStart = job.startDate
                ? Math.ceil(
                    (new Date(job.startDate).getTime() - new Date(todayIso()).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;
              return (
                <tr key={job.id}>
                  <td>{job.budgetNumber}</td>
                  <td>{job.client}</td>
                  <td>{formatDateDisplay(job.startDate)}</td>
                  <td>{daysUntilStart === null ? "-" : `${daysUntilStart} dias`}</td>
                  <td>{job.executionStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
          <div style={{ marginTop: 20 }}>
            <strong>Detalle de faltantes</strong>
            <table style={{ ...styles.table, marginTop: 8 }}>
            <thead>
              <tr>
                <th>Material</th>
                <th>Requerido</th>
                <th>Stock</th>
                <th>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {stockNeedRows.map((row) => (
                <tr key={row.description}>
                  <td>{row.description}</td>
                  <td>{row.required} {row.unit}</td>
                  <td>{row.available} {row.unit}</td>
                  <td>{row.missing} {row.unit}</td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 20 }}>
            <strong>Alertas EPP e insumos</strong>
            {personalProvisionAlerts.length === 0 ? (
              <div style={{ marginTop: 8 }}>Sin vencimientos proximos.</div>
            ) : (
              <table style={{ ...styles.table, marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Item</th>
                    <th>Vence</th>
                    <th>Dias</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {personalProvisionAlerts.map((item) => (
                    <tr key={`${item.employeeName}-${item.kind}-${item.dueDate}`}>
                      <td>{getCompanyMeta(item.company).short}</td>
                      <td>{item.employeeName}</td>
                      <td>{item.kind}</td>
                      <td>{item.itemName}</td>
                      <td>{formatDateDisplay(item.dueDate)}</td>
                      <td>{item.daysLeft}</td>
                      <td>{item.availableQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </PrintReport>

      <PrintReport
        id="report-personal"
        title={`Reporte - Personal ${
          personalReportCompany === "General"
            ? "general"
            : getCompanyMeta(personalReportCompany).short
        }`}
      >
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Legajo</th>
              <th>Nombre y apellido</th>
              <th>Categoria base</th>
              <th>Neto</th>
              <th>Impacto</th>
            </tr>
          </thead>
          <tbody>
            {employees
              .filter(
                (employee) =>
                  personalReportCompany === "General" || employee.company === personalReportCompany
              )
              .map((employee) => {
              const summary = getEmployeePayrollSummary(employee);
              return (
                <tr key={employee.id}>
                  <td>{getCompanyMeta(employee.company).short}</td>
                  <td>{employee.legajo}</td>
                  <td>{employee.name}</td>
                  <td>{employee.category}</td>
                  <td>{money(summary.net)}</td>
                  <td>{money(summary.employerImpact)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PrintReport>

      <PrintReport id="report-facturacion" title="Reporte - Facturacion y cobranzas">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Titulo</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {financialItems.map((item, index) => (
              <tr key={`facturacion-report-${item.id}-${item.type}-${item.date}-${index}`}>
                <td>{getCompanyMeta(item.company).short}</td>
                <td>{formatDateDisplay(item.date)}</td>
                <td>{getFinancialTypeLabel(item.type)}</td>
                <td>{item.status}</td>
                <td>{item.title}</td>
                <td>{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintReport>
    </div>
  );
}

function BudgetDocument({
  budget,
  sections,
  consolidatedTotals,
  vatPct,
  estimatedDeliveryDate,
  companyTheme,
}: {
  budget: BudgetData;
  sections: BudgetSection[];
  consolidatedTotals: BudgetSectionTotals;
  vatPct: number;
  estimatedDeliveryDate: string;
  companyTheme: { short: string; primary: string; soft: string };
}) {
  const mainLogo = budget.logos[0] || null;
  const companyMetaInfo = getCompanyMeta(budget.company);
  const companyBankingLines = getCompanyBankingLines(budget.company);
  const mutedLabel = "#9aa3b2";
  const inkColor = "#1a2230";
  const eyebrow: React.CSSProperties = {
    fontSize: 9.5,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: companyTheme.primary,
    fontWeight: 700,
    marginBottom: 6,
  };
  const block: React.CSSProperties = {
    breakInside: "avoid",
    pageBreakInside: "avoid",
    position: "relative",
    zIndex: 1,
    marginTop: 22,
  };
  const card: React.CSSProperties = {
    ...block,
    border: "0.5px solid #e6e9ee",
    borderRadius: 10,
    padding: 16,
    background: "rgba(255,255,255,0.85)",
  };
  // Bloques destacados (Descripcion / Alcance): barra de acento + tinte suave de empresa.
  const accentCard: React.CSSProperties = {
    ...block,
    borderLeft: `4px solid ${companyTheme.primary}`,
    background: hexToRgba(companyTheme.soft, 0.4),
    borderRadius: 8,
    padding: "12px 16px",
  };

  return (
    <div style={{ ...styles.printSheet, color: inkColor }}>
      <div style={styles.printWatermark}>
        {mainLogo ? (
          <img src={mainLogo.preview} alt={mainLogo.name} style={styles.printWatermarkLogo} />
        ) : (
          <div style={{ color: companyTheme.soft }}>{companyTheme.short}</div>
        )}
      </div>

      <div
        style={{
          ...styles.printHeader,
          marginBottom: 0,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={styles.printLogoRow}>
          {budget.logos.map((image, index) => (
            <img
              key={`${image.name}-${index}`}
              src={image.preview}
              alt={image.name}
              style={styles.printHeaderLogo}
            />
          ))}
          <div>
            <div style={{ fontSize: 17, letterSpacing: 1, color: companyTheme.primary, fontWeight: 500 }}>
              {companyTheme.short}
            </div>
            <div style={{ fontSize: 10, color: mutedLabel }}>
              {companyMetaInfo.short} · CUIT {budget.cuit}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={eyebrow}>Presupuesto</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: companyTheme.primary }}>
            N.º {budget.number}
          </div>
          {budget.isUpdate && (
            <div style={{ ...styles.statusPill, ...styles.statusBlue, marginTop: 8 }}>
              {budget.updateLabel || "Actualizacion"}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 2, background: companyTheme.primary, marginTop: 14, position: "relative", zIndex: 1 }} />

      <div style={{ ...block, marginTop: 18 }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: 22, color: inkColor }}>{budget.project}</h1>
        <div style={{ fontSize: 13 }}>{budget.client}</div>
        {budget.clientTaxId && (
          <div style={{ fontSize: 12, color: mutedLabel }}>CUIT/CUIL cliente: {budget.clientTaxId}</div>
        )}
      </div>

      <div
        style={{
          ...block,
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <div>
          <div style={eyebrow}>Fecha</div>
          <div style={{ fontSize: 13 }}>{formatDateDisplay(budget.date)}</div>
        </div>
        <div>
          <div style={eyebrow}>Entrega estimada</div>
          <div style={{ fontSize: 13 }}>{formatDateDisplay(estimatedDeliveryDate)}</div>
        </div>
        <div>
          <div style={eyebrow}>Forma de pago</div>
          <div style={{ fontSize: 13 }}>{budget.paymentTerms}</div>
        </div>
      </div>

      {budget.referenceImages.length > 0 && (
        <div style={card}>
          <div style={eyebrow}>Imagenes de referencia</div>
          <div style={styles.printReferenceGrid}>
            {budget.referenceImages.map((image, index) => (
              <img
                key={`${image.name}-${index}`}
                src={image.preview}
                alt={image.name}
                style={styles.printReferenceImage}
              />
            ))}
          </div>
        </div>
      )}

      {budget.notes && (
        <div style={accentCard}>
          <div style={eyebrow}>Descripcion</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{budget.notes}</div>
        </div>
      )}

      {budget.scope && (
        <div style={accentCard}>
          <div style={eyebrow}>Alcance</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{budget.scope}</div>
        </div>
      )}

      {sections.map((section, index) => (
        <div key={section.id} style={card}>
          <div style={styles.printSectionHeader}>
            <div>
              <div style={eyebrow}>{section.title || `Subpresupuesto ${index + 1}`}</div>
              {section.notes && (
                <div style={{ fontSize: 12, color: mutedLabel }}>{section.notes}</div>
              )}
            </div>
            <div style={styles.printSectionMeta}>
              <div style={{ fontSize: 12, color: mutedLabel }}>
                Neto <span style={{ color: inkColor }}>{money(section.totals.netPrice)}</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: companyTheme.primary,
                  background: hexToRgba(companyTheme.soft, 0.7),
                  border: `1px solid ${companyTheme.primary}`,
                  borderRadius: 999,
                  padding: "3px 12px",
                  justifySelf: "end",
                }}
              >
                Total c/IVA {money(section.totals.finalPrice)}
              </div>
            </div>
          </div>

          <div style={{ ...eyebrow, marginTop: 12 }}>Materiales incluidos</div>
          <div style={styles.materialColumns}>
            {section.materials.length === 0 ? (
              <div style={styles.muted}>Sin materiales cargados en este bloque.</div>
            ) : (
              section.materials.map((item) => (
                <div key={item.id} style={styles.materialColumnItem}>
                  {item.description}
                </div>
              ))
            )}
          </div>

          {section.discounts.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12 }}>
              <div>Neto antes de descuentos: {money(section.totals.preDiscountNetPrice)}</div>
              {section.discounts.map((item) => (
                <div key={item.id}>
                  {item.description}: -{money(item.amount)}
                </div>
              ))}
              <div><strong>Total descuentos:</strong> -{money(section.totals.totalDiscountAmount)}</div>
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          ...styles.printTotals,
          display: "flex",
          justifyContent: "flex-end",
          background: "transparent",
          border: "none",
          padding: 0,
          marginTop: 24,
        }}
      >
        <div
          style={{
            minWidth: 300,
            background: hexToRgba(companyTheme.soft, 0.85),
            border: `1.5px solid ${companyTheme.primary}`,
            borderRadius: 12,
            padding: "14px 18px",
          }}
        >
          {consolidatedTotals.totalDiscountAmount > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: mutedLabel, padding: "3px 0" }}>
                <span>Neto antes de descuentos</span>
                <span>{money(consolidatedTotals.preDiscountNetPrice)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: mutedLabel, padding: "3px 0" }}>
                <span>Total descuentos</span>
                <span>-{money(consolidatedTotals.totalDiscountAmount)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: mutedLabel, padding: "3px 0" }}>
            <span>Valor neto total</span>
            <span style={{ color: inkColor }}>{money(consolidatedTotals.netPrice)}</span>
          </div>
          <div style={{ height: 1, background: hexToRgba(companyTheme.primary, 0.25), margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ ...eyebrow, marginBottom: 0 }}>
              Total con IVA ({vatPct}%)
            </span>
            <span style={{ fontSize: 26, fontWeight: 700, color: companyTheme.primary }}>
              {money(consolidatedTotals.finalPrice)}
            </span>
          </div>
        </div>
      </div>

      {companyBankingLines.length > 0 && (
        <div style={{ ...block, marginTop: 28, paddingTop: 14, borderTop: "0.5px solid #e6e9ee" }}>
          <div style={eyebrow}>Datos para transferencia</div>
          {companyBankingLines.map((line) => (
            <div key={line} style={{ fontSize: 12, color: mutedLabel }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrintReport({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} style={{ ...styles.printSheet, display: "none" }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      {children}
    </div>
  );
}

function Panel({
  title,
  children,
  actions,
  nested = false,
  green = false,
  span = "auto",
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  nested?: boolean;
  green?: boolean;
  span?: "auto" | "half" | "wide" | "full" | "third";
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        ...styles.panel,
        ...(span === "third" ? styles.panelThird : {}),
        ...(span === "half" ? styles.panelHalf : {}),
        ...(span === "wide" ? styles.panelWide : {}),
        ...(span === "full" ? styles.panelFull : {}),
        ...(nested ? styles.nestedPanel : {}),
        ...(green ? styles.greenPanel : {}),
      }}
    >
      <div style={styles.panelHeader}>
        <button
          type="button"
          style={styles.panelTitleToggle}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <span style={styles.panelCollapseBadge}>{collapsed ? "+" : "-"}</span>
          <span>{title}</span>
        </button>
        <div style={styles.panelHeaderRight}>
          {actions}
        </div>
      </div>
      {!collapsed && children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.label}>{label}</div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={styles.grid2}>{children}</div>;
}

function Semaforo({
  level,
  size = 12,
  title,
  ring = false,
}: {
  level: SemaphoreLevel;
  size?: number;
  title?: string;
  ring?: boolean;
}) {
  return (
    <span
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: SEMAPHORE_PALETTE[level].color,
        boxShadow: ring ? `0 0 0 4px ${SEMAPHORE_PALETTE[level].soft}` : undefined,
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}

function SemaforoResumen({
  items,
}: {
  items: { level: SemaphoreLevel; label: string; value: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12 }}>
          <Semaforo level={it.level} size={24} ring />
          <div>
            <div style={styles.metricLabel}>{it.label}</div>
            <div style={{ fontWeight: 700 }}>{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: strong ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ButtonLike({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        ...(secondary ? styles.buttonSecondary : {}),
        ...(disabled ? styles.buttonDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function FileDropButton({
  label,
  fileName,
  onFileSelected,
  onFilesSelected,
  accept = "image/*,.pdf,application/pdf",
  allowMultiple = false,
}: {
  label: string;
  fileName?: string;
  onFileSelected?: (file: File | null) => void;
  onFilesSelected?: (files: FileList | null) => void;
  accept?: string;
  allowMultiple?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useMemo(
    () =>
      `upload-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,
    [label]
  );

  const handleFiles = (files: FileList | null) => {
    if (onFilesSelected) {
      onFilesSelected(files);
      return;
    }
    if (onFileSelected) {
      onFileSelected(files?.[0] || null);
    }
  };

  return (
    <div
      style={{
        ...styles.fileDropZone,
        ...(isDragging ? styles.fileDropZoneActive : {}),
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <label htmlFor={inputId} style={styles.fileDropLabel}>
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        capture={accept.includes("image/*") ? ("environment" as any) : undefined}
        style={{ display: "none" }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div style={styles.fileDropHint}>
        Arrastra archivo{allowMultiple ? "s" : ""} aqui o toca para elegir
        {accept.includes("image/*") ? " / sacar foto" : ""}.
      </div>
      {fileName && <div style={styles.fileName}>{fileName}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 18,
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    background: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tabsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 },
  workspaceShell: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "start",
  },
  workspaceMain: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sidebar: {
    position: "sticky",
    top: 20,
    alignSelf: "start",
    minHeight: "calc(100vh - 36px)",
    borderRadius: 24,
    padding: 12,
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    overflow: "hidden",
  },
  sidebarTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    padding: "6px 8px 2px",
  },
  sidebarTabs: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 4,
  },
  sidebarFooter: {
    marginTop: "auto",
    display: "grid",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.12)",
  },
  assistantDockButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    textAlign: "left",
    boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
  },
  assistantDockIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.18)",
    fontSize: 18,
    fontWeight: 900,
    flexShrink: 0,
  },
  assistantDockTextWrap: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  assistantDockCaption: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: 600,
  },
  sidebarSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sidebarSectionTitleWrap: {
    padding: "8px 10px 2px",
  },
  sidebarSectionTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sidebarSectionHint: {
    marginTop: 2,
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
  },
  sidebarTab: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#e2e8f0",
    borderRadius: 16,
    padding: "10px 12px",
    cursor: "pointer",
    textAlign: "left",
    fontWeight: 600,
  },
  sidebarTabActive: {
    background: "linear-gradient(135deg, #dbeafe 0%, #ffffff 100%)",
    color: "#0f172a",
    borderColor: "#bfdbfe",
    boxShadow: "0 10px 24px rgba(59,130,246,0.18)",
  },
  sidebarTabBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.12)",
    fontSize: 11,
    fontWeight: 800,
    flexShrink: 0,
  },
  sidebarTabTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  sidebarTabCaption: {
    color: "rgba(148,163,184,0.95)",
    fontSize: 11,
    fontWeight: 600,
  },
  pettyCashFundGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  pettyCashFundCard: {
    border: "1px solid #d6d3d1",
    borderRadius: 18,
    padding: 16,
    background: "#fffbeb",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  pettyCashFundHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  pettyCashFundTitle: {
    display: "grid",
    gap: 4,
  },
  pettyCashFundSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },
  pettyCashFundMetric: {
    border: "1px solid #e7e5e4",
    borderRadius: 14,
    padding: 12,
    background: "white",
  },
  pettyCashFundState: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#292524",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
  },
  pettyCashInlineBubble: {
    border: "1px solid #fde68a",
    borderRadius: 16,
    padding: 14,
    background: "#fff7d6",
    display: "grid",
    gap: 12,
  },
  pettyCashExpenseSummary: {
    display: "grid",
    gap: 4,
    cursor: "pointer",
    listStyle: "none",
  },
  pettyCashExpenseSummaryLine: {
    display: "block",
    color: "#1f2937",
    fontSize: 13,
    lineHeight: 1.4,
  },
  inlineForm: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
    alignItems: "end",
  },
  tab: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
  },
  tabActive: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    alignItems: "start",
  },
  budgetLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.8fr) minmax(320px, 1fr)",
    gap: 14,
    alignItems: "start",
  },
  budgetMainTop: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    gridColumn: "1",
    gridRow: "1",
  },
  budgetMainBottom: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    gridColumn: "1",
    gridRow: "2",
  },
  budgetAside: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    gridColumn: "2",
    gridRow: "1 / span 2",
  },
  budgetHistorySection: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    gridColumn: "1 / -1",
    gridRow: "3",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    alignItems: "start",
  },
  personalStack: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 18,
    alignItems: "start",
    width: "100%",
  },
  personalFichaStack: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 16,
    width: "100%",
  },
  personalAttendancePayrollGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(720px, 3fr) minmax(320px, 1fr)",
    gap: 16,
    width: "100%",
    alignItems: "start",
    overflowX: "auto",
    paddingBottom: 2,
  },
  personalAttendancePane: {
    minWidth: 0,
    width: "100%",
  },
  personalPayrollPane: {
    minWidth: 320,
    width: "100%",
  },
  liquidationColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 10,
  },
  employeeSubsection: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "1px solid #e2e8f0",
  },
  savedMonthsList: {
    display: "grid",
    gap: 8,
    marginTop: 12,
    justifyItems: "start",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 24px",
    background: "rgba(15,23,42,0.45)",
    overflowY: "auto",
  },
  employeeSetupModal: {
    width: "min(620px, calc(100vw - 48px))",
    maxHeight: "calc(100vh - 96px)",
    overflowY: "auto",
    borderRadius: 24,
    boxShadow: "0 28px 70px rgba(15,23,42,0.32)",
  },
  column: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 14,
    alignItems: "start",
    gridAutoFlow: "dense",
  },
  // Layout master-detalle: contenido principal a ancho flexible + panel lateral sticky.
  // Cuando el aside no se renderiza, la 2da columna ("auto") colapsa y el main ocupa todo.
  masterDetailLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "start",
  },
  masterDetailMain: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
  },
  masterDetailAside: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "sticky",
    top: 16,
    width: 360,
    maxWidth: "100%",
    alignSelf: "start",
  },
  panel: {
    background: "white",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    gridColumn: "span 4",
    minWidth: 0,
  },
  panelHalf: {
    gridColumn: "span 6",
  },
  panelWide: {
    gridColumn: "1 / -1",
  },
  panelFull: {
    gridColumn: "1 / -1",
  },
  nestedPanel: {
    boxShadow: "none",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
  },
  greenPanel: { border: "2px solid #22c55e", background: "#f0fdf4" },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  panelTitleToggle: {
    flex: "1 1 auto",
    minWidth: 200,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid #bfdbfe",
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
    textAlign: "left",
    boxShadow: "0 8px 20px rgba(148,163,184,0.12)",
  },
  panelCollapseBadge: {
    width: 30,
    height: 30,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    color: "white",
    fontSize: 18,
    fontWeight: 800,
    flexShrink: 0,
  },
  panelHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  panelHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginLeft: "auto",
  },
  label: { fontSize: 12, color: "#475569", marginBottom: 6, fontWeight: 600 },
  input: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
  },
  inputReadOnly: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    background: "#f8fafc",
    color: "#475569",
  },
  textarea: {
    width: "100%",
    minHeight: 72,
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  metric: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    background: "#f8fafc",
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  metricValue: {
    fontWeight: 700,
    fontSize: 20,
    color: "#0f172a",
    marginTop: 4,
    lineHeight: 1.2,
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 10,
  },
  rightStrong: {
    textAlign: "right",
    fontWeight: 700,
    marginTop: 10,
  },
  muted: { color: "#475569", fontSize: 13 },
  empty: {
    padding: 16,
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    color: "#64748b",
    background: "#fff",
  },
  noticeBox: {
    padding: 12,
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #93c5fd",
    color: "#1e3a8a",
    marginBottom: 12,
  },
  nestedCard: {
    border: "1px solid #cbd5e1",
    borderRadius: 16,
    padding: 14,
    background: "#ffffff",
    marginTop: 12,
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  },
  button: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
  },
  buttonSecondary: { background: "white", color: "#0f172a" },
  buttonDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "white",
    cursor: "pointer",
  },
  uploadActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 8,
  },
  inlineActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  buttonLikeLabel: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  fileName: { marginTop: 8, fontSize: 12, color: "#64748b" },
  companyRibbon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 800,
  },
  companyRibbonMini: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 11,
    marginTop: 6,
  },
  previewCard: {
    border: "1px solid #cbd5e1",
    borderRadius: 16,
    padding: 16,
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  previewLogoRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  previewLogo: {
    width: 54,
    height: 54,
    objectFit: "contain",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "white",
    padding: 4,
  },
  previewMeta: { display: "grid", gap: 6, fontSize: 14 },
  previewBlock: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 12,
    marginTop: 12,
  },
  previewImage: {
    width: "100%",
    maxHeight: 220,
    objectFit: "contain",
    borderRadius: 12,
    marginTop: 10,
  },
  referenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  referenceCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
    background: "#fff",
  },
  referenceThumb: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 10,
    display: "block",
  },
  materialColumns: {
    columnCount: 3,
    columnGap: 18,
    marginTop: 8,
  },
  materialColumnItem: {
    breakInside: "avoid",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  sectionCell: {
    padding: 0,
    background: "transparent",
    borderBottom: "none",
  },
  sectionHeader: {
    padding: "10px 12px",
    borderRadius: 12,
    fontWeight: 800,
    border: "2px solid",
    margin: "8px 0",
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  accessShell: {
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 0 40px",
  },
  accessCard: {
    width: "100%",
    maxWidth: 980,
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 24,
    alignItems: "stretch",
  },
  accessBrand: {
    minHeight: 520,
    borderRadius: 28,
    padding: 34,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    background:
      "radial-gradient(circle at top, rgba(59,130,246,0.22), rgba(255,255,255,0.96) 42%), linear-gradient(145deg, #ffffff, #eff6ff)",
    border: "1px solid #bfdbfe",
    boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
  },
  accessLogo: {
    width: 140,
    maxHeight: 110,
    objectFit: "contain",
    marginBottom: 22,
  },
  accessLogoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    background: "linear-gradient(145deg, #1d4ed8, #0f172a)",
    color: "white",
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: 1,
    boxShadow: "0 18px 40px rgba(29,78,216,0.28)",
  },
  accessTitle: {
    fontSize: 40,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },
  accessSubtitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1d4ed8",
    marginBottom: 12,
  },
  accessSubcompaniesHint: {
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#64748b",
  },
  accessFormCard: {
    borderRadius: 28,
    padding: 30,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  accessFormTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },
  accessFormText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#64748b",
    marginBottom: 18,
  },
  accessInputStack: {
    display: "grid",
    gap: 12,
    marginBottom: 14,
  },
  accessInput: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    fontSize: 15,
    background: "#f8fafc",
  },
  accessSubmitBtn: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(145deg, #0f172a, #1d4ed8)",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 18px 35px rgba(29,78,216,0.22)",
  },
  accessSecondaryBtn: {
    width: "100%",
    marginTop: 10,
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  accessHelpText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#64748b",
  },
  accessFeedback: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    fontSize: 13,
  },
  collaborationBanner: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#ecfeff",
    border: "1px solid #a5f3fc",
    color: "#155e75",
    marginBottom: 18,
    display: "grid",
    gap: 6,
  },
  collaborationBannerMeta: {
    fontSize: 13,
    color: "#0f766e",
    lineHeight: 1.45,
  },
  collaborationBannerActions: {
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  workspaceToolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
    gap: 16,
    alignItems: "end",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
  },
  workspaceToolbarBlock: {
    display: "grid",
    gap: 6,
  },
  workspaceToolbarInfo: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#475569",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 14,
    padding: "10px 12px",
  },
  communicationRail: {
    position: "sticky",
    top: 20,
    alignSelf: "start",
    minHeight: "calc(100vh - 48px)",
    borderRadius: 24,
    padding: 14,
    color: "#ffffff",
    boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    overflow: "hidden",
  },
  communicationRailTitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: "none",
    padding: "6px 8px 4px",
    textAlign: "center",
  },
  communicationSection: {
    display: "grid",
    gap: 10,
  },
  communicationSectionButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    textAlign: "left",
  },
  communicationContactsList: {
    display: "grid",
    gap: 8,
    paddingRight: 0,
    maxHeight: "calc(100vh - 220px)",
    overflowY: "auto",
    overflowX: "hidden",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  communicationCard: {
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.94)",
    color: "#0f172a",
    boxShadow: "0 16px 36px rgba(15,23,42,0.2)",
    overflow: "hidden",
  },
  notificationsToggle: {
    position: "fixed",
    right: 24,
    bottom: 92,
    zIndex: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderRadius: 16,
    border: "1px solid #0f172a",
    background: "#ffffff",
    color: "#0f172a",
    boxShadow: "0 18px 36px rgba(15,23,42,0.18)",
    cursor: "pointer",
    fontWeight: 700,
  },
  notificationsPanel: {
    position: "fixed",
    right: 24,
    bottom: 150,
    width: 360,
    maxWidth: "calc(100vw - 48px)",
    maxHeight: "calc(100vh - 180px)",
    zIndex: 41,
    borderRadius: 22,
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 22px 48px rgba(15,23,42,0.22)",
    display: "grid",
    overflow: "hidden",
  },
  notificationsList: {
    display: "grid",
    gap: 10,
    maxHeight: "calc(100vh - 280px)",
    overflowY: "auto",
    padding: 16,
  },
  notificationItem: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    display: "grid",
    gap: 8,
  },
  notificationItemUnread: {
    background: "#eff6ff",
    borderColor: "#93c5fd",
  },
  fileDropZone: {
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    border: "1px dashed #94a3b8",
    background: "#f8fafc",
    minWidth: 220,
  },
  fileDropZoneActive: {
    borderColor: "#1d4ed8",
    background: "#eff6ff",
  },
  fileDropLabel: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "#0f172a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
  fileDropHint: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 1.4,
  },
  chatLauncherRail: {
    position: "fixed",
    right: 24,
    bottom: 154,
    zIndex: 43,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
  },
  chatContactsPopover: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.98)",
    border: "1px solid #cbd5e1",
    boxShadow: "0 16px 36px rgba(15,23,42,0.18)",
  },
  chatContactBubble: {
    width: "100%",
    minHeight: 64,
    borderRadius: 16,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    padding: "12px 14px",
    fontWeight: 800,
    cursor: "pointer",
    position: "relative",
    boxShadow: "0 8px 16px rgba(15,23,42,0.08)",
  },
  chatContactBubbleActive: {
    background: "#0f172a",
    color: "#ffffff",
    borderColor: "#0f172a",
  },
  chatContactUnread: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    padding: "0 5px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 800,
    border: "2px solid #ffffff",
  },
  chatContactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.08)",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  chatContactLabel: {
    fontSize: 12,
    fontWeight: 700,
    flex: 1,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.2,
  },
  chatOverlay: {
    position: "fixed",
    right: 96,
    top: 84,
    bottom: 18,
    width: "min(440px, calc(100vw - 180px))",
    zIndex: 52,
    borderRadius: 22,
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 22px 48px rgba(15,23,42,0.24)",
    display: "grid",
    overflow: "hidden",
  },
  assistantOverlay: {
    position: "fixed",
    left: 104,
    bottom: 24,
    width: "min(420px, calc(100vw - 180px))",
    maxHeight: "calc(100vh - 140px)",
    zIndex: 51,
    borderRadius: 22,
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 22px 48px rgba(15,23,42,0.24)",
    display: "grid",
    overflow: "hidden",
  },
  chatMessagesLarge: {
    display: "grid",
    gap: 10,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 4,
  },
  chatPanel: {
    display: "grid",
    gap: 14,
  },
  chatMessages: {
    display: "grid",
    gap: 10,
    maxHeight: 340,
    overflowY: "auto",
    paddingRight: 4,
  },
  chatMessage: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
  },
  chatMessageOwn: {
    background: "#dbeafe",
    borderColor: "#93c5fd",
  },
  chatMessageOther: {
    background: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  chatMessageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    fontSize: 13,
  },
  chatTimestamp: {
    color: "#64748b",
    fontSize: 12,
  },
  chatComposer: {
    display: "grid",
    gap: 10,
  },
  chatTextarea: {
    width: "100%",
    minHeight: 84,
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    resize: "vertical",
  },
  chatActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  chatStatus: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
  },
  workspaceWidgetToggle: {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 18px",
    borderRadius: 18,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    boxShadow: "0 18px 36px rgba(15,23,42,0.28)",
    cursor: "pointer",
    fontWeight: 700,
  },
  workspaceWidgetBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    padding: "0 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
  },
  workspaceWidget: {
    position: "fixed",
    right: 24,
    bottom: 86,
    width: 420,
    maxWidth: "calc(100vw - 48px)",
    maxHeight: "calc(100vh - 120px)",
    zIndex: 39,
    borderRadius: 22,
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.98)",
    boxShadow: "0 22px 48px rgba(15,23,42,0.24)",
    display: "grid",
    overflow: "hidden",
  },
  workspaceWidgetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderBottom: "1px solid #e2e8f0",
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
  },
  workspaceWidgetTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
  },
  workspaceWidgetTabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  workspaceWidgetTab: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
  },
  workspaceWidgetTabActive: {
    background: "#0f172a",
    color: "white",
    borderColor: "#0f172a",
  },
  workspaceWidgetClose: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#be123c",
    cursor: "pointer",
    fontWeight: 700,
  },
  workspaceWidgetBody: {
    padding: 16,
    minHeight: 300,
    maxHeight: "calc(100vh - 220px)",
    overflow: "hidden",
  },
  assistantMessages: {
    display: "grid",
    gap: 10,
    maxHeight: 340,
    overflowY: "auto",
    paddingRight: 4,
  },
  assistantMessage: {
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
  },
  assistantMessageBot: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  assistantMessageUser: {
    background: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  assistantComposer: {
    display: "grid",
    gap: 10,
  },
  assistantHint: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#475569",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 12,
  },
  statusGreen: { background: "#dcfce7", color: "#166534" },
  statusYellow: { background: "#fef3c7", color: "#92400e" },
  statusRed: { background: "#fee2e2", color: "#991b1b" },
  statusBlue: { background: "#dbeafe", color: "#1d4ed8" },
  statusGray: { background: "#e2e8f0", color: "#334155" },
  rowGreen: { background: "#dcfce7" },
  financialBrown: { background: "#92400e", color: "white" },
  financialBlack: { background: "#111827", color: "white" },
  financialRed: { background: "#b91c1c", color: "white" },
  financialDone: { background: "#166534", color: "white" },
  monthToolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  calendarMonthLabel: { fontSize: 16, fontWeight: 700, minWidth: 180, textTransform: "capitalize" },
  calendarLegend: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  calendarWeekdays: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, marginBottom: 8 },
  calendarWeekdayCell: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    padding: "8px 0",
    background: "#e2e8f0",
    borderRadius: 10,
  },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 },
  yearCalendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },
  yearCalendarCard: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 8,
    alignContent: "start",
    minHeight: 180,
  },
  yearCalendarTitle: {
    fontSize: 14,
    fontWeight: 800,
    textTransform: "capitalize",
    color: "#0f172a",
  },
  yearCalendarEvent: {
    borderRadius: 10,
    padding: 8,
  },
  yearCalendarEventTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
  },
  calendarCell: {
    minHeight: 170,
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  calendarCellMuted: { opacity: 0.45, background: "#f8fafc" },
  calendarCellHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  calendarEmpty: { fontSize: 12, color: "#64748b" },
  calendarItem: {
    border: "none",
    borderRadius: 10,
    padding: 8,
    textAlign: "left",
    cursor: "pointer",
    fontSize: 12,
  },
  calendarItemMeta: { fontSize: 11, opacity: 0.9, marginTop: 4 },
  ganttTrack: {
    width: "100%",
    height: 12,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
  },
  ganttFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
  timelineBlock: {
    display: "grid",
    gap: 6,
    minWidth: 180,
  },
  timelineLabel: {
    fontSize: 12,
    color: "#475569",
    textTransform: "capitalize",
  },
  fabricationGanttWrap: {
    display: "grid",
    gap: 12,
  },
  fabricationGanttHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  fabricationGanttMeta: {
    fontSize: 13,
    color: "#475569",
  },
  fabricationGanttLegend: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  fabricationGanttLegendItem: {
    fontSize: 12,
    color: "#64748b",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "6px 10px",
  },
  fabricationGanttGrid: {
    display: "grid",
    gap: 10,
    overflowX: "auto",
  },
  fabricationGanttDays: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(52px, 1fr))",
    gap: 4,
    minWidth: 760,
  },
  fabricationGanttDay: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
    padding: "6px 4px",
    borderRadius: 8,
    background: "#eff6ff",
    border: "1px solid #dbeafe",
  },
  fabricationGanttDayWeekend: {
    background: "#f8fafc",
    borderColor: "#e2e8f0",
    color: "#64748b",
  },
  fabricationGanttRow: {
    display: "grid",
    gap: 8,
    minWidth: 760,
  },
  fabricationGanttJobMeta: {
    display: "grid",
    gap: 4,
  },
  fabricationGanttTrack: {
    position: "relative",
    height: 36,
    borderRadius: 12,
    background:
      "repeating-linear-gradient(90deg, #f8fafc 0px, #f8fafc 48px, #e2e8f0 48px, #e2e8f0 52px)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  fabricationGanttBar: {
    position: "absolute",
    top: 5,
    bottom: 5,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.18)",
    minWidth: 80,
  },
  fabricationGanttBarLabel: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  attendanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  attendanceCalendar: {
    display: "grid",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  attendanceToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  attendanceMonthTitle: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 0.4,
    color: "#0f172a",
  },
  attendanceWeekdayHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 8,
    marginTop: 12,
  },
  attendanceWeekdayCell: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
    borderRadius: 10,
    padding: "7px 4px",
  },
  attendanceWeek: {
    border: "1px solid #dbeafe",
    borderRadius: 16,
    padding: 10,
    background: "#f8fafc",
    display: "grid",
    gap: 10,
    alignContent: "start",
    minWidth: 0,
    overflowX: "auto",
  },
  attendanceWeekTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
  },
  attendanceWeekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(118px, 1fr))",
    gap: 8,
  },
  attendanceCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
    background: "#fff",
    minWidth: 118,
  },
  attendanceEmptyCard: {
    minHeight: 132,
    minWidth: 118,
    border: "1px dashed #e2e8f0",
    borderRadius: 12,
    background: "rgba(248,250,252,0.65)",
  },
  attendanceDayTitle: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  attendanceHoursGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    marginTop: 8,
  },
  configDocRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 },
  semaphoreBanner: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 12,
    border: "2px solid",
    marginBottom: 16,
  },
  subCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  printSheet: {
    background: "white",
    color: "#0f172a",
    maxWidth: 960,
    margin: "0 auto",
    position: "relative",
  },
  printHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    marginBottom: 20,
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
  printWatermark: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 160,
    fontWeight: 800,
    opacity: 0.06,
    pointerEvents: "none",
    zIndex: 0,
  },
  printWatermarkLogo: {
    maxWidth: "82%",
    maxHeight: "82%",
    objectFit: "contain",
    opacity: 1,
  },
  printLogoRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  printHeaderLogo: {
    width: 70,
    height: 70,
    objectFit: "contain",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "white",
    padding: 6,
  },
  printBlock: {
    position: "relative",
    zIndex: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    background: "rgba(255,255,255,0.96)",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
  printReferenceImage: {
    width: "100%",
    height: 170,
    objectFit: "contain",
    background: "#f8fafc",
    border: "0.5px solid #e6e9ee",
    borderRadius: 8,
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
  printReferenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
  },
  printSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  printSectionMeta: {
    display: "grid",
    gap: 4,
    minWidth: 180,
  },
  printTotals: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 8,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "rgba(255,255,255,0.96)",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  },
};






