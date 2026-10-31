// FICHA DEL PROVEEDOR (click derecho desde Compras y analisis de gastos, cuentas corrientes y facturas).
// Datos, tipo de gasto con candado 🔒, condicion de pago habitual, cuenta corriente, proximos pagos e
// historial. Es una sola ficha para todo el sistema: se abre desde donde este vinculado el proveedor.
import React from "react";
import { textoCondicion, type CondicionPago, type FacturaPorPagar } from "../domain/proveedores";
import { FirmanteFijo } from "./FirmanteSelect";

import NumInput from "./NumInput";
type Movimiento = { key: string; type: "compra" | "pago" | "nota_credito"; date: string; detail: string; amount: number; saldo: number; administration: "blanco" | "negro"; invoiceId?: number; paymentId?: number };

export function FichaProveedor({
  nombre,
  taxId,
  proveedor,
  ledger: ledgerTodas,
  porPagar: porPagarTodas,
  renglonesEgreso,
  fvPorRenglon,
  money,
  onUpdateProveedor,
  onAltaProveedor,
  onFechaFactura,
  onCerrar,
  facturas: facturasTodas = [],
  onCargarFactura,
  onAbrirFactura,
  pagosSinFactura: pagosSinFacturaTodos = [],
  onPagoSinFactura,
  notasCredito: notasCreditoTodas = [],
  onNotaCredito,
  onAbrirResumen,
  personas = [],
  onResolverSinFactura,
  onCargarFacturaDePago,
  onEditarPago,
  onQuitarPago,
  onEditarDatos,
  onBorrarFactura,
  onSoltarDebito,
  convenios = [],
  onAbrirConvenio,
  tarjetas = [],
  ledgersPorEmpresa = [],
}: {
  // Tarjetas de credito para el debito automatico (las de las empresas que ve el usuario).
  tarjetas?: Array<{ id: number; nombre: string; company: string }>;
  // La cuenta del proveedor POR EMPRESA (solo las que ve el usuario y tienen movimientos). Con dos, la
  // ficha las muestra por separado: se elige cual mirar.
  ledgersPorEmpresa?: Array<{ company: string; short: string; ledger: NonNullable<Parameters<typeof FichaProveedor>[0]["ledger"]> }>;
  // Convenios de cuenta corriente con este proveedor (Desendeudamiento): su plan de cuotas.
  convenios?: Array<{ id: number; concepto: string; total: number; pagado: number; pendiente: number; proxima?: { fecha: string; monto: number }; facturas: number }>;
  onAbrirConvenio?: (deudaId: number) => void;
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
    debitoAutomatico?: boolean;
    tarjetaDebitoId?: number | null;
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
  facturas?: Array<{ id: number; invoiceDate: string; receiptLetter: string; invoiceNumber: string; total: number; pagada: boolean; pagoTexto: string; fechaPrevista?: string; company: string; resumenTarjeta?: { texto: string; cuentaId: number; statementId: number | null } }>;
  // Pagada con tarjeta: abre la ficha de la tarjeta en el resumen donde se pago (2026-10-31).
  onAbrirResumen?: (cuentaId: number, statementId: number | null) => void;
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
  // Todo se puede corregir (Nicolas, 2026-10-16): editar o quitar un pago cargado (CostEntry).
  onEditarPago?: (pagoId: number) => void;
  onQuitarPago?: (pagoId: number) => void;
  // Corregir los datos del proveedor (nombre, CUIT, condicion de IVA...): la misma ventana del listado.
  onEditarDatos?: () => void;
  // Borrar una factura (pregunta si se lleva tambien sus pagos) y soltar un debito del banco del proveedor.
  onBorrarFactura?: (id: number) => void;
  onSoltarDebito?: (bankEntryId: number) => void;
}) {
  // Proveedor de las dos empresas: la evolucion se mira separada, una empresa por vez.
  const separado = ledgersPorEmpresa.length > 1;
  const [empresaVista, setEmpresaVista] = React.useState<string>(ledgersPorEmpresa[0]?.company || "");
  const deLaVista = (company: string) => !separado || company === empresaVista;
  const ledger = separado ? ledgersPorEmpresa.find((x) => x.company === empresaVista)?.ledger : ledgerTodas;
  const porPagar = porPagarTodas.filter((f) => deLaVista(f.company));
  const facturas = facturasTodas.filter((f) => deLaVista(f.company));
  const pagosSinFactura = pagosSinFacturaTodos.filter((p) => deLaVista(p.company));
  const notasCredito = notasCreditoTodas.filter((n) => deLaVista(n.company));
  const nombreTarjeta = (id?: number | null) => tarjetas.find((t) => t.id === id)?.nombre || "tarjeta";
  const [menuPago, setMenuPago] = React.useState<null | { x: number; y: number; id: number }>(null);
  // Click derecho sobre un renglon del historial: abrir la factura, editar o quitar el pago, abrir la nota.
  const [menuMov, setMenuMov] = React.useState<null | { x: number; y: number; mov: Movimiento }>(null);
  const quitarPago = (id: number, amount: number, date: string) => {
    if (window.confirm(`¿Quitar el pago de ${money(amount)} del ${date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : "sin fecha"}?\n\nSale del cash flow y de la cuenta de donde salió. Si pagaba una factura, la factura vuelve a quedar impaga.`)) {
      onQuitarPago?.(id);
    }
  };
  const [resolver, setResolver] = React.useState<null | { id: number; tipo: "comprobante" | "responsable"; firmante: string; detalle: string }>(null);
  const cond = proveedor?.condicionPago;
  const fv = proveedor?.grupoCosto ? { kind: proveedor.grupoCosto.startsWith("fijo|") ? "fijo" : "variable", locked: false } : undefined;
  void fvPorRenglon;
  const setCond = (c: CondicionPago | undefined) => proveedor && onUpdateProveedor(proveedor.id, "condicionPago", c);
  const caja: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" };
  const titulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
  const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13 };
  // EDITAR Y BORRAR A LA VISTA en cada renglon (Nicolas, 2026-10-20: "asi como poder acceder a una edicion
  // debo poder borrar tambien"). El click derecho sigue andando igual.
  const btnFila = (rojo = false): React.CSSProperties => ({
    border: `1px solid ${rojo ? "#fecaca" : "#cbd5e1"}`, background: "#fff", color: rojo ? "#b91c1c" : "#334155",
    borderRadius: 5, padding: "1px 6px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginLeft: 4, whiteSpace: "nowrap",
  });
  const acciones = (items: Array<{ texto: string; titulo: string; rojo?: boolean; run?: () => void }>) => (
    <td style={{ padding: "2px 4px", textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
      {items.filter((i) => i.run).map((i) => (
        <button key={i.texto} type="button" title={i.titulo} style={btnFila(i.rojo)} onClick={(e) => { e.stopPropagation(); i.run!(); }}>
          {i.texto}
        </button>
      ))}
    </td>
  );

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
            {onEditarDatos && (
              <button type="button" onClick={onEditarDatos} style={{ ...input, cursor: "pointer", fontWeight: 800 }} title="Corregir los datos del proveedor">
                ✎ Editar datos
              </button>
            )}
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

        {separado && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "#64748b" }}>Proveedor de las dos empresas · ver la cuenta de:</span>
            {ledgersPorEmpresa.map((x) => (
              <button
                key={x.company}
                type="button"
                onClick={() => setEmpresaVista(x.company)}
                style={{ ...input, cursor: "pointer", fontWeight: 800, ...(x.company === empresaVista ? { background: "#0f172a", color: "#fff", borderColor: "#0f172a" } : {}) }}
              >
                {x.short}
              </button>
            ))}
          </div>
        )}

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
                  <NumInput style={{ ...input, width: 70 }} min={0} value={cond.dias} onChange={(e) => setCond({ tipo: "dias", dias: Number(e.target.value) || 0 })} />
                </label>
              )}
              {cond?.tipo === "diaDelMes" && (
                <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                  Día del mes:{" "}
                  <NumInput style={{ ...input, width: 70 }} min={1} max={31} value={cond.dia} onChange={(e) => setCond({ tipo: "diaDelMes", dia: Number(e.target.value) || 1 })} />
                </label>
              )}
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Cada factura sin pagar toma su fecha de pago de acá ({textoCondicion(cond)}) y aparece en Pagos programados.
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13 }}>
                <input type="checkbox" checked={!!proveedor.currentAccount} onChange={(e) => onUpdateProveedor(proveedor.id, "currentAccount", e.target.checked)} />
                Tiene cuenta corriente (convenio de pago diferido)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13 }}>
                <input type="checkbox" checked={!!proveedor.debitoAutomatico} onChange={(e) => onUpdateProveedor(proveedor.id, "debitoAutomatico", e.target.checked)} />
                Débito automático
              </label>
              {proveedor.debitoAutomatico && (
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  <select
                    style={{ ...input, width: "100%" }}
                    value={proveedor.tarjetaDebitoId ?? ""}
                    onChange={(e) => onUpdateProveedor(proveedor.id, "tarjetaDebitoId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">De la cuenta del banco (sin tarjeta)</option>
                    {tarjetas.map((t) => (
                      <option key={t.id} value={t.id}>Tarjeta {t.nombre}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {proveedor.tarjetaDebitoId != null
                      ? `Sus facturas se pagan con el resumen de la tarjeta ${nombreTarjeta(proveedor.tarjetaDebitoId)} (Bancos y tarjetas): no se programan aparte, para no pagarlas dos veces.`
                      : "Lo debita el banco: sus facturas se programan con la condición de pago y el débito del extracto las paga."}
                  </div>
                </div>
              )}
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
                    title="Click derecho: cargar la factura, comprobante, lo asume un responsable, editar o quitar el pago"
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
                    {acciones([
                      { texto: "✎ Editar", titulo: "Corregir el pago", run: onEditarPago ? () => onEditarPago(p.id) : undefined },
                      { texto: "🗑 Borrar", titulo: "Quitar el pago (sale del cash flow)", rojo: true, run: onQuitarPago ? () => quitarPago(p.id, p.amount, p.date) : undefined },
                    ])}
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
                        {f.resumenTarjeta && (
                          <span
                            title="Abrir la ficha de la tarjeta en este resumen"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onAbrirResumen?.(f.resumenTarjeta!.cuentaId, f.resumenTarjeta!.statementId);
                            }}
                            style={{ marginLeft: 6, cursor: "pointer", fontSize: 11, padding: "1px 7px", borderRadius: 999, color: f.resumenTarjeta.statementId ? "#1e40af" : "#b91c1c", background: f.resumenTarjeta.statementId ? "#dbeafe" : "#fee2e2" }}
                          >
                            {f.resumenTarjeta.texto}
                          </span>
                        )}
                      </td>
                      {acciones([
                        { texto: "✎ Editar", titulo: "Abrir la factura para corregirla", run: onAbrirFactura ? () => onAbrirFactura(f.id) : undefined },
                        { texto: "🗑 Borrar", titulo: "Borrar la factura", rojo: true, run: onBorrarFactura ? () => onBorrarFactura(f.id) : undefined },
                      ])}
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
                    {acciones([{ texto: "✎ Editar / borrar", titulo: "Abrir la nota de crédito (ahí se corrige o se elimina)", run: onNotaCredito ? () => onNotaCredito(n.id) : undefined }])}
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

        {convenios.length > 0 && (
          <div style={{ ...caja, marginTop: 10 }}>
            <div style={titulo}>Convenios de pago (Desendeudamiento)</div>
            {convenios.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span>
                  <b>{c.concepto}</b>
                  <span style={{ color: "#64748b" }}>
                    {" "}· {c.facturas ? `${c.facturas} factura(s)` : "sin facturas"} · total {money(c.total)} · pagado {money(c.pagado)} ·{" "}
                  </span>
                  <b style={{ color: "#b45309" }}>pendiente {money(c.pendiente)}</b>
                  {c.proxima && <span style={{ color: "#64748b" }}> · próxima {c.proxima.fecha.split("-").reverse().join("/")} {money(c.proxima.monto)}</span>}
                </span>
                {onAbrirConvenio && (
                  <button type="button" onClick={() => onAbrirConvenio(c.id)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Abrir el convenio
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
                      {f.tarjetaDebitoId != null && <strong style={{ color: "#7c3aed" }}> · se debita de la tarjeta {nombreTarjeta(f.tarjetaDebitoId)}</strong>}
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
                    <tr
                      key={m.key}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "context-menu" }}
                      title="Click derecho: corregir este movimiento"
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setMenuMov({ x: ev.clientX, y: ev.clientY, mov: m });
                      }}
                    >
                      <td style={{ padding: "3px 6px", color: "#64748b", whiteSpace: "nowrap" }}>{m.date ? `${m.date.slice(8, 10)}/${m.date.slice(5, 7)}/${m.date.slice(0, 4)}` : "—"}</td>
                      <td style={{ padding: "3px 6px" }}>{m.type === "compra" ? "Compra" : m.type === "nota_credito" ? "Crédito" : "Pago"} · {m.detail}</td>
                      <td style={{ padding: "3px 6px", textAlign: "center" }}>{m.administration === "negro" ? "N" : "B"}</td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: m.type === "compra" ? "#b45309" : "#16a34a", fontWeight: 700 }}>
                        {m.type === "compra" ? "+" : "−"}{money(Math.abs(m.amount))}
                      </td>
                      <td style={{ padding: "3px 6px", textAlign: "right", color: "#475569" }}>{money(m.saldo)}</td>
                      {(() => {
                        const bankId = m.type === "pago" && m.key.startsWith("pay-banco-") ? Number(m.key.slice("pay-banco-".length)) : NaN;
                        if (m.type === "compra")
                          return acciones([
                            { texto: "✎ Editar", titulo: "Abrir la factura", run: m.invoiceId != null && onAbrirFactura ? () => onAbrirFactura(m.invoiceId!) : undefined },
                            { texto: "🗑 Borrar", titulo: "Borrar la factura", rojo: true, run: m.invoiceId != null && onBorrarFactura ? () => onBorrarFactura(m.invoiceId!) : undefined },
                          ]);
                        if (m.type === "nota_credito") {
                          const ncId = Number(m.key.slice(3));
                          return acciones([{ texto: "✎ Editar / borrar", titulo: "Abrir la nota de crédito", run: onNotaCredito && Number.isFinite(ncId) ? () => onNotaCredito(ncId) : undefined }]);
                        }
                        if (Number.isFinite(bankId))
                          return acciones([
                            {
                              texto: "Soltar",
                              titulo: "Es un débito del banco: lo suelta de la factura (el movimiento del banco queda)",
                              rojo: true,
                              run: onSoltarDebito ? () => window.confirm("¿Soltar este débito del banco de la factura? El movimiento del banco queda, la factura vuelve a quedar sin pagar.") && onSoltarDebito(bankId) : undefined,
                            },
                          ]);
                        return acciones([
                          { texto: "✎ Editar", titulo: "Corregir el pago", run: m.paymentId != null && onEditarPago ? () => onEditarPago(m.paymentId!) : undefined },
                          { texto: "🗑 Borrar", titulo: "Quitar el pago (sale del cash flow)", rojo: true, run: m.paymentId != null && onQuitarPago ? () => quitarPago(m.paymentId!, m.amount, m.date) : undefined },
                        ]);
                      })()}
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
              ...(onEditarPago ? [{ label: "✏️ Editar el pago…", run: () => onEditarPago(menuPago.id) }] : []),
              ...(onQuitarPago
                ? [{
                    label: "🗑 Quitar el pago",
                    run: () => {
                      const p = pagosSinFactura.find((x) => x.id === menuPago.id);
                      quitarPago(menuPago.id, p?.amount || 0, p?.date || "");
                    },
                  }]
                : []),
            ].map((o) => (
              <button key={o.label} type="button" style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, borderRadius: 6 }}
                onClick={() => { setMenuPago(null); o.run(); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {menuMov && (() => {
        const m = menuMov.mov;
        const kindPago = m.type === "pago" ? (m.key.startsWith("pay-banco-") ? "banco" : "gasto") : "";
        const ncId = m.type === "nota_credito" ? Number(m.key.slice(3)) : NaN;
        const opciones: Array<{ label: string; run?: () => void }> =
          m.type === "compra"
            ? m.invoiceId != null && onAbrirFactura
              ? [{ label: "✏️ Abrir la factura (editar o borrar)", run: () => onAbrirFactura(m.invoiceId!) }]
              : [{ label: "Esta compra no tiene factura para abrir" }]
            : m.type === "nota_credito"
            ? onNotaCredito && Number.isFinite(ncId)
              ? [{ label: "✏️ Abrir la nota de crédito (editar o eliminar)", run: () => onNotaCredito(ncId) }]
              : []
            : kindPago === "banco"
            ? [{ label: "Es un débito del banco: se corrige en Bancos y tarjetas" }]
            : m.paymentId != null
            ? [
                ...(onEditarPago ? [{ label: "✏️ Editar el pago…", run: () => onEditarPago(m.paymentId!) }] : []),
                ...(onQuitarPago ? [{ label: "🗑 Quitar el pago", run: () => quitarPago(m.paymentId!, m.amount, m.date) }] : []),
              ]
            : [];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 4100 }} onClick={(e) => { e.stopPropagation(); setMenuMov(null); }} onContextMenu={(e) => { e.preventDefault(); setMenuMov(null); }}>
            <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: menuMov.x, top: menuMov.y, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 4, minWidth: 260 }}>
              <div style={{ fontSize: 11, color: "#64748b", padding: "4px 10px" }}>{m.detail} · {money(Math.abs(m.amount))}</div>
              {opciones.length === 0 && <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 10px" }}>No hay nada para corregir acá.</div>}
              {opciones.map((o) =>
                o.run ? (
                  <button key={o.label} type="button" style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, borderRadius: 6 }}
                    onClick={() => { setMenuMov(null); o.run!(); }}>
                    {o.label}
                  </button>
                ) : (
                  <div key={o.label} style={{ fontSize: 12.5, color: "#64748b", padding: "6px 10px" }}>{o.label}</div>
                )
              )}
            </div>
          </div>
        );
      })()}
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
