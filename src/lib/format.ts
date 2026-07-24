// Utilidades puras de formato y fechas. Sin estado ni dependencias de UI.
// Extraido de App.tsx para reducir el monolito.

// Moneda de un importe. ARS = pesos ($), USD = dolares (U$S). Nunca se convierte una en otra:
// los totales de cada moneda conviven separados (mismo criterio que la reserva, ver domain/reserva.ts).
export type Currency = "ARS" | "USD";

// Simbolo local: el es-AR de USD imprime "US$", pero en la empresa se lee "U$S". Forzamos el simbolo
// a mano para que sea consistente en todo el sistema.
const CURRENCY_SYMBOL: Record<Currency, string> = { ARS: "$", USD: "U$S" };

// money(n) -> "$ 1.234,56" (pesos, por defecto, para no tocar las llamadas existentes).
// money(n, "USD") -> "U$S 1.234,56".
export const money = (n: number, currency: Currency = "ARS") => {
  const value = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
  // Espacio duro (U+00A0) entre simbolo y numero, igual que producia Intl con style:"currency".
  return `${CURRENCY_SYMBOL[currency]} ${value}`;
};

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

export const formatDateDisplay = (dateText: string) => {
  if (!dateText) return "-";
  const parts = dateText.split("-");
  if (parts.length !== 3) return dateText;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
};

export const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const localMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const todayIso = () => localDateKey(new Date());

export const normalizeCompanyText = (value: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
