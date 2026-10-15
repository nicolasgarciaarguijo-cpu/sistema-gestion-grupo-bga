// LISTADO DE FACTURAS DE COMPRA (Compras y analisis de gastos, Nicolas 2026-10-14): una fila por factura
// con su estado de pago, para ver lo pagado y lo que falta y adjudicar pagos. "Agregar factura" y cada
// fila abren la ventana de la factura (proveedor, datos y pago).
import React, { useMemo, useRef, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";

export type FilaFactura = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  receiptLetter: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  administration: "blanco" | "negro";
  source: string;
  pagada: boolean;
  pagoTexto: string; // "dd/mm · transferencia" / "por el banco dd/mm"
  fechaPrevista?: string;
  estadoPrevisto?: "programado" | "estimado" | "inamovible";
  tipoProveedor: "ctacte" | "habitual" | "nuevo";
  // Factura pagada con una CAJA CHICA: quien la rindio (se ve como pill y la fila abre el gasto).
  cajaResponsable?: string;
  // Tiene un pago cargado en el sistema (CostEntry) vinculado: al eliminar se puede llevar tambien.
  tienePagoCargado?: boolean;
  // ARCA: "importada" = vino del listado (no la tenemos en mano); "cruzada" = la cargada se encontro en ARCA.
  arca?: "importada" | "cruzada";
};

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ESTADO = {
  programado: { fg: "#0f766e", bg: "#ccfbf1", label: "programado" },
  estimado: { fg: "#7c3aed", bg: "#ede9fe", label: "estimado" },
  inamovible: { fg: "#dc2626", bg: "#fee2e2", label: "inamovible" },
};
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "5px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", whiteSpace: "nowrap" };
const pill = (fg: string, bg: string): React.CSSProperties => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: fg, background: bg });
const fmt = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");

