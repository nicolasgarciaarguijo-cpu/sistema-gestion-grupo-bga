// Dominio: tipos y constantes base del Sistema de Gestion Grupo BGA.
// Extraido de App.tsx para reducir el monolito. Sin logica de UI ni estado.

export type CompanyName = string;
export type CompanyScope = CompanyName | "General";

export const WORK_TYPE_OPTIONS = [
  "General",
  "Mobiliario",
  "Cocina",
  "Vestidor",
  "Oficina",
  "Local comercial",
  "Obra especial",
] as const;

export type WorkTypeName = (typeof WORK_TYPE_OPTIONS)[number];

export type TabKey =
  | "acceso"
  | "cashflow"
  | "fabricacion"
  | "compras"
  | "cajaChica"
  | "presupuesto"
  | "marcadores"
  | "historial"
  | "aprobados"
  | "facturacion"
  | "stock"
  | "personal"
  | "documentos";

export type PrintMode =
  | ""
  | "client-budget"
  | "payment-receipt"
  | "report-cashflow"
  | "report-fabricacion"
  | "report-compras"
  | "report-caja-chica"
  | "report-marcadores"
  | "report-historial"
  | "report-crm"
  | "report-aprobados"
  | "report-stock"
  | "report-personal"
  | "report-facturacion";

