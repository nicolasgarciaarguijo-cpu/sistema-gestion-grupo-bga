// COBROS PROGRAMADOS (Nicolas, 21/11/2026):
//   "cuando programamos un cobro debe avisar el sistema que ese cobro estaria por entrar, para pedir un ajuste
//    de fechas o si no confirmar que el cobro se realizo. No deberia dispararse solo."
//
// Un cobro programado es un cobro PREVISTO de un trabajo aprobado (estimado o inamovible): vive en
// `cobrosPrevistos`, no en `payments`, y no suma en el cobrado ni en ninguna cuenta. Hasta ahora, cuando su
// fecha llegaba, nadie decia nada: quedaba como una prevision vieja. Esta es la regla del aviso:
//   - unos dias antes: "esta por entrar";
//   - el dia y despues: hay que RESOLVERLO: confirmar que se cobro (pasa a realizado, con la fecha y la cuenta
//     donde entro) o cambiarle la fecha. Nunca pasa a realizado solo.
//
// Y las FECHAS ROTAS (mismo dia): un cobro "realizado" con la fecha vacia, con el año mal tipeado ("0026",
// "22026": el campo de fecha deja escribir un año de 6 cifras) o en el futuro. Los tres estaban en la base.
// Un cobro realizado con fecha futura ES el "se dispara solo": se vuelve plata cuando llega el dia sin que
// nadie lo confirme. Y uno sin fecha valida no se puede ubicar en el tiempo: no mueve ninguna cuenta.

export const AVISO_COBRO_DIAS = 5;

/** Una fecha ISO de verdad (aaaa-mm-dd, dia y mes existentes) y de un año razonable. */
export function fechaIsoValida(iso?: string | null): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2015 || y > 2100 || mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

const dias = (a: string, b: string) =>
  Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);

type CobroDeTrabajo = { id: number; paymentDate?: string; amount?: number; currency?: string; estado?: string; administration?: string; cuentaId?: string };
export type TrabajoConCobros = { id: number; company: string; budgetNumber: string | number; client: string; payments?: CobroDeTrabajo[]; cobrosPrevistos?: CobroDeTrabajo[] };

// vencido: su fecha ya paso · hoy · proximo: dentro del aviso · futuro · sin_fecha: no dice cuando (o la fecha esta rota)
export type SituacionCobro = "vencido" | "hoy" | "proximo" | "futuro" | "sin_fecha";

export type CobroProgramado = {
  clave: string;
  jobId: number;
  paymentId: number;
  company: string;
  budgetNumber: string;
  client: string;
  fecha: string; // "" si no tiene o esta rota
  monto: number;
  moneda: "ARS" | "USD";
  administration: "blanco" | "negro";
  estado: "estimado" | "inamovible";
  situacion: SituacionCobro;
  diasRestantes: number; // negativo = vencido hace tantos dias
  texto: string;
  alerta: boolean;
};

const plural = (n: number) => (n === 1 ? "día" : "días");

export function cobrosProgramados(trabajos: TrabajoConCobros[], hoy: string, aviso = AVISO_COBRO_DIAS): CobroProgramado[] {
  const out: CobroProgramado[] = [];
  trabajos.forEach((j) =>
    (j.cobrosPrevistos || []).forEach((p) => {
      const monto = Number(p.amount || 0);
      if (!(monto > 0)) return;
      const fecha = fechaIsoValida(p.paymentDate) ? String(p.paymentDate) : "";
      const diasRestantes = fecha ? dias(hoy, fecha) : 0;
      const situacion: SituacionCobro = !fecha ? "sin_fecha" : diasRestantes < 0 ? "vencido" : diasRestantes === 0 ? "hoy" : diasRestantes <= aviso ? "proximo" : "futuro";
      out.push({
        clave: `${j.id}:${p.id}`,
        jobId: j.id,
        paymentId: p.id,
        company: j.company,
        budgetNumber: String(j.budgetNumber),
        client: j.client,
        fecha,
        monto,
        moneda: p.currency === "USD" ? "USD" : "ARS",
        administration: p.administration === "negro" ? "negro" : "blanco",
        estado: p.estado === "inamovible" ? "inamovible" : "estimado",
        situacion,
        diasRestantes,
        texto:
          situacion === "sin_fecha"
            ? "Sin fecha"
            : situacion === "vencido"
            ? `Debía entrar hace ${-diasRestantes} ${plural(-diasRestantes)}`
            : situacion === "hoy"
            ? "Entra hoy"
            : `Entra en ${diasRestantes} ${plural(diasRestantes)}`,
        alerta: situacion !== "futuro",
      });
    })
  );
  const orden: Record<SituacionCobro, number> = { vencido: 0, hoy: 1, sin_fecha: 2, proximo: 3, futuro: 4 };
  return out.sort((a, b) => orden[a.situacion] - orden[b.situacion] || a.fecha.localeCompare(b.fecha) || b.monto - a.monto);
}

