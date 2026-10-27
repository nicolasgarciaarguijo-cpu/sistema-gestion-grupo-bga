// Contenido del manual de operacion, por solapa. La solapa "Manual" arma el manual de cada usuario
// mostrando SOLO las secciones de las solapas a las que tiene permiso (se actualiza con los permisos).
// El contenido es didactico: para que sirve, paso a paso, semaforos y errores comunes. Los bloques
// "image" son huecos para las capturas (se agregan mas adelante).
import type { TabKey } from "../domain/types";
import { MANUAL_FIGURES } from "./manualFigures";

export type ManualBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "warn"; text: string }
  | { type: "tip"; text: string }
  | { type: "image"; caption: string; src?: string; svg?: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "faq"; items: { q: string; a: string }[] };

export type ManualSection = { heading: string; blocks: ManualBlock[] };

export type ManualEntry = {
  tabKey: TabKey;
  title: string;
  emoji: string;
  intro: string;
  sections: ManualSection[];
};

export const MANUAL_ENTRIES: ManualEntry[] = [
  {
    tabKey: "acceso",
    title: "Acceso y seguridad",
    emoji: "🔐",
    intro:
      "Es la puerta de entrada al sistema. Aca inicias sesion con tu usuario y ves con que empresa y solapas trabajas segun tus permisos.",
    sections: [
      {
        heading: "Como ingresar",
        blocks: [
          {
            type: "steps",
            items: [
              "Abri el sistema en Chrome o Edge (algunas funciones, como la carga por carpeta, solo andan en esos navegadores).",
              "Escribi tu correo y tu contraseña, y toca Ingresar.",
              "Vas a ver arriba tu nombre y la vista de empresa (BGA, De Raiz o General).",
            ],
          },
          { type: "image", caption: "Pantalla de inicio de sesion", svg: MANUAL_FIGURES.acceso },
        ],
      },
      {
        heading: "Vista por empresa",
        blocks: [
          {
            type: "p",
            text: "El sistema separa por empresa con un codigo de color: AZUL = BGA, MARRON = De Raiz, GRIS = General (lo compartido). Segun tus permisos vas a ver una empresa, la otra, o las dos.",
          },
          {
            type: "tip",
            text: "Si solo tenes acceso a una empresa, todo lo que cargues y veas es de esa empresa. No te preocupes por elegir mal.",
          },
        ],
      },
      {
        heading: "Que solapas ves",
        blocks: [
          {
            type: "p",
            text: "Las solapas de la izquierda dependen de tus permisos. Si te falta una que necesitas, pedila al administrador; cuando te la habiliten, aparece sola (y este manual suma esa seccion).",
          },
        ],
      },
    ],
  },
  {
    tabKey: "aprobados",
    title: "Trabajos aprobados",
    emoji: "✅",
    intro:
      "Es el corazon operativo: cada trabajo vendido vive aca con su precio, su avance, su facturacion y su cobranza. Desde este trabajo se alimentan Facturacion, Fabricacion y los reportes.",
    sections: [
      {
        heading: "Estado de cada cobro: realizado, estimado o inamovible",
        blocks: [
          { type: "p", text: "Cada cobro de un trabajo tiene un estado. REALIZADO es plata que entró y suma. ESTIMADO (violeta) e INAMOVIBLE (rojo) son la fecha en que se espera cobrar: se ven en la ficha y en el Calendario con '≈', pero NO suman en el cobrado, ni en la planilla, ni en la plata disponible." },
          { type: "steps", items: ["En la ficha del trabajo, en Cobranzas, tocá '+ Cobro estimado' (o 'Agregar cobranza' para uno ya cobrado).", "Arriba de cada cobro elegí el estado: COBRO REALIZADO, COBRO ESTIMADO o COBRO INAMOVIBLE.", "Cuando la plata entra, cambialo a REALIZADO y poné la fecha real: recién ahí empieza a sumar."] },
          { type: "tip", text: "Desde el Calendario: click derecho sobre la celda violeta o roja del trabajo → 'Ya se cobró este día'." }
        ],
      },
      {
        heading: "💾 Guardar este trabajo",
        blocks: [
          { type: "p", text: "El botón verde de arriba de la ficha sube el trabajo al servidor en el momento (sin esperar el guardado automático) y lo verifica releyéndolo: facturas, cobros, adicionales, descuentos y comisiones." },
          { type: "steps", items: ["Cargá lo que necesites en la ficha.", "Tocá '💾 Guardar este trabajo'.", "Esperá el mensaje verde 'Guardado y verificado en el servidor' con la hora y la cantidad de facturas, cobros y adicionales."] },
          { type: "warn", text: "Si sale en rojo, NO cierres ni recargues la página: volvé a apretar el botón. Si sigue en rojo, avisá antes de seguir cargando." }
        ],
      },
      {
        heading: "A cobrar y el IVA de los adicionales",
        blocks: [
          { type: "p", text: "A cobrar = precio neto + adicionales (blancos y negros) − descuentos + IVA facturado + IVA de los adicionales blancos que todavía no se facturaron. El IVA de cada adicional se cuenta una sola vez: si ya se facturó, va en el IVA de la factura; si no, aparece como 'IVA adicionales sin facturar'." },
          { type: "tip", text: "Si un adicional se cobra en negro, marcalo como NEGRO: no lleva IVA. Un descuento cargalo en Descuentos, no como adicional negativo." }
        ],
      },
      {
        heading: "Trabajo terminado",
        blocks: [
          { type: "p", text: "Un trabajo COMPLETO y FINALIZADO (todo cobrado y comisión paga) se ve celeste y tachado con una línea suave en la lista. En el Calendario, su renglón desaparece el mes siguiente a su último movimiento. Si figura finalizado pero le falta algo, se ve en rojo con ⚠." }
        ],
      },
      {
        heading: "La lista y la ficha del trabajo",
        blocks: [
          {
            type: "p",
            text: "A la izquierda ves la lista de trabajos por empresa, con su saldo pendiente. Al tocar uno, se abre su ficha a la derecha con todos los datos y el Resumen economico.",
          },
          { type: "image", caption: "Lista de trabajos y ficha abierta", svg: MANUAL_FIGURES.aprobados },
        ],
      },
      {
        heading: "El Resumen economico (que significa cada linea)",
        blocks: [
          {
            type: "table",
            headers: ["Linea", "Que es"],
            rows: [
              ["Neto presupuesto", "El neto vendido, sin IVA (el presupuesto se maneja en netos)."],
              ["% facturado", "Cuanto del trabajo va por factura (blanco); el resto va en negro. Lo fija Trabajos aprobados."],
              ["IVA 21%", "El IVA, calculado SOLO sobre la parte facturada."],
              ["Valor a cobrar (bruto)", "El bruto del trabajo = neto + IVA facturado + adicionales. Siempre es igual a anticipo + saldo."],
              ["Anticipo a cobrar", "70% del neto + IVA facturado."],
              ["Saldo", "Lo que falta cobrar despues del anticipo (bruto - anticipo)."],
            ],
          },
          {
            type: "warn",
            text: "El IVA se calcula sobre lo FACTURADO, no sobre el total: si facturas el 50%, el IVA es del 50% (el resto va en negro, sin factura).",
          },
          {
            type: "tip",
            text: "El bruto del trabajo siempre es completo: valor a cobrar = anticipo + saldo. Puede diferir del bruto del presupuesto porque el presupuesto se maneja en NETOS y, una vez aprobado el trabajo, en BRUTOS. Lo que rige el % facturado es Trabajos aprobados, no el presupuesto.",
          },
        ],
      },
      {
        heading: "Cargar una factura",
        blocks: [
          {
            type: "steps",
            items: [
              "Abri el trabajo y busca el bloque de facturacion.",
              "Carga el subtotal (neto) y la alicuota (%). El IVA y el total se calculan solos.",
              "Guarda. Se actualiza el % facturado y el resumen.",
            ],
          },
        ],
      },
      {
        heading: "Cargar un pago (cobranza)",
        blocks: [
          {
            type: "steps",
            items: [
              "En el trabajo, toca Agregar pago.",
              "Poné monto, fecha y administracion (blanco o negro).",
              "Guarda. El saldo se recalcula y el pago aparece en el calendario de Facturacion.",
            ],
          },
          {
            type: "tip",
            text: "Podes exportar un recibo del pago para entregar al cliente, con el trabajo, lo pagado y el saldo.",
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Como se define el % facturado (blanco) de un trabajo?",
                a: "Es un acuerdo entre el cliente y la empresa, teniendo en cuenta el desbalance entre blanco y negro. Se fija al aprobar el trabajo, antes de cobrar el anticipo, y despues NO se modifica. Como minimo deberia facturarse la mitad (50 %); lo ideal es el 100 %.",
              },
              {
                q: "¿El anticipo siempre se cobra? ¿De cuanto es?",
                a: "Si, siempre. Es lo que fija la fecha de inicio para Fabricacion y permite dar una fecha de entrega real. Es el 70 % del neto + el IVA facturado. En algunos casos puede ser un porcentaje menor.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "facturacion",
    title: "Facturacion y cobranzas",
    emoji: "📄",
    intro:
      "Aca segui la plata de todos los trabajos: cuanto se facturo, cuanto se cobro y que falta. No se cargan trabajos aca (eso es en Trabajos aprobados); aca ves el estado y el calendario.",
    sections: [
      {
        heading: "Lo que ves al entrar",
        blocks: [
          {
            type: "bullets",
            items: [
              "Semaforo de cobros, pagos y fechas: tres luces de resumen.",
              "Calendario anual unificado: los 12 meses del año fiscal, cada mes se abre o se minimiza.",
              "Calendario mensual: el mes en detalle, dia por dia.",
              "Fichas por trabajo: una tarjeta por trabajo activo, con su evolucion y su semaforo.",
            ],
          },
          { type: "image", caption: "Solapa Facturacion completa", svg: MANUAL_FIGURES.facturacion },
        ],
      },
      {
        heading: "Blanco y negro",
        blocks: [
          {
            type: "p",
            text: "Cada factura y cada pago tiene una administracion: blanco o negro. En el calendario, lo blanco se ve claro y lo negro oscuro, para distinguir los dos circuitos de un vistazo. La 'B' o 'N' en cada item lo confirma.",
          },
          {
            type: "warn",
            text: "Antes de guardar un pago, revisa el selector de administracion. Si queda en negro sin querer, se va a ver oscuro y va a sumar al circuito negro.",
          },
        ],
      },
      {
        heading: "Semaforos de las fichas",
        blocks: [
          {
            type: "table",
            headers: ["Luz", "Significa"],
            rows: [
              ["Verde", "Al dia: facturado y cobrado."],
              ["Amarillo", "Falta facturar o cobrar (trabajo en curso)."],
              ["Rojo", "Trabajo finalizado con pendientes: hay que corregir."],
            ],
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Se cargan trabajos o facturas nuevas aca?",
                a: "No. Los trabajos, sus facturas y sus pagos se cargan en Trabajos aprobados. En esta solapa solo ves el estado, el calendario y los semaforos.",
              },
              {
                q: "¿Quien usa esta solapa?",
                a: "Hoy suele ser la misma persona que carga los trabajos, pero la idea a futuro es que sea administracion, separada de quien vende o carga.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "cashflow",
    title: "Balance, cash flow y resultados",
    emoji: "📊",
    intro:
      "Es el tablero financiero. Aca ves el balance de facturacion y cobranza, el estado de resultados y el cash flow, todo por empresa y por periodo (año fiscal o mes).",
    sections: [
      {
        heading: "Retiros societarios",
        blocks: [
          { type: "p", text: "Lo que retiran los socios. No es un gasto de funcionamiento: sale del resultado. Cada retiro sale de su cuenta y aparece en el Calendario en EGRESOS · RETIROS SOCIETARIOS." },
          { type: "steps", items: ["En Balance, en el bloque 'Retiros societarios', tocá '+ Retiro'.", "Completá fecha, empresa, socio, monto, moneda, blanco o negro, de qué cuenta sale y el motivo.", "Arriba ves lo retirado en el período y 'resultado − retiros'; abajo, los totales por socio."] },
          { type: "tip", text: "También se carga desde el Calendario, en el renglón 'Retiros de socios' (te pide el socio)." }
        ],
      },
      {
        heading: "Cierre de ejercicio con arqueo",
        blocks: [
          { type: "p", text: "El ejercicio va de noviembre a octubre. Al cerrarlo, el sistema pide la plata REAL de cada cuenta (cada banco, efectivo blanco, efectivo negro, en pesos y en dólares, y las cajas por persona). El ejercicio nuevo arranca con esa plata contada." },
          { type: "steps", items: ["Balance → Cierre de ejercicio → Cerrar (solo el administrador, y con la carpeta del sistema vinculada).", "En la ventana del arqueo, cargá en cada cuenta lo que hay de verdad al último día del ejercicio.", "Si no coincide con el sistema, elegí el motivo: retiro de socios (falta plata), aporte de socios (sobra), diferencia de arqueo u otro, con su explicación.", "Confirmá el arqueo. El sistema guarda todo en la carpeta y pide escribir CERRAR."] },
          { type: "warn", text: "Un retiro o un aporte del arqueo queda asentado solo (en Retiros societarios o en Movimientos internos) con fecha del último día del ejercicio." },
          { type: "tip", text: "El año cerrado se sigue viendo entero, pero solo el superadmin puede editarlo. En los calendarios, una línea violeta marca el salto de año." }
        ],
      },
      {
        heading: "El selector de arriba (empresa y periodo)",
        blocks: [
          {
            type: "p",
            text: "Elegis la empresa (Todas / BGA / De Raiz) y el periodo (Año fiscal / Mes / Todo). Todo lo que ves abajo respeta esa eleccion. El año fiscal arranca en noviembre (configurable por empresa).",
          },
          { type: "image", caption: "Selector de empresa y periodo", svg: MANUAL_FIGURES.cashflow },
        ],
      },
      {
        heading: "Balance",
        blocks: [
          {
            type: "bullets",
            items: [
              "Facturado: lo emitido, cortado por fecha de factura.",
              "Cobrado: total, blanco y negro, cortado por fecha de pago.",
              "Adeudado: lo que falta cobrar, con desglose estimado blanco/negro.",
            ],
          },
        ],
      },
      {
        heading: "Estado de resultados y cash flow",
        blocks: [
          {
            type: "p",
            text: "El estado de resultados del periodo (base percibido) muestra ingresos (cobros) menos egresos (compras, caja chica, comisiones, nomina y amortizacion), separado en blanco y negro. El cash flow muestra el flujo operativo (cobros menos pagos) y el movimiento del banco aparte.",
          },
          {
            type: "warn",
            text: "La nomina del periodo sale del historico mes a mes. Si faltan meses cargados en Personal, el costo laboral va a salir bajo hasta completarlo.",
          },
        ],
      },
      {
        heading: "Año fiscal por empresa",
        blocks: [
          {
            type: "p",
            text: "En el desplegable 'Año fiscal por empresa' podes cambiar el mes de inicio de cada empresa (por defecto noviembre). Sirve si sumas una empresa con otro calendario.",
          },
        ],
      },
    ],
  },
  {
    tabKey: "compras",
    title: "Compras y análisis de gastos",
    emoji: "🛒",
    intro:
      "Todos los pagos del sistema analizados por grupo, las facturas de compra con su pago, las cuentas corrientes y la ficha de cada proveedor.",
    sections: [
      {
        heading: "Facturas de compra: el listado y la ventana",
        blocks: [
          { type: "p", text: "Cada factura en una fila con su estado de pago: ✓ pagada (fecha y cómo), sin pagar con su fecha prevista y su estado, o sin pagar sin fecha. La marca 'cta cte' o 'nuevo' dice si el proveedor tiene cuenta corriente o todavía no está en el listado." },
          { type: "steps", items: ["Tocá '+ Agregar factura'.", "1 · Proveedor: elegilo de la lista de habituales o escribí uno nuevo (y tildá darlo de alta).", "2 · Factura: letra, número, fecha, neto, IVA, total, circuito y tipo de gasto.", "3 · Pago: si se pagó, registrá fecha, monto, cómo y de qué cuenta (o vinculá un pago ya cargado); si no, la fecha prevista y el estado.", "Guardá. El pago queda en el cash flow; lo que falta pagar va a Pagos programados."] },
          { type: "tip", text: "Click en una factura para verla o editarla; 'Asignar pago' en las que faltan pagar; click derecho para abrir la ficha del proveedor." },
        ],
      },
      {
        heading: "Análisis de gastos",
        blocks: [
          { type: "p", text: "Arriba de la solapa están TODOS los egresos del sistema, cargados en la solapa que sea, agrupados en: gastos de personal, gastos empresariales (IVA, impuestos), funcionamiento, materiales e insumos, bancos y tarjetas, deudas y créditos, seguros, caja chica y viáticos. Blanco y negro siempre separados; dólares aparte." },
          { type: "steps", items: ["Elegí el mes y la empresa.", "Tocá un grupo para ver sus renglones, y un renglón para ver cada pago (fecha, de qué solapa vino, B/N, F/V y estado).", "La última columna, 'Previsto', es lo que viene (programado, estimado, inamovible): no suma en los totales."] },
          { type: "tip", text: "Click derecho sobre un pago → 'Ir a' la solapa donde se cargó." }
        ],
      },
      {
        heading: "Fijo o variable, con candado",
        blocks: [
          { type: "p", text: "El tipo de gasto (el renglón) dice si es FIJO o VARIABLE. Con el candado 🔒, todos los pagos de ese tipo quedan así; sin candado es una sugerencia y cada pago puede tener el suyo." },
          { type: "steps", items: ["Click derecho sobre un renglón (en el Análisis o en el Calendario anual) → Fijo o Variable.", "Para fijarlo para todos sus pagos: '🔒 Candado'.", "Para un pago puntual (si su tipo no tiene candado): click derecho sobre el pago → 'Este pago es fijo / variable'."] }
        ],
      },
      {
        heading: "Ficha del proveedor",
        blocks: [
          { type: "p", text: "Click derecho sobre una cuenta corriente o una factura abre la ficha: datos, tipo de gasto con candado, condición de pago habitual, cuenta corriente, próximos pagos e historial." },
          { type: "bullets", items: ["Tipo de gasto con 🔒: cada factura y cada pago nuevo del proveedor quedan clasificados solos.", "Condición de pago (contado, a N días o el día X de cada mes): cada factura sin pagar toma su fecha de pago y aparece en Pagos programados.", "Próximos pagos: podés cambiar la fecha de pago de cada factura ahí mismo."] }
        ],
      },
      {
        heading: "Cargar una factura de compra",
        blocks: [
          {
            type: "steps",
            items: [
              "Toca nueva factura de compra.",
              "Poné proveedor, fecha, numeros y montos (neto, IVA, total).",
              "Si cargas una factura, la compra es blanca (una factura siempre va en blanco).",
              "Guarda. Suma al circuito que corresponde en Contabilidad.",
            ],
          },
          {
            type: "tip",
            text: "Si tenes el PDF o la foto de la factura, se puede leer con OCR para ahorrar tipeo, o cargarla por la carpeta vinculada (solapa Documentos).",
          },
        ],
      },
      {
        heading: "Necesidades de compra",
        blocks: [
          {
            type: "p",
            text: "El sistema cruza los materiales de los trabajos con el stock y te muestra que falta comprar y cuanto. Un semaforo marca lo que esta cubierto, parcial o faltante.",
          },
          { type: "image", caption: "Listado de necesidades de compra", svg: MANUAL_FIGURES.compras },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Una compra es blanca o negra?",
                a: "Si hay factura, es BLANCA: una factura siempre va en blanco, no existe factura en negro. Una compra en negro NO tiene factura; a lo sumo se adjunta un presupuesto como comprobante visual, pero eso no es una factura.",
              },
              {
                q: "¿Las necesidades de compra se vinculan con la factura?",
                a: "No. Las necesidades sirven para salir a comprar por afuera; despues registras la factura, que no queda atada al pedido. Lo que descuenta la necesidad es el ingreso al stock. Puede pasar que no haya factura y que igual aparezca el stock, segun como se consiguio.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "desendeudamiento",
    title: "Desendeudamiento",
    emoji: "📉",
    intro:
      "Todas las deudas de la empresa que se pagan en cuotas: planes de pago, préstamos externos y financiaciones de equipos. Los préstamos entre socios o entre las empresas NO van acá: son movimientos internos.",
    sections: [
      {
        heading: "Cargar una deuda",
        blocks: [
          { type: "p", text: "Cada deuda se trata como un proveedor: tiene un acreedor (a quién se le debe), un tipo, la empresa, el grupo de costo donde van sus pagos en el cash flow y si es blanco o negro." },
          { type: "steps", items: ["Tocá '+ Agregar deuda'.", "Completá concepto, acreedor, tipo, empresa, grupo de costo y circuito.", "Estipulá las cuotas: primera fecha, cantidad y monto por cuota, y 'Agregar cuotas'. Cada cuota se puede corregir (fecha y monto).", "'Rehacer pendientes' reemplaza las cuotas impagas por un cronograma nuevo; las pagadas quedan."] }
        ],
      },
      {
        heading: "Pagar una cuota",
        blocks: [
          { type: "p", text: "Click derecho sobre la cuota → 'Asignar el pago'. Se carga un pago nuevo (fecha, monto, cómo se pagó y de qué cuenta) o se vincula uno ya cargado. Ese pago va al cash flow en EGRESOS · PROVEEDORES, en el grupo de la deuda, con el nombre del acreedor. Si sale del banco, lo cuenta el débito del extracto (no se duplica)." },
          { type: "tip", text: "Las cuotas pendientes aparecen en la agenda de pagos inamovibles. Una cuota vencida sin pago se pinta de rojo." }
        ],
      },
    ],
  },
  {
    tabKey: "cajaChica",
    title: "Caja chica",
    emoji: "💵",
    intro:
      "La solapa muestra solo el listado de las cajas chicas asignadas y los tipos de caja. Todo lo de cada persona está en su ficha: click derecho sobre el responsable. La caja no va al cash flow; sus gastos sí, como pago a cada proveedor.",
    sections: [
      {
        heading: "Asignar una caja chica",
        blocks: [
          { type: "steps", items: ["Tocá '+ Nueva caja chica'.", "Mirá el resumen de fondos de arriba (asignado, utilizado y lo que resta, blanco y negro).", "Elegí responsable, tipo de caja (General, Viáticos u otro), empresa, fecha, monto en blanco y en negro, y de qué cuenta sale.", "Guardá: aparece en el listado con lo utilizado y lo que resta."] },
          { type: "tip", text: "Los tipos de caja se agregan, renombran o quitan en el bloque 'Tipos de cajas chicas' (click derecho sobre el tipo). Los viáticos son un tipo de caja chica." }
        ],
      },
      {
        heading: "La ficha del responsable",
        blocks: [
          { type: "p", text: "Click derecho sobre el nombre del responsable abre su ficha: el historial de sus cajas (click derecho para editar, cerrar, reabrir o quitar una), sus rendiciones, en qué se gastó por grupo de costo, sus viáticos anteriores y las facturas que pagó de su bolsillo." },
          { type: "steps", items: ["'+ Rendir gasto' o '📷 Leer ticket o factura' (el lector precarga fecha, monto y proveedor).", "Elegí el proveedor habitual o uno nuevo (se le abre ficha) y el grupo de costo (si el proveedor tiene candado, va a su grupo).", "Si es en blanco, cargá la factura (letra, número, neto e IVA): queda en Compras y en la ficha del proveedor, pagada por la caja chica.", "El pago va al cash flow como pago al proveedor."] }
        ],
      },
      {
        heading: "Viáticos fijos",
        blocks: [
          { type: "p", text: "Si un viático es fijo, es parte del acuerdo del empleado: se carga en su ficha de Personal (viático fijo mensual blanco y negro, y desde qué mes) y sale solo cada mes, el día de pago del sueldo." },
          { type: "tip", text: "La tabla 'Viáticos fijos del personal' muestra quién lo tiene y el total mensual. Para cambiarlo, andá a la ficha del empleado." }
        ],
      },
      {
        heading: "Cajas (abiertas y cerradas)",
        blocks: [
          {
            type: "p",
            text: "Cada caja tiene un responsable y un monto asignado. Un semaforo avisa cuando queda poco saldo o se agoto, para reponerlo. Cuando una caja se termina de rendir se marca como cerrada y pasa a 'Cajas cerradas'.",
          },
        ],
      },
      {
        heading: "Cargar un gasto",
        blocks: [
          {
            type: "steps",
            items: [
              "Elegi la caja.",
              "Poné fecha, categoria, descripcion y monto.",
              "Marca la administracion (blanco o negro).",
              "Guarda. El saldo de la caja baja y el gasto entra en Contabilidad.",
            ],
          },
          {
            type: "tip",
            text: "El pago a un empleado temporal se carga aca como un gasto (negro), con el beneficiario. De ese gasto sale su recibo.",
          },
        ],
      },
      {
        heading: "Cargar un ticket con OCR (foto o PDF)",
        blocks: [
          {
            type: "steps",
            items: [
              "En 'Cargar ticket con OCR', elegi la foto o el PDF del ticket.",
              "El sistema lo lee y precompleta un borrador con monto, fecha y proveedor.",
              "Revisá y corregí lo que haga falta (sobre todo el monto y si es blanco o negro).",
              "Guardar gasto: crea el gasto en la caja.",
            ],
          },
          {
            type: "warn",
            text: "El OCR precompleta pero NO es infalible: siempre revisa el monto antes de guardar. Por defecto entra como negro; cambialo si corresponde.",
          },
        ],
      },
      {
        heading: "La carpeta de caja chica (doble via)",
        blocks: [
          {
            type: "p",
            text: "Al exportar, el sistema crea una carpeta por caja con su resumen y una subcarpeta 'Rendicion de tickets y facturas'. Si dejas ahi las fotos de los tickets, al Sincronizar (solapa Documentos) el sistema los lee por OCR y crea los gastos solos. Asi la caja va por las dos vias: la que cargas a mano y la que dejas en la carpeta.",
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Cuando un gasto es blanco y cuando es negro?",
                a: "Es BLANCO cuando la plata sale de la administracion blanca: una transferencia por el monto de la caja, la tarjeta de credito o debito de la empresa, o efectivo blanco. Es NEGRO cuando no entra al circuito blanco: siempre en efectivo, y viene de una cobranza en negro que no se facturo.",
              },
              {
                q: "¿Quien carga la rendicion de tickets de la carpeta?",
                a: "La carga un responsable administrativo (o quien este autorizado a ver esas carpetas), NO los responsables de cada caja. Ellos solo dejan los tickets en la carpeta; administracion los rinde.",
              },
              {
                q: "¿El pago a un empleado temporal sale de aca?",
                a: "Si. Se carga como gasto de caja chica en negro, con el beneficiario, y de ahi sale su recibo de pago.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "presupuesto",
    title: "Presupuesto actual",
    emoji: "🧮",
    intro:
      "Armas el presupuesto de un trabajo: materiales, mano de obra, costos y precio final para el cliente.",
    sections: [
      {
        heading: "Muebles del presupuesto (horas por tipo de mueble)",
        blocks: [
          { type: "p", text: "Cada bloque puede llevar sus muebles: el tipo (de Fabricación → Tipos de mueble), cuántos y sus medidas. Las horas salen de la receta del tipo: las tareas por medida usan las medidas y las que salen de materiales (bisagras, placas, cajones...) usan lo cotizado en el bloque. Si dos muebles usan el mismo rubro, lo cotizado se reparte según cuántos son." },
          { type: "steps", items: ["Presupuesto → Muebles del presupuesto → '+ Mueble…' y elegí el tipo.", "Corregí cantidad y medidas en la fila. Click en las horas (o click derecho → Tareas y materiales…) para ver cada tarea y fijar a mano la cantidad de un rubro.", "Abajo, 'Quién hace qué': cada tarea la hace la persona que sabe hacerla (por sus categorías internas) con el costo hora más alto; si está ocupada con otra tarea en paralelo, la toma el siguiente que sabe, para terminar lo antes posible. Las tareas de 2 o más personas (columna Personas del catálogo de tareas) las encabeza un especialista y lo ayudan aprendices o ayudantes de cualquier rumbo (por su categoría interna, no la de contratación). Si no alcanzan, completa un especialista y el presupuesto avisa, para evaluar contratar un ayudante. El tiempo es el mismo y las horas-hombre y el costo se multiplican. Los especialistas van primero a las tareas más complejas (las que solo saben hacer los escalones más altos). Si la gente que sabe hacer una tarea está ocupada, la tarea espera: el presupuesto muestra el tiempo de fabricación real con este plantel (en horas y en días hábiles) y cuánto de eso son esperas. Se cotiza como si fuera el único trabajo de la fábrica.", "'Pasar a mano de obra (por persona)' reemplaza la mano de obra del bloque por una fila por persona, con sus horas y su costo hora. 'Restaurar' trae de vuelta las categorías."] },
          { type: "tip", text: "Un asterisco en las horas avisa que falta algo: una tarea sin tiempo estándar o un rubro sin materiales cotizados. El total queda corto hasta completarlo." },
        ],
      },
      {
        heading: "Cargar los componentes",
        blocks: [
          {
            type: "bullets",
            items: [
              "Materiales e insumos (cantidad y precio).",
              "Mano de obra (horas por categoria).",
              "Costos fijos y adicionales.",
            ],
          },
        ],
      },
      {
        heading: "Precio: markup, desvio, IVA y descuentos",
        blocks: [
          {
            type: "p",
            text: "El costo se ajusta con el markup y el desvio (que vienen de Marcadores), se le suma el IVA y se aplican descuentos. El sistema calcula el neto y el precio final solo.",
          },
          {
            type: "tip",
            text: "Al escribir el cliente, el sistema autocompleta desde el CRM. Podes dar de alta un cliente nuevo ahi mismo.",
          },
        ],
      },
      {
        heading: "Exportar el presupuesto",
        blocks: [
          {
            type: "steps",
            items: [
              "Revisa que este todo cargado y el precio final correcto.",
              "Exporta el presupuesto para enviar al cliente.",
              "Queda guardado en el Historial (CRM) con su revision y marcado 'Exportado'.",
            ],
          },
          {
            type: "tip",
            text: "Al exportar a la carpeta, el presupuesto se guarda en Presupuestos/<cliente>/ separado en vigentes y vencidos (segun la validez). Asi lo encontras rapido desde la carpeta sin abrir el sistema.",
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Quien arma los presupuestos?",
                a: "Solo el responsable de presupuestos (o la direccion). Los parametros de Marcadores (markup, desvio) son definiciones de los altos directivos: no se tocan al presupuestar.",
              },
              {
                q: "¿Como se manejan los descuentos?",
                a: "Son un % sobre el neto. Es una definicion comercial (estrategia para cerrar la venta), mas de marketing que de costo real.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "historial",
    title: "CRM (clientes e historial)",
    emoji: "👥",
    intro:
      "La base de clientes y el historial de todos los presupuestos, con sus revisiones y su estado.",
    sections: [
      {
        heading: "Clientes",
        blocks: [
          {
            type: "p",
            text: "El cliente es una entidad con sus datos (CUIT, contacto). Un semaforo marca si los datos estan completos. Desde el presupuesto se autocompletan al escribir el nombre.",
          },
        ],
      },
      {
        heading: "Historial de presupuestos",
        blocks: [
          {
            type: "p",
            text: "Ves cada presupuesto con sus revisiones y si esta aprobado o no. Un presupuesto aprobado se convierte en Trabajo aprobado.",
          },
          { type: "image", caption: "Historial de presupuestos por cliente", svg: MANUAL_FIGURES.historial },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Quien da de alta a los clientes?",
                a: "El area de presupuestos; administracion centraliza los clientes. El cliente es la fuente de verdad: se da de alta una vez y despues se autocompleta al presupuestar.",
              },
              {
                q: "¿Que datos del cliente hay que cargar?",
                a: "Obligatorios: nombre, telefono y direccion. El CUIT/CUIL es ideal para tenerlo completo. El semaforo avisa si faltan datos.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "fabricacion",
    title: "Fabricacion",
    emoji: "🏭",
    intro: "Seguis los trabajos en produccion: que hay en curso, sus fechas y la carga de la fabrica.",
    sections: [
      {
        heading: "Capacidades del personal",
        blocks: [
          { type: "p", text: "Muestra qué tareas domina cada persona según sus categorías internas (se cargan en Personal) y, por tarea, quién la puede hacer. Las tareas sin nadie o con una sola persona son el puesto a cubrir al contratar. En la organización diaria solo se le pueden dar a cada uno las tareas que domina." },
        ],
      },
      {
        heading: "Cronograma automático",
        blocks: [
          { type: "p", text: "Los trabajos en curso con sus muebles cargados se reparten entre la gente de De Raíz: cada tarea la hace quien la sabe hacer con el costo hora más alto, y lo que va en paralelo se reparte para terminar antes. Se trabaja de lunes a viernes de 07:30 a 17:00 con el almuerzo de 13:30 a 14:00. Cada trabajo arranca en su inicio (editable) y se ve cuándo termina, el margen hasta la entrega y si llega con la holgura pedida (10 días hábiles por defecto, editable por trabajo)." },
          { type: "steps", items: ["Fabricación → Cronograma automático.", "'Muebles…' carga o corrige los muebles del trabajo. Los presupuestos hechos a la manera vieja se completan acá, sin tocar su precio.", "'Quién y cuándo…' muestra cada tarea por día y persona; 'Pasar a la organización diaria' la carga en el día de cada uno."] },
          { type: "tip", text: "Hace falta que las tareas tengan tiempo estándar y que la gente de De Raíz tenga sus categorías internas. Lo que no tiene muebles sigue con el Gantt por rubros como siempre." },
        ],
      },
      {
        heading: "Retrabajos",
        blocks: [
          { type: "p", text: "Cada retrabajo es de un trabajo y de una tarea: quién la hizo (cuenta en su efectividad), quién la rehace, cuánto se rehace (100% = la tarea entera), las horas de la tarea original y los materiales. Costo = horas × costo hora de quien rehace + materiales. Sus horas se suman al final del trabajo en el cronograma automático (se corre la fecha de fin). En Personal, 'Efectividad (retrabajos)' muestra por persona y por mes las horas de tareas tildadas hechas contra las horas rehechas por su culpa." },
        ],
      },
      {
        heading: "Tipos de mueble",
        blocks: [
          { type: "p", text: "Cada tipo de mueble es una receta de tareas del catálogo, ordenada por pasos. Mismo número de paso = en paralelo (3.1, 3.2, por distintas personas); el paso siguiente espera a que termine todo el anterior. Cada renglón dice cuánto lleva y de qué sale: una medida del mueble (por mueble, por ml de largo, por m² de frente o por m³) o un material del presupuesto (por placa, por bisagra, por cajón…: los rubros del Gantt, con sus palabras clave). Con el tiempo estándar de la tarea da las horas." },
          { type: "p", text: "Cada grupo de tareas es una operación (Corte CNC, Pegado de cantos, Armado…) con sus tareas en orden. En Tipos de tarea y grupos de trabajo, 'Pegar lista…' carga todas las tareas de una vez ('1. Limpieza del CNC 2. Control de presión…' o una por renglón); las que ya existen se llaman y son la misma tarea. '+ Tarea existente…' llama una tarea escrita en otro grupo; ↑ ↓ ordenan y 'Sacar' la quita del grupo." },
          { type: "p", text: "Las tareas que se repiten en muchos muebles se juntan en grupos de tareas (en Tipos de tarea y grupos de trabajo). En la receta, '+ Grupo de tareas…' suma todas las tareas del grupo de una vez (quedan en verde). Si el grupo cambia en el catálogo, arriba de la receta aparece 'cambió · actualizar' para sumar lo nuevo y sacar lo que ya no está." },
          { type: "steps", items: ["Fabricación → Tipos de mueble → '+ Tipo de mueble' (o 'Crear desde un grupo de trabajo…', que copia sus tareas como pasos).", "Click derecho → 'Receta y tiempos…': agregá tareas, ajustá paso, cantidad y de qué medida sale. Click derecho sobre un renglón para subirlo, bajarlo o ponerlo en paralelo con el paso anterior.", "Abajo, 'Probar tiempos': con otras medidas ves las horas-hombre y las horas de reloj; podés corregir una cantidad a mano para comparar."] },
          { type: "tip", text: "Las horas salen del tiempo estándar de cada tarea (catálogo de tareas). Si una tarea no lo tiene cargado, el total queda corto y se marca con *." }
        ],
      },
      {
        heading: "Trabajos en curso",
        blocks: [
          {
            type: "p",
            text: "Ves los trabajos aprobados que estan en fabricacion, con su fecha de entrega estimada y su estado.",
          },
          { type: "image", caption: "Calendario de fabricacion", svg: MANUAL_FIGURES.fabricacion },
        ],
      },
      {
        heading: "Ocupacion y compras pendientes",
        blocks: [
          {
            type: "bullets",
            items: [
              "Ocupacion: cuanto de la capacidad de la fabrica esta comprometida.",
              "Compras pendientes: que falta comprar para poder producir cada trabajo.",
            ],
          },
        ],
      },
      {
        heading: "Mantenimiento · Fichas de máquinas y herramientas",
        blocks: [
          { type: "p", text: "Las máquinas y herramientas son los items de Stock de los grupos Máquinas pesadas, Máquinas manuales y Herramientas (la cantidad se lleva en Stock). Cada una tiene su ficha: estado (operativa, en mantenimiento, fuera de servicio, a reponer), fecha de compra, marca, modelo, serie, proveedor, especificaciones, usos y fecha de reposición." },
          { type: "steps", items: ["Fabricación → bloque Máquinas y herramientas → '+ Máquina o herramienta' (se crea en Stock) o cargala directo en Stock.", "Click derecho sobre una máquina → 'Ficha…' (o doble click). El estado también se cambia desde el click derecho.", "En la ficha, '+ Preventivo': qué se hace, cada cuántos días, el último hecho y con qué tarea del catálogo se hace."] },
        ],
      },
      {
        heading: "Mantenimiento · Preventivos como tareas para los idóneos",
        blocks: [
          { type: "p", text: "Cada preventivo vence a los N días del último hecho (o en la fecha que fijes). 'Programar' lo suma como tarea al día de una persona en la organización diaria de Fabricación; arriba aparecen los idóneos: los que tienen esa tarea en sus categorías internas (por ejemplo la habilidad extra 'Mantenimiento de máquinas'). Cuando la persona la marca hecha, queda en el historial de la máquina y el contador vuelve a arrancar." },
          { type: "tip", text: "'Preparar tareas de mantenimiento' crea el grupo de trabajo Mantenimiento con sus tareas y se las da a la habilidad extra de mantenimiento. Después tildá esa habilidad en la ficha de quienes la tengan." },
        ],
      },
      {
        heading: "Mantenimiento · Herramientas para cada tarea",
        blocks: [
          { type: "p", text: "En Fabricación → Tipos de tarea, la columna Herramientas dice qué máquinas y herramientas pide cada tarea. Mantenimiento muestra qué tareas no se pueden hacer hoy porque falta una herramienta, no hay unidades o no está operativa, y la organización diaria avisa si se le da a alguien una tarea así." },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Ya se usa esta solapa?",
                a: "Todavia no del todo; se empieza a usar con el año fiscal nuevo (noviembre). Es un area que aun tiene ajustes pendientes.",
              },
              {
                q: "¿Como se fija la fecha de entrega?",
                a: "Se fija con el cobro del anticipo: el anticipo marca el inicio del trabajo en fabrica, y de ahi sale la fecha de entrega real.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "stock",
    title: "Stock, agenda y analisis de costos",
    emoji: "📦",
    intro:
      "El stock de materiales (ligado por codigo), sus movimientos de entrada y salida, y el analisis de costos.",
    sections: [
      {
        heading: "Remitos: recepción, salida por trabajo y entrega",
        blocks: [
          { type: "p", text: "El material ENTRA al stock con el remito de recepción del proveedor (no con la factura). La factura de una compra de materiales se vincula a su remito y no vuelve a sumar; si no vino remito, desde la factura se cargan sus renglones como recepción. La SALIDA por trabajo descuenta el material imputado al trabajo. La ENTREGA al cliente es un documento: no mueve stock. Todos quedan en 'Remitos · historial'." },
          { type: "steps", items: ["'+ Recepción de proveedor': proveedor, número, fecha, factura (si ya está) y los renglones (cada uno vinculado a un ítem del stock o uno nuevo con su grupo).", "Guardar: el stock sube y queda el movimiento con el número de remito.", "Desde la ficha del trabajo: 'Salida de stock por trabajo' (Traer materiales del trabajo) o 'Entrega al cliente' (se imprime con firma de conformidad).", "Click derecho sobre un remito para abrirlo, imprimirlo o quitarlo: el stock se corrige solo."] }
        ],
      },
      {
        heading: "Stock por codigo",
        blocks: [
          {
            type: "p",
            text: "Cada material tiene un codigo que lo liga entre presupuesto, compras y stock. Asi el sistema sabe que hay, que falta y que se uso.",
          },
        ],
      },
      {
        heading: "Movimientos",
        blocks: [
          {
            type: "steps",
            items: [
              "Elegi el item de stock.",
              "Carga una entrada (compra/ingreso) o salida (consumo) con fecha y cantidad.",
              "El sistema actualiza la existencia y guarda el historial.",
            ],
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Ya se usa el stock?",
                a: "No todavia; se empieza a usar con el año fiscal nuevo, para arrancar en plena funcion. Por ahora es a futuro.",
              },
              {
                q: "¿Y el codigo de material?",
                a: "Hay que armarlo: hoy no existe. Ese codigo es el que va a ligar presupuesto, compras y stock.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "personal",
    title: "Personal",
    emoji: "👷",
    intro:
      "Los empleados, su liquidacion mensual, las escalas salariales y las provisiones (EPP, insumos, examenes, capacitaciones) con su vigencia. Aca tambien sale el costo hora hombre que se usa para cotizar.",
    sections: [
      {
        heading: "Categorías internas (capacidades)",
        blocks: [
          { type: "p", text: "Además de la categoría del convenio (la que liquida), cada persona tiene categorías INTERNAS que dicen qué tareas de fabricación puede hacer. Van por escalones: Aprendiz → Ayudante general → Ayudante especializado (con su rumbo) → el oficio (Armador, Mecanizador, Enchapador, Laqueador, Instalador, Herrero) → Responsable. Los Responsables (de fábrica y de obra) tienen tareas de control: están arriba de todo pero no heredan las de abajo. Cada escalón incluye a los de abajo de su rumbo, y al organizar el día se priorizan las tareas del escalón más alto. Terminaciones es una habilidad extra: no es escalón, se suma a quien la tenga." },
          { type: "steps", items: ["Personal → Categorías internas: click derecho sobre una categoría → 'Tareas…' para tildar las tareas que da (del catálogo de Fabricación).", "Click derecho → 'Qué categorías incluye…' si querés cambiar la escalera, o 'Convertir en habilidad extra'.", "Click derecho sobre el título de un escalón: subir, bajar, sumar uno nuevo encima o debajo, o quitarlo (si está vacío). El nombre se escribe en el título.", "En la ficha del empleado, 'Categorías internas y capacidades': tildá su escalón con su rumbo y sus habilidades extra."] },
          { type: "tip", text: "Mientras una persona no tenga categorías cargadas, en la organización diaria se le puede dar cualquier tarea." }
        ],
      },
      {
        heading: "Viático fijo en el acuerdo",
        blocks: [
          { type: "steps", items: ["En la ficha del empleado, cargá 'Viático fijo mensual · blanco' y/o '· negro'.", "Elegí desde qué mes corre.", "Sale solo cada mes en el renglón 'Viáticos' del Calendario, hasta la baja del empleado."] }
        ],
      },
      {
        heading: "Alta de empleado (convenio o temporal)",
        blocks: [
          {
            type: "p",
            text: "Todo empleado nuevo entra como Temporal (negro, por acuerdo): cobra un sueldo acordado, sin escala ni cargas, y su pago sale de Caja chica (de ahi sale el recibo). Cuando se lo efectiviza pasa a Convenio y cobra por la escala salarial segun su categoria (blanco).",
          },
          {
            type: "steps",
            items: [
              "Para efectivizar, abri la ficha del empleado temporal.",
              "Toca 'Efectivizar (pasar a convenio)'.",
              "Elegi la categoria de la escala que le corresponde. Desde ahi cobra en blanco por convenio.",
            ],
          },
          {
            type: "tip",
            text: "El legajo se asigna solo (el ultimo numero + 1). No hace falta escribirlo.",
          },
        ],
      },
      {
        heading: "Liquidacion por mes",
        blocks: [
          {
            type: "p",
            text: "Arriba elegis el mes de liquidacion (con el selector o las flechas). Cargas las horas de cada empleado de ese mes; el sistema calcula el valor hora y el costo. Cargar cada mes arma el historico que usan los reportes.",
          },
          {
            type: "p",
            text: "Un banner arriba muestra la capacidad horaria: las horas nominales (las que se pagan) contra las productivas (descontando feriados y vacaciones). El costo hora se calcula sobre las horas productivas, que es lo que hay que cotizar.",
          },
          { type: "image", caption: "Liquidacion mensual de un empleado", svg: MANUAL_FIGURES.personal },
        ],
      },
      {
        heading: "Costo del empleado (blanco y negro)",
        blocks: [
          {
            type: "p",
            text: "El sistema separa el impacto a la empresa en blanco (sueldo de convenio con cargas, aguinaldo, antiguedad, presentismo) y negro (premios, acuerdos y el sueldo del temporal). Ambos se ven en la tabla y en la ficha del empleado.",
          },
          {
            type: "p",
            text: "En negro hay dos renglones distintos. El ACUERDO se prorratea por los dias trabajados del mes (total / dias laborables x dias trabajados). El PREMIO es un monto fijo no remunerativo: sale entero, sin importar los dias trabajados. Los dos salen en el recibo negro, cada uno en su renglon.",
          },
          {
            type: "warn",
            text: "El negro SI cuenta para el costo hora hombre que usas para cotizar. Aunque no se declare, es plata que la empresa paga; si no lo sumas, cotizas por debajo del costo real. El aguinaldo del negro suma solo como aguinaldo.",
          },
        ],
      },
      {
        heading: "Escalas salariales",
        blocks: [
          {
            type: "p",
            text: "Se cargan con el boton Subir escala (lee el PDF) o dejando el PDF en la carpeta (solapa Documentos). Vienen por trimestre; si un mes no tiene escala propia, el sistema usa la ultima cargada.",
          },
          {
            type: "warn",
            text: "El mes con el que cargas la escala es el mes DESDE el que rige. Cargala en el mes de inicio del trimestre.",
          },
        ],
      },
      {
        heading: "Documentacion y provisiones (vigencia)",
        blocks: [
          {
            type: "p",
            text: "Cada documento, EPP o insumo tiene una vigencia y un semaforo (verde vigente, amarillo vence pronto, rojo vencido). La vigencia sale de la entrega mas la periodicidad, o del vencimiento del documento. Se pueden cargar por la carpeta (Personal/<EMPRESA>/<empleado>/) con la fecha en el nombre del archivo.",
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Un empleado nuevo entra como convenio o temporal?",
                a: "Siempre entra como Temporal. Recien pasa a Convenio cuando se lo efectiviza (boton 'Efectivizar' en su ficha), y ahi se le asigna su categoria de escala.",
              },
              {
                q: "¿Un temporal puede pasar a convenio mas adelante?",
                a: "Si. En la ficha del empleado toca 'Efectivizar (pasar a convenio)' y elegi su categoria. Desde ese momento cobra por escala (blanco) en vez del sueldo acordado (negro).",
              },
              {
                q: "¿Por que el costo se separa en blanco y negro?",
                a: "Porque hay que ver clarisimo de donde sale la plata de cada cosa; el error mas comun es mezclar las administraciones. El blanco es el sueldo de convenio con sus cargas; el negro son premios, acuerdos y el sueldo del temporal (que se paga por Caja chica). Los dos suman al costo hora para cotizar, pero nunca se mezclan en los reportes.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "marcadores",
    title: "Marcadores",
    emoji: "⚙️",
    intro:
      "Los parametros economicos que usan Presupuesto y otras solapas: markup, desvio, IVA, comision.",
    sections: [
      {
        heading: "Que son",
        blocks: [
          {
            type: "p",
            text: "Son las 'perillas' del sistema. Cambiarlas afecta como se calculan los presupuestos NUEVOS (no los ya cerrados). Por eso conviene tocarlas con criterio.",
          },
          {
            type: "table",
            headers: ["Parametro", "Para que"],
            rows: [
              ["Markup", "El margen que se suma al costo."],
              ["Desvio", "Colchon sobre materiales / mano de obra."],
              ["IVA", "Alicuota por defecto."],
              ["Comision", "% de comision del vendedor."],
            ],
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Quien puede tocar los marcadores?",
                a: "Solo el administrador. Son definiciones de la direccion (markup, desvio, IVA, comision); no se cambian al operar el dia a dia.",
              },
              {
                q: "¿Cada cuanto se actualizan?",
                a: "Se evaluan mes a mes.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "documentos",
    title: "Documentos (carga por carpeta)",
    emoji: "📁",
    intro:
      "La carpeta funciona en dos direcciones. Entrada: cargas archivos desde una carpeta de tu computadora (Chrome o Edge) y el sistema los ordena, los guarda en la nube y, en algunos casos, los lee solo. Salida: el sistema escribe en esa misma carpeta los manuales, presupuestos, recibos, remitos y resumenes.",
    sections: [
      {
        heading: "Vincular y sincronizar",
        blocks: [
          {
            type: "steps",
            items: [
              "Toca Vincular carpeta y elegi la carpeta 'Sistema de Gestion' (la raiz, no una subcarpeta).",
              "Permiti el acceso en el navegador.",
              "Toca Sincronizar: sube los archivos nuevos y los ordena por tipo y mes.",
            ],
          },
          { type: "image", caption: "Solapa Documentos: vincular y bandeja", svg: MANUAL_FIGURES.documentos },
        ],
      },
      {
        heading: "Estructura de la carpeta",
        blocks: [
          {
            type: "p",
            text: "Adentro de 'Sistema de Gestion' van carpetas por tipo (Compras, Facturas emitidas, Remitos, Presupuestos, Recibos, Cobranzas, Banco, Caja chica, Escalas, Documentacion) y adentro subcarpetas por mes (AAAA-MM). Personal va por empleado.",
          },
        ],
      },
      {
        heading: "Lo que el sistema lee solo",
        blocks: [
          {
            type: "bullets",
            items: [
              "Escala salarial: lee el PDF y carga los valores por categoria y mes.",
              "Personal (documentacion/EPP/insumos): con la fecha en el nombre (AAAA-MM-DD Item.pdf), calcula la vigencia y prende el semaforo.",
              "Tickets de caja chica: los que dejes en la carpeta de cada caja se leen por OCR y crean el gasto.",
            ],
          },
        ],
      },
      {
        heading: "Exportar del sistema a la carpeta",
        blocks: [
          {
            type: "p",
            text: "En el panel 'Exportar a la carpeta' el sistema escribe archivos HTML (se abren e imprimen con Ctrl+P para pasarlos a PDF). Podes exportar por bloque o usar 'Exportar TODO'. La primera vez el navegador te pide permiso de escritura una sola vez.",
          },
          {
            type: "bullets",
            items: [
              "Manuales: uno por usuario, con solo sus solapas, en Manuales/<usuario>/.",
              "Presupuestos y Trabajos aprobados: ordenados por cliente y por estado (vigentes/vencidos, en curso/finalizados).",
              "Recibos, remitos y fichas de caja chica.",
              "Resumenes: balance, compras y vencimientos de personal, para leer desde la carpeta sin abrir el sistema.",
            ],
          },
          {
            type: "warn",
            text: "'Exportar TODO' reescribe lo del sistema y borra los HTML que ya no existen, pero NUNCA toca tus tickets, fotos o PDF. La exportacion no es automatica: es con el boton.",
          },
        ],
      },
      {
        heading: "Preguntas frecuentes",
        blocks: [
          {
            type: "faq",
            items: [
              {
                q: "¿Quien sincroniza la carpeta?",
                a: "La sincronizacion total (todo el sistema) la hace solo el administrador. La sincronizacion parcial depende de cada usuario y de sus permisos.",
              },
              {
                q: "¿Que conviene tener listo antes de empezar?",
                a: "La carpeta de OneDrive con su estructura (Compras, Facturas emitidas, Personal/, etc.). La idea es migrar al sistema lo necesario y arrancar el año fiscal (noviembre) sin errores.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tabKey: "calendarioAnual",
    title: "Calendario anual · cash flow",
    emoji: "📅",
    intro:
      "La planilla de cash flow del sistema: cada renglón está vinculado con su solapa, y lo que se carga en un lado aparece en el otro.",
    sections: [
      {
        heading: "Responsable / firmante de cada movimiento",
        blocks: [
          { type: "p", text: "Regla del sistema: cada movimiento de plata tiene a alguien que responde por él, y ese alguien es SIEMPRE el usuario que lo carga o lo corrige (no se puede elegir a otro). Al guardar, el sistema graba el usuario con la sesión iniciada y la fecha y hora: queda el último responsable del movimiento. Vale acá y en cada solapa (gastos, pagos de facturas, pagos sin factura, cobros, comisiones, caja chica, pases, aportes, cuenta con la gente, retiros, VEP, cuotas)." },
          { type: "bullets", items: ["En la ventana de carga se ve 'Responsable / firmante: ✍ tu nombre'; click derecho sobre un número muestra quién firmó.", "En las planillas que se editan en el lugar, cada cambio en una fila la vuelve a firmar con el usuario que la tocó.", "Lo cargado antes de la regla no se borra ni se bloquea: aparece en ámbar ('✍ sin firmante') hasta que alguien lo edite.", "El extracto del banco no lleva firmante: lo trae el banco."] },
        ],
      },
      {
        heading: "Proveedores y grupos de costos",
        blocks: [
          { type: "p", text: "Los pagos a proveedores van a EGRESOS · CUENTAS CORRIENTES · PROVEEDORES HABITUALES (si el proveedor tiene cuenta corriente) o a EGRESOS · PROVEEDORES. Los renglones son los grupos de costos (con su F o V) y debajo va cada proveedor. Bancos, tarjetas, seguros y caja chica también son proveedores." },
          { type: "steps", items: ["El grupo de un pago sale de su factura; si la factura no tiene, de la ficha del proveedor.", "Para cargar un pago desde acá, tocá la celda del grupo: pide el proveedor y cómo se pagó, y queda en Pago a proveedores.", "Click derecho en el nombre del grupo: renombrarlo (se renombra también en Grupos de costos)."] },
        ],
      },
      {
        heading: "Cargar desde la planilla",
        blocks: [
          { type: "p", text: "Tocá el día en un renglón para cargar. Lo cargado va a la solapa que corresponde: un cobro al trabajo, un pago a Pago a proveedores, un pase o préstamo a Movimientos internos, una colocación o un rescate a Inversiones, un retiro a Retiros societarios." },
          { type: "tip", text: "Click derecho sobre un número: editar, borrar o mover. Lo que vive en otra solapa se edita allá (te avisa)." }
        ],
      },
      {
        heading: "Secciones de ingresos y egresos",
        blocks: [
          { type: "bullets", items: ["TRABAJOS APROBADOS · COBRANZAS: una fila por trabajo; los cobros estimados (violeta) e inamovibles (rojo) se ven con '≈' y no suman.", "MOVIMIENTOS INTERNOS (ingreso y egreso): préstamos, aportes y pases entre cuentas. Un pase aparece en las dos puntas.", "INVERSIONES (ingreso y egreso): colocación y rescate.", "RETIROS SOCIETARIOS (egreso).", "OTROS INGRESOS: reintegro de ART."] }
        ],
      },
      {
        heading: "Pagos programados",
        blocks: [
          { type: "p", text: "Arriba de la planilla: el calendario de lo que se viene (tarjetas, cuotas, seguros, sueldos, facturas de proveedores, vencimientos)." },
          { type: "steps", items: ["Click derecho sobre un pago → elegí su estado: programado (verde agua), estimado (violeta) o inamovible (rojo).", "Cuando se paga, marcalo pagado o subí el comprobante."] }
        ],
      },
      {
        heading: "Salto de año",
        blocks: [
          { type: "p", text: "Una línea violeta (◆) marca el 1 de noviembre: ahí empieza el ejercicio nuevo. En Pagos programados, un separador marca el cambio de ejercicio." }
        ],
      },
    ],
  },
  {
    tabKey: "movimientosInternos",
    title: "Movimientos internos",
    emoji: "↔️",
    intro:
      "La plata que se mueve entre cuentas propias o entre las empresas del grupo, y la que ponen o prestan los socios.",
    sections: [
      {
        heading: "Pases entre cuentas",
        blocks: [
          { type: "steps", items: ["Agregá un pase y elegí el tipo: efectivo al banco, banco al efectivo, banco a banco o entre cajas.", "Elegí las dos cuentas y el monto.", "En el Calendario sale de una cuenta (egreso) y entra en la otra (ingreso): el neto de la empresa no cambia."] }
        ],
      },
      {
        heading: "Préstamos y aportes",
        blocks: [
          { type: "p", text: "Cada aporte o préstamo cae en el renglón de quien puso la plata (Nicolás, Gustavo, banco, la otra empresa del grupo). Las devoluciones van a egresos." },
          { type: "tip", text: "También se cargan desde el Calendario, en los renglones de MOVIMIENTOS INTERNOS (te pide las cuentas o quién puso la plata)." }
        ],
      },
    ],
  },
  {
    tabKey: "bancos",
    title: "Bancos y tarjetas",
    emoji: "🏦",
    intro:
      "El extracto del banco, las tarjetas y el costo real de cada cuenta y tarjeta.",
    sections: [
      {
        heading: "Costo real de bancos y tarjetas",
        blocks: [
          { type: "p", text: "Arriba de la solapa: por empresa, cada cuenta y cada tarjeta con sus comisiones, impuestos, intereses y consumos, en el mes o en el ejercicio." },
          { type: "bullets", items: ["Cuentas: salen de los débitos del extracto según su renglón (el pago de la tarjeta y las cuotas de créditos no cuentan como costo bancario).", "Tarjetas: por cierre de resumen, con sus cargos y sus consumos por tipo de gasto; avisa si lo cargado no coincide con el total del resumen.", "'⚠ revisar': el texto del banco no parece de ese renglón (por ejemplo, sueldos cargados como impuesto). Corregí el renglón del movimiento."] }
        ],
      },
    ],
  },
  {
    tabKey: "inversiones",
    title: "Inversiones",
    emoji: "📈",
    intro:
      "Donde se pone plata a trabajar (plazo fijo, FCI, cauciones...), con su crecimiento y su vínculo con el cash flow.",
    sections: [
      {
        heading: "Colocación y rescate",
        blocks: [
          { type: "steps", items: ["Agregá la inversión con fecha de inicio, capital, moneda, blanco o negro y de qué cuenta sale: la plata sale de esa cuenta (EGRESOS · INVERSIONES).", "Actualizá el valor actual cuando quieras.", "Al rescatarla, pasala a Cerrada con la fecha de fin y lo que volvió: entra en INGRESOS · INVERSIONES, en el renglón de su tipo."] },
          { type: "tip", text: "Desde el Calendario: cargar en 'Colocación en inversiones' crea la inversión; cargar en un renglón de rescate te pide cuál se rescata y la cierra." }
        ],
      },
    ],
  },
];
