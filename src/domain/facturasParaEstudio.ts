// FACTURAS DE COMPRA PARA EL ESTUDIO CONTABLE (Nicolas, 2026-10-20): "tengo que tener la posibilidad de
// exportar la informacion basica de todas las facturas del mes para poder presentarselas al estudio
// contable. Las del mes o las de un rango de fechas. En Excel." Columnas pedidas:
// Proveedor/Razon social, CUIT, Fecha de la factura, Tipo de factura, Tipo (A, B, C...), Numero,
// Monto exento, Monto neto, IVA, Otros impuestos, IIBB, Total.
//
// Entran las facturas BLANCAS de la empresa en el rango (las negras no tienen comprobante para el
// estudio) y las notas de credito, con los importes en negativo para que la suma de la columna de bien.
import type { Celda } from "../lib/xlsx";

export const COLUMNAS_ESTUDIO = [
  "Proveedor / Razón social",
  "CUIT",
  "Fecha de la factura",
  "Tipo de factura",
  "Tipo",
  "Número",
  "Monto exento",
  "Monto neto",
  "IVA",
  "Otros impuestos",
  "IIBB",
  "Total",
];
export const ANCHOS_ESTUDIO = [34, 15, 12, 16, 6, 16, 14, 14, 14, 14, 12, 14];

export type FacturaParaEstudio = {
  company: string;
  administration: "blanco" | "negro";
  supplier: string;
  taxId: string;
  invoiceDate: string;
  receiptKind?: string;
  receiptLetter: string;
  invoiceNumber: string;
  exemptAmount: number;
  net21: number;
  vat: number;
  otrosImpuestos?: number;
  iibb?: number;
  total: number;
};

export type NotaCreditoParaEstudio = {
  company: string;
  administration?: "blanco" | "negro";
  supplier: string;
  taxId?: string;
  date: string;
  receiptLetter: string;
  number: string;
  net?: number;
  vat: number;
  total: number;
};

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export function filasParaEstudio(input: {
  facturas: FacturaParaEstudio[];
  notasCredito?: NotaCreditoParaEstudio[];
  empresa: string; // "__ALL__" = todas
  desde: string;
  hasta: string;
}): Celda[][] {
  const { empresa, desde, hasta } = input;
  const enRango = (d: string, company: string) =>
    !!d && d >= desde && d <= hasta && (empresa === "__ALL__" || company === empresa);
  type Fila = { fecha: string; celdas: Celda[] };
  const filas: Fila[] = [];
  input.facturas
    .filter((f) => f.administration !== "negro" && f.receiptLetter !== "X" && enRango(f.invoiceDate, f.company))
    .forEach((f) =>
      filas.push({
        fecha: f.invoiceDate,
        celdas: [
          f.supplier || "",
          f.taxId || "",
          { fecha: f.invoiceDate },
          f.receiptKind || "Factura",
          f.receiptLetter || "",
          f.invoiceNumber || "",
          r2(f.exemptAmount),
          r2(f.net21),
          r2(f.vat),
          r2(f.otrosImpuestos || 0),
          r2(f.iibb || 0),
          r2(f.total),
        ],
      })
    );
  (input.notasCredito || [])
    .filter((n) => n.administration !== "negro" && enRango(n.date, n.company))
    .forEach((n) => {
      const neto = n.net != null ? Number(n.net) : Number(n.total || 0) - Number(n.vat || 0);
      filas.push({
        fecha: n.date,
        celdas: [
          n.supplier || "",
          n.taxId || "",
          { fecha: n.date },
          "Nota de crédito",
          n.receiptLetter || "",
          n.number || "",
          0,
          -r2(neto),
          -r2(n.vat),
          0,
          0,
          -r2(n.total),
        ],
      });
    });
  filas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cuerpo = filas.map((f) => f.celdas);
  // Fila de totales de las columnas de importes.
  const suma = (col: number) => r2(cuerpo.reduce((a, fila) => a + (typeof fila[col] === "number" ? (fila[col] as number) : 0), 0));
  const totales: Celda[] = ["TOTAL", "", "", "", "", `${cuerpo.length} comprobantes`, suma(6), suma(7), suma(8), suma(9), suma(10), suma(11)];
  return [COLUMNAS_ESTUDIO, ...cuerpo, ...(cuerpo.length ? [[], totales] : [])];
}

// "2026-10" -> primer y ultimo dia del mes.
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}
