// Contabilidad blanco/negro: dos resultados separados (circuito blanco y circuito negro) a partir
// de los agregados ya calculados, mas el desfasaje entre ambos y el % de la operacion en negro.
// Pura: solo aritmetica, sin estado. Las definiciones de que va en cada circuito se arman afuera.

export type AccountingInput = {
  whiteIncome: number; // facturado en blanco (billedNet de trabajos)
  blackIncome: number; // parte en negro de trabajos (blackNet)
  whitePurchases: number; // compras blancas (incluye caja chica blanca)
  blackPurchases: number; // compras marcadas en negro
  pettyCashBlack: number; // caja chica negra
  commissions: number; // comisiones (circuito blanco)
  depreciation: number; // amortizacion mensual (blanco)
  bankCredits: number; // ingresos bancarios (blanco)
  bankDebits: number; // egresos bancarios (blanco)
  premioWhite: number; // premios en blanco
  premioBlack: number; // premios en negro
};

export type AccountingResults = {
  whiteIncome: number;
  whiteExpense: number;
  whiteResult: number;
  blackIncome: number;
  blackExpense: number;
  blackResult: number;
  totalResult: number;
  blackSharePct: number; // % de los ingresos que es negro
  desfasaje: number; // brecha entre el resultado blanco y el negro
};

export function computeAccountingResults(i: AccountingInput): AccountingResults {
  const whiteExpense =
    i.whitePurchases + i.commissions + i.depreciation + i.bankDebits + i.premioWhite;
  const whiteResult = i.whiteIncome + i.bankCredits - whiteExpense;

  const blackExpense = i.blackPurchases + i.pettyCashBlack + i.premioBlack;
  const blackResult = i.blackIncome - blackExpense;

  const totalResult = whiteResult + blackResult;
  const totalIncome = i.whiteIncome + i.blackIncome;
  const blackSharePct = totalIncome > 0 ? (i.blackIncome / totalIncome) * 100 : 0;
  const desfasaje = whiteResult - blackResult;

  return {
    whiteIncome: i.whiteIncome,
    whiteExpense,
    whiteResult,
    blackIncome: i.blackIncome,
    blackExpense,
    blackResult,
    totalResult,
    blackSharePct,
    desfasaje,
  };
}
