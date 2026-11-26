// FICHA DE TARJETA (Nicolas, 2026-10-31): una ficha por tarjeta (la cuenta que emite el resumen) y adentro la
// ficha de cada resumen. Cada renglon del resumen se linkea con el pago que se cargo con esa tarjeta (y la
// factura que paga), o va a "Comisiones, tasas e intereses (tarjeta)". Los renglones se ven separados por
// tarjeta fisica y su responsable. Todo se edita con click derecho. Ver domain/fichaTarjeta.ts.
import React, { useMemo, useState } from "react";
import type { FichaResumen, RenglonFicha, TarjetaF, PagoF } from "../domain/fichaTarjeta";
import { TITULO_COMISIONES_TARJETA, cuotaDelTexto, montoCuota, esPagoDeComisiones } from "../domain/fichaTarjeta";
import { BuscadorVinculo, IconoEstado, ItemMenu, MenuFicha, SepMenu, TituloMenu, Z_FICHA, ddmm, type OpcionVinculo } from "./VinculoUi";
import type { ImpuestosDeLaFicha } from "./ImpuestosDelGrupo";
import type { GrupoImpuestos } from "../domain/impuestosBancarios";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "top" };
const inputMini: React.CSSProperties = { padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12.5, width: "100%" };
const campo: React.CSSProperties = { display: "grid", gap: 2 };
const rotulo: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#64748b" };

export type FichaTarjetaProps = {
  cuenta: TarjetaF;
  plasticos: TarjetaF[];
  fichas: FichaResumen[]; // de esta cuenta, cualquier orden
  pagos: PagoF[]; // pagos con tarjeta de esta cuenta (para linkear a mano)
  etiquetaPago: (pagoId: number) => string; // "Pintureria · factura A 3-5001"
  pagoComisiones: (statementId: number) => { amount: number; date: string; supplier: string } | null;
  // EL PAGO DEL RESUMEN (21/11/2026): pagado, baja la cuenta por su total el dia del vencimiento. null = resumen
  // anterior al 1/11/2026, que sigue como estaba. Ver domain/pagoResumenTarjeta.ts.
  repartoDelResumen?: (statementId: number) => { total: number; linkeado: number; resto: number; deMas: number; pagado: boolean; fecha: string; montoPagado: number; financiado: number } | null;
  companyShort: (c: string) => string;
  money: (n: number, moneda?: string) => string;
  statementInicial?: number | null;
  // Al linkear un pago que NO esta cargado con la tarjeta, se le pasa la cuenta de la tarjeta: con eso deja
  // de bajar la cuenta el dia de la compra y baja el dia del vencimiento del resumen (18/11/2026).
  onLinkear: (renglonId: number, pagoId: number, cuota: number, cuentaTarjetaId?: number) => void;
  cuentaTarjetaId?: number;
  onSoltar: (renglonId: number) => void;
  onComisiones: (renglonId: number, si: boolean) => void;
  onAceptarSugerencias: (statementId: number) => void;
  onPlastico: (cardId: number, patch: Partial<Pick<TarjetaF, "responsable" | "numerosAnteriores" | "lastDigits" | "cuentaTarjetaId">>) => void;
  // 2026-11-14: los datos del resumen (cierre, vencimiento, totales, pago minimo, pagado) se corrigen aca.
  onResumen: (statementId: number, campo: string, valor: any) => void;
  // 18/11/2026: cargar y quitar resumenes se hace aca, porque el bloque "Resúmenes · cierres y
  // vencimientos" lo reemplaza esta ficha.
  onAgregarResumen?: () => void;
  // SUBIR EL RESUMEN DESDE ACA (Nicolas, 25/11/2026): el PDF del resumen se sube en la ficha de su tarjeta.
  onSubirResumen?: (files: File[]) => void;
  onQuitarResumen?: (statementId: number) => void;
  // 18/11/2026 (Nicolas): "tarjetas e impuestos y comisiones eso sí lo quiero dentro de las fichas".
  // Los datos de la tarjeta (empresa, nombre, banco, digitos, cuenta, responsable, activa, notas) se
  // editaban en el bloque "Tarjetas" de la solapa, que esta ficha reemplaza.
  onTarjeta: (cardId: number, campo: string, valor: any) => void;
  onQuitarTarjeta?: (cardId: number) => void;
  empresas: Array<{ value: string; short: string }>;
  // Los impuestos y comisiones DE ESTE RESUMEN, con su tilde de pagado.
  impuestosDelResumen?: (statementId: number) => ImpuestosDeLaFicha | null;
  onImpuestosPagados?: (g: GrupoImpuestos, pagado: boolean) => void;
  // 25/11/2026, solo el administrador: marcar un renglón como desconocido o cerrarlo sin link (motivo y firma).
  esAdmin?: boolean;
  onDesconocer?: (renglonId: number, nota: string | null) => void;
  onCerrarSinLink?: (renglonId: number, motivo: string | null) => void;
  onCerrar: () => void;
};

