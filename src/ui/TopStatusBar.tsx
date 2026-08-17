import React from "react";
import { money, formatDateDisplay, todayIso } from "../lib/format";

// Barra fija superior que acompaña todo el trabajo: fecha del día, cotización del dólar (BNA y demás
// versiones) y quién más está conectado. Los datos llegan por props; el fetch del dólar y la presencia
// se manejan en App.tsx. Es puramente presentacional.

export type DollarRate = { casa: string; nombre: string; compra: number; venta: number };

export type ConnectedUser = {
  session_id: string;
  full_name?: string;
  email?: string;
  active_tab?: string;
  current_company?: string;
};

// Orden y etiqueta corta de las versiones que mostramos. "oficial" = BNA.
const RATE_ORDER: Array<{ casa: string; label: string }> = [
  { casa: "oficial", label: "BNA" },
  { casa: "blue", label: "Blue" },
  { casa: "mayorista", label: "Mayorista" },
  { casa: "bolsa", label: "MEP" },
  { casa: "contadoconliqui", label: "CCL" },
  { casa: "tarjeta", label: "Tarjeta" },
];

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const initials = (name?: string, email?: string) => {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

export type PettyCashHeader = { company: string; short: string; color: string; saldo: number; blanco: number; negro: number };

function TopStatusBar({
  rates,
  ratesUpdatedAt,
  connectedUsers,
  primary,
  pettyCash = [],
}: {
  rates: DollarRate[];
  ratesUpdatedAt: string;
  connectedUsers: ConnectedUser[];
  primary: string;
  pettyCash?: PettyCashHeader[];
}) {
  const iso = todayIso();
  const [y, m, d] = iso.split("-").map(Number);
  const dayName = DIAS[new Date(y, m - 1, d).getDay()];
  const fechaLarga = `${dayName} ${d} de ${MESES[m - 1]} ${y}`;

  const byCasa = new Map(rates.map((r) => [r.casa, r]));
  const shown = RATE_ORDER.map((o) => ({ ...o, rate: byCasa.get(o.casa) })).filter((o) => o.rate);

  const wrap: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 14,
    padding: "8px 14px",
    marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    fontSize: 13,
  };
  const sep: React.CSSProperties = { width: 1, alignSelf: "stretch", background: "#334155" };
  const label: React.CSSProperties = { color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 };

  return (
    <div style={wrap}>
      {/* Fecha */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={label}>Hoy</span>
        <strong style={{ textTransform: "capitalize" }}>{fechaLarga}</strong>
      </div>

      <div style={sep} />

      {/* Dolar */}
      <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minWidth: 220 }}>
        <span style={label}>
          Dólar {ratesUpdatedAt ? `· act. ${formatDateDisplay(ratesUpdatedAt.slice(0, 10))}` : ""}
        </span>
        {shown.length === 0 ? (
          <span style={{ color: "#64748b" }}>cotización no disponible</span>
        ) : (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {shown.map((o) => (
              <span key={o.casa} title={`${o.rate!.nombre}: compra ${money(o.rate!.compra)} / venta ${money(o.rate!.venta)}`}>
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>{o.label}</span>{" "}
                <span style={{ color: "#94a3b8" }}>C</span> {money(o.rate!.compra)}{" "}
                <span style={{ color: "#94a3b8" }}>V</span> {money(o.rate!.venta)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={sep} />

      {/* Cajas chicas */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={label}>Cajas chicas</span>
        {pettyCash.length === 0 ? (
          <span style={{ color: "#64748b" }}>sin asignar</span>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pettyCash.map((p) => (
              <span
                key={p.company}
                title={`${p.short}: blanco ${money(p.blanco)} · negro ${money(p.negro)}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{p.short}</span>
                <span style={{ color: "#e2e8f0" }}>{money(p.saldo)}</span>
                {p.negro ? <span style={{ color: "#94a3b8", fontSize: 11 }}>(N {money(p.negro)})</span> : null}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={sep} />

      {/* Conectados */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={label}>Trabajando ahora</span>
        {connectedUsers.length === 0 ? (
          <span style={{ color: "#64748b" }}>solo vos</span>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {connectedUsers.map((u) => (
              <span
                key={u.session_id}
                title={`${u.full_name || u.email || "Usuario"}${u.active_tab ? ` · en ${u.active_tab}` : ""}${u.current_company ? ` · ${u.current_company}` : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#1e293b",
                  borderRadius: 999,
                  padding: "2px 10px 2px 4px",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: primary,
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initials(u.full_name, u.email)}
                </span>
                <span style={{ color: "#e2e8f0" }}>{(u.full_name || u.email || "Usuario").split(/\s+/)[0]}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { TopStatusBar };
