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
  // Billetera desglosada (los números grandes): banco, efectivo blanco, efectivo negro.
  bancoArs: number;
  efectivoBlancoArs: number;
  efectivoNegroArs: number;
  totalUsd: number;
  negroUsd: number;
  // Previsión: lo que hay que pagar de desendeudamiento este mes y lo que falta cobrar (blanco/negro).
  desendeudamientoMes: number;
  aCobrarBlanco: number;
  aCobrarNegro: number;
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
const banksRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 };
const chip: React.CSSProperties = {
  fontSize: 11,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 999,
  padding: "2px 8px",
  color: "#cbd5e1",
};
// Billetera: los tres números GRANDES (banco / efectivo blanco / efectivo negro).
const bigGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
  marginTop: 8,
};
const bigStat: React.CSSProperties = {
  background: "#0b1220",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "6px 8px",
};
const bigLabel: React.CSSProperties = { fontSize: 10.5, color: "#94a3b8", marginBottom: 2 };
const bigValue: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: "#f1f5f9", whiteSpace: "nowrap" };
const foreseeRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
  fontSize: 11,
};
const cobrarTag: React.CSSProperties = {
  background: "#052e1a",
  border: "1px solid #14532d",
  borderRadius: 6,
  padding: "2px 8px",
  color: "#cbd5e1",
};
const pagarTag: React.CSSProperties = {
  background: "#3a0d0d",
  border: "1px solid #7f1d1d",
  borderRadius: 6,
  padding: "2px 8px",
  color: "#cbd5e1",
};

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
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    Total {money(c.totalArs)}
                    {c.totalUsd !== 0 ? ` · ${money(c.totalUsd, "USD")}` : ""}
                  </span>
                </div>

                {/* LA BILLETERA: los números grandes */}
                <div style={bigGrid}>
                  <div style={bigStat}>
                    <div style={bigLabel}>🏦 Banco</div>
                    <div style={{ ...bigValue, ...negativa(c.bancoArs) }}>{money(c.bancoArs)}</div>
                  </div>
                  <div style={bigStat}>
                    <div style={bigLabel}>💵 Efectivo blanco</div>
                    <div style={bigValue}>{money(c.efectivoBlancoArs)}</div>
                  </div>
                  <div style={{ ...bigStat, background: "#3f2d0d", border: "1px solid #7c5e1e" }}>
                    <div style={{ ...bigLabel, color: "#fbbf24" }}>🔒 Negro</div>
                    <div style={{ ...bigValue, color: "#fde68a" }}>{money(c.efectivoNegroArs)}</div>
                  </div>
                </div>

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

                {/* PREVISIÓN: a cobrar (blanco/negro) y desendeudamiento del mes */}
                <div style={foreseeRow}>
                  {(c.aCobrarBlanco > 0 || c.aCobrarNegro > 0) && (
                    <span style={cobrarTag}>
                      A cobrar: <b style={{ color: "#86efac" }}>{money(c.aCobrarBlanco)}</b>
                      {c.aCobrarNegro > 0 && (
                        <>
                          {" · negro "}
                          <b style={{ color: "#fde68a" }}>{money(c.aCobrarNegro)}</b>
                        </>
                      )}
                    </span>
                  )}
                  {c.desendeudamientoMes > 0 && (
                    <span style={pagarTag}>
                      A pagar este mes (desendeud.):{" "}
                      <b style={{ color: "#fca5a5" }}>{money(c.desendeudamientoMes)}</b>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
