import React, { useState } from "react";
import { money } from "../lib/format";

// Plata disponible: cuánta plata hay en cada banco por empresa y cuánta en negro, para decidir con
// qué empresa se tiene plata y de dónde gastar. Se apoya en la reserva (dominio) calculada POR
// empresa (no depende del selector del balance). Es sensible (muestra negro) → App lo renderiza solo
// para admins. El corte por acceso (qué empresas ve cada uno) ya viene resuelto en el array.
export type PlataDisponibleBank = {
  bank: string;
  currency: "ARS" | "USD";
  balance: number; // saldo que calcula el sistema con lo cargado
  // CONTROL contra el ultimo resumen del banco (el extracto ya no carga: corrobora).
  control?: { fecha: string; saldoExtracto: number; diferencia: number; cierra: boolean };
};
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
  // Posición de IVA (desde el último VEP): débito (ventas) − crédito (compras blanco). >0 = a pagar.
  ivaDebito: number;
  ivaCredito: number;
  ivaPosicion: number;
  // IVA de la factura que falta por lo blanqueado (ver domain/faltaFactura) y la posicion REAL.
  ivaFaltaFactura?: number;
  ivaPosicionReal?: number;
  // Lo que la empresa le debe a la gente: facturas que puso de su bolsillo un empleado, un socio o un
  // tercero y todavia no se le reintegraron. Se quiere saldar rapido, por eso sube aca arriba.
  deudaConLaGente: number;
  deudaConLaGenteCount: number;
  // Pagos a cuenta que todavia esperan su factura (ver domain/pagosACuenta).
  pagosSinFactura?: { cantidad: number; total: number; masViejo: number };
  // Saldo de las cuentas corrientes con proveedores: lo que le debemos a la gente que nos vende. Va
  // aca arriba para no olvidarse (regla del usuario 2026-08-26). Ver domain/purchaseLedger.ts.
  deudaProveedores: number;
  // Plata en mano de cada persona (cajas por persona: caja chica, etc.).
  cajas?: Array<{ persona: string; color: "blanco" | "negro"; saldo: number }>;
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
  // Auto-fit: BGA tiene DOS bancos (Santander y Patagonia) y cada uno va en su bloque, asi que la
  // cantidad de bloques cambia por empresa. Con columnas fijas el cuarto bloque se caia solo abajo.
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

