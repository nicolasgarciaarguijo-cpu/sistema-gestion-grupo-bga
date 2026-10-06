// AGENDA DE PAGOS INAMOVIBLES (pedido de Nicolas, 2026-10-05): el reflejo, en un solo calendario, de
// los pagos que no se pueden fallar. No se cargan dos veces: se JUNTAN de donde ya estan en el sistema
// (cuotas de deudas, resumenes de tarjeta, pagos pendientes del cash flow, seguros, sueldos) y se suman
// los que solo existen aca (vencimientos cargados a mano: VEP, sindicato, F.931, cheques, etc.).
//
// Cada renglon dice de donde viene (`origen`) y como se da por pagado. Si el origen ya tiene su propio
// "pagado" (la tarjeta, el pago del cash flow), se usa ESE: marcar aca lo marca alla y al reves. Si no
// lo tiene (cuota de deuda, sueldos, seguro), la marca se guarda aparte (`VencimientoMarca`).
// Funciones puras y testeadas.
import {
  agendaDeVencimientos,
  diasEntre,
  type RealPorRenglonMes,
  type Vencimiento,
  claveReal,
} from "./vencimientos";

export type OrigenInamovible = "manual" | "deuda" | "tarjeta" | "cashflow" | "seguro" | "sueldos";

export const ORIGEN_LABEL: Record<OrigenInamovible, string> = {
  manual: "Vencimiento",
  deuda: "Cuota de deuda",
  tarjeta: "Tarjeta",
  cashflow: "Pago programado",
  seguro: "Seguro",
  sueldos: "Sueldos",
};

// Marca de "pagado" para los origenes que no tienen la suya.
export type VencimientoMarca = {
  id: number;
  company: string;
  clave: string; // ej. "deuda:12:2026-11-10", "sueldos:BGA:2026-10", "seguro:4:2026-10"
  pagado: boolean;
  at: string;
};

export type ItemInamovible = {
  clave: string; // unica por renglon de la agenda
  origen: OrigenInamovible;
  refId: number | string; // id del registro de origen (para marcar pagado alla)
  ocurrenciaKey?: string; // solo manual
  company: string;
  titulo: string;
  detalle: string;
  ventanaDesde: string;
  fechaLimite: string;
  fechaConfirmada?: string;
  monto: number;
  currency: "ARS" | "USD";
  administration?: "blanco" | "negro";
  conceptKey?: string;
  avisoDias: number;
  pagado: boolean;
  pagadoComo: string; // "" | "a mano" | "cayó en el banco" | "en Tarjetas" | "realizado en el cash flow"
  estado: "pagado" | "vencido" | "hoy" | "proximo" | "en_ventana" | "futuro";
  diasRestantes: number;
  alerta: boolean;
  texto: string;
};

const AVISO_DEFAULT = 5;
const pad = (n: number) => String(n).padStart(2, "0");

function conEstado(
  base: Omit<ItemInamovible, "estado" | "diasRestantes" | "alerta" | "texto">,
  hoy: string
): ItemInamovible {
  const diasRestantes = diasEntre(hoy, base.fechaLimite);
  let estado: ItemInamovible["estado"];
  if (base.pagado) estado = "pagado";
  else if (diasRestantes < 0) estado = "vencido";
  else if (diasRestantes === 0) estado = "hoy";
  else if (diasRestantes <= base.avisoDias) estado = "proximo";
  else if (hoy >= base.ventanaDesde) estado = "en_ventana";
  else estado = "futuro";
  const plural = (n: number) => (n === 1 ? "día" : "días");
  const texto =
    estado === "pagado"
      ? `Pagado${base.pagadoComo ? ` (${base.pagadoComo})` : ""}`
      : estado === "vencido"
      ? `Vencido hace ${-diasRestantes} ${plural(-diasRestantes)}`
      : estado === "hoy"
      ? "Vence hoy"
      : `Faltan ${diasRestantes} ${plural(diasRestantes)}`;
  return {
    ...base,
    estado,
    diasRestantes,
    alerta: estado === "vencido" || estado === "hoy" || estado === "proximo" || estado === "en_ventana",
    texto,
  };
}

