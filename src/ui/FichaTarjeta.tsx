// FICHA DE TARJETA (Nicolas, 2026-10-31): una ficha por tarjeta (la cuenta que emite el resumen) y adentro la
// ficha de cada resumen. Cada renglon del resumen se linkea con el pago que se cargo con esa tarjeta (y la
// factura que paga), o va a "Comisiones, tasas e intereses (tarjeta)". Los renglones se ven separados por
// tarjeta fisica y su responsable. Todo se edita con click derecho. Ver domain/fichaTarjeta.ts.
import React, { useMemo, useState } from "react";
import type { FichaResumen, RenglonFicha, TarjetaF, PagoF } from "../domain/fichaTarjeta";
import { TITULO_COMISIONES_TARJETA, cuotaDelTexto, montoCuota, esPagoDeComisiones } from "../domain/fichaTarjeta";
import { BuscadorVinculo, IconoEstado, ItemMenu, MenuFicha, SepMenu, TituloMenu, Z_FICHA, ddmm, type OpcionVinculo } from "./VinculoUi";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "top" };
const inputMini: React.CSSProperties = { padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12.5, width: "100%" };

export type FichaTarjetaProps = {
  cuenta: TarjetaF;
  plasticos: TarjetaF[];
  fichas: FichaResumen[]; // de esta cuenta, cualquier orden
  pagos: PagoF[]; // pagos con tarjeta de esta cuenta (para linkear a mano)
  etiquetaPago: (pagoId: number) => string; // "Pintureria · factura A 3-5001"
  pagoComisiones: (statementId: number) => { amount: number; date: string; supplier: string } | null;
  companyShort: (c: string) => string;
  money: (n: number, moneda?: string) => string;
  statementInicial?: number | null;
  onLinkear: (renglonId: number, pagoId: number, cuota: number) => void;
  onSoltar: (renglonId: number) => void;
  onComisiones: (renglonId: number, si: boolean) => void;
  onAceptarSugerencias: (statementId: number) => void;
  onPlastico: (cardId: number, patch: Partial<Pick<TarjetaF, "responsable" | "numerosAnteriores" | "lastDigits" | "cuentaTarjetaId">>) => void;
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
        </span>
      );
    } else if (f.estado === "comision") detalle = <span style={{ color: "#7c3aed" }}>{TITULO_COMISIONES_TARJETA}</span>;
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
        style={{ cursor: "context-menu", background: f.estado === "pendiente" ? "#fef2f2" : f.estado === "sugerido" ? "#fffbeb" : undefined }}
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
          <button type="button" onClick={p.onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tarjetas físicas y responsables</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Número</th>
                <th style={th}>Responsable</th>
                <th style={th}>Números anteriores (si el banco cambió el plástico)</th>
              </tr>
            </thead>
            <tbody>
              {p.plasticos.length === 0 && (
                <tr>
                  <td style={td} colSpan={3}>
                    Sin tarjetas físicas: se dan de alta solas al leer el resumen.
                  </td>
                </tr>
              )}
              {p.plasticos.map((t) => (
                <tr key={t.id}>
                  <td style={{ ...td, width: 90, fontWeight: 700 }}>{t.lastDigits || "—"}</td>
                  <td style={td}>
                    <input style={inputMini} defaultValue={t.responsable || ""} placeholder={t.name} onBlur={(e) => e.target.value !== (t.responsable || "") && p.onPlastico(t.id, { responsable: e.target.value })} />
                  </td>
                  <td style={td}>
                    <input style={inputMini} defaultValue={t.numerosAnteriores || ""} placeholder="ej. 7301" onBlur={(e) => e.target.value !== (t.numerosAnteriores || "") && p.onPlastico(t.id, { numerosAnteriores: e.target.value })} />
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
              {ficha.completo ? (
                <span style={{ background: "#166534", color: "#fff", borderRadius: 999, padding: "3px 10px", fontWeight: 800, fontSize: 12.5 }}>✓ revisado y linkeado</span>
              ) : !ficha.obligatorio ? (
                <span style={{ fontSize: 12, color: "#64748b" }}>anterior al 1/11/2026: no es obligatorio</span>
              ) : null}
              {sugeridos > 0 && (
                <button type="button" onClick={() => p.onAceptarSugerencias(ficha.resumen.id)} style={{ border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12.5 }}>
                  Aceptar las {sugeridos} sugerencia(s)
                </button>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "#475569" }}>
              Todos los pagos linkeados se pagan el <b>{ddmm(ficha.resumen.dueDate)}</b> (vencimiento): recién ese día descuentan de la cuenta del banco.
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

            <div>
              <div style={{ fontWeight: 800, margin: "4px 0", color: "#7c3aed" }}>
                {TITULO_COMISIONES_TARJETA} · {p.money(ficha.comisionesArs)}
              </div>
              <div style={{ fontSize: 12.5, color: "#475569", marginBottom: 4 }}>
                {comisiones
                  ? `Deuda con ${comisiones.supplier}, asentada pagada con esta tarjeta: vence ${ddmm(ficha.resumen.dueDate)} por ${p.money(comisiones.amount)}.`
                  : ficha.obligatorio
                  ? "Sin comisiones en este resumen."
                  : "Resumen anterior al ejercicio nuevo: sus impuestos siguen en «Impuestos y comisiones» (se tildan pagados ahí)."}
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
                p.onLinkear(menu.f.renglon.id, menu.f.sugerencia!.pagoId, menu.f.sugerencia!.cuota);
                setMenu(null);
              }}
            >
              ✓ Aceptar: {p.etiquetaPago(menu.f.sugerencia.pagoId)}
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
