// Balance blanco/negro de caja chica: cuanta plata ENTRO por cada circuito (origen del fondo) vs
// cuanto SALIO (gastos por administracion). Sirve para vigilar que no se desbalancee (y no pagar de
// mas al fisco). Pura y testeable. El desbalance grande en un circuito es la senal de alerta.

export type PettyFundInput = {
  assignedAmount: number;
  assignedWhite?: number;
  assignedBlack?: number;
};

export type PettyExpenseInput = {
  amount: number;
  administration?: string; // "blanco" | "negro" (aflojado: el estado viene ensanchado a string)
};

export type PettyCashBalance = {
  whiteIn: number;
  blackIn: number;
  unclassifiedIn: number; // plata de fondos sin origen cargado (assignedWhite/Black en 0)
  whiteOut: number;
  blackOut: number;
  whiteSaldo: number; // whiteIn - whiteOut
  blackSaldo: number; // blackIn - blackOut
  desbalance: number; // whiteSaldo - blackSaldo (positivo: sobra blanco; negativo: sobra negro)
};

export function computePettyCashBalance(
  funds: PettyFundInput[],
  expenses: PettyExpenseInput[]
): PettyCashBalance {
  let whiteIn = 0;
  let blackIn = 0;
  let unclassifiedIn = 0;
  for (const fund of funds) {
    const w = Number(fund.assignedWhite || 0);
    const b = Number(fund.assignedBlack || 0);
    whiteIn += w;
    blackIn += b;
    // Si el fondo no tiene origen cargado, su plata queda "sin clasificar" (no la contamos a ciegas).
    if (w === 0 && b === 0) unclassifiedIn += Number(fund.assignedAmount || 0);
  }

  let whiteOut = 0;
  let blackOut = 0;
  for (const expense of expenses) {
    const amount = Number(expense.amount || 0);
    if (expense.administration === "negro") blackOut += amount;
    else whiteOut += amount;
  }

  const whiteSaldo = whiteIn - whiteOut;
  const blackSaldo = blackIn - blackOut;
  return {
    whiteIn,
    blackIn,
    unclassifiedIn,
    whiteOut,
    blackOut,
    whiteSaldo,
    blackSaldo,
    desbalance: whiteSaldo - blackSaldo,
  };
}
