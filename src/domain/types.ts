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
  | "calendarioAnual"
  | "fabricacion"
  | "compras"
  | "cajaChica"
  | "presupuesto"
  | "marcadores"
  | "historial"
  | "aprobados"
  | "facturacion"
  | "emitirFacturas"
  | "stock"
  | "personal"
  | "asistencia"
  | "costos"
  | "bancos"
  | "tarjetas"
  | "movimientosInternos"
  | "documentos"
  | "manual";

export type PrintMode =
  | ""
  | "client-budget"
  | "payment-receipt"
  | "recibo-blanco"
  | "recibo-negro"
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

// Costo mensual de provisiones POR EMPLEADO abierto por tipo. `total` es la suma de los cuatro tipos:
// se guarda calculado para que el impacto de la empresa no dependa de volver a sumar en cada vista.
export type ProvisionBreakdown = Record<PersonalProvisionKind, number> & { total: number };

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
  // Cantidad cotizada del bloque. El bloque se cotiza como 1 unidad y se escala x N (N unidades
  // identicas) sin rehacer el presupuesto. Ausente = 1 (presupuestos viejos). Escala precio, costo,
  // horas de trabajo y ocupacion; los totales por unidad quedan guardados en `totals`.
  quantity?: number;
  // Moneda del bloque. Ausente = ARS (pesos). Un presupuesto puede tener bloques en pesos y bloques
  // en USD; sus totales NUNCA se suman entre si (se consolidan por moneda por separado).
  currency?: "ARS" | "USD";
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
  netPriceUsd?: number; // neto de los bloques dolarizados (0 si no hay). No se suma con netPrice.
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
  // Datos de la emision en AFIP (WSFE). Vacios = no emitida por el sistema.
  afipCae?: string;
  afipCaeVto?: string;
  afipCbteNro?: number;
  afipPtoVta?: number;
  afipCbteTipo?: number;
  afipResultado?: string; // "A" aprobada / "R" rechazada
  afipError?: string;
  afipEnv?: string; // "homo" | "prod"
};

export type Payment = {
  id: number;
  paymentNumber: string;
  paymentDate: string;
  transactionType: "efectivo" | "transferencia" | "cheque" | "otros";
  administration?: "blanco" | "negro"; // circuito del pago; default blanco si no se elige
  currency?: "ARS" | "USD"; // moneda del pago; ausente = ARS (pesos). USD y ARS nunca se suman.
  amount: number;
  // Cotización U$S→$ a la que se tomó el billete (solo aplica a pagos en USD). Es "a cuánto se
  // tomó el dólar" en ese cobro puntual.
  exchangeRate?: number;
  // Si es true (y hay exchangeRate>0), el pago en USD se PESIFICA: su equivalente en pesos
  // (amount × exchangeRate) descuenta del saldo en PESOS del trabajo y sale del circuito U$S
  // (no cuenta como dólar cobrado ni entra a la billetera USD de la reserva). Ausente/false =
  // dólar puro (descuenta del saldo U$S, como siempre).
  arsApplied?: boolean;
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
  amount: number; // neto del adicional (sin IVA)
  // Circuito del adicional. Ausente = blanco (compat con datos viejos). Blanco discrimina IVA y suma
  // al circuito blanco; negro va por fuera (sin IVA), al circuito negro.
  administration?: "blanco" | "negro";
  // Alicuota de IVA del adicional blanco (%). Ausente = usa el vatPct del presupuesto (o 21%). En los
  // adicionales negros no aplica.
  vatRate?: number;
  notes: string;
};

