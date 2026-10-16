// FICHA DEL PROVEEDOR (click derecho desde Compras y analisis de gastos, cuentas corrientes y facturas).
// Datos, tipo de gasto con candado 🔒, condicion de pago habitual, cuenta corriente, proximos pagos e
// historial. Es una sola ficha para todo el sistema: se abre desde donde este vinculado el proveedor.
import React from "react";
import { textoCondicion, type CondicionPago, type FacturaPorPagar } from "../domain/proveedores";
import { FirmanteFijo } from "./FirmanteSelect";

type Movimiento = { key: string; type: "compra" | "pago" | "nota_credito"; date: string; detail: string; amount: number; saldo: number; administration: "blanco" | "negro" };

export function FichaProveedor({
  nombre,
  taxId,
  proveedor,
  ledger,
  porPagar,
  renglonesEgreso,
  fvPorRenglon,
  money,
  onUpdateProveedor,
  onAltaProveedor,
  onFechaFactura,
  onCerrar,
  facturas = [],
  onCargarFactura,
  onAbrirFactura,
  pagosSinFactura = [],
  onPagoSinFactura,
  notasCredito = [],
  onNotaCredito,
  personas = [],
  onResolverSinFactura,
  onCargarFacturaDePago,
}: {
  nombre: string;
  taxId: string;
  proveedor?: {
    id: number;
    name: string;
    taxId: string;
    aliases: string;
    currentAccount?: boolean;
    grupoCosto?: string;
    tipoGastoLocked?: boolean;
    condicionPago?: CondicionPago;
    notes: string;
    direccion?: string;
    contacto?: string;
  };
  ledger?: { comprado: number; notasCredito?: number; pagado: number; saldo: number; deudaSinConciliar: number; facturasSinPago: number; esCuentaCorriente: boolean; movimientos: Movimiento[] };
  porPagar: FacturaPorPagar[];
  renglonesEgreso: Array<{ key: string; label: string }>;
  fvPorRenglon: Record<string, { kind: "fijo" | "variable"; locked: boolean }>;
  money: (n: number) => string;
  onUpdateProveedor: (id: number, field: string, value: unknown) => void;
  onAltaProveedor: (nombre: string, taxId: string) => void;
  onFechaFactura: (invoiceId: number, fecha: string) => void;
  onCerrar: () => void;
  // Todas las facturas del proveedor con su situacion de pago, y la ventana para cargar una nueva.
  facturas?: Array<{ id: number; invoiceDate: string; receiptLetter: string; invoiceNumber: string; total: number; pagada: boolean; pagoTexto: string; fechaPrevista?: string; company: string }>;
  onCargarFactura?: () => void;
  onAbrirFactura?: (id: number) => void;
  // Pagos a cuenta que todavia esperan su factura, y la ventana para cargar uno nuevo.
  pagosSinFactura?: Array<{ id: number; date: string; amount: number; dias: number; company: string; administration: "blanco" | "negro" }>;
  onPagoSinFactura?: () => void;
  // Notas de credito del proveedor; onNotaCredito(undefined) = nueva, (id) = abrir/editar.
  notasCredito?: Array<{ id: number; date: string; receiptLetter: string; number: string; total: number; vat: number; motivo: string; aplicaA: string; company: string; source?: string }>;
  onNotaCredito?: (id?: number) => void;
  personas?: string[];
  // Resolver un pago sin factura sin la factura: comprobante (gasto en negro) o un responsable que asume.
  onResolverSinFactura?: (pagoId: number, res: { tipo: "comprobante" | "responsable"; firmante: string; detalle: string; fecha: string }) => void;
  onCargarFacturaDePago?: (pagoId: number) => void;
}) {
  const [menuPago, setMenuPago] = React.useState<null | { x: number; y: number; id: number }>(null);
  const [resolver, setResolver] = React.useState<null | { id: number; tipo: "comprobante" | "responsable"; firmante: string; detalle: string }>(null);
  const cond = proveedor?.condicionPago;
  const fv = proveedor?.grupoCosto ? { kind: proveedor.grupoCosto.startsWith("fijo|") ? "fijo" : "variable", locked: false } : undefined;
  void fvPorRenglon;
  const setCond = (c: CondicionPago | undefined) => proveedor && onUpdateProveedor(proveedor.id, "condicionPago", c);
  const caja: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" };
  const titulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
  const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13 };

  return (
    <div
      onClick={onCerrar}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 4000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{proveedor?.name || nombre || "Proveedor"}</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              CUIT {proveedor?.taxId || taxId || "—"}
              {proveedor?.aliases ? ` · también figura como: ${proveedor.aliases}` : ""}
              {(proveedor?.currentAccount || ledger?.esCuentaCorriente) && (
                <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "1px 7px" }}>
                  CUENTA CORRIENTE
                </span>
              )}
            </div>
          </div>
          <span style={{ display: "inline-flex", gap: 6 }}>
            {onPagoSinFactura && (
              <button type="button" onClick={onPagoSinFactura} style={{ ...input, cursor: "pointer", fontWeight: 800, background: "#fff7ed", color: "#b45309", borderColor: "#fdba74" }} title="Se pagó algo y todavía no está la factura">
                + Pago sin factura
              </button>
            )}
            {onCargarFactura && (
              <button type="button" onClick={onCargarFactura} style={{ ...input, cursor: "pointer", fontWeight: 800, background: "#16a34a", color: "#fff", borderColor: "#15803d" }}>
                + Cargar factura
              </button>
            )}
            <button type="button" onClick={onCerrar} style={{ ...input, cursor: "pointer", fontWeight: 700 }}>Cerrar</button>
          </span>
        </div>

        {!proveedor && (
          <div style={{ ...caja, marginTop: 12, background: "#fffbeb", borderColor: "#fde68a" }}>
            Este proveedor no está en el listado. Dalo de alta para poder fijarle el tipo de gasto y la condición de pago.{" "}
            <button type="button" style={{ ...input, cursor: "pointer", fontWeight: 700 }} onClick={() => onAltaProveedor(nombre, taxId)}>
              + Dar de alta
            </button>
          </div>
        )}

        {proveedor && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 12 }}>
            <div style={caja}>
              <div style={titulo}>Grupo de costo (tipo · grupo)</div>
              <select
                style={{ ...input, width: "100%" }}
                value={proveedor.grupoCosto || ""}
                onChange={(e) => onUpdateProveedor(proveedor.id, "grupoCosto", e.target.value || undefined)}
              >
                <option value="">Sin grupo de costo</option>
                {renglonesEgreso.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, cursor: proveedor.grupoCosto ? "pointer" : "not-allowed" }}>
                <input
                  type="checkbox"
                  disabled={!proveedor.grupoCosto}
                  checked={!!proveedor.tipoGastoLocked && !!proveedor.grupoCosto}
                  onChange={(e) => onUpdateProveedor(proveedor.id, "tipoGastoLocked", e.target.checked)}
                />
                🔒 Candado: cada factura nueva de este proveedor entra en este grupo
              </label>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                {fv ? `Sus pagos van al cash flow en ${fv.kind === "fijo" ? "un grupo FIJO" : "un grupo VARIABLE"} (EGRESOS · ${proveedor?.currentAccount ? "CUENTAS CORRIENTES" : "PROVEEDORES"}).` : "Elegí el grupo: ahí van sus pagos en el cash flow."}
              </div>
            </div>

            <div style={caja}>
              <div style={titulo}>Condición de pago habitual</div>
              <select
                style={{ ...input, width: "100%" }}
                value={cond?.tipo || ""}
                onChange={(e) => {
                  const t = e.target.value;
                  setCond(t === "contado" ? { tipo: "contado" } : t === "dias" ? { tipo: "dias", dias: 30 } : t === "diaDelMes" ? { tipo: "diaDelMes", dia: 10 } : undefined);
                }}
              >
                <option value="">Sin condición (la fecha se carga en cada factura)</option>
                <option value="contado">Contado (el día de la factura)</option>
                <option value="dias">A N días de la factura</option>
                <option value="diaDelMes">El día X de cada mes</option>
              </select>
              {cond?.tipo === "dias" && (
                <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                  Días:{" "}
                  <input style={{ ...input, width: 70 }} type="number" min={0} value={cond.dias} onChange={(e) => setCond({ tipo: "dias", dias: Number(e.target.value) || 0 })} />
                </label>
              )}
              {cond?.tipo === "diaDelMes" && (
                <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                  Día del mes:{" "}
                  <input style={{ ...input, width: 70 }} type="number" min={1} max={31} value={cond.dia} onChange={(e) => setCond({ tipo: "diaDelMes", dia: Number(e.target.value) || 1 })} />
                </label>
              )}
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Cada factura sin pagar toma su fecha de pago de acá ({textoCondicion(cond)}) y aparece en Pagos programados.
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13 }}>
                <input type="checkbox" checked={!!proveedor.currentAccount} onChange={(e) => onUpdateProveedor(proveedor.id, "currentAccount", e.target.checked)} />
                Tiene cuenta corriente (convenio de pago diferido)
              </label>
            </div>
          </div>
        )}

        {proveedor && (
          <div style={{ ...caja, marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "grid", gap: 3 }}>Dirección
              <input style={input} value={proveedor.direccion || ""} onChange={(e) => onUpdateProveedor(proveedor.id, "direccion", e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "grid", gap: 3 }}>Contacto
              <input style={input} value={proveedor.contacto || ""} onChange={(e) => onUpdateProveedor(proveedor.id, "contacto", e.target.value)} />
            </label>
          </div>
        )}

        {pagosSinFactura.length > 0 && (
          <div style={{ ...caja, marginTop: 12, background: "#fff7ed", borderColor: "#fdba74" }}>
            <div style={{ ...titulo, color: "#b45309" }}>
              ⏳ Pagos sin factura · a favor {money(pagosSinFactura.reduce((a, p) => a + p.amount, 0))}
            </div>
            <div style={{ fontSize: 12.5, color: "#7c2d12", marginBottom: 6 }}>
              Se pagó y la factura todavía no llegó: hace falta una explicación. Click derecho sobre el pago: cargar la
              factura, o si es un gasto en negro cargar su comprobante, o que un responsable asuma la falta de la factura
              (queda como firmante).
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {pagosSinFactura.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: "1px solid #fed7aa", cursor: "context-menu" }}
                    title="Click derecho: cargar la factura, comprobante o lo asume un responsable"
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setMenuPago({ x: ev.clientX, y: ev.clientY, id: p.id });
                    }}
                  >
                    <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>{p.date ? `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}/${p.date.slice(0, 4)}` : "—"}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>{money(p.amount)}</td>
                    <td style={{ padding: "3px 6px", textAlign: "center" }}>{p.administration === "negro" ? "N" : "B"}</td>
                    <td style={{ padding: "3px 6px", color: p.dias > 30 ? "#b91c1c" : "#b45309", fontWeight: 700 }}>hace {p.dias} día{p.dias === 1 ? "" : "s"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Facturas ({facturas.length})</div>
          {facturas.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>No hay facturas cargadas de este proveedor.</div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <tbody>
                  {[...facturas].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate)).map((f) => (
                    <tr key={f.id} onClick={() => onAbrirFactura?.(f.id)} style={{ cursor: onAbrirFactura ? "pointer" : undefined, borderBottom: "1px solid #f1f5f9", background: f.pagada ? undefined : "#fffbeb" }}>
                      <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{f.invoiceDate ? `${f.invoiceDate.slice(8, 10)}/${f.invoiceDate.slice(5, 7)}/${f.invoiceDate.slice(0, 4)}` : "—"}</td>
                      <td style={{ padding: "3px 6px" }}>{f.receiptLetter} {f.invoiceNumber || "—"}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>{money(f.total)}</td>
                      <td style={{ padding: "3px 6px", color: f.pagada ? "#166534" : "#b45309", fontWeight: 700 }}>
                        {f.pagada ? `✓ Pagada · ${f.pagoTexto}` : f.fechaPrevista ? `Sin pagar · vence ${f.fechaPrevista.slice(8, 10)}/${f.fechaPrevista.slice(5, 7)}` : "Sin pagar"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={{ ...titulo, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Notas de crédito ({notasCredito.length})</span>
            {onNotaCredito && (
              <button type="button" onClick={() => onNotaCredito()} style={{ ...input, cursor: "pointer", fontWeight: 800, fontSize: 12, textTransform: "none", letterSpacing: 0, background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }}>
                + Nota de crédito
              </button>
            )}
          </div>
          {notasCredito.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>No hay notas de crédito de este proveedor.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {[...notasCredito].sort((a, b) => b.date.localeCompare(a.date)).map((n) => (
                  <tr key={n.id} onClick={() => onNotaCredito?.(n.id)} style={{ cursor: onNotaCredito ? "pointer" : undefined, borderBottom: "1px solid #f1f5f9" }} title="Click: ver o editar la nota de crédito">
                    <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{n.date ? `${n.date.slice(8, 10)}/${n.date.slice(5, 7)}/${n.date.slice(0, 4)}` : "—"}</td>
                    <td style={{ padding: "3px 6px" }}>NC {n.receiptLetter} {n.number || "—"}{n.source === "arca" ? " · ARCA" : ""}</td>
                    <td style={{ padding: "3px 6px", color: "#475569" }}>{n.aplicaA ? `aplica a ${n.aplicaA}` : "a la cuenta"}{n.motivo ? ` · ${n.motivo}` : ""}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700, color: "#166534" }}>−{money(n.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Cuenta corriente</div>
          {ledger ? (
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13 }}>
              <span>Comprado <strong>{money(ledger.comprado)}</strong></span>
              {Number(ledger.notasCredito || 0) > 0 && <span>Notas de crédito <strong>−{money(Number(ledger.notasCredito))}</strong></span>}
              <span>Pagado <strong>{money(ledger.pagado)}</strong></span>
              <span style={{ color: ledger.saldo > 1 ? "#b45309" : "#16a34a", fontWeight: 800 }}>
                {ledger.saldo > 1 ? `Debemos ${money(ledger.saldo)}` : ledger.saldo < -1 ? `A favor ${money(Math.abs(ledger.saldo))}` : "Al día"}
              </span>
              {ledger.facturasSinPago > 0 && (
                <span style={{ color: "#b45309" }}>
                  {ledger.facturasSinPago} factura(s) sin pago vinculado · {money(ledger.deudaSinConciliar)}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#64748b" }}>Sin facturas ni pagos registrados.</div>
          )}
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Próximos pagos (facturas sin pagar)</div>
          {porPagar.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>No hay facturas pendientes con fecha de pago.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {porPagar.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "4px 6px" }}>{f.invoiceNumber || "sin número"}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{money(f.total)}</td>
                    <td style={{ padding: "4px 6px" }}>
                      <input style={input} type="date" value={f.fechaPago} onChange={(e) => e.target.value && onFechaFactura(f.id, e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px", fontSize: 11.5, color: "#64748b" }}>
                      {f.fechaElegida ? "fecha elegida" : "según la condición"}
                      {f.administration === "negro" ? " · negro" : " · blanco"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ ...caja, marginTop: 10 }}>
          <div style={titulo}>Historial (compras suman, pagos restan)</div>
          {!ledger || ledger.movimientos.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b" }}>Sin movimientos.</div>
          ) : (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <tbody>
                  {[...ledger.movimientos].reverse().map((m) => (
                    <tr key={m.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{m.date ? `${m.date.slice(8, 10)}/${m.date.slice(5, 7)}/${m.date.slice(0, 4)}` : "—"}</td>
                      <td style={{ padding: "3px 6px" }}>{m.type === "compra" ? "Compra" : m.type === "nota_credito" ? "Crédito" : "Pago"} · {m.detail}</td>
                      <td style={{ padding: "3px 6px", textAlign: "center" }}>{m.administration === "negro" ? "N" : "B"}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: m.type === "compra" ? "#b45309" : "#16a34a", fontWeight: 700 }}>
                        {m.type === "compra" ? "+" : "−"}{money(Math.abs(m.amount))}
                      </td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: "#475569" }}>{money(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      {menuPago && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4100 }} onClick={(e) => { e.stopPropagation(); setMenuPago(null); }} onContextMenu={(e) => { e.preventDefault(); setMenuPago(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: menuPago.x, top: menuPago.y, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 4, minWidth: 260 }}>
            {[
              { label: "📄 Cargar la factura (y vincular este pago)", run: () => onCargarFacturaDePago?.(menuPago.id) },
              { label: "🧾 Es gasto en negro: cargar comprobante…", run: () => setResolver({ id: menuPago.id, tipo: "comprobante", firmante: "", detalle: "" }) },
              { label: "✍️ Lo asume un responsable (sin factura)…", run: () => setResolver({ id: menuPago.id, tipo: "responsable", firmante: "", detalle: "" }) },
            ].map((o) => (
              <button key={o.label} type="button" style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, borderRadius: 6 }}
                onClick={() => { setMenuPago(null); o.run(); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {resolver && (
        <div onClick={(e) => { e.stopPropagation(); setResolver(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 4200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "80px 12px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(480px, 100%)", padding: 16, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {resolver.tipo === "comprobante" ? "Gasto en negro · comprobante" : "Un responsable asume la falta de la factura"}
            </div>
            <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "grid", gap: 3 }}>
              {resolver.tipo === "comprobante" ? "Comprobante (número, recibo, ticket, qué es)" : "Por qué no hay factura"}
              <input style={input} value={resolver.detalle} onChange={(e) => setResolver({ ...resolver, detalle: e.target.value })} autoFocus />
            </label>
            {/* El firmante es el usuario que opera (Nicolas, 2026-10-16): no se elige. */}
            <FirmanteFijo />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {resolver.tipo === "comprobante"
                ? "El pago queda respaldado por el comprobante y deja de pedir factura. El firmante responde por él."
                : "El firmante aprueba el gasto sin factura y queda registrado como responsable de esa aprobación."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" style={{ ...input, cursor: "pointer" }} onClick={() => setResolver(null)}>Cancelar</button>
              <button
                type="button"
                disabled={!resolver.detalle.trim()}
                style={{ ...input, cursor: resolver.detalle.trim() ? "pointer" : "not-allowed", fontWeight: 800, background: resolver.detalle.trim() ? "#16a34a" : "#bbf7d0", color: "#fff", borderColor: "#15803d" }}
                onClick={() => {
                  onResolverSinFactura?.(resolver.id, { tipo: resolver.tipo, firmante: resolver.firmante, detalle: resolver.detalle.trim(), fecha: new Date().toISOString().slice(0, 10) });
                  setResolver(null);
                }}
              >
                Firmar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