export function PlataDisponible({
  companies,
  onVerMovimientos,
}: {
  companies: PlataDisponibleCompany[];
  // Click sobre un valor: los movimientos del mes de esa cuenta, para ver su evolucion (2026-10-20).
  onVerMovimientos?: (company: string, cual: { tipo: "banco"; bank?: string } | { tipo: "efectivo"; color: "blanco" | "negro" }) => void;
}) {
  const [open, setOpen] = useState(true);
  const clickable = (fn: () => void): React.HTMLAttributes<HTMLDivElement> =>
    onVerMovimientos ? { onClick: fn, title: "Click: los movimientos del mes y cómo evolucionó el saldo", style: { cursor: "pointer" } } : {};
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
                  <span style={{ ...cardTitle, color: c.soft || "#e2e8f0" }}>{c.short}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    Total {money(c.totalArs)}
                    {c.totalUsd !== 0 ? ` · ${money(c.totalUsd, "USD")}` : ""}
                  </span>
                </div>

                {/* LA BILLETERA: los números grandes */}
                <div style={bigGrid}>
                  {arsBanks.length > 0 ? (
                    arsBanks.map((b) => (
                      <div key={b.bank} {...clickable(() => onVerMovimientos?.(String(c.company), { tipo: "banco", bank: b.bank }))} style={{ ...bigStat, ...(onVerMovimientos ? { cursor: "pointer" } : {}) }}>
                        <div style={bigLabel} title={b.bank}>🏦 {b.bank}</div>
                        <div style={{ ...bigValue, ...negativa(b.balance) }}>{money(b.balance)}</div>
                        {b.control && (
                          <div
                            style={{ fontSize: 10.5, marginTop: 2, color: b.control.cierra ? "#86efac" : "#fca5a5" }}
                            title={`Último resumen del banco (${b.control.fecha}): ${money(b.control.saldoExtracto)}. El sistema da ${money(
                              b.control.saldoExtracto - b.control.diferencia
                            )} a esa fecha.`}
                          >
                            {b.control.cierra
                              ? `✓ coincide con el extracto (${b.control.fecha.slice(8, 10)}/${b.control.fecha.slice(5, 7)})`
                              : `≠ extracto ${b.control.fecha.slice(8, 10)}/${b.control.fecha.slice(5, 7)}: dif. ${money(b.control.diferencia)}`}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div {...clickable(() => onVerMovimientos?.(String(c.company), { tipo: "banco" }))} style={{ ...bigStat, ...(onVerMovimientos ? { cursor: "pointer" } : {}) }}>
                      <div style={bigLabel}>🏦 Banco</div>
                      <div style={{ ...bigValue, ...negativa(c.bancoArs) }}>{money(c.bancoArs)}</div>
                    </div>
                  )}
                  <div {...clickable(() => onVerMovimientos?.(String(c.company), { tipo: "efectivo", color: "blanco" }))} style={{ ...bigStat, ...(onVerMovimientos ? { cursor: "pointer" } : {}) }}>
                    <div style={bigLabel}>💵 Efectivo blanco</div>
                    <div style={bigValue}>{money(c.efectivoBlancoArs)}</div>
                  </div>
                  <div {...clickable(() => onVerMovimientos?.(String(c.company), { tipo: "efectivo", color: "negro" }))} style={{ ...bigStat, background: "#3f2d0d", border: "1px solid #7c5e1e", ...(onVerMovimientos ? { cursor: "pointer" } : {}) }}>
                    <div style={{ ...bigLabel, color: "#fbbf24" }}>🔒 Negro</div>
                    <div style={{ ...bigValue, color: "#fde68a" }}>{money(c.efectivoNegroArs)}</div>
                  </div>
                </div>

                {/* CAJAS POR PERSONA: plata de la empresa que tiene alguien en mano. */}
                {(c.cajas || []).length > 0 && (
                  <div style={banksRow}>
                    {/* Aclaracion: cuanta plata hay asignada en cajas chicas (NO va al cash flow: ahi van los
                        gastos que se rinden). Blanco y negro, siempre separados. */}
                    {(["blanco", "negro"] as const).map((color) => {
                      const total = (c.cajas || []).filter((k) => k.color === color).reduce((a, k) => a + Number(k.saldo || 0), 0);
                      return Math.abs(total) > 0.5 ? (
                        <span
                          key={`total-${color}`}
                          style={{ ...chip, color: color === "negro" ? "#fde68a" : "#e2e8f0", fontWeight: 700 }}
                          title="Plata asignada en cajas chicas (y en la caja de cada persona), todavía sin rendir"
                        >
                          🧰 En cajas chicas{color === "negro" ? " (negro)" : ""}: <b>{money(total)}</b>
                        </span>
                      ) : null;
                    })}
                    {(c.cajas || []).map((caja) => (
                      <span
                        key={`${caja.persona}-${caja.color}`}
                        style={{ ...chip, color: caja.color === "negro" ? "#fde68a" : "#e2e8f0" }}
                        title="Plata de la empresa en mano de esta persona (caja chica y pases a su caja)"
                      >
                        👤 {caja.persona}
                        {caja.color === "negro" ? " (negro)" : ""}: <b>{money(caja.saldo)}</b>
                      </span>
                    ))}
                  </div>
                )}

                {/* Los pesos de cada banco ya van arriba en grande: acá solo quedan los dólares. */}
                {usdBanks.length > 0 && (
                  <div style={banksRow}>
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
                  {c.deudaProveedores > 1 && (
                    <span
                      style={pagarTag}
                      title="Saldo de las cuentas corrientes: lo comprado menos lo pagado, por proveedor. Se ve en detalle en Compras."
                    >
                      Proveedores: <b style={{ color: "#fca5a5" }}>{money(c.deudaProveedores)}</b>
                    </span>
                  )}
                  {c.pagosSinFactura && c.pagosSinFactura.cantidad > 0 && (
                    <span
                      style={pagarTag}
                      title={`Pagos a proveedores hechos sin la factura (a cuenta). El más viejo tiene ${c.pagosSinFactura.masViejo} días. Se resuelven cargando la factura y vinculándole el pago (Pago a proveedores → ficha).`}
                    >
                      ⏳ Pagos sin factura: <b style={{ color: "#fca5a5" }}>{money(c.pagosSinFactura.total)}</b>
                      <span style={{ color: "#94a3b8" }}> ({c.pagosSinFactura.cantidad})</span>
                    </span>
                  )}
                  {c.deudaConLaGente > 1 && (
                    <span
                      style={pagarTag}
                      title="Facturas que puso alguien de su bolsillo y todavia no se le devolvieron. Se salda desde Compras."
                    >
                      Le debemos a la gente:{" "}
                      <b style={{ color: "#fca5a5" }}>{money(c.deudaConLaGente)}</b>
                      {c.deudaConLaGenteCount > 0 && (
                        <span style={{ color: "#94a3b8" }}>
                          {" ("}
                          {c.deudaConLaGenteCount}
                          {c.deudaConLaGenteCount === 1 ? " factura)" : " facturas)"}
                        </span>
                      )}
                    </span>
                  )}
                  {(() => {
                    // Posicion REAL: la declarada + el IVA de la factura que falta por lo blanqueado.
                    const real = c.ivaPosicionReal ?? c.ivaPosicion;
                    const falta = Number(c.ivaFaltaFactura || 0);
                    return (
                      <span
                        style={real > 1 ? pagarTag : real < -1 ? cobrarTag : chip}
                        title={
                          `IVA débito (ventas) − crédito (compras blanco), desde el último VEP: ${money(c.ivaPosicion)}` +
                          (falta > 0.5 ? `\n+ IVA de la factura que falta por plata blanqueada: ${money(falta)}` : "")
                        }
                      >
                        IVA{falta > 0.5 ? " real" : ""}:{" "}
                        {real > 1 ? (
                          <>
                            a pagar <b style={{ color: "#fca5a5" }}>{money(real)}</b>
                          </>
                        ) : real < -1 ? (
                          <>
                            a favor <b style={{ color: "#86efac" }}>{money(-real)}</b>
                          </>
                        ) : (
                          <b style={{ color: "#cbd5e1" }}>equilibrado</b>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
