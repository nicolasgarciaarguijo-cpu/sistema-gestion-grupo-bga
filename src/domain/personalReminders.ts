// Recordatorios de personal: consolida vencimientos de provisiones (EPP/Insumos/Examenes/
// Capacitaciones) y de documentacion (vencidos, por vencer y faltantes) en una sola lista
// ordenada por urgencia. Puro: la fecha "hoy" y el resolutor de nombre se pasan como inputs.

export type PersonalReminderState = "faltante" | "vencido" | "vence_pronto";

export type PersonalReminder = {
  type: "provision" | "documento";
  employeeName: string;
  company: string;
  label: string;
  dueDate: string;
  daysLeft: number;
  state: PersonalReminderState;
};

const DAY_MS = 1000 * 60 * 60 * 24;

export function buildPersonalReminders(
  employees: any[],
  opts: {
    todayMs: number;
    soonDays?: number;
    resolveProvisionName?: (item: any, employee: any) => string;
  }
): PersonalReminder[] {
  const soonDays = opts.soonDays ?? 30;
  const daysLeftOf = (dueDate: string) =>
    Math.ceil((new Date(dueDate).getTime() - opts.todayMs) / DAY_MS);

  const rows: PersonalReminder[] = [];

  employees.forEach((employee) => {
    (employee.provisionItems || []).forEach((item: any) => {
      if (!item.dueDate) return;
      const daysLeft = daysLeftOf(item.dueDate);
      if (daysLeft > soonDays) return;
      const name = opts.resolveProvisionName
        ? opts.resolveProvisionName(item, employee)
        : item.stockCode || "";
      rows.push({
        type: "provision",
        employeeName: employee.name,
        company: employee.company,
        label: `${item.kind}: ${name}`,
        dueDate: item.dueDate,
        daysLeft,
        state: daysLeft < 0 ? "vencido" : "vence_pronto",
      });
    });

    (employee.documents || []).forEach((doc: any) => {
      if (!doc.attachmentName) {
        // Documento sin adjunto: falta cargarlo.
        rows.push({
          type: "documento",
          employeeName: employee.name,
          company: employee.company,
          label: doc.name,
          dueDate: doc.dueDate || "",
          daysLeft: doc.dueDate ? daysLeftOf(doc.dueDate) : 0,
          state: "faltante",
        });
        return;
      }
      if (!doc.dueDate) return; // cargado y sin vencimiento: no es recordatorio
      const daysLeft = daysLeftOf(doc.dueDate);
      if (daysLeft > soonDays) return;
      rows.push({
        type: "documento",
        employeeName: employee.name,
        company: employee.company,
        label: doc.name,
        dueDate: doc.dueDate,
        daysLeft,
        state: daysLeft < 0 ? "vencido" : "vence_pronto",
      });
    });
  });

  // Orden: faltantes, luego vencidos (mas atrasados primero), luego por vencer (mas proximos primero).
  const rank: Record<PersonalReminderState, number> = {
    faltante: 0,
    vencido: 1,
    vence_pronto: 2,
  };
  return rows.sort((a, b) => rank[a.state] - rank[b.state] || a.daysLeft - b.daysLeft);
}