export function FichaTarjeta(p: FichaTarjetaProps) {
  const ordenadas = useMemo(() => [...p.fichas].sort((a, b) => b.resumen.closingDate.localeCompare(a.resumen.closingDate)), [p.fichas]);
  const [sel, setSel] = useState<number | null>(p.statementInicial ?? ordenadas[0]?.resumen.id ?? null);
  const [menu, setMenu] = useState<null | { x: number; y: number; f: RenglonFicha }>(null);
  const [buscar, setBuscar] = useState<RenglonFicha | null>(null);
  const ficha = ordenadas.find((f) => f.resumen.id === sel) || null;

  const opcionesPago = (f: RenglonFicha): OpcionVinculo[] => {
    const q = cuotaDelTexto(f.renglon.installments);
    const out: OpcionVinculo[] = [];
    p.pagos
      .filter((x) => !esPagoDeComisiones(x))
      .forEach((x) => {
        const n = Math.max(1, Math.floor(Number(x.cuotas) || 1));
        for (let c = 1; c <= n; c++) {
          if (q && (q.cuota !== c || q.de !== n)) continue;
          const monto = montoCuota(x);
          out.push({
            id: `${x.id}:${c}`,
            texto: `${p.etiquetaPago(x.id)}${n > 1 ? ` · cuota ${c}/${n}` : ""} · ${p.money(monto)}`,
            detalle: `Compra del ${ddmm(x.date)} por ${p.money(Number(x.amount))}${n > 1 ? ` en ${n} cuotas` : ""}`,
            destacada: Math.abs(monto - Number(f.renglon.amount)) <= 1,
          });
        }
      });
    return out;
  };

  const fila = (f: RenglonFicha) => {
    const r = f.renglon;
    let detalle: React.ReactNode = null;
    if (f.estado === "linkeado" && f.pago) {
      detalle = (
        <span style={{ color: "#166534" }}>
          {p.etiquetaPago(f.pago.id)}
          {(f.pago.cuotas || 1) > 1 ? ` · cuota ${f.cuota}/${f.pago.cuotas}` : ""}
        </span>
      );
    } else if (f.estado === "sugerido" && f.sugerencia) {
      detalle = (
        <span style={{ color: "#b45309" }}>
          ¿{p.etiquetaPago(f.sugerencia.pagoId)}? <small>({f.sugerencia.motivo})</small>
          {f.sugerencia.pasarATarjeta && (
            <small style={{ color: "#7c3aed", fontWeight: 700 }}> · al aceptar se pasa a la tarjeta</small>
          )}
        </span>
      );
    } else if (f.estado === "comision") detalle = <span style={{ color: "#7c3aed" }}>{TITULO_COMISIONES_TARJETA}</span>;
    else if (f.estado === "cerrado") detalle = <span style={{ color: "#64748b" }}>Cerrado sin link · {r.cerradoSinLink?.motivo} ({r.cerradoSinLink?.firmante})</span>;
    else if (f.estado === "desconocido") detalle = <b style={{ color: "#b91c1c" }}>Desconocido{r.desconocido?.nota ? ` · ${r.desconocido.nota}` : ""} ({r.desconocido?.firmante})</b>;
    else if (f.estado === "pago_resumen") detalle = <span style={{ color: "#64748b" }}>pago del resumen anterior (se ve en el banco)</span>;
    else detalle = <b style={{ color: "#b91c1c" }}>falta linkear: buscá el pago con esta tarjeta o mandalo a comisiones</b>;
    return (
      <tr
        key={r.id}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, f });
        }}
        style={{ cursor: "context-menu", background: f.estado === "pendiente" || f.estado === "desconocido" ? "#fef2f2" : f.estado === "sugerido" ? "#fffbeb" : undefined }}
      >
        <td style={{ ...td, width: 28 }}>
          <IconoEstado estado={f.estado} />
        </td>
        <td style={{ ...td, width: 74 }}>{ddmm(r.date)}</td>
        <td style={td}>
          {r.description}
          {r.installments ? <span style={{ color: "#64748b" }}> · cuota {r.installments}</span> : null}
        </td>
        <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{p.money(Number(r.amount), r.currency)}</td>
        <td style={td}>{detalle}</td>
      </tr>
    );
  };

  const tabla = (filas: RenglonFicha[]) => (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
      <thead>
        <tr>
          <th style={th}></th>
          <th style={th}>Fecha</th>
          <th style={th}>Renglón del resumen</th>
          <th style={{ ...th, textAlign: "right" }}>Monto</th>
          <th style={th}>Pago y factura</th>
        </tr>
      </thead>
      <tbody>{filas.map(fila)}</tbody>
    </table>
  );

  // Lo que suman los renglones del resumen (los del PDF, sin los "SU PAGO" del resumen anterior) contra el
  // total tipeado: es el control de que el numero de arriba sea el del resumen de verdad. 2026-11-14.
  const sumaRenglones = ficha
    ? ficha.renglones
        .filter((f) => f.estado !== "pago_resumen" && f.renglon.currency !== "USD")
        .reduce((a, f) => a + Number(f.renglon.amount || 0), 0)
    : 0;
  const difiereElTotal = !!ficha && Math.abs(sumaRenglones - Number(ficha.resumen.totalArs || 0)) > 1;

  const comisiones = ficha ? p.pagoComisiones(ficha.resumen.id) : null;
  const sugeridos = ficha ? ficha.renglones.filter((f) => f.estado === "sugerido").length : 0;

  return (
    <div onClick={p.onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: Z_FICHA, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(1100px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>
              💳 {p.cuenta.name} · {p.cuenta.bank || "banco"} · {p.companyShort(p.cuenta.company)}
            </div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              {p.cuenta.numeroCuenta ? `Cuenta ${p.cuenta.numeroCuenta} · ` : ""}Cada renglón del resumen es control: se linkea con el pago cargado con esta tarjeta. Todos esos pagos se pagan el día del vencimiento del resumen. Lo que no es una compra va a «{TITULO_COMISIONES_TARJETA}». Click derecho en un renglón para linkear.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          {p.onSubirResumen && (
            <label data-subir-resumen title="Subí el PDF del resumen de ESTA tarjeta: lo lee y abre el resumen para linkear" style={{ border: "1px solid #0f172a", background: "#0f172a", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>
              ⬆ Subir resumen (PDF)
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (files.length) p.onSubirResumen!(files);
                }}
              />
            </label>
          )}
          {p.onAgregarResumen && (
            <button type="button" onClick={p.onAgregarResumen} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
              Agregar resumen
            </button>
          )}
          {p.onQuitarTarjeta && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Quitar la tarjeta "${p.cuenta.name}"? Se van sus resúmenes y sus renglones.`)) p.onQuitarTarjeta!(p.cuenta.id);
              }}
              style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#b91c1c" }}
            >
              Quitar la tarjeta
            </button>
          )}
          {p.onQuitarResumen && ficha && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Quitar este resumen? Se van sus renglones y los links que tenga.")) p.onQuitarResumen!(ficha.resumen.id);
              }}
              style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#b91c1c" }}
            >
              Quitar este resumen
            </button>
          )}
          <button type="button" onClick={p.onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            Cerrar
          </button>
          </div>
        </div>

        {/* 18/11/2026 (Nicolas): "tarjetas ... eso sí lo quiero dentro de las fichas". Estos campos se
            editaban en el bloque "Tarjetas" de la solapa, que esta ficha reemplaza. */}
        <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 10px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
            Datos de la tarjeta {p.cuenta.active === false ? "· INACTIVA" : ""}
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 8 }}>
            <label style={campo}>
              <span style={rotulo}>Empresa (la titular)</span>
              <select style={inputMini} value={p.cuenta.company} onChange={(e) => p.onTarjeta(p.cuenta.id, "company", e.target.value)}>
                {p.empresas.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.short}
                  </option>
                ))}
              </select>
            </label>
            <label style={campo}>
              <span style={rotulo}>Nombre</span>
              <input style={inputMini} defaultValue={p.cuenta.name || ""} onBlur={(e) => e.target.value !== (p.cuenta.name || "") && p.onTarjeta(p.cuenta.id, "name", e.target.value)} />
            </label>
            <label style={campo}>
              <span style={rotulo}>Banco</span>
              <input style={inputMini} defaultValue={p.cuenta.bank || ""} onBlur={(e) => e.target.value !== (p.cuenta.bank || "") && p.onTarjeta(p.cuenta.id, "bank", e.target.value)} />
            </label>
            <label style={campo}>
              <span style={rotulo}>Últimos dígitos</span>
              <input style={inputMini} defaultValue={p.cuenta.lastDigits || ""} onBlur={(e) => e.target.value !== (p.cuenta.lastDigits || "") && p.onTarjeta(p.cuenta.id, "lastDigits", e.target.value)} />
            </label>
            <label style={campo}>
              <span style={rotulo}>N.º de cuenta</span>
              <input style={inputMini} defaultValue={p.cuenta.numeroCuenta || ""} onBlur={(e) => e.target.value !== (p.cuenta.numeroCuenta || "") && p.onTarjeta(p.cuenta.id, "numeroCuenta", e.target.value)} />
            </label>
            <label style={campo}>
              <span style={rotulo}>Responsable</span>
              <input style={inputMini} defaultValue={p.cuenta.responsable || ""} onBlur={(e) => e.target.value !== (p.cuenta.responsable || "") && p.onTarjeta(p.cuenta.id, "responsable", e.target.value)} />
            </label>
            <label style={campo}>
              <span style={rotulo}>Números anteriores</span>
              <input style={inputMini} defaultValue={p.cuenta.numerosAnteriores || ""} onBlur={(e) => e.target.value !== (p.cuenta.numerosAnteriores || "") && p.onTarjeta(p.cuenta.id, "numerosAnteriores", e.target.value)} />
            </label>
            <label style={{ ...campo, justifyContent: "flex-end" }}>
              <span style={rotulo}>Activa</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                <input type="checkbox" checked={p.cuenta.active !== false} onChange={(e) => p.onTarjeta(p.cuenta.id, "active", e.target.checked)} />
                {p.cuenta.active !== false ? "Sí, se usa" : "No, de baja"}
              </span>
            </label>
          </div>
          <label style={{ ...campo, marginTop: 8 }}>
            <span style={rotulo}>Notas</span>
            <input style={inputMini} defaultValue={p.cuenta.notes || ""} onBlur={(e) => e.target.value !== (p.cuenta.notes || "") && p.onTarjeta(p.cuenta.id, "notes", e.target.value)} />
          </label>
        </details>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tarjetas físicas y responsables</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Número</th>
                <th style={th}>Nombre</th>
                <th style={th}>Responsable</th>
                <th style={th}>Números anteriores (si el banco cambió el plástico)</th>
                <th style={th}>Activa</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {p.plasticos.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Sin tarjetas físicas: se dan de alta solas al leer el resumen.
                  </td>
                </tr>
              )}
              {p.plasticos.map((t) => (
                <tr key={t.id}>
                  <td style={{ ...td, width: 90 }}>
                    <input style={inputMini} defaultValue={t.lastDigits || ""} onBlur={(e) => e.target.value !== (t.lastDigits || "") && p.onPlastico(t.id, { lastDigits: e.target.value })} />
                  </td>
                  <td style={td}>
                    <input style={inputMini} defaultValue={t.name || ""} onBlur={(e) => e.target.value !== (t.name || "") && p.onTarjeta(t.id, "name", e.target.value)} />
                  </td>
                  <td style={td}>
                    <input style={inputMini} defaultValue={t.responsable || ""} placeholder={t.name} onBlur={(e) => e.target.value !== (t.responsable || "") && p.onPlastico(t.id, { responsable: e.target.value })} />
                  </td>
                  <td style={td}>
                    <input style={inputMini} defaultValue={t.numerosAnteriores || ""} placeholder="ej. 7301" onBlur={(e) => e.target.value !== (t.numerosAnteriores || "") && p.onPlastico(t.id, { numerosAnteriores: e.target.value })} />
                  </td>
                  <td style={{ ...td, width: 60, textAlign: "center" }}>
                    <input type="checkbox" checked={t.active !== false} onChange={(e) => p.onTarjeta(t.id, "active", e.target.checked)} />
                  </td>
                  <td style={{ ...td, width: 40, textAlign: "right" }}>
                    {p.onQuitarTarjeta && (
                      <button
                        type="button"
                        title="Quitar esta tarjeta física"
                        onClick={() => {
                          if (window.confirm(`¿Quitar la tarjeta "${t.name}"?`)) p.onQuitarTarjeta!(t.id);
                        }}
                        style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 6, padding: "2px 6px", cursor: "pointer", color: "#b91c1c" }}
                      >
                        🗑
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Resúmenes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ordenadas.length === 0 && <span style={{ fontSize: 13, color: "#64748b" }}>Sin resúmenes cargados.</span>}
            {ordenadas.map((f) => {
              const activo = f.resumen.id === sel;
              const color = f.completo ? "#166534" : f.obligatorio ? "#b91c1c" : "#64748b";
              return (
                <button
                  key={f.resumen.id}
                  type="button"
                  onClick={() => setSel(f.resumen.id)}
                  title={f.obligatorio ? "" : "Anterior al ejercicio nuevo: el linkeo no es obligatorio"}
                  style={{ border: `2px solid ${activo ? "#0f172a" : "#e2e8f0"}`, background: f.completo ? "#f0fdf4" : f.obligatorio ? "#fef2f2" : "#f8fafc", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: 12.5 }}
                >
                  <b style={{ color }}>{f.completo ? "✓" : f.obligatorio ? `${f.pendientes} sin linkear` : "histórico"}</b> · cierre {ddmm(f.resumen.closingDate)}
                </button>
              );
            })}
          </div>
        </div>

        {ficha && (
          <div style={{ display: "grid", gap: 10, background: "#f8fafc", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                Resumen cierre {ddmm(ficha.resumen.closingDate)} · vence {ddmm(ficha.resumen.dueDate)}
              </div>
              <div style={{ fontSize: 13 }}>
                A pagar <b>{p.money(Number(ficha.resumen.totalArs || 0))}</b>
                {Number(ficha.resumen.totalUsd || 0) ? <> + <b>{p.money(Number(ficha.resumen.totalUsd), "USD")}</b></> : null}
              </div>
              <div style={{ fontSize: 13 }}>
                {ficha.linkeados} linkeado(s) · {ficha.pendientes} sin linkear
              </div>
              {(() => {
                const r = p.repartoDelResumen?.(ficha.resumen.id);
                if (!r) return null;
                return (
                  <div data-pago-resumen style={{ fontSize: 12.5, flexBasis: "100%", color: r.pagado ? "#166534" : "#475569" }}>
                    {r.pagado
                      ? <>✓ Pagado: <b>{p.money(r.montoPagado)}</b> salieron de la cuenta del banco el {ddmm(r.fecha)}.</>
                      : <>Al marcarlo pagado salen <b>{p.money(r.montoPagado)}</b> de la cuenta del banco el {ddmm(r.fecha)}.</>}{" "}
                    {r.financiado > 0 && <span data-financiado style={{ color: "#b45309" }}>Se pagó menos que el total: <b>{p.money(r.financiado)}</b> quedan financiados y vienen en el resumen siguiente. </span>}
                    Linkeado con pagos cargados: <b>{p.money(r.linkeado)}</b>
                    {r.resto > 0 && <> · <span style={{ color: "#b45309" }}>sin linkear: <b>{p.money(r.resto)}</b> (falta cargar o no es nuestro: descargo pendiente)</span></>}
                    {r.deMas > 0 && <> · <span style={{ color: "#b91c1c" }}>lo cargado supera al resumen en <b>{p.money(r.deMas)}</b>: revisar si hay algo dos veces</span></>}
                  </div>
                );
              })()}
              {ficha.completo ? (
                <span style={{ background: "#166534", color: "#fff", borderRadius: 999, padding: "3px 10px", fontWeight: 800, fontSize: 12.5 }}>✓ revisado y linkeado</span>
              ) : !ficha.obligatorio ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>anterior al 1/11/2026: no es obligatorio</span>
              ) : null}
              {sugeridos > 0 && (
                <button type="button" onClick={() => p.onAceptarSugerencias(ficha.resumen.id)} style={{ border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12.5 }}>
                  Aceptar las {sugeridos} sugerencia(s)
                  {ficha.renglones.some((f) => f.sugerencia?.pasarATarjeta) ? " (las cargadas con otro medio pasan a la tarjeta)" : ""}
                </button>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "#475569" }}>
              Todos los pagos linkeados se pagan el <b>{ddmm(ficha.resumen.dueDate)}</b> (vencimiento): recién ese día descuentan de la cuenta del banco.
            </div>

            {/* 2026-11-14 (Nicolas): los datos del resumen se corrigen ACA y la fila de la solapa Tarjetas
                solo los muestra. El lector del PDF los carga; a mano se arreglan si quedaron mal. */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                <div style={{ fontWeight: 800 }}>Datos del resumen</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {ficha.resumen.archivo
                    ? `Lo leyó el lector del PDF (${ficha.resumen.archivo}): los renglones de abajo son los del resumen.`
                    : "Cargado a mano: no hay PDF detrás. Si lo subís, el lector completa estos datos."}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                <label style={campo}>
                  <span style={rotulo}>Tarjeta que lo emite</span>
                  <select style={inputMini} value={ficha.resumen.cardId} onChange={(e) => p.onResumen(ficha.resumen.id, "cardId", Number(e.target.value))}>
                    {[p.cuenta, ...p.plasticos].map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.lastDigits ? ` · ${t.lastDigits}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={campo}>
                  <span style={rotulo}>Cierre</span>
                  <input style={inputMini} type="date" min="2015-01-01" max="2100-12-31" value={ficha.resumen.closingDate || ""} onChange={(e) => p.onResumen(ficha.resumen.id, "closingDate", e.target.value)} />
                </label>
                <label style={campo}>
                  <span style={rotulo}>Vencimiento (el día que se paga)</span>
                  <input style={inputMini} type="date" min="2015-01-01" max="2100-12-31" value={ficha.resumen.dueDate || ""} onChange={(e) => p.onResumen(ficha.resumen.id, "dueDate", e.target.value)} />
                </label>
                <label style={campo}>
                  <span style={rotulo}>Total a pagar $</span>
                  <input style={inputMini} type="number" value={Number(ficha.resumen.totalArs || 0)} onChange={(e) => p.onResumen(ficha.resumen.id, "totalArs", Number(e.target.value) || 0)} />
                </label>
                <label style={campo}>
                  <span style={rotulo}>Total U$S</span>
                  <input style={inputMini} type="number" value={Number(ficha.resumen.totalUsd || 0)} onChange={(e) => p.onResumen(ficha.resumen.id, "totalUsd", Number(e.target.value) || 0)} />
                </label>
                <label style={campo}>
                  <span style={rotulo}>Pago mínimo $</span>
                  <input style={inputMini} type="number" value={Number(ficha.resumen.minPaymentArs || 0)} onChange={(e) => p.onResumen(ficha.resumen.id, "minPaymentArs", Number(e.target.value) || 0)} />
                </label>
                <label style={campo}>
                  <span style={rotulo}>Saldo anterior $</span>
                  <input style={inputMini} type="number" value={Number(ficha.resumen.saldoAnteriorArs || 0)} onChange={(e) => p.onResumen(ficha.resumen.id, "saldoAnteriorArs", Number(e.target.value) || 0)} />
                </label>
                <label style={{ ...campo, justifyContent: "flex-end" }}>
                  <span style={rotulo}>Pagado</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
                    <input type="checkbox" checked={!!ficha.resumen.paid} onChange={(e) => p.onResumen(ficha.resumen.id, "paid", e.target.checked)} />
                    {ficha.resumen.paid ? "Sí, ya se pagó" : "Todavía no"}
                  </span>
                </label>
                <label style={campo} title="Si se pagó menos que el total del resumen, poné acá lo que realmente se pagó: es lo único que sale de la cuenta. Vacío = se pagó el total.">
                  <span style={rotulo}>Monto pagado $ (si no fue el total)</span>
                  <input
                    data-monto-pagado
                    style={inputMini}
                    type="number"
                    min={0}
                    placeholder={String(Number(ficha.resumen.totalArs || 0))}
                    value={Number(ficha.resumen.paidAmountArs || 0) > 0 ? Number(ficha.resumen.paidAmountArs) : ""}
                    onChange={(e) => p.onResumen(ficha.resumen.id, "paidAmountArs", Math.max(0, Number(e.target.value) || 0))}
                  />
                </label>
                {(() => {
                  const total = Number(ficha.resumen.totalArs || 0);
                  const pagado = Number(ficha.resumen.paidAmountArs || 0);
                  const queda = ficha.resumen.paid ? (pagado > 0 ? Math.max(0, Math.round((total - pagado) * 100) / 100) : 0) : total;
                  return (
                    <div data-queda-por-pagar style={campo} title="Lo que falta pagar de este resumen. Si se pagó menos que el total, es lo que quedó financiado: viene en el resumen siguiente.">
                      <span style={rotulo}>Queda por pagar $</span>
                      <b style={{ fontSize: 14, color: queda > 0 ? "#b91c1c" : "#166534" }}>{p.money(queda)}</b>
                    </div>
                  );
                })()}
              </div>
              <label style={campo}>
                <span style={rotulo}>Notas</span>
                <input style={inputMini} defaultValue={ficha.resumen.notes || ""} onBlur={(e) => e.target.value !== (ficha.resumen.notes || "") && p.onResumen(ficha.resumen.id, "notes", e.target.value)} />
              </label>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: difiereElTotal ? "#b91c1c" : "#166534" }}>
                {difiereElTotal
                  ? `⚠ los renglones suman ${p.money(sumaRenglones)} y acá dice ${p.money(Number(ficha.resumen.totalArs || 0))}: revisá el total o si falta algún renglón.`
                  : `✓ el total coincide con lo que suman los renglones (${p.money(sumaRenglones)}).`}
              </div>
            </div>


            {ficha.porPlastico.map((g) => (
              <div key={g.clave}>
                <div style={{ fontWeight: 800, margin: "4px 0" }}>
                  {g.digits ? `Tarjeta ${g.digits}` : ""} {g.holder ? `· ${g.holder}` : ""}
                  <span style={{ fontWeight: 600, color: "#64748b" }}> · {p.money(g.total)}</span>
                </div>
                {tabla(g.renglones)}
              </div>
            ))}

            {/* SIN CAJITA DE PAGO (Nicolas, 25/11/2026): "no quiero que genere ningun egreso". Las comisiones de la tarjeta se
                pagan con el resumen: aca solo se suman aparte y se linkean. Si quedo un pago hecho con la cajita vieja, se
                avisa y se puede quitar (duplica lo que ya salio con el pago de la tarjeta). */}
            {(() => {
              const viejo = p.impuestosDelResumen?.(ficha.resumen.id);
              if (!viejo?.pago || !p.onImpuestosPagados) return null;
              return (
                <div data-pago-comisiones-viejo style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 10, fontSize: 12.5, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span>
                    ⚠ Este resumen tiene un pago de comisiones por <b>{p.money(viejo.grupo.total)}</b> generado con la cajita anterior (débito del {ddmm(viejo.pago.fecha)}). Las comisiones ya se pagan con la tarjeta: ese pago descuenta dos veces.
                  </span>
                  <button type="button" onClick={() => p.onImpuestosPagados!(viejo.grupo, false)} style={{ border: "1px solid #b91c1c", background: "#fff", color: "#b91c1c", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                    Quitar ese pago
                  </button>
                </div>
              );
            })()}

            <div>
              <div style={{ fontWeight: 800, margin: "4px 0", color: "#7c3aed" }}>
                {TITULO_COMISIONES_TARJETA} · {p.money(ficha.comisionesArs)}
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 4 }}>
                {comisiones
                  ? `Deuda con ${comisiones.supplier}, asentada pagada con esta tarjeta: vence ${ddmm(ficha.resumen.dueDate)} por ${p.money(comisiones.amount)}.`
                  : ficha.obligatorio
                  ? "Sin comisiones en este resumen."
                  : "Se muestran aparte para saber cuánto se fue en esto. No generan un pago: ya salen con el pago de la tarjeta."}
              </div>
              {ficha.comisiones.length > 0 && tabla(ficha.comisiones)}
            </div>

            {ficha.renglones.some((f) => f.estado === "pago_resumen") && (
              <details>
                <summary style={{ cursor: "pointer", fontSize: 12.5, color: "#64748b" }}>Pagos del resumen anterior</summary>
                {tabla(ficha.renglones.filter((f) => f.estado === "pago_resumen"))}
              </details>
            )}

            {ficha.cuotasSinRenglon.length > 0 && (
              <div>
                <div style={{ fontWeight: 800, margin: "4px 0", color: "#b45309" }}>Cargadas con esta tarjeta que no aparecen en el resumen</div>
                {ficha.cuotasSinRenglon.map((q) => (
                  <div key={`${q.pago.id}-${q.cuota}`} style={{ fontSize: 12.5, color: "#b45309" }}>
                    {p.etiquetaPago(q.pago.id)}
                    {q.de > 1 ? ` · cuota ${q.cuota}/${q.de}` : ""} · {p.money(q.monto)} — revisá la tarjeta, el monto o la fecha (o va en el resumen siguiente).
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {menu && (
        <MenuFicha x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <TituloMenu>{menu.f.renglon.description}</TituloMenu>
          {menu.f.sugerencia && (
            <ItemMenu
              onClick={() => {
                const sug = menu.f.sugerencia!;
                // El pago esta cargado con otro medio: aceptar tambien lo pasa a la tarjeta, asi que se avisa.
                if (
                  sug.pasarATarjeta &&
                  !window.confirm(
                    `${p.etiquetaPago(sug.pagoId)}\n\nEste pago está cargado con otro medio. Al linkearlo se pasa a ` +
                      `la tarjeta: deja de bajar la cuenta el día de la compra y va a bajar el día del vencimiento ` +
                      `de este resumen.\n\n¿Es esta compra?`
                  )
                ) {
                  setMenu(null);
                  return;
                }
                p.onLinkear(menu.f.renglon.id, sug.pagoId, sug.cuota, sug.pasarATarjeta ? p.cuentaTarjetaId : undefined);
                setMenu(null);
              }}
            >
              ✓ Aceptar: {p.etiquetaPago(menu.f.sugerencia.pagoId)}
              {menu.f.sugerencia.pasarATarjeta ? " (lo pasa a la tarjeta)" : ""}
            </ItemMenu>
          )}
          <ItemMenu
            onClick={() => {
              setBuscar(menu.f);
              setMenu(null);
            }}
          >
            🔗 Linkear con un pago con esta tarjeta…
          </ItemMenu>
          {menu.f.estado !== "comision" ? (
            <ItemMenu
              onClick={() => {
                p.onComisiones(menu.f.renglon.id, true);
                setMenu(null);
              }}
            >
              % Mandar a {TITULO_COMISIONES_TARJETA}
            </ItemMenu>
          ) : (
            <ItemMenu
              onClick={() => {
                p.onComisiones(menu.f.renglon.id, false);
                setMenu(null);
              }}
            >
              Sacar de comisiones
            </ItemMenu>
          )}
          {p.esAdmin && (menu.f.estado === "pendiente" || menu.f.estado === "sugerido" || menu.f.estado === "desconocido" || menu.f.estado === "cerrado") && (
            <>
              <SepMenu />
              {p.onDesconocer && menu.f.estado !== "cerrado" && (
                <ItemMenu
                  onClick={() => {
                    if (menu.f.estado === "desconocido") p.onDesconocer!(menu.f.renglon.id, null);
                    else {
                      const nota = window.prompt("¿Por qué no lo reconocés? (queda para reclamarlo al banco)", "");
                      if (nota !== null) p.onDesconocer!(menu.f.renglon.id, nota);
                    }
                    setMenu(null);
                  }}
                >
                  {menu.f.estado === "desconocido" ? "Ya lo reconozco (sacar el desconocido)" : "! Desconocer este consumo (administrador)"}
                </ItemMenu>
              )}
              {p.onCerrarSinLink && (
                <ItemMenu
                  onClick={() => {
                    if (menu.f.estado === "cerrado") p.onCerrarSinLink!(menu.f.renglon.id, null);
                    else {
                      const motivo = window.prompt("Cerrar sin link (solo administrador).\n¿Por qué no se va a linkear? Queda guardado con tu firma y deja de reclamarse.", "");
                      if (motivo !== null) {
                        if (motivo.trim()) p.onCerrarSinLink!(menu.f.renglon.id, motivo.trim());
                        else window.alert("Hace falta escribir el motivo para cerrarlo.");
                      }
                    }
                    setMenu(null);
                  }}
                >
                  {menu.f.estado === "cerrado" ? "↺ Reabrir (vuelve a pedir el link)" : "🔒 Cerrar sin link (administrador)…"}
                </ItemMenu>
              )}
            </>
          )}
          {menu.f.estado === "linkeado" && (
            <>
              <SepMenu />
              <ItemMenu
                onClick={() => {
                  p.onSoltar(menu.f.renglon.id);
                  setMenu(null);
                }}
              >
                ✕ Soltar el link
              </ItemMenu>
            </>
          )}
        </MenuFicha>
      )}
      {buscar && (
        <BuscadorVinculo
          titulo={`Linkear «${buscar.renglon.description}» (${p.money(Number(buscar.renglon.amount), buscar.renglon.currency)})`}
          opciones={opcionesPago(buscar)}
          onElegir={(id) => {
            const [pagoId, cuota] = id.split(":").map(Number);
            p.onLinkear(buscar.renglon.id, pagoId, cuota);
            setBuscar(null);
          }}
          onCerrar={() => setBuscar(null)}
        />
      )}
    </div>
  );
}
