// QUE SE PUEDE TOCAR DESDE LA PLANILLA, Y QUE NO.
//
// Criterio de Nicolas (2026-08-29): "la planilla es la madre de la toma de decisiones. Si alguien
// mueve algo en la planilla, debe modificarse en el sistema tambien, PIDIENDOLE TODA LA MISMA
// INFORMACION que pediria si se opera desde las solapas."
//
// La segunda mitad de esa frase es la que manda acá: un formulario que pide MENOS campos que la
// solapa no tiene derecho a escribir. Si el calendario dejara editar una factura -- que necesita
// subtotal e IVA discriminado, y el calendario solo pregunta un monto -- le estaria inventando esos
// numeros. Por eso hay renglones que se editan desde la planilla y otros que mandan a su solapa,
// diciendo POR QUE.
//
// El calendario pregunta: monto, dia, empresa, circuito blanco/negro, renglon y notas.

export type PermisoDeRenglon = {
  editable: boolean;
  borrable: boolean;
  // Por que no se puede, para decirselo al usuario en vez de dejarlo adivinando.
  motivo?: string;
  donde?: string;
};

const PREFIJOS: Array<{ prefijo: string; permiso: PermisoDeRenglon }> = [
  // Movimientos del banco y cargas manuales: son del calendario, se hace todo.
  { prefijo: "bank-", permiso: { editable: true, borrable: true } },
  { prefijo: "financial-", permiso: { editable: true, borrable: true } },

  // Comision pagada de un trabajo: monto, dia y circuito. Es exactamente lo que el calendario pide.
  { prefijo: "comm-", permiso: { editable: true, borrable: true } },

  // GASTO de la solapa Costos: monto, dia, circuito, renglon y notas. Es la fuente principal de los
  // egresos del calendario. El medio de pago y el grupo de costo no se tocan al editar, asi que no
  // hace falta preguntarlos: se quedan como estaban.
  { prefijo: "cost-", permiso: { editable: true, borrable: true } },

  // GASTO DE CAJA CHICA: no se opera desde la planilla porque NO VIVE en la planilla. Lo que entra
  // al calendario es la ASIGNACION del fondo (la plata ya se considera gastada cuando se entrega);
  // el gasto suelto es el rinde de esa plata. Si el gasto tambien sumara, se gastaria dos veces.
  {
    prefijo: "petty-cash-",
    permiso: {
      editable: false,
      borrable: false,
      motivo: "el gasto del fondo es el rinde y no suma en la planilla: lo que entra acá es la asignación del fondo",
      donde: "Caja chica",
    },
  },

  // ASIGNACION del fondo: una asignacion se parte en varios renglones (blanco, negro, devolucion),
  // asi que editar uno solo es ambiguo, y ademas hace falta el responsable y el reparto blanco/negro.
  {
    prefijo: "petty-fund-",
    permiso: {
      editable: false,
      borrable: false,
      motivo: "la asignación de un fondo se reparte en varios renglones y necesita responsable y el corte blanco/negro",
      donde: "Caja chica",
    },
  },

  // OJO: "purchase-invoice-" tiene que ir ANTES que "purchase-", si no lo captura el otro.
  {
    prefijo: "purchase-invoice-",
    permiso: {
      editable: false,
      borrable: true,
      motivo: "una factura de compra necesita subtotal e IVA discriminado, y la planilla solo pregunta el total",
      donde: "Compras",
    },
  },
  {
    prefijo: "purchase-",
    permiso: {
      editable: false,
      borrable: false,
      motivo: "no es un movimiento de plata: es el aviso de que a esa compra le faltan items",
      donde: "Compras",
    },
  },
  {
    prefijo: "debt-",
    permiso: {
      editable: false,
      borrable: false,
      motivo: "es una cuota calculada del plan de pago, no un movimiento suelto: se cambia el plan entero",
      donde: "Deudas y aportes",
    },
  },
];

export function permisoDeRenglon(entryId: string): PermisoDeRenglon {
  const id = String(entryId || "");
  const hit = PREFIJOS.find((p) => id.startsWith(p.prefijo));
  if (hit) return hit.permiso;
  return {
    editable: false,
    borrable: false,
    motivo: "este movimiento vive en otra solapa",
    donde: "su solapa de origen",
  };
}

/** El texto que ve el usuario cuando no se puede hacer algo desde la planilla. */
export function porQueNoSePuede(entryId: string, accion: "editar" | "borrar"): string {
  const p = permisoDeRenglon(entryId);
  const base = `No se puede ${accion} desde la planilla`;
  if (!p.motivo) return `${base}.`;
  return `${base}: ${p.motivo}. Se hace en ${p.donde || "su solapa"}.`;
}
