import React from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike } from "../ui/primitives";
import { formatDateDisplay } from "../lib/format";
import type { LinkedDocument, LinkedDocumentType } from "../domain/types";

type DocumentosTabProps = {
  linkedDocuments: LinkedDocument[];
  folderLinked: boolean;
  folderName: string;
  busy: boolean;
  message: string;
  fsSupported: boolean;
  onLink: () => void;
  onUnlink: () => void;
  onSync: () => void;
  onOpen: (doc: LinkedDocument) => void;
  onRemove: (id: number) => void;
  onExportManuals: () => void;
  onExportBudgets: () => void;
  onExportJobs: () => void;
  onExportFacturas: () => void;
  onExportFacturacion: () => void;
  onExportCompras: () => void;
  onExportPersonal: () => void;
  onExportRemitos: () => void;
  onExportPettyCash: () => void;
  onExportSummary: () => void;
  onExportAll: () => void;
};

const DOC_TYPE_LABELS: Record<LinkedDocumentType, string> = {
  compras: "Facturas de compra",
  "facturas-emitidas": "Facturas emitidas",
  remitos: "Remitos",
  presupuestos: "Presupuestos",
  recibos: "Recibos",
  banco: "Banco",
  cobranzas: "Cobranzas",
  "caja-chica": "Caja chica",
  escalas: "Escalas salariales",
  documentacion: "Documentacion",
  personal: "Personal",
};

const DOC_TYPE_ORDER: LinkedDocumentType[] = [
  "compras",
  "facturas-emitidas",
  "remitos",
  "presupuestos",
  "recibos",
  "banco",
  "cobranzas",
  "caja-chica",
  "escalas",
  "documentacion",
  "personal",
];

