// TIPOS DE DOCUMENTO (los de Documentos y la carpeta sincronizada). Los de siempre los reconoce la carpeta por su nombre
// (lib/folderSync.ts); desde Acceso → Listados del sistema se renombran, se pausan y se suman nuevos, cada uno con las
// carpetas que lo reconocen (domain/listasSistema.ts vuelca lo vigente aca y en CARPETAS_EXTRA de folderSync).
export const TIPOS_DOCUMENTO: Array<{ value: string; label: string }> = [
  { value: "compras", label: "Facturas de compra" },
  { value: "facturas-emitidas", label: "Facturas emitidas" },
  { value: "remitos", label: "Remitos" },
  { value: "presupuestos", label: "Presupuestos" },
  { value: "recibos", label: "Recibos" },
  { value: "banco", label: "Banco" },
  { value: "cobranzas", label: "Cobranzas" },
  { value: "caja-chica", label: "Caja chica" },
  { value: "escalas", label: "Escalas salariales" },
  { value: "documentacion", label: "Documentacion" },
  { value: "personal", label: "Personal" },
];

export const etiquetaTipoDocumento = (valor: string) => TIPOS_DOCUMENTO.find((t) => t.value === valor)?.label || valor;
