import React from "react";
import { money } from "../lib/format";
import { textoSinLinkear, type ItemInamovible } from "../domain/agendaInamovibles";

// Franja de AVISO en el encabezado, visible en todas las solapas: los pagos inamovibles que estan por
// vencer o vencidos sin pagar ("faltan 2 dias", "vence hoy", "vencido hace 1 dia"). Click lleva al
// Calendario anual, donde esta el bloque completo.
const PRIORIDAD: Record<string, number> = { vencido: 0, hoy: 1, proximo: 2, en_ventana: 3 };
const COLOR: Record<string, string> = { vencido: "#b91c1c", hoy: "#c2410c", proximo: "#b45309", en_ventana: "#1d4ed8" };

export function AlertasInamovibles({
  items,
  companyShort,
  onOpen,
  onConciliar,
}: {
  items: ItemInamovible[];
  companyShort: (company: string) => string;
  onOpen: () => void;
  // Resumen de tarjeta por vencer con renglones sin linkear: el aviso abre su ficha (18/11/2026).
  onConciliar?: (item: ItemInamovible) => void;
}) {
  if (items.length === 0) return null;
  // A igual urgencia, primero el resumen que falta conciliar: si queda detras del sexto no se ve.
  const orden = items
    .slice()
    .sort(
      (a, b) =>
        (PRIORIDAD[a.estado] ?? 9) - (PRIORIDAD[b.estado] ?? 9) ||
        (b.sinLinkear ? 1 : 0) - (a.sinLinkear ? 1 : 0) ||
        a.fechaLimite.localeCompare(b.fechaLimite)
    );
  const urgentes = orden.filter((i) => i.estado === "vencido" || i.estado === "hoy").length;
  return (
    <div
      onClick={onOpen}
      title="Ver los pagos programados en el Calendario anual"
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
        ⚠ {items.length} pago{items.length === 1 ? "" : "s"} programado{items.length === 1 ? "" : "s"}
      </strong>
      {orden.slice(0, 6).map((i) => (
        <span key={i.clave} style={{ color: "#334155" }}>
          <span style={{ color: COLOR[i.estado] || "#334155", fontWeight: 700 }}>{i.texto}</span>
          {" · "}
          {companyShort(i.company)} {i.titulo}
          {i.monto > 0 ? ` ${money(i.monto, i.currency)}` : ""}
          {!!i.sinLinkear && (
            <button
              type="button"
              title="Abrir la ficha del resumen para linkear lo que falta antes de pagarlo"
              onClick={(e) => {
                if (!onConciliar) return;
                e.stopPropagation();
                onConciliar(i);
              }}
              style={{ marginLeft: 6, padding: "0 7px", borderRadius: 999, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}
            >
              {textoSinLinkear(i.sinLinkear)} · conciliar
            </button>
          )}
        </span>
      ))}
      {orden.length > 6 && <span style={{ color: "#64748b" }}>y {orden.length - 6} más…</span>}
    </div>
  );
}
