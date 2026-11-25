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
    id: "2026-11-25",
    fecha: "25/11/2026",
    titulo: "Las cajas chicas muestran su empresa",
    items: [
      {
        titulo: "Caja chica de BGA o de De Raíz",
        que: "Cuando una persona tiene una caja chica en cada empresa, las dos se llamaban igual y al elegir de dónde sale un pago no se sabía cuál era. Ahora cada caja dice su empresa al lado del nombre.",
        como: "Al cargar un pago, en «De qué cuenta salió» elegí la caja mirando la empresa: por ejemplo «Caja de Nicolás (negro) · BGA» o «Caja de Nicolás (negro) · De Raíz».",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-11-23b",
    fecha: "23/11/2026",
    titulo: "Los impuestos del banco se cargan en el día",
    items: [
      {
        titulo: "Control de comisiones en la ficha de la cuenta",
        que: "Cada mes de la ficha del extracto suma todo lo que cobró el banco (impuestos, comisiones e intereses) y lo compara con lo cargado: cuánto está cargado y linkeado, cuánto está cargado pero falta linkear y qué cargos faltan cargar. Cada cargo cuenta una sola vez. Cuando todo está cargado y linkeado aparece «coincide con el banco».",
        como: "Bancos y tarjetas → ficha de la cuenta → el mes. En «Control de comisiones» usá «Linkear» para los que ya cargaste y «Cargar y linkear» para los que faltan: se cargan con la fecha, el importe y el concepto del extracto. El tilde del mes queda bloqueado mientras haya cargos ya cargados sin linkear, para que no se descuenten dos veces.",
        tab: "bancos",
      },
      {
        titulo: "Pago sin factura: «Impuestos, tasas e intereses»",
        que: "Los impuestos, comisiones e intereses que cobra el banco ya no esperan al extracto: se cargan el día que se cobran y la cuenta queda al día. No piden factura, el proveedor es el banco de la cuenta y suman a su cuenta corriente. La misma opción sirve en la ficha de cualquier proveedor: por ejemplo, los intereses de un plan de pago de ARCA quedan en ARCA, para saber cuánto se paga de intereses. Los de la cuenta bajan ese mismo día; los de la tarjeta de crédito van aparte y se pagan al vencimiento del resumen, no antes.",
        como: "Pago a proveedores → ficha del proveedor → «Pago sin factura» → opción «Impuestos, tasas e intereses (sin factura)» (desde la ficha de un banco ya viene elegida). Se completa fecha, monto, dónde se cobró (cuenta o tarjeta), el tipo de cargo y una descripción, que es obligatoria para reconocer el gasto después.",
        tab: "costos",
      },
      {
        titulo: "El extracto y el resumen sugieren el cargo ya cargado",
        que: "Al subir un extracto (también uno parcial, a mitad de mes) o un resumen de tarjeta, cada cargo del banco que ya estaba cargado a mano aparece como «Sugerido». Al aceptarlo queda linkeado y no se suma otra vez a «Comisiones, tasas e intereses». Lo que no se había cargado sigue yendo ahí solo, como antes.",
        como: "Bancos y Tarjetas → ficha de la cuenta o del resumen → aceptar la sugerencia en cada renglón. En la tarjeta, mandar el renglón «a comisiones» descarta la sugerencia.",
        tab: "bancos",
      },
      {
        titulo: "Pago sin factura: «Conciliación a fin de mes»",
        que: "Para lo que no lleva factura y se corrobora con el extracto o el resumen: un débito automático, el pago de la tarjeta. Baja la cuenta el día que se carga, no figura como falta de factura, y queda avisando en el resumen del día que espera el extracto o el resumen hasta que se linkee.",
        como: "Ficha del proveedor → «Pago sin factura» → «Conciliación a fin de mes». La descripción es obligatoria. Al subir el extracto, el movimiento lo sugiere y al aceptarlo queda conciliado.",
        tab: "costos",
      },
      {
        titulo: "Pago sin factura: «Constatación contra VEP»",
        que: "Para un pago a ARCA del que todavía no está cargado el VEP (por ejemplo, un débito automático que no se sabe a qué corresponde). Baja la cuenta al cargarlo y queda avisando «falta cargar el VEP» en la ficha de ARCA y en el resumen del día.",
        como: "Ficha de ARCA → «Pago sin factura» → «Constatación contra VEP». Cuando tengas el VEP, cargalo en Compras y elegí «Vincular un pago ya cargado»: ahí deja de avisar.",
        tab: "costos",
      },
      {
        titulo: "Factura con información faltante",
        que: "Un gasto con factura se puede cargar aunque la factura todavía no esté en mano (se extravió, la mandan por mail). Alcanza con proveedor, fecha y total. Queda marcada con «⚠ falta información» en Compras y avisa en el resumen del día hasta que se complete.",
        como: "En la ficha de la factura, debajo de Notas, tildá «Falta información de esta factura» y escribí qué falta. Cuando llegue, abrí la factura, completá los datos y destildalo.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-23a",
    fecha: "23/11/2026",
    titulo: "El stock muestra quién vende más barato",
    items: [
      {
        titulo: "Columnas «Más barato» y «Proveedor más barato» en Stock",
        que: "Cada artículo puede llevar anotado el precio más bajo que se vio en el mercado (sin IVA) y quién lo vende. Es solo una referencia para saber dónde conviene comprar: se sigue cotizando con el precio unitario de siempre. En verde, los artículos donde hay un proveedor más barato que el precio cargado.",
        como: "La planilla de costos trae dos columnas nuevas, «Más barato (sin IVA)» y «Proveedor más barato». En Stock → «Leer planilla y actualizar precios» aparece un aviso amarillo con el botón «Anotar las referencias»: eso las copia al stock sin tocar ningún precio. También se corrigen a mano desde la ficha del artículo.",
        tab: "stock",
      },
    ],
  },
  {
    id: "2026-11-22a",
    fecha: "22/11/2026",
    titulo: "Las cantidades del stock se corrigen también desde la planilla",
    items: [
      {
        titulo: "Botón «Sincronizar cantidades con la planilla» en Stock",
        que: "La cantidad de cada artículo se puede corregir en el sistema o en la planilla de Excel. El botón compara las dos y muestra lo que se corrigió en la planilla; lo que se acepta entra al stock y queda anotado como movimiento del artículo. A la vez el sistema escribe en la planilla la ubicación, la cantidad y los artículos que le falten. No toca precios, descripciones ni unidades.",
        como: "Stock → Inventario y alertas → «Sincronizar cantidades con la planilla». En cada renglón se elige «Vale la planilla», «Vale el sistema» o «Después»; nada cambia hasta apretar Sincronizar. En el Excel se corrige la columna «Cantidad»; la columna «Cantidad sistema» la escribe el sistema y no se toca a mano. La planilla tiene que estar cerrada en Excel al sincronizar.",
        tab: "stock",
      },
    ],
  },
  {
    id: "2026-11-21h",
    fecha: "21/11/2026",
    titulo: "El stock lee los precios de la planilla de costos",
    items: [
      {
        titulo: "Botón «Leer planilla y actualizar precios» en Stock",
        que: "El stock queda vinculado con la planilla de costos de Excel. El botón la lee y muestra, artículo por artículo, qué precio sube, cuál baja y cuáles quedan igual, cruzando por código. Solo toca precios: no da de alta artículos, no borra y no cambia cantidades.",
        como: "Stock → Inventario y alertas → «Leer planilla y actualizar precios». La primera vez se elige la planilla y queda vinculada: las siguientes se lee sola (en Chrome o Edge). Leer no cambia nada: se actualiza lo que quede tildado. Las subas vienen tildadas; las bajas no, porque un precio no debería bajar. Si la planilla cambió desde la última lectura, el botón lo avisa en amarillo.",
        tab: "stock",
      },
    ],
  },
  {
    id: "2026-11-21g",
    fecha: "21/11/2026",
    titulo: "Validación también en Marcadores, Stock y Tarjetas",
    items: [
      {
        titulo: "Las fichas de marcadores, artículos de stock y tarjetas avisan lo que les falta",
        que: "Igual que las de retiros, inversiones y seguros: marcan en rojo lo que falta o está mal. En Stock piden código, descripción y unidad, y el código repetido en otro artículo ahora figura como un dato a corregir (el material del presupuesto cruza por código). En Tarjetas piden nombre, banco y últimos dígitos. En Marcadores, el concepto y el monto o la cantidad de cada uno.",
        como: "Se puede cerrar igual: el botón dice cuántos datos faltan y la ficha queda marcada hasta completarla.",
        tab: "stock",
      },
    ],
  },
  {
    id: "2026-11-21f",
    fecha: "21/11/2026",
    titulo: "Las fichas avisan lo que les falta",
    items: [
      {
        titulo: "Validación en las fichas de retiros, inversiones, seguros, movimientos internos y facturas emitidas",
        que: "Estas fichas guardan cada cambio al momento, así que no tienen un botón Guardar que se pueda frenar. Ahora marcan en rojo, con el motivo, lo que falta o está mal: la fecha, el monto, el socio o la persona, un monto negativo, una fecha imposible, un CUIT incompleto, un día de débito fuera de 1 a 31. Arriba de la ficha queda la lista de lo que hay que completar.",
        como: "Si falta algo, el botón para salir dice «Cerrar igual (faltan N datos)». Se puede cerrar igual: lo cargado ya quedó guardado, pero la ficha queda marcada hasta completarla.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-21e",
    fecha: "21/11/2026",
    titulo: "Validación al cargar, historial de cambios y resumen del día",
    items: [
      {
        titulo: "Resumen del día en una ventana",
        que: "Al entrar aparece, una vez por día, una ventana arriba a la derecha con lo que hay para mirar hoy: cobros para confirmar, pagos que vencen, cuentas sin extracto, resúmenes de tarjeta sin conciliar y datos por corregir. No tapa la pantalla.",
        como: "Cada renglón tiene un botón que lleva a la solapa donde se resuelve. «Seguir trabajando» la cierra hasta mañana; queda el botón «Hoy» para volver a abrirla.",
        tab: "aprobados",
      },
      {
        titulo: "La ficha de compras no deja guardar un comprobante repetido ni una fecha imposible",
        que: "Si el mismo proveedor ya tiene cargado ese número de comprobante, la ficha lo dice (con la fecha y el monto del que ya está) y no deja guardar. Tampoco con una fecha mal tipeada. Además, todos los campos de fecha del sistema dejaron de aceptar años de más de cuatro cifras.",
        como: "Abajo de la ficha dice qué falta o qué hay que corregir. Los comprobantes que ya estaban repetidos aparecen en el resumen del día.",
        tab: "compras",
      },
      {
        titulo: "Historial de cambios",
        que: "El sistema anota quién cargó, cambió o borró cada dato, qué tenía antes y qué tiene ahora: pagos, facturas, cobros de los trabajos, proveedores, cajas, deudas, tarjetas. Empieza a guardarse hoy; lo anterior no está.",
        como: "Acceso → Datos y guardado → «Historial de cambios» (solo administradores). Se puede buscar por cliente, proveedor o persona.",
        tab: "acceso",
      },
    ],
  },
  {
    id: "2026-11-21d",
    fecha: "21/11/2026",
    titulo: "Los cobros programados avisan y piden confirmación",
    items: [
      {
        titulo: "Aviso de cobros programados en el encabezado",
        que: "Un cobro cargado como estimado o inamovible en un trabajo ahora avisa arriba, en todas las solapas: cinco días antes («entra en 3 días»), el día que entra y después («debía entrar hace 15 días»). Nunca pasa a cobrado solo: mientras no lo confirmes no suma en el trabajo ni en ninguna cuenta. Cuando hay cobros que ya tendrían que haber entrado aparece además una ventana abajo a la derecha, que no tapa la pantalla: podés seguir trabajando con ella abierta o cerrarla con «Seguir trabajando».",
        como: "Tocá el cobro en el aviso o «Resolver» en la ventana. «Se cobró»: poné la fecha en que entró y a qué cuenta, y recién ahí queda como realizado. «Todavía no entró»: poné la nueva fecha prevista.",
        tab: "aprobados",
      },
      {
        titulo: "Un cobro con fecha futura es estimado",
        que: "Hasta que la plata no entra, no cuenta: vale también para un cheque, un echeq o una transferencia programada. Si a un cobro le ponés una fecha futura pasa solo a estimado, y no se puede marcar como realizado un cobro cuya fecha todavía no llegó.",
        como: "Cuando la plata entra, confirmalo a mano desde el aviso, con la fecha real y la cuenta.",
        tab: "aprobados",
      },
      {
        titulo: "Cobros con la fecha mal",
        que: "El mismo aviso lista los cobros que figuran como realizados con la fecha vacía, mal tipeada (un año como 0026 o 22026) o futura. Un cobro con la fecha rota ya no mueve ninguna cuenta: antes uno con el año de cinco cifras le sumaba plata al banco y al borrarlo se la sacaba. El campo de fecha de los cobros ya no deja escribir un año de más de cuatro cifras.",
        como: "Tocá el cobro para abrir su trabajo y corregirle la fecha. Si figura cobrado con fecha futura y la plata todavía no entró, pasalo a estimado.",
        tab: "aprobados",
      },
    ],
  },
  {
    id: "2026-11-21c",
    fecha: "21/11/2026",
    titulo: "IVA y Sindicato en Pago a proveedores, y el resumen de tarjeta pagado baja la cuenta",
    items: [
      {
        titulo: "Sección IVA: mes a mes, en Pago a proveedores",
        que: "El IVA se mudó de Balance a una sección propia de Pago a proveedores. El bloque es solo una tabla de números por empresa: IVA ventas, IVA compras, lo que el sistema dice que hay que pagar, el VEP cargado, lo pagado, lo que fue a un plan y la diferencia. Lo que vale es el VEP cargado: lo que calcula el sistema es informativo y la diferencia se muestra sin alarma. Arriba, «Por pagar sin VEP»: lo calculado de los meses que todavía no tienen VEP; al cargarlo, ese mes sale del contador.",
        como: "Tocá un mes para abrir su ficha: de qué facturas sale cada número, el VEP real y cómo se resolvió. «+ Cargar VEP» abre la factura de ARCA de siempre, con el período ya puesto.",
        tab: "costos",
      },
      {
        titulo: "Pagado o plan de pago, con sus intereses",
        que: "Cada mes dice si el VEP se pagó o si se sacó un plan. El plan es la deuda de Desendeudamiento que incluye ese VEP, cargada tal como la armaron: lo que diga el plan es lo que vale. La ficha del mes muestra el total del plan, cuántas cuotas van y cuánto falta. Arriba se ve la costumbre: cuántos meses al contado y cuántos en plan.",
        como: "Para sacar un plan: Desendeudamiento → nueva deuda con ARCA → cargá las cuotas y elegí el VEP para que quede unido a su mes.",
        tab: "costos",
      },
      {
        titulo: "Sección Sindicato",
        que: "Igual que el IVA: el sistema calcula el aporte de cada mes como un porcentaje sobre el neto en blanco de los trabajadores, y lo muestra al lado de la boleta cargada (el comprobante del sindicato en Compras). Lo que vale es el pago cargado; el cálculo es informativo. El porcentaje se edita arriba de la sección.",
        como: "Cargá el porcentaje. En la factura del sindicato aparece ahora «período que paga» (vacío = el mes anterior a la fecha).",
        tab: "costos",
      },
      {
        titulo: "Lector de PDF para el VEP y el pago del sindicato",
        que: "En la ficha de cada mes (IVA y Sindicato) hay un lector de PDF. Si el mes no tiene nada cargado, lee el comprobante y abre la ficha con el importe, el período, la fecha y el pago ya armados, para revisar. Si el mes ya tiene el pago cargado, compara el PDF contra lo cargado y dice si coincide, sin cambiar nada. Lee el VEP, la transferencia y el ECHEQ del banco, y la planilla de la cuota sindical (de ahí también saca el porcentaje que cobra el sindicato).",
        como: "Ficha del mes → «Leer el PDF del pago» o «Controlar con el PDF». Lo que corrijas a mano en la ficha es lo que vale. La boleta de USIMRA no trae texto legible: el sistema intenta leerla como imagen y, si no puede, te pide el importe a mano.",
        tab: "costos",
      },
      {
        titulo: "Resumen de tarjeta pagado: sale el total de la cuenta",
        que: "Al marcar un resumen como pagado, su total se descuenta de la cuenta del banco de la tarjeta el día del vencimiento. El linkeo con las facturas pasa a ser solo control: lo linkeado sigue en el renglón de cada proveedor del cash flow y lo que quedó sin linkear va a Financieros como «sin linkear del resumen», para descargarlo después. Vale para los resúmenes que cierran desde el 1/11/2026; los anteriores quedan como estaban.",
        como: "La ficha del resumen dice cuánto sale, de eso cuánto está linkeado y cuánto queda sin linkear. Solo pesos: el total en dólares no se imputa.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-21b",
    fecha: "21/11/2026",
    titulo: "Dos avisos para que el cash flow diga la verdad",
    items: [
      {
        titulo: "Cuentas del banco sin extracto de control",
        que: "El saldo de cada banco sale de lo que se carga en el sistema, y el extracto lo corrobora. Si una cuenta tiene movimientos cargados y pasaron más de 35 días sin subirle un extracto, ahora lo avisa: en el tablero de plata disponible, debajo del saldo del banco, y arriba de todo en Bancos y tarjetas, con desde cuándo está sin control y cuántos movimientos faltan corroborar.",
        como: "Bancos y tarjetas → «Importar el extracto del banco». Al subirlo el aviso se va solo.",
        tab: "bancos",
      },
      {
        titulo: "Pagos sin grupo de costo",
        que: "Un pago que no tiene grupo de costo (ni en el pago, ni en su factura, ni en el proveedor) cae en el renglón «Sin grupo» del cash flow: la plata está, pero no dice en qué se gastó. Compras ahora los lista arriba, con el total.",
        como: "Tocá el pago para abrirlo y ponerle el grupo. Si le cargás el grupo de costo al proveedor en su ficha, se arreglan todos sus pagos juntos.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-21a",
    fecha: "21/11/2026",
    titulo: "El resumen de tarjeta avisa si falta conciliarlo antes de pagarlo",
    items: [
      {
        titulo: "El aviso del encabezado dice cuántos renglones faltan linkear",
        que: "Cinco días antes del vencimiento de un resumen de tarjeta, el aviso amarillo de arriba ya decía que había que pagarlo. Ahora además dice cuántos renglones del resumen siguen sin linkear con un pago cargado, para conciliarlo ANTES de pagarlo. Vale para los resúmenes desde el 1/11/2026; cuando está todo linkeado, el aviso vuelve a hablar solo del pago.",
        como: "Tocá la etiqueta roja «N renglones sin linkear · conciliar» y se abre la ficha de ese resumen. El mismo dato figura en Pagos programados, debajo del nombre de la tarjeta.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-19a",
    fecha: "19/11/2026",
    titulo: "Las tarjetas y sus impuestos, adentro de las fichas",
    items: [
      {
        titulo: "Los datos de la tarjeta se editan en su ficha",
        que: "El bloque «Tarjetas» de la solapa dejó de verse. Empresa, nombre, banco, últimos dígitos, n.º de cuenta, responsable, números anteriores, activa y notas están ahora en la ficha de la tarjeta, en «Datos de la tarjeta». Había DOS fichas para una tarjeta (una con los datos y otra con los resúmenes); ahora es una sola.",
        como: "Bancos y tarjetas → Abrir ficha. El bloque de datos está plegado arriba; si la tarjeta está de baja, el título lo dice.",
        tab: "bancos",
      },
      {
        titulo: "Las tarjetas físicas se editan enteras, y se dan de baja",
        que: "En «Tarjetas físicas y responsables» ahora se corrigen también el número y el nombre de cada plástico, se lo marca activo o inactivo y se lo quita. Antes solo se podía tocar el responsable y los números anteriores.",
        como: "La misma ficha. «Quitar la tarjeta», arriba al lado de Cerrar, borra la tarjeta entera con sus resúmenes.",
        tab: "bancos",
      },
      {
        titulo: "Los impuestos y comisiones se tildan en la ficha donde salieron",
        que: "El bloque «Impuestos y comisiones del extracto y la tarjeta» era una lista de todos los meses de todos los bancos. Ahora cada ficha muestra EL SUYO: la de la cuenta, el del mes que estás mirando; la de la tarjeta, el del resumen. Con el detalle de cada débito, de qué cuenta sale y el tilde de pagado.",
        como: "Tildarlo asienta el pago desde la cuenta de ese banco y baja su saldo, igual que antes. Si falta la cuenta del banco, el tilde no se puede usar y te lo dice.",
        tab: "bancos",
      },
      {
        titulo: "Las tarjetas sin resumen también se ven",
        que: "La lista de tarjetas del bloque «Bancos y tarjetas» muestra todas, aunque no tengan ningún resumen cargado. Antes solo aparecían las que ya tenían uno.",
        como: "Hacía falta: ahora es la única puerta a la ficha, así que una tarjeta nueva tiene que poder abrirse para cargarle el primer resumen.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-18d",
    fecha: "18/11/2026",
    titulo: "El ejercicio anterior ya no se ve: queda guardado en su ejercicio",
    items: [
      {
        titulo: "La barra del ejercicio está en todas las solapas",
        que: "Los botones con las fechas de cada ejercicio (que estaban solo en el Calendario anual y en el Balance) ahora están arriba de TODAS las solapas de administración. El que está en curso viene en verde; el anterior, al lado.",
        como: "Arrancás siempre en el ejercicio en curso (1/11/2026 – 31/10/2027). Si elegís otro, un cartel rojo te lo avisa: «Estás viendo otro ejercicio».",
        tab: "bancos",
      },
      {
        titulo: "Los listados muestran solo el ejercicio elegido",
        que: "Pago a proveedores, Compras, Bancos y tarjetas, Facturación, Seguros, Inversiones, Movimientos internos, Caja chica y los trabajos terminados: todos cortan por el ejercicio que elegiste. El ejercicio 2025/26 tuvo mucha prueba y no es real, así que deja de estorbar.",
        como: "Para ver algo viejo, elegí ese ejercicio en la barra. Es la única puerta: desde el ejercicio en curso no se ve.",
        tab: "costos",
      },
      {
        titulo: "Nada se borró, y los números no cambiaron",
        que: "Es un filtro de VISTA. Los saldos, la cuenta corriente, la deuda y la cadena de saldos se siguen calculando con todo lo cargado, igual que antes: si no, esconder algo habría movido los números.",
        como: "Al pie del listado dice cuántas filas quedaron afuera y de qué lado: «No se muestran 12 de antes del 01/11/2026. Nada se borró».",
        tab: "bancos",
      },
      {
        titulo: "Una fila sin fecha NO se esconde",
        que: "Si una fila no tiene fecha (o la tiene mal escrita), no se puede probar que sea vieja, así que se sigue viendo. Esconderla sería perderla sin aviso.",
        como: "Si te aparece algo que no esperabas, miralo: probablemente le falte la fecha.",
        tab: "compras",
      },
      {
        titulo: "Las deudas con convenio se siguen viendo siempre",
        que: "Un plan de pago no es un registro con fecha: es un saldo abierto. Si sus cuotas arrancaron el ejercicio pasado y siguen, la deuda se ve igual, porque todavía se debe.",
        como: "Desendeudamiento. Lo mismo vale para cualquier cosa que siga abierta y cargada sin fecha.",
        tab: "desendeudamiento",
      },
    ],
  },
  {
    id: "2026-11-18c",
    fecha: "18/11/2026",
    titulo: "Bancos y tarjetas: las fichas reemplazan a los bloques viejos",
    items: [
      {
        titulo: "Una ficha nueva junta las cuentas y los costos",
        que: "Arriba de la solapa está «Cuentas y costos de bancos y tarjetas», con los tres bloques adentro, cada uno plegable: las cuentas (de dónde sale y a dónde entra la plata), el costo real de bancos y tarjetas por empresa, y los costos de tarjeta para cotización (fijo/variable). Ya no andan sueltos por la solapa.",
        como: "Bancos y tarjetas. El movimiento de cada cuenta y el detalle de cada resumen están en la ficha de cada una, más abajo.",
        tab: "bancos",
      },
      {
        titulo: "El renglón del Calendario y el blanco/negro se eligen en la ficha",
        que: "Eran los dos únicos datos que solo vivían en «Movimientos bancarios». Ahora la ficha de la cuenta tiene una columna «Dónde va» que muestra el renglón del Calendario anual y la B/N, y se eligen con el click derecho del movimiento, como todo lo demás.",
        como: "Click derecho en el movimiento → «Renglón del Calendario anual…» (buscador) o «Circuito blanco / negro». Elegir dos veces el mismo circuito lo saca.",
        tab: "bancos",
      },
      {
        titulo: "Y también la nota, el adjunto, agregar y borrar el movimiento",
        que: "Del mismo bloque se mudaron la nota, el comprobante adjunto (📎), «Agregar movimiento» a mano, «Limpiar la asignación» y «Borrar el movimiento». El botón «Clasificar N sugeridos» también está, por mes.",
        como: "El 📎 y la nota se ven en la columna «Dónde va»; el resto sale del click derecho. «Agregar movimiento» está arriba, al lado de Cerrar.",
        tab: "bancos",
      },
      {
        titulo: "Los resúmenes se cargan y se quitan en la ficha de la tarjeta",
        que: "La ficha ya corregía el cierre, el vencimiento, los totales, el pago mínimo y el pagado; le faltaban «Agregar resumen» y «Quitar este resumen», que estaban en el bloque de la solapa.",
        como: "Bancos y tarjetas → la ficha de la tarjeta. Los dos botones están arriba, al lado de Cerrar.",
        tab: "bancos",
      },
      {
        titulo: "Cuatro bloques dejaron de verse",
        que: "«Movimientos bancarios · el banco real», «Resúmenes cargados · verificación», «Resúmenes · cierres y vencimientos», «Consumos · planilla por cierre» y «Resúmenes de tarjeta · verificación»: todo eso lo tienen las fichas. La cadena de saldos la verifica la ficha de la cuenta mes por mes, y «falta itemizar» lo dice la ficha de la tarjeta en cada resumen.",
        como: "No se borró ningún dato: los movimientos, los resúmenes y los consumos son los mismos, solo se ven desde la ficha.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-18a",
    fecha: "18/11/2026",
    titulo: "El resumen de tarjeta ahora encuentra los pagos cargados con otro medio",
    items: [
      {
        titulo: "Por qué casi nada se linkeaba",
        que: "La sugerencia solo miraba los pagos cargados CON la tarjeta (medio «tarjeta de crédito» y la tarjeta elegida). Como los gastos se venían cargando como transferencia o efectivo, el resumen no encontraba con qué cruzarse: había 386 renglones cargados y uno solo linkeado.",
        como: "Bancos y tarjetas → la ficha del resumen. Los renglones sugeridos siguen en amarillo.",
        tab: "bancos",
      },
      {
        titulo: "Ahora sugiere también esos, y te avisa qué cambia",
        que: "Si no hay ningún pago con la tarjeta puesta, busca uno cargado con otro medio: misma empresa, mismo monto (tolerancia de un peso) y fecha a 10 días o menos. El renglón lo dice: «está cargado como transferencia · al aceptar se pasa a la tarjeta».",
        como: "Al aceptarlo, el pago PASA a la tarjeta: deja de bajar la cuenta el día de la compra y baja el día del vencimiento del resumen. El sistema te lo pregunta antes.",
        tab: "bancos",
      },
      {
        titulo: "Lo que no se sugiere, a propósito",
        que: "El pago ya conciliado contra un movimiento del banco (esa plata sí salió del banco), los renglones en dólares, y las cuotas: si el resumen dice «02/06», el renglón es una cuota y el pago está por el total, así que no se puede comparar sin inventar.",
        como: "Esos se siguen linkeando a mano con «Linkear con un pago con esta tarjeta…».",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-17c",
    fecha: "17/11/2026",
    titulo: "El pago del IVA se sigue por Compras",
    items: [
      {
        titulo: "La factura de ARCA dice qué período de IVA paga",
        que: "Decidido: el IVA se paga como una factura de ARCA en Compras, no cargando un VEP aparte. Para que el tablero lo reconozca, la factura de ARCA ahora tiene un campo «¿Es el pago del IVA? Período que paga» (ej. 2026-08). Con eso la Posición de IVA la cuenta como el pago de ese mes y el control cierra.",
        como: "Compras → abrir la factura de ARCA → el campo aparece solo cuando el proveedor es ARCA o AFIP. Si la factura todavía no está pagada, no se cuenta: es deuda con ARCA hasta que se pague.",
        tab: "compras",
      },
      {
        titulo: "Avisa las facturas de ARCA sin período",
        que: "Arriba de Facturas de compra, un aviso con las facturas de ARCA que no dicen qué período pagan: son las que el tablero no puede contar. Un click abre cada una.",
        como: "Si una factura de ARCA no es IVA (una multa, un plan de pago), dejá el período vacío y listo.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-17b",
    fecha: "17/11/2026",
    titulo: "Las facturas sin fecha de pago ya no se esconden",
    items: [
      {
        titulo: "El mes de IVA sin compras cargadas lo avisa",
        que: "En la Posición de IVA, el mes que tiene IVA de ventas y NADA de crédito queda marcado: «sin compras cargadas». No es que no hubo compras, es que faltan cargarlas, así que lo que dice «a pagar» está de más. Las facturas de compra se empezaron a cargar en serio en septiembre.",
        como: "Balance → Posición de IVA → el renglón del mes queda en ámbar. En agosto de De Raíz el sistema diría $9.255.138 y el aviso del contador dice $6.940.676: la diferencia es crédito de compras que falta.",
        tab: "cashflow",
      },
      {
        titulo: "Aviso arriba de Compras con el total",
        que: "Una factura impaga sin fecha de pago NO entra al Calendario: es plata que hay que pagar y no se ve venir. Antes cada fila decía «sin fecha» pero nada las sumaba. Ahora arriba de Facturas de compra hay un aviso con el total, las cinco más grandes y un click para abrir cada una.",
        como: "Compras → Facturas de compra. Cuenta las de CUALQUIER mes, no solo el que estás mirando. Se arregla cargándole la condición de pago al proveedor (Pago a proveedores → Revisar el padrón) o eligiéndole la fecha a la factura.",
        tab: "compras",
      },
      {
        titulo: "Así apareció el IVA de agosto de De Raíz",
        que: "$6.940.676 cargados como una nota de débito de «ARCA» con vencimiento al 25/11 y sin condición de pago: no estaban en el Calendario ni en ningún total. Es el segundo monto más grande del padrón.",
        como: "Si el pago del IVA se registra como una factura de ARCA, conviene elegirle la fecha a mano; el camino propio del IVA es la Posición de IVA con su VEP.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-17a",
    fecha: "17/11/2026",
    titulo: "La condición de pago la sugiere el historial",
    items: [
      {
        titulo: "«Le venís pagando a 45 días» · Usar",
        que: "A los proveedores que no tienen condición de pago (y por eso dejan sus facturas sin fecha, afuera del Calendario) el sistema ahora les calcula el plazo mirando los pagos que YA le hiciste: los días entre cada factura y su pago. Lo muestra con cuántos pagos lo sacó y un botón para cargarlo.",
        como: "Pago a proveedores → Revisar el padrón → el primer bloque. El botón pide confirmación y después se puede cambiar en la ficha. Si no hay pagos anteriores, lo dice en vez de inventar un plazo.",
        tab: "costos",
      },
      {
        titulo: "Los cheques a fecha no ensucian la cuenta",
        que: "Los pagos a más de 180 días de la factura no entran en el promedio: no son el plazo del proveedor, son cheques a fecha o un plan de pago (Dac tiene cheques al 22/01, 22/02, 22/03 y 22/04 de 2027). Pasando el mouse por la sugerencia se ven los días de cada pago y cuántos quedaron afuera: si alguno es una fecha mal cargada, ahí se ve.",
        como: "Pasá el mouse por «le venís pagando a X días».",
        tab: "costos",
      },
      {
        titulo: "Duplicados con un nombre adentro del otro",
        que: "El detector de duplicados ahora también agrupa cuando un nombre está contenido en el otro: así aparecieron los dos Magliola («HERRAJES MAGLIOLA S A» y «Cima de herrajes magliola»), los dos Expocolor y los dos Estacionamiento.",
        como: "Pago a proveedores → Revisar el padrón → Posibles duplicados.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-11-16e",
    fecha: "16/11/2026",
    titulo: "Revisar el padrón de proveedores",
    items: [
      {
        titulo: "El sistema encuentra lo que hay que limpiar",
        que: "Arriba de Pago a proveedores hay un bloque nuevo: lo que conviene revisar del padrón. Lo primero, la plata: los proveedores SIN CONDICIÓN DE PAGO que tienen deuda, porque sus facturas impagas no toman fecha y no entran al Calendario (hoy son unos $5,9M). Después los duplicados, los que tienen el CUIT mal y los que no tienen nada cargado.",
        como: "Pago a proveedores → Revisar el padrón. Cada renglón tiene «Ficha» (para cargarle la condición de pago), «✎ Editar» y, solo si no tiene NADA cargado, «Quitar». El bloque desaparece cuando no queda nada para revisar.",
        tab: "costos",
      },
      {
        titulo: "Duplicados, incluso con el CUIT tipeado mal",
        que: "Agrupa por el mismo nombre (sin acentos ni S.R.L.), por el mismo CUIT, y por el mismo CUIT con otro dígito verificador: así apareció la estación de servicio cargada dos veces. De cada grupo te dice cuál tiene facturas y cuál está vacío, para que borres el vacío.",
        como: "Nada se borra solo: el Quitar aparece únicamente en el que no tiene ni una factura ni un pago.",
        tab: "costos",
      },
      {
        titulo: "El mismo monto el mismo día, de dos proveedores",
        que: "Avisa cuando dos proveedores distintos facturan el mismo importe el mismo día a la misma empresa. Suele ser un honorario cargado dos veces con otro nombre; así encontramos $2,2M de los dos estudios contables.",
        como: "Pago a proveedores → Revisar el padrón → «El mismo monto el mismo día». Si son dos cosas distintas, no hay que hacer nada.",
        tab: "costos",
      },
    ],
  },
  {
    id: "2026-11-16d",
    fecha: "16/11/2026",
    titulo: "Tipos de mueble: la fila se abre con un click",
    items: [
      {
        titulo: "El listado solo muestra y la ficha corrige",
        que: "Era el último campo que quedaba editable en una fila: el nombre del tipo. Ahora la fila muestra el nombre, la descripción, los pasos, las medidas y las horas, y un CLICK abre la ficha, que es donde se corrige todo (nombre, medidas habituales, cuadrilla, tareas, materiales y receta).",
        como: "Fabricación → Tipos de mueble → click en la fila. El click derecho sigue para duplicar, pausar o borrar, y el punto verde pausa o activa sin abrir la ficha.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-11-16c",
    fecha: "16/11/2026",
    titulo: "Stock: el código repetido ya no pasa desapercibido",
    items: [
      {
        titulo: "La fila avisa el código repetido",
        que: "El material del presupuesto encuentra el artículo POR CÓDIGO, así que dos artículos con el mismo código hacen que el presupuesto mire el equivocado. Ya había uno: ALU-001 estaba en «Zócalo fleje Aluminio 100mm» y en «perfilería aluminio portaled». Ahora la fila lo marca en rojo y dice con cuál se repite.",
        como: "Stock → la columna del código. Pasando el mouse te dice el otro artículo. Corregí uno de los dos y el aviso se va.",
        tab: "stock",
      },
      {
        titulo: "El código nuevo ya no se repite",
        que: "El próximo número se contaba por GRUPO, y dos grupos que comparten prefijo arrancaban los dos en 001. Ahora se cuenta por prefijo y sobre todos los artículos. Además las provisiones de personal armaban el código con la cantidad de artículos, así que al borrar y volver a cargar repetían el número.",
        como: "No hay que hacer nada: el alta ya lo calcula bien, desde cualquier lugar (la solapa, un material del presupuesto, un remito, una máquina o una entrega a un empleado).",
        tab: "stock",
      },
      {
        titulo: "La fila dice si al artículo le falta un dato",
        que: "Si no tiene descripción, código, grupo o unidad, la fila lo avisa: sin eso el artículo no se puede cruzar con el material de un presupuesto ni con un remito.",
        como: "Stock → el aviso aparece debajo de la descripción. Se corrige en la ficha del artículo (click en 📋).",
        tab: "stock",
      },
    ],
  },
  {
    id: "2026-11-16b",
    fecha: "16/11/2026",
    titulo: "Marcadores: las filas no se tipean más",
    items: [
      {
        titulo: "Los cuatro bloques se corrigen en la ficha",
        que: "Costos fijos, insumos y fletes, mano de obra y provisiones de personal tenían hasta 14 campos editables por fila. Ahora la fila muestra el dato con etiquetas (grupo, tipo de trabajo, empresa) y un click abre la ficha del marcador, que es donde se corrige todo.",
        como: "Marcadores → click en la fila (o el botón 📋). El punto verde sigue activando y desactivando desde la fila, y el tachito también.",
        tab: "marcadores",
      },
      {
        titulo: "Dos datos que estaban sueltos ahora viven en la ficha",
        que: "El tipo de insumo (insumos básicos, flete, entrega, embalaje, viáticos) y el tipo de provisión de personal solo se podían tocar desde la fila: no estaban en la ficha. Ya están, y el grupo del costo fijo se elige de la lista, con la opción de crear uno nuevo ahí mismo.",
        como: "En la ficha del marcador. El costo fijo que quedó reemplazado por el promedio de 3 meses lo avisa en la fila.",
        tab: "marcadores",
      },
    ],
  },
  {
    id: "2026-11-16a",
    fecha: "16/11/2026",
    titulo: "Los retiros societarios tienen su ficha",
    items: [
      {
        titulo: "La fila del retiro solo muestra",
        que: "Era la última solapa que movía plata tipeando en la fila: el socio, el monto, la moneda, blanco/negro y de qué cuenta sale, todo en cajitas. Ahora la fila muestra el dato con etiquetas y un click abre la ficha del retiro, que es donde se corrige.",
        como: "Balance y estado de resultados → Retiros societarios → click en la fila (o el botón 📋). El tachito sigue en la fila.",
        tab: "cashflow",
      },
      {
        titulo: "Avisa lo que falta y cuida la cuenta",
        que: "Si al retiro le falta la cuenta de la que sale, o el socio, la fila lo dice en rojo. Y si cambiás la empresa o la moneda del retiro, la cuenta se suelta: tiene que ser una cuenta de esa empresa y de esa moneda.",
        como: "En la ficha, «De qué cuenta sale» queda en rojo hasta que la elijas. Los retiros que asentó el arqueo del cierre lo aclaran en la fila y en la ficha.",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-11-14j",
    fecha: "14/11/2026",
    titulo: "Tipos de comprobante de AFIP y una factura para dos trabajos",
    items: [
      {
        titulo: "Están todos los comprobantes que propone AFIP",
        que: "El tipo de comprobante ahora se elige de la tabla de AFIP: Factura, Nota de Débito, Nota de Crédito y Recibo de A, B, C y M, Factura E de exportación y las Facturas de Crédito Electrónico MiPyME. Cada uno con su código, que es lo que usa el listado de ARCA.",
        como: "En la ficha de la factura → Tipo de comprobante. Quedaron afuera los tiques de controlador fiscal y las liquidaciones de regímenes que no usamos; si alguna vez aparece uno en ARCA, se agrega.",
        tab: "aprobados",
      },
      {
        titulo: "Una misma factura puede cubrir dos trabajos",
        que: "Cuando dos trabajos se facturaron juntos, en cada trabajo va SU parte y se marca «Es un comprobante repartido entre varios trabajos». El sistema deja de verlo como un duplicado y muestra el reparto con la suma de las partes, que es el total que tiene que decir ARCA.",
        como: "Trabajos aprobados → la factura → el check al final de la ficha. Sin marcar, el mismo número en dos trabajos sigue saliendo en rojo (puede ser un número mal tipeado).",
        tab: "aprobados",
      },
      {
        titulo: "El facturador avisa lo que todavía no sabe emitir",
        que: "Emitir en AFIP funciona para Factura A, B y C. Para los demás comprobantes (notas de crédito o débito, M, E, MiPyME) el botón no aparece y dice que hay que emitirla en ARCA y cargar acá el número. Antes cualquier tipo salía emitido como A o como B.",
        como: "Trabajos aprobados → la factura → el bloque de AFIP al pie de la ficha.",
        tab: "emitirFacturas",
      },
      {
        titulo: "Se escondió «Importar históricos BGA»",
        que: "Ese botón ya no se va a usar más: la carga histórica terminó. El importador queda en el código por si alguna vez hiciera falta, pero no se ve.",
        como: "Trabajos aprobados → arriba, donde estaba el botón.",
        tab: "aprobados",
      },
    ],
  },
  {
    id: "2026-11-14i",
    fecha: "14/11/2026",
    titulo: "Facturas emitidas: una sola ficha, con los datos de ARCA",
    items: [
      {
        titulo: "La factura del trabajo ahora pide lo que trae ARCA",
        que: "A la ficha de la factura le faltaban el punto de venta, la moneda y el tipo de comprobante como lo nombra ARCA (antes era un texto libre y decía solo «A»). Sin eso no se podía cruzar contra el listado de ARCA. La fila del trabajo ahora solo muestra y un click abre la ficha.",
        como: "Trabajos aprobados → el trabajo → Facturación → click en la factura. Si le falta un dato para cruzarla, la fila y la ficha lo dicen.",
        tab: "aprobados",
      },
      {
        titulo: "Facturas entre las empresas, sin trabajo de por medio",
        que: "Bloque nuevo en Movimientos internos para las facturas que una empresa del grupo le emite a la otra solo para acomodar los movimientos internos. Usa LA MISMA ficha que la factura del trabajo y cancela plata blanca en la cuenta corriente entre las dos.",
        como: "Movimientos internos → Facturas entre las empresas del grupo → Agregar factura. Al elegir la empresa que recibe se completa su CUIT y ya cruza la cuenta.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Ninguna repetida y ninguna perdida",
        que: "Si el mismo comprobante (tipo, punto de venta, número, CUIT y fecha) quedó cargado dos veces —en un trabajo y entre empresas, o repetido— la fila lo marca en rojo. Y el listado de ARCA ya no propone cargar una factura que está en la ficha de su trabajo: avisa «cargada en el trabajo 3162».",
        como: "Facturación → importar el listado de ARCA: lo que ya está cargado viene tildado como tal y no se duplica.",
        tab: "facturacion",
      },
      {
        titulo: "El IVA débito ya cuenta las facturas de los trabajos",
        que: "La Posición de IVA tomaba el débito SOLO del listado de ARCA, que está vacío: el tablero mostraba débito cero mientras las facturas de los trabajos tenían el IVA cargado. Ahora el débito sale de las facturas de los trabajos (más las de entre empresas y las del padrón que no estén en un trabajo), contando una sola vez lo que esté en los dos lados.",
        como: "Balance → Posición de IVA. El número cambia: ahora incluye el IVA de las facturas emitidas de los trabajos.",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-11-14h",
    fecha: "14/11/2026",
    titulo: "Los datos del resumen de tarjeta se corrigen en su ficha",
    items: [
      {
        titulo: "Un resumen, una sola ficha",
        que: "El cierre, el vencimiento, los totales en pesos y dólares, el pago mínimo y el saldo anterior se tipeaban en la fila de la solapa Tarjetas, y el mismo resumen tenía su ficha (la del linkeo) en otro lado. Ahora todo eso vive en la ficha: la fila solo muestra y dice si el resumen lo leyó el PDF o se cargó a mano.",
        como: "Bancos y tarjetas → Resúmenes → click en la fila: abre la ficha del resumen. El punto verde (pagado) y el tachito siguen en la fila.",
        tab: "bancos",
      },
      {
        titulo: "La ficha avisa si el total no es el del resumen",
        que: "Debajo de los datos compara el total a pagar con lo que suman los renglones del resumen. Si no coinciden lo dice en rojo: o el total está mal tipeado o falta algún renglón.",
        como: "Si el resumen se leyó del PDF, los renglones son los del PDF: ese es el número a creer. Si lo cargaste a mano, el total manda y la línea te avisa qué renglón falta.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-14g",
    fecha: "14/11/2026",
    titulo: "Seguros, Inversiones y Tarjetas: las filas no se tipean",
    items: [
      {
        titulo: "Las tres solapas se corrigen en la ficha",
        que: "Las filas eran un muro de campos editables (13 en Seguros, 14 en Inversiones). Ahora muestran el dato con etiquetas (empresa, blanco/negro, estado, vigencia) y todo se corrige en la ficha: un click en la fila la abre.",
        como: "Seguros / Inversiones / Bancos y tarjetas → click en la fila (o el botón 🗂).",
        tab: "seguros",
      },
      {
        titulo: "Cinco datos que estaban sueltos ahora viven en la ficha",
        que: "En Seguros: si genera la previsión mensual en el Calendario (el de ART va destildado porque ya está en la nómina) y en qué renglón se imputa. En Inversiones: de qué cuenta sale, el monto rescatado y el renglón del rescate. Antes solo se podían tocar desde la fila.",
        como: "La ficha los explica al lado de cada campo. En Inversiones, si falta la cuenta, la fila lo avisa en rojo.",
        tab: "inversiones",
      },
    ],
  },
  {
    id: "2026-11-14f",
    fecha: "14/11/2026",
    titulo: "Dos paneles menos: la información va donde se usa",
    items: [
      {
        titulo: "«Pagos cruzados entre empresas» ya no es un panel",
        que: "Esa lista estaba en tres lados a la vez. Ahora el estado de cuenta entre las empresas dice de dónde sale el saldo: «$X de 4 pagos de una empresa por la otra · $Y de 2 pases entre empresas…», y con un click se ven todos los movimientos, cada uno con su origen. El cruce se corrige, como siempre, en la ficha de su factura.",
        como: "Movimientos internos → Cuenta corriente entre las empresas → click en el saldo.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Las devoluciones de caja chica las avisa la caja",
        que: "El panel «Caja chica: devoluciones a otra cuenta» era una pantalla entera para un caso raro. Ahora lo avisa la propia caja en su fila: «⚠ $X volvió a Santander», con el detalle de dónde había salido.",
        como: "Caja chica → la caja lo dice en la columna del desbalance.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-11-14e",
    fecha: "14/11/2026",
    titulo: "Movimientos internos: las filas ya no se tipean",
    items: [
      {
        titulo: "Todo se corrige en la ficha",
        que: "Los cuatro bloques (pases, efectivo, aportes y préstamos, y la cuenta con la gente) tenían cada celda como un campo para escribir: se pisaba un dato sin querer con un click de más. Ahora la fila solo muestra, con el color y las etiquetas (B/N, empresa, entra/sale), y todo se corrige en la ficha.",
        como: "Movimientos internos → click en la fila (o el botón 🗂) abre su ficha. El click derecho sigue quitando el movimiento.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Dos datos que estaban sueltos ahora viven en la ficha",
        que: "El valor en U$S de referencia de un aporte o préstamo, y el medio por el que se le devolvió la plata a una persona (efectivo, transferencia, cheque o débito), estaban solo en la fila. Ahora están en la ficha, con su explicación.",
        como: "Movimientos internos → la fila → ficha.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-14d",
    fecha: "14/11/2026",
    titulo: "Dólares: deudas en U$S y traspasos a pesos",
    items: [
      {
        titulo: "Una deuda puede ser en U$S",
        que: "En la ficha de la deuda se elige la moneda. Si es en dólares, el capital, las cuotas y el pendiente están en U$S, el vencimiento aparece en U$S en Pagos inamovibles, y los totales de la solapa muestran los pesos y los dólares por separado (nunca se suman).",
        como: "Desendeudamiento → ficha de la deuda → «Moneda de la deuda».",
        tab: "desendeudamiento",
      },
      {
        titulo: "Pagar una cuota en U$S",
        que: "Al pagar la cuota de una deuda en dólares se cargan los U$S y la cotización; los pesos que salen de la cuenta se calculan solos y queda asentada la cotización usada. El cash flow sigue siendo todo en pesos.",
        como: "Desendeudamiento → la cuota → 💸 Pagar: cargá los U$S y la cotización.",
        tab: "desendeudamiento",
      },
      {
        titulo: "Traspaso U$S ↔ pesos entre cuentas",
        que: "El pase entre cuentas ahora puede cambiar de moneda: se elige la moneda de lo que sale y la de lo que entra, se carga la cotización y la ficha muestra cuánto entra del otro lado. Sale en dólares de la cuenta en dólares y entran los pesos convertidos en la de pesos, con la cotización asentada.",
        como: "Movimientos internos → + Pase entre cuentas → «Moneda de lo que sale» / «Moneda de lo que entra» + Cotización.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-14c",
    fecha: "14/11/2026",
    titulo: "La cuenta entre empresas dice con qué plata se debe",
    items: [
      {
        titulo: "El cobro que entra en la cuenta de la otra empresa ya es un préstamo",
        que: "Antes, la plata cargada con una cuenta de la otra empresa no sumaba en ninguna cuenta y quedaba solo como un error a corregir. Ahora se asienta donde la plata realmente está y genera el debe y haber entre las dos: si un cobro de BGA entra en una cuenta de De Raíz, De Raíz le debe esa plata. Vale para los dos lados (también si se paga desde la cuenta de la otra).",
        como: "Movimientos internos → Cuenta corriente entre las empresas. El listado de control sigue estando para revisarlos.",
        tab: "movimientosInternos",
      },
      {
        titulo: "El saldo se lee partido en blanco y negro",
        que: "Cada movimiento entre las empresas lleva su color, y el saldo dice cuánto se debe en blanco y cuánto en negro («debe $X en blanco · le sobran $Y en negro»), más cuánto ya está cruzado con facturas entre las dos. La factura cancela solo la plata blanca; la negra se cancela con plata. Así se decide si el próximo préstamo conviene en blanco o en negro.",
        como: "Movimientos internos → click en el saldo: cada movimiento tiene su badge B/N y el pie resume el desglose.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Dólares: los pagos cruzados también cuentan",
        que: "La posición en dólares ya no toma solo los pases: ahora también los pagos de una empresa por la otra y la plata que quedó en la cuenta de la otra, en U$S. Pesos y dólares siguen separados, sin conversión.",
        como: "Movimientos internos → Cuenta corriente entre las empresas: el saldo en U$S se muestra en su propio renglón.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-14b",
    fecha: "14/11/2026",
    titulo: "De qué empresa es cada cosa, y el cruce entre las dos",
    items: [
      {
        titulo: "Arriba de la ficha: de qué empresa es todo esto",
        que: "La ficha de factura y de gasto arranca con un selector: «Todo esto es de BGA / De Raíz». Si la factura, el pago y el proveedor son de la misma empresa, queda esa. Si algo es de la otra, el selector pasa solo a «⚠ Cruce / desvío» y te dice el préstamo que se genera entre las empresas. También podés ponerlo en cruce a mano para cruzarlo a propósito.",
        como: "Compras → una factura o un gasto → arriba de todo, «Empresa».",
        tab: "compras",
      },
      {
        titulo: "Las tres dicen de quién son",
        que: "Debajo del selector se leen las tres: «Proveedor de» (de quién es el proveedor, o las dos empresas), «La factura es de» (de quién es el gasto) y «El pago sale de» (de dónde sale la plata, pago por pago). Lo que no coincide queda en ámbar.",
        como: "La empresa del pago se elige en cada pago, abajo; la del proveedor, en la ficha del proveedor.",
        tab: "compras",
      },
      {
        titulo: "Click en el saldo entre empresas: todos los movimientos",
        que: "En Movimientos internos, el renglón «Cómo estamos: X le debe $Y a Z» ahora se puede tocar y se abren TODOS los movimientos que forman ese saldo: los pases entre empresas, los giros que se vieron en el banco y los pagos cruzados, con el saldo corriendo renglón por renglón.",
        como: "Movimientos internos → Cuenta corriente entre las empresas → click en el monto.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-14",
    fecha: "14/11/2026",
    titulo: "«Proveedor de» dentro de la ficha",
    items: [
      {
        titulo: "De quién es el proveedor se elige en su ficha",
        que: "La selección de empresa del proveedor ahora se llama «Proveedor de» y está DENTRO de la ficha, con las tres opciones: BGA, De Raíz o «Las dos empresas (compartido)». Antes solo estaba en la ventana de datos y la opción de las dos no se veía al abrir la ficha.",
        como: "Compras → Proveedores → tocá el proveedor → bloque «Proveedor de». Si le compran las dos, elegí «Las dos empresas»: la cuenta se mira separada, una empresa por vez.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-13d",
    fecha: "13/11/2026",
    titulo: "El proveedor se da de alta en un solo lugar",
    items: [
      {
        titulo: "Agregar un proveedor abre su ficha",
        que: "Había siete formas de dar de alta un proveedor y cada una pedía distintos datos; por eso quedaban repetidos, sin CUIT y sin condición de pago. Ahora toda alta a mano abre la misma ficha, y las que nacen solas (de una factura, de un gasto de caja, de ARCA o del banco) quedan todas iguales y dicen de dónde salieron.",
        como: "Compras → Proveedores → '+ Agregar proveedor' (o click derecho → 'Editar datos').",
        tab: "compras",
      },
      {
        titulo: "El listado avisa a qué proveedor le falta completar",
        que: "Debajo del nombre aparece en ámbar qué le falta: el CUIT, la condición de pago o el grupo de costo. Sin condición de pago sus facturas no toman fecha y no entran a Pagos programados ni al cash flow.",
        como: "Compras → Proveedores: tocá el que tenga el aviso ⚠ y completá su ficha.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-13c",
    fecha: "13/11/2026",
    titulo: "La fecha de pago de una factura se elige en un solo lugar",
    items: [
      {
        titulo: "En la ficha del proveedor la fecha ya no se tipea",
        que: "En 'Próximos pagos' la fecha de pago se cambiaba ahí mismo, sin el estado (programado / estimado / inamovible) ni de qué cuenta sale, y sin quedar firmada. Ahora se muestra la fecha y se corrige en la ficha de la factura, que pide las tres cosas.",
        como: "Ficha del proveedor → Próximos pagos → 'Abrir la ficha' al lado de la fecha.",
        tab: "compras",
      },
      {
        titulo: "En Análisis de gastos, el pago que viene de una factura manda a su ficha",
        que: "El click derecho sobre un pago previsto dejaba cambiarle el estado aunque fuera una factura, y quedaba distinto de lo cargado en la factura. Si el pago sale de una factura, ahora ofrece abrir su ficha; los demás (tarjetas, cuotas, seguros) siguen marcándose igual.",
        como: "Compras → Análisis de gastos → click derecho en el pago → '✎ Abrir la ficha de la factura'.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-13b",
    fecha: "13/11/2026",
    titulo: "El pago de una cuota se corrige en su ficha",
    items: [
      {
        titulo: "Editar el pago de una cuota de Desendeudamiento",
        que: "Antes el pago de una cuota se cargaba con una ficha y se corregía con otra que no sabía que era una cuota. Ahora es la misma: se corrige en la cuota, y si lo abrís desde otra solapa te lleva ahí.",
        como: "Desendeudamiento → la cuota pagada → ✎ (o click derecho → 'Editar el pago…').",
        tab: "desendeudamiento",
      },
      {
        titulo: "Pagar con la caja chica de la otra empresa",
        que: "En la ficha de una factura o gasto, 'De qué cuenta salió' ahora ofrece también las cajas chicas y cuentas de la otra empresa, aunque estés mirando una sola. Al elegir una, el pago queda cruzado y se suma como préstamo entre las empresas.",
        como: "En el pago, abrí 'De qué cuenta salió' y elegí abajo, en 'De … (pago cruzado = préstamo)', la caja de la persona.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-11-13",
    fecha: "13/11/2026",
    titulo: "Los movimientos del banco se linkean en un solo lugar",
    items: [
      {
        titulo: "Bancos abre la ficha de la cuenta para linkear",
        que: "Había dos formas de asignar un movimiento del banco, con datos distintos. Desde el 1/11 queda una sola: la ficha de la cuenta, donde se linkea con el pago, la tarjeta o el cobro que ya está cargado.",
        como: "Bancos y tarjetas → en el movimiento, 'Linkear en la ficha ↗' o click derecho.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-12d",
    fecha: "12/11/2026",
    titulo: "Los cobros de un trabajo se corrigen en el trabajo",
    items: [
      {
        titulo: "En Facturación, los cobros de un trabajo se abren en el trabajo",
        que: "Antes, en Facturación se podía editar una copia de un cobro de un trabajo, y desde ese momento esa copia dejaba de seguir al trabajo. Ahora se muestra y se corrige en el trabajo: el dato es uno solo.",
        como: "Facturación → tocá el cobro → 'Abrir en el trabajo'.",
        tab: "facturacion",
      },
    ],
  },
  {
    id: "2026-11-12c",
    fecha: "12/11/2026",
    titulo: "Una sola ficha para gastos de caja chica y facturas de Compras",
    items: [
      {
        titulo: "Rendir un gasto de caja chica usa la ficha de Compras",
        que: "Ahora es la misma ficha en las dos solapas: en la caja chica se cargan los impuestos completos de la factura (alícuota, exento, otros impuestos, IIBB) y en Compras se puede pagar con la caja de una persona. El pago ya viene con la caja y su monto sigue al total.",
        como: "Caja chica → ficha de la persona → '+ Rendir gasto'. Si es un gasto sin factura, elegí Negro.",
        tab: "cajaChica",
      },
      {
        titulo: "Pagar algo de la otra empresa queda como préstamo",
        que: "Cuando una empresa paga un gasto o una factura de la otra (con la caja chica o con el banco), se suma como préstamo en la cuenta entre BGA y De Raíz, junto con las transferencias y las facturas entre las dos.",
        como: "En la ficha, elegí la Empresa del gasto; en el pago, la empresa que pone la plata. Se ve en Movimientos internos.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Guardar con otra persona trabajando a la vez ya no pisa lo tuyo",
        que: "Si otra persona guardaba mientras vos cargabas, lo tuyo todavía sin subir se podía perder. Ahora se queda y se sube junto con lo del otro.",
        como: "Nada que hacer: se guarda solo.",
      },
    ],
  },
  {
    id: "2026-11-12b",
    fecha: "12/11/2026",
    titulo: "Borrar tiene bloqueo: dentro de la hora, o con autorización",
    items: [
      {
        titulo: "Borrar lo cargado hace más de una hora pide autorización",
        que: "Lo que se cargó hace menos de una hora se borra como siempre. Pasada la hora no se borra: queda un pedido de borrado que solo puede autorizar Nicolás, y mientras tanto sigue cargado. Lo cargado antes de hoy cuenta como viejo.",
        como: "Borrá como siempre. Si sale el aviso \"No se borró\", el pedido ya quedó hecho: no hace falta repetirlo.",
      },
    ],
  },
  {
    id: "2026-11-12",
    fecha: "12/11/2026",
    titulo: "La caja chica en negativo ya no se cierra sola",
    items: [
      {
        titulo: "Caja chica en negativo = deuda a la vista",
        que: "Antes, una caja que se pasaba de lo asignado se cerraba sola y desaparecía del listado. Ahora solo se cierra sola si queda justo en cero. En negativo sigue abierta, en rojo y con la leyenda \"deuda con…\". Si ya estaba cerrada, también se ve hasta que una caja nueva de esa persona absorba la deuda.",
        como: "Caja chica → el listado. Click derecho sobre el responsable abre su ficha para editar, reabrir o pagar la deuda.",
        tab: "cajaChica",
      },
    ],
  },
  {
    id: "2026-11-11b",
    fecha: "11/11/2026",
    titulo: "Pagos programados en pantalla, sueldos pagados con caja chica y anticipos en Personal",
    items: [
      {
        titulo: "Pagos programados entra en la pantalla",
        que: "El almanaque de Pagos programados ya no se escapa de la pantalla: las 7 columnas quedan fijas y cada pago se lee entero (si es largo, en dos renglones).",
        como: "Balance → Calendario anual → Pagos programados.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Sueldo pagado con la caja chica de otro",
        que: "Si un pago de haberes sale de la caja de otra persona (por ejemplo, las horas de un empleado pagadas con la caja de Lucas), ahora figura como gasto rendido en esa caja chica y baja lo que le queda. Click sobre el gasto abre el pago de haberes para corregirlo.",
        como: "Caja chica → la ficha de la persona.",
        tab: "cajaChica",
      },
      {
        titulo: "Anticipos en la ficha de Personal",
        que: "En la liquidación del mes de cada persona se ven los pagos a cuenta ya hechos desde la ficha de haberes (con la cuenta o caja de donde salieron) y cuánto le resta cobrar, premios incluidos. Ya se descuentan en la ficha de haberes: no hace falta cargarlos en Anticipos.",
        como: "Personal → la persona → el mes.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-11-11",
    fecha: "11/11/2026",
    titulo: "La ocupación del taller sale de los trabajos aprobados",
    items: [
      {
        titulo: "Ocupación del tablero de Fabricación",
        que: "La ocupación usada y disponible ya no sale del presupuesto abierto en el editor: suma las horas de mano de obra de los trabajos aprobados abiertos que caen en el mes, contra las horas por mes de la gente de De Raíz. Un trabajo atrasado carga todas sus horas en el mes, y se avisa cuántos trabajos abiertos no tienen horas.",
        como: "Fabricación → Tablero general. Marcá como finalizado lo que ya se entregó para que no siga sumando.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-11-10b",
    fecha: "10/11/2026",
    titulo: "Gastos, cobros y comisiones avisan si falta la cuenta",
    items: [
      {
        titulo: "Gasto sin cuenta",
        que: "En Pago a proveedores, un gasto cargado a mano sin cuenta muestra \"⚠ falta la cuenta\". Cambiar la empresa del gasto borra la cuenta.",
        como: "Botón derecho sobre el gasto → De qué cuenta salió…",
        tab: "costos",
      },
      {
        titulo: "Cobros y comisiones sin cuenta",
        que: "En cada trabajo se avisa cuántos cobros no dicen a qué cuenta entró la plata y cuántos pagos de comisión no dicen de cuál salió. Al finalizar el trabajo también figura en lo que falta. Lo anterior a la apertura de las cuentas no se marca.",
        como: "Trabajos aprobados → el trabajo → elegí la cuenta en cada cobro o pago de comisión (queda en rojo hasta que la elegís).",
        tab: "aprobados",
      },
    ],
  },
  {
    id: "2026-11-10",
    fecha: "10/11/2026",
    titulo: "Toda plata dice de qué empresa es y de qué cuenta sale o a cuál entra",
    items: [
      {
        titulo: "La plata es de una sola empresa",
        que: "Al cargar algo que mueve plata (pago, cobro, trabajo, caja chica, deuda, aporte, efectivo, VEP, seguro, inversión, tarjeta, factura de compra) la pregunta de la empresa ofrece solo BGA o De Raíz. \"Ambas (compartido)\" queda para lo que no es plata: clientes, stock, proveedores y marcadores.",
        como: "Al tocar Agregar, elegí la empresa que paga o cobra.",
        tab: "calendarioAnual",
      },
      {
        titulo: "La cuenta es obligatoria en el Calendario",
        que: "Ya no hay cuenta por defecto: si no elegís de qué cuenta sale o a cuál entra, no se puede guardar.",
        como: "Calendario anual → cargar en un día → elegí la cuenta (queda en rojo hasta que la elegís).",
        tab: "calendarioAnual",
      },
      {
        titulo: "Cuenta en el VEP de IVA",
        que: "Cada VEP dice de qué cuenta salió.",
        como: "Balance → VEP de pago de IVA → De qué cuenta sale.",
        tab: "cashflow",
      },
      {
        titulo: "Cuenta en efectivo, aportes y reintegros",
        que: "El efectivo, los aportes y préstamos y los reintegros (haber) de la cuenta con la gente piden la cuenta. Si falta, la fila muestra \"⚠ Falta la cuenta\".",
        como: "Movimientos internos → tocá \"⚠ Falta la cuenta\" (o 📋) y elegila en la ficha.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Cuenta en los cobros y pagos de Facturación",
        que: "Un renglón de cobranza o pago dice a qué cuenta entra o de cuál sale. El \"+\" del día ahora pregunta la empresa.",
        como: "Facturación → abrí el renglón → A qué cuenta entra / De qué cuenta sale.",
        tab: "facturacion",
      },
      {
        titulo: "Comisiones con su cuenta",
        que: "Cada pago de comisión de un trabajo dice de qué cuenta salió.",
        como: "Trabajos aprobados → el trabajo → Comisión → De qué cuenta salió.",
        tab: "aprobados",
      },
      {
        titulo: "Cambiar la empresa obliga a elegir la cuenta de nuevo",
        que: "En facturas de compra, Calendario, inversiones, retiros, VEP y movimientos internos, si cambiás la empresa se borra la cuenta (era de la otra empresa) y hay que volver a elegirla.",
        como: "Después de cambiar la empresa, elegí una cuenta de esa empresa.",
        tab: "compras",
      },
      {
        titulo: "Control: cuenta de la otra empresa",
        que: "Si un movimiento de una empresa usa una cuenta de la otra, no suma en ninguna cuenta y aparece en rojo arriba del panel Cuentas hasta corregirlo. El destino de un pase sí puede ser de la otra empresa.",
        como: "Bancos y tarjetas → Cuentas → lista roja → abrí el movimiento en su solapa y elegí una cuenta de su empresa.",
        tab: "bancos",
      },
      {
        titulo: "Caja chica: la deuda se separa por empresa",
        que: "Lo que se le debe a una persona por caja chica es de la empresa para la que se compró. Lo que sobra en una caja de una empresa ya no tapa la deuda de la otra, y cada empresa devuelve lo suyo de una cuenta suya. Una caja nueva queda imputada a la empresa elegida.",
        como: "Caja chica → click derecho sobre el responsable → ficha → Deuda por caja chica → \"Pagar lo de BGA / De Raíz\".",
        tab: "cajaChica",
      },
      {
        titulo: "Factura de compra nueva pregunta la empresa",
        que: "Al cargar una factura nueva se pregunta de qué empresa es. Si el proveedor es de una sola empresa, toma esa.",
        como: "Compras → Agregar factura de compra.",
        tab: "compras",
      },
      {
        titulo: "Resúmenes y consumos de tarjeta en la empresa de la tarjeta",
        que: "Un resumen o consumo nuevo toma la empresa de su tarjeta, también si después cambiás la tarjeta.",
        como: "No hay que hacer nada.",
        tab: "bancos",
      },
    ],
  },
  {
    id: "2026-11-05c",
    fecha: "05/11/2026",
    titulo: "Recibo negro: se calcula por horas",
    items: [
      {
        titulo: "El acuerdo en negro se paga por horas trabajadas",
        que: "El acuerdo se divide por las horas laborables del mes (días hábiles de lunes a viernes, sin feriados, por 9 horas) y se multiplica por las horas trabajadas. El recibo negro y la ficha de pago usan la misma cuenta. Los sábados ya no cuentan como días laborables. Lo acordado en negro es neto: sin descuentos, presentismo ni anticipos.",
        como: "Personal → ficha del empleado → Recibo negro. El recibo muestra los días hábiles, las horas y el cálculo.",
        tab: "personal",
      },
      {
        titulo: "Administrativos y socios cobran el valor acordado",
        que: "Todo el personal fuera de convenio cobra lo acordado entero: no se liquida por horas ni tiene horas extra. Si el acuerdo es en blanco con descuentos, se hacen sobre ese valor, y el presentismo se elige por persona.",
        como: "Personal → ficha del empleado → casilla 'Aplicar presentismo sobre el blanco acordado'.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-11-05b",
    fecha: "05/11/2026",
    titulo: "Movimientos internos: menos bloques y deudas que se migran",
    items: [
      {
        titulo: "La cuenta entre empresas arranca en cero",
        que: "La cuenta corriente entre las empresas suma solo el ejercicio en curso. Del ejercicio cerrado queda una línea con cómo cerró, que no se suma con lo nuevo.",
        como: "Movimientos internos → Cuenta corriente entre las empresas → Ver el desglose, para entrar al ejercicio anterior.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Migrar una deuda o un aporte a Desendeudamiento",
        que: "Cada fila de Deudas y aportes tiene un botón que la pasa a Desendeudamiento, vinculada, para definir cómo se devuelve. Un aporte migrado pasa a ser un préstamo.",
        como: "Movimientos internos → Deudas y aportes → Migrar a Desendeudamiento. Se abre la ficha de la deuda para cargarle las cuotas.",
        tab: "movimientosInternos",
      },
      {
        titulo: "Se quitó \"Pagos en efectivo negro hechos por personas\"",
        que: "El bloque ya no aparece en Movimientos internos. Lo que una persona pone de su bolsillo se sigue en la Cuenta corriente con la gente.",
        como: "No hay que hacer nada.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-05a",
    fecha: "05/11/2026",
    titulo: "Pases: de dónde sale y a dónde va",
    items: [
      {
        titulo: "Pase entre cuentas, en la misma empresa o entre dos",
        que: "El pase se carga en una ficha que exige de qué empresa y cuenta sale la plata y a cuál va. Cada cuenta baja y sube sola. Si es entre dos empresas, queda el debe y haber: la cuenta corriente entre las empresas dice quién le debe a quién, y los giros que también aparecen en el extracto cuentan una sola vez.",
        como: "Movimientos internos → Agregar pase. Los pases viejos que dicen \"Falta elegir\" se completan tocándolos.",
        tab: "movimientosInternos",
      },
    ],
  },
  {
    id: "2026-11-04a",
    fecha: "04/11/2026",
    titulo: "El candado le gana al fichero y cada ejercicio con su botón",
    items: [
      {
        titulo: "Balance: cada ejercicio detrás de su botón",
        que: "Arriba de Balance y del Calendario hay un botón por ejercicio con sus fechas. Se arranca en el ejercicio en curso; lo anterior, sus resultados y su cierre solo se ven al tocar su botón. El resumen de registros y los 12 meses del balance también son del ejercicio elegido. En las demás solapas, el botón dice las fechas del ejercicio cerrado.",
        como: "Balance → botones de arriba.",
        tab: "cashflow",
      },
      {
        titulo: "Conteo de horas y candados",
        que: "El botón de precarga ahora se llama \"Conteo de horas\". Las horas de cada día son el reflejo de su entrada y su salida: si las corregís a mano se recalculan siempre, con el botón encendido o apagado. El candado frena al fichero: un día con candado no cambia por el reloj y, si está en blanco, no suma. Al encender el botón en la ficha de una persona, el total del mes sale del calendario, aunque la liquidación esté guardada.",
        como: "Personal → ficha de la persona → calendario del mes.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-11-03d",
    fecha: "03/11/2026",
    titulo: "El ejercicio nuevo arranca en cero",
    items: [
      {
        titulo: "Totales en cada bloque del trabajo",
        que: "En Trabajos aprobados, arriba de Facturación, Cobranzas, Retenciones, Adicionales y Comisión: cuántos hay cargados y lo que suman. Facturas: neto, IVA y total. Cobranzas: lo cobrado en blanco con su neto e IVA, lo cobrado en negro, el neto y el total (los U$S aparte). Adicionales: neto, IVA y total por circuito.",
        como: "Trabajos aprobados → abrir un trabajo.",
        tab: "aprobados",
      },
      {
        titulo: "Lo del año pasado se llama, no se ve solo",
        que: "Con el ejercicio cerrado, todas las solapas con movimientos muestran solo el ejercicio en curso: Facturación, Bancos, Movimientos internos, Seguros (vencidos o dados de baja), Inversiones (cerradas) y Desendeudamiento (deudas terminadas de pagar), además de Compras, Costos, Caja chica y Trabajos aprobados. Lo que sigue abierto (cobros y deudas pendientes) se sigue viendo.",
        como: "Arriba de cada solapa: \"Ver ejercicio cerrado\" para traer lo del año pasado (solo lectura).",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-11-03c",
    fecha: "03/11/2026",
    titulo: "Lector de PDF arreglado: facturas y escalas",
    items: [
      {
        titulo: "Facturas y tickets en PDF",
        que: "El lector entiende ahora las facturas de ARCA, Tango y similares (antes no sacaba nada y decía \"parece escaneado\"). Si el PDF es un escaneo, lo pasa por el OCR en vez de dar error. Toma el total, la fecha y la razón social; igual revisás antes de guardar.",
        como: "Caja chica → ficha de la caja → leer comprobante.",
        tab: "cashflow",
      },
      {
        titulo: "Escala salarial desde el PDF",
        que: "Lee la tabla por renglones, también el formato nuevo de USIMRA (oct-2026 en adelante, todo básico por mes, sin suma no remunerativa).",
        como: "Personal → Escalas → subir el PDF.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-11-03b",
    fecha: "03/11/2026",
    titulo: "Haberes: elegir de dónde sale la plata",
    items: [
      {
        titulo: "Origen del pago de haberes",
        que: "En la ficha de pago de haberes de cada persona se elige de qué cuenta sale lo blanco y de cuál lo negro (un banco, el efectivo o la caja de alguien). La proyección del Calendario descuenta de esa cuenta y, al cargar el pago, se propone esa misma (se puede cambiar). Lo blanco y lo negro que faltan pagar se prevén por separado.",
        como: "Personal → click derecho → Ficha de pago de haberes → De dónde sale la plata.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-11-03a",
    fecha: "03/11/2026",
    titulo: "IVA anual, cierre del desendeudamiento y haberes previstos",
    items: [
      {
        titulo: "IVA mes a mes; el VEP controla",
        que: "La posición de IVA va por mes calendario: débito menos crédito de cada mes, y el saldo a favor pasa al mes siguiente. Arriba, el mes en curso; abajo, el ejercicio mes por mes. El VEP ya no reinicia nada: se asigna al mes que paga (\"Mes que paga\"; vacío = el mes anterior a su fecha) y se controla contra lo que el sistema dice a pagar: ✓ coincide, ⚠ faltan, ⚠ de más o ⚠ sin VEP.",
        como: "Balance → Posición de IVA.",
        tab: "cashflow",
      },
      {
        titulo: "Desendeudamiento: cierre del ejercicio",
        que: "Arriba, por cada deuda: lo que se pagó de las cuotas del ejercicio cerrado, lo que quedó sin pagar y pasa al año nuevo, y las cuotas que siguen.",
        como: "Desendeudamiento → Cierre del ejercicio.",
        tab: "desendeudamiento",
      },
      {
        titulo: "Haberes por pagar en el Calendario",
        que: "Lo que falta pagar de cada persona (lo mismo que se ve en Pagos programados) aparece como \"≈\" en su renglón de HABERES y suma en la fila de suma estimada, para ver cómo se está frente a ese egreso. Al cargar el pago desde su ficha, la previsión desaparece.",
        como: "Calendario anual → HABERES.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-11-02b",
    fecha: "02/11/2026",
    titulo: "Arreglos del cierre",
    items: [
      {
        titulo: "El cierre se guarda en el momento y se recupera de la carpeta",
        que: "Los cierres del 02/11 quedaron en la carpeta pero no en el sistema. Ahora el cierre se guarda apenas se confirma, y si el ejercicio ya tiene su cierre en la carpeta, el asistente ofrece recuperarlo tal cual, sin repetir el arqueo.",
        como: "Asistente de cierre → Cerrar → \"¿Recuperarlo tal cual?\" → Aceptar.",
        tab: "cashflow",
      },
      {
        titulo: "Efectivo, IVA y a cobrar desde el cierre",
        que: "El efectivo arranca con lo contado en el arqueo, blanco y negro por separado (antes todo entraba como blanco). La posición de IVA arranca en cero desde el cierre. El \"a cobrar\" del tablero es igual al de Trabajos aprobados (blanco con IVA + negro): antes sumaba el negro dos veces.",
        como: "Balance → tablero de cada empresa.",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-11-02a",
    fecha: "02/11/2026",
    titulo: "Las solapas nuevas tienen su lugar en la carpeta",
    items: [
      {
        titulo: "Exportar TODO guarda también las solapas nuevas",
        que: "Seguros, Inversiones, Desendeudamiento, Movimientos internos (con retiros de socios), Cuentas, Pagos programados, Inventario de stock y Fabricación: una planilla por empresa y por mes en <Solapa>/<EMPRESA>/Ejercicio/<mes>. Los catálogos de Fabricación van en Fabricacion/GENERAL/Catalogos y los clientes en Presupuestos/<EMPRESA>/Clientes.html.",
        como: "Documentos → Exportar TODO.",
        tab: "documentos",
      },
      {
        titulo: "El cierre guarda todo",
        que: "El respaldo del cierre (cierre.json) ahora lleva todos los datos de la empresa, y la carpeta del cierre suma las planillas de las solapas nuevas con el ejercicio entero.",
        como: "Al cerrar el ejercicio (se abre solo el asistente de cierre).",
        tab: "cashflow",
      },
    ],
  },
  {
    id: "2026-10-31k",
    fecha: "31/10/2026",
    titulo: "Categorías internas armadas",
    items: [
      {
        titulo: "Las categorías ya traen sus Tareas y su gremio",
        que: "Aprendiz y Ayudante general (gremio Ayudante), Ayudante especializado por rumbo (Medio oficial), los oficios (Oficial general) y los Responsables de fábrica y de obra (Oficial especializado), con las 39 Tareas repartidas. Todo se puede editar: tareas, gremio, nombres, escalones. Falta asignarle a cada persona su categoría y tildar las tareas que domina.",
        como: "Personal → Categorías internas (para editar) y Personal → ficha de cada persona → Categorías y tareas que domina.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-31j",
    fecha: "31/10/2026",
    titulo: "Fichas en seguros, inversiones, tarjetas, stock, movimientos internos y marcadores",
    items: [
      {
        titulo: "Cada fila tiene su ficha",
        que: "El botón 📋 de cada fila abre la ficha con todos sus datos y la empresa arriba, en una ventana emergente. Cada cambio se guarda al momento, igual que en la fila. En Stock la empresa puede ser Ambas (compartido); lo que mueve plata es siempre de una sola empresa.",
        como: "Seguros, Inversiones, Tarjetas, Stock, Movimientos internos y Marcadores → botón 📋 en la fila.",
      },
    ],
  },
  {
    id: "2026-10-31i",
    fecha: "31/10/2026",
    titulo: "La empresa se elige en la ficha",
    items: [
      {
        titulo: "Empresa en Stock y en las máquinas",
        que: "Click derecho en un artículo de Stock: se elige su empresa (BGA, De Raíz o Ambas, compartido). En la ficha de cada máquina se elige la empresa dueña (su valor impacta en esa; la usan las dos).",
        como: "Stock → click derecho en el artículo → Empresa. Fabricación → Mantenimiento → ficha de la máquina → Empresa dueña.",
        tab: "stock",
      },
      {
        titulo: "Compartido se llama igual en todos lados",
        que: "Lo que es de las dos empresas aparece como \"Ambas (compartido)\" en clientes, proveedores, remitos y Stock. Lo que mueve plata (pagos, facturas, cajas, deudas, cuentas) sigue siendo de una sola empresa: la que paga.",
        como: "En cada ficha, campo Empresa.",
      },
    ],
  },
  {
    id: "2026-10-31h",
    fecha: "31/10/2026",
    titulo: "Cierres del mes separados por empresa",
    items: [
      {
        titulo: "Una foto por empresa al guardar el mes",
        que: "Al guardar el cierre del mes viendo las dos empresas, ahora se guarda una foto de cada empresa con solo sus datos, y cada una queda en el lugar de su empresa. Quien trabaja con una sola empresa ya no recibe los números de la otra.",
        como: "Igual que siempre: botón de guardar el mes en cada solapa.",
      },
      {
        titulo: "Los clientes se guardan, con su empresa en la ficha",
        que: "La ficha de cada cliente (contacto, dirección, notas) ahora se guarda: antes se perdía al recargar. En la ficha se elige la empresa: BGA, De Raíz o Ambas (compartido); el compartido lo ven las dos y quien trabaja con una sola empresa ve los suyos y los compartidos. Al agregar un cliente pregunta de qué empresa es.",
        como: "Historial → click en un cliente → Editar → Empresa.",
        tab: "historial",
      },
    ],
  },
  {
    id: "2026-10-31g",
    fecha: "31/10/2026",
    titulo: "Estructura del Calendario y tipos de documento editables",
    items: [
      {
        titulo: "Estructura del Calendario anual",
        que: "Un bloque para editar cómo se llaman las secciones y los renglones del Calendario, en qué orden van, cuáles no se muestran y los renglones y secciones propios. Lo que vincula cada renglón con su solapa no cambia, así que no mueve plata. Solo se oculta o borra lo que no tiene movimientos, y si a algo oculto le llega plata vuelve a verse.",
        como: "Acceso → Estructura del Calendario anual (solo administradores).",
        tab: "acceso",
      },
      {
        titulo: "Tipos de documento",
        que: "Se renombran los de siempre y se suman nuevos, cada uno con las carpetas que lo reconocen al sincronizar (por ejemplo, Contratos).",
        como: "Acceso → Listados del sistema → Tipos de documento.",
        tab: "acceso",
      },
    ],
  },
  {
    id: "2026-10-31f",
    fecha: "31/10/2026",
    titulo: "Más listados editables",
    items: [
      {
        titulo: "Nueve listados más en Listados del sistema",
        que: "Provisiones de personal, motivos de baja, estados de máquinas, unidades de las tareas, medios de pago, tipos de deuda, grupos del análisis de gastos y tipos de seguro e inversión. En los que usan las cuentas (medios de pago, motivos de baja, estados, unidades, tipos de deuda, grupos del análisis) se cambia cómo se llaman y se suman nuevos, pero los de siempre no se borran.",
        como: "Acceso → Listados del sistema.",
        tab: "acceso",
      },
      {
        titulo: "Grupos de Stock: rubro del checklist y máquinas",
        que: "Cada grupo de Stock dice a qué rubro del checklist antes de producción van sus artículos (materiales, insumos, herrajes o no se pide) y si son máquinas o herramientas, para que aparezcan en Mantenimiento.",
        como: "Acceso → Listados del sistema → Grupos de Stock → columnas Checklist y Máquinas.",
        tab: "acceso",
      },
    ],
  },
  {
    id: "2026-10-31e",
    fecha: "31/10/2026",
    titulo: "Listados del sistema editables",
    items: [
      {
        titulo: "Los listados se editan desde el sistema",
        que: "Un bloque nuevo con los listados que usaba el sistema fijos: categorías del gremio, grupos de Stock (con el prefijo de sus códigos), tipos de trabajo y grupos de marcadores. Se puede sumar, renombrar (el nombre nuevo pasa a todo lo que usaba el viejo), ordenar, pausar y borrar lo que no está en uso. Los que usan las cuentas (\"General\" y los grupos de máquinas) quedan fijos.",
        como: "Acceso → Listados del sistema (solo administradores).",
        tab: "acceso",
      },
    ],
  },
  {
    id: "2026-10-31d",
    fecha: "31/10/2026",
    titulo: "Categorías del gremio, internas y tareas que domina",
    items: [
      {
        titulo: "Cada categoría interna, vinculada con la del gremio",
        que: "En el bloque de Categorías internas hay una columna Gremio: elegís a qué categoría del convenio (las de la escala salarial) corresponde cada interna.",
        como: "Personal → Categorías internas → columna Gremio.",
        tab: "personal",
      },
      {
        titulo: "En la ficha: las dos categorías y las tareas que domina",
        que: "La ficha muestra la categoría del gremio que cobra y sus internas. Con un click en una categoría interna ves sus tareas: ahí se asigna la categoría y se tilda cada tarea que domina (se marca la Tarea entera). Cada categoría dice cuántas de sus tareas domina. Con tareas tildadas, en la organización diaria, el cronograma y el presupuesto cuenta solo lo que domina.",
        como: "Personal → ficha de la persona → Categorías y tareas que domina.",
        tab: "personal",
      },
      {
        titulo: "Listos para aumento",
        que: "Quien domina el 100% de las tareas de una categoría interna vinculada a una categoría del gremio que paga más que la que cobra (escala del mes) aparece como listo para pasar a esa categoría, en su ficha y en un bloque de Personal.",
        como: "Personal → Listos para aumento → Ver ficha.",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-31c",
    fecha: "31/10/2026",
    titulo: "Insumos por tarea",
    items: [
      {
        titulo: "Cada Tarea lleva sus insumos",
        que: "Lija, cola, tornillos y demás se cargan en la Tarea (Corte CNC, Pegado de cantos, Armado...) con su cantidad por cada unidad de la tarea: por mueble, por metro lineal o por m², según su paso a paso. Son genéricos de un grupo de Stock, como los materiales del tipo de mueble.",
        como: "Fabricación → Tareas y su paso a paso → botón 🧴 Insumos… de cada tarea.",
        tab: "fabricacion",
      },
      {
        titulo: "Se suman al pasar los materiales al presupuesto",
        que: "\"Pasar materiales de los muebles\" suma los insumos de las Tareas que lleva cada tipo, según la cantidad de cada tarea en el mueble, junto con los materiales del tipo (si es el mismo genérico, se suma en un renglón). En la ventana dice de qué tarea sale cada insumo. Desde el presupuesto llegan al checklist antes de producción.",
        como: "Presupuesto → Muebles del presupuesto → Pasar materiales de los muebles.",
        tab: "presupuesto",
      },
    ],
  },
  {
    id: "2026-10-31b",
    fecha: "31/10/2026",
    titulo: "Mantenimiento, orden y limpieza",
    items: [
      {
        titulo: "Rutinas del taller, diarias y semanales",
        que: "Un bloque nuevo en Fabricación con los trabajos que se repiten (barrido, orden del depósito...), sus horas y cuántas personas. Los hacen primero aprendices y ayudantes, del más económico al más costoso; si la rutina tiene una tarea del catálogo, solo quienes la tienen en sus categorías.",
        como: "Fabricación → Mantenimiento, orden y limpieza → + Rutina. Click derecho en la fila: editar, pausar o borrar.",
        tab: "fabricacion",
      },
      {
        titulo: "Completar los huecos del día",
        que: "Elegís un día y el sistema pone cada rutina que toca al final del hueco libre de la persona que corresponde, en la organización diaria. Saltea a los que no están o están en obra, no repite lo ya puesto y avisa si a alguna no le encontró lugar.",
        como: "Fabricación → Mantenimiento, orden y limpieza → elegir la fecha → Completar huecos del día.",
        tab: "fabricacion",
      },
      {
        titulo: "La mano de obra de las rutinas, en Marcadores",
        que: "Los materiales de limpieza y mantenimiento van con sus facturas; lo que se suma es la mano de obra del tiempo de cada rutina, con el costo hora de quienes la hacen. Cada rutina elige su grupo de costos y en Marcadores → Costos empresariales ese grupo suma su mano de obra por mes. No va al cash flow ni al calendario.",
        como: "Fabricación → Mantenimiento, orden y limpieza → editar la rutina → Grupo de costos. Se ve en Marcadores, debajo del nombre del grupo.",
        tab: "marcadores",
      },
    ],
  },
  {
    id: "2026-10-31a",
    fecha: "31/10/2026",
    titulo: "Fichas de tarjetas y extractos, y ARCA con revisión",
    items: [
      {
        titulo: "Lector de resúmenes de tarjeta",
        que: "Se sube el PDF del resumen (Patagonia Visa Business y Corporate, Santander Visa) y el sistema lo lee: cierre, vencimiento (que es la fecha de pago), saldo, cuotas, dólares y cada renglón separado por tarjeta física y su responsable. Antes de guardar pregunta la empresa y la tarjeta y avisa si el resumen cierra al centavo. Si el banco cambió el plástico, lo reconoce por el responsable y guarda los dos números, el nuevo y el viejo.",
        como: "Bancos y tarjetas → Fichas de tarjetas y extractos → 📄 Leer resumen de tarjeta (PDF).",
        tab: "bancos",
      },
      {
        titulo: "Ficha por tarjeta, con la ficha de cada resumen",
        que: "Cada renglón del resumen es control: se linkea con el pago que se cargó con esa tarjeta (y la factura que paga) y con su cuota. El sistema sugiere el link cuando reconoce el monto y la fecha. Todos los pagos con esa tarjeta se pagan el día del vencimiento del resumen: recién ese día bajan de la cuenta del banco y figuran en el cash flow. Desde el 1/11/2026 linkear es obligatorio; con todo linkeado aparece el tilde verde «revisado y linkeado».",
        como: "Bancos y tarjetas → Fichas → Abrir ficha. Click derecho en un renglón: aceptar la sugerencia, linkear con un pago, mandar a comisiones o soltar.",
        tab: "bancos",
      },
      {
        titulo: "Comisiones, tasas e intereses",
        que: "Lo que en el resumen no es una compra (sellos, intereses, punitorios, IVA, percepciones) se suma solo en una deuda con el banco llamada «Comisiones, tasas e intereses (tarjeta)», asentada pagada con la misma tarjeta y con vencimiento el del resumen. Las del extracto se llaman «Comisiones, tasas e intereses (cuenta)». El banco es un solo proveedor para las dos empresas: la empresa la dice el pago.",
        como: "Se ve en la ficha del resumen y en Impuestos y comisiones.",
        tab: "bancos",
      },
      {
        titulo: "Ficha del extracto por cuenta y mes",
        que: "Cada movimiento del banco se linkea con lo que ya está en el sistema: el pago cargado (con su factura), el pago del resumen de una tarjeta, el cobro de un trabajo o un movimiento interno. Los impuestos y comisiones van solos a su deuda. Lo que no reconocés lo marcás como desconocido para reclamarlo. Con todo linkeado, nada desconocido y la cadena de saldos cerrada, el mes lleva el tilde verde.",
        como: "Bancos y tarjetas → Fichas → Cuentas → Abrir ficha. Click derecho en el movimiento.",
        tab: "bancos",
      },
      {
        titulo: "Desde la factura se ve el resumen",
        que: "Una factura pagada con tarjeta muestra en qué resumen se pagó y qué día se paga (💳). Si todavía no se linkeó, lo avisa en rojo. Con un click se abre la ficha de la tarjeta en ese resumen.",
        como: "Compras → Facturas de compra, y la ficha del proveedor en Pago a proveedores.",
        tab: "compras",
      },
      {
        titulo: "ARCA sugiere, no carga sola",
        que: "Al subir el listado de ARCA se abre una ventana de revisión y no se guarda nada hasta confirmar. Las facturas que ya están cargadas vienen marcadas y no se pueden duplicar. Si reconoce al proveedor, dice adónde va (y su grupo). Si es un proveedor nuevo pero hay otro con nombre parecido, hay que elegir si es el mismo o uno nuevo, para no duplicar proveedores.",
        como: "Compras → Facturas de compra → Importar listado de ARCA → revisar → Confirmar y cargar.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-30b",
    fecha: "30/10/2026",
    titulo: "Materiales por rubro y tipo",
    items: [
      {
        titulo: "El tipo de mueble o trabajo guarda materiales genéricos",
        que: "Cada material del tipo es un rubro y tipo con su cantidad (\"4,2 m² de placa\", \"2 correderas\") y el grupo de Stock de donde sale. El artículo sugerido es opcional y solo da un precio de referencia.",
        como: "Fabricación → Tipos de mueble o trabajo → abrir un tipo → Materiales.",
        tab: "fabricacion",
      },
      {
        titulo: "Elegir el artículo al presupuestar",
        que: "\"Pasar materiales de los muebles\" abre una ventana: la cantidad la da el tipo y vos elegís el artículo concreto entre los de su grupo (melamina blanca o símil madera, corredera telescópica u oculta). La cantidad se puede corregir a mano y se ve lo que daba el tipo. Al volver a pasarlos recuerda el artículo y la corrección.",
        como: "Presupuesto → Muebles del presupuesto → Pasar materiales de los muebles.",
        tab: "presupuesto",
      },
      {
        titulo: "Equivalencias y criterios",
        que: "Un bloque nuevo en Fabricación donde quedan asentados los criterios para pasar lo que dice el tipo a lo que se compra, cada uno con su porqué. Equivalencias: 1 placa = 4,5 m², 0,3 L de laca y 0,2 L de fondo por m². Cómo se compra: placas blancas, MDF y lacas incolora, blanca y negra son de compra intensiva (valor exacto con desperdicio); la laca de color, mínimo 3 L y después de a 1; el resto, para arriba. Lo que acompaña: el catalizador, la mitad de la laca usada.",
        como: "Fabricación → Equivalencias y criterios → ✎ Editar.",
        tab: "fabricacion",
      },
      {
        titulo: "Falta precio, bien a la vista",
        que: "Un material sin artículo elegido o con precio 0 queda en rojo en el presupuesto con \"⚠ FALTA PRECIO\": suma $0 hasta que se complete.",
        como: "Presupuesto → Materiales.",
        tab: "presupuesto",
      },
    ],
  },
  {
    id: "2026-10-30a",
    fecha: "30/10/2026",
    titulo: "Organización diaria más ágil",
    items: [
      {
        titulo: "La gente al lado del calendario",
        que: "La lista de empleados del día elegido se ve junto al calendario, con si está, su categoría y cómo tiene armado el día.",
        como: "Fabricación → Organización diaria.",
        tab: "fabricacion",
      },
      {
        titulo: "La ficha del día en ventana",
        que: "La ficha para cargar las tareas de cada persona se abre en una ventana emergente. Tiene el botón 👤 Ficha de personal: al cerrarla volvés a Fabricación con el mismo día y la misma ficha abierta.",
        como: "Click en la persona (o ✎ Ficha). Escape cierra.",
        tab: "fabricacion",
      },
      {
        titulo: "Checklist antes de producción",
        que: "Cada trabajo abierto muestra si tiene materiales, insumos y herrajes y accesorios. Se cumple solo si el stock alcanza (repartido entre los trabajos según cuándo lo necesitan) o se da el ok a mano, que queda firmado. El cronograma muestra si está listo y avisa si se pasan tareas sin estarlo.",
        como: "Fabricación → Checklist antes de producción → click en el trabajo.",
        tab: "fabricacion",
      },
      {
        titulo: "Faltantes de los presupuestos en bloques",
        que: "Los materiales guardados dentro de los bloques (subpresupuestos) ahora cuentan en los faltantes de stock y en las compras pendientes por trabajo. Antes esos trabajos figuraban sin faltantes.",
        como: "Fabricación y Compras: se ve solo.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-29a",
    fecha: "29/10/2026",
    titulo: "Pagos programados desde la factura",
    items: [
      {
        titulo: "El pago programado en la factura vuelve a verse",
        que: "Si en la factura cargás la fecha prevista del saldo y de qué cuenta sale, ese pago figura en Pagos programados y como egreso en el cash flow, en su fecha. La factura sola, sin pago programado, sigue sin aparecer.",
        como: "Compras → la factura → Fecha prevista del saldo + Sale de.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-28c",
    fecha: "28/10/2026",
    titulo: "Pagos programados más claros",
    items: [
      {
        titulo: "Cada pago dice de qué factura es",
        que: "En el calendario de Pagos programados los pagos de facturas figuran como 'Pago de factura 7189 · Proveedor'.",
        como: "Calendario anual → Pagos programados.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Es un calendario de pagos, no de facturas",
        que: "Cargar una factura ya no aparece en Pagos programados ni en el cash flow: los cargan los pagos y los cobros, y la factura se asocia a ellos como constancia. Cada pago figura en su fecha: pendiente hasta que llega el día y tachado después.",
        como: "Calendario anual → Pagos programados.",
        tab: "calendarioAnual",
      },
    ],
  },
  {
    id: "2026-10-28b",
    fecha: "28/10/2026",
    titulo: "Organización diaria con la asistencia",
    items: [
      {
        titulo: "Se ve quién está y quién no",
        que: "Cada empleado muestra si está o no está ese día según Asistencia (reloj, ausencias y vacaciones). El que no está no cuenta como gente para las tareas, y si tiene tareas armadas avisa para reasignarlas. 'Copiar el día anterior' no copia a los que no están.",
        como: "Fabricación → Organización diaria: al lado del nombre (✓ está / ✗ no está) y en los avisos del día.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-28a",
    fecha: "28/10/2026",
    titulo: "Personas por tipo de mueble y aviso de falta de gente",
    items: [
      {
        titulo: "El tipo de mueble dice cuántas personas lo hacen",
        que: "Cada tipo de mueble lleva la cantidad de personas que hacen sus tareas y las horas de cada tarea por mueble, contando con esa gente. Si no se cargan horas, sale del tiempo estándar de la tarea.",
        como: "Fabricación → Tipos de mueble → click derecho → Abrir ficha → Personas que lo hacen, y la columna Horas x mueble de la receta.",
        tab: "fabricacion",
      },
      {
        titulo: "La organización diaria avisa si falta gente",
        que: "Si ese día hay menos personas en una tarea de un trabajo que las que piden sus muebles, avisa cuántas horas lleva con la gente pedida y cuántas serían con la que hay, para revalorizar los horarios a mano o decidir horas extras.",
        como: "Fabricación → Organización diaria: el aviso aparece arriba de la línea temporal.",
        tab: "fabricacion",
      },
      {
        titulo: "Categorías internas por Tarea entera",
        que: "En las categorías internas se tildan Tareas enteras (con todo su paso a paso). Lo que estaba tildado por paso vale para la Tarea completa.",
        como: "Personal → Categorías internas → click derecho → Tareas…",
        tab: "personal",
      },
    ],
  },
  {
    id: "2026-10-27g",
    fecha: "27/10/2026",
    titulo: "Materiales de cada tipo de mueble",
    items: [
      {
        titulo: "Cada tipo de mueble lleva sus materiales",
        que: "Los tipos de mueble se nombran por su medida y cada uno lleva su lista de materiales de Stock (con el precio de hoy), por cada mueble. La cantidad es la exacta y se le suma un % de desperdicio editable: el del tipo vale para todos y cada material puede tener el suyo.",
        como: "Fabricación → Tipos de mueble → click derecho → Abrir ficha → Materiales: escribí para buscar en Stock.",
        tab: "fabricacion",
      },
      {
        titulo: "Del mueble al presupuesto",
        que: "En el presupuesto, 'Pasar materiales de los muebles' carga en Materiales todo lo que llevan los muebles elegidos (cantidad de muebles × cantidad con desperdicio, al precio de Stock). Si se vuelve a pasar, reemplaza lo anterior; lo cargado a mano queda.",
        como: "Presupuesto → Muebles del presupuesto → Pasar materiales de los muebles.",
        tab: "presupuesto",
      },
    ],
  },
  {
    id: "2026-10-27f",
    fecha: "27/10/2026",
    titulo: "El IVA de los trabajos sale del % de facturación acordado",
    items: [
      {
        titulo: "IVA de los trabajos siempre por fórmula",
        que: "El IVA de cada trabajo sale siempre de la fórmula: neto × % de facturación acordado × 21% (más el IVA de los adicionales en blanco). Las facturas cargadas no cambian lo que se cobra: si una está mal o vacía se cobra igual lo acordado, y la ficha avisa qué hay que acomodar (factura vacía, facturado de más, IVA que no es el 21% del neto).",
        como: "Trabajos aprobados → ficha → Resumen económico (los avisos van arriba, en naranja).",
        tab: "aprobados",
      },
      {
        titulo: "El bruto desglosado en neto + IVA",
        que: "Al pasar el mouse sobre un trabajo (o con click derecho) se ve el bruto a cobrar partido en neto + IVA, lo que falta facturar (neto + IVA) y lo que falta cobrar (blanco con su IVA + negro).",
        como: "Trabajos aprobados → pasar el mouse sobre el trabajo, o click derecho.",
        tab: "aprobados",
      },
      {
        titulo: "Anticipo blanco y negro",
        que: "El anticipo es el % de anticipo del neto más el IVA de lo facturado. Primero se completa el blanco (lo facturado con todo su IVA) y lo que sobra del anticipo va al negro. Ej.: neto $7.104.323, 50% facturado, 70% de anticipo: blanco $4.298.115 y negro $1.420.865. La precarga de cobros usa la misma cuenta.",
        como: "Trabajos aprobados → ficha → Resumen económico → Anticipo a cobrar.",
        tab: "aprobados",
      },
    ],
  },
  {
    id: "2026-10-27e",
    fecha: "27/10/2026",
    titulo: "Cierre de ejercicio automático y trabajos terminados",
    items: [
      {
        titulo: "El cierre del año se abre solo",
        que: "Terminado el ejercicio (desde el 1/11), al administrador se le abre el asistente de cierre: revisar lo que sigue abierto, controlar bancos y efectivo (se corrige la plata real para arrancar sin diferencias) y cerrar cada empresa. Hasta cerrarlo queda un aviso arriba para retomarlo. No se borra nada: lo del año queda para mirar y lo que sigue en proceso pasa al año nuevo.",
        como: "Aparece solo. También: aviso naranja arriba → Hacer el cierre.",
        tab: "cashflow",
      },
      {
        titulo: "Qué ejercicio estás mirando",
        que: "En el Calendario anual y en Balance, un cartel dice si estás en el ejercicio corriente o en el anterior (cerrado, solo lectura), con un botón para volver al corriente.",
        como: "Calendario anual / Balance: arriba de todo.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Lo del ejercicio cerrado queda escondido",
        que: "Después del cierre, en Compras, Pago a proveedores, Caja chica y Trabajos aprobados lo ya terminado del ejercicio cerrado (facturas pagas, pagos, cajas cerradas, trabajos terminados) no se ve. Lo que sigue abierto se ve siempre. Con 'Ver ejercicio cerrado' vuelve a aparecer, en solo lectura. Los totales y saldos no cambian: se calculan con todo.",
        como: "Arriba de esas solapas: Ver ejercicio cerrado / Esconder el ejercicio cerrado.",
        tab: "compras",
      },
      {
        titulo: "Trabajos terminados aparte",
        que: "Los trabajos finalizados y sin pendientes bajan a una sección 'Terminados' por empresa, minimizada. Para finalizar uno, un cartel muestra lo que falta (factura, cobro, comisión) y decidís: finalizarlo igual o, si la diferencia en los cobros es un redondeo, cerrarla como arqueo de caja.",
        como: "Trabajos aprobados → click derecho → Marcar como finalizado… (o Estado → Finalizado en la ficha).",
        tab: "aprobados",
      },
      {
        titulo: "Grupo de costos 'Arqueo de caja'",
        que: "La diferencia con la que se cierra un trabajo va a Costos en el grupo Arqueo de caja: lo que no se cobró suma y lo cobrado de más resta, así se ve cómo evoluciona. No es un pago: no toca el banco ni el cash flow.",
        como: "Compras y análisis de gastos → Composición / Grupos de costos.",
        tab: "compras",
      },
    ],
  },
  {
    id: "2026-10-27d",
    fecha: "27/10/2026",
    titulo: "Tipos de mueble: se eligen las tareas desde la ficha",
    items: [
      {
        titulo: "Tareas con su paso a paso",
        que: "Lo que antes se llamaba grupo de trabajo ahora es la TAREA (Corte CNC, Pegado de cantos, Armado…) y lo de adentro es su PASO A PASO, siempre el mismo. En cada tarea se eligen las máquinas y herramientas que necesita. Está al fondo de Fabricación.",
        como: "Fabricación → al fondo, Tareas y su paso a paso → 🛠 Máquinas y herramientas…",
        tab: "fabricacion",
      },
      {
        titulo: "La ficha del tipo de mueble",
        que: "El bloque Tipos de mueble muestra la lista ordenada por nombre (se corrige en la misma fila). Al abrir un tipo como ficha se tildan las tareas que lleva; cada una entra con su paso a paso.",
        como: "Fabricación → Tipos de mueble → click derecho → Abrir ficha.",
        tab: "fabricacion",
      },
    ],
  },
  {
    id: "2026-10-27c",
    fecha: "27/10/2026",
    titulo: "Facturas programadas en el cash flow, fichas emergentes y débito automático",
    items: [
      {
        titulo: "Toda factura programada se ve en el cash flow",
        que: "Si a un proveedor ya se le había pagado otra factura en el mes, la planilla daba por cubierta la que faltaba y no mostraba su ≈ (pasaba con Expocolor y con cuatro de Dac). Ahora cada factura programada se ve hasta que se paga ESA factura.",
        como: "Calendario anual: la fila del proveedor muestra el ≈ el día que vence.",
        tab: "calendarioAnual",
      },
      {
        titulo: "Alto de las filas fijadas",
        que: "Las filas fijadas de arriba del cash flow (totales, plata disponible, neto) se agrandan o achican, para que los números se vean en cualquier pantalla.",
        como: "Calendario anual → 'Filas fijadas' − / + al lado de Compacto.",
        tab: "calendarioAnual",
      },
      {
        titulo: "La ficha del trabajo y la del personal se abren como ventana",
        que: "Igual que la ficha del proveedor: se abre encima de la solapa y se cierra con Cerrar o tocando afuera.",
        como: "Trabajos aprobados → abrir un trabajo · Personal → abrir una persona.",
        tab: "aprobados",
      },
      {
        titulo: "Débito automático y proveedores de las dos empresas",
        que: "En la condición de pago del proveedor se marca 'Débito automático' y se elige la tarjeta: sus facturas se pagan con el resumen de esa tarjeta y no se programan aparte. Un proveedor puede ser de las dos empresas; su ficha muestra la cuenta de cada empresa por separado (solo las que puede ver cada uno).",
        como: "Ficha del proveedor → Condición de pago habitual. Al dar de alta: Empresa → Las dos empresas.",
        tab: "compras",
      },
      {
        titulo: "Caja chica ya no es un grupo de costos",
        que: "La caja chica es solo la rendición: cada gasto rendido va a uno de los grupos existentes (Operativos, Compras y materiales…). Al rendir, el grupo es obligatorio. Y en la ficha de caja chica cada gasto tiene un botón ✎ Editar para abrirlo y corregirlo.",
        como: "Caja chica → ficha de la persona → Rendiciones → ✎ Editar.",
        tab: "cajaChica",
      },
      {
        titulo: "Composición fijos / variables por mes",
        que: "Los bloques Composición y Grupos de costos ocupan todo el ancho. La composición se filtra por mes y los gastos van ordenados por fecha de factura.",
        como: "Compras y análisis de gastos → Composición → elegir el mes arriba a la derecha.",
        tab: "compras",
      },
    ],
  },
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
        que: "Click derecho sobre un grupo: se cobra solo en los presupuestos de su empresa, en los de las dos o en ninguno. 'Las dos' es solo para presupuestar (la hoja de presupuesto es la misma): el gasto sigue siendo únicamente de la empresa que lo paga, no se duplica. Por defecto impactan los grupos fijos cargados a mano; los variables y los automáticos (Personal) no, porque ya entran al presupuesto por materiales y mano de obra. Ahora un presupuesto de BGA ya no toma los costos fijos de De Raíz (y al revés), salvo los marcados 'las dos'.",
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
