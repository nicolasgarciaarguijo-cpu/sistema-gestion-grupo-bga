// Orden de los subpresupuestos. Pedido de Nicolas (2026-09-23): SIEMPRE alfabetico, en todos lados
// (la lista del presupuesto, la vista previa, el PDF del cliente, la descripcion del trabajo
// aprobado y el resumen de materiales). Antes salian en el orden en que se habian ido guardando, que
// no le dice nada a nadie: con 15 bloques encontrar "Vestidor" era ir leyendo uno por uno.
//
// El orden se calcula sobre el titulo QUE SE VE (si el bloque no tiene titulo, el que se muestra es
// "Subpresupuesto N"), para que lo que se lee en pantalla coincida con el orden.

// Comparador unico: espaniol, sin distinguir mayusculas ni acentos, y con los numeros en orden
// humano ("Placard 2" antes que "Placard 10", no al reves como haria el orden de texto puro).
export const compararTitulosDeSubpresupuesto = (a: string, b: string): number =>
  String(a || "").localeCompare(String(b || ""), "es-AR", {
    numeric: true,
    sensitivity: "base",
  });

// Titulo visible de un bloque: el cargado o el "Subpresupuesto N" de descarte.
export const tituloDeSubpresupuesto = (section: { title?: string } | null, index: number): string =>
  String(section?.title ?? "").trim() || `Subpresupuesto ${index + 1}`;

// Clave de orden. El bloque SIN titulo va al final (se llama "Subpresupuesto N", un nombre que
// depende de la posicion: ordenarlo por ese nombre lo haria saltar de lugar solo).
const claveDeOrden = (section: { title?: string } | null): string =>
  String(section?.title ?? "").trim() || "￿";

// Devuelve una copia ordenada alfabeticamente (no muta). Los titulos repetidos quedan en el orden en
// que estaban (Array.prototype.sort es estable), asi no bailan entre si al reordenar.
export const ordenarSubpresupuestos = <T extends { title?: string }>(sections: T[]): T[] =>
  (Array.isArray(sections) ? sections : [])
    .map((section, index) => ({ section, index }))
    .sort(
      (a, b) =>
        compararTitulosDeSubpresupuesto(claveDeOrden(a.section), claveDeOrden(b.section)) ||
        a.index - b.index
    )
    .map((item) => item.section);

// Igual que la anterior pero para listas ya transformadas, donde el titulo visible vive en otro campo
// (los bloques del trabajo aprobado y del resumen de materiales).
export const ordenarPorTitulo = <T>(rows: T[], titulo: (row: T) => string): T[] =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        compararTitulosDeSubpresupuesto(titulo(a.row), titulo(b.row)) || a.index - b.index
    )
    .map((item) => item.row);