export type CommissionPayment = {
  id: number;
  paymentDate: string;
  amount: number;
  note: string;
  // Circuito del pago de comisión (definición administrativa). Ausente = blanco.
  administration?: "blanco" | "negro";
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
  // Neto vendido en USD (suma de los bloques dolarizados del presupuesto). Ausente/0 = todo pesos.
  // NUNCA se suma con soldNetPrice (pesos): el saldo en dolares se sigue por separado.
  soldNetPriceUsd?: number;
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
  // Fecha (ISO) en que se confirmo que los planos de fabricacion estan terminados. Vacio/undefined =
  // sin confirmar. Con archivos plano pero sin confirmar => "en proceso" (lo sabe el usuario, no el
  // sistema: puede haber 20 planos y faltar 5 en un mismo archivo). Ver domain/planos.ts.
  planosConfirmedAt?: string;
  additionals: AdditionalItem[];
  // Descuentos aplicados DESPUES de aprobado el trabajo (el cliente da de baja algo). Misma forma que
  // un adicional (fecha, descripcion, monto) pero RESTAN del valor a cobrar. Opcional: datos viejos no lo tienen.
  discounts?: AdditionalItem[];
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
  // Subcategoría de ingreso (solo cobranzas), para el Calendario anual: cobranza de trabajo (ppto +
  // cliente), préstamo recibido, ingreso financiero o ingreso vario. Ausente = trabajo.
  incomeCategory?: "trabajo" | "prestamo" | "financiero" | "varios";
  // Renglón del Calendario anual (chart of accounts, ver domain/calendarStructure.ts) al que se clasifica
  // este movimiento. Permite ubicarlo en la sección/ítem exacto de la planilla.
  conceptKey?: string;
  // Categoría del gasto para identificar costos fijos/variables (después se llevan a marcadores).
  costKind?: "fijo" | "variable";
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
  // Pago (CostEntry) vinculado a esta factura de compra. Ausente/null = sin pago -> deuda con el
  // proveedor (cuenta corriente). Ver domain/supplierAccounts.ts.
  paidByCostEntryId?: number | null;
  // DERIVADO (no se guarda): id del movimiento del banco que paga esta factura. Sale de
  // BankStatementEntry.assignedPurchaseInvoiceId, que es la unica fuente de verdad del vinculo.
  paidByBankEntryId?: number | null;
  // QUIEN PUSO LA PLATA. Vacio = la empresa (lo normal). Con un nombre = esa persona (empleado, socio
  // o un tercero) la pago de su bolsillo, asi que la empresa le queda debiendo hasta `reimbursedAt`.
  // Es UN solo campo aunque se pueda editar desde dos lados (la ficha de la factura y el vinculo del
  // pago): asi las dos vistas no pueden contradecirse. Ver domain/purchaseLedger.ts.
  paidByPerson?: string;
  // Fecha en que se le reintegro a esa persona. Con fecha, sale de la deuda.
  reimbursedAt?: string;
};

export type PettyCashFund = {
  id: number;
  company: CompanyName;
  description: string;
  responsible: string;
  // Plata que se le entrega al responsable. Regla del usuario (2026-08-26): con la ASIGNACION la
  // plata ya se considera gastada, asi que este es el EGRESO que ve el Calendario anual. Los gastos
  // sueltos del fondo son el rinde y NO van al calendario (si fueran, se gastaria dos veces).
  assignedAmount: number;
  // Origen de la plata del fondo (cuanto entro por cada circuito). Opcionales para datos viejos.
  assignedWhite?: number;
  assignedBlack?: number;
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
  // Grupo de costo al que se imputa este gasto (fijo/variable) para la solapa Costos. Ausente/"" = cae
  // en el grupo auto "Caja chica". NO genera doble conteo: es el MISMO gasto, solo cambia a qué grupo va.
  costGroup?: string;
};

export type DebtPlan = {
  id: number;
  company: CompanyName;
  concept: string;
  dueDay: number;
  nextInstallmentAmount: number;
  remainingInstallments: number;
  nextDueDate: string;
  // Valor congelado en USD por cuota (referencia; equipos importados como la enchapadora). Es solo un
  // valor de referencia: NUNCA se suma con los pesos, igual que en deudas y aportes.
  usdValuePerInstallment?: number;
  notes: string;
  active: boolean;
};

