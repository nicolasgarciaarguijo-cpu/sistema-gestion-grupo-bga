// PEDIDOS DE BORRADO (12/11/2026): lo que alguien quiso borrar pasada la hora de cargado. Solo el superadmin lo ve
// (al abrir el sistema, y con el boton flotante) y decide: autorizar (se borra) o rechazar (queda como esta).
// Ver domain/borradoProtegido.ts.
import React from "react";
import type { PedidoBorrado } from "../domain/borradoProtegido";

const ETIQUETA: Record<string, string> = {
  savedBudgets: "Presupuesto guardado", crmClients: "Cliente", approvedJobs: "Trabajo aprobado", financialItems: "Movimiento del calendario",
  purchaseInvoices: "Factura de compra", pettyCashFunds: "Caja chica", pettyCashExpenses: "Gasto de caja chica", viaticos: "Viático",
  debtPlans: "Deuda", bankStatementEntries: "Movimiento del banco", capitalEntries: "Aporte o retiro", retirosSocietarios: "Retiro societario",
  cashHoldings: "Efectivo", internalTransfers: "Movimiento interno", personLedgerEntries: "Cuenta corriente con la gente", ivaVepPayments: "VEP de IVA",
  regularizacionesBlanqueo: "Regularización", stockItems: "Artículo de stock", costEntries: "Pago o gasto", seguros: "Seguro", inversiones: "Inversión",
  vencimientos: "Vencimiento", asignacionesDiarias: "Organización diaria", tiposTarea: "Tipo de tarea", gruposTrabajo: "Grupo de trabajo",
  tiposMueble: "Tipo de mueble", retrabajos: "Retrabajo", rutinasTaller: "Rutina del taller", cuentasGuardadas: "Cuenta", creditCards: "Tarjeta",
  creditCardStatements: "Resumen de tarjeta", creditCardConsumptions: "Consumo de tarjeta", suppliers: "Proveedor", issuedInvoices: "Factura emitida",
  remitos: "Remito", creditNotes: "Nota de crédito", companyAssets: "Archivo o bien", linkedDocuments: "Documento", employees: "Persona del personal",
};
const HIJO: Record<string, string> = {
  payments: "cobro", commissionPayments: "pago de comisión", invoices: "factura", retentions: "retención", additionals: "adicional",
  cobrosPrevistos: "cobro previsto", workFiles: "archivo", documents: "documento", provisionItems: "provisión",
};

export const etiquetaItem = (coleccion: string, hijo?: string) =>
  hijo ? `${ETIQUETA[coleccion] || coleccion} · ${HIJO[hijo] || hijo}` : ETIQUETA[coleccion] || coleccion;

const cuando = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function VentanaPedidosBorrado({
  pedidos,
  empresaCorta,
  onAutorizar,
  onRechazar,
  onCerrar,
}: {
  pedidos: PedidoBorrado[];
  empresaCorta: (company: string) => string;
  onAutorizar: (id: number) => void;
  onRechazar: (id: number) => void;
  onCerrar: () => void;
}) {
  const boton = (fondo: string, borde: string): React.CSSProperties => ({ border: `1px solid ${borde}`, background: fondo, color: "#fff", borderRadius: 7, padding: "5px 12px", fontWeight: 800, cursor: "pointer", fontSize: 13 });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4850, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "30px 12px" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🗑 Borrados por autorizar</div>
        <div style={{ fontSize: 13, color: "#475569", margin: "4px 0 14px" }}>
          Lo que alguien quiso borrar después de la hora de cargado. Mientras no lo autorices sigue cargado en el sistema.
        </div>
        {pedidos.length === 0 ? (
          <div style={{ color: "#64748b", padding: "10px 0" }}>No hay borrados pendientes.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pedidos.map((p) => (
              <div key={p.id} style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{p.pedidoPor}</strong> pidió borrar el {cuando(p.pedidoEn)} · {empresaCorta(p.company)}
                  </div>
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      type="button"
                      style={boton("#dc2626", "#b91c1c")}
                      onClick={() => {
                        if (window.confirm(`¿Borrar ${p.items.length === 1 ? "este registro" : `estos ${p.items.length} registros`}? No se puede deshacer.`)) onAutorizar(p.id);
                      }}
                    >
                      Autorizar y borrar
                    </button>
                    <button type="button" style={boton("#475569", "#334155")} onClick={() => onRechazar(p.id)}>
                      Rechazar
                    </button>
                  </span>
                </div>
                <div style={{ marginTop: 6, display: "grid", gap: 3 }}>
                  {p.items.map((i) => (
                    <div key={`${i.coleccion}-${i.padreId ?? ""}-${i.refId}`} style={{ fontSize: 13, color: "#334155" }}>
                      • <strong>{etiquetaItem(i.coleccion, i.hijo)}</strong>: {i.resumen}
                      <span style={{ color: "#94a3b8" }}> · cargado {i.creadoEn ? cuando(i.creadoEn) : "antes del 12/11/2026"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={onCerrar} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: "pointer" }}>
            Ver más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
