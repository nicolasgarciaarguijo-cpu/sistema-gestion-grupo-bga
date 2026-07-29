import React, { useState } from "react";
import { money } from "../lib/format";

// Plata disponible: cuánta plata hay en cada banco por empresa y cuánta en negro, para decidir con
// qué empresa se tiene plata y de dónde gastar. Se apoya en la reserva (dominio) calculada POR
// empresa (no depende del selector del balance). Es sensible (muestra negro) → App lo renderiza solo
// para admins. El corte por acceso (qué empresas ve cada uno) ya viene resuelto en el array.
export type PlataDisponibleBank = { bank: string; currency: "ARS" | "USD"; balance: number };
export type PlataDisponibleCompany = {
  company: string;
  short: string;
  primary: string;
  soft: string;
  banks: PlataDisponibleBank[];
  totalArs: number;
  blancoArs: number;
  negroArs: number;
  totalUsd: number;
  negroUsd: number;
  proximoPagar: number;
};

const wrap: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "8px 14px",
  borderBottom: "2px solid #1e293b",
};
const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 6,
};
const headerLabel: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  fontWeight: 700,
  color: "#94a3b8",
};
const toggleBtn: React.CSSProperties = {
  fontSize: 11,
  color: "#cbd5e1",
  background: "transparent",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer",
};
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 10,
};
const card: React.CSSProperties = {
  background: "#1e293b",
  borderRadius: 8,
  padding: "8px 12px",
};
const cardTop: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
};
const cardTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const totalArsStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700, color: "#f1f5f9" };
const totalUsdStyle: React.CSSProperties = { fontSize: 12, color: "#5eead4", fontWeight: 600 };
const banksRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 };
const chip: React.CSSProperties = {
  fontSize: 11,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  padding: "2px 8px",
  color: "#cbd5e1",
};
const splitRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 6 };
const blancoTag: React.CSSProperties = {
  fontSize: 11,
  color: "#e2e8f0",
  background: "#334155",
  borderRadius: 6,
  padding: "2px 8px",
};
const negroTag: React.CSSProperties = {
  fontSize: 11,
  color: "#fde68a",
  background: "#3f2d0d",
  border: "1px solid #7c5e1e",
  borderRadius: 6,
  padding: "2px 8px",
  fontWeight: 600,
};
const pagarRow: React.CSSProperties = { fontSize: 11, color: "#93c5fd", marginTop: 6 };

export function PlataDisponible({ companies }: { companies: PlataDisponibleCompany[] }) {
  const [open, setOpen] = useState(true);
  if (!companies.length) return null;

  const negativa = (n: number) => (n < 0 ? { color: "#fca5a5" } : undefined);

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <span style={headerLabel}>💰 Plata disponible · por empresa y banco</span>
        <button style={toggleBtn} onClick={() => setOpen((v) => !v)}>
          {open ? "Ocultar ▲" : "Mostrar ▼"}
        </button>
      </div>
      {open && (
        <div style={grid}>
          {companies.map((c) => {
            const arsBanks = c.banks.filter((b) => b.currency !== "USD");
            const usdBanks = c.banks.filter((b) => b.currency === "USD");
            return (
              <div key={c.company} style={{ ...card, borderTop: `3px solid ${c.primary}` }}>
                <div style={cardTop}>
                  <span style={{ ...cardTitle, color: c.primary === "#14213d" ? "#93c5fd" : "#fbbf24" }}>
                    {c.short}
                  </span>
                  <span style={{ ...totalArsStyle, ...negativa(c.totalArs) }}>{money(c.totalArs)}</span>
                </div>
                {c.totalUsd !== 0 && (
                  <div style={totalUsdStyle}>{money(c.totalUsd, "USD")} en dólares</div>
                )}
                {(arsBanks.length > 0 || usdBanks.length > 0) && (
                  <div style={banksRow}>
                    {arsBanks.map((b) => (
                      <span key={b.bank} style={chip}>
                        {b.bank}:{" "}
                        <b style={{ color: b.balance < 0 ? "#fca5a5" : "#f1f5f9" }}>{money(b.balance)}</b>
                      </span>
                    ))}
                    {usdBanks.map((b) => (
                      <span key={`${b.bank}-usd`} style={{ ...chip, color: "#5eead4" }}>
                        {b.bank} U$S: <b>{money(b.balance, "USD")}</b>
                      </span>
                    ))}
                  </div>
                )}
                <div style={splitRow}>
                  <span style={blancoTag}>Blanco {money(c.blancoArs)}</span>
                  <span style={negroTag}>Negro {money(c.negroArs)}</span>
                  {c.negroUsd !== 0 && <span style={negroTag}>Negro {money(c.negroUsd, "USD")}</span>}
                </div>
                {c.proximoPagar > 0 && (
                  <div style={pagarRow}>
                    Próximo a pagar (agendado): <b>{money(c.proximoPagar)}</b>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