// Efectivo fuera del banco Y fuera de caja chica (caja de seguridad, plata en mano). Se asienta a
// mano como movimientos para que la reserva lo muestre en la billetera de efectivo. El color
// (blanco/negro) depende del origen de esa plata: NO se asume blanco. Pesos y dolares nunca se suman.
export type CashHolding = {
  id: number;
  company: CompanyName;
  date: string; // "yyyy-mm-dd"
  description: string;
  currency: "ARS" | "USD";
  color: "blanco" | "negro";
  kind: "ingreso" | "egreso";
  amount: number;
  notes: string;
};

// MOVIMIENTO INTERNO: la plata cambia de bolsillo dentro de la misma empresa. Deposito la caja en el
// banco, o saco del cajero para pagar en efectivo. NO es ingreso ni egreso: el total de la empresa no
// cambia, cambia donde esta. Existe para que el deposito no se cuente dos veces: el extracto ya trae
// el credito en el banco, y sin este movimiento el efectivo nunca bajaria.
// Ver domain/reservaSources.ts (internalTransfersToMovements) para como pega en la billetera.
export type InternalTransfer = {
  id: number;
  company: CompanyName;
  date: string; // "yyyy-mm-dd"
  direction: "efectivo_a_banco" | "banco_a_efectivo";
  currency: "ARS" | "USD";
  // Color de la plata que se mueve. Un deposito de efectivo NEGRO baja la caja negra; en el banco la
  // plata es blanca, pero esa pata no se emite (la trae el extracto), asi que el color de aca es
  // siempre el del EFECTIVO.
  color: "blanco" | "negro";
  amount: number;
  bank: string; // que cuenta (texto libre): de donde salio o a donde entro
  description: string;
  notes: string;
};

// MOVIMIENTO DE LA CUENTA CORRIENTE CON LA GENTE, cargado a mano.
//
// La deuda con una persona nace sola desde dos lados (una factura de compra que puso de su bolsillo,
// o una caja chica que se excedio), pero eso no alcanza: tambien hay que poder asentar el imprevisto
// o el gasto que no se tuvo en cuenta, que no cuelga de ninguna factura. Y sobre todo hay que poder
// DEVOLVERLE la plata, entera o en partes. Eso es lo que se carga aca.
//
//   kind "debe"  = la persona puso plata -> la empresa le debe.
//   kind "haber" = se le devolvio.
//
// Ver domain/personLedger.ts para como se arma la cuenta, y domain/reservaSources.ts para cuando el
// reintegro baja la caja de efectivo (solo si se le pago en efectivo).
export type PersonLedgerEntry = {
  id: number;
  company: CompanyName;
  person: string;
  date: string; // "yyyy-mm-dd"
  kind: "debe" | "haber";
  amount: number;
  color: "blanco" | "negro";
  // Solo tiene sentido en los "haber": como se le devolvio. Decide si sale de la caja o del banco.
  paymentMethod?: PaymentMethod;
  description: string;
  notes: string;
};

