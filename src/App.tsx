import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";

const APP_TITLE = "Sistema de Gestion Grupo BGA";
const INVOICE_VAT_PCT = 21;
const ADMIN_MASTER_PASSWORD = "BGAadmin2026";

const COMPANY_OPTIONS = [
  {
    value: "BGA estudio de diseño y produccion industrial s.r.l",
    short: "BGA",
    primary: "#14213d",
    soft: "#dbe7f7",
  },
  {
    value: "De raiz s.r.l",
    short: "De raiz",
    primary: "#b7791f",
    soft: "#fef3c7",
  },
] as const;

type CompanyName = (typeof COMPANY_OPTIONS)[number]["value"];

const WORK_TYPE_OPTIONS = [
  "General",
  "Mobiliario",
  "Cocina",
  "Vestidor",
  "Oficina",
  "Local comercial",
  "Obra especial",
] as const;

type WorkTypeName = (typeof WORK_TYPE_OPTIONS)[number];

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

type TabKey =
  | "cashflow"
  | "compras"
  | "cajaChica"
  | "presupuesto"
  | "marcadores"
  | "historial"
  | "aprobados"
  | "facturacion"
  | "stock"
  | "personal";

const TAB_OPTIONS: Array<{ key: TabKey; label: string }> = [
  { key: "cashflow", label: "Cash flow y resultados" },
  { key: "facturacion", label: "Facturacion y cobranzas" },
  { key: "aprobados", label: "Trabajos aprobados" },
  { key: "compras", label: "Compras" },
  { key: "cajaChica", label: "Caja chica" },
  { key: "presupuesto", label: "Presupuesto actual" },
  { key: "historial", label: "CRM" },
  { key: "stock", label: "Stock y agenda" },
  { key: "personal", label: "Personal" },
  { key: "marcadores", label: "Marcadores" },
];

type PrintMode =
  | ""
  | "client-budget"
  | "report-cashflow"
  | "report-compras"
  | "report-caja-chica"
  | "report-marcadores"
  | "report-historial"
  | "report-aprobados"
  | "report-stock"
  | "report-personal"
  | "report-facturacion";