export function FacturasCompraPanel({
  filas,
  companyOptions,
  money,
  onNueva,
  onAbrir,
  onAsignarPago,
  onFichaProveedor,
  onEliminar,
  onImportarArca,
}: {
  filas: FilaFactura[];
  companyOptions: Array<{ value: string; short?: string }>;
  money: (n: number) => string;
  onNueva: () => void;
  onAbrir: (id: number) => void;
  onAsignarPago: (id: number) => void;
  onFichaProveedor: (nombre: string, taxId: string) => void;
  // conPago: borra tambien el pago cargado (si la factura era de prueba, el pago tambien).
  onEliminar: (id: number, conPago: boolean) => void;
  // Importa el listado "Mis comprobantes recibidos" de ARCA. Devuelve el resumen para mostrar.
  onImportarArca: (files: FileList | null) => Promise<string>;
}) {
  const archivoArca = useRef<HTMLInputElement>(null);
  const [avisoArca, setAvisoArca] = useState("");
  // CLICK DERECHO sobre la factura: editar, eliminar, ficha del proveedor (regla: toda accion sale de aca).
  const [menu, setMenu] = useState<{ x: number; y: number; fila: FilaFactura } | null>(null);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [soloSinPagar, setSoloSinPagar] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [y, m] = mes.split("-").map(Number);
  const mover = (d: number) => setMes(new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 7));

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return filas
      // Las de CAJA CHICA tambien van: Compras es el registro unico de todas las facturas y pagos
      // (se cargan en Caja chica y se ven aca, pagadas por la caja de la persona).
      .filter((f) => (soloSinPagar ? !f.pagada : f.invoiceDate.startsWith(mes)))
      .filter((f) => !q || `${f.supplier} ${f.invoiceNumber} ${f.taxId}`.toLowerCase().includes(q))
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }, [filas, mes, soloSinPagar, buscar]);
  const totalSinPagar = visibles.filter((f) => !f.pagada).reduce((a, f) => a + Number(f.total || 0), 0);
  const shortDe = (c: string) => companyOptions.find((o) => o.value === c)?.short || c;

  return (
    <Panel
      span="full"
      title="Facturas de compra"
      actions={
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {!soloSinPagar && (
            <>
              <button type="button" style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }} onClick={() => mover(-1)}>◀</button>
              <strong style={{ minWidth: 110, textAlign: "center" }}>{NOMBRE_MES[m - 1]} {y}</strong>
              <button type="button" style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "3px 9px", cursor: "pointer" }} onClick={() => mover(1)}>▶</button>
            </>
          )}
          <label style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 12.5 }}>
            <input type="checkbox" checked={soloSinPagar} onChange={(e) => setSoloSinPagar(e.target.checked)} />
            Todas las sin pagar
          </label>
          <ButtonLike onClick={onNueva}>+ Agregar factura</ButtonLike>
          <ButtonLike onClick={() => archivoArca.current?.click()}>Importar listado de ARCA</ButtonLike>
          <input
            ref={archivoArca}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            style={{ display: "none" }}
            onChange={async (e) => {
              const files = e.target.files;
              setAvisoArca("Leyendo el listado de ARCA...");
              const msg = await onImportarArca(files);
              setAvisoArca(msg);
              e.target.value = "";
            }}
          />
        </span>
      }
    >
      {avisoArca && (
        <div style={{ fontSize: 12.5, color: /^Error/.test(avisoArca) ? "#b91c1c" : "#1e3a8a", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 10px", marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>{avisoArca}</span>
          <button type="button" onClick={() => setAvisoArca("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <input
          style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13, minWidth: 240 }}
          placeholder="Buscar proveedor, número o CUIT"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <span style={{ fontSize: 12.5, color: "#64748b" }}>
          {visibles.length} factura(s) · sin pagar: <strong style={{ color: totalSinPagar > 0 ? "#b45309" : "#16a34a" }}>{money(totalSinPagar)}</strong>
        </span>
      </div>
      {visibles.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b" }}>{soloSinPagar ? "No hay facturas sin pagar." : "No hay facturas en este mes."}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Proveedor</th>
                <th style={th}>Comprobante</th>
                <th style={th}>Empresa</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={th}>B/N</th>
                <th style={th}>Pago</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => onAbrir(f.id)}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setMenu({ x: ev.clientX, y: ev.clientY, fila: f });
                  }}
                  style={{ cursor: "pointer", background: f.pagada ? undefined : "#fffbeb" }}
                  title="Click: ver o editar la factura · Click derecho: editar, eliminar o ficha del proveedor"
                >
                  <td style={td}>{fmt(f.invoiceDate)}</td>
                  <td style={{ ...td, whiteSpace: "normal" }}>
                    <strong>{f.supplier || "Sin proveedor"}</strong>{" "}
                    {f.arca === "importada" && (
                      <span style={{ ...pill("#1e40af", "#dbeafe"), marginRight: 4 }} title="Vino del listado de ARCA: no está la factura en mano">
                        ARCA
                      </span>
                    )}
                    {f.arca === "cruzada" && (
                      <span style={{ ...pill("#166534", "#dcfce7"), marginRight: 4 }} title="Cargada y encontrada en el listado de ARCA">
                        ✓ ARCA
                      </span>
                    )}
                    {f.source === "caja_chica" && (
                      <span style={{ ...pill("#7c2d12", "#ffedd5"), marginRight: 4 }}>
                        caja chica{f.cajaResponsable ? ` · ${f.cajaResponsable}` : ""}
                      </span>
                    )}
                    {f.tipoProveedor === "ctacte" ? (
                      <span style={pill("#166534", "#dcfce7")}>cta cte</span>
                    ) : f.tipoProveedor === "nuevo" ? (
                      <span style={pill("#b45309", "#fef3c7")}>nuevo</span>
                    ) : null}
                  </td>
                  <td style={td}>{f.receiptLetter ? `${f.receiptLetter} ` : ""}{f.invoiceNumber || "—"}</td>
                  <td style={td}>{shortDe(f.company)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(f.total)}</td>
                  <td style={td}>
                    <span style={pill(f.administration === "negro" ? "#fff" : "#334155", f.administration === "negro" ? "#1f2937" : "#e2e8f0")}>
                      {f.administration === "negro" ? "N" : "B"}
                    </span>
                  </td>
                  <td style={td}>
                    {f.pagada ? (
                      <span style={{ color: "#166534", fontWeight: 700 }}>✓ Pagada · {f.pagoTexto}</span>
                    ) : f.fechaPrevista ? (
                      <span style={pill(ESTADO[f.estadoPrevisto || "programado"].fg, ESTADO[f.estadoPrevisto || "programado"].bg)}>
                        Sin pagar · {fmt(f.fechaPrevista)} · {ESTADO[f.estadoPrevisto || "programado"].label}
                      </span>
                    ) : (
                      <span style={{ color: "#b45309", fontWeight: 700 }}>Sin pagar · sin fecha</span>
                    )}
                  </td>
                  <td style={td}>
                    {!f.pagada && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onAsignarPago(f.id);
                        }}
                        style={{ border: "1px solid #15803d", background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
                      >
                        Asignar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {menu && (() => {
        const f = menu.fila;
        const cerrar = () => setMenu(null);
        const nombre = `${f.supplier || "Sin proveedor"}${f.invoiceNumber ? ` · ${f.receiptLetter || ""} ${f.invoiceNumber}` : ""}`;
        const eliminar = (conPago: boolean) => {
          cerrar();
          const que =
            f.source === "caja_chica"
              ? "el gasto de caja chica y su factura (la plata vuelve a la caja)"
              : conPago
              ? "la factura Y su pago (sale tambien del cash flow)"
              : f.tienePagoCargado
              ? "la factura (el pago queda cargado)"
              : "la factura";
          if (window.confirm(`¿Eliminar ${que}?\n\n${nombre} · ${money(f.total)}`)) onEliminar(f.id, conPago);
        };
        const rojo: React.CSSProperties = { ...quickMenuItem, color: "#b91c1c" };
        return (
          <QuickMenu x={menu.x} y={menu.y} onClose={cerrar}>
            <QuickMenuTitle>{nombre}</QuickMenuTitle>
            <button type="button" style={quickMenuItem} onClick={() => { cerrar(); onAbrir(f.id); }}>
              {f.source === "caja_chica" ? "Editar (gasto de caja chica)…" : "Editar factura…"}
            </button>
            {f.source === "caja_chica" ? (
              <button type="button" style={rojo} onClick={() => eliminar(false)}>Eliminar gasto y factura</button>
            ) : f.tienePagoCargado ? (
              <>
                <button type="button" style={rojo} onClick={() => eliminar(true)}>Eliminar factura y su pago</button>
                <button type="button" style={rojo} onClick={() => eliminar(false)}>Eliminar solo la factura (el pago queda)</button>
              </>
            ) : (
              <button type="button" style={rojo} onClick={() => eliminar(false)}>Eliminar factura</button>
            )}
            <QuickMenuSep />
            <button type="button" style={quickMenuItem} onClick={() => { cerrar(); onFichaProveedor(f.supplier, f.taxId); }}>
              Ficha del proveedor
            </button>
          </QuickMenu>
        );
      })()}
    </Panel>
  );
}
