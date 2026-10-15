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
    id: "2026-10-15d",
    fecha: "15/10/2026",
    titulo: "Conteo de blanqueo y posición de IVA real",
    items: [
      {
        titulo: "Conteo de blanqueo por ejercicio",
        que: "Cuando entra plata negra al banco (un depósito de efectivo negro, o un préstamo o aporte en negro que entra a una cuenta de banco), para considerarla blanqueada habría que pagar el IVA de una factura que no existe (21/121 del monto). El conteo lo suma y lo baja todo lo que balancea: sacar plata blanca del banco a efectivo negro, gastar plata blanca de caja chica sin factura y comprar con factura pagando con efectivo negro (caja chica o facturas de compra pagadas en negro). Arranca de cero cada ejercicio fiscal: la meta es cerrarlo en cero.",
        como: "En Balance → Posición de IVA, debajo de cada empresa: el detalle, el saldo a balancear, su IVA y la posición REAL (la declarada + ese IVA). El chip de IVA de la barra muestra la posición real.",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-10-15c",
    fecha: "15/10/2026",
    titulo: "Caja chica: desbalance y contador blanco / negro",
    items: [
      {
        titulo: "Contador blanco / negro",
        que: "Arriba de Caja chica, por empresa: lo que entró en blanco y en negro a las cajas contra lo gastado con factura y sin factura. Si se compró con factura usando plata negra, dice cuánto conviene comprar SIN factura para nivelar (y al revés).",
        como: "Solo cuentan las cajas que tienen cargado cuánto se dio en blanco y en negro; las otras aparecen con un aviso para editarlas.",
        tab: "cajaChica",
      },
      {
        titulo: "Desbalance B/N de cada caja",
        que: "La caja se maneja por el bruto (asignado − utilizado). La columna 'Desbalance B/N' marca N→B (compras con factura pagadas con plata negra) y B→N (gastos sin factura pagados con plata blanca).",
        como: "En el listado de cajas y en la ficha de cada responsable.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-10-15b",
    fecha: "15/10/2026",
    titulo: "Facturas de compra: ARCA, caja chica y edición",
    items: [
      {
        titulo: "Importar el listado de ARCA",
        que: "En Facturas de compra se puede subir el listado 'Mis comprobantes recibidos' de ARCA, para las facturas que no están en mano. Se cruza con las ya cargadas (por número, CUIT o nombre del proveedor, y total): las que ya estaban no se duplican y quedan con la pill verde '✓ ARCA'. Las nuevas entran con la pill azul 'ARCA' y SIN PAGAR.",
        como: "Botón 'Importar listado de ARCA' arriba del listado. Para asignarles el pago: 'Asignar pago' en la fila, o tildá 'Todas las sin pagar' para verlas juntas.",
        tab: "compras",
      },
      {
        titulo: "Las facturas de caja chica también están en Compras",
        que: "La factura de un gasto rendido en una caja chica aparece en el listado, pagada por la caja, con la pill 'caja chica · responsable'. En el cash flow ese pago va en Proveedores, en el grupo del gasto y el día del gasto.",
        como: "Click en la fila: abre el gasto de caja chica (se edita ahí).",
        tab: "compras",
      },
      {
        titulo: "Editar y eliminar facturas",
        que: "Toda factura se edita o se elimina desde el click derecho. Si tiene un pago cargado, se puede eliminar la factura sola o la factura y su pago (para las de prueba).",
        como: "Click derecho sobre la factura → Editar factura… / Eliminar… / Ficha del proveedor.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-15a",
    fecha: "15/10/2026",
    titulo: "Personal: acuerdo y premio en negro por separado",
    items: [
      {
        titulo: "Acuerdo y premio, cada uno en su renglón",
        que: "El viejo 'Premios / Acuerdo (negro)' se partió en dos. El ACUERDO se prorratea por los días trabajados del mes (como hasta ahora). El PREMIO es un monto fijo no remunerativo: no mira los días trabajados y sale entero. Los dos son administración en negro, sin cargas, y suman al costo negro, al cash flow (Haberes con la pill N) y al costo hora. Lo que ya estaba cargado quedó como acuerdo.",
        como: "En la ficha del empleado, en la liquidación del mes: 'Acuerdo (negro · por días trabajados)' y 'Premio (negro · monto fijo)'. El recibo negro muestra el acuerdo prorrateado y el premio en renglones aparte, y el total a entregar los suma.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-14h",
    fecha: "14/10/2026",
    titulo: "Costo hora para cotizar corregido",
    items: [
      {
        titulo: "El costo hora se calcula sobre un mes completo",
        que: "Antes salía de las horas fichadas del mes en curso: a mitad de mes daba la mitad, y los presupuestos quedaban muy por debajo. Ahora se calcula sobre un mes completo (horas nominales, asistencia completa) con la última escala vigente: si la escala del mes no se cargó, usa la anterior. También suma el blanco acordado de los fuera de convenio sin cargas, y la categoría encuentra su escala aunque tenga acentos o espacios distintos.",
        como: "Para llevarlo a los presupuestos: en Marcadores tocá 'Tomar costo hora desde personal' (en Mano de obra base), y en cada presupuesto viejo usá 'Actualizar presupuesto vencido'. La liquidación del mes no cambia.",
        tab: "marcadores",
      },
    ],
  },
  {
    id: "2026-10-14g",
    fecha: "14/10/2026",
    titulo: "Remitos con historial y stock que se mueve solo",
    items: [
      {
        titulo: "Recepción de material (remito del proveedor)",
        que: "El material entra al stock con el remito de recepción, y el remito queda en el historial (en Stock → Remitos · historial). Cada renglón se vincula a un ítem del stock; si no existe, se da de alta. Editar o quitar un remito corrige el stock solo.",
        como: "'+ Recepción de proveedor', o desde 'Remitos a cargar' (el archivo subido abre la recepción para confirmar). En la factura de una compra de materiales se vincula el remito (no vuelve a sumar) o, si no vino remito, se tilda 'cargar los renglones de esta factura'.",
        tab: "stock",
      },
      {
        titulo: "Salida por trabajo y entrega al cliente",
        que: "En la ficha del trabajo aprobado: 'Salida de stock por trabajo' descuenta el material imputado a ese trabajo (con 'Traer materiales del trabajo') y muestra el costo real contra lo cotizado. 'Entrega al cliente' arma el remito de entrega imprimible (no mueve stock).",
        como: "Click derecho sobre un remito: abrir, imprimir o quitar.",
        tab: "aprobados",
      },
      {
        titulo: "Caja chica: empresa y eliminar",
        que: "Cada caja dice de qué empresa sale la plata y a qué empresa corresponden los gastos (si son distintas, se marca en naranja). Una caja se puede eliminar, con o sin sus gastos.",
        como: "Click derecho sobre la fila de la caja (fuera del nombre) → Editar o Eliminar caja chica.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-10-14f",
    fecha: "14/10/2026",
    titulo: "Caja chica: listado y ficha por responsable",
    items: [
      {
        titulo: "La solapa muestra solo las cajas asignadas",
        que: "Un listado con responsable, tipo de caja, fecha de asignación, monto, administración (blanco/negro), lo utilizado y lo que resta. Abajo, los tipos de caja chica (General, Viáticos y los que agregues) con lo asignado y lo gastado de cada uno.",
        como: "'+ Nueva caja chica' para asignar una: ahí se ve el resumen de fondos (lo asignado, lo usado y lo que resta, blanco y negro) y se elige el tipo de caja. Los viáticos ahora son un tipo de caja chica.",
        tab: "cajaChica",
      },
      {
        titulo: "Ficha del responsable (click derecho sobre su nombre)",
        que: "Adentro está todo lo de esa persona: el historial de sus cajas, sus rendiciones, en qué se gastó (por grupo de costo), sus viáticos y las facturas que pagó de su bolsillo.",
        como: "Desde la ficha se rinde un gasto o se lee un ticket o factura (el lector está solo ahí). Si el gasto es en blanco se carga la factura: queda en Compras y en la ficha del proveedor, pagada por la caja chica. El pago va al cash flow como pago al proveedor, en su grupo de costo.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-10-14e",
    fecha: "14/10/2026",
    titulo: "Solapa nueva: Desendeudamiento",
    items: [
      {
        titulo: "Todas las deudas en un lugar",
        que: "Planes de pago (AFIP, ABL, moratorias), préstamos externos y financiaciones de equipos se cargan en la solapa DESENDEUDAMIENTO, como si fueran un proveedor: acreedor, tipo, empresa, grupo de costo (dónde van sus pagos en el cash flow) y blanco/negro. Las deudas que ya estaban cargadas en Balance se mudaron solas.",
        como: "'+ Agregar deuda', completá los datos y estipulá las cuotas (primera fecha, cantidad y monto). Abajo se ven, de referencia, las otras deudas del sistema (cuentas corrientes, deuda con la gente, tarjetas) con un botón para ir a su solapa.",
        tab: "desendeudamiento",
      },
      {
        titulo: "Asignar el pago de cada cuota",
        que: "Cada cuota se salda con un pago: uno nuevo (fecha, monto, cómo y de qué cuenta) o uno ya cargado. Ese pago va al cash flow en EGRESOS · PROVEEDORES, en el grupo de la deuda y con el nombre del acreedor. Las cuotas pendientes van a la agenda de pagos inamovibles.",
        como: "Click derecho sobre la cuota: asignar el pago, desvincularlo, cambiar el estado (programado, estimado, inamovible) o quitarla.",
        tab: "desendeudamiento",
      },
    ],
  },
  {
    id: "2026-10-14d",
    fecha: "14/10/2026",
    titulo: "Caja chica: se rinden gastos a proveedores",
    items: [
      {
        titulo: "La caja chica ya no figura en el cash flow",
        que: "Asignar un fondo o devolver lo que sobra es plata que pasa a la caja de una persona: no va al cash flow. Lo que va son los GASTOS que se rinden, como pago al proveedor, en el grupo de costo que corresponda.",
        como: "Arriba, junto a los bancos, se ve cuánta plata hay asignada en cajas chicas (blanco y negro aparte).",
        tab: "calendarioAnual",
      },
      {
        titulo: "Rendir gasto",
        que: "En cada caja, '+ Rendir gasto' abre una ventana como la de una factura: caja (persona) de origen, proveedor habitual o uno nuevo (se le abre ficha), fecha, monto, blanco/negro, comprobante y dónde va en el cash flow (grupo de costo).",
        como: "Si el proveedor tiene candado en su ficha, el gasto va siempre a su grupo y no se puede cambiar. 'Abrir ficha del gasto' para corregir uno cargado.",
        tab: "cajaChica",
      },
    ],
  },
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
