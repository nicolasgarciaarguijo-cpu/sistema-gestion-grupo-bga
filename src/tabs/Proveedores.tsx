// PROVEEDORES (Pago a proveedores, Nicolas 2026-10-14): el listado para agregar, editar y quitar
// proveedores (o vaciarlo para empezar de cero sin perder lo cargado en el cash flow), la ventana con
// sus datos, y el resumen de los que tienen cuenta corriente. Cada proveedor abre su FICHA, que vive aca.
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, quickMenuItem } from "../ui/primitives";

export type ProveedorForm = {
  id?: number;
  company: string;
  name: string;
  taxId: string;
  direccion: string;
  contacto: string;
  currentAccount: boolean;
  aliases: string;
  notes: string;
};

type Proveedor = {
  id: number;
  company: string;
  name: string;
  taxId: string;
  aliases?: string;
  notes?: string;
  direccion?: string;
  contacto?: string;
  currentAccount?: boolean;
};

const lbl: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 8px", fontSize: 13, width: "100%", boxSizing: "border-box", fontWeight: 400, color: "#0f172a" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

function ProveedorModal({
  inicial,
  companyOptions,
  onGuardar,
  onCerrar,
}: {
  inicial: ProveedorForm;
  companyOptions: Array<{ value: string; label?: string }>;
  onGuardar: (p: ProveedorForm) => void;
  onCerrar: () => void;
}) {
  const [p, setP] = useState<ProveedorForm>(inicial);
  const set = (patch: Partial<ProveedorForm>) => setP((x) => ({ ...x, ...patch }));
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4600, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(620px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{p.id ? "Datos del proveedor" : "Agregar proveedor"}</div>
        <label style={lbl}>Nombre o razón social
          <input style={input} value={p.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={lbl}>CUIT
            <input style={input} value={p.taxId} placeholder="30-00000000-0" onChange={(e) => set({ taxId: e.target.value })} />
          </label>
          <label style={lbl}>Empresa
            <select style={input} value={p.company} onChange={(e) => set({ company: e.target.value })}>
              {companyOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.value === "General" ? "Las dos empresas" : c.label || c.value}</option>
              ))}
            </select>
          </label>
        </div>
        <label style={lbl}>Dirección
          <input style={input} value={p.direccion} onChange={(e) => set({ direccion: e.target.value })} />
        </label>
        <label style={lbl}>Contacto (nombre, teléfono, mail)
          <input style={input} value={p.contacto} onChange={(e) => set({ contacto: e.target.value })} />
        </label>
        <label style={lbl}>Tipo de proveedor
          <select style={input} value={p.currentAccount ? "cc" : "sin"} onChange={(e) => set({ currentAccount: e.target.value === "cc" })}>
            <option value="sin">Sin cuenta corriente</option>
            <option value="cc">Con cuenta corriente</option>
          </select>
        </label>
        <label style={lbl}>Cómo figura en el banco (alias, separados por coma)
          <input style={input} value={p.aliases} onChange={(e) => set({ aliases: e.target.value })} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onCerrar} style={{ ...input, width: "auto", cursor: "pointer" }}>Cancelar</button>
          <button
            type="button"
            disabled={!p.name.trim()}
            onClick={() => onGuardar(p)}
            style={{ border: "1px solid #15803d", background: p.name.trim() ? "#16a34a" : "#bbf7d0", color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: p.name.trim() ? "pointer" : "not-allowed" }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProveedoresPanel({
  proveedores,
  ledgers,
  pagosSinFactura = [],
  empresaPorDefecto,
  companyOptions,
  money,
  onGuardar,
  onQuitar,
  onVaciar,
  onAbrirFicha,
}: {
  proveedores: Proveedor[];
  ledgers: Array<{ key: string; supplier: string; taxId: string; esCuentaCorriente: boolean; comprado: number; pagado: number; saldo: number; facturasSinPago: number; movimientos: Array<{ type: string }> }>;
  // Pagos a cuenta que esperan su factura (domain/pagosACuenta), con la llave del proveedor.
  pagosSinFactura?: Array<{ id: number; key: string; supplier: string; date: string; amount: number; dias: number; company: string }>;
  empresaPorDefecto: string;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  money: (n: number) => string;
  onGuardar: (p: ProveedorForm) => void;
  onQuitar: (id: number) => void;
  onVaciar: () => void;
  onAbrirFicha: (nombre: string, taxId: string) => void;
}) {
  const [modal, setModal] = useState<ProveedorForm | null>(null);
  const [menu, setMenu] = useState<null | { x: number; y: number; p: Proveedor }>(null);
  const [buscar, setBuscar] = useState("");
  const nuevo = (): ProveedorForm => ({ company: empresaPorDefecto, name: "", taxId: "", direccion: "", contacto: "", currentAccount: false, aliases: "", notes: "" });
  const editar = (p: Proveedor): ProveedorForm => ({
    id: p.id, company: p.company, name: p.name, taxId: p.taxId || "", direccion: p.direccion || "", contacto: p.contacto || "",
    currentAccount: !!p.currentAccount, aliases: p.aliases || "", notes: p.notes || "",
  });
  const digits = (v: string) => String(v || "").replace(/\D/g, "");
  const norm = (v: string) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const ledgerDe = (p: Proveedor) =>
    ledgers.find((l) => (digits(p.taxId).length >= 11 && digits(l.taxId) === digits(p.taxId)) || norm(l.supplier) === norm(p.name));
  const shortDe = (c: string) => (c === "General" ? "Las dos" : companyOptions.find((o) => o.value === c)?.short || c);
  const q = buscar.trim().toLowerCase();
  const lista = [...proveedores]
    .filter((p) => !q || `${p.name} ${p.taxId} ${p.contacto || ""}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));
  const conCuenta = ledgers.filter((l) => l.esCuentaCorriente);
  // Sin convenio pero con algo abierto: deuda, saldo a favor o un pago esperando su factura.
  const sinFacturaDe = (key: string) => pagosSinFactura.filter((p) => p.key === key);
  const abiertosSinConvenio = ledgers.filter((l) => !l.esCuentaCorriente && (Math.abs(l.saldo) > 1 || l.facturasSinPago > 0 || sinFacturaDe(l.key).length > 0));
  const tablaCuentas = (filas: typeof ledgers) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr>
          <th style={th}>Proveedor</th>
          <th style={{ ...th, textAlign: "right" }}>Facturas</th>
          <th style={{ ...th, textAlign: "right" }}>Comprado</th>
          <th style={{ ...th, textAlign: "right" }}>Pagado</th>
          <th style={{ ...th, textAlign: "right" }}>Situación</th>
          <th style={{ ...th, textAlign: "right" }}>Facturas sin pago</th>
          <th style={{ ...th, textAlign: "right" }}>Pagos sin factura</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((l) => {
          const sf = sinFacturaDe(l.key);
          const sfTotal = sf.reduce((a, p) => a + p.amount, 0);
          return (
            <tr key={l.key} style={{ cursor: "pointer", background: sf.length ? "#fff7ed" : undefined }} onClick={() => onAbrirFicha(l.supplier, l.taxId)} title="Abrir la ficha del proveedor">
              <td style={{ ...td, fontWeight: 700 }}>{l.supplier}</td>
              <td style={{ ...td, textAlign: "right" }}>{l.movimientos.filter((m) => m.type === "compra").length}</td>
              <td style={{ ...td, textAlign: "right" }}>{money(l.comprado)}</td>
              <td style={{ ...td, textAlign: "right" }}>{money(l.pagado)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800, color: l.saldo > 1 ? "#b45309" : "#16a34a" }}>
                {l.saldo > 1 ? `Debemos ${money(l.saldo)}` : l.saldo < -1 ? `A favor ${money(Math.abs(l.saldo))}` : "Al día"}
              </td>
              <td style={{ ...td, textAlign: "right", color: l.facturasSinPago ? "#b45309" : "#94a3b8" }}>{l.facturasSinPago || "—"}</td>
              <td style={{ ...td, textAlign: "right", color: sf.length ? "#b45309" : "#94a3b8", fontWeight: sf.length ? 800 : 400 }}>
                {sf.length ? `⏳ ${money(sfTotal)} (${sf.length})` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <Panel
        span="full"
        title={`Proveedores (${proveedores.length})`}
        actions={
          <span style={{ display: "inline-flex", gap: 6 }}>
            <ButtonLike onClick={() => setModal(nuevo())}>+ Agregar proveedor</ButtonLike>
            {proveedores.length > 0 && (
              <ButtonLike
                secondary
                onClick={() => {
                  const r = window.prompt(
                    `Vaciar la lista de proveedores (${proveedores.length}).\n\nLo cargado en el cash flow (facturas, pagos, gastos) NO se pierde: cada uno conserva el nombre del proveedor. Sirve para volver a armar el listado desde cero.\n\nEscribí VACIAR para confirmar:`
                  );
                  if ((r || "").trim().toUpperCase() === "VACIAR") onVaciar();
                }}
              >
                Vaciar lista
              </ButtonLike>
            )}
          </span>
        }
      >
        <div
          onContextMenu={(ev) => {
            // Click derecho en la seccion (fuera de una fila): agregar proveedor.
            if ((ev.target as HTMLElement).closest("tr[data-prov]")) return;
            ev.preventDefault();
            setModal(nuevo());
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <input
              style={{ ...input, width: 260 }}
              placeholder="Buscar por nombre, CUIT o contacto"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>Click en un proveedor: su ficha · click derecho: editar o quitar · click derecho en el espacio vacío: agregar.</span>
          </div>
          {lista.length === 0 ? (
            <div style={{ fontSize: 13, color: "#64748b", padding: "10px 0" }}>
              {proveedores.length === 0 ? "No hay proveedores cargados. Agregá el primero con '+ Agregar proveedor'." : "Ningún proveedor coincide con la búsqueda."}
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={th}>Proveedor</th>
                    <th style={th}>CUIT</th>
                    <th style={th}>Tipo</th>
                    <th style={th}>Contacto</th>
                    <th style={th}>Empresa</th>
                    <th style={{ ...th, textAlign: "right" }}>Facturas</th>
                    <th style={{ ...th, textAlign: "right" }}>Debemos</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const l = ledgerDe(p);
                    const facturas = l ? l.movimientos.filter((m) => m.type === "compra").length : 0;
                    return (
                      <tr
                        key={p.id}
                        data-prov="1"
                        style={{ cursor: "pointer" }}
                        onClick={() => onAbrirFicha(p.name, p.taxId)}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          setMenu({ x: ev.clientX, y: ev.clientY, p });
                        }}
                      >
                        <td style={{ ...td, fontWeight: 700 }}>{p.name}</td>
                        <td style={td}>{p.taxId || "—"}</td>
                        <td style={td}>
                          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 7px", color: p.currentAccount ? "#166534" : "#475569", background: p.currentAccount ? "#dcfce7" : "#f1f5f9" }}>
                            {p.currentAccount ? "Cuenta corriente" : "Sin cuenta corriente"}
                          </span>
                        </td>
                        <td style={{ ...td, color: "#475569" }}>{p.contacto || "—"}</td>
                        <td style={td}>{shortDe(p.company)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{facturas || "—"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: l && l.saldo > 1 ? "#b45309" : "#16a34a" }}>{l && l.saldo > 1 ? money(l.saldo) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {pagosSinFactura.length > 0 && (
        <Panel span="full" title={`⏳ Pagos sin factura (${pagosSinFactura.length}) · ${money(pagosSinFactura.reduce((x, p) => x + p.amount, 0))}`}>
          <div style={{ fontSize: 12.5, color: "#7c2d12", marginBottom: 6 }}>
            Se pagaron y la factura todavía no llegó: el proveedor queda a favor. Click para abrir su ficha; al cargar la factura, vinculale el pago.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <tbody>
              {pagosSinFactura.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer", background: "#fff7ed" }} onClick={() => onAbrirFicha(p.supplier, "")}>
                  <td style={{ ...td, fontWeight: 700 }}>{p.supplier}</td>
                  <td style={td}>{p.date ? `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}/${p.date.slice(0, 4)}` : "—"}</td>
                  <td style={td}>{shortDe(p.company)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(p.amount)}</td>
                  <td style={{ ...td, color: p.dias > 30 ? "#b91c1c" : "#b45309", fontWeight: 700 }}>hace {p.dias} día{p.dias === 1 ? "" : "s"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Panel span="full" title={`Cuenta corriente · proveedores con convenio (${conCuenta.length})`}>
        {conCuenta.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Ningún proveedor está marcado con cuenta corriente.</div>
        ) : (
          tablaCuentas(conCuenta)
        )}
      </Panel>
      <Panel span="full" title={`Cuentas abiertas · proveedores sin convenio (${abiertosSinConvenio.length})`}>
        {abiertosSinConvenio.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Ningún proveedor sin convenio tiene deuda, saldo a favor ni pagos esperando factura.</div>
        ) : (
          tablaCuentas(abiertosSinConvenio)
        )}
      </Panel>
      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.p.name}</QuickMenuTitle>
          <button style={quickMenuItem} onClick={() => { onAbrirFicha(menu.p.name, menu.p.taxId); setMenu(null); }}>Abrir ficha</button>
          <button style={quickMenuItem} onClick={() => { setModal(editar(menu.p)); setMenu(null); }}>Editar datos</button>
          <button style={quickMenuItem} onClick={() => { setModal(nuevo()); setMenu(null); }}>Agregar otro proveedor</button>
          <button
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              if (window.confirm(`¿Quitar a ${menu.p.name} del listado? Sus facturas y pagos quedan cargados.`)) onQuitar(menu.p.id);
              setMenu(null);
            }}
          >
            Quitar del listado
          </button>
        </QuickMenu>
      )}
      {modal && (
        <ProveedorModal
          inicial={modal}
          companyOptions={companyOptions}
          onGuardar={(p) => {
            onGuardar(p);
            setModal(null);
          }}
          onCerrar={() => setModal(null)}
        />
      )}
    </>
  );
}