/** Los que hay que mirar ahora: vencidos, de hoy, por entrar, o sin fecha. */
export const cobrosParaAvisar = (items: CobroProgramado[]): CobroProgramado[] => items.filter((i) => i.alerta);
/** Los que exigen una decision (confirmar o cambiar la fecha): su dia llego o paso. */
export const cobrosAResolver = (items: CobroProgramado[]): CobroProgramado[] => items.filter((i) => i.situacion === "vencido" || i.situacion === "hoy");

// COBROS REALIZADOS CON LA FECHA MAL.
export type MotivoFechaMala = "vacia" | "invalida" | "futura";
export type CobroConFechaMala = { clave: string; jobId: number; paymentId: number; company: string; budgetNumber: string; client: string; fechaCargada: string; monto: number; motivo: MotivoFechaMala; texto: string };

export function cobrosConFechaMala(trabajos: TrabajoConCobros[], hoy: string): CobroConFechaMala[] {
  const out: CobroConFechaMala[] = [];
  trabajos.forEach((j) =>
    (j.payments || []).forEach((p) => {
      const monto = Number(p.amount || 0);
      if (!(monto > 0)) return;
      const cargada = String(p.paymentDate || "");
      const motivo: MotivoFechaMala | null = !cargada ? "vacia" : !fechaIsoValida(cargada) ? "invalida" : cargada > hoy ? "futura" : null;
      if (!motivo) return;
      out.push({
        clave: `${j.id}:${p.id}`,
        jobId: j.id,
        paymentId: p.id,
        company: j.company,
        budgetNumber: String(j.budgetNumber),
        client: j.client,
        fechaCargada: cargada,
        monto,
        motivo,
        texto:
          motivo === "vacia"
            ? "cobrado sin fecha"
            : motivo === "invalida"
            ? `fecha mal tipeada (${cargada})`
            : `figura cobrado con fecha futura (${cargada.split("-").reverse().join("/")}): es un cobro estimado hasta que entre`,
      });
    })
  );
  return out.sort((a, b) => b.monto - a.monto);
}

/** Se puede confirmar un cobro con esta fecha: valida y no futura (la plata no entra mañana). */
export function fechaParaConfirmar(fecha: string, hoy: string): { ok: boolean; motivo: string } {
  if (!fechaIsoValida(fecha)) return { ok: false, motivo: "Poné la fecha en que entró la plata." };
  if (fecha > hoy) return { ok: false, motivo: "Esa fecha todavía no llegó: si la plata no entró, cambiá la fecha del cobro en vez de confirmarlo." };
  return { ok: true, motivo: "" };
}
/** Una fecha nueva para un cobro programado: valida y de hoy en adelante. */
export function fechaParaReprogramar(fecha: string, hoy: string): { ok: boolean; motivo: string } {
  if (!fechaIsoValida(fecha)) return { ok: false, motivo: "Poné la nueva fecha en que se espera el cobro." };
  if (fecha < hoy) return { ok: false, motivo: "La nueva fecha tiene que ser de hoy en adelante. Si ya entró, confirmá el cobro." };
  return { ok: true, motivo: "" };
}

// UN COBRO CON FECHA FUTURA ES ESTIMADO (Nicolas, 21/11/2026): "hasta no garantizar el pago no cuenta como
// plata. Incluso si es un cheque o un echeq o una transferencia programada. Manualmente se debe avisar que se
// cobro." Entonces un cobro no puede estar "realizado" con una fecha que todavia no llego: esta regla lo acomoda
// cada vez que se guarda un trabajo. Los realizados con fecha futura pasan a los previstos como "estimado" (su
// medio de pago, su cuenta y su firma se conservan: sirven cuando se confirme). No toca nada mas.
export function conFuturosComoEstimados<T extends { payments?: CobroDeTrabajo[]; cobrosPrevistos?: CobroDeTrabajo[] }>(trabajo: T, hoy: string): T {
  const pagos = trabajo.payments || [];
  const futuros = pagos.filter((p) => fechaIsoValida(p.paymentDate) && String(p.paymentDate) > hoy);
  if (!futuros.length) return trabajo;
  const ids = new Set(futuros.map((p) => p.id));
  return {
    ...trabajo,
    payments: pagos.filter((p) => !ids.has(p.id)),
    cobrosPrevistos: [...futuros.map((p) => ({ ...p, estado: "estimado" })), ...(trabajo.cobrosPrevistos || [])],
  };
}

/** Se puede marcar como realizado un cobro con esta fecha: no si todavia no llego. */
export const puedeSerRealizado = (fecha: string | undefined, hoy: string): boolean => !(fechaIsoValida(fecha) && String(fecha) > hoy);
