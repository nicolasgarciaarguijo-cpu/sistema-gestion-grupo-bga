// Utilidades puras de formato y fechas. Sin estado ni dependencias de UI.
// Extraido de App.tsx para reducir el monolito.

export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

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