// VEP de pago de IVA (trimestral). Al cargarlo, la posicion de IVA de esa empresa se reinicia: el
// contador de debito/credito cuenta solo lo POSTERIOR a `date`. Ver domain/vatBalance.ts.
export type IvaVepPayment = {
  id: number;
  company: CompanyName;
  date: string; // "yyyy-mm-dd" — fecha del VEP; reinicia el contador de esa empresa
  period: string; // etiqueta del periodo pagado, ej. "3T 2026"
  amount: number; // monto pagado (informativo)
  notes: string;
  attachmentName?: string;
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
  // Moneda de la cuenta. Ausente = ARS (pesos), así que todo lo ya cargado se lee como pesos sin
  // migración. Una cuenta en USD es OTRA cuenta: su saldo alimenta la billetera USD-banco de la
  // reserva y NUNCA se suma con los pesos.
  currency?: "ARS" | "USD";
  notes: string;
  // Asignación / conciliación (Fase 1): "darle un lugar" a la plata que entró o salió.
  // assignedKind vacío = SIN ASIGNAR (muestra la pill D). cobro/pago pueden apuntar a un trabajo
  // (assignedJobBudget) y/o a un tercero (assignedParty, texto libre o tomado del sistema).
  assignedKind?: "cobro" | "pago" | "interno" | "aporte" | "impuesto" | "otro";
  assignedJobBudget?: string;
  assignedParty?: string;
  // Factura de COMPRA que cancela este debito. Es el vinculo "de donde sale la plata": la factura
  // deja de ser deuda con el proveedor (cuenta corriente) sin cargar un pago aparte, porque el
  // movimiento del banco YA es la plata que salio. Ausente = el debito no paga ninguna factura.
  assignedPurchaseInvoiceId?: number | null;
  administration?: "blanco" | "negro";
  assignmentNote?: string;
  // Renglón del Calendario anual (chart of accounts) al que se asigna este movimiento del extracto.
  // Con esto el banco ALIMENTA el calendario; sin asignar, cae en "Sin clasificar".
  conceptKey?: string;
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

// --- Costos fijos y variables (solapa Costos) ---
// La clasificacion fijo/variable vive en el GRUPO, no en el item: cada gasto hereda el tipo
// de su grupo. Los grupos fijos son los mismos "grandes grupos" que Marcadores ya usa.
export type CostKind = "fijo" | "variable";

export type CostGroup = {
  id: number;
  name: string;
  kind: CostKind;
  company: CompanyScope;
  active: boolean;
  // Los grupos automaticos (compras, caja chica, personal) se alimentan solos desde otras
  // solapas y no se pueden cargar a mano: evita contar el mismo gasto dos veces.
  auto: boolean;
  notes: string;
};

// Gasto cargado en la solapa Costos: lo que NO vive ya en otra solapa
// (alquiler, servicios, impuestos...). Compras/caja chica/personal no se cargan aca.
export type CostEntry = {
  id: number;
  company: CompanyName;
  date: string; // ISO yyyy-mm-dd
  group: string; // nombre de CostGroup
  description: string;
  amount: number;
  administration: "blanco" | "negro";
  source: "manual" | "extracto";
  supplier: string;
  notes: string;
  // --- El gasto es el PAGO (regla del 2026-07-19). La factura es solo registro. ---
  // COMO se pago. Ojo: "blanco" y "sale del banco" son cosas DISTINTAS (hay pagos blancos hechos en
  // efectivo), por eso el medio va aparte de `administration`. De aca sale si el pago tiene que
  // figurar en el extracto, que es lo que impide contar la misma plata dos veces.
  // El CHEQUE se debita cuando lo cobran (30/60/90 dias), no el dia que se entrega.
  paymentMethod?: PaymentMethod;
  supplierId?: number; // proveedor del listado (el nombre libre queda en `supplier`)
  bankEntryId?: number; // debito del extracto con el que quedo conciliado
  invoiceRef?: string; // factura que respalda el pago (numero); la factura NO suma, solo respalda
  // Renglon del Calendario anual al que se imputa este pago. Con esto el gasto ALIMENTA el calendario
  // (regla del usuario 2026-08-26). Ausente = cae en "Sin clasificar" con la pill D hasta asignarlo.
  // OJO: solo llegan al calendario los pagos que NO pasan por el banco (efectivo / negro); los que
  // salen del banco ya entran por el debito del extracto y contarlos aca los duplicaria.
  conceptKey?: string;
};

export type PaymentMethod = "transferencia" | "cheque" | "efectivo" | "debito";

// TARJETAS DE CRÉDITO. El itemizado de consumos sirve para IDENTIFICAR costos fijos/variables para
// COTIZAR y preparar los marcadores. NO suma al estado de resultados (el resultado sale de los pagos
// reales; la tarjeta es insumo de cotización, igual que los marcadores). Por eso no hay doble conteo:
// el pago del resumen en el banco es un movimiento aparte y no se cruza con estos consumos.
export type CreditCard = {
  id: number;
  company: CompanyName;
  name: string; // "Visa Santander", "Visa Business", "Visa Corporate"
  bank: string; // Santander / Patagonia
  lastDigits: string;
  active: boolean;
  notes: string;
};

// Resumen/cierre de la tarjeta: para ver vencimientos y saldos (previsión de pago). Pesos y dólares
// nunca se suman.
export type CreditCardStatement = {
  id: number;
  company: CompanyName;
  cardId: number;
  closingDate: string; // cierre
  dueDate: string; // vencimiento
  totalArs: number; // saldo actual $
  totalUsd: number; // saldo actual U$S
  minPaymentArs: number;
  paid: boolean;
  notes: string;
};

// Consumo itemizado de la tarjeta, clasificado a un grupo de costo (fijo/variable lo define el grupo,
// igual que en la solapa Costos). SOLO para cotización/marcadores; NO impacta resultados.
export type CreditCardConsumption = {
  id: number;
  company: CompanyName;
  cardId: number;
  // Resumen (cierre) al que pertenece el consumo. Es el agrupador de la planilla: los consumos de un
  // mismo cierre van juntos y su total se coteja contra el saldo del resumen. No se puede deducir por
  // fecha: una cuota aparece en 3 cierres distintos con la fecha de la compra original.
  statementId?: number;
  date: string;
  description: string;
  amount: number;
  currency: "ARS" | "USD";
  group: string; // nombre de CostGroup (fijo/variable)
  installments: string; // "3/12" cuotas (texto libre)
  recurring: boolean; // consumo mensual que se repite (útil para el marcador)
  notes: string;
};

// REGLA DE CLASIFICACION con memoria: cuando el usuario clasifica un gasto a un grupo, se aprende una
// regla para que el próximo gasto "del mismo tipo" SUGIERA ese grupo (nunca lo aplica solo: el usuario
// confirma). Match por proveedor (más confiable), por palabra clave del concepto, o por monto fijo.
// Si un mismo criterio se clasificó a MÁS DE UN grupo, la regla queda `ambiguous` y deja de sugerir
// (pide clasificación manual): un proveedor puede dar 2 tipos de gasto distintos.
export type CostRuleMatchType = "supplier" | "keyword" | "amount";
export type CostRule = {
  id: number;
  company: CompanyScope;
  matchType: CostRuleMatchType;
  matchValue: string; // supplierId (texto), palabra clave normalizada, o monto (texto)
  group: string; // nombre de CostGroup sugerido
  ambiguous: boolean; // true = el mismo criterio apunta a >1 grupo → no sugiere, pide manual
  hits: number; // cuántas veces se confirmó (para orden/confianza)
  active: boolean;
  notes: string;
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque / echeq" },
  { value: "efectivo", label: "Efectivo" },
  { value: "debito", label: "Debito automatico" },
];

// Lo unico que se paga fuera del banco es el efectivo. Todo lo demas tiene que aparecer en el
// extracto: por eso se puede cotejar.
export const saleDelBanco = (method?: PaymentMethod): boolean =>
  !!method && method !== "efectivo";

// Factura EMITIDA, tal como viene del export de ARCA ("Mis Comprobantes Emitidos").
// NO suma al resultado: es registro. Sirve para el listado del contable, para cruzar las facturas
// entre las empresas del grupo contra los giros, y para saber lo que falta cobrar de cada cliente.
export type IssuedInvoice = {
  id: number;
  company: CompanyName; // el EMISOR (se deduce del CUIT del titulo del archivo)
  date: string; // yyyy-mm-dd
  kind: string; // "1 - Factura A"
  pointOfSale: string;
  number: string;
  counterpartyTaxId: string; // solo digitos (el receptor)
  counterpartyName: string;
  currency: string;
  net: number;
  vat: number;
  total: number;
  source: "arca" | "manual";
  // Trabajo aprobado al que corresponde esta factura (por número de presupuesto). Ausente = sin
  // vincular. Se puede setear desde Costos o desde Trabajos Aprobados: es el MISMO array, queda sincronizado.
  jobBudgetNumber?: string;
};

// Proveedor: listado propio para vincular los pagos y poder cotejarlos contra el extracto.
// El CUIT es la llave dura (el banco lo suele poner en el concepto); los alias cubren como aparece
// escrito en el resumen, que casi nunca coincide con el nombre de fantasia.
export type Supplier = {
  id: number;
  company: CompanyScope;
  name: string;
  taxId: string;
  aliases: string; // como figura en el extracto, separado por comas
  active: boolean;
  notes: string;
  // CUENTA CORRIENTE: hay convenio de comprar e ir pagando diferido. Los proveedores marcados suben
  // al bloque de cuentas corrientes de Compras, con su libro mayor (cada compra suma, cada pago
  // descuenta). Ausente/false = proveedor suelto, se paga contra entrega.
  currentAccount?: boolean;
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

// Fila de la bitácora de cambios (tabla system_change_log): quién guardó qué módulo/empresa y cuándo.
export type SystemChangeRow = {
  id: number;
  module_key: string;
  module_label: string | null;
  company: string | null;
  user_id: string;
  created_at: string;
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
  // Horas nocturnas al 50% (franja 21:00-06:00 del tiempo extra). Opcional: registros viejos no la
  // tienen (se lee como 0). Se precarga desde checkIn/checkOut y alimenta night50Hours de la liquidacion.
  night50Hours?: number;
  // Horario exacto del dia (HH:MM). Fuente: fichaje del reloj Dahua o carga manual. Opcionales: los
  // registros viejos no los tienen. Alimentan el semaforo de asistencia (en horario / tarde) y la
  // precarga de horas del convenio (ver deriveConvenioHours).
  checkIn?: string;
  checkOut?: string;
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
  // CUIL del trabajador (lo exige el recibo, LCT art. 140). Opcional para datos viejos.
  cuil?: string;
  // Fecha de ingreso (alta laboral). Para el recibo y para calcular antigüedad. yyyy-mm-dd.
  hireDate?: string;
  category: string;
  // Tipo de vinculo: "convenio" (por escala, default), "temporal" (negro, por acuerdo, se paga por
  // caja chica hasta efectivizar) o "fuera_convenio" (socio/gerente/administrativo con sueldo acordado
  // repartido en blanco y negro). Opcional para datos viejos.
  employmentType?: "convenio" | "temporal" | "fuera_convenio";
  // Sueldo acordado (mensual) del empleado temporal, por acuerdo entre partes.
  agreedSalary?: number;
  // Fuera de convenio: sueldo bruto acordado repartido por administracion. Cada uno funciona en su
  // circuito (blanco/negro). Fijo por defecto; el mes puede variar con los adicionales blanco/negro.
  agreedWhite?: number;
  agreedBlack?: number;
  // Si es true, al sueldo blanco acordado se le calculan descuentos de ley + cargas patronales (sueldo
  // registrado). Si es false/ausente, el blanco entra tal cual (acordado, sin cargas).
  computeWhiteCharges?: boolean;
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
  // Desglose REAL de contribuciones patronales (para el recibo y el costo). Si están cargados, mandan
  // sobre el % lumpeado employerContributionPct. La ART es por actividad/empresa (carpintería paga alto).
  employerJubilacionPct?: number; // jubilación patronal (bundle SIPA), ej. 18
  employerObraSocialPct?: number; // obra social patronal, ej. 6
  employerArtPct?: number; // ART, por actividad, ej. 11.38
  employerLifeInsuranceFixed?: number; // seguro de vida obligatorio, monto fijo mensual (ej. 424.62)
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

