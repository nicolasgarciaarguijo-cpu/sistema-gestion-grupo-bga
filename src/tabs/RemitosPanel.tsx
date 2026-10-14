// HISTORIAL DE REMITOS (Fase 5, 2026-10-14): recepciones de proveedor, salidas de stock por trabajo y
// entregas al cliente. Se usa en la solapa Stock (todos) y en la ficha del trabajo (los suyos).
// Click derecho sobre un remito: abrir, imprimir o quitar (si movio stock, se deshace).
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { TIPOS_REMITO, type Remito, type TipoRemito } from "../domain/remitos";

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#475569", padding: "5px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
const num: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const COLOR: Record<TipoRemito, string> = { recepcion: "#0f766e", salida: "#b45309", entrega: "#4338ca" };

export function RemitosPanel({
  titulo,
  remitos,
  tipos,
  trabajoLabel,
  facturaLabel,
  companyShort,
  money,
  nota,
  onNuevo,
  onAbrir,
  onImprimir,
  onQuitar,
}: {
  titulo: string;
  remitos: Remito[];
  tipos: TipoRemito[]; // los que se pueden crear desde aca
  trabajoLabel: (jobId: number) => string;
  facturaLabel: (invoiceId: number) => string | null;
  companyShort: (company: string) => string;
  money: (n: number) => string;
  nota?: React.ReactNode;
  onNuevo: (tipo: TipoRemito) => void;
  onAbrir: (id: number) => void;
  onImprimir: (id: number) => void;
  onQuitar: (id: number) => void;
}) {
  const [filtro, setFiltro] = useState<TipoRemito | "todos">("todos");
  const [menu, setMenu] = useState<null | { x: number; y: number; id: number }>(null);
  const filas = remitos
    .filter((r) => filtro === "todos" || r.tipo === filtro)
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || b.id - a.id);

  return (
    <Panel
      span="full"
      title={titulo}
      actions={
        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
          {tipos.map((t) => (
            <ButtonLike key={t} onClick={() => onNuevo(t)}>
              + {TIPOS_REMITO[t].label}
            </ButtonLike>
          ))}
        </span>
      }
    >
      {nota && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{nota}</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", fontSize: 12 }}>
        {(["todos", "recepcion", "salida", "entrega"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFiltro(t)}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "2px 10px",
              cursor: "pointer",
              background: filtro === t ? "#0f172a" : "#fff",
              color: filtro === t ? "#fff" : "#0f172a",
              fontWeight: 700,
            }}
          >
            {t === "todos" ? "Todos" : TIPOS_REMITO[t].label} ({t === "todos" ? remitos.length : remitos.filter((r) => r.tipo === t).length})
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Tipo</th>
              <th style={th}>N.º</th>
              <th style={th}>Proveedor / trabajo</th>
              <th style={th}>Empresa</th>
              <th style={{ ...th, textAlign: "right" }}>Renglones</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
              <th style={th}>Factura</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td style={{ ...td, color: "#94a3b8" }} colSpan={8}>Sin remitos.</td>
              </tr>
            )}
            {filas.map((r) => {
              const total = r.renglones.reduce((a, g) => a + Number(g.cantidad || 0) * Number(g.precioUnitario || 0), 0);
              const fac = r.purchaseInvoiceId != null ? facturaLabel(r.purchaseInvoiceId) : null;
              return (
                <tr
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onDoubleClick={() => onAbrir(r.id)}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    setMenu({ x: ev.clientX, y: ev.clientY, id: r.id });
                  }}
                  title="Doble click: abrir · Click derecho: más opciones"
                >
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fecha(r.fecha)}</td>
                  <td style={{ ...td, color: COLOR[r.tipo], fontWeight: 700, whiteSpace: "nowrap" }}>{TIPOS_REMITO[r.tipo].label}</td>
                  <td style={td}>{r.numero || "s/n"}</td>
                  <td style={td}>{r.tipo === "recepcion" ? r.proveedor || "—" : r.jobId != null ? trabajoLabel(r.jobId) : r.cliente || "—"}</td>
                  <td style={td}>{companyShort(r.company)}</td>
                  <td style={num}>{r.renglones.length}</td>
                  <td style={num}>{r.tipo === "entrega" ? "—" : money(total)}</td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {r.tipo !== "recepcion" ? "" : fac ? <span style={{ color: "#166534", fontWeight: 700 }}>🧾 {fac}</span> : <span style={{ color: "#b45309" }}>sin factura</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>Remito</QuickMenuTitle>
          <button style={quickMenuItem} onClick={() => { onAbrir(menu.id); setMenu(null); }}>Abrir / editar…</button>
          <button style={quickMenuItem} onClick={() => { onImprimir(menu.id); setMenu(null); }}>🖨 Imprimir</button>
          <QuickMenuSep />
          <button
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              if (window.confirm("¿Quitar este remito? Si movió stock, se deshace.")) onQuitar(menu.id);
              setMenu(null);
            }}
          >
            Quitar remito
          </button>
        </QuickMenu>
      )}
    </Panel>
  );
}
