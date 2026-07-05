// Estado de resultados del PERIODO, base percibido (cobros y pagos con fecha dentro del periodo) y
// operativo, separado por circuito blanco/negro. Incluye compras, caja chica, comisiones pagadas,
// sueldos/premios (nomina del periodo) y amortizacion. El banco se muestra aparte para no duplicar
// (un cobro ya esta en ingresos). Pura: solo aritmetica; el filtrado por empresa+periodo se hace afuera.

export type IncomeStatementInput = {
  collectedWhite: number; // cobros en blanco del periodo
  collectedBlack: number; // cobros en negro del periodo
  purchasesWhite: number; // compras blancas del periodo (por fecha de factura)
  purchasesBlack: number; // compras negras del periodo
  pettyCashWhite: number; // caja chica blanca del periodo
  pettyCashBlack: number; // caja chica negra del periodo
  commissionsPaid: number; // comisiones pagadas en el periodo (circuito blanco)
  laborWhite: number; // costo laboral blanco del periodo (sueldos + cargas + premio blanco)
  laborBlack: number; // costo laboral negro del periodo (premios en negro)
  depreciation: number; // amortizacion del periodo (circuito blanco)
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
  laborWhite: number;
  laborBlack: number;
  depreciation: number;
  bankCredits: number;
  bankDebits: number;
  netBank: number; // creditos - debitos
};

export function computeIncomeStatement(i: IncomeStatementInput): IncomeStatement {
  const whiteExpense =
    i.purchasesWhite + i.pettyCashWhite + i.commissionsPaid + i.laborWhite + i.depreciation;
  const blackExpense = i.purchasesBlack + i.pettyCashBlack + i.laborBlack;
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
    laborWhite: i.laborWhite,
    laborBlack: i.laborBlack,
    depreciation: i.depreciation,
    bankCredits: i.bankCredits,
    bankDebits: i.bankDebits,
    netBank,
  };
}
