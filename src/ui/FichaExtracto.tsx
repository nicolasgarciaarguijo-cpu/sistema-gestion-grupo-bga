// FICHA DEL EXTRACTO (Nicolas, 2026-10-31): una ficha por cuenta (empresa + banco + moneda) y adentro cada mes.
// Cada movimiento se linkea con lo que ya esta en el sistema; con todo linkeado, nada desconocido y la cadena
// de saldos cerrada, el mes lleva el tilde verde "revisado y linkeado". Click derecho en el movimiento.
// Ver domain/fichaExtracto.ts.
import React, { useMemo, useState } from "react";
import type { FichaExtracto as FichaMes, MovimientoFicha } from "../domain/fichaExtracto";
import { TITULO_COMISIONES_CUENTA } from "../domain/fichaTarjeta";
import { BuscadorVinculo, IconoEstado, ItemMenu, MenuFicha, SepMenu, TituloMenu, Z_FICHA, ddmm, type OpcionVinculo } from "./VinculoUi";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "top" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const nombreMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;

// Se linkea contra el PAGO cargado (que ya dice su factura), no contra la factura sola: desde el 1/11 el banco
// constata, asi que un debito linkeado a una factura sin pago dejaria la plata sin salir del sistema.
export type TipoLink = "pago" | "resumen" | "trabajo";

export type FichaExtractoProps = {
  titulo: string; // "Patagonia · BGA · $"
  meses: FichaMes[]; // de esta cuenta
  mesInicial?: string;
  money: (n: number, moneda?: string) => string;
  opciones: (tipo: TipoLink, m: MovimientoFicha) => OpcionVinculo[];
  onLink: (movId: number, tipo: TipoLink, id: string) => void;
  onTipo: (movId: number, kind: "interno" | "aporte" | "otro") => void;
  onDesconocer: (movId: number, nota: string | null) => void;
  onSoltar: (movId: number) => void;
  onCerrar: () => void;
};

