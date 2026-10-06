import React from "react";
import { money } from "../lib/format";
import type { ItemInamovible } from "../domain/agendaInamovibles";

// Franja de AVISO en el encabezado, visible en todas las solapas: los pagos inamovibles que estan por
// vencer o vencidos sin pagar ("faltan 2 dias", "vence hoy", "vencido hace 1 dia"). Click lleva al
// Calendario anual, donde esta el bloque completo.
const PRIORIDAD: Record<string, number> = { vencido: 0, hoy: 1, proximo: 2, en_ventana: 3 };
const COLOR: Record<string, string> = { vencido: "#b91c1c", hoy: "#c2410c", proximo: "#b45309", en_ventana: "#1d4ed8" };

export function AlertasInamovibles({
  items,
  companyShort,
  onOpen,
}: {
  items: ItemInamovible[];
  companyShort: (company: string) => string;
  onOpen: () => void;
}) {
  if (items.length === 0) return null;
  const orden = items
    .slice()
    .sort((a, b) => (PRIORIDAD[a.estado] ?? 9) - (PRIORIDAD[b.estado] ?? 9) || a.fechaLimite.localeCompare(b.fechaLimite));
  const urgentes = orden.filter((i) => i.estado === "vencido" || i.estado === "hoy").length;
  return (
    <div
      onClick={onOpen}
      title="Ver los pagos inamovibles en el Calendario anual"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 12px",
        background: urgentes ? "#fef2f2" : "#fffbeb",
        borderTop: `1px solid ${urgentes ? "#fecaca" : "#fde68a"}`,
        fontSize: 12.5,
        cursor: "pointer",
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}
    >
      <strong style={{ color: urgentes ? "#991b1b" : "#92400e" }}>
        ⚠ {items.length} pago{items.length === 1 ? "" : "s"} inamovible{items.length === 1 ? "" : "s"}
      </strong>
      {orden.slice(0, 6).map((i) => (
        <span key={i.clave} style={{ color: "#334155" }}>
          <span style={{ color: COLOR[i.estado] || "#334155", fontWeight: 700 }}>{i.texto}</span>
          {" · "}
          {companyShort(i.company)} {i.titulo}
          {i.monto > 0 ? ` ${money(i.monto, i.currency)}` : ""}
        </span>
      ))}
      {orden.length > 6 && <span style={{ color: "#64748b" }}>y {orden.length - 6} más…</span>}
    </div>
  );
}
