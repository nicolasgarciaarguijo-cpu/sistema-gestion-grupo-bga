// CANDADO ANTI-VACIADO del guardado en Supabase.
//
// Que paso (20/08/2026): se abrio la misma cuenta en otra maquina, esa sesion arranco SIN datos y el
// guardado automatico escribio arrays vacios encima de los buenos. Se perdieron los movimientos del
// banco, los items financieros, las compras y los trabajos. La app no distinguia entre "el usuario
// borro todo" y "esta sesion nunca llego a cargar nada".
//
// La regla: **vaciar es una accion explicita**. Una sesion que todavia no escribio esa fila (o sea,
// la hidratacion inicial despues del login) NO puede dejar en cero un array que en la base tiene
// registros. Si eso va a pasar, el guardado FRENA con aviso: no se pierde nada local y el autosave
// reintenta cuando la sesion tenga los datos de verdad.
//
// Puro: solo compara dos objetos, sin estado ni red.

export type CampoVaciado = {
  field: string; // nombre del array (bankStatementEntries, purchaseInvoices, ...)
  remoto: number; // cuantos registros hay hoy en la base
};

const largo = (valor: unknown): number | null => (Array.isArray(valor) ? valor.length : null);

// Campos donde NUESTRA copia esta vacia (o no viene) y la de la BASE tiene registros.
// Solo mira arrays: los escalares y objetos de configuracion se pisan como siempre.
export function fieldsThatWouldBeEmptied(
  ours: Record<string, unknown> | null | undefined,
  theirs: Record<string, unknown> | null | undefined
): CampoVaciado[] {
  if (!theirs || typeof theirs !== "object") return [];
  const nuestro = ours && typeof ours === "object" ? ours : {};
  const out: CampoVaciado[] = [];
  for (const [field, valorRemoto] of Object.entries(theirs)) {
    const remoto = largo(valorRemoto);
    if (remoto === null || remoto === 0) continue;
    if (!(field in nuestro)) continue; // no lo estamos tocando: la fila se escribe sin ese campo
    const propio = largo(nuestro[field]);
    if (propio === 0) out.push({ field, remoto });
  }
  return out;
}

export const describeEmptied = (campos: CampoVaciado[]): string =>
  campos.map((c) => `${c.field}: ${c.remoto}`).join(", ");
