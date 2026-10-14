// NOVEDADES DEL SISTEMA (Nicolas, 2026-10-14): "cada vez que un usuario inicia sesion debe aparecer una
// ventana emergente aclarando los cambios y como se utilizan las nuevas modificaciones".
//
// Cada entrega es una tanda con fecha. Al iniciar sesion se muestran las tandas que esa persona todavia
// no vio, y de cada una SOLO lo que toca a las solapas a las que tiene permiso (`tab`). Para agregar una
// tanda nueva: sumarla ARRIBA de todo, con un `id` nuevo (la fecha alcanza).

export type Novedad = {
  titulo: string;
  que: string; // que cambio
  como: string; // como se usa
  tab?: string; // solapa donde se ve (para el permiso y el boton "Ir")
};

export type TandaNovedades = { id: string; fecha: string; titulo: string; items: Novedad[] };

export const NOVEDADES: TandaNovedades[] = [
  {
    id: "2026-10-14c",
    fecha: "14/10/2026",
    titulo: "Cash flow ordenado por proveedores y grupos de costos",
    items: [
      {
        titulo: "Las secciones del cash flow",
        que: "Ingresos: Trabajos aprobados · Cobranzas, Movimientos internos · Ingreso, Inversiones, Otros ingresos. Egresos: Cuentas corrientes · Proveedores habituales, Proveedores, Haberes (con cargas sociales y viáticos), Impuestos y Movimientos internos · Egresos (con colocación en inversiones y retiros societarios).",
        como: "Lo que ya estaba cargado no se perdió: se ve en su sección nueva.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Proveedores por grupo de costos",
        que: "En PROVEEDORES y CUENTAS CORRIENTES los renglones son los grupos de costos (fijo o variable) y debajo va cada proveedor con su nombre. Bancos, tarjetas, seguros y caja chica también son proveedores.",
        como: "El grupo sale de la factura o, si no tiene, de la ficha del proveedor (Pago a proveedores). Click en una celda del grupo para cargar un pago (pide proveedor y cómo se pagó). Click derecho en el nombre del grupo para renombrarlo (se renombra en Grupos de costos).",
        tab: "calendarioAnual",
      },
      {
        titulo: "Grupo de costo en facturas y proveedores",
        que: "El 'tipo de gasto' de una factura o de un proveedor es ahora un grupo de costo con su tipo: por ejemplo 'Fijo · Administrativos' o 'Variable · Compras y materiales'. Puede haber dos grupos con el mismo nombre y distinto tipo.",
        como: "Los grupos se crean en Compras y análisis de gastos → Grupos de costos. En la factura y en la ficha del proveedor se elige el grupo.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-14b",
    fecha: "14/10/2026",
    titulo: "Compras y Pago a proveedores reordenados",
    items: [
      {
        titulo: "Facturas de compra: listado y ventana",
        que: "En Compras, las facturas se ven en un listado con su estado de pago (pagada, sin pagar con fecha y estado, o sin fecha) y si el proveedor tiene cuenta corriente o es nuevo.",
        como: "'+ Agregar factura' abre la ventana: 1) proveedor (de la lista o uno nuevo), 2) datos de la factura, 3) pago: si se pagó, cómo y de qué cuenta (queda en el cash flow); si no, para cuándo y con qué estado (va a Pagos programados). 'Asignar pago' en una factura sin pagar.",
        tab: "compras",
      },
      {
        titulo: "Compras más limpia",
        que: "Arriba el Análisis de gastos, debajo el Resumen administrativo y las facturas; al final, la composición de costos y los grupos de costos. El semáforo y las compras pendientes pasaron a Fabricación; la deuda con la gente, a Caja chica y viáticos.",
        como: "Todo sigue cargándose igual; solo cambió de lugar.",
        tab: "compras",
      },
      {
        titulo: "Proveedores con ficha",
        que: "En Pago a proveedores: el listado de proveedores (agregar, editar, quitar o vaciar la lista sin perder lo cargado en el cash flow) y el resumen de los que tienen cuenta corriente.",
        como: "'+ Agregar proveedor' o click derecho en la sección: razón social, CUIT, dirección, contacto y tipo (con o sin cuenta corriente). Click en un proveedor abre su ficha: ahí se cargan facturas y se ven todas con su situación de pago. Desde Compras, la ficha te trae acá.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-14",
    fecha: "14/10/2026",
    titulo: "Cash flow vinculado, análisis de gastos, cierre de año y guardado más seguro",
    items: [
      {
        titulo: "Guardado más seguro",
        que: "Una sesión abierta con datos viejos ya no pisa lo que cargó otra persona. Si dos personas cambian el mismo trabajo, se juntan los cambios de las dos (factura por factura, pago por pago). Y todo cambio se guarda solo.",
        como: "No hay que hacer nada. Igual conviene cerrar el sistema cuando no se usa.",
      },
      {
        titulo: "Cobros estimados e inamovibles",
        que: "Cada cobro de un trabajo tiene estado: realizado (suma), estimado (violeta) o inamovible (rojo). Los estimados e inamovibles NO suman en el cobrado ni en la planilla: son la fecha esperada.",
        como: "En la ficha del trabajo → Cobranzas: elegí el estado de cada cobro o tocá '+ Cobro estimado'. En el Calendario, click derecho sobre la celda violeta o roja → 'Ya se cobró este día'.",
        tab: "aprobados",
      },
      {
        titulo: "💾 Guardar este trabajo",
        que: "Botón arriba de la ficha de cada trabajo: lo sube al servidor en el momento y lo verifica releyéndolo.",
        como: "Después de cargar facturas, pagos o adicionales, apretalo y esperá el mensaje verde 'Guardado y verificado'. Si sale en rojo, no cierres y volvé a apretarlo.",
        tab: "aprobados",
      },
      {
        titulo: "Trabajos terminados",
        que: "La fila de un trabajo completo y finalizado se ve tachada en la lista. En el Calendario, su renglón desaparece el mes siguiente a su último movimiento.",
        como: "No hay que hacer nada: se marca solo al finalizarlo y cobrarlo.",
        tab: "aprobados",
      },
      {
        titulo: "Movimientos internos en el cash flow",
        que: "Préstamos entre empresas, de personas, aportes y pases entre cuentas aparecen en el Calendario en INGRESOS y EGRESOS · MOVIMIENTOS INTERNOS. Un pase sale de una cuenta y entra en la otra. El reintegro de ART quedó en OTROS INGRESOS.",
        como: "Cargalos en la solapa Movimientos internos o directo en esos renglones del Calendario (te pide las dos cuentas o quién puso la plata). Se ven en los dos lados.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Inversiones vinculadas",
        que: "Al colocar plata en una inversión sale de su cuenta (EGRESOS · INVERSIONES); al rescatarla vuelve en INGRESOS · INVERSIONES, en el renglón de su tipo.",
        como: "En Inversiones cargá la cuenta, blanco/negro y, al cerrarla, cuánto volvió. También se puede cargar la colocación o el rescate desde el Calendario.",
        tab: "inversiones",
      },
      {
        titulo: "Compras y análisis de gastos",
        que: "Arriba de la solapa: todos los egresos del sistema agrupados (personal, empresariales, funcionamiento, materiales, bancos y tarjetas, deudas, seguros, caja chica y viáticos), con blanco y negro separados, fijo/variable y lo que viene.",
        como: "Elegí mes y empresa; click en un grupo para ver sus renglones y cada pago. Click derecho sobre un renglón: fijo o variable con 🔒 candado. Sobre un pago: fijo/variable, estado o 'Ir a' su solapa.",
        tab: "compras",
      },
      {
        titulo: "Ficha del proveedor",
        que: "Datos, tipo de gasto con candado, condición de pago habitual, cuenta corriente, próximos pagos e historial. Las facturas sin pagar con fecha aparecen solas en Pagos programados.",
        como: "Click derecho sobre una cuenta corriente o una factura en Compras. Con el candado, cada factura nueva del proveedor queda clasificada sola.",
        tab: "compras",
      },
      {
        titulo: "Estado de los pagos programados",
        que: "Cada pago que viene tiene estado: programado (verde agua), estimado (violeta) o inamovible (rojo).",
        como: "En Pagos programados (arriba del Calendario anual), click derecho sobre el pago → elegí el estado.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Costo real de bancos y tarjetas",
        que: "Tablero por empresa con comisiones, impuestos, intereses y consumos de cada cuenta y tarjeta. Marca '⚠ revisar' los débitos mal clasificados.",
        como: "Arriba de Bancos y tarjetas: elegí mes o ejercicio y abrí cada cuenta o tarjeta para ver el detalle.",
        tab: "bancos",
      },
      {
        titulo: "Viáticos",
        que: "La solapa se llama Caja chica y viáticos. Hay viáticos eventuales (anticipos que se rinden) y viáticos fijos que son parte del acuerdo de cada empleado.",
        como: "Eventuales: '+ Viático' arriba de la solapa. Fijos: en la ficha del empleado (Personal), viático fijo mensual blanco/negro y desde qué mes. Salen solos cada mes.",
        tab: "cajaChica",
      },
      {
        titulo: "Retiros societarios",
        que: "Sección nueva EGRESOS · RETIROS SOCIETARIOS en el Calendario y bloque propio en Balance, con totales por socio y 'resultado − retiros'.",
        como: "En Balance → '+ Retiro', o desde el Calendario en ese renglón (te pide el socio).",
        tab: "cashflow",
      },
      {
        titulo: "Cierre de año con arqueo",
        que: "Al cerrar el ejercicio, el sistema pide la plata real de cada banco y del efectivo blanco y negro. Si no coincide, pide el motivo; un retiro de socios o un aporte quedan asentados. El año nuevo arranca con lo contado.",
        como: "Balance → Cierre de ejercicio (solo admin). Se completa la ventana del arqueo y después se confirma como siempre.",
        tab: "cashflow",
      },
      {
        titulo: "Salto de año",
        que: "Una línea violeta marca en el Calendario anual dónde termina un ejercicio y empieza el otro (1 de noviembre); en Pagos programados, un separador.",
        como: "Se ve sola.",
        tab: "calendarioAnual",
      },
    ],
  },
];

// Las tandas que esa persona todavia no vio (las mas nuevas primero), con solo lo que puede ver.
export function novedadesPendientes(
  vistoHasta: string,
  puedeVer: (tab?: string) => boolean,
  todas: TandaNovedades[] = NOVEDADES
): TandaNovedades[] {
  return todas
    .filter((t) => !vistoHasta || t.id > vistoHasta)
    .map((t) => ({ ...t, items: t.items.filter((i) => puedeVer(i.tab)) }))
    .filter((t) => t.items.length > 0);
}

export const ultimaNovedad = (todas: TandaNovedades[] = NOVEDADES) => todas.reduce((a, t) => (t.id > a ? t.id : a), "");
