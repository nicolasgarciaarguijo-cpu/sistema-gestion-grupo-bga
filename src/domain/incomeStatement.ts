// Estado de resultados del PERIODO, base percibido (cobros y pagos con fecha dentro del periodo) y
// operativo, separado por circuito blanco/negro. No incluye sueldos/premios ni amortizacion (esos se
// ven en el panel de contabilidad general). El banco se muestra aparte para no duplicar (un cobro ya
// esta en ingresos). Pura: solo aritmetica; el filtrado por empresa+periodo se hace afuera.

export type IncomeStatementInput = {
  collectedWhite: number; // cobros en blanco del periodo
  collectedBlack: number; // cobros en negro del periodo
  purchasesWhite: number; // compras blancas del periodo (por fecha de factura)
  purchasesBlack: number; // compras negras del periodo
  pettyCashWhite: number; // caja chica blanca del periodo
  pettyCashBlack: number; // caja chica negra del periodo
  commissionsPaid: number; // comisiones pagadas en el periodo (circuito blanco)
  bankCredits: number; // creditos bancarios del periodo (referencia, no suma al resultado)
  bankDebits: number; // debitos bancarios del periodo (referencia)
};

export type IncomeStatement = {
  whiteIncome: number;
  whiteExpense: number;
  whiteResult: number;
  blackIncome: number;
  blackExpense: number;
  blackResult: number;
  totalIncome: number;
  totalExpense: number;
  totalResult: number;
  blackSharePct: number; // % de los ingresos que es negro
  desfasaje: number; // resultado blanco - resultado negro
  bankCredits: number;
  bankDebits: number;
  netBank: number; // creditos - debitos
};

export function computeIncomeStatement(i: IncomeStatementInput): IncomeStatement {
  const whiteExpense = i.purchasesWhite + i.pettyCashWhite + i.commissionsPaid;
  const blackExpense = i.purchasesBlack + i.pettyCashBlack;
  const whiteResult = i.collectedWhite - whiteExpense;
  const blackResult = i.collectedBlack - blackExpense;
  const totalIncome = i.collectedWhite + i.collectedBlack;
  const totalExpense = whiteExpense + blackExpense;
  const totalResult = whiteResult + blackResult;
  const blackSharePct = totalIncome > 0 ? (i.collectedBlack / totalIncome) * 100 : 0;
  const netBank = i.bankCredits - i.bankDebits;
  return {
    whiteIncome: i.collectedWhite,
    whiteExpense,
    whiteResult,
    blackIncome: i.collectedBlack,
    blackExpense,
    blackResult,
    totalIncome,
    totalExpense,
    totalResult,
    blackSharePct,
    desfasaje: whiteResult - blackResult,
    bankCredits: i.bankCredits,
    bankDebits: i.bankDebits,
    netBank,
  };
}