export type Material = {
  id: number;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  stockCode?: string;
  stockGroup?: string;
  stockLocation?: string;
  sortOrder?: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

export type LaborRow = {
  id: number;
  category: string;
  employees: number;
  monthlyHoursPerEmployee: number;
  hourlyRate: number;
  jobHours: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

export type FixedCost = {
  id: number;
  description: string;
  amount: number;
  sourceMarkerId?: number;
  sourceCompany?: CompanyName;
};

export type MarkerFixedGroup = string;

export type FixedMarker = {
  id: number;
  company: CompanyName;
  workType: WorkTypeName;
  group: MarkerFixedGroup;
  description: string;
  amount: number;
  active: boolean;
  notes: string;
};

export type SupplyMarkerSubtype =
  | "Insumos basicos"
  | "Flete"
  | "Entrega"
  | "Embalaje"
  | "Viaticos";

export type SupplyMarker = {
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

export type LaborMarker = {
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

export type PersonalProvisionKind = "EPP" | "Insumos" | "Examenes" | "Capacitaciones";
export const PERSONAL_PROVISION_KINDS: PersonalProvisionKind[] = [
  "EPP",
  "Insumos",
  "Examenes",
  "Capacitaciones",
];

export type PersonalProvisionMarker = {
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

export type BudgetImage = {
  name: string;
  preview: string;
};

export type BudgetDiscount = {
  id: number;
  description: string;
  amount: number;
  // Modo de descuento (F: descuentos en %). "monto" usa amount; "porcentaje" usa pct sobre el
  // precio antes de descuentos. Si esta undefined, se asume "monto" (compatibilidad con lo viejo).
  mode?: "monto" | "porcentaje";
  pct?: number;
};

export type BudgetIncrease = {
  id: number;
  description: string;
  pct: number;
};

export type BudgetSectionTotals = {
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

export type BudgetSection = {
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

export type BudgetData = {
  company: CompanyName;
  workType: WorkTypeName;
  number: string;
  date: string;
  client: string;
  clientId?: number;
  clientTaxId: string;
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
  // % de anticipo como dato numerico explicito. Si es undefined (presupuestos viejos), el calculo
  // cae al parseo del texto "forma de pago" (paymentTerms). Una vez seteado, manda el numero.
  advancePct?: number;
  isUpdate: boolean;
  updateLabel: string;
  logos: BudgetImage[];
  referenceImages: BudgetImage[];
};

export type BudgetSnapshot = {
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

// Cliente del CRM como ENTIDAD (fuente de verdad). id estable; el vinculo primario con
// presupuestos/trabajos es clientId, con fallback por nombre normalizado para datos viejos.
export type CrmClient = {
  id: number;
  name: string;
  taxId: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  company: CompanyName;
  createdAt: string;
};

export type SavedBudget = {
  id: number;
  rootBudgetId: number;
  revisionNumber: number;
  isUpdate: boolean;
  status: "borrador" | "aprobado" | "no_aprobado";
  exportedAs: "presupuesto";
  number: string;
  company: CompanyName;
  client: string;
  clientId?: number;
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

export type Invoice = {
  id: number;
  businessName: string;
  taxId: string;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotal: number;
  vatRate?: number; // alicuota %; si esta seteada, IVA y total se calculan desde subtotal + alicuota
  vat: number;
  total: number;
  attachmentName?: string;
};

export type Payment = {
  id: number;
  paymentNumber: string;
  paymentDate: string;
  transactionType: "efectivo" | "transferencia" | "cheque" | "otros";
  administration?: "blanco" | "negro"; // circuito del pago; default blanco si no se elige
  amount: number;
  attachmentName?: string;
};

export type Retention = {
  id: number;
  retentionNumber: string;
  retentionDate: string;
  retentionType: string;
  amount: number;
  attachmentName?: string;
};

export type LegacyApprovedInvoice = {
  invoiceDate: string;
  subtotal: number;
  vat: number;
  total: number;
};

export type LegacyApprovedPayment = {
  paymentDate: string;
  amount: number;
};

export type LegacyApprovedRetention = {
  retentionType: string;
  amount: number;
};

export type LegacyApprovedAdditional = {
  description: string;
  amount: number;
  date: string;
};

export type LegacyApprovedImportRow = {
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

export type AdditionalItem = {
  id: number;
  date: string;
  description: string;
  amount: number;
  notes: string;
};

export type CommissionPayment = {
  id: number;
  paymentDate: string;
  amount: number;
  note: string;
  attachmentName?: string;
};

export type ApprovedJob = {
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
  clientId?: number;
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
  // % de anticipo numerico (sincronizado desde el presupuesto). Si es undefined, el calculo
  // cae al parseo de la forma de pago del snapshot.
  advancePct?: number;
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

export type FinancialItemType = "facturacion" | "cobranza" | "pago";
export type FinancialItemStatus = "pendiente" | "realizado";

export type FinancialCalendarItem = {
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
  sourceRefId?: number; // id de la factura/pago real que origina este item (para matchear en la regen)
  preset?: "factura" | "anticipo" | "saldo" | "cobranza";
  // Circuito del movimiento (blanco/negro). Permite separar administraciones y ver cruces.
  administration?: "blanco" | "negro";
  // Si el usuario editó a mano un item autogenerado (p.ej. partió el saldo en cuotas),
  // la regeneración NO lo recalcula: respeta lo cargado a mano ("sin pisarse").
  userEdited?: boolean;
};

export type PurchaseInvoice = {
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

export type PettyCashFund = {
  id: number;
  company: CompanyName;
  description: string;
  responsible: string;
  assignedAmount: number;
  deliveredDate: string;
  rechargeDate: string;
  notes: string;
  active: boolean;
  closed: boolean;
  closedDate: string;
};

export type PettyCashExpense = {
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

export type DebtPlan = {
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

export type BankStatementEntry = {
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

export type StockMovement = {
  id: number;
  date: string;
  type: "entrada" | "salida";
  quantity: number;
  note: string;
};

export type StockItem = {
  id: number;
  company: CompanyName | "General";
  kind: "general" | PersonalProvisionKind;
  movements?: StockMovement[];
  shared: boolean;
  group: string;
  location: string;
  sortOrder: number;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  periodicityMonths: number;
  active: boolean;
};

export type CompanyAsset = {
  id: number;
  company: CompanyName;
  category: string;
  description: string;
  value: number;
  usefulLifeMonths: number;
  active: boolean;
  notes: string;
};

// Carga por carpetas vinculadas (F1). Un documento subido desde la carpeta "Sistema de Gestion" de la
// PC a Storage (bucket privado "documentos"), clasificado por tipo/mes (y empleado, para personal).
export type LinkedDocumentType =
  | "compras"
  | "facturas-emitidas"
  | "remitos"
  | "presupuestos"
  | "recibos"
  | "banco"
  | "cobranzas"
  | "caja-chica"
  | "escalas"
  | "documentacion"
  | "personal";

export type LinkedDocument = {
  id: number;
  docType: LinkedDocumentType;
  month: string; // "YYYY-MM" o "" si la carpeta no tiene mes
  employee?: string; // solo para personal
  subArea?: string; // Documentacion / EPP / Recibos (personal)
  fileName: string;
  relPath: string; // ruta relativa dentro de la carpeta raiz (clave de dedup)
  size: number;
  lastModified: number;
  storagePath: string; // path dentro del bucket documentos
  uploadedAt: string;
  assignedRefId?: number; // F2: id del registro (factura/pago/empleado) al que se asigno
};

export type CostAnalysisGroup = {
  id: number;
  name: string;
  company: CompanyScope;
  active: boolean;
  notes: string;
};

export type CostAnalysisEntry = {
  id: number;
  groupId: number;
  company: CompanyScope;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  active: boolean;
  notes: string;
};

export type RemitoDraftRow = {
  id: number;
  company: CompanyScope;
  description: string;
  group: string;
  location: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  matchedStockId: number | null;
};

export type RemitoDraft = {
  id: number;
  fileName: string;
  sourceType: "pdf" | "excel" | "otro";
  company: CompanyScope;
  notes: string;
  rows: RemitoDraftRow[];
};

export type SupabaseActiveSession = {
  session_id: string;
  user_id: string;
  email: string;
  full_name: string;
  active_tab: string;
  current_company: string;
  last_seen_at: string;
};

export type SupabaseInternalChatMessage = {
  id: number;
  user_id: string;
  email: string;
  full_name: string;
  message: string;
  recipient_user_id?: string | null;
  recipient_email?: string | null;
  recipient_full_name?: string | null;
  read_by?: string[] | null;
  created_at: string;
};

export type SupabaseDirectoryUser = {
  id: string;
  full_name: string;
  is_superadmin?: boolean | null;
  active?: boolean | null;
};

export type SupabaseSnapshotRecord = {
  payload: unknown;
  saved_at: string;
  updated_by: string | null;
  module_keys?: string[];
};

export type InternalAssistantMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  created_at: string;
};

export type WorkspaceNotification = {
  id: number;
  text: string;
  created_at: string;
  read: boolean;
};

export type AppUser = {
  id: number;
  name: string;
  password: string;
  isAdmin: boolean;
  active: boolean;
  allowedTabs: TabKey[];
  allowedCompanies: CompanyName[];
};

export type EmployeeDocument = {
  id: number;
  name: string;
  dueDate: string;
  attachmentName: string;
};

export type EmployeeProvisionKind = PersonalProvisionKind;

export type EmployeeProvisionItem = {
  id: number;
  stockCode: string;
  kind: EmployeeProvisionKind;
  quantity: number;
  dueDate: string;
  attachmentName: string;
  notes: string;
};

export type AttendanceStatus =
  | "sin_cargar"
  | "presente"
  | "ausente_injustificado"
  | "ausente_justificado"
  | "vacaciones";

export type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  normalHours: number;
  extra50Hours: number;
  extra100Hours: number;
  attachmentName: string;
  notes: string;
};

export type EmployeePayroll = {
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
  cashBonus: number; // premio NEGRO: se paga al neto, sin cargas.
  // premio BLANCO: entra al bruto remunerativo (paga jubilacion/obra social/sindicato + cargas
  // patronales). Opcional: si falta (datos viejos) = 0, sin cambios.
  whiteBonus?: number;
  presentismoPctOverride: number | null;
  employerExtraPct: number;
  manualOverride: boolean;
  savedAt: string;
  notes: string;
};

export type Employee = {
  id: number;
  company: CompanyName;
  legajo: string;
  name: string;
  category: string;
  nominalHours: number;
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
  // Marcas de tiempo para el semaforo ("desde cuando"): fecha de carga (alta del registro) y
  // fecha de ultima modificacion. Opcionales: los registros viejos las reciben al guardar.
  createdAt?: string;
  updatedAt?: string;
};

export type EmployeeBaseDocument = {
  id: number;
  name: string;
};

export type EmployeeBaseProvisionTemplate = {
  id: number;
  stockCode: string;
  kind: EmployeeProvisionKind;
  quantity: number;
  validityMonths: number;
};

export type EmployeeBaseConfig = {
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
  // Para el costo-hora sobre horas PRODUCTIVAS: dias/año no trabajados que se descuentan
  // de las horas nominales. Si faltan (datos viejos) se toman 0 = costo-hora como antes.
  annualHolidayDays?: number;
  annualVacationDays?: number;
  eppSemiannualCost: number;
  suppliesSemiannualCost: number;
  requiredDocuments: EmployeeBaseDocument[];
  provisionTemplates: EmployeeBaseProvisionTemplate[];
};

export type ScaleRow = {
  id: number;
  month: string;
  category: string;
  baseHourly: number;
  nonRemHourly: number;
  vht: number;
  sourceFileName: string;
};

