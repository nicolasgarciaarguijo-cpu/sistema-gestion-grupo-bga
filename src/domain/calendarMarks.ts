// MARCADORES DE COLOR DEL CALENDARIO ANUAL.
//
// Pedido de Nicolas (2026-08-29): poder pintar un monto con un color que signifique algo
// ("naranja = pago inamovible", "magenta = pago estimado") para leer la planilla de un vistazo.
//
// El color va como BORDE GRUESO, nunca como fondo: el fondo ya esta ocupado y significa DE QUE
// EMPRESA es el movimiento (BGA azul / De Raiz mostaza). Si el marcador pintara el fondo, taparia
// esa informacion. Por eso la paleta tambien evita el azul y el amarillo, que son los colores de
// las empresas, y el rojo, que es la banderita de "revisar esto".

export type CalendarMark = {
  id: number;
  // sectionKey|itemKey|fecha — la misma coordenada que usan las banderitas.
  key: string;
  date: string;
  // Nombre del renglon, para poder listar los marcadores sin ir a buscarlos a la planilla.
  label: string;
  color: string;
  createdBy: string;
  createdAt: string;
};

// La leyenda vive aca: agregar un color es agregar una linea. La UI dibuja la leyenda desde esta
// lista, asi que nunca puede quedar desfasada de lo que realmente se puede elegir.
export const CALENDAR_MARK_COLORS: Array<{ id: string; label: string; hex: string }> = [
  { id: "naranja", label: "Pago inamovible", hex: "#ea580c" },
  { id: "magenta", label: "Pago estimado", hex: "#c026d3" },
];

export function markHex(color: string): string | undefined {
  return CALENDAR_MARK_COLORS.find((c) => c.id === color)?.hex;
}

export function markLabel(color: string): string {
  return CALENDAR_MARK_COLORS.find((c) => c.id === color)?.label || color;
}

/**
 * Pone, cambia o saca el color de una celda.
 * - color vacio: saca el marcador.
 * - mismo color que ya tenia: lo saca (el boton funciona como interruptor).
 * - color distinto: lo reemplaza, sin dejar dos marcadores en la misma celda.
 */
export function setCalendarMark(
  marks: CalendarMark[],
  input: { key: string; date: string; label: string; color: string; createdBy: string; createdAt: string; id: number }
): CalendarMark[] {
  const previo = marks.find((m) => m.key === input.key);
  const resto = marks.filter((m) => m.key !== input.key);
  if (!input.color) return resto;
  if (previo && previo.color === input.color) return resto;
  if (!markHex(input.color)) return marks;
  return [
    { id: input.id, key: input.key, date: input.date, label: input.label, color: input.color, createdBy: input.createdBy, createdAt: input.createdAt },
    ...resto,
  ];
}


// ---- NOTAS DE CELDA ---------------------------------------------------------------------------
// Pedido de Nicolas (2026-08-29): "poder seleccionar una celda para escribir y dejar informacion
// escrita SIN QUE ESTO MODIFIQUE EL CALCULO". Por eso la nota no vive con los movimientos: es una
// anotacion sobre la coordenada de la celda y no entra en ninguna suma.

export type CalendarNote = {
  id: number;
  // sectionKey|itemKey|fecha — la misma coordenada que usan las banderitas y los marcadores.
  key: string;
  date: string;
  label: string;
  text: string;
  createdBy: string;
  createdAt: string;
};

/** Escribe, reemplaza o borra la nota de una celda. Texto vacio = borrar. */
export function setCalendarNote(
  notas: CalendarNote[],
  input: { key: string; date: string; label: string; text: string; createdBy: string; createdAt: string; id: number }
): CalendarNote[] {
  const resto = notas.filter((n) => n.key !== input.key);
  const texto = input.text.trim();
  if (!texto) return resto;
  return [{ ...input, text: texto }, ...resto];
}