export function FichaExtracto(p: FichaExtractoProps) {
  const meses = useMemo(() => [...p.meses].sort((a, b) => b.mes.localeCompare(a.mes)), [p.meses]);
  const [sel, setSel] = useState<string>(p.mesInicial || meses[0]?.mes || "");
  const [menu, setMenu] = useState<null | { x: number; y: number; m: MovimientoFicha }>(null);
  const [buscar, setBuscar] = useState<null | { tipo: TipoLink; m: MovimientoFicha }>(null);
  const ficha = meses.find((f) => f.mes === sel) || null;
  const TITULOS: Record<TipoLink, string> = { pago: "Linkear con un pago cargado (y su factura)", resumen: "Pago del resumen de una tarjeta", trabajo: "Cobro de un trabajo" };

  return (
    <div onClick={p.onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: Z_FICHA, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(1100px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>🏦 {p.titulo}</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              El extracto constata, no carga: cada movimiento se linkea con lo que ya está en el sistema. Los impuestos, comisiones e intereses van a «{TITULO_COMISIONES_CUENTA}». Lo que no reconocés, marcalo como desconocido para reclamarlo. Click derecho en un movimiento.
            </div>
          </div>
          <button type="button" onClick={p.onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            Cerrar
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {meses.map((f) => (
            <button
              key={f.mes}
              type="button"
              onClick={() => setSel(f.mes)}
              style={{ border: `2px solid ${f.mes === sel ? "#0f172a" : "#e2e8f0"}`, background: f.completo ? "#f0fdf4" : f.obligatorio ? "#fef2f2" : "#f8fafc", borderRadius: 8, padding: "5px 9px", cursor: "pointer", fontSize: 12.5 }}
            >
              <b style={{ color: f.completo ? "#166534" : f.obligatorio ? "#b91c1c" : "#64748b" }}>{f.completo ? "✓" : f.obligatorio ? `${f.pendientes + f.desconocidos}` : "histórico"}</b> · {nombreMes(f.mes)}
            </button>
          ))}
        </div>
        {ficha && (
          <div style={{ display: "grid", gap: 8, background: "#f8fafc", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", fontSize: 13 }}>
              <b style={{ fontSize: 15 }}>{nombreMes(ficha.mes)}</b>
              <span>Créditos {p.money(ficha.creditos, ficha.currency)}</span>
              <span>Débitos {p.money(ficha.debitos, ficha.currency)}</span>
              <span>{ficha.pendientes} sin linkear</span>
              {ficha.desconocidos > 0 && <b style={{ color: "#b91c1c" }}>{ficha.desconocidos} desconocido(s)</b>}
              <span style={{ color: ficha.cadenaCierra ? "#166534" : "#b91c1c", fontWeight: 700 }}>{ficha.cadenaCierra ? "cadena de saldos ✓" : "la cadena de saldos no cierra: falta o sobra un movimiento"}</span>
              {ficha.completo && <span style={{ background: "#166534", color: "#fff", borderRadius: 999, padding: "3px 10px", fontWeight: 800, fontSize: 12.5 }}>✓ revisado y linkeado</span>}
              {!ficha.obligatorio && !ficha.completo && <span style={{ fontSize: 12, color: "#64748b" }}>anterior al 1/11/2026: no es obligatorio</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "#7c3aed" }}>
              {TITULO_COMISIONES_CUENTA}: {p.money(ficha.comisionesArs)} (se tildan pagados en «Impuestos y comisiones»).
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead>
                <tr>
                  <th style={th}></th>
                  <th style={th}>Fecha</th>
                  <th style={th}>Concepto</th>
                  <th style={{ ...th, textAlign: "right" }}>Débito</th>
                  <th style={{ ...th, textAlign: "right" }}>Crédito</th>
                  <th style={{ ...th, textAlign: "right" }}>Saldo</th>
                  <th style={th}>Link</th>
                </tr>
              </thead>
              <tbody>
                {ficha.movimientos.map((x) => (
                  <tr
                    key={x.mov.id}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenu({ x: e.clientX, y: e.clientY, m: x });
                    }}
                    style={{ cursor: "context-menu", background: x.estado === "pendiente" || x.estado === "desconocido" ? "#fef2f2" : x.estado === "sugerido" ? "#fffbeb" : undefined }}
                  >
                    <td style={{ ...td, width: 28 }}>
                      <IconoEstado estado={x.estado} />
                    </td>
                    <td style={{ ...td, width: 74 }}>{ddmm(x.mov.date)}</td>
                    <td style={td}>{x.mov.concept}</td>
                    <td style={{ ...td, textAlign: "right" }}>{x.mov.movementType === "debito" ? p.money(Math.abs(Number(x.mov.amount)), ficha.currency) : ""}</td>
                    <td style={{ ...td, textAlign: "right" }}>{x.mov.movementType === "credito" ? p.money(Math.abs(Number(x.mov.amount)), ficha.currency) : ""}</td>
                    <td style={{ ...td, textAlign: "right", color: x.rompe ? "#b91c1c" : undefined, fontWeight: x.rompe ? 800 : undefined }} title={x.rompe ? "Acá no cierra la cadena de saldos" : ""}>
                      {p.money(Number(x.mov.balance), ficha.currency)}
                    </td>
                    <td style={{ ...td, color: x.estado === "linkeado" ? "#166534" : x.estado === "comision" ? "#7c3aed" : x.estado === "sugerido" ? "#b45309" : "#b91c1c" }}>{x.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {menu && (
        <MenuFicha x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <TituloMenu>{menu.m.mov.concept}</TituloMenu>
          {menu.m.sugerencia && (
            <ItemMenu
              onClick={() => {
                const s = menu.m.sugerencia!;
                p.onLink(menu.m.mov.id, s.tipo === "pago" ? "pago" : "resumen", String(s.tipo === "pago" ? s.pagoId : s.statementId));
                setMenu(null);
              }}
            >
              ✓ Aceptar: {menu.m.sugerencia.texto}
            </ItemMenu>
          )}
          {(menu.m.mov.movementType === "debito" ? (["pago", "resumen"] as TipoLink[]) : (["trabajo"] as TipoLink[])).map((t) => (
            <ItemMenu
              key={t}
              onClick={() => {
                setBuscar({ tipo: t, m: menu.m });
                setMenu(null);
              }}
            >
              🔗 {TITULOS[t]}…
            </ItemMenu>
          ))}
          <ItemMenu
            onClick={() => {
              p.onTipo(menu.m.mov.id, "interno");
              setMenu(null);
            }}
          >
            ⇄ Movimiento interno (entre cuentas o empresas)
          </ItemMenu>
          {menu.m.mov.movementType === "credito" && (
            <ItemMenu
              onClick={() => {
                p.onTipo(menu.m.mov.id, "aporte");
                setMenu(null);
              }}
            >
              Aporte
            </ItemMenu>
          )}
          <SepMenu />
          {menu.m.estado !== "desconocido" ? (
            <ItemMenu
              onClick={() => {
                const nota = window.prompt("¿Por qué no lo reconocés? (queda para reclamarlo al banco)", "");
                if (nota !== null) p.onDesconocer(menu.m.mov.id, nota);
                setMenu(null);
              }}
            >
              ! Desconocer este movimiento
            </ItemMenu>
          ) : (
            <ItemMenu
              onClick={() => {
                p.onDesconocer(menu.m.mov.id, null);
                setMenu(null);
              }}
            >
              Ya lo reconozco (sacar el desconocido)
            </ItemMenu>
          )}
          {menu.m.estado === "linkeado" && (
            <ItemMenu
              onClick={() => {
                p.onSoltar(menu.m.mov.id);
                setMenu(null);
              }}
            >
              ✕ Soltar el link
            </ItemMenu>
          )}
        </MenuFicha>
      )}
      {buscar && (
        <BuscadorVinculo
          titulo={`${TITULOS[buscar.tipo]} · ${buscar.m.mov.concept} (${p.money(Math.abs(Number(buscar.m.mov.amount)))})`}
          opciones={p.opciones(buscar.tipo, buscar.m)}
          onElegir={(id) => {
            p.onLink(buscar.m.mov.id, buscar.tipo, id);
            setBuscar(null);
          }}
          onCerrar={() => setBuscar(null)}
        />
      )}
    </div>
  );
}
