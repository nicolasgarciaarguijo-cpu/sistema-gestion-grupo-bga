// Helpers comerciales puros del presupuesto: numeracion correlativa y parseo de los
// terminos de pago (anticipo/saldo) y de entrega (dias de plazo -> fecha). Sin estado.

export const buildBudgetNumberFromParts = (prefix: string, value: number, width: number) =>
  `${prefix}${String(Math.max(0, value)).padStart(width, "0")}`;

// Siguiente numero correlativo respetando el prefijo y el ancho del numero actual
// (p.ej. "P-0007" -> "P-0008"). Toma el maximo existente con el mismo prefijo y suma 1.
export const getNextBudgetNumber = (existingNumbers: string[], currentNumber: string) => {
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

// Dias de plazo de entrega tomados del texto libre (primer numero que aparezca).
export const parseLeadDays = (deliveryTerm: string) => {
  const cleaned = (deliveryTerm || "").replace(/[^0-9]/g, " ").trim();
  const first = cleaned.split(/\s+/)[0];
  return first ? Number(first) : 0;
};

// Porcentajes de pago: anticipo (primer %) y saldo (segundo %, o el complemento a 100).
export const parsePaymentPercents = (paymentTerms: string) => {
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

// Fecha de entrega = fecha base + dias de plazo (ISO yyyy-mm-dd). "" si falta algun dato.
export const buildDeliveryDateFromTerm = (baseDateText: string, deliveryTerm: string) => {
  const leadDays = parseLeadDays(deliveryTerm);
  if (!baseDateText || !leadDays) return "";
  const baseDate = new Date(baseDateText);
  if (Number.isNaN(baseDate.getTime())) return "";
  return new Date(baseDate.getTime() + leadDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
};
