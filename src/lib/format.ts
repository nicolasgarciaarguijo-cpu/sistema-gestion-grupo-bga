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

// --- Inputs de monto -------------------------------------------------------------------------------
// Los campos donde se tipea plata usan miles con "." y decimal con "," (formato es-AR), y muestran
// vacio en vez de "0" (para que no quede el cero adelante al empezar a escribir). Estas funciones son
// puras; el componente AmountInput (ui/primitives) las usa manteniendo el estado del texto.

// Numero -> texto para mostrar (miles con punto). 0 / no finito -> "" (sin cero adelante).
export const formatAmountInput = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return "";
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
};

// Texto tipeado (con puntos de miles y coma decimal) -> numero. Vacio o basura -> 0.
export const parseAmountInput = (text: string): number => {
  if (!text) return 0;
  const cleaned = text.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// Reformatea lo que el usuario va tipeando: pone los puntos de miles en la parte entera y conserva
// la coma decimal en progreso (hasta 2 decimales). Vacio queda vacio. Asi puede escribir "1000000"
// y ver "1.000.000", o "1000000,5" y ver "1.000.000,5" sin que se le borre la coma al tipear.
export const formatAmountTyping = (raw: string): string => {
  if (raw == null || raw === "") return "";
  const firstComma = raw.indexOf(",");
  const intDigits = (firstComma >= 0 ? raw.slice(0, firstComma) : raw).replace(/\D/g, "");
  const intFmt = intDigits ? new Intl.NumberFormat("es-AR").format(Number(intDigits)) : "";
  if (firstComma >= 0) {
    const decDigits = raw.slice(firstComma + 1).replace(/\D/g, "").slice(0, 2);
    return `${intFmt || "0"},${decDigits}`;
  }
  return intFmt;
};

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