type Material = {
  id: number;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  stockCode?: string;
  stockGroup?: string;
  sortOrder?: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

type LaborRow = {
  id: number;
  category: string;
  employees: number;
  monthlyHoursPerEmployee: number;
  hourlyRate: number;
  jobHours: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

type FixedCost = {
  id: number;
  description: string;
  amount: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

type MarkerFixedGroup =
  | "Administrativos"
  | "Comerciales"
  | "Financieros"
  | "Edilicios"
  | "Operativos";

type FixedMarker = {
  id: number;
  company: CompanyName;
  workType: WorkTypeName;
  group: MarkerFixedGroup;
  description: string;
  amount: number;
  active: boolean;
  notes: string;
};

type SupplyMarkerSubtype =
  | "Insumos basicos"
  | "Flete"
  | "Entrega"
  | "Embalaje"
  | "Viaticos";

type SupplyMarker = {
  id: number;
  company: CompanyName;
  workType: WorkTypeName;
  subtype: SupplyMarkerSubtype;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  active: boolean;
  notes: string;
};

type LaborMarker = {
  id: number;
  company: CompanyName;
  workType: WorkTypeName;
  category: string;
  employees: number;
  monthlyHoursPerEmployee: number;
  hourlyRate: number;
  hoursBase: number;
  active: boolean;
  notes: string;
};

type PersonalProvisionKind = "EPP" | "Insumos";

type PersonalProvisionMarker = {
  id: number;
  company: CompanyName;
  shared: boolean;
  kind: PersonalProvisionKind;
  sourceStockCode?: string;
  description: string;
  amountPerDelivery: number;
  periodicityMonths: number;
  active: boolean;
  notes: string;
};

type BudgetImage = {
  name: string;
  preview: string;
};

type BudgetDiscount = {
  id: number;
  description: string;
  amount: number;
};

type BudgetIncrease = {
  id: number;
  description: string;
  pct: number;
};

type BudgetSectionTotals = {
  totalMaterials: number;
  totalBasicSupplies: number;
  totalLabor: number;
  laborDeviationAmount: number;
  fixedCostsApplied: number;
  deviationAmount: number;
  totalCost: number;
  totalIncreaseAmount: number;
  preDiscountNetPrice: number;
  totalDiscountAmount: number;
  netPrice: number;
  finalPrice: number;
  totalJobHours: number;
  totalAvailableHours: number;
  occupancyPct: number;
};

type BudgetSection = {
  id: number;
  title: string;
  notes: string;
  materials: Material[];
  basicSupplies: Material[];
  labor: LaborRow[];
  fixedCosts: FixedCost[];
  increases: BudgetIncrease[];
  discounts: BudgetDiscount[];
  totals: BudgetSectionTotals;
  savedAt: string;
};

type BudgetData = {
  company: CompanyName;
  workType: WorkTypeName;
  number: string;
  date: string;
  client: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientNotes: string;
  cuit: string;
  project: string;
  paymentTerms: string;
  deliveryTerm: string;
  validity: string;
  notes: string;
  scope: string;
  deliveryDestination: string;
  projectManager: string;
  maxRequirementDate: string;
  billedPct: number;
  isUpdate: boolean;
  updateLabel: string;
  logos: BudgetImage[];
  referenceImages: BudgetImage[];
};

type BudgetSnapshot = {
  budget: BudgetData;
  subBudgets: BudgetSection[];
  materials: Material[];
  basicSupplies: Material[];
  labor: LaborRow[];
  fixedCosts: FixedCost[];
  increases: BudgetIncrease[];
  discounts: BudgetDiscount[];
  params: {
    deviationPct: number;
    markupPct: number;
    vatPct: number;
    allocationMode: "auto" | "manual";
    manualAllocationPct: number;
    laborDeviationPct: number;
    commissionPct: number;
  };
  totals: {
    totalMaterials: number;
    totalBasicSupplies: number;
    totalLabor: number;
    laborDeviationPct: number;
    laborDeviationAmount: number;
    fixedCostsApplied: number;
    deviationAmount: number;
    totalCost: number;
    totalIncreaseAmount: number;
    preDiscountNetPrice: number;
    totalDiscountAmount: number;
    netPrice: number;
    finalPrice: number;
    commissionAmount: number;
    totalJobHours: number;
    totalAvailableHours: number;
    occupancyPct: number;
  };
};

type SavedBudget = {
  id: number;
  rootBudgetId: number;
  revisionNumber: number;
  isUpdate: boolean;
  status: "borrador" | "aprobado" | "no_aprobado";
  exportedAs: "presupuesto";
  number: string;
  company: CompanyName;
  client: string;
  project: string;
  date: string;
  deliveryTerm: string;
  deliveryDestination: string;
  projectManager: string;
  maxRequirementDate: string;
  commissionPct: number;
  commissionAmount: number;
  totalDiscountAmount: number;
  netPrice: number;
  finalPrice: number;
  laborOccupancyPct: number;
  exportedAt?: string;
  snapshot: BudgetSnapshot;
};

type Invoice = {
  id: number;
  businessName: string;
  taxId: string;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: number;
  vat: number;
  total: number;
  attachmentName?: string;
};

type Payment = {
  id: number;
  paymentNumber: string;
  paymentDate: string;
  transactionType: "efectivo" | "transferencia" | "cheque" | "otros";
  amount: number;
  attachmentName?: string;
};

type Retention = {
  id: number;
  retentionNumber: string;
  retentionDate: string;
  retentionType: string;
  amount: number;
  attachmentName?: string;
};

type LegacyApprovedInvoice = {
  invoiceDate: string;
  subtotal: number;
  vat: number;
  total: number;
};

type LegacyApprovedPayment = {
  paymentDate: string;
  amount: number;
};

type LegacyApprovedRetention = {
  retentionType: string;
  amount: number;
};

type LegacyApprovedAdditional = {
  description: string;
  amount: number;
  date: string;
};

type LegacyApprovedImportRow = {
  budgetNumber: string;
  client: string;
  project: string;
  approvalDate: string;
  deliveryTerm: string;
  paymentTerms: string;
  commissionAmount: number;
  observations: string;
  notes: string;
  executionStatus: ApprovedJob["executionStatus"];
  soldNetPrice: number;
  businessName: string;
  taxId: string;
  invoiceNumber: string;
  invoices: LegacyApprovedInvoice[];
  payments: LegacyApprovedPayment[];
  retentions: LegacyApprovedRetention[];
  additionals: LegacyApprovedAdditional[];
};

type AdditionalItem = {
  id: number;
  date: string;
  description: string;
  amount: number;
  notes: string;
};

type CommissionPayment = {
  id: number;
  paymentDate: string;
  amount: number;
  note: string;
  attachmentName?: string;
};

type ApprovedJob = {
  id: number;
  budgetId: number;
  rootBudgetId: number;
  revisionNumber: number;
  isUpdate: boolean;
  sourceType: "from_budget" | "direct" | "imported";
  legacyImported?: boolean;
  budgetNumber: string;
  company: CompanyName;
  client: string;
  project: string;
  date: string;
  approvalDate: string;
  startDate: string;
  deliveryDate: string;
  deliveryTerm: string;
  deliveryDestination: string;
  projectManager: string;
  maxRequirementDate: string;
  soldNetPrice: number;
  soldGrossPrice: number;
  billedPct: number;
  commissionPct: number;
  commissionAmount: number;
  totalDiscountAmount: number;
  estimatedJobHours: number;
  estimatedOccupancyPct: number;
  estimatedMaterialCost: number;
  executionStatus: "pendiente" | "en_curso" | "finalizado";
  notes: string;
  workFiles: {
    id: number;
    kind: "plano" | "referencia";
    name: string;
  }[];
  additionals: AdditionalItem[];
  commissionPayments: CommissionPayment[];
  invoices: Invoice[];
  payments: Payment[];
  retentions: Retention[];
  snapshot: BudgetSnapshot;
};

type FinancialItemType = "facturacion" | "cobranza" | "pago";
type FinancialItemStatus = "pendiente" | "realizado";

type FinancialCalendarItem = {
  id: number;
  company: CompanyName;
  date: string;
  type: FinancialItemType;
  status: FinancialItemStatus;
  title: string;
  jobCode: string;
  client: string;
  amount: number;
  notes: string;
  autoGenerated?: boolean;
  sourceJobId?: number;
  preset?: "factura" | "anticipo" | "saldo";
};

type PurchaseInvoice = {
  id: number;
  company: CompanyName;
  administration: "blanco" | "negro";
  source: "compras" | "caja_chica";
  pettyCashExpenseId?: number;
  supplier: string;
  taxId: string;
  receiptKind: string;
  receiptLetter: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  exemptAmount: number;
  net21: number;
  subtotal: number;
  vat: number;
  total: number;
  notes: string;
  attachmentName?: string;
  extractedAutomatically: boolean;
};

type PettyCashFund = {
  id: number;
  company: CompanyName;
  responsible: string;
  assignedAmount: number;
  deliveredDate: string;
  notes: string;
  active: boolean;
};

type PettyCashExpense = {
  id: number;
  company: CompanyName;
  fundId: number | null;
  date: string;
  category: string;
  description: string;
  amount: number;
  administration: "negro" | "blanco";
  supplier: string;
  invoiceNumber: string;
  notes: string;
  attachmentName?: string;
  linkedPurchaseInvoiceId?: number | null;
};

type DebtPlan = {
  id: number;
  company: CompanyName;
  concept: string;
  dueDay: number;
  nextInstallmentAmount: number;
  remainingInstallments: number;
  nextDueDate: string;
  notes: string;
  active: boolean;
};

type BankStatementEntry = {
  id: number;
  company: CompanyName;
  date: string;
  bank: string;
  movementType: "credito" | "debito";
  concept: string;
  amount: number;
  balance: number;
  notes: string;
  attachmentName?: string;
  extractedAutomatically: boolean;
};

type StockItem = {
  id: number;
  company: CompanyName | "General";
  kind: "general" | "EPP" | "Insumos";
  shared: boolean;
  group: string;
  sortOrder: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  periodicityMonths: number;
  active: boolean;
};

type CompanyAsset = {
  id: number;
  company: CompanyName;
  category: string;
  description: string;
  value: number;
  usefulLifeMonths: number;
  active: boolean;
  notes: string;
};

type AppUser = {
  id: number;
  name: string;
  password: string;
  isAdmin: boolean;
  active: boolean;
  allowedTabs: TabKey[];
  allowedCompanies: CompanyName[];
};

type EmployeeDocument = {
  id: number;
  name: string;
  dueDate: string;
  attachmentName: string;
};

type EmployeeProvisionKind = "EPP" | "Insumos";

type EmployeeProvisionItem = {
  id: number;
  stockCode: string;
  kind: EmployeeProvisionKind;
  quantity: number;
  dueDate: string;
  attachmentName: string;
  notes: string;
};

type AttendanceStatus =
  | "sin_cargar"
  | "presente"
  | "ausente_injustificado"
  | "ausente_justificado"
  | "vacaciones";

type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  normalHours: number;
  extra50Hours: number;
  extra100Hours: number;
  attachmentName: string;
  notes: string;
};

type EmployeePayroll = {
  month: string;
  normalHours: number;
  holidayHours: number;
  extra50Hours: number;
  extra100Hours: number;
  night50Hours: number;
  nightHours: number;
  unjustifiedAbsenceHours: number;
  justifiedAbsenceHours: number;
  vacationsDays: number;
  anticipos: number;
  presentismoPctOverride: number | null;
  employerExtraPct: number;
  notes: string;
};

type Employee = {
  id: number;
  company: CompanyName;
  legajo: string;
  name: string;
  category: string;
  seniorityYears: number;
  hourlyNetManual: number;
  hourlyGrossManual: number;
  attendance: AttendanceRecord[];
  documents: EmployeeDocument[];
  provisionItems: EmployeeProvisionItem[];
  eppDueDate: string;
  eppAttachmentName: string;
  suppliesDueDate: string;
  suppliesAttachmentName: string;
  skills: string;
  notes: string;
  payrolls: EmployeePayroll[];
};

type EmployeeBaseDocument = {
  id: number;
  name: string;
};

type EmployeeBaseProvisionTemplate = {
  id: number;
  stockCode: string;
  kind: EmployeeProvisionKind;
  quantity: number;
  validityMonths: number;
};

type EmployeeBaseConfig = {
  category: string;
  seniorityYears: number;
  hourlyNetManual: number;
  hourlyGrossManual: number;
  normalHoursDefault: number;
  presentismoPct: number;
  seniorityPctPerYear: number;
  employerContributionPct: number;
  employerInsurancePct: number;
  unionPct: number;
  insurancePct: number;
  aguinaldoAnnualMonths: number;
  eppSemiannualCost: number;
  suppliesSemiannualCost: number;
  requiredDocuments: EmployeeBaseDocument[];
  provisionTemplates: EmployeeBaseProvisionTemplate[];
};

type ScaleRow = {
  id: number;
  month: string;
  category: string;
  baseHourly: number;
  nonRemHourly: number;
  vht: number;
  sourceFileName: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

const formatDateDisplay = (dateText: string) => {
  if (!dateText) return "-";
  const parts = dateText.split("-");
  if (parts.length !== 3) return dateText;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const getCompanyMeta = (company: CompanyName) =>
  COMPANY_OPTIONS.find((item) => item.value === company) ?? COMPANY_OPTIONS[0];

const getCompanyTaxId = (company: CompanyName) =>
  company === "BGA estudio de diseño y produccion industrial s.r.l"
    ? "30-71527468-6"
    : "30-71769540-9";

const parseLeadDays = (deliveryTerm: string) => {
  const cleaned = (deliveryTerm || "").replace(/[^0-9]/g, " ").trim();
  const first = cleaned.split(/\s+/)[0];
  return first ? Number(first) : 0;
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

const readImage = (file: File) =>
  new Promise<BudgetImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, preview: String(reader.result || "") });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const monthLabel = (month: string) => {
  if (!month) return "-";
  const [year, mm] = month.split("-");
  return new Date(Number(year), Number(mm) - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
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
  { id: 1, company: "General", kind: "general", shared: true, group: "Melaminas", sortOrder: 1, code: "MEL-001", description: "Melamina blanca", unit: "placas", quantity: 3, unitPrice: 43000, periodicityMonths: 0, active: true },
  { id: 2, company: "General", kind: "general", shared: true, group: "Herrajes", sortOrder: 2, code: "HER-001", description: "Herrajes Hafele", unit: "set", quantity: 2, unitPrice: 140000, periodicityMonths: 0, active: true },
  { id: 3, company: "General", kind: "general", shared: true, group: "Pinturas", sortOrder: 3, code: "PIN-001", description: "Laca poliuretanica", unit: "lt", quantity: 0, unitPrice: 18500, periodicityMonths: 0, active: true },
  { id: 4, company: "General", kind: "EPP", shared: true, group: "EPP", sortOrder: 4, code: "EPP-001", description: "Ropa de trabajo", unit: "equipo", quantity: 10, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 5, company: "General", kind: "EPP", shared: true, group: "EPP", sortOrder: 5, code: "EPP-002", description: "Zapatos de seguridad", unit: "par", quantity: 10, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 6, company: "General", kind: "Insumos", shared: true, group: "Insumos", sortOrder: 6, code: "INS-001", description: "Guantes", unit: "pack", quantity: 20, unitPrice: 0, periodicityMonths: 6, active: true },
  { id: 7, company: "General", kind: "Insumos", shared: true, group: "Insumos", sortOrder: 7, code: "INS-002", description: "Mascarillas", unit: "pack", quantity: 20, unitPrice: 0, periodicityMonths: 6, active: true },
];

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
        presentismoPctOverride: 10,
        employerExtraPct: 22,
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
    responsible: "Encargado taller",
    assignedAmount: 250000,
    deliveredDate: todayIso(),
    notes: "Fondo operativo inicial",
    active: true,
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

const defaultAppUsers: AppUser[] = [
  {
    id: 1,
    name: "Administrador",
    password: ADMIN_MASTER_PASSWORD,
    isAdmin: true,
    active: true,
    allowedTabs: TAB_OPTIONS.map((item) => item.key),
    allowedCompanies: COMPANY_OPTIONS.map((item) => item.value),
  },
];

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

const cloneBudgetDiscounts = (items: BudgetDiscount[]) =>
  items.map((item) => ({ ...item }));

const normalizePdfText = (text: string) =>
  text
    .replace(/\0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U")
    .replace(/Ñ/g, "N")
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
        id: Date.now() + rows.length + 1,
        month: monthKeys[0],
        category: categoryAliases[pdfCategory],
        baseHourly,
        nonRemHourly: Number((vhtValues[0] - baseHourly).toFixed(2)),
        vht: vhtValues[0],
        sourceFileName: file.name,
      },
      {
        id: Date.now() + rows.length + 2,
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

const getSavedBudgetDisplayLabel = (item: {
  number: string;
  isUpdate?: boolean;
  revisionNumber?: number;
  snapshot?: BudgetSnapshot;
}) =>
  item.isUpdate || item.snapshot?.budget.isUpdate
    ? `${item.number} · ${item.snapshot?.budget.updateLabel || `Actualizacion ${item.revisionNumber ?? ""}`.trim()}`
    : item.number;

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
}): BudgetSnapshot => {
  const netPrice = Number(input.soldNetPrice || 0);
  const finalPrice = Number((netPrice * (1 + INVOICE_VAT_PCT / 100)).toFixed(2));
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
      vatPct: 21,
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
const SUPABASE_APP_STATE_RECORD_KEY = "main";
const SUPABASE_CRM_CLIENTS_TABLE = "crm_clients";
const SUPABASE_BUDGETS_TABLE = "crm_budgets";

type PersistedAppStateData = {
  activeTab: TabKey;
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
  companyAssets: CompanyAsset[];
  users: AppUser[];
  employees: Employee[];
  employeeBaseConfig: EmployeeBaseConfig;
  scaleRows: ScaleRow[];
  selectedHistoryId: number | null;
  selectedApprovedJobId: number | null;
  selectedCrmClientKey: string | null;
  selectedFinancialItemId: number | null;
  selectedEmployeeId: number | null;
  financialMonth: string;
  purchaseMonth: string;
  payrollMonth: string;
  allocationMode: "auto" | "manual";
  manualAllocationPct: number;
  deviationPct: number;
  markupPct: number;
  vatPct: number;
  laborDeviationPct: number;
  commissionPct: number;
  stockIncreasePct: number;
  editingBudgetId: number | null;
  currentUserId: number | null;
};

type PersistedAppState = {
  version: number;
  savedAt: string;
  data: PersistedAppStateData;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
  const sessionResult = await supabase.auth.getSession();
  if (!sessionResult.data.session?.user) return null;

  const { data, error } = await supabase
    .from(SUPABASE_APP_STATE_TABLE)
    .select("payload,saved_at")
    .eq("id", SUPABASE_APP_STATE_RECORD_KEY)
    .maybeSingle();

  if (error) {
    throw new Error(`No pude leer Supabase: ${error.message}`);
  }

  if (!data?.payload) return null;

  return normalizePersistedAppState({
    ...(data.payload as Record<string, unknown>),
    savedAt:
      typeof data.saved_at === "string" ? data.saved_at : new Date().toISOString(),
  });
};

const writeSupabasePersistedAppState = async (payload: PersistedAppState) => {
  const sessionResult = await supabase.auth.getSession();
  const userId = sessionResult.data.session?.user?.id;

  if (!userId) {
    throw new Error("No hay una sesion de Supabase activa para guardar.");
  }

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
    throw new Error(`No pude guardar en Supabase: ${error.message}`);
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
  const [activeTab, setActiveTab] = useState<TabKey>("cashflow");
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
  const [debtPlans, setDebtPlans] = useState<DebtPlan[]>(defaultDebtPlans);
  const [bankStatementEntries, setBankStatementEntries] = useState<BankStatementEntry[]>(defaultBankStatementEntries);
  const [stockItems, setStockItems] = useState<StockItem[]>(defaultStockItems);
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>(defaultCompanyAssets);
  const [users, setUsers] = useState<AppUser[]>(defaultAppUsers);
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees);
  const [employeeBaseConfig, setEmployeeBaseConfig] = useState<EmployeeBaseConfig>(defaultBaseConfig);
  const [scaleRows, setScaleRows] = useState<ScaleRow[]>(seededScaleRows);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [selectedApprovedJobId, setSelectedApprovedJobId] = useState<number | null>(null);
  const [selectedCrmClientKey, setSelectedCrmClientKey] = useState<string | null>(null);
  const [selectedFinancialItemId, setSelectedFinancialItemId] = useState<number | null>(
    defaultFinancialItems[0]?.id ?? null
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    defaultEmployees[0]?.id ?? null
  );
  const [financialMonth, setFinancialMonth] = useState(new Date().toISOString().slice(0, 7));
  const [purchaseMonth, setPurchaseMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollMonth, setPayrollMonth] = useState("2026-04");
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
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(1);
  const [loginName, setLoginName] = useState("Administrador");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [supabaseLoginEmail, setSupabaseLoginEmail] = useState("");
  const [supabaseLoginPassword, setSupabaseLoginPassword] = useState("");
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState("");
  const [newUserDraft, setNewUserDraft] = useState<{
    name: string;
    password: string;
    allowedTabs: TabKey[];
    allowedCompanies: CompanyName[];
  }>({
    name: "",
    password: "",
    allowedTabs: ["presupuesto"],
    allowedCompanies: [COMPANY_OPTIONS[0].value],
  });
  const lastMarkerSourceKeyRef = useRef("");
  const isSupabaseLoggedIn = !!supabaseSession?.user;

  const refreshSupabaseAccess = async () => {
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data.session || null;

    setSupabaseSession(session);

    if (!session?.user) {
      setSupabaseProfile(null);
      setSupabaseCompaniesCatalog([]);
      setSupabaseCompanyPermissions([]);
      setSupabaseTabPermissions([]);
      return;
    }

    const companiesCatalogResult = await supabase.from("companies").select("*");
    const profileResult = await supabase.from("profiles").select("*");
    const companyPermissionsResult = await supabase
      .from("user_company_permissions")
      .select("*");
    const tabPermissionsResult = await supabase
      .from("user_tab_permissions")
      .select("*");

    setSupabaseCompaniesCatalog(companiesCatalogResult.data || []);
    setSupabaseProfile(profileResult.data?.[0] || null);
    setSupabaseCompanyPermissions(companyPermissionsResult.data || []);
    setSupabaseTabPermissions(tabPermissionsResult.data || []);

    console.log("PROFILE:", profileResult.data, profileResult.error);
    console.log(
      "COMPANY PERMISSIONS:",
      companyPermissionsResult.data,
      companyPermissionsResult.error
    );
    console.log(
      "TAB PERMISSIONS:",
      tabPermissionsResult.data,
      tabPermissionsResult.error
    );
  };

  const loginSupabaseTest = async () => {
    if (!supabaseLoginEmail.trim() || !supabaseLoginPassword.trim()) {
      setSupabaseAuthMessage("Completa el mail y la contrasena de Supabase.");
      return;
    }

    const result = await supabase.auth.signInWithPassword({
      email: supabaseLoginEmail.trim(),
      password: supabaseLoginPassword,
    });

    console.log("LOGIN RESULT:", result.data, result.error);

    if (result.error) {
      setSupabaseAuthMessage(result.error.message || "No se pudo iniciar sesion en Supabase.");
      return;
    }

    setSupabaseAuthMessage("Sesion Supabase iniciada correctamente.");
    setSupabaseLoginPassword("");
    await refreshSupabaseAccess();
    await restoreFromSupabaseSave();
  };

  const logoutSupabaseTest = async () => {
    const result = await supabase.auth.signOut();
    console.log("LOGOUT RESULT:", result.error);

    setSupabaseAuthMessage("Sesion Supabase cerrada.");
    await refreshSupabaseAccess();
  };

  useEffect(() => {
    const testSupabase = async () => {
      const companiesResult = await supabase.from("companies").select("*");
      const tabsResult = await supabase.from("app_tabs").select("*");

      console.log("COMPANIES:", companiesResult.data, companiesResult.error);
      console.log("APP TABS:", tabsResult.data, tabsResult.error);

      await refreshSupabaseAccess();
    };

    testSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshSupabaseAccess();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const totalMaterials = useMemo(
    () => materials.reduce((acc, item) => acc + Number(item.qty || 0) * Number(item.unitPrice || 0), 0),
    [materials]
  );

  const currentUser = useMemo(
    () => users.find((item) => item.id === currentUserId) || null,
    [users, currentUserId]
  );

  const isAdminUser = !!currentUser?.isAdmin;
  const isSupabaseAdmin = !!supabaseProfile?.is_superadmin;
  const effectiveIsAdmin = isSupabaseLoggedIn ? isSupabaseAdmin : isAdminUser;

  const supabaseAllowedCompanies = useMemo<CompanyName[]>(() => {
    if (!isSupabaseLoggedIn) return [];
    const allowedIds = new Set(
      supabaseCompanyPermissions.map((item) => Number(item.company_id))
    );

    return supabaseCompaniesCatalog
      .filter((item) => allowedIds.has(Number(item.id)))
      .map((item) => item.name)
      .filter((name): name is CompanyName =>
        COMPANY_OPTIONS.some((option) => option.value === name)
      );
  }, [isSupabaseLoggedIn, supabaseCompanyPermissions, supabaseCompaniesCatalog]);

  const supabaseAllowedTabs = useMemo<TabKey[]>(() => {
    if (!isSupabaseLoggedIn) return [];
    return supabaseTabPermissions
      .map((item) => item.tab_key)
      .filter((key): key is TabKey => TAB_OPTIONS.some((tab) => tab.key === key));
  }, [isSupabaseLoggedIn, supabaseTabPermissions]);

  const allowedCompaniesForSession = useMemo(
    () =>
      effectiveIsAdmin
        ? COMPANY_OPTIONS.map((item) => item.value)
        : isSupabaseLoggedIn
        ? supabaseAllowedCompanies
        : currentUser?.allowedCompanies || [],
    [currentUser, effectiveIsAdmin, isSupabaseLoggedIn, supabaseAllowedCompanies]
  );

  const canAccessCompany = (company: CompanyName | "General") =>
    (isSupabaseLoggedIn || !!currentUser) &&
    (effectiveIsAdmin ||
      company === "General" ||
      allowedCompaniesForSession.includes(company as CompanyName));

  const visibleTabOptions = useMemo(
    () =>
      !currentUser && !isSupabaseLoggedIn
        ? []
        : effectiveIsAdmin
        ? TAB_OPTIONS
        : isSupabaseLoggedIn
        ? TAB_OPTIONS.filter((item) => supabaseAllowedTabs.includes(item.key))
        : TAB_OPTIONS.filter((item) => currentUser?.allowedTabs.includes(item.key)),
    [currentUser, effectiveIsAdmin, isSupabaseLoggedIn, supabaseAllowedTabs]
  );

  const visibleSavedBudgets = useMemo(
    () => savedBudgets.filter((item) => canAccessCompany(item.company)),
    [savedBudgets, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleApprovedJobs = useMemo(
    () => approvedJobs.filter((item) => canAccessCompany(item.company)),
    [approvedJobs, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleFinancialItems = useMemo(
    () => financialItems.filter((item) => canAccessCompany(item.company)),
    [financialItems, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visiblePurchaseInvoices = useMemo(
    () => purchaseInvoices.filter((item) => canAccessCompany(item.company)),
    [purchaseInvoices, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visiblePettyCashFunds = useMemo(
    () => pettyCashFunds.filter((item) => canAccessCompany(item.company)),
    [pettyCashFunds, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visiblePettyCashExpenses = useMemo(
    () => pettyCashExpenses.filter((item) => canAccessCompany(item.company)),
    [pettyCashExpenses, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleDebtPlans = useMemo(
    () => debtPlans.filter((item) => canAccessCompany(item.company)),
    [debtPlans, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleBankStatementEntries = useMemo(
    () => bankStatementEntries.filter((item) => canAccessCompany(item.company)),
    [bankStatementEntries, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleStockItems = useMemo(
    () => stockItems.filter((item) => canAccessCompany(item.company)),
    [stockItems, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleCompanyAssets = useMemo(
    () => companyAssets.filter((item) => canAccessCompany(item.company)),
    [companyAssets, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
  );

  const visibleEmployees = useMemo(
    () => employees.filter((item) => canAccessCompany(item.company)),
    [employees, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
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
    (acc, item) => acc + Number(item.amount || 0),
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
    [stockItems, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]
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
    const requirements = employeeBaseConfig.provisionTemplates.filter(
      (item) => item.kind === kind
    );
    if (requirements.length === 0) {
      return { label: "Sin requerimientos", tone: "gray" as const };
    }

    let hasMissing = false;
    let hasExpiring = false;

    requirements.forEach((requirement) => {
      const delivered = employee.provisionItems.find(
        (item) => item.stockCode === requirement.stockCode && item.kind === requirement.kind
      );

      if (
        !delivered ||
        !delivered.attachmentName ||
        !delivered.dueDate ||
        Number(delivered.quantity || 0) < Number(requirement.quantity || 0)
      ) {
        hasMissing = true;
        return;
      }

      const diff =
        (new Date(delivered.dueDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24);
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
            id: Date.now() + Math.random(),
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
    const grouped = new Map<number, SavedBudget>();

    savedBudgets.forEach((item) => {
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

    return Array.from(grouped.values());
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
          : billedNet * (INVOICE_VAT_PCT / 100);
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

  const selectedBudget = selectedHistoryId
    ? visibleSavedBudgets.find((item) => item.id === selectedHistoryId) || null
    : null;

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
        id: Date.now() + Math.random(),
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
        id: Date.now() + Math.random(),
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
        id: Date.now() + Math.random(),
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
          setLastSavedAt(persisted.savedAt);
          setStorageMessage(
            hasSupabaseSession
              ? "Guardado restaurado desde Supabase. Ya puedes seguir trabajando."
              : "Guardado local restaurado. Ya puedes seguir trabajando."
          );
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
    if (!currentUser) return;
    if (!visibleTabOptions.some((item) => item.key === activeTab)) {
      setActiveTab(visibleTabOptions[0]?.key || "presupuesto");
    }
  }, [activeTab, currentUser, visibleTabOptions]);

  useEffect(() => {
    if ((!currentUser && !isSupabaseLoggedIn) || effectiveIsAdmin) return;
    if (!allowedCompaniesForSession.includes(budget.company)) {
      const fallbackCompany = allowedCompaniesForSession[0];
      if (!fallbackCompany) return;
      setBudget((prev) => ({
        ...prev,
        company: fallbackCompany,
        cuit: getCompanyTaxId(fallbackCompany),
      }));
    }
  }, [budget.company, currentUser, effectiveIsAdmin, isSupabaseLoggedIn, allowedCompaniesForSession]);

  useEffect(() => {
    if (visibleEmployees.length > 0 && !visibleEmployees.some((item) => item.id === selectedEmployeeId)) {
      setSelectedEmployeeId(visibleEmployees[0].id);
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
    id: Date.now() + item.id,
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    description: `${item.group} - ${item.description}`,
    amount: item.amount,
  });

  const mapSupplyMarkerToBudgetRow = (item: SupplyMarker): Material => ({
    id: Date.now() + item.id,
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    description: item.description,
    qty: item.qty,
    unit: item.unit,
    unitPrice: item.unitPrice,
  });

  const mapLaborMarkerToBudgetRow = (item: LaborMarker): LaborRow => ({
    id: Date.now() + item.id,
    sourceMarkerId: item.id,
    sourceCompany: item.company,
    category: item.category,
    employees: item.employees,
    monthlyHoursPerEmployee: item.monthlyHoursPerEmployee,
    hourlyRate: item.hourlyRate,
    jobHours: item.hoursBase,
  });

  const fixedMarkersByGroup = useMemo(
    () =>
      ["Administrativos", "Comerciales", "Financieros", "Edilicios", "Operativos"].map(
        (group) => ({
          group: group as MarkerFixedGroup,
          total: fixedMarkers
            .filter(
              (item) =>
                item.group === group &&
                item.active &&
                (item.workType === budget.workType || item.workType === "General")
            )
            .reduce((acc, item) => acc + Number(item.amount || 0), 0),
        })
      ),
    [fixedMarkers, budget.workType]
  );

  const exportPrint = (mode: PrintMode) => {
    if (!mode) return;
    if (mode === "client-budget" && editingBudgetId) {
      const exportTimestamp = new Date().toISOString();
      setSavedBudgets((prev) =>
        prev.map((item) =>
          item.id === editingBudgetId ? { ...item, exportedAt: exportTimestamp } : item
        )
      );
    }
    setPrintMode(mode);
    document.body.setAttribute("data-print-mode", mode);
    window.print();
    document.body.removeAttribute("data-print-mode");
    setPrintMode("");
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

  const resetBudgetEditingState = () => {
    setEditingBudgetId(null);
    setBudget((prev) => ({
      ...prev,
      date: todayIso(),
      isUpdate: false,
      updateLabel: "",
    }));
  };

  const loginUser = () => {
    const foundUser = users.find(
      (item) =>
        item.active &&
        item.name.trim().toLowerCase() === loginName.trim().toLowerCase() &&
        item.password === loginPassword
    );
    if (!foundUser) {
      setAuthMessage("No encontre un usuario activo con esos datos.");
      return;
    }
    setCurrentUserId(foundUser.id);
    setAuthMessage(`Sesion iniciada como ${foundUser.name}.`);
    setLoginPassword("");
  };

  const logoutUser = () => {
    setCurrentUserId(1);
    setAuthMessage("Volviste a la sesion administradora.");
  };

  const createAppUser = () => {
    if (!newUserDraft.name.trim() || !newUserDraft.password.trim()) {
      setAuthMessage("Completa nombre y contrasena para crear el usuario.");
      return;
    }
    if (newUserDraft.allowedTabs.length === 0 || newUserDraft.allowedCompanies.length === 0) {
      setAuthMessage("Asigna al menos una solapa y una empresa.");
      return;
    }
    const nextUser: AppUser = {
      id: Date.now(),
      name: newUserDraft.name.trim(),
      password: newUserDraft.password,
      isAdmin: false,
      active: true,
      allowedTabs: [...newUserDraft.allowedTabs],
      allowedCompanies: [...newUserDraft.allowedCompanies],
    };
    setUsers((prev) => [...prev, nextUser]);
    setNewUserDraft({
      name: "",
      password: "",
      allowedTabs: ["presupuesto"],
      allowedCompanies: [COMPANY_OPTIONS[0].value],
    });
    setAuthMessage(`Usuario ${nextUser.name} creado.`);
  };

  const updateAppUserField = <K extends keyof AppUser>(
    userId: number,
    field: K,
    value: AppUser[K]
  ) => {
    setUsers((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, [field]: value } : item))
    );
  };

  const toggleUserTabPermission = (userId: number, tabKey: TabKey) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id !== userId
          ? item
          : {
              ...item,
              allowedTabs: item.allowedTabs.includes(tabKey)
                ? item.allowedTabs.filter((entry) => entry !== tabKey)
                : [...item.allowedTabs, tabKey],
            }
      )
    );
  };

  const toggleUserCompanyPermission = (userId: number, company: CompanyName) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id !== userId
          ? item
          : {
              ...item,
              allowedCompanies: item.allowedCompanies.includes(company)
                ? item.allowedCompanies.filter((entry) => entry !== company)
                : [...item.allowedCompanies, company],
            }
      )
    );
  };

  const removeAppUser = (userId: number) => {
    const target = users.find((item) => item.id === userId);
    if (!target || target.isAdmin) {
      setAuthMessage("El administrador principal no se puede eliminar.");
      return;
    }
    setUsers((prev) => prev.filter((item) => item.id !== userId));
    if (currentUserId === userId) {
      setCurrentUserId(null);
    }
  };

  const buildPersistedAppData = (): PersistedAppStateData => ({
    activeTab,
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
    financialItems: financialItems.map((item) => ({ ...item })),
    purchaseInvoices: purchaseInvoices.map((item) => ({ ...item })),
    pettyCashFunds: pettyCashFunds.map((item) => ({ ...item })),
    pettyCashExpenses: pettyCashExpenses.map((item) => ({ ...item })),
    debtPlans: debtPlans.map((item) => ({ ...item })),
    bankStatementEntries: bankStatementEntries.map((item) => ({ ...item })),
    stockItems: stockItems.map((item) => ({ ...item })),
    companyAssets: companyAssets.map((item) => ({ ...item })),
    users: users.map((item) => ({ ...item })),
    employees: employees.map((item) => ({ ...item })),
    employeeBaseConfig: {
      ...employeeBaseConfig,
      requiredDocuments: employeeBaseConfig.requiredDocuments.map((item) => ({ ...item })),
      provisionTemplates: employeeBaseConfig.provisionTemplates.map((item) => ({ ...item })),
    },
    scaleRows: scaleRows.map((item) => ({ ...item })),
    selectedHistoryId,
    selectedApprovedJobId,
    selectedCrmClientKey,
    selectedFinancialItemId,
    selectedEmployeeId,
    financialMonth,
    purchaseMonth,
    payrollMonth,
    allocationMode,
    manualAllocationPct,
    deviationPct,
    markupPct,
    vatPct,
    laborDeviationPct,
    commissionPct,
    stockIncreasePct,
    editingBudgetId,
    currentUserId,
  });

  const applyPersistedAppData = (data: Partial<PersistedAppStateData>) => {
    const nextBudget = {
      ...cloneBudget(defaultBudget),
      ...(data.budget ? cloneBudget(data.budget) : {}),
    };

    lastMarkerSourceKeyRef.current = `${nextBudget.company}__${nextBudget.workType}`;

    setActiveTab((data.activeTab as TabKey) || "cashflow");
    setBudget(nextBudget);
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
    setFixedMarkers((data.fixedMarkers || defaultFixedMarkers).map((item) => ({ ...item })));
    setSupplyMarkers((data.supplyMarkers || defaultSupplyMarkers).map((item) => ({ ...item })));
    setLaborMarkers((data.laborMarkers || defaultLaborMarkers).map((item) => ({ ...item })));
    setPersonalProvisionMarkers(
      (data.personalProvisionMarkers || defaultPersonalProvisionMarkers).map((item) => ({
        ...item,
      }))
    );
    setSavedBudgets((data.savedBudgets || []).map((item) => ({ ...item })));
    setApprovedJobs(
      (data.approvedJobs || []).map((item) => ({
        ...item,
        sourceType: item.sourceType || "from_budget",
        legacyImported: item.legacyImported ?? false,
      }))
    );
    setFinancialItems((data.financialItems || defaultFinancialItems).map((item) => ({ ...item })));
    setPurchaseInvoices((data.purchaseInvoices || defaultPurchaseInvoices).map((item) => ({ ...item })));
    setPettyCashFunds((data.pettyCashFunds || defaultPettyCashFunds).map((item) => ({ ...item })));
    setPettyCashExpenses((data.pettyCashExpenses || defaultPettyCashExpenses).map((item) => ({ ...item })));
    setDebtPlans((data.debtPlans || defaultDebtPlans).map((item) => ({ ...item })));
    setBankStatementEntries(
      (data.bankStatementEntries || defaultBankStatementEntries).map((item) => ({ ...item }))
    );
    setStockItems((data.stockItems || defaultStockItems).map((item) => ({ ...item })));
    setCompanyAssets((data.companyAssets || defaultCompanyAssets).map((item) => ({ ...item })));
    setUsers((data.users || defaultAppUsers).map((item) => ({ ...item })));
    setEmployees((data.employees || defaultEmployees).map((item) => ({ ...item })));
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
    setSelectedHistoryId(data.selectedHistoryId ?? null);
    setSelectedApprovedJobId(data.selectedApprovedJobId ?? null);
    setSelectedCrmClientKey(data.selectedCrmClientKey ?? null);
    setSelectedFinancialItemId(
      data.selectedFinancialItemId ?? data.financialItems?.[0]?.id ?? defaultFinancialItems[0]?.id ?? null
    );
    setSelectedEmployeeId(
      data.selectedEmployeeId ?? data.employees?.[0]?.id ?? defaultEmployees[0]?.id ?? null
    );
    setFinancialMonth(data.financialMonth || new Date().toISOString().slice(0, 7));
    setPurchaseMonth(data.purchaseMonth || new Date().toISOString().slice(0, 7));
    setPayrollMonth(data.payrollMonth || "2026-04");
    setAllocationMode(data.allocationMode || "auto");
    setManualAllocationPct(data.manualAllocationPct ?? 18.75);
    setDeviationPct(data.deviationPct ?? 5);
    setMarkupPct(data.markupPct ?? 30);
    setVatPct(data.vatPct ?? 21);
    setLaborDeviationPct(data.laborDeviationPct ?? 0);
    setCommissionPct(data.commissionPct ?? 0);
    setStockIncreasePct(data.stockIncreasePct ?? 0);
    setEditingBudgetId(data.editingBudgetId ?? null);
    setCurrentUserId(data.currentUserId ?? 1);
  };

  const restoreFromLocalSave = async () => {
    try {
      const persisted = await readPersistedAppState();
      if (!persisted) {
        setStorageMessage("Todavia no hay un guardado local para restaurar.");
        return;
      }
      applyPersistedAppData(persisted.data);
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
        setStorageMessage("Todavia no hay un guardado de Supabase para restaurar.");
        return;
      }
      applyPersistedAppData(persisted.data);
      setLastSavedAt(persisted.savedAt);
      setStorageMessage("Datos restaurados desde Supabase.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude restaurar los datos desde Supabase."
      );
    }
  };

  const saveToSupabaseNow = async () => {
    try {
      const payload: PersistedAppState = {
        version: APP_PERSISTENCE_VERSION,
        savedAt: new Date().toISOString(),
        data: buildPersistedAppData(),
      };
      await writePersistedAppState(payload);
      await writeSupabasePersistedAppState(payload);
      setLastSavedAt(payload.savedAt);
      setStorageMessage("Datos guardados en Supabase y en este navegador.");
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : "No pude guardar los datos en Supabase."
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
      await writePersistedAppState({
        ...normalized,
        savedAt: new Date().toISOString(),
      });
      if (isSupabaseLoggedIn) {
        await writeSupabasePersistedAppState({
          ...normalized,
          savedAt: new Date().toISOString(),
        });
      }
      setLastSavedAt(new Date().toISOString());
      setStorageMessage(
        isSupabaseLoggedIn
          ? "Backup importado y guardado en Supabase y localmente."
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

  const saveBudgetSnapshot = () => {
    const existing = editingBudgetId
      ? savedBudgets.find((item) => item.id === editingBudgetId) || null
      : null;
    const rootBudgetId = existing?.rootBudgetId ?? existing?.id ?? Date.now();
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
      id: Date.now(),
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

    setSavedBudgets((prev) =>
      [next, ...prev]
    );

    setApprovedJobs((prev) =>
      prev.map((job) =>
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
      )
    );

    setBudget(nextBudgetData);
    setEditingBudgetId(next.id);
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
        id: existing?.id ?? Date.now(),
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
    const generatedId = Date.now();
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
                  id: Date.now(),
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
                  id: Date.now(),
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
                  id: Date.now(),
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
                  id: Date.now(),
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
                  id: Date.now(),
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
        id: Date.now(),
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
      id: Date.now(),
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

    setSubBudgets((prev) => [...prev, nextSection]);
    setSubBudgetTitle("");
    setSubBudgetNotes("");
    setMaterials([]);
    setBasicSupplies([]);
    setLabor([]);
    setFixedCosts([]);
    setBudgetIncreases([]);
    setBudgetDiscounts([]);
    setStorageMessage(
      `${nextSection.title} guardado. Ya puedes cargar el siguiente bloque y, si hace falta, restaurar los marcadores.`
    );
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
          };
        }

        return {
          ...item,
          description: stockMatch.description,
          stockCode: stockMatch.code,
          stockGroup: stockMatch.group,
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
      id: Date.now(),
      company: "General",
      kind: "general",
      shared: true,
      group: nextGroup,
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
      { id: Date.now(), description: "Descuento comercial", amount: 0 },
    ]);

  const addBudgetIncrease = () =>
    setBudgetIncreases((prev) => [
      ...prev,
      { id: Date.now(), description: "Actualizacion comercial", pct: 0 },
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
      { id: Date.now(), description: "", qty: 1, unit: "u", unitPrice: 0 },
    ]);

  const addFixedMarker = () =>
    setFixedMarkers((prev) => [
      ...prev,
      {
        id: Date.now(),
        company: budget.company,
        workType: budget.workType,
        group: "Administrativos",
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
        id: Date.now(),
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
        id: Date.now(),
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
        id: Date.now(),
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
      return [...activeFixedMarkersForBudget.map(mapFixedMarkerToBudgetRow), ...manualRows];
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
    setFixedCosts(activeFixedMarkersForBudget.map(mapFixedMarkerToBudgetRow));
    setBasicSupplies(activeSupplyMarkersForBudget.map(mapSupplyMarkerToBudgetRow));
    setLabor(activeLaborMarkersForBudget.map(mapLaborMarkerToBudgetRow));
  };

  const addLabor = () =>
    setLabor((prev) => [
      ...prev,
      {
        id: Date.now(),
        category: "Ayudante",
        employees: 1,
        monthlyHoursPerEmployee: nominalLaborHoursPerEmployee,
        hourlyRate: 0,
        jobHours: 0,
      },
    ]);

  const addFixedCost = () =>
    setFixedCosts((prev) => [...prev, { id: Date.now(), description: "Nuevo costo", amount: 0 }]);

  const removeBasicSupply = (itemId: number) => {
    setBasicSupplies((prev) => prev.filter((item) => item.id !== itemId));
  };

  const removeLabor = (itemId: number) => {
    setLabor((prev) => prev.filter((item) => item.id !== itemId));
  };

  const removeFixedCost = (itemId: number) => {
    setFixedCosts((prev) => prev.filter((item) => item.id !== itemId));
  };

  useEffect(() => {
    const nextKey = `${budget.company}__${budget.workType}`;
    if (lastMarkerSourceKeyRef.current !== nextKey) {
      lastMarkerSourceKeyRef.current = nextKey;
      restoreAllBudgetBlocksFromMarkers();
    }
  }, [budget.company, budget.workType]);

  useEffect(() => {
    if (!isPersistenceReady) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload: PersistedAppState = {
          version: APP_PERSISTENCE_VERSION,
          savedAt: new Date().toISOString(),
          data: buildPersistedAppData(),
        };
        await writePersistedAppState(payload);
        if (isSupabaseLoggedIn) {
          await writeSupabasePersistedAppState(payload);
        }
        setLastSavedAt(payload.savedAt);
      } catch (error) {
        setStorageMessage(
          error instanceof Error
            ? error.message
            : "No pude guardar los datos automaticamente."
        );
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeTab,
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
    companyAssets,
    users,
    employees,
    employeeBaseConfig,
    scaleRows,
    selectedHistoryId,
    selectedApprovedJobId,
    selectedCrmClientKey,
    selectedFinancialItemId,
    selectedEmployeeId,
    financialMonth,
    payrollMonth,
    allocationMode,
    manualAllocationPct,
    deviationPct,
    markupPct,
    vatPct,
    laborDeviationPct,
    commissionPct,
    stockIncreasePct,
    editingBudgetId,
    currentUserId,
    isPersistenceReady,
    isSupabaseLoggedIn,
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
      id: Date.now(),
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
        id: Date.now(),
        company: "General",
        kind: "general",
        shared: true,
        group: "Melaminas",
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
        id: Date.now(),
        company: budget.company,
        administration: "blanco",
        source: "compras",
        pettyCashExpenseId: undefined,
        supplier: "",
        taxId: "",
        receiptKind: "Factura",
        receiptLetter: "A",
        invoiceNumber: "",
        invoiceDate: todayIso(),
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
        id: Date.now(),
        company: budget.company,
        responsible: "",
        assignedAmount: 0,
        deliveredDate: todayIso(),
        notes: "",
        active: true,
      },
      ...prev,
    ]);
  };

  const removePettyCashFund = (fundId: number) => {
    setPettyCashFunds((prev) => prev.filter((item) => item.id !== fundId));
    setPettyCashExpenses((prev) =>
      prev.map((item) =>
        item.fundId === fundId ? { ...item, fundId: null } : item
      )
    );
  };

  const addPettyCashExpense = () => {
    setPettyCashExpenses((prev) => [
      {
        id: Date.now(),
        company: budget.company,
        fundId: visiblePettyCashFunds[0]?.id ?? null,
        date: todayIso(),
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
      prev.map((item) =>
        item.id === expenseId ? ({ ...item, [field]: value } as PettyCashExpense) : item
      )
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
      prev.map((item) =>
        item.id === expenseId ? { ...item, attachmentName: file.name } : item
      )
    );
  };

  const addDebtPlan = () => {
    setDebtPlans((prev) => [
      ...prev,
      {
        id: Date.now(),
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
        id: Date.now(),
        company: budget.company,
        date: todayIso(),
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
        id: Date.now(),
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
        id: Date.now(),
        company: "General",
        kind,
        shared: true,
        group: kind,
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
          const nextGroup = String(value) as StockGeneralGroupName;
          return {
            ...item,
            group: nextGroup,
            code: getNextStockCode(prev, nextGroup, itemId),
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
                  id: Date.now() + Math.random(),
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

  const shiftFinancialMonth = (delta: number) => {
    const [year, month] = financialMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setFinancialMonth(next.toISOString().slice(0, 7));
  };

  const shiftPurchaseMonth = (delta: number) => {
    const [year, month] = purchaseMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setPurchaseMonth(next.toISOString().slice(0, 7));
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
    const employee: Employee = {
      id: Date.now(),
      company: budget.company,
      legajo: "",
      name: "",
      category: employeeBaseConfig.category,
      seniorityYears: employeeBaseConfig.seniorityYears,
      hourlyNetManual: employeeBaseConfig.hourlyNetManual,
      hourlyGrossManual: employeeBaseConfig.hourlyGrossManual,
      attendance: [],
        documents: employeeBaseConfig.requiredDocuments.map((doc) => ({
          id: Date.now() + Math.random(),
          name: doc.name,
          dueDate: "",
          attachmentName: "",
        })),
        provisionItems: employeeBaseConfig.provisionTemplates.map((item) => ({
          id: Date.now() + Math.random(),
          stockCode: item.stockCode,
          kind: item.kind,
          quantity: item.quantity,
          dueDate: "",
          attachmentName: "",
          notes: "",
        })),
        eppDueDate: "",
        eppAttachmentName: "",
      suppliesDueDate: "",
      suppliesAttachmentName: "",
      skills: "",
      notes: "",
      payrolls: [
        {
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
          presentismoPctOverride: employeeBaseConfig.presentismoPct,
          employerExtraPct: employeeBaseConfig.employerContributionPct,
          notes: "",
        },
      ],
    };

    setEmployees((prev) => [employee, ...prev]);
    setSelectedEmployeeId(employee.id);
  };

  const removeEmployee = (employeeId: number) => {
    setEmployees((prev) => prev.filter((item) => item.id !== employeeId));
  };

  const ensureEmployeePayroll = (employee: Employee, month: string): EmployeePayroll => {
    return (
      employee.payrolls.find((item) => item.month === month) || {
        month,
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
        presentismoPctOverride: employeeBaseConfig.presentismoPct,
        employerExtraPct: employeeBaseConfig.employerContributionPct,
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
    value: string | number | null
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
          ((employeeBaseConfig.normalHoursDefault || 176) / 22).toFixed(2)
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
                  }
                : item
            )
          : [
              ...employee.payrolls,
              {
                ...ensureEmployeePayroll(employee, month),
                ...monthPayrollFromAttendance,
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
                { id: Date.now(), name: "", dueDate: "", attachmentName: "" },
              ],
            }
          : employee
      )
    );
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
              id: Date.now() + Math.random(),
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
                id: Date.now() + Math.random(),
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

  const getScaleForCategory = (category: string, month: string) =>
    scaleRows.find(
      (row) => row.month === month && row.category.toLowerCase() === category.toLowerCase()
    ) || null;

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
    const net = totalGross - descuentos - payroll.anticipos;
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
            presentismoPctOverride: employeeBaseConfig.presentismoPct,
            employerExtraPct: employeeBaseConfig.employerContributionPct,
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

  const syncLaborMarkersFromPersonal = () => {
    setLaborMarkers((prev) => {
      const next = [...prev];

      companyCategoryCostRows.forEach((row) => {
        const existingIndex = next.findIndex(
          (item) =>
            item.company === row.company &&
            item.workType === "General" &&
            item.category.trim().toLowerCase() === row.category.trim().toLowerCase()
        );

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            employees: row.employeeCount,
            monthlyHoursPerEmployee: employeeBaseConfig.normalHoursDefault,
            hourlyRate: Number(row.avgHourlyCost.toFixed(2)),
            active: true,
            notes:
              next[existingIndex].notes || "Sincronizado desde costo real de Personal",
          };
          return;
        }

        next.push({
          id: Date.now() + Math.random(),
          company: row.company,
          workType: "General",
          category: row.category,
          employees: row.employeeCount,
          monthlyHoursPerEmployee: employeeBaseConfig.normalHoursDefault,
          hourlyRate: Number(row.avgHourlyCost.toFixed(2)),
          hoursBase: 0,
          active: true,
          notes: "Sincronizado desde costo real de Personal",
        });
      });

      return next;
    });
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
                  id: Date.now(),
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
    const [year, month] = payrollMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, month - 1, index + 1);
      return {
        key: date.toISOString().slice(0, 10),
        day: index + 1,
        weekday: date.toLocaleDateString("es-AR", { weekday: "short" }),
      };
    });
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

  return (
    <div style={styles.page}>
      <style>{`
        table th, table td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
        @media print {
          body * { visibility: hidden !important; }
          body[data-print-mode="client-budget"] #client-budget-pdf,
          body[data-print-mode="client-budget"] #client-budget-pdf * { visibility: visible !important; }
          body[data-print-mode="report-marcadores"] #report-marcadores,
          body[data-print-mode="report-marcadores"] #report-marcadores * { visibility: visible !important; }
          body[data-print-mode="report-historial"] #report-historial,
          body[data-print-mode="report-historial"] #report-historial * { visibility: visible !important; }
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
          #client-budget-pdf,
          #report-cashflow,
          #report-compras,
          #report-caja-chica,
          #report-marcadores,
          #report-historial,
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
      <div style={{ ...styles.headerBar, borderTop: `8px solid ${companyTheme.primary}` }}>
        <div>
          <div style={{ ...styles.companyRibbon, background: companyTheme.soft, color: companyTheme.primary }}>
            {companyTheme.short}
          </div>
          <h1 style={{ margin: "8px 0 0 0" }}>{APP_TITLE}</h1>
          <div style={styles.muted}>Fechas visibles en formato dia-mes-año</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ButtonLike onClick={saveBudgetSnapshot}>
            {editingBudgetId ? "Actualizar presupuesto" : "Guardar presupuesto"}
          </ButtonLike>
          {editingBudgetId && (
            <ButtonLike onClick={resetBudgetEditingState} secondary>
              Salir de edicion
            </ButtonLike>
          )}
          <ButtonLike
            onClick={() =>
              exportPrint(
                activeTab === "cashflow"
                  ? "report-cashflow"
                  : activeTab === "compras"
                  ? "report-compras"
                  : activeTab === "cajaChica"
                  ? "report-caja-chica"
                  : activeTab === "presupuesto"
                  ? "client-budget"
                  : activeTab === "marcadores"
                  ? "report-marcadores"
                  : activeTab === "historial"
                  ? "report-historial"
                  : activeTab === "aprobados"
                  ? "report-aprobados"
                  : activeTab === "stock"
                  ? "report-stock"
                  : activeTab === "facturacion"
                  ? "report-facturacion"
                  : "report-personal"
              )
            }
            secondary
          >
            Reporte
          </ButtonLike>
        </div>
      </div>

      <Panel
        title="Datos y backup"
        actions={
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ButtonLike onClick={restoreFromLocalSave} secondary>
                Restaurar guardado local
              </ButtonLike>
              {isSupabaseLoggedIn && (
                <>
                  <ButtonLike onClick={restoreFromSupabaseSave} secondary>
                    Restaurar Supabase
                  </ButtonLike>
                  <ButtonLike onClick={saveToSupabaseNow} secondary>
                    Guardar en Supabase
                  </ButtonLike>
                </>
              )}
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
          </>
        }
      >
        <div style={styles.grid2}>
          <div>
            <div style={styles.label}>Guardado automatico</div>
            <div style={styles.muted}>
              {isPersistenceReady
                ? "Activo en este navegador. Cada cambio importante queda guardado automaticamente."
                : "Preparando el guardado automatico local..."}
            </div>
            <div style={{ ...styles.muted, marginTop: 6 }}>
              Ultimo guardado: {formatDateTimeDisplay(lastSavedAt)}
            </div>
          </div>
          <div>
            <div style={styles.label}>Uso recomendado</div>
            <div style={styles.muted}>
              Trabaja normalmente, y cada tanto descarga un backup JSON para tener una copia externa antes de nuevas mejoras.
            </div>
            {storageMessage && <div style={{ ...styles.muted, marginTop: 6 }}>{storageMessage}</div>}
          </div>
        </div>
      </Panel>

      <Panel
        title="Sesion y permisos"
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isSupabaseLoggedIn ? (
              <ButtonLike onClick={logoutSupabaseTest} secondary>
                Cerrar sesion Supabase
              </ButtonLike>
            ) : currentUser && !currentUser.isAdmin ? (
              <ButtonLike onClick={logoutUser} secondary>
                Volver a administrador
              </ButtonLike>
            ) : null}
          </div>
        }
      >
        <div style={styles.grid2}>
          <div>
            <div style={styles.label}>Sesion actual</div>
            <div style={styles.muted}>
              Usuario:{" "}
              <strong>
                {isSupabaseLoggedIn
                  ? supabaseSession?.user?.email || "Usuario Supabase"
                  : currentUser?.name || "Sin sesion"}
              </strong>
            </div>
            <div style={{ ...styles.muted, marginTop: 6 }}>
              Rol:{" "}
              {isSupabaseLoggedIn
                ? supabaseProfile?.is_superadmin
                  ? "Administrador Supabase"
                  : "Usuario Supabase"
                : currentUser?.isAdmin
                ? "Administrador"
                : "Operativo"}
            </div>
            <div style={{ ...styles.muted, marginTop: 6 }}>
              Empresas habilitadas:{" "}
              {isSupabaseLoggedIn
                ? supabaseAllowedCompanies.map((item) => getCompanyMeta(item).short).join(", ") || "-"
                : effectiveIsAdmin
                ? "Todas"
                : currentUser?.allowedCompanies.map((item) => getCompanyMeta(item).short).join(", ") || "-"}
            </div>
            <div style={{ ...styles.muted, marginTop: 6 }}>
              Solapas habilitadas:{" "}
              {isSupabaseLoggedIn
                ? visibleTabOptions.map((item) => item.label).join(", ") || "-"
                : effectiveIsAdmin
                ? "Todas"
                : visibleTabOptions.map((item) => item.label).join(", ") || "-"}
            </div>
          </div>
          <div>
            <div style={styles.label}>
              {isSupabaseLoggedIn ? "Sesion Supabase activa" : "Acceso principal por Supabase"}
            </div>
            <div style={styles.inlineForm}>
              <input
                style={styles.input}
                value={supabaseLoginEmail}
                onChange={(e) => setSupabaseLoginEmail(e.target.value)}
                placeholder="Mail de Supabase"
                disabled={isSupabaseLoggedIn}
              />
              <input
                style={styles.input}
                type="password"
                value={supabaseLoginPassword}
                onChange={(e) => setSupabaseLoginPassword(e.target.value)}
                placeholder="Contrasena de Supabase"
                disabled={isSupabaseLoggedIn}
              />
              <ButtonLike onClick={loginSupabaseTest} secondary={isSupabaseLoggedIn}>
                Ingresar con Supabase
              </ButtonLike>
            </div>
            <div style={{ ...styles.muted, marginTop: 8 }}>
              Este es el acceso recomendado para compartir el sistema con otros usuarios.
            </div>
            <div style={styles.inlineForm}>
              <input
                style={styles.input}
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Usuario"
                disabled={isSupabaseLoggedIn}
              />
              <input
                style={styles.input}
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Contrasena"
                disabled={isSupabaseLoggedIn}
              />
              <ButtonLike onClick={loginUser} secondary={isSupabaseLoggedIn}>
                Ingresar
              </ButtonLike>
            </div>
            <div style={{ ...styles.muted, marginTop: 8 }}>
              El ingreso local queda solo como respaldo mientras terminamos de migrar todo el sistema.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button style={styles.smallBtn} onClick={logoutSupabaseTest}>
                Cerrar sesion Supabase
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              <div>
                <strong>Sesion Supabase:</strong>{" "}
                {supabaseSession?.user?.email || "Sin iniciar sesion"}
              </div>
              <div>
                <strong>Perfil:</strong>{" "}
                {supabaseProfile?.full_name || "Sin perfil cargado"}
              </div>
              <div>
                <strong>Empresas permitidas:</strong> {supabaseCompanyPermissions.length}
              </div>
              <div>
                <strong>Solapas permitidas:</strong> {supabaseTabPermissions.length}
              </div>
            </div>
            {supabaseAuthMessage && (
              <div style={{ ...styles.muted, marginTop: 8 }}>{supabaseAuthMessage}</div>
            )}
            <div style={{ ...styles.muted, marginTop: 8 }}>
              Solo el administrador puede crear usuarios, elegir empresas y definir solapas.
            </div>
            {authMessage && <div style={{ ...styles.muted, marginTop: 8 }}>{authMessage}</div>}
          </div>
        </div>
      </Panel>

      {effectiveIsAdmin && !isSupabaseLoggedIn && (
        <Panel title="Administracion de usuarios y permisos">
          <div style={styles.grid2}>
            <Panel title="Crear usuario operativo" nested>
              <div style={styles.inlineForm}>
                <input
                  style={styles.input}
                  value={newUserDraft.name}
                  onChange={(e) => setNewUserDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre de usuario"
                />
                <input
                  style={styles.input}
                  value={newUserDraft.password}
                  onChange={(e) => setNewUserDraft((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Contrasena"
                />
                <ButtonLike onClick={createAppUser}>Crear usuario</ButtonLike>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Empresas habilitadas</div>
                <div style={styles.permissionsGrid}>
                  {COMPANY_OPTIONS.map((company) => (
                    <label key={company.value} style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={newUserDraft.allowedCompanies.includes(company.value)}
                        onChange={() =>
                          setNewUserDraft((prev) => ({
                            ...prev,
                            allowedCompanies: prev.allowedCompanies.includes(company.value)
                              ? prev.allowedCompanies.filter((item) => item !== company.value)
                              : [...prev.allowedCompanies, company.value],
                          }))
                        }
                      />
                      {company.short}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Solapas habilitadas</div>
                <div style={styles.permissionsGrid}>
                  {TAB_OPTIONS.map((tab) => (
                    <label key={tab.key} style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={newUserDraft.allowedTabs.includes(tab.key)}
                        onChange={() =>
                          setNewUserDraft((prev) => ({
                            ...prev,
                            allowedTabs: prev.allowedTabs.includes(tab.key)
                              ? prev.allowedTabs.filter((item) => item !== tab.key)
                              : [...prev.allowedTabs, tab.key],
                          }))
                        }
                      />
                      {tab.label}
                    </label>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Usuarios creados" nested>
              {users.length === 0 ? (
                <div style={styles.empty}>No hay usuarios cargados.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} style={styles.subCard}>
                    <div style={styles.inlineActions}>
                      <strong>{user.name}</strong>
                      <span style={{ ...styles.statusPill, ...(user.isAdmin ? styles.statusBlue : styles.statusGray) }}>
                        {user.isAdmin ? "Administrador" : "Operativo"}
                      </span>
                      {!user.isAdmin && (
                        <button style={styles.smallBtn} onClick={() => removeAppUser(user.id)}>
                          Quitar
                        </button>
                      )}
                    </div>
                    <div style={{ ...styles.grid2, marginTop: 10 }}>
                      <Field label="Contrasena">
                        <input
                          style={styles.input}
                          value={user.password}
                          onChange={(e) => updateAppUserField(user.id, "password", e.target.value)}
                          disabled={user.isAdmin}
                        />
                      </Field>
                      <Field label="Activo">
                        <label style={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={user.active}
                            onChange={(e) => updateAppUserField(user.id, "active", e.target.checked)}
                            disabled={user.isAdmin}
                          />
                          Usuario habilitado
                        </label>
                      </Field>
                    </div>
                    {!user.isAdmin && (
                      <>
                        <div style={styles.label}>Empresas habilitadas</div>
                        <div style={styles.permissionsGrid}>
                          {COMPANY_OPTIONS.map((company) => (
                            <label key={`${user.id}-${company.value}`} style={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={user.allowedCompanies.includes(company.value)}
                                onChange={() => toggleUserCompanyPermission(user.id, company.value)}
                              />
                              {company.short}
                            </label>
                          ))}
                        </div>
                        <div style={{ ...styles.label, marginTop: 12 }}>Solapas habilitadas</div>
                        <div style={styles.permissionsGrid}>
                          {TAB_OPTIONS.map((tab) => (
                            <label key={`${user.id}-${tab.key}`} style={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={user.allowedTabs.includes(tab.key)}
                                onChange={() => toggleUserTabPermission(user.id, tab.key)}
                              />
                              {tab.label}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </Panel>
          </div>
        </Panel>
      )}

      <div style={styles.tabsRow}>
        {visibleTabOptions.map((tab) => (
          <button
            key={tab.key}
            style={activeTab === tab.key ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.key as TabKey)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "cashflow" && (
        <div style={styles.column}>
          <Panel title="Cash flow y estado de resultados">
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

          <Panel title="Resultado preliminar">
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

          <Panel title={`Calendario anual unificado ${analysisYear}`}>
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

          <Panel title={`Calendario anual de desendeudamiento ${analysisYear}`}>
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
            title="Resumen bancario"
            actions={<ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>}
          >
            <div style={styles.metricGrid}>
              <MiniMetric label="Ingresos banco" value={money(bankStatementSummary.credits)} />
              <MiniMetric label="Egresos banco" value={money(bankStatementSummary.debits)} />
              <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
              <MiniMetric label="Ultimo saldo" value={money(bankStatementSummary.lastBalance)} />
            </div>
            <div style={styles.noticeBox}>
              Este bloque queda preparado para replicar la lógica de sus planillas auxiliares de bancos: fecha, banco, crédito/débito, concepto, monto y saldo. También alimenta el calendario anual de cash flow.
            </div>
            {bankStatementEntries.length === 0 ? (
              <div style={styles.empty}>Todavia no hay movimientos bancarios cargados.</div>
            ) : (
              bankStatementEntries.map((entry) => (
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
          <Panel title="Resumen de compras pendientes">
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

          <Panel title="Resumen administrativo de compras">
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

          <Panel title="Facturas blancas vinculadas desde caja chica">
            {visiblePettyCashExpenses.filter((item) => item.administration === "blanco").length === 0 ? (
              <div style={styles.empty}>No hay gastos de caja chica en blanco para levantar dentro de compras.</div>
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
                  {visiblePettyCashExpenses
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

          <Panel title="Gantt de compras">
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
            title="Facturas de compra"
            actions={<ButtonLike onClick={addPurchaseInvoice}>Agregar factura</ButtonLike>}
          >
            <div style={styles.noticeBox}>
              Puedes cargar una imagen o PDF y dejar que el sistema precomplete una base editable. Después podremos mejorar esta lectura automática con OCR más fino.
            </div>
            {purchaseInvoices.length === 0 ? (
              <div style={styles.empty}>Todavia no hay facturas de compra cargadas.</div>
            ) : (
              purchaseInvoices.map((invoice) => (
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
                    <label style={styles.buttonLikeLabel}>
                      Cargar imagen o PDF
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => uploadPurchaseInvoiceFile(invoice.id, e.target.files?.[0] || null)}
                      />
                    </label>
                    {invoice.attachmentName && <div style={styles.fileName}>{invoice.attachmentName}</div>}
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}

      {activeTab === "cajaChica" && (
        <div style={styles.column}>
          <Panel title="Resumen de caja chica">
            <div style={styles.metricGrid}>
              <MiniMetric label="Fondos activos" value={String(visiblePettyCashFunds.filter((item) => item.active).length)} />
              <MiniMetric label="Monto asignado" value={money(pettyCashSummary.assignedTotal)} />
              <MiniMetric label="Rendido" value={money(pettyCashSummary.renderedTotal)} />
              <MiniMetric label="Saldo pendiente" value={money(pettyCashSummary.pendingBalance)} />
              <MiniMetric label="Administracion blanco" value={money(pettyCashSummary.whiteTotal)} />
              <MiniMetric label="Administracion negro" value={money(pettyCashSummary.blackTotal)} />
            </div>
            <div style={styles.noticeBox}>
              Caja chica queda pensada como administracion fuera del circuito bancario. Si un gasto se marca en blanco, tambien queda referenciado dentro de Compras para seguimiento contable.
            </div>
          </Panel>

          <Panel
            title="Responsables y fondos"
            actions={<ButtonLike onClick={addPettyCashFund}>Agregar responsable</ButtonLike>}
          >
            {visiblePettyCashFunds.length === 0 ? (
              <div style={styles.empty}>Todavia no hay fondos de caja chica cargados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Empresa</th>
                    <th>Responsable</th>
                    <th>Monto asignado</th>
                    <th>Entrega</th>
                    <th>Rendido</th>
                    <th>Saldo</th>
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
                            value={fund.responsible}
                            onChange={(e) => updateArrayItem(setPettyCashFunds, fund.id, "responsible", e.target.value)}
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
                        <td>{money(rendered)}</td>
                        <td>{money(Number(fund.assignedAmount || 0) - rendered)}</td>
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

          <Panel
            title="Rendicion de gastos"
            actions={<ButtonLike onClick={addPettyCashExpense}>Agregar gasto</ButtonLike>}
          >
            {visiblePettyCashExpenses.length === 0 ? (
              <div style={styles.empty}>Todavia no hay gastos de caja chica cargados.</div>
            ) : (
              visiblePettyCashExpenses.map((expense) => (
                <div key={expense.id} style={styles.subCard}>
                  <div style={styles.inlineActions}>
                    <button style={styles.smallBtn} onClick={() => removePettyCashExpense(expense.id)}>
                      Quitar gasto
                    </button>
                  </div>
                  <TwoCol>
                    <Field label="Empresa">
                      <select
                        style={styles.input}
                        value={expense.company}
                        onChange={(e) =>
                          updatePettyCashExpense(expense.id, "company", e.target.value as CompanyName)
                        }
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Responsable / fondo">
                      <select
                        style={styles.input}
                        value={expense.fundId ?? ""}
                        onChange={(e) =>
                          updatePettyCashExpense(
                            expense.id,
                            "fundId",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      >
                        <option value="">Sin fondo asignado</option>
                        {visiblePettyCashFunds
                          .filter((item) => item.company === expense.company)
                          .map((fund) => (
                            <option key={fund.id} value={fund.id}>
                              {fund.responsible}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Fecha">
                      <input
                        style={styles.input}
                        type="date"
                        value={expense.date}
                        onChange={(e) => updatePettyCashExpense(expense.id, "date", e.target.value)}
                      />
                    </Field>
                    <Field label="Categoria">
                      <input
                        style={styles.input}
                        value={expense.category}
                        onChange={(e) => updatePettyCashExpense(expense.id, "category", e.target.value)}
                      />
                    </Field>
                    <Field label="Descripcion">
                      <input
                        style={styles.input}
                        value={expense.description}
                        onChange={(e) => updatePettyCashExpense(expense.id, "description", e.target.value)}
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
                    <Field label="Administracion">
                      <select
                        style={styles.input}
                        value={expense.administration}
                        onChange={(e) =>
                          updatePettyCashExpense(
                            expense.id,
                            "administration",
                            e.target.value as "blanco" | "negro"
                          )
                        }
                      >
                        <option value="negro">Negro</option>
                        <option value="blanco">Blanco</option>
                      </select>
                    </Field>
                    <Field label="Proveedor">
                      <input
                        style={styles.input}
                        value={expense.supplier}
                        onChange={(e) => updatePettyCashExpense(expense.id, "supplier", e.target.value)}
                      />
                    </Field>
                    <Field label="Factura / comprobante">
                      <input
                        style={styles.input}
                        value={expense.invoiceNumber}
                        onChange={(e) => updatePettyCashExpense(expense.id, "invoiceNumber", e.target.value)}
                      />
                    </Field>
                    <Field label="Vinculo con compras">
                      <input
                        style={styles.input}
                        value={expense.administration === "blanco" ? "Si, visible en compras" : "Solo caja chica"}
                        readOnly
                      />
                    </Field>
                  </TwoCol>
                  <Field label="Notas">
                    <textarea
                      style={styles.textarea}
                      value={expense.notes}
                      onChange={(e) => updatePettyCashExpense(expense.id, "notes", e.target.value)}
                    />
                  </Field>
                  <div style={styles.uploadActions}>
                    <label style={styles.buttonLikeLabel}>
                      Cargar factura / ticket
                      <input
                        type="file"
                        accept="image/*,.pdf,application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => uploadPettyCashFile(expense.id, e.target.files?.[0] || null)}
                      />
                    </label>
                    {expense.attachmentName && <div style={styles.fileName}>{expense.attachmentName}</div>}
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}

      {activeTab === "presupuesto" && (
        <div style={styles.grid3}>
          <div style={styles.column}>
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
                <Field label="CUIT">
                  <input
                    style={styles.input}
                    value={budget.cuit}
                    readOnly
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
                      const images = await Promise.all(files.map((file) => readImage(file)));
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
                      const images = await Promise.all(files.map((file) => readImage(file)));
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
          </div>

          <div style={styles.column}>
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
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Descripcion</th>
                    <th>Grupo</th>
                    <th>Stock</th>
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
                        <td>{stockMatch?.group || item.stockGroup || "-"}</td>
                        <td>{stockMatch ? `${stockMatch.quantity} ${stockMatch.unit}` : "-"}</td>
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

          <div style={styles.column}>
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
                  guÃ¡rdalo y luego sigue cargando el siguiente.
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

            <Panel title="Resumen">
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
        </div>
      )}

      {activeTab === "marcadores" && (
        <div style={styles.column}>
          <Panel
            title="Marcadores base por empresa y tipo de trabajo"
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

          <Panel title="Costos fijos por grupo" actions={<ButtonLike onClick={addFixedMarker}>Agregar marcador</ButtonLike>}>
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
                        onChange={(e) =>
                          updateArrayItem(setFixedMarkers, item.id, "group", e.target.value as MarkerFixedGroup)
                        }
                      >
                        {["Administrativos", "Comerciales", "Financieros", "Edilicios", "Operativos"].map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
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

          <Panel title="Insumos y fletes base" actions={<ButtonLike onClick={addSupplyMarker}>Agregar marcador</ButtonLike>}>
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
              <MiniMetric label="Presupuestos guardados" value={String(savedBudgets.length)} />
            </div>
          </Panel>

          <Panel title="CRM de clientes" actions={<ButtonLike onClick={() => exportPrint("report-historial")} secondary>Reporte</ButtonLike>}>
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
                      <td>{row.client}</td>
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
                          <button style={styles.smallBtn} onClick={() => setSelectedHistoryId(item.id)}>
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

          <Panel title="Historial de presupuestos por empresa" actions={<ButtonLike onClick={() => exportPrint("report-historial")} secondary>Reporte</ButtonLike>}>
            {savedBudgets.length === 0 ? (
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
                      {group.items.map((item) => (
                        <tr
                          key={item.id}
                          style={
                            selectedHistoryId === item.id
                              ? { background: group.soft }
                              : { background: `${group.soft}66` }
                          }
                        >
                          <td>{getSavedBudgetDisplayLabel(item)}</td>
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
                          <td>{item.status}</td>
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
                              <button style={styles.smallBtn} onClick={() => setSelectedHistoryId(item.id)}>
                                Abrir
                              </button>
                            )}
                            <button
                              style={styles.smallBtn}
                              onClick={() => loadBudgetFromSnapshot(item.snapshot, item.id)}
                            >
                              Editar
                            </button>
                            <button
                              style={styles.smallBtn}
                              onClick={() => removeSavedBudget(item.id)}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
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
                      {selectedBudget.snapshot.materials.map((material) => {
                        const stock = stockByDescription.get(material.description.trim().toLowerCase());
                        const available = stock?.quantity ?? 0;
                        const missing = Math.max(0, material.qty - available);
                        const tone =
                          available >= material.qty ? styles.statusGreen : available > 0 ? styles.statusYellow : styles.statusRed;
                        const label = available >= material.qty ? "Completo" : available > 0 ? "Parcial" : "Faltante";
                        return (
                          <tr key={material.id}>
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
        </div>
      )}

      {activeTab === "aprobados" && (
        <div style={styles.column}>
          <Panel
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
                          <td>{job.executionStatus}</td>
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

          <Panel title="Evolucion de trabajos">
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
                  <label style={styles.buttonLikeLabel}>
                    Cargar planos
                    <input
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) =>
                        uploadApprovedJobWorkFiles(
                          selectedApprovedJob.id,
                          "plano",
                          e.target.files
                        )
                      }
                    />
                  </label>
                  <label style={styles.buttonLikeLabel}>
                    Cargar referencias
                    <input
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) =>
                        uploadApprovedJobWorkFiles(
                          selectedApprovedJob.id,
                          "referencia",
                          e.target.files
                        )
                      }
                    />
                  </label>
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
        <div style={styles.column}>
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
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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

          {selectedFinancialItem && (
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
          )}
        </div>
      )}

      {activeTab === "stock" && (
        <div style={styles.column}>
          <Panel title="Agenda de fabricacion" actions={<ButtonLike onClick={() => exportPrint("report-stock")} secondary>Reporte</ButtonLike>}>
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

          <Panel
            title="Inventario y alertas"
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
                      <select
                        style={styles.input}
                        value={item.group}
                        onChange={(e) => updateStockItem(item.id, "group", e.target.value)}
                      >
                        {STOCK_GENERAL_GROUP_OPTIONS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
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
        <div style={styles.column}>
          <div style={{ order: 5 }}>
          <Panel
            title="Alta, configuracion base y escalas"
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ButtonLike onClick={applyBaseConfigToAllEmployees}>Aplicar base</ButtonLike>
                <ButtonLike onClick={addEmployee}>Agregar empleado</ButtonLike>
                <ButtonLike onClick={() => exportPrint("report-personal")} secondary>Reporte</ButtonLike>
              </div>
            }
          >
            <Panel
              title="Alta de empleados y costo base por categoria"
              nested
              actions={<ButtonLike onClick={addEmployee}>Agregar empleado</ButtonLike>}
            >
              <div style={styles.muted}>
                Esta tabla muestra cuanto cobraria una persona nueva por empresa y categoria, sin
                faltas, con presentismo completo y antiguedad inicial cero. El costo hora ya
                contempla sueldo, cargas, aguinaldo prorrateado y provisiones mensuales.
              </div>

              <table style={{ ...styles.table, marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Categoria</th>
                    <th>Mes</th>
                    <th>Base hora</th>
                    <th>No remun./hora</th>
                    <th>Bruto base</th>
                    <th>Presentismo</th>
                    <th>Antiguedad</th>
                    <th>Descuentos</th>
                    <th>Cargas empresa</th>
                    <th>Provision mensual</th>
                    <th>SAC mensual</th>
                    <th>Neto referencia</th>
                    <th>Impacto empresa</th>
                    <th>Costo hora</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBaseRows.map((row) => (
                    <tr key={`${row.company}-${row.category}`}>
                      <td>
                        <span
                          style={{
                            ...styles.statusPill,
                            background: getCompanyMeta(row.company).soft,
                            color: getCompanyMeta(row.company).primary,
                          }}
                        >
                          {row.companyShort}
                        </span>
                      </td>
                      <td>{row.category}</td>
                      <td>{row.summary.scale ? monthLabel(row.summary.scale.month) : monthLabel(payrollMonth)}</td>
                      <td>{money(row.summary.baseHourly)}</td>
                      <td>{money(row.summary.nonRemHourly)}</td>
                      <td>{money(row.summary.totalGross)}</td>
                      <td>{money(row.summary.presentismo)}</td>
                      <td>{money(row.summary.seniorityBonus)}</td>
                      <td>{money(row.summary.descuentos)}</td>
                      <td>{money(row.summary.employerContrib + row.summary.employerInsurance)}</td>
                      <td>{money(row.summary.monthlyProvisionCost)}</td>
                      <td>{money(row.summary.monthlySACProration)}</td>
                      <td>{money(row.summary.net)}</td>
                      <td>{money(row.summary.employerImpact)}</td>
                      <td>{money(row.summary.hourlyCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel
              title="Costo real por empresa y categoria"
              nested
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

            <div style={styles.grid2}>
              <Panel title="Configuracion base" nested>
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
                            id: Date.now(),
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
                          { id: Date.now(), name: "" },
                        ],
                      }))
                    }
                  >
                    Agregar documento
                  </button>
                </div>
              </Panel>

              <Panel title="Escalas salariales" nested>
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
          </Panel>
          </div>

          <div style={{ order: 1 }}>
          <Panel title="Resumen por empresa">
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

          <div style={{ order: 2 }}>
          <Panel title="Empleados">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Legajo</th>
                  <th>Nombre</th>
                  <th>Categoria</th>
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
                      <td>{employee.name}</td>
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
                      <td>{money(salary.net)}</td>
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

          {selectedEmployee && (
            <div style={{ order: 3 }}>
            <Panel
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

                    <div style={styles.grid2}>
                      <Panel title="Datos basicos" nested>
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
                          <Field label="Nombre">
                            <input
                              style={styles.input}
                              value={selectedEmployee.name}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "name", e.target.value)}
                            />
                          </Field>
                          <Field label="Categoria">
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
                          <Field label="Antiguedad años">
                            <input
                              style={styles.input}
                              type="number"
                              value={selectedEmployee.seniorityYears}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "seniorityYears", Number(e.target.value))}
                            />
                          </Field>
                          <Field label="Hora neta manual">
                            <input
                              style={styles.input}
                              type="number"
                              value={selectedEmployee.hourlyNetManual}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "hourlyNetManual", Number(e.target.value))}
                            />
                          </Field>
                          <Field label="Hora bruta manual">
                            <input
                              style={styles.input}
                              type="number"
                              value={selectedEmployee.hourlyGrossManual}
                              onChange={(e) => updateEmployeeField(selectedEmployee.id, "hourlyGrossManual", Number(e.target.value))}
                            />
                          </Field>
                        </TwoCol>

                        <div style={{ marginTop: 12 }}>
                          <div style={styles.panelHeader}>
                            <h4 style={{ margin: 0, fontSize: 15 }}>EPP e insumos entregados</h4>
                            <div style={styles.inlineActions}>
                              <ButtonLike onClick={() => addEmployeeProvisionItem(selectedEmployee.id, "EPP")} secondary>
                                Agregar EPP
                              </ButtonLike>
                              <ButtonLike onClick={() => addEmployeeProvisionItem(selectedEmployee.id, "Insumos")}>
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

                      <Panel title="Liquidacion del mes" nested>
                        <TwoCol>
                          <Field label="Horas normales (desde calendario)">
                            <input style={styles.inputReadOnly} type="number" value={payroll.normalHours} readOnly />
                          </Field>
                          <Field label="Horas feriado">
                            <input style={styles.input} type="number" value={payroll.holidayHours} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "holidayHours", Number(e.target.value))} />
                          </Field>
                          <Field label="Horas extra 50 (desde calendario)">
                            <input style={styles.inputReadOnly} type="number" value={payroll.extra50Hours} readOnly />
                          </Field>
                          <Field label="Horas extra 100 (desde calendario)">
                            <input style={styles.inputReadOnly} type="number" value={payroll.extra100Hours} readOnly />
                          </Field>
                          <Field label="Hs nocturnas 50">
                            <input style={styles.input} type="number" value={payroll.night50Hours} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "night50Hours", Number(e.target.value))} />
                          </Field>
                          <Field label="Hs nocturnas">
                            <input style={styles.input} type="number" value={payroll.nightHours} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "nightHours", Number(e.target.value))} />
                          </Field>
                          <Field label="Ausencias injustificadas (hs)">
                            <input style={styles.input} type="number" value={payroll.unjustifiedAbsenceHours} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "unjustifiedAbsenceHours", Number(e.target.value))} />
                          </Field>
                          <Field label="Ausencias justificadas (hs)">
                            <input style={styles.input} type="number" value={payroll.justifiedAbsenceHours} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "justifiedAbsenceHours", Number(e.target.value))} />
                          </Field>
                          <Field label="Vacaciones (dias)">
                            <input style={styles.input} type="number" value={payroll.vacationsDays} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "vacationsDays", Number(e.target.value))} />
                          </Field>
                          <Field label="Presentismo %">
                            <input style={styles.input} type="number" value={payroll.presentismoPctOverride ?? 0} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "presentismoPctOverride", Number(e.target.value))} />
                          </Field>
                          <Field label="Anticipos">
                            <input style={styles.input} type="number" value={payroll.anticipos} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "anticipos", Number(e.target.value))} />
                          </Field>
                          <Field label="Impacto empresa %">
                            <input style={styles.input} type="number" value={payroll.employerExtraPct} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "employerExtraPct", Number(e.target.value))} />
                          </Field>
                        </TwoCol>
                        <Field label="Notas de liquidacion">
                          <textarea style={styles.textarea} value={payroll.notes} onChange={(e) => updateEmployeePayroll(selectedEmployee.id, payrollMonth, "notes", e.target.value)} />
                        </Field>
                      </Panel>
                    </div>

                    <Panel title="Presentismo y ausencias" nested>
                      <div style={styles.attendanceGrid}>
                        {attendanceMonthData.map((day) => {
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

                              <div style={{ marginTop: 8 }}>
                                <div style={styles.label}>Horas normales</div>
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
                              </div>

                              <div style={{ marginTop: 8 }}>
                                <div style={styles.label}>Horas al 50</div>
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
                              </div>

                              <div style={{ marginTop: 8 }}>
                                <div style={styles.label}>Horas al 100</div>
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
                              </div>

                              {status === "ausente_justificado" && (
                                <div style={{ marginTop: 8 }}>
                                  <label style={styles.buttonLikeLabel}>
                                    Cargar justificativo
                                    <input
                                      type="file"
                                      style={{ display: "none" }}
                                      onChange={(e) =>
                                        handleAttendanceAttachment(
                                          selectedEmployee.id,
                                          day.key,
                                          e.target.files?.[0] || null
                                        )
                                      }
                                    />
                                  </label>
                                  {record?.attachmentName && (
                                    <div style={styles.fileName}>{record.attachmentName}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Panel>

                    <div style={styles.grid2}>
                      <Panel title="Documentacion del empleado" nested actions={<ButtonLike onClick={() => addEmployeeDocument(selectedEmployee.id)}>Agregar documento</ButtonLike>}>
                        {selectedEmployee.documents.map((doc) => {
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
                                <button style={styles.smallBtn} onClick={() => removeEmployeeDocument(selectedEmployee.id, doc.id)}>
                                  Quitar documento
                                </button>
                              </div>
                              <TwoCol>
                                <Field label="Documento">
                                  <input style={styles.input} value={doc.name} onChange={(e) => updateEmployeeDocument(selectedEmployee.id, doc.id, "name", e.target.value)} />
                                </Field>
                                <Field label="Vencimiento">
                                  <input style={styles.input} type="date" value={doc.dueDate} onChange={(e) => updateEmployeeDocument(selectedEmployee.id, doc.id, "dueDate", e.target.value)} />
                                </Field>
                              </TwoCol>
                              <div style={styles.uploadActions}>
                                <span style={{ ...styles.statusPill, ...docTone }}>{docState}</span>
                                <label style={styles.buttonLikeLabel}>
                                  Cargar documento
                                  <input
                                    type="file"
                                    style={{ display: "none" }}
                                    onChange={(e) =>
                                      handleEmployeeDocumentUpload(
                                        selectedEmployee.id,
                                        doc.id,
                                        e.target.files?.[0] || null
                                      )
                                    }
                                  />
                                </label>
                                {doc.attachmentName && <div style={styles.fileName}>{doc.attachmentName}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </Panel>

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

      <div id="client-budget-pdf" style={{ display: "none" }}>
        <BudgetDocument
          budget={budget}
          sections={workingBudgetSections}
          consolidatedTotals={consolidatedBudgetTotals}
          vatPct={vatPct}
          estimatedDeliveryDate={budgetEstimatedDeliveryDate}
          companyTheme={companyTheme}
        />
      </div>

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

      <PrintReport id="report-historial" title="Reporte - CRM">
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
            {savedBudgets.map((item) => (
              <tr key={item.id}>
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

      <PrintReport id="report-personal" title="Reporte - Personal">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Legajo</th>
              <th>Empleado</th>
              <th>Categoria</th>
              <th>Neto</th>
              <th>Impacto</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
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
            {financialItems.map((item) => (
              <tr key={item.id}>
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
  const accentBlockStyle: React.CSSProperties = {
    ...styles.printBlock,
    borderColor: companyTheme.primary,
    borderWidth: 1,
    borderStyle: "solid",
    background: "transparent",
  };

  return (
    <div style={{ ...styles.printSheet, borderTop: `10px solid ${companyTheme.primary}` }}>
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
          background: companyTheme.primary,
          color: "white",
          borderRadius: 20,
          padding: 24,
          borderBottom: "none",
        }}
      >
        <div>
          <div style={styles.printLogoRow}>
            {budget.logos.map((image, index) => (
              <img
                key={`${image.name}-${index}`}
                src={image.preview}
                alt={image.name}
                style={styles.printHeaderLogo}
              />
            ))}
            <div style={{ ...styles.companyRibbon, background: companyTheme.soft, color: companyTheme.primary }}>
              {companyTheme.short}
            </div>
          </div>
          {budget.isUpdate && (
            <div style={{ ...styles.statusPill, ...styles.statusBlue, marginTop: 10 }}>
              {budget.updateLabel || "Actualizacion"}
            </div>
          )}
          <h1 style={{ margin: "12px 0 4px 0" }}>{budget.project}</h1>
          <div>{budget.client}</div>
        </div>
        <div style={styles.previewMeta}>
          <div><strong>Nro:</strong> {budget.number}</div>
          <div><strong>Fecha:</strong> {formatDateDisplay(budget.date)}</div>
          <div><strong>Entrega:</strong> {formatDateDisplay(estimatedDeliveryDate)}</div>
          <div><strong>Forma de pago:</strong> {budget.paymentTerms}</div>
        </div>
      </div>

      {budget.referenceImages.length > 0 && (
        <div style={accentBlockStyle}>
          <div style={styles.label}>Imagenes de referencia</div>
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

      <div style={accentBlockStyle}>
        <div style={styles.label}>Descripcion</div>
        <div>{budget.notes}</div>
      </div>

      <div style={accentBlockStyle}>
        <div style={styles.label}>Alcance</div>
        <div>{budget.scope}</div>
      </div>

      {sections.map((section, index) => (
        <div key={section.id} style={accentBlockStyle}>
          <div style={styles.printSectionHeader}>
            <div>
              <div style={styles.label}>
                {section.title || `Subpresupuesto ${index + 1}`}
              </div>
              {section.notes && <div>{section.notes}</div>}
            </div>
            <div style={styles.printSectionMeta}>
              <div><strong>Neto:</strong> {money(section.totals.netPrice)}</div>
              <div><strong>Total c/IVA:</strong> {money(section.totals.finalPrice)}</div>
            </div>
          </div>

          <div style={styles.label}>Materiales incluidos</div>
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
            <div style={{ marginTop: 12 }}>
              <div><strong>Neto antes de descuentos:</strong> {money(section.totals.preDiscountNetPrice)}</div>
              {section.discounts.map((item) => (
                <div key={item.id}>
                  <strong>{item.description}:</strong> -{money(item.amount)}
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
          border: `2px solid ${companyTheme.primary}`,
          background: "transparent",
        }}
      >
        {consolidatedTotals.totalDiscountAmount > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div><strong>Neto antes de descuentos:</strong> {money(consolidatedTotals.preDiscountNetPrice)}</div>
            <div><strong>Total descuentos:</strong> -{money(consolidatedTotals.totalDiscountAmount)}</div>
          </div>
        )}
        <div><strong>Valor neto total:</strong> {money(consolidatedTotals.netPrice)}</div>
        <div><strong>Total con IVA ({vatPct}%):</strong> {money(consolidatedTotals.finalPrice)}</div>
      </div>
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
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  nested?: boolean;
  green?: boolean;
}) {
  return (
    <div
      style={{
        ...styles.panel,
        ...(nested ? styles.nestedPanel : {}),
        ...(green ? styles.greenPanel : {}),
      }}
    >
      <div style={styles.panelHeader}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div>{actions}</div>
      </div>
      {children}
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.muted}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.button, ...(secondary ? styles.buttonSecondary : {}) }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    background: "#f8fafc",
    minHeight: "100vh",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "white",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  tabsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 },
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
    gridTemplateColumns: "1.1fr 1.2fr 0.9fr",
    gap: 18,
    alignItems: "start",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  column: { display: "flex", flexDirection: "column", gap: 18 },
  panel: {
    background: "white",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
    marginBottom: 14,
    gap: 8,
    flexWrap: "wrap",
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
    padding: 12,
    background: "white",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  rightStrong: {
    textAlign: "right",
    fontWeight: 700,
    marginTop: 10,
  },
  muted: { color: "#64748b", fontSize: 13 },
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
  button: {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    cursor: "pointer",
  },
  buttonSecondary: { background: "white", color: "#0f172a" },
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
  calendarEmpty: { fontSize: 12, color: "#94a3b8" },
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
  attendanceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  attendanceCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
    background: "#fff",
  },
  attendanceDayTitle: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 8,
    textTransform: "capitalize",
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
  },
  printWatermark: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 160,
    fontWeight: 800,
    opacity: 0.12,
    pointerEvents: "none",
    zIndex: 0,
  },
  printWatermarkLogo: {
    maxWidth: "72%",
    maxHeight: "72%",
    objectFit: "contain",
    opacity: 0.9,
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
  },
  printReferenceImage: {
    width: "100%",
    maxHeight: 240,
    objectFit: "contain",
    borderRadius: 12,
  },
  printReferenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
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
  },
};





