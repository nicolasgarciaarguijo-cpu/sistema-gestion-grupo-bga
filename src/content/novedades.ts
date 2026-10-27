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
    id: "2026-10-27b",
    fecha: "27/10/2026",
    titulo: "Costos empresariales: promedio de 3 meses por empresa",
    items: [
      {
        titulo: "Los costos del presupuesto salen de los últimos 3 meses",
        que: "Costos empresariales muestra, empresa por empresa, lo gastado en cada grupo los últimos 3 meses cerrados y su promedio. Ese promedio es lo que entra al presupuesto, salvo que escribas otro monto en 'A usar': ese manda. Vacío = vuelve al promedio.",
        como: "Marcadores → Costos empresariales: elegí la empresa arriba a la derecha.",
        tab: "marcadores",
      },
      {
        titulo: "Cada costo elige en qué empresa impacta",
        que: "Click derecho sobre un grupo: impacta solo en los presupuestos de su empresa, en los de las dos o en ninguno. Por defecto impactan los grupos fijos cargados a mano; los variables y los automáticos (Personal, Caja chica) no, porque ya entran al presupuesto por materiales y mano de obra. Ahora un presupuesto de BGA ya no toma los costos fijos de De Raíz (y al revés), salvo los marcados 'las dos'.",
        como: "Marcadores → Costos empresariales → click derecho en el grupo.",
        tab: "marcadores",
      },
    ],
  },
  {
    id: "2026-10-27a",
    fecha: "27/10/2026",
    titulo: "El cronograma mira lo que ya está ocupado",
    items: [
      {
        titulo: "Recibo blanco del personal fuera de convenio",
        que: "El recibo blanco de quien está fuera de convenio (socios, administración) ahora muestra el sueldo acordado: con cargas en el remunerativo, sin cargas como 'sueldo acordado sin aportes'. También muestra los anticipos del mes. Así la grilla cierra con el neto, y el costo total empleador incluye lo que se paga sin aportes.",
        como: "Personal → ficha de la persona → 'Recibo blanco' (o click derecho en la nómina).",
        tab: "personal",
      },
      {
        titulo: "Rescate previsto de las inversiones",
        que: "Cada inversión activa en pesos con fecha de fin aparece en la planilla como '≈' el día que vence, en su renglón de rescate, por su última valuación. No suma; al rescatarla manda el número real.",
        como: "Inversiones: cargar la fecha de fin y el valor actual. Se ve en el Calendario anual, INGRESOS · INVERSIONES.",
        tab: "inversiones",
      },
      {
        titulo: "El cronograma descuenta la organización diaria",
        que: "El cronograma automático ya no supone que todos están libres: descuenta los días en obra (el instalador no está en el taller), las tareas cargadas a mano y los mantenimientos. Si alguien de la tarea no está, la tarea se corta y sigue después.",
        como: "Fabricación → Cronograma automático: arriba dice cuánto descontó; 'Quién y cuándo…' muestra los tramos reales.",
        tab: "fabricacion",
      },
      {
        titulo: "Máquinas pesadas y máquinas paradas",
        que: "Las máquinas pesadas de Stock hacen una tarea por unidad a la vez (con una CNC, dos cortes no van en paralelo aunque haya gente libre). Un mantenimiento programado para la máquina mientras dura. Si una máquina que pide la tarea está en mantenimiento, fuera de servicio o sin unidades, el trabajo avisa '⚠ máquina parada: la fecha no es real'.",
        como: "Las tareas dicen qué máquinas usan en el catálogo de tareas (Organización diaria) y el estado de cada máquina se carga en Mantenimiento.",
        tab: "fabricacion",
      },
      {
        titulo: "Registrar un retrabajo desde la tarea del día",
        que: "En la organización diaria, click derecho sobre una tarea → 'Hubo que rehacerla: registrar retrabajo…'. Se abre el retrabajo con el trabajo, la tarea, quién la hizo y sus horas ya cargadas.",
        como: "Fabricación → Organización diaria → abrir el día de la persona → click derecho en la tarea.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-26e",
    fecha: "26/10/2026",
    titulo: "Cronograma automático y si llegamos a la entrega",
    items: [
      {
        titulo: "Retrabajos y efectividad",
        que: "En Fabricación se cargan los retrabajos: de qué trabajo y tarea, quién la hizo, quién la rehace y cuánto (100% = la tarea entera). Se ve el costo (horas por el costo hora de quien rehace, más materiales) y sus horas corren el fin del trabajo en el cronograma. En Personal, la efectividad de cada persona en el mes: horas trabajadas contra horas rehechas por su culpa.",
        como: "Fabricación → Retrabajos → '+ Retrabajo'. Personal → Efectividad (retrabajos).",
        tab: "fabricacion",
      },
      {
        titulo: "Cronograma automático de Fabricación",
        que: "Los trabajos en curso con sus muebles cargados se reparten solos entre la gente de De Raíz (quien sabe cada tarea, los mejores, lo más rápido), de lunes a viernes de 07:30 a 17:00 con el almuerzo. Cada trabajo dice cuándo termina, si llega a la entrega con su holgura (10 días hábiles por defecto, editable) y quién hace qué cada día. Con un click se pasa a la organización diaria.",
        como: "Fabricación → Cronograma automático. 'Muebles…' carga o corrige los muebles del trabajo (los presupuestos viejos se completan acá, sin tocar el precio).",
        tab: "fabricacion",
      },
      {
        titulo: "Siempre se pregunta de qué empresa es lo que se carga",
        que: "Al cargar un seguro, una inversión, un pago, una tarjeta, un trabajo, un movimiento, un artículo de stock y el resto de las altas, el sistema pregunta si es de BGA, de De Raíz o de ambas (compartido). Quien trabaja con una sola empresa no ve la pregunta.",
        como: "Aparece sola al tocar el botón de agregar.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-26d",
    fecha: "26/10/2026",
    titulo: "Empresas por separado o juntas",
    items: [
      {
        titulo: "Elegir la empresa arriba cambia todas las solapas",
        que: "Al elegir BGA, De Raíz o todas en 'Vista operativa por empresa', las solapas se actualizan enseguida (antes seguían mostrando lo anterior). Cada uno ve solo las empresas que tiene permitidas; quien trabaja con una sola queda fijo en esa. Lo que se carga va a la empresa elegida.",
        como: "Arriba de todo, 'Vista operativa por empresa'. El sistema recuerda la última que elegiste.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Grupos de tareas en los tipos de mueble",
        que: "El tipo de mueble se arma con operaciones (grupos de tareas: Corte CNC, Pegado de cantos, Armado…), cada una con sus tareas en orden. Las tareas de un grupo se cargan de una vez pegando la lista (1. … 2. …), y una tarea ya escrita en otro grupo se llama y es la misma. El grupo se asigna a cada tipo de mueble con un click y la receta queda por operación; si el grupo cambia, la receta avisa y se actualiza.",
        como: "Fabricación → Tipos de mueble → click derecho → Receta… → '+ Grupo de tareas…'. Los grupos se arman en Tipos de tarea y grupos de trabajo.",
        tab: "fabricacion",
      },
      {
        titulo: "Fabricación: trabajos de las dos empresas, gente de De Raíz",
        que: "Fabricación muestra siempre los trabajos de BGA y de De Raíz (los ejecuta el personal de De Raíz). El listado de tareas es común a las dos empresas. Las personas de la organización diaria y las que hacen las tareas al cotizar por mueble son las de De Raíz; las máquinas nuevas se cargan como de De Raíz.",
        como: "Fabricación, con cualquier empresa elegida arriba.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-26c",
    fecha: "26/10/2026",
    titulo: "Presupuestar por tipo de mueble",
    items: [
      {
        titulo: "Muebles del presupuesto: las horas salen de la receta",
        que: "Cada bloque del presupuesto puede llevar sus muebles (tipo, cantidad y medidas). Las horas salen de la receta del tipo de mueble, con las medidas y con los materiales cotizados en el bloque (bisagras, placas, cajones...). Cada tarea la hace quien sabe hacerla con el costo hora más alto, y las tareas en paralelo se reparten entre los que saben para terminar lo antes posible: se ve quién hace qué, cuántas horas y cuánto cuesta. En el catálogo de tareas, la columna Personas marca las tareas de 2 o más (un especialista con aprendices o ayudantes por su categoría interna; si no alcanzan, completa un especialista y se avisa para evaluar contratar. El tiempo es el mismo y las horas-hombre se multiplican). Los especialistas van primero a las tareas más complejas. Si la gente está ocupada, la tarea espera: se ve el tiempo de fabricación real con este plantel, en horas y días hábiles.",
        como: "Presupuesto → Muebles del presupuesto → '+ Mueble…'. Después, 'Pasar a mano de obra (por persona)' deja una fila por persona con sus horas y su costo hora.",
        tab: "presupuesto",
      },
    ],
  },
  {
    id: "2026-10-26b",
    fecha: "26/10/2026",
    titulo: "Mantenimiento en Fabricación y el aviso de pagos vencidos",
    items: [
      {
        titulo: "El aviso de pagos vencidos es solo un recordatorio",
        que: "Al abrir el sistema siguen apareciendo los pagos programados vencidos sin cargar, pero desde ahí ya no se paga ni se reprograma: cada uno tiene un botón que lleva a la ficha del proveedor (o a la solapa de donde sale, como Desendeudamiento o Bancos y Tarjetas) para gestionar el pago ahí.",
        como: "En el aviso, tocá Ir a la ficha del proveedor. Al cerrarlo queda siempre un cartel rojo abajo a la izquierda con los pagos vencidos, hasta que se carguen; tocándolo se vuelve a abrir.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Mantenimiento, adentro de Fabricación",
        que: "Las máquinas y herramientas de Stock (Máquinas pesadas, Máquinas manuales y el grupo nuevo Herramientas) tienen su ficha: estado, compra, especificaciones, usos, reposición, preventivos e historial. Arriba se ven los preventivos vencidos y los próximos.",
        como: "Fabricación → bloque 'Máquinas y herramientas' → click derecho sobre una máquina → 'Ficha…'. '+ Máquina o herramienta' la crea en Stock.",
        tab: "fabricacion",
      },
      {
        titulo: "Preventivos como tareas para los idóneos",
        que: "Un preventivo se programa como tarea del día de una persona idónea (la que tiene esa tarea en sus categorías internas). Al marcarla hecha en la organización diaria queda en el historial de la máquina y el contador vuelve a arrancar.",
        como: "Fabricación → 'Mantenimiento preventivo · próximos' → 'Programar' → elegí día y persona. 'Preparar tareas de mantenimiento' arma el grupo y la habilidad extra.",
        tab: "fabricacion",
      },
      {
        titulo: "Herramientas que pide cada tarea",
        que: "Cada tarea del catálogo dice qué máquinas y herramientas necesita. Mantenimiento muestra qué tareas no se pueden hacer con lo que hay, y la organización diaria avisa si la herramienta falta o no está operativa.",
        como: "Fabricación → Tipos de tarea y grupos de trabajo → columna 'Herramientas…'.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-26a",
    fecha: "26/10/2026",
    titulo: "Categorías internas del personal y tipos de mueble",
    items: [
      {
        titulo: "Categorías internas con sus tareas",
        que: "Personal tiene un bloque nuevo, 'Categorías internas', por escalones: Aprendiz → Ayudante general → Ayudante especializado (con su rumbo: Armado, Mecanizado, Enchapado, Laqueado, Instalación, Herrería) → el oficio (Armador, Mecanizador, Enchapador, Laqueador, Instalador, Herrero) → Responsable (tareas de control: está arriba de todo pero no hereda las de abajo). Terminaciones va aparte, como habilidad extra. Los escalones se pueden renombrar, sumar y reordenar. No son las del convenio: son las capacidades. Cada escalón suma lo de abajo (quien sube conserva lo que ya hacía) y se priorizan las tareas del escalón más alto.",
        como: "Personal → Categorías internas: nombre, escalón y rumbo se escriben en la celda; click derecho sobre una categoría → 'Tareas…'. Click derecho sobre el título de un escalón para subirlo, bajarlo, sumar uno nuevo o quitarlo.",
        tab: "personal",
      },
      {
        titulo: "Las categorías de cada persona",
        que: "En la ficha de cada empleado se tilda su escalón y su rumbo (lo de abajo se marca solo) y sus habilidades extra, y se ve todo lo que puede hacer, con las tareas de su escalón más alto resaltadas.",
        como: "Personal → abrí la ficha → 'Categorías internas y capacidades'.",
        tab: "personal",
      },
      {
        titulo: "Capacidades en Fabricación y tareas con unidad",
        que: "Fabricación muestra 'Capacidades del personal': qué domina cada uno y, por tarea, quién la puede hacer (las que no tiene nadie o dependen de una sola persona son el puesto a cubrir). En la organización diaria, a quien tiene categorías solo se le pueden dar sus tareas, primero las más nuevas. Las tareas del catálogo ahora tienen unidad (unidades, metros lineales, m², m³) y horas por unidad.",
        como: "Fabricación → Capacidades del personal. En Tipos de tarea y grupos de trabajo elegí la unidad de cada tarea.",
        tab: "fabricacion",
      },
      {
        titulo: "Tipos de mueble con su receta",
        que: "Fabricación tiene 'Tipos de mueble': cada uno es una receta de tareas del catálogo ordenada por pasos. Las del mismo paso (3.1, 3.2) las pueden hacer distintas personas a la vez; el paso siguiente arranca cuando terminó todo el anterior. Cada tarea saca su cantidad de las medidas del mueble (por mueble, ml, m² o m³) o de los materiales del presupuesto (por placa, por bisagra, por cajón…, los rubros del Gantt) y, con su tiempo estándar, da las horas-hombre y las horas de reloj mínimas.",
        como: "Fabricación → Tipos de mueble → '+ Tipo de mueble' o 'Crear desde un grupo de trabajo…'. Click derecho → 'Receta y tiempos…' para cargar los pasos y probar con otras medidas.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-23f",
    fecha: "23/10/2026",
    titulo: "Elegir la tarjeta en cada pago",
    items: [
      {
        titulo: "Pago con tarjeta: la lista de tarjetas y el banco solo",
        que: "En cualquier pago a un proveedor (factura, pago a cuenta o cuota de una deuda), al elegir tarjeta de crédito o de débito aparece la lista de las tarjetas cargadas en Bancos y tarjetas. Al elegir una, la cuenta de donde sale se completa sola con la del banco que respalda la tarjeta (y lo dice debajo). Con crédito, también se cargan las cuotas.",
        como: "Medio de pago → 'Tarjeta de crédito' o 'Tarjeta de débito' → Tarjeta. Si avisa que no hay cuenta de ese banco, creala en Bancos y tarjetas → Cuentas.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-23e",
    fecha: "23/10/2026",
    titulo: "Impuestos del banco y control de tarjetas",
    items: [
      {
        titulo: "Impuestos y comisiones del extracto como deuda",
        que: "Al cargar el extracto, los impuestos, comisiones e intereses que cobra el banco se juntan solos en una deuda por banco y por mes ('Impuestos extracto bancario · banco · mes'), con el detalle de cada débito para controlar. Lo mismo con los cargos del resumen de tarjeta (sellos, percepciones, comisiones), por resumen. Al tildarla pagada se asienta el pago desde la cuenta de ese banco y baja su saldo. Las que faltan pagar también figuran en Desendeudamiento.",
        como: "Bancos y tarjetas → 'Impuestos y comisiones del extracto y la tarjeta': abrí el detalle, controlá y tildá 'Pagado'.",
        tab: "bancos",
      },
      {
        titulo: "Pago con tarjeta: elegir la tarjeta y las cuotas",
        que: "Al pagar una factura con tarjeta de crédito se elige cuál tarjeta y en cuántas cuotas (por el total). La compra ya no descuenta del banco el día de la compra: cada cuota descuenta el día del vencimiento del resumen donde aparece.",
        como: "Factura de compra → pago → medio 'Tarjeta de crédito' → Tarjeta y Cuotas.",
        tab: "compras",
      },
      {
        titulo: "Control de cada resumen de tarjeta",
        que: "Por cada tarjeta, cada resumen con ✓ si cierra (las compras cargadas con esa tarjeta + sus impuestos = el monto a pagar). Si no cierra, la lista de renglones del resumen con ✓ o ✗: los que faltan cargar y las compras cargadas que no aparecen, para buscarlas.",
        como: "Bancos y tarjetas → 'Control de resúmenes de tarjeta': tocá un resumen para ver el detalle.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-10-23d",
    fecha: "23/10/2026",
    titulo: "Los préstamos figuran como deuda",
    items: [
      {
        titulo: "El préstamo es deuda en la cuenta del acreedor, no saldo a favor",
        que: "Cada préstamo y cada convenio de Desendeudamiento figura en la cuenta corriente de su acreedor como DEUDA por el total de las cuotas, y esa cuenta pasa a 'con convenio'. Cada pago al acreedor la baja. Ya no aparecen como 'a favor' en 'Cuentas abiertas · proveedores sin convenio', ni sus pagos como 'pagos sin factura'.",
        como: "Proveedores → cuentas corrientes con convenio. Importante: en la ficha del préstamo, el acreedor tiene que tener el mismo nombre que el proveedor al que se le cargan los pagos (por ejemplo, el banco).",
        tab: "desendeudamiento",
      },
    ],
  },
  {
    id: "2026-10-23c",
    fecha: "23/10/2026",
    titulo: "Desendeudamiento: préstamos y cuentas corrientes con convenio",
    items: [
      {
        titulo: "Dos bloques: Préstamos y Cuentas corrientes con convenio",
        que: "Desendeudamiento ahora separa los PRÉSTAMOS (plata que entró a una cuenta y su plan de cuotas) de las CUENTAS CORRIENTES CON CONVENIO (un acuerdo de cuotas con un proveedor, AFIP, un plan de pago o un equipo). Las deudas que ya estaban se ubicaron solas: los préstamos por su nombre y el resto en cuentas corrientes. Todo se puede cambiar desde la ficha (campo 'Bloque').",
        como: "Desendeudamiento: '+ Préstamo' o '+ Convenio de cuenta corriente'. Click en una deuda abre su ficha.",
        tab: "desendeudamiento",
      },
      {
        titulo: "Préstamo: el ingreso de la plata y cuotas que no son pagos a proveedor",
        que: "En la ficha del préstamo se asienta la plata que entró (fecha, monto y cuenta): suma al saldo de esa cuenta y al cash flow como préstamo recibido. Los pagos de sus cuotas ya no cuentan como pagos al acreedor: se terminó el saldo a favor que dejaba cada cuota.",
        como: "Ficha del préstamo → 'Ingreso del préstamo' → 'Asentar el ingreso'.",
        tab: "desendeudamiento",
      },
      {
        titulo: "Convenio: elegir las facturas y verlo en la ficha del proveedor",
        que: "En un convenio se eligen las facturas del proveedor que entran en el acuerdo; esas facturas dejan de programarse por su cuenta (las programan las cuotas) y quedan pagadas con la última cuota. Sin facturas, la deuda del convenio entra en la cuenta corriente del acreedor, así las cuotas la bajan en vez de dejar saldo a favor. La ficha del proveedor muestra sus convenios.",
        como: "Ficha del convenio → 'Facturas del convenio' (tildá las que entran) → 'Usar el total de las facturas' para armar las cuotas.",
        tab: "desendeudamiento",
      },
    ],
  },
  {
    id: "2026-10-23b",
    fecha: "23/10/2026",
    titulo: "Cheques entregados en Pagos programados",
    items: [
      {
        titulo: "Lo pagado queda tachado en Pagos programados",
        que: "Las facturas de proveedores y las cuotas de deudas ya no desaparecen del calendario al pagarlas: quedan en su fecha, tachadas, para saber que ya se pagaron.",
        como: "Cash flow → Pagos programados: lo tachado ya está pagado.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Los cheques entregados figuran en Pagos programados",
        que: "Cada pago cargado con medio 'cheque' aparece en el calendario de Pagos programados como INAMOVIBLE el día que se debita: el pago ya está hecho, pero ese día tiene que haber plata en la cuenta. Avisa como el resto ('faltan N días'). Queda cubierto cuando el débito cae en el banco (conciliado) o cuando pasa la fecha. En el cash flow no se suma dos veces: sigue figurando una sola vez, por su pago.",
        como: "Cash flow → Pagos programados: los cheques salen como 'Cheque a <proveedor>'. Click derecho → 'Ir al origen' abre el pago.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-23",
    fecha: "23/10/2026",
    titulo: "Fabricación reordenada y compras pendientes por trabajo",
    items: [
      {
        titulo: "Fabricación: Organización diaria y Gantt reemplazan a los bloques viejos",
        que: "Ya no están el semáforo de fabricación, el calendario de fabricación y entregas, el avance con fechas límite de compra ni el semáforo de compras: los reemplazan la Organización diaria y el Gantt de fabricación.",
        como: "Fabricación: arriba el tablero general; después Organización diaria y Gantt de fabricación.",
        tab: "fabricacion",
      },
      {
        titulo: "Compras pendientes en la ficha de cada trabajo",
        que: "La ficha de cada trabajo aprobado muestra qué materiales faltan comprar para fabricarlo, con un contador de días: cuenta hasta que arranca su primer rubro en el Gantt (si no está planificado, hasta el inicio del trabajo). Rojo con 3 días o menos, amarillo hasta 7.",
        como: "Trabajos aprobados → abrí un trabajo: bloque 'Compras pendientes para fabricación'.",
        tab: "aprobados",
      },
      {
        titulo: "Reporte en Compras, separado por trabajo",
        que: "En Compras hay una ficha por trabajo con sus faltantes, el estimado y los días que quedan, la más urgente primero. El stock se reparte primero a los trabajos que arrancan antes en el Gantt.",
        como: "Compras → 'Compras pendientes para fabricación (por trabajo)'. Desde cada ficha se abre el trabajo o el Gantt.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-22b",
    fecha: "22/10/2026",
    titulo: "Gantt de fabricación",
    items: [
      {
        titulo: "Trabajos esperando asignación, con sus cantidades",
        que: "En Fabricación hay una tabla con los trabajos aprobados sin terminar y, por cada uno, sus cantidades por rubro: placas de melamina, enchapadas, MDF, módulos, cajones, puertas, iluminación, laqueado y módulos de instalación. Salen solas de los materiales cotizados en el presupuesto (bloque x unidades). Arriba se ve el total de cada rubro que espera asignación.",
        como: "Fabricación → Gantt de fabricación. Tocá 'Planificar' en un trabajo: por rubro cargá la cantidad real (si no coincide con lo cotizado), el tipo de tarea, las personas, las horas y desde cuándo. Si el tipo de tarea tiene horas estándar, sugiere las horas; la fecha de fin la calcula con jornadas de 9 h salteando fines de semana y feriados.",
        tab: "fabricacion",
      },
      {
        titulo: "Gantt y carga del taller",
        que: "Cada rubro planificado se ve como una barra en el tiempo, con la fecha de entrega del trabajo marcada. Arriba, cuántas personas hay asignadas cada día, en rojo si se pasa de la gente que hay.",
        como: "Fabricación → 'Gantt · quién hace qué y cuándo'. Abajo, 'Rubros del Gantt': agregá, renombrá o pausá rubros y cambiá las palabras con las que se buscan en el presupuesto.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-22",
    fecha: "22/10/2026",
    titulo: "Clientes sin duplicar y Organización diaria de fabricación",
    items: [
      {
        titulo: "Fabricación: organización diaria",
        que: "Un calendario del mes: al abrir un día aparece cada empleado con su ficha del día: si está en fábrica o en obra (la obra sale de los trabajos aprobados, con link al mapa y a la ficha del trabajo), los turnos (mañana 07:30-13:30 y tarde 14:00-17:00, con el almuerzo en el medio, editables, con '+ Turno extra' hasta las 21 al 50% y después nocturno; cada turno dice cómo se paga) y las tareas por hora. Cada tarea se tilda como hecha y queda la hora en que se terminó, para tomar tiempos. Avisa si dos tareas se pisan o caen fuera de los turnos. Hay un PDF por empleado y una línea temporal con quién está en cada lugar y cuántos hay juntos.",
        como: "Fabricación → Organización diaria: elegí el día, abrí '+ Armar el día' en cada empleado. 'Copiar el día anterior' repite lo de ayer. Abajo, 'Tipos de tarea y grupos de trabajo': armá el catálogo una vez (con horas estándar y pasos) y después solo elegís.",
        tab: "fabricacion",
      },
      {
        titulo: "Posibles coincidencias al cargar un cliente",
        que: "Al escribir el cliente en un presupuesto, aparece un cuadro amarillo con los clientes que podrían ser el mismo: nombre parecido, mismo teléfono, CUIT, mail o proyecto, con el motivo de cada uno.",
        como: "Presupuestos → Cliente: si aparece '¿Es alguno de estos?', tocá 'Es este' o 'No, es nuevo'.",
        tab: "presupuesto",
      },
      {
        titulo: "CRM: ficha del cliente, datos que faltan y duplicados",
        que: "Cada cliente tiene su ficha (como la del proveedor): datos editables, qué le falta, cuántos presupuestos y trabajos tiene, lo vendido y el saldo a cobrar. El CRM tiene tres vistas: Lista, Faltan datos y Posibles duplicados, con un botón para unificar dos fichas en una.",
        como: "CRM → Clientes: botón 'Ficha · falta N' en cada fila, o las vistas de arriba. Desde la ficha, 'Unificar acá' junta el duplicado.",
        tab: "historial",
      },
      {
        titulo: "El buscador de cliente del presupuesto trae a todos",
        que: "Al cotizar, el campo Cliente busca en el CRM y también en los clientes viejos (presupuestos guardados y trabajos aprobados de antes del CRM). Busca por nombre, contacto, CUIT o teléfono, y muestra su teléfono, mail, cuántos presupuestos tiene, el último (fecha, número y proyecto) y cuántos se aprobaron. Arriba aparecen los cotizados más recientemente. Al elegirlo se completan sus datos.",
        como: "Presupuestos → Cliente: empezá a escribir. Los marcados 'historial' se dan de alta en el CRM al guardar.",
        tab: "presupuesto",
      },
      {
        titulo: "CRM: sumar los clientes del historial",
        que: "El botón para traer los clientes del historial ahora está siempre: suma los que faltan sin tocar los que ya están.",
        como: "CRM → Clientes → 'Sumar los clientes del historial que faltan'.",
        tab: "historial",
      },
    ],
  },
  {
    id: "2026-10-21c",
    fecha: "21/10/2026",
    titulo: "Personal: acuerdo por valor hora",
    items: [
      {
        titulo: "Tercera forma de acuerdo para el temporal",
        que: "Además del sueldo mensual fijo y del acuerdo por día, ahora se puede acordar un VALOR HORA: se paga el valor hora por las horas trabajadas del mes, que salen de la asistencia (las que precarga la fichada). Para cotizar se toma un mes completo de horas.",
        como: "Personal → ficha del empleado temporal → Forma del acuerdo → 'Acuerdo por valor hora' y cargá el valor hora.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-21b",
    fecha: "21/10/2026",
    titulo: "Facturas pagadas con la caja chica",
    items: [
      {
        titulo: "Se ven en la rendición de la caja",
        que: "Si en una factura de Compras elegís que el pago salió de la caja de una persona, ese pago aparece en la ficha de su caja chica como un gasto rendido (con su factura) y cuenta en lo utilizado y en lo que resta. Es el mismo pago: no se suma dos veces en el cash flow.",
        como: "Caja chica y viáticos → ficha del responsable: el pago figura como '… · cargada en Compras'. Click sobre él abre la factura para corregirlo.",
        tab: "cajaChica",
      },
      {
        titulo: "Caja automática y deuda con la persona",
        que: "Si se paga con la caja de alguien que no tiene caja chica en esa empresa, se le crea una sola en $0: lo gastado queda como deuda de la empresa con esa persona. Esa deuda se devuelve de dos formas: con '💸 Pagar la deuda' en la ficha de su caja (fecha, monto y de qué cuenta sale; queda en Movimientos internos como 'Caja chica (persona)'), o asignándole una caja nueva y eligiendo 'Cancelar la deuda con esta caja' (o 'No cancelarla').",
        como: "Caja chica y viáticos → ficha del responsable → bloque 'Deuda por caja chica'.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-10-21",
    fecha: "21/10/2026",
    titulo: "Pagos con fecha anterior a la apertura de la cuenta",
    items: [
      {
        titulo: "El sistema pregunta si tiene que sumar o restar",
        que: "El saldo de cada cuenta es su saldo de apertura más lo cargado DESPUÉS de la fecha de apertura. Si cargás un pago (o una caja chica) con fecha igual o anterior a la apertura de la cuenta elegida, el sistema pregunta: Aceptar = que cuente igual en el saldo; Cancelar = no, ya estaba dentro del saldo de apertura. Lo que elegís queda guardado en el pago.",
        como: "Pasa solo al guardar pagos de facturas, pagos sin factura, haberes, cuotas de deuda y cajas chicas. En la ventana de movimientos, lo que no cuenta aparece en gris.",
      },
    ],
  },
  {
    id: "2026-10-20h",
    fecha: "20/10/2026",
    titulo: "Desendeudamiento: cada deuda con su ficha",
    items: [
      {
        titulo: "Listado de deudas y ficha de cada una",
        que: "La solapa muestra un listado de las deudas (total, pagado, pendiente, próxima cuota y vencidas). Cada una abre su ficha, como la del proveedor: los datos, las cuotas, el armado de cuotas y el historial de pagos. Al agregar una deuda nueva se abre su ficha directo.",
        como: "Desendeudamiento → click en la deuda (o ✎ Abrir ficha).",
        tab: "desendeudamiento",
      },
      {
        titulo: "Asignar el pago a cada cuota a la vista",
        que: "Cada cuota tiene '💸 Asignar pago' (cargar uno nuevo o vincular uno ya cargado) y, si está pagada, '↩' para desvincularlo. Arriba está '💸 Pagar la próxima cuota'. Para vincular aparecen primero los pagos del acreedor y después el resto de los pagos de la empresa.",
        como: "En la ficha de la deuda, en el renglón de la cuota.",
        tab: "desendeudamiento",
      },
    ],
  },
  {
    id: "2026-10-20g",
    fecha: "20/10/2026",
    titulo: "Precarga de cobros y suma estimada",
    items: [
      {
        titulo: "Precargar anticipo y saldo, blanco y negro",
        que: "En Cobranzas de cada trabajo hay botones para precargar el anticipo blanco y el negro según lo acordado (% de anticipo sobre la parte facturada con IVA y sobre la parte en negro), y después el saldo de cada circuito (lo que falta, sin contar lo cobrado ni lo ya programado). Entran como cobro estimado (violeta).",
        como: "Trabajos aprobados → detalle → Cobranzas → '+ Anticipo blanco', '+ Anticipo negro', '+ Saldo blanco', '+ Saldo negro'. Ajustá la fecha y pasalo a Realizado cuando entra la plata.",
        tab: "aprobados",
      },
      {
        titulo: "Suma estimada en violeta en el cash flow",
        que: "Donde un cobro o pago programado impacta (total de la sección, total de ingresos y egresos, neto del día y la plata disponible de esa empresa), el número real queda tachado en violeta y debajo aparece, en violeta, cómo quedaría con lo programado. En la plata disponible el efecto se arrastra desde el día del cobro o pago en adelante: lo blanco en el primer banco, lo negro en el efectivo negro. Es una estimación: el real no cambia.",
        como: "Pasá el mouse por el número violeta para ver cuánto suma o resta lo programado. Lo programado pega en la cuenta elegida: en el cobro ('A qué cuenta entró') y en la factura ('Sale de').",
        tab: "calendarioAnual",
      },
      {
        titulo: "La cuenta se elige siempre a mano",
        que: "Se sacó la opción 'cuenta por defecto' de todas las ventanas: pagos de facturas, pagos sin factura, haberes, cuotas de deuda, cajas chicas, cobros de trabajos, inversiones, retiros y gastos. Hasta que se elige el banco o el efectivo, el campo queda en rojo y la ventana no deja guardar.",
        como: "Elegí '🏦 banco' o '💵 efectivo' en el campo de la cuenta antes de guardar.",
      },
      {
        titulo: "Movimientos del mes detrás de cada número",
        que: "Click derecho sobre cualquier monto del cash flow → '📋 Movimientos del mes hasta este día': cada movimiento del 1 del mes hasta ese día, con el acumulado (en la plata disponible, con el saldo del principio del mes y cómo fue cambiando). Lo mismo tocando un banco o el efectivo en el tablero de Plata disponible de arriba.",
        como: "Desde el listado, 'Abrir' lleva a donde se cargó cada movimiento.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-20f",
    fecha: "20/10/2026",
    titulo: "Editar y borrar a la vista en todo el sistema",
    items: [
      {
        titulo: "✎ y 🗑 en cada renglón",
        que: "Las listas que solo se podían corregir o borrar con click derecho ahora tienen sus botones a la vista: ficha del proveedor, Movimientos internos, Bancos, Desendeudamiento (cuotas), Tarjetas (tarjetas, resúmenes y consumos), Grupos de costo, Marcadores, CRM, Stock, Presupuesto, Personal y Cuentas. El click derecho sigue funcionando igual.",
        como: "✎ corrige (o abre las opciones del renglón), 🗑 borra después de confirmar.",
      },
      {
        titulo: "Lo que antes no se podía",
        que: "Ahora se puede borrar un trabajo aprobado (con sus pagos y facturas; pide escribir BORRAR), una factura emitida y una cuenta sin movimientos (con movimientos se desactiva). Y se pueden corregir los viáticos (fecha, monto, blanco/negro, motivo) y los documentos (tipo, mes, persona). La ventana de un pago tiene '🗑 Borrar pago'.",
        como: "Trabajos aprobados → '🗑 Borrar trabajo' en el detalle o con click derecho. Viáticos: ✎ en Caja chica y viáticos.",
      },
      {
        titulo: "Pagos que no aparecían en la ficha del proveedor",
        que: "Un pago cargado cuando el proveedor no estaba en la lista (o después de vaciarla) quedaba en una cuenta aparte y no se podía borrar. Ahora aparece en la ficha de su proveedor.",
        como: "Abrí la ficha del proveedor: el pago está en 'Pagos sin factura' o en el Historial, con ✎ y 🗑.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-20e",
    fecha: "20/10/2026",
    titulo: "Cada monto con el color de su empresa",
    items: [
      {
        titulo: "Cash flow: sombreado por empresa en todo",
        que: "Además de los pagos, ahora tienen el sombreado de su empresa (azul BGA, mostaza De Raíz) los pagos programados '≈', los totales de cada sección y los de cada grupo de proveedores. Si en un total hay plata de las dos empresas, se ve un renglón por empresa con su color. El estado de un pago programado va en el color de la letra.",
        como: "Pasá el mouse por un total para ver cuánto es de cada empresa.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Pagos programados: el fondo dice la empresa",
        que: "En el almanaque y en la lista de vencidos, el fondo de cada pago es el color de su empresa y la letra dice el estado (rojo vencido, naranja próximo, azul por venir, verde pagado).",
        como: "Calendario anual → Pagos programados: arriba del almanaque está la referencia de colores.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-20d",
    fecha: "20/10/2026",
    titulo: "Grupos plegados como los dejaste",
    items: [
      {
        titulo: "Cada grupo recuerda si lo dejaste abierto o cerrado",
        que: "En todas las solapas los grupos (los recuadros con − / +) arrancan minimizados la primera vez, y después quedan abiertos o cerrados como los dejaste la última vez en esa computadora.",
        como: "Tocá el título del grupo para abrirlo o cerrarlo: la próxima vez aparece igual.",
      },
      {
        titulo: "El cash flow arranca minimizado",
        que: "Al entrar al Calendario anual todas las secciones están plegadas (se ve solo el total de cada una).",
        como: "Abrí la sección que necesites tocando su nombre, o usá el botón de expandir todo.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-20c",
    fecha: "20/10/2026",
    titulo: "Puesta al día: lo vencido antes del 1/10 figura pagado",
    items: [
      {
        titulo: "Pagos programados al día",
        que: "Todo lo que vencía antes del 1/10/2026 y seguía sin pagar figura como pagado ('puesta al día'): no suena, no se reclama y no aparece como '≈' en el cash flow. Lo que vence del 1/10 en adelante sigue igual.",
        como: "Calendario anual → Pagos programados: en la lista de vencidos quedan solo los de octubre en adelante.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-20b",
    fecha: "20/10/2026",
    titulo: "Más pantalla, vencidos a la vista y borrar que no vuelva",
    items: [
      {
        titulo: "El chat, debajo del menú",
        que: "El chat interno y las notificaciones pasaron abajo del menú de la izquierda. Se sacó la columna de la derecha: la pantalla de trabajo queda más ancha.",
        como: "Pasá el mouse por el menú: abajo están 🔔 Notificaciones y 💬 Chats con los contactos.",
      },
      {
        titulo: "Pagos programados: el almanaque grande y solo los vencidos",
        que: "El almanaque ocupa todo el ancho y cada pago muestra su monto. La lista de abajo ahora es solo de lo VENCIDO sin pagar; si no hay nada vencido, no aparece.",
        como: "Calendario anual → Pagos programados.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Lo que se borra queda borrado",
        que: "Si alguien tenía el sistema abierto desde antes (otra máquina o una pestaña vieja), al guardar podía volver a escribir algo que ya se había borrado. Ya no pasa.",
        como: "Si algo que borraste volvió a aparecer, borralo de nuevo: ahora queda borrado.",
      },
      {
        titulo: "Proveedores: botón Quitar",
        que: "Cada proveedor del listado tiene su botón Quitar al lado de ✎ Editar. Sus facturas y pagos quedan cargados.",
        como: "Pago a proveedores → Proveedores → Quitar.",
        tab: "costos",
      },
      {
        titulo: "Click derecho sobre un pago programado",
        que: "En el cash flow, el click derecho sobre un '≈' dice qué pago es y abre su ficha (el proveedor con la factura, o la deuda), para pagarlo o borrarlo.",
        como: "Click derecho sobre el ≈ → 'Abrir la ficha'.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-20",
    fecha: "20/10/2026",
    titulo: "Cash flow solo con lo vinculado, varios pagos por factura y Excel para el estudio",
    items: [
      {
        titulo: "El cash flow muestra solo lo cargado en las solapas",
        que: "Lo cargado a mano en la planilla y lo importado de la planilla vieja (incluida la carga histórica) ya no se ve: queda guardado, pero no figura. Los renglones de la planilla vieja que no alimenta ninguna solapa tampoco aparecen. El banco tampoco suma en ninguna fecha (ni antes del 29/08): el extracto solo corrobora, y cada pago cargado en su solapa suma aunque haya salido por el banco.",
        como: "Si falta algo en el cash flow, se carga en su solapa (Pago a proveedores, Haberes, Caja chica, Movimientos internos...).",
        tab: "calendarioAnual",
      },
      {
        titulo: "Pagos programados en su renglón",
        que: "Se fue el bloque violeta del fondo. Cada pago que viene aparece en el renglón de su proveedor (o en Financieros / Impuestos) con '≈' y el color de su estado: violeta por venir, naranja próximo, rojo vencido. Cuando se carga el pago real, lo reemplaza (✓).",
        como: "Mirá el renglón del proveedor en EGRESOS. No suma al neto hasta que se paga.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Click derecho → Abrir la ficha",
        que: "Desde cualquier número del cash flow se abre la ficha de donde salió: el proveedor, la persona, el trabajo o la solapa.",
        como: "Click derecho sobre el monto → 'Abrir la ficha'.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Miles mientras escribís",
        que: "Todos los campos de números muestran los puntos de miles y millones mientras se escribe (1.250.000,50).",
        como: "Escribí normal: la coma es el decimal (el punto del teclado numérico también).",
      },
      {
        titulo: "Editar proveedores",
        que: "Botón ✎ Editar en cada proveedor del listado y en su ficha: nombre, CUIT, condición de IVA, empresa, contacto, notas. Si corregís el nombre, sus facturas y pagos pasan al nombre nuevo.",
        como: "Pago a proveedores → Proveedores → ✎ Editar.",
        tab: "costos",
      },
      {
        titulo: "Factura con los datos del estudio y varios pagos",
        que: "La factura pide tipo de comprobante, letra, número, neto, alícuota de IVA (21% por defecto, se puede cambiar), exento, otros impuestos e IIBB; el IVA y el total se calculan solos. Y se le pueden cargar varios pagos: muestra lo pagado y lo que falta, y queda pagada al completarse. Cada pago pide empresa, administración (blanco/negro) y medio: efectivo, transferencia, cheque, tarjeta de débito o de crédito.",
        como: "Abrí o agregá una factura → sección 3 '+ Agregar pago' (o 'Vincular un pago ya cargado').",
        tab: "compras",
      },
      {
        titulo: "Excel de facturas para el estudio contable",
        que: "Las facturas de compra del mes o de un rango de fechas, por empresa, en Excel: proveedor, CUIT, fecha, tipo, letra, número, exento, neto, IVA, otros impuestos, IIBB y total. Las notas de crédito van en negativo.",
        como: "Facturas de compra → '⬇ Excel para el estudio' → elegí el mes o el rango y la empresa → Descargar Excel.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-17f",
    fecha: "17/10/2026",
    titulo: "Pasar las cargas viejas de la planilla a su solapa",
    items: [
      {
        titulo: "Cargas hechas a mano en la planilla",
        que: "Listado, por empresa, de lo que se cargó a mano en el cash flow y no vive en su solapa (sueldos, pagos a proveedores, cuotas de planes, aportes...). Dice a qué solapa va cada uno, marca lo futuro y avisa 'posible doble' cuando parece estar ya cargado (por ejemplo, un sueldo que también se pagó desde la ficha de haberes).",
        como: "Balance → 'Cargas hechas a mano en la planilla', debajo del Pre-cierre. Click derecho: ir a la solapa, o borrarlo de la planilla una vez que está cargado allá.",
        tab: "cashflow",
      },
      {
        titulo: "Bancos: todos los renglones y la clasificación sugerida",
        que: "Al asignar un movimiento del banco ahora aparecen los renglones con su nombre, las secciones y renglones propios y la cuenta corriente (movimiento interno). Y vuelve el 🧠: clasifica sola la mecánica bancaria conocida.",
        como: "Bancos y tarjetas → 'Asignar' en el movimiento, o '🧠 Clasificar N sugeridos' arriba de la lista del mes.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-10-17e",
    fecha: "17/10/2026",
    titulo: "El cash flow es solo para ver",
    items: [
      {
        titulo: "La planilla muestra, no se carga",
        que: "El Calendario anual ya no deja cargar, editar, borrar ni mover plata. Todo lo que muestra se carga y se corrige en su solapa: pagos en Pago a proveedores, sueldos en la ficha de pago de haberes, el banco en Bancos y tarjetas, pases en Movimientos internos, etc. Siguen las marcas de color, las notas, las banderitas y renombrar u ocultar renglones.",
        como: "Click derecho sobre un número: te dice en qué solapa se edita. En Haberes, el click sobre la persona abre su ficha de pago.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Pagos programados, solo para ver",
        que: "Se sacó '+ Vencimiento': las fechas salen solas de Desendeudamiento, del cierre de cada tarjeta y del plazo de pago de cada proveedor. Marcar pagado se hace donde se paga.",
        como: "Click derecho sobre un pago → 'Ir a donde se carga'.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Débito del banco ↔ factura de compra, en Bancos y tarjetas",
        que: "Vincular un débito con la factura que cancela (y soltarla) pasó de la planilla a Bancos y tarjetas.",
        como: "Asignar el movimiento como 'Pago' a un proveedor → elegir 'Factura que paga'. Para soltarla: click derecho → 'Soltar la factura'.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-10-17d",
    fecha: "17/10/2026",
    titulo: "Pre-cierre: el punto cero del 1/11",
    items: [
      {
        titulo: "Qué pasa al ejercicio nuevo y qué queda guardado",
        que: "Antes de cerrar el ejercicio, por empresa: lo que sigue vigente (cobros de trabajos con saldo, pagos por hacer —facturas, cuotas, tarjetas, seguros, haberes—, proveedores con saldo, pagos sin factura y cajas chicas abiertas) y cuánto queda guardado porque terminó. Lo vencido aparece en rojo.",
        como: "Balance → 'Pre-cierre', arriba del Cierre de ejercicio. Revisalo y limpiá lo que sea de prueba antes del 31/10: con eso arranca el sistema.",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-10-17c",
    fecha: "17/10/2026",
    titulo: "Regularizar el conteo de blanqueo",
    items: [
      {
        titulo: "Dos formas de regularizar",
        que: "Lo blanqueado se puede dar por regularizado: con una factura emitida (baja el conteo por su total y su IVA queda una sola vez, en el débito) o con una regularización manual (monto, fecha y motivo). Las dos quedan firmadas por quien las carga. Así la posición REAL de IVA muestra cuánto IVA queda desbalanceado de verdad.",
        como: "Factura: Facturación → click derecho sobre la factura emitida → 'Regulariza blanqueo'. Manual: Balance → Posición de IVA → '+ Regularización manual' (click derecho para quitarla).",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-10-17b",
    fecha: "17/10/2026",
    titulo: "Bajas que siguen en el reloj",
    items: [
      {
        titulo: "Aviso para retirar del reloj a quien se dio de baja",
        que: "La sincronización del reloj anota quién está dado de alta en el equipo. Si alguien tiene la baja (en todas sus empresas) y sigue en el reloj, arriba de Personal aparece un aviso para retirarlo del equipo, así no ocupa lugar ni puede fichar. También lo recuerda la ventana de dar de baja.",
        como: "Se retira desde el menú del reloj (gestión de usuarios). El aviso desaparece solo en la próxima sincronización.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-17a",
    fecha: "17/10/2026",
    titulo: "El reloj registra a todos",
    items: [
      {
        titulo: "Fichadas de todo el personal, socios incluidos",
        que: "El reloj ahora carga las fichadas de todas las personas que están en Personal, también los socios y los de fuera de convenio. Si alguien está en las dos empresas, sus fichadas figuran en las dos fichas. La sincronización diaria corre para las dos empresas (antes BGA solo se sincronizaba con el botón).",
        como: "Se ven en la solapa Asistencia y en la planilla de fichajes. A los de fuera de convenio las fichadas les quedan como registro: no les cambian las horas de la liquidación (cobran lo acordado).",
        tab: "asistencia",
      },
    ],
  },
  {
    id: "2026-10-16e",
    fecha: "16/10/2026",
    titulo: "Haberes: ficha de pago por persona",
    items: [
      {
        titulo: "Personal ya no carga solo el cash flow",
        que: "Los sueldos, el negro acordado y los viáticos fijos ya no entran automáticos a Haberes. Lo único que va al cash flow es lo que se paga desde la ficha de pago de haberes de cada persona.",
        como: "Personal → click derecho sobre la persona → '💵 Ficha de pago de haberes'. También desde el Calendario: click sobre el nombre en EGRESOS · Haberes (o sobre un día vacío para cargar un pago ahí).",
        tab: "personal",
      },
      {
        titulo: "La ficha de pago de haberes",
        que: "Por período: lo que corresponde (recibo oficial o liquidación en blanco, acordado en negro, viático fijo), los pagos con su comprobante, cuenta y firmante, y el saldo (le debemos / a favor). Avisa si se pagó en blanco sin el recibo oficial. Lo que falta pagar aparece en Pagos programados, por persona, el 4.º día hábil del mes siguiente.",
        como: "'+ Cargar pago' (período, fecha, circuito, monto, cuenta, comprobante). Click derecho sobre un período: cargar o reemplazar el recibo oficial (PDF), o cargar un pago. El recibo ya no se carga en la liquidación.",
        tab: "personal",
      },
      {
        titulo: "Cada persona en su empresa",
        que: "Si alguien está en las dos empresas, son dos fichas y dos renglones distintos en Haberes: ya no se suman ni se duplican.",
        como: "El renglón y la ficha son de la persona en esa empresa.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-16d",
    fecha: "16/10/2026",
    titulo: "Corregir pagos desde la ficha del proveedor",
    items: [
      {
        titulo: "Editar o quitar un pago",
        que: "Si un pago se cargó mal o de más, se corrige desde la ficha del proveedor: se puede cambiar fecha, monto, empresa, cómo se pagó, la cuenta y el circuito, o quitarlo. Al quitarlo sale del cash flow y de la cuenta; si pagaba una factura, la factura vuelve a quedar impaga. Lo que se edita queda firmado por quien lo editó.",
        como: "Ficha del proveedor → Historial (o Pagos sin factura) → click derecho sobre el pago → 'Editar el pago…' o 'Quitar el pago'. Sobre una compra, 'Abrir la factura' para editarla o borrarla; sobre una nota de crédito, abrirla. Los débitos del banco se corrigen en Bancos y tarjetas.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-16c",
    fecha: "16/10/2026",
    titulo: "Cada movimiento de plata queda firmado por quien lo carga",
    items: [
      {
        titulo: "El firmante es el usuario que opera",
        que: "Todo movimiento de plata (gastos, pagos de facturas, pagos sin factura, cobros, comisiones, caja chica, pases, aportes, cuenta con la gente, retiros, VEP, cuotas, lo cargado desde la planilla) queda firmado SOLO por el usuario que tiene la sesión iniciada. No se elige a otra persona. Al editarlo, firma quien lo editó: queda el último responsable, con fecha y hora.",
        como: "En los formularios se ve 'Responsable / firmante: ✍ tu nombre' (no se cambia). En las planillas, cada fila muestra '✍ nombre'; pasando el mouse se ve cuándo firmó.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Dónde se ve",
        que: "Pago a proveedores (columna del gasto), Trabajos aprobados (cobros y comisiones), Caja chica (pasando el mouse por la caja o el gasto), Movimientos internos, Inversiones, retiros societarios, VEP de IVA y el click derecho sobre un número del Calendario anual.",
        como: "Lo cargado antes de la regla aparece como '✍ sin firmante' en ámbar y queda firmado la próxima vez que alguien lo edite.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-16b",
    fecha: "16/10/2026",
    titulo: "Notas de crédito de proveedores",
    items: [
      {
        titulo: "Bloque de notas de crédito en la ficha del proveedor",
        que: "Cada proveedor tiene sus notas de crédito. No mueven plata: bajan lo que le debemos y el crédito fiscal de IVA. Si se aplican a una factura, esa factura debe solo la diferencia (y sale de Pagos programados si queda en cero). Si la factura ya estaba pagada, el proveedor queda a favor. Las notas de crédito del listado de ARCA entran solas a este bloque.",
        como: "Pago a proveedores → ficha del proveedor → Notas de crédito → '+ Nota de crédito'. Click en una nota para verla, editarla o eliminarla.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-16a",
    fecha: "16/10/2026",
    titulo: "Pagos sin factura y responsable de cada pago",
    items: [
      {
        titulo: "Pago sin factura desde la ficha del proveedor",
        que: "Se puede cargar un pago aunque todavía no esté la factura. Va al cash flow y el proveedor queda A FAVOR hasta que llegue la factura. Mientras tanto avisa: en la ficha, arriba de Pago a proveedores y en la barra de arriba ('⏳ Pagos sin factura').",
        como: "Ficha del proveedor → '+ Pago sin factura'. Para resolverlo, click derecho sobre el pago: cargar la factura (queda vinculada), o si es un gasto en negro cargar su comprobante, o que un responsable asuma la falta de la factura y firme.",
        tab: "costos",
      },
      {
        titulo: "Responsable / firmante obligatorio",
        que: "Todo pago que se carga con una factura o sin factura queda firmado por el usuario que lo carga.",
        como: "Se ve como 'Responsable / firmante' en el pago; no se elige.",
        tab: "costos",
      },
      {
        titulo: "Cuentas abiertas separadas",
        que: "En Pago a proveedores las cuentas corrientes se ven en dos listas: los proveedores con convenio y los demás que tienen algo abierto (deuda, saldo a favor o pagos esperando factura).",
        como: "Click en un proveedor abre su ficha.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-10-15e",
    fecha: "15/10/2026",
    titulo: "Pagos: quién pagó y qué empresa paga",
    items: [
      {
        titulo: "Quién pagó en efectivo negro",
        que: "Al cargar el pago de una factura en efectivo negro se elige quién de la nómina lo hizo (si no salió de una caja chica). En Movimientos internos aparece el conteo de toda la plata que pagó cada persona. Es solo informativo: no suma ni resta.",
        como: "En la factura → Pago → Cómo se pagó: Efectivo, Circuito: Negro → 'Quién pagó'.",
        tab: "compras",
      },
      {
        titulo: "Empresa que paga y pagos cruzados",
        que: "En el pago se elige la empresa que paga (por defecto, la de la factura). Si es otra, queda marcado como pago cruzado: aparece en naranja en la factura, en el listado de Compras ('la pagó …') y en Movimientos internos, en 'Pagos cruzados entre empresas'.",
        como: "En la factura → Pago → 'Empresa que paga'.",
        tab: "movimientosInternos",
      },
    ],
  },
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
