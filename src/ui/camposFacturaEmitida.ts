// LA FICHA DE LA FACTURA EMITIDA, definida UNA sola vez (Nicolas, 14/11/2026).
//
// "finalmente las facturas se emiten para los trabajos aprobados, aunque podria tambien haber facturas
// entre empresas sin trabajos de por medio solo para acomodar los movimientos internos. por lo tanto en
// movimientos internos deberia tambien estar una ficha de facturas. y luego esos 2 espacios se completan
// con facturas emitidas."
//
// Los campos son los que trae el listado de ARCA, asi cada factura cargada se puede cruzar con el listado
// y ninguna queda perdida ni duplicada. Los dos lugares usan ESTA definicion: si cambia, cambia en los dos.
import type { CampoFicha } from "./FichaRegistro";
import { MONEDAS_FACTURA_EMITIDA, TIPOS_FACTURA_EMITIDA } from "../domain/facturaEmitida";

export function camposFacturaEmitida(opts?: {
  // Para las facturas entre empresas: la que recibe es una empresa del grupo, no un cliente suelto.
  empresasReceptoras?: Array<{ value: string; label: string }>;
  clientes?: string[];
}): CampoFicha[] {
  const receptor: CampoFicha[] = opts?.empresasReceptoras
    ? [
        {
          key: "businessName",
          label: "Empresa del grupo a la que se le factura",
          tipo: "select",
          obligatorio: true,
          vacio: "— Elegí la empresa —",
          opciones: opts.empresasReceptoras,
          ayuda: "Al elegirla se completa su CUIT: con eso la factura cruza la cuenta corriente entre las dos.",
          ancho: "completo",
        },
        { key: "taxId", label: "CUIT (lo pone la empresa elegida)", tipo: "texto", soloLectura: true },
      ]
    : [
        { key: "businessName", label: "Nombre / razón social del cliente", tipo: "texto", ancho: "completo", sugerencias: opts?.clientes },
        { key: "taxId", label: "CUIT / CUIL del cliente", tipo: "texto", ayuda: "Los 11 dígitos: sin él no se puede cruzar con ARCA." },
      ];
  return [
    {
      key: "invoiceType",
      label: "Tipo de comprobante",
      tipo: "select",
      obligatorio: true,
      vacio: "— Elegí el tipo —",
      opciones: TIPOS_FACTURA_EMITIDA.map((t) => ({ value: t, label: t })),
      ayuda: "Como lo nombra ARCA. Lo cargado antes decía solo la letra: elegilo de la lista para poder cruzarlo.",
    },
    { key: "pointOfSale", label: "Punto de venta", tipo: "texto", ayuda: "El que figura en la factura (ej. 1 o 0003)." },
    { key: "invoiceNumber", label: "Número", tipo: "texto", ayuda: "Solo el número del comprobante. Si son varias facturas, cargá una ficha por cada una." },
    { key: "invoiceDate", label: "Fecha de la factura", tipo: "fecha" },
    ...receptor,
    { key: "currency", label: "Moneda", tipo: "select", opciones: MONEDAS_FACTURA_EMITIDA },
    { key: "subtotal", label: "Neto gravado", tipo: "numero" },
    { key: "vatRate", label: "Alícuota %", tipo: "numero" },
    { key: "vat", label: "IVA (se calcula desde el neto y la alícuota)", tipo: "numero" },
    { key: "total", label: "Total (neto + IVA)", tipo: "numero", soloLectura: true },
  ];
}
