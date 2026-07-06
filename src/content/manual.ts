// Contenido del manual de operacion, por solapa. La solapa "Manual" arma el manual de cada usuario
// mostrando SOLO las secciones de las solapas a las que tiene permiso (se actualiza con los permisos).
// El contenido es didactico: para que sirve, paso a paso, semaforos y errores comunes. Los bloques
// "image" son huecos para las capturas (se agregan mas adelante).
import type { TabKey } from "../domain/types";

export type ManualBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "warn"; text: string }
  | { type: "tip"; text: string }
  | { type: "image"; caption: string }
  | { type: "table"; headers: string[]; rows: string[][] };

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
          { type: "image", caption: "Pantalla de inicio de sesion" },
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
          { type: "image", caption: "Lista de trabajos y ficha abierta" },
        ],
      },
      {
        heading: "El Resumen economico (que significa cada linea)",
        blocks: [
          {
            type: "table",
            headers: ["Linea", "Que es"],
            rows: [
              ["Neto presupuesto", "El neto vendido (sin IVA)."],
              ["% facturado", "Cuanto del trabajo va por factura (blanco). El resto va en negro."],
              ["IVA 21%", "El IVA, calculado SOLO sobre la parte facturada."],
              ["Valor a cobrar", "Total a cobrar = neto + IVA facturado + adicionales."],
              ["Anticipo a cobrar", "% de anticipo x neto + IVA facturado."],
              ["Saldo", "Lo que falta cobrar."],
            ],
          },
          {
            type: "warn",
            text: "El IVA se calcula sobre lo FACTURADO, no sobre el total. Si facturas el 50%, el IVA es del 50%. Por eso el 'valor a cobrar' puede ser menor al bruto completo.",
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
          { type: "image", caption: "Solapa Facturacion completa" },
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
            text: "Elegis la empresa (Todas / BGA / De Raiz) y el periodo (Año fiscal / Mes / Todo). Todo lo que ves abajo respeta esa eleccion. El año fiscal arranca en octubre (configurable por empresa).",
          },
          { type: "image", caption: "Selector de empresa y periodo" },
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
            text: "En el desplegable 'Año fiscal por empresa' podes cambiar el mes de inicio de cada empresa (por defecto octubre). Sirve si sumas una empresa con otro calendario.",
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
              "Elegi la administracion: blanco o negro.",
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
          { type: "image", caption: "Listado de necesidades de compra" },
        ],
      },
    ],
  },
  {
    tabKey: "cajaChica",
    title: "Caja chica",
    emoji: "💵",
    intro: "Manejas los fondos de caja chica de cada empresa y sus gastos del dia a dia.",
    sections: [
      {
        heading: "Fondos",
        blocks: [
          {
            type: "p",
            text: "Cada fondo tiene un responsable y un monto asignado. Un semaforo avisa cuando queda poco saldo o se agoto, para reponerlo.",
          },
        ],
      },
      {
        heading: "Cargar un gasto",
        blocks: [
          {
            type: "steps",
            items: [
              "Elegi el fondo.",
              "Poné fecha, categoria, descripcion y monto.",
              "Marca la administracion (blanco o negro).",
              "Guarda. El saldo del fondo baja y el gasto entra en Contabilidad.",
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
              "Queda guardado en el Historial (CRM) con su revision.",
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
          { type: "image", caption: "Historial de presupuestos por cliente" },
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
          { type: "image", caption: "Calendario de fabricacion" },
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
    ],
  },
  {
    tabKey: "personal",
    title: "Personal",
    emoji: "👷",
    intro:
      "Los empleados, su liquidacion mensual, las escalas salariales y las provisiones (EPP, insumos, examenes, capacitaciones) con su vigencia.",
    sections: [
      {
        heading: "Liquidacion por mes",
        blocks: [
          {
            type: "p",
            text: "Arriba elegis el mes de liquidacion (con el selector o las flechas). Cargas las horas de cada empleado de ese mes; el sistema calcula el valor hora y el costo. Cargar cada mes arma el historico que usan los reportes.",
          },
          { type: "image", caption: "Liquidacion mensual de un empleado" },
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
            text: "Cada documento, EPP o insumo tiene una vigencia y un semaforo (verde vigente, amarillo vence pronto, rojo vencido). La vigencia sale de la entrega mas la periodicidad, o del vencimiento del documento. Se pueden cargar por la carpeta (Personal/<empleado>/) con la fecha en el nombre del archivo.",
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
    ],
  },
  {
    tabKey: "documentos",
    title: "Documentos (carga por carpeta)",
    emoji: "📁",
    intro:
      "Cargas archivos desde una carpeta de tu computadora (Chrome o Edge) y el sistema los ordena, los guarda en la nube y, en algunos casos, los lee solo.",
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
          { type: "image", caption: "Solapa Documentos: vincular y bandeja" },
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
            ],
          },
        ],
      },
    ],
  },
];
