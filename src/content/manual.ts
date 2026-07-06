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
];