const humanSize = (bytes: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentosTab({
  linkedDocuments,
  folderLinked,
  folderName,
  busy,
  message,
  fsSupported,
  onLink,
  onUnlink,
  onSync,
  onOpen,
  onRemove,
  onExportManuals,
  onExportBudgets,
  onExportJobs,
  onExportFacturas,
  onExportFacturacion,
  onExportCompras,
  onExportPersonal,
  onExportRemitos,
  onExportPettyCash,
  onExportSummary,
  onExportAll,
}: DocumentosTabProps) {
  const grouped = React.useMemo(() => {
    const byType = new Map<LinkedDocumentType, LinkedDocument[]>();
    for (const doc of linkedDocuments) {
      const list = byType.get(doc.docType) || [];
      list.push(doc);
      byType.set(doc.docType, list);
    }
    return DOC_TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
      type,
      label: DOC_TYPE_LABELS[type],
      docs: (byType.get(type) || []).sort(
        (a, b) =>
          (b.month || "").localeCompare(a.month || "") ||
          (a.employee || "").localeCompare(b.employee || "") ||
          a.fileName.localeCompare(b.fileName)
      ),
    }));
  }, [linkedDocuments]);

  return (
    <div style={styles.column}>
      <Panel title="Carga por carpeta vinculada" span="wide">
        {!fsSupported && (
          <div style={{ ...styles.noticeBox, background: "#fef2f2", borderColor: "#fecaca" }}>
            Este navegador no permite vincular una carpeta de tu computadora. Abri el sistema en
            <strong> Chrome o Edge</strong> para usar esta funcion.
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {folderLinked ? (
            <>
              <span style={{ ...styles.statusPill, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                Carpeta vinculada: {folderName || "-"}
              </span>
              <ButtonLike onClick={onSync} disabled={busy}>
                {busy ? "Sincronizando..." : "Sincronizar ahora"}
              </ButtonLike>
              <ButtonLike onClick={onLink} secondary disabled={busy}>
                Re-vincular
              </ButtonLike>
              <ButtonLike onClick={onUnlink} secondary disabled={busy}>
                Desvincular
              </ButtonLike>
            </>
          ) : (
            <ButtonLike onClick={onLink} disabled={!fsSupported}>
              Vincular carpeta
            </ButtonLike>
          )}
        </div>

        {message && (
          <div style={{ ...styles.noticeBox, marginTop: 10 }}>{message}</div>
        )}

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "#475569" }}>
            Como armar la carpeta "Sistema de Gestion"
          </summary>
          <div style={{ ...styles.muted, marginTop: 8, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12 }}>
{`Sistema de Gestion/
  Trabajos aprobados/<cliente>/<N presup - trabajo>/
      Facturas/          (dejas una factura aca => aparece en el trabajo)
      Pagos y tickets/
      Planos/
      Remitos/
  Facturas/AAAA/AAAA-MM/       (todas las facturas, por fecha de emision)
  Facturacion y cobranzas/AAAA-MM/
  Compras/AAAA-MM/
      Facturas de compra/
  Personal/<empleado>/
      Documentacion/   EPP/   Examenes/   Capacitaciones/   Presentismo/
      Recibos/AAAA-MM/
  Presupuestos/<cliente>/(Vigentes|Vencidos)/
  Presupuestos/Historial de presupuestos/   (P-<n> - cliente - descripcion, para el cliente)
  Caja chica/(Cajas abiertas|cerradas)/<caja>/
      Rendicion de tickets y facturas/
      Recibos/AAAA-MM/
  Remitos/AAAA/
  Escalas/AAAA-MM/             (escalas salariales)`}
          </div>
          <div style={{ ...styles.muted, marginTop: 6 }}>
            Tiras los archivos en la subcarpeta que corresponde (AAAA-MM = ano-mes, ej. 2026-03) y
            tocas Sincronizar. El sistema los sube a la nube y los ordena por tipo y mes. Los que ya
            estaban no se vuelven a subir.
          </div>
        </details>
      </Panel>

      <Panel title="Exportar a la carpeta" span="wide">
        <div style={{ marginBottom: 8 }}>
          <ButtonLike onClick={onExportAll} disabled={busy || !folderLinked}>
            {busy ? "Exportando..." : "Exportar TODO"}
          </ButtonLike>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <ButtonLike onClick={onExportManuals} disabled={busy || !folderLinked} secondary>
            Manuales
          </ButtonLike>
          <ButtonLike onClick={onExportBudgets} disabled={busy || !folderLinked} secondary>
            Presupuestos
          </ButtonLike>
          <ButtonLike onClick={onExportJobs} disabled={busy || !folderLinked} secondary>
            Trabajos aprobados
          </ButtonLike>
          <ButtonLike onClick={onExportFacturas} disabled={busy || !folderLinked} secondary>
            Facturas (global)
          </ButtonLike>
          <ButtonLike onClick={onExportFacturacion} disabled={busy || !folderLinked} secondary>
            Facturacion y cobranzas
          </ButtonLike>
          <ButtonLike onClick={onExportCompras} disabled={busy || !folderLinked} secondary>
            Compras
          </ButtonLike>
          <ButtonLike onClick={onExportPersonal} disabled={busy || !folderLinked} secondary>
            Personal
          </ButtonLike>
          <ButtonLike onClick={onExportRemitos} disabled={busy || !folderLinked} secondary>
            Remitos
          </ButtonLike>
          <ButtonLike onClick={onExportPettyCash} disabled={busy || !folderLinked} secondary>
            Caja chica
          </ButtonLike>
          <ButtonLike onClick={onExportSummary} disabled={busy || !folderLinked} secondary>
            Resumenes
          </ButtonLike>
        </div>
        <div style={{ ...styles.muted, marginTop: 8 }}>
          Destinos: Trabajos aprobados/&lt;cliente&gt;/&lt;N&deg; presup - trabajo&gt;/ (con Facturas,
          Pagos y tickets, Planos y Remitos adentro) · Facturas/AAAA/AAAA-MM/ (todas, por emision) ·
          Facturacion y cobranzas/AAAA-MM/ · Compras/AAAA-MM/ (deja las facturas de compra ahi) ·
          Personal/&lt;empleado&gt;/(Documentacion, EPP, Recibos/AAAA-MM, Examenes, Capacitaciones,
          Presentismo) · Remitos/AAAA/ · Caja chica/(abiertas|cerradas)/&lt;caja&gt;/ ·
          Presupuestos/&lt;cliente&gt;/ · Resumenes/&lt;periodo&gt;/. Doble via con OCR: si dejas una
          factura en Facturas/, un comprobante en Pagos y tickets/ de un trabajo, o una factura en
          Compras/&lt;mes&gt;/, al Sincronizar se leen los montos y se crea el registro (revisa los
          numeros despues). La primera vez el navegador pide permiso de escritura. Son HTML
          (se imprimen a PDF con Ctrl+P). <strong>Exportar TODO</strong> ademas borra los HTML sobrantes
          (lo que borraste del sistema); nunca toca tus tickets/fotos/PDF cargados.
        </div>
      </Panel>

      <Panel title={`Documentos cargados (${linkedDocuments.length})`} span="wide">
        {grouped.length === 0 ? (
          <div style={styles.calendarEmpty}>
            Todavia no hay documentos. Vincula la carpeta y toca Sincronizar.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.type} style={{ marginBottom: 14 }}>
              <div style={{ ...styles.sectionHeader, display: "flex", justifyContent: "space-between" }}>
                <span>{group.label}</span>
                <span style={{ ...styles.statusPill, background: "#e2e8f0", color: "#475569" }}>
                  {group.docs.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.docs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 10px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ ...styles.statusPill, background: "#eff6ff", color: "#1e3a8a" }}>
                      {doc.month || (doc.employee ? doc.employee : "sin mes")}
                    </span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.subArea ? `${doc.subArea} · ` : ""}
                      {doc.employee && group.type === "personal" ? `${doc.employee} · ` : ""}
                      {doc.fileName}
                      <span style={{ ...styles.muted, marginLeft: 8 }}>
                        {humanSize(doc.size)} · {formatDateDisplay(doc.uploadedAt.slice(0, 10))}
                      </span>
                    </span>
                    <ButtonLike onClick={() => onOpen(doc)} secondary>
                      Abrir
                    </ButtonLike>
                    <ButtonLike onClick={() => onRemove(doc.id)} secondary>
                      Quitar
                    </ButtonLike>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