// Suma n meses a una fecha ISO conservando el dia (acotado al ultimo dia del mes destino). Sin pasar
// por Date con horario: "2026-01-31" + 1 mes = "2026-02-28", no el 3 de marzo.
export function sumarMeses(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimo = new Date(ny, nm, 0).getDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, ultimo))}`;
}

export type FuentesInamovibles = {
  vencimientos: Vencimiento[];
  marcas: VencimientoMarca[];
  debtPlans: Array<{
    id: number;
    company: string;
    concept: string;
    nextInstallmentAmount: number;
    remainingInstallments: number;
    nextDueDate: string;
    active: boolean;
  }>;
  tarjetas: Array<{ id: number; company: string; dueDate: string; totalArs: number; totalUsd: number; paid: boolean; nombre: string }>;
  pagosCashflow: Array<{
    id: number;
    company: string;
    date: string;
    type: string;
    status: string;
    title: string;
    amount: number;
    administration?: "blanco" | "negro";
    conceptKey?: string;
  }>;
  seguros: Array<{ seguroId: number; company: string; date: string; amount: number; administration: "blanco" | "negro"; conceptKey: string; tipo: string; descripcion: string }>;
  // Sueldos: una fecha por empresa y periodo (4to dia habil del mes siguiente) y, si se sabe, el monto.
  sueldos: Array<{ company: string; periodo: string; fecha: string; monto: number }>;
  real: RealPorRenglonMes;
};

/**
 * La agenda completa entre `desde` y `hasta`, con el estado de hoy, ordenada por fecha limite.
 * Solo entra lo que tiene fecha en ese rango (o, si esta impago, lo vencido dentro del rango).
 */
export function agendaInamovibles(f: FuentesInamovibles, desde: string, hasta: string, hoy: string): ItemInamovible[] {
  const out: ItemInamovible[] = [];
  const marcado = new Set(f.marcas.filter((m) => m.pagado).map((m) => m.clave));
  const enRango = (d: string) => !!d && d >= desde && d <= hasta;

  // 1. Vencimientos cargados a mano.
  agendaDeVencimientos(f.vencimientos, desde, hasta, hoy, f.real).forEach((o) => {
    out.push(
      conEstado(
        {
          clave: `manual:${o.vencimientoId}:${o.key}`,
          origen: "manual",
          refId: o.vencimientoId,
          ocurrenciaKey: o.key,
          company: o.company,
          titulo: o.titulo,
          detalle: o.fechaConfirmada ? "fecha confirmada" : "sin fecha confirmada (avisa por la ventana)",
          ventanaDesde: o.ventanaDesde,
          fechaLimite: o.fechaLimite,
          fechaConfirmada: o.fechaConfirmada,
          monto: o.monto,
          currency: o.currency,
          administration: o.administration,
          conceptKey: o.conceptKey,
          avisoDias: o.avisoDias,
          pagado: o.estado === "pagado",
          pagadoComo: o.estado !== "pagado" ? "" : o.pagadoPorBanco ? "cayó en el banco" : "a mano",
        },
        hoy
      )
    );
  });

  // 2. Cuotas de deudas (desendeudamiento): una por mes desde la proxima, hasta agotar las que quedan.
  f.debtPlans
    .filter((p) => p.active && p.nextDueDate)
    .forEach((p) => {
      const quedan = Math.max(0, Math.floor(Number(p.remainingInstallments || 0)));
      for (let i = 0; i < quedan; i++) {
        const fecha = sumarMeses(p.nextDueDate.slice(0, 10), i);
        if (fecha > hasta) break;
        if (!enRango(fecha)) continue;
        const clave = `deuda:${p.id}:${fecha}`;
        out.push(
          conEstado(
            {
              clave,
              origen: "deuda",
              refId: p.id,
              company: p.company,
              titulo: p.concept,
              detalle: `cuota ${i + 1} de ${quedan} que quedan`,
              ventanaDesde: fecha,
              fechaLimite: fecha,
              monto: Number(p.nextInstallmentAmount || 0),
              currency: "ARS",
              avisoDias: AVISO_DEFAULT,
              pagado: marcado.has(clave),
              pagadoComo: marcado.has(clave) ? "a mano" : "",
            },
            hoy
          )
        );
      }
    });

  // 3. Resumenes de tarjeta: su vencimiento. El "pagado" es el de la solapa Tarjetas.
  f.tarjetas.forEach((t) => {
    if (!enRango(t.dueDate)) return;
    const base = {
      origen: "tarjeta" as const,
      refId: t.id,
      company: t.company,
      titulo: `Tarjeta ${t.nombre}`.trim(),
      ventanaDesde: t.dueDate,
      fechaLimite: t.dueDate,
      avisoDias: AVISO_DEFAULT,
      pagado: !!t.paid,
      pagadoComo: t.paid ? "en Tarjetas" : "",
    };
    if (Number(t.totalArs || 0) > 0 || !(Number(t.totalUsd || 0) > 0)) {
      out.push(conEstado({ ...base, clave: `tarjeta:${t.id}`, detalle: "resumen", monto: Number(t.totalArs || 0), currency: "ARS" }, hoy));
    }
    if (Number(t.totalUsd || 0) > 0) {
      out.push(conEstado({ ...base, clave: `tarjeta-usd:${t.id}`, detalle: "resumen en dólares", monto: Number(t.totalUsd || 0), currency: "USD" }, hoy));
    }
  });

  // 4. Pagos programados en el cash flow (pendientes). Pasan a pagado cuando se marcan realizados.
  f.pagosCashflow
    .filter((i) => i.type === "pago" && enRango(i.date))
    .forEach((i) => {
      out.push(
        conEstado(
          {
            clave: `cashflow:${i.id}`,
            origen: "cashflow",
            refId: i.id,
            company: i.company,
            titulo: i.title || "Pago",
            detalle: "cargado en el cash flow",
            ventanaDesde: i.date,
            fechaLimite: i.date,
            monto: Number(i.amount || 0),
            currency: "ARS",
            administration: i.administration,
            conceptKey: i.conceptKey,
            avisoDias: AVISO_DEFAULT,
            pagado: i.status === "realizado",
            pagadoComo: i.status === "realizado" ? "realizado en el cash flow" : "",
          },
          hoy
        )
      );
    });

  // 5. Seguros: su debito del mes. Pagado si el debito real del mes cubre lo previsto, o a mano.
  f.seguros
    .filter((s) => enRango(s.date))
    .forEach((s) => {
      const clave = `seguro:${s.seguroId}:${s.date.slice(0, 7)}`;
      const real = f.real.get(claveReal(s.company, s.conceptKey, s.date.slice(0, 7))) || 0;
      const porBanco = !!s.conceptKey && real > 0 && real >= Number(s.amount || 0) - 1;
      const aMano = marcado.has(clave);
      out.push(
        conEstado(
          {
            clave,
            origen: "seguro",
            refId: s.seguroId,
            company: s.company,
            titulo: `Seguro ${[s.tipo, s.descripcion].filter(Boolean).join(" · ")}`.trim(),
            detalle: "débito estimado",
            ventanaDesde: s.date,
            fechaLimite: s.date,
            monto: Number(s.amount || 0),
            currency: "ARS",
            administration: s.administration,
            conceptKey: s.conceptKey,
            avisoDias: AVISO_DEFAULT,
            pagado: aMano || porBanco,
            pagadoComo: aMano ? "a mano" : porBanco ? "cayó en el banco" : "",
          },
          hoy
        )
      );
    });

  // 6. Sueldos: el 4to dia habil del mes siguiente al periodo.
  f.sueldos
    .filter((s) => enRango(s.fecha))
    .forEach((s) => {
      const clave = `sueldos:${s.company}:${s.periodo}`;
      out.push(
        conEstado(
          {
            clave,
            origen: "sueldos",
            refId: `${s.company}|${s.periodo}`,
            company: s.company,
            titulo: `Sueldos de ${s.periodo.slice(5, 7)}/${s.periodo.slice(0, 4)}`,
            detalle: "4.º día hábil del mes siguiente",
            ventanaDesde: s.fecha,
            fechaLimite: s.fecha,
            monto: Number(s.monto || 0),
            currency: "ARS",
            avisoDias: AVISO_DEFAULT,
            pagado: marcado.has(clave),
            pagadoComo: marcado.has(clave) ? "a mano" : "",
          },
          hoy
        )
      );
    });

  return out.sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite) || a.titulo.localeCompare(b.titulo));
}

/** Lo que tiene que sonar hoy: impago y vencido, que vence hoy, o dentro de su aviso/ventana. */
export function alertasActivas(items: ItemInamovible[]): ItemInamovible[] {
  return items.filter((i) => i.alerta);
}
