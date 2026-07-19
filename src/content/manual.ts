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
    title: "Compras",
    emoji: "🛒",
    intro:
      "Cargas las facturas de compra y ves que material falta comprar para los trabajos en curso.",
    sections: [
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
    tabKey: "cajaChica",
    title: "Caja chica",
    emoji: "💵",
    intro:
      "Manejas los fondos de caja chica de cada empresa y sus gastos del dia a dia. Es el circuito por donde suele moverse el negro (incluido el pago a empleados temporales).",
    sections: [
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
];
