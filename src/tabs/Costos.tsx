// Solapa Costos: costos fijos y variables del ano fiscal, mes a mes.
//
// Que muestra:
//   - la grilla grupo x mes (el "para ver esta informacion" del pedido)
//   - los grupos y su tipo (el GRUPO define fijo/variable, no el item)
//   - carga manual de gastos que no viven en otra solapa (alquiler, servicios, impuestos)
//   - import del extracto bancario (Excel/PDF/CSV) con revision antes de impactar
//
// EL GASTO ES EL PAGO (regla del 2026-07-19): la factura de compra ya NO entra al resultado, es solo
// registro. Los pagos a proveedores se cargan aca y son los que alimentan el resultado.
// Caja chica y personal siguen agregandose solos desde sus solapas (grupos "auto"), asi el mismo
// gasto no se cuenta dos veces.
import React from "react";
import { styles } from "../ui/styles";
import { Panel, Field, MiniMetric, ButtonLike, FileDropButton } from "../ui/primitives";
import { money } from "../lib/format";
import { isAutoCostGroup, monthKeyLabel } from "../domain/costs";
import type { CostAggregation, CostSourceRow } from "../domain/costs";
import { PAYMENT_METHOD_OPTIONS } from "../domain/types";
import type { CompanyName, CostEntry, CostGroup, CostKind, Supplier } from "../domain/types";
import type { ReconciliationSummary } from "../domain/suppliers";

export type CostStatementDraftRow = {
  id: number;
  date: string;
  concept: string;
  amount: number;
  movementType: "credito" | "debito";
  group: string;
  administration: "blanco" | "negro";
  include: boolean;
};

type CostosTabProps = {
  fiscalLabel: string;
  months: string[];
  aggregation: CostAggregation;
  costGroups: CostGroup[];
  costEntries: CostEntry[];
  costRows: CostSourceRow[];
  companyScope: string;
  // Objetos { value, short, ... } del catalogo de empresas (misma forma que en las otras solapas).
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  onScopeChange: (scope: string) => void;
  onShiftFiscalYear: (delta: number) => void;
  // grupos
  addCostGroup: () => void;
  removeCostGroup: (id: number) => void;
  updateCostGroup: (id: number, field: keyof CostGroup, value: any) => void;
  // gastos
  addCostEntry: () => void;
  removeCostEntry: (id: number) => void;
  updateCostEntry: (id: number, field: keyof CostEntry, value: any) => void;
  // proveedores + cotejo del pago contra el extracto
  suppliers: Supplier[];
  addSupplier: () => void;
  removeSupplier: (id: number) => void;
  updateSupplier: (id: number, field: keyof Supplier, value: any) => void;
  paymentsReconciliation: ReconciliationSummary;
  // extracto
  statementDraft: CostStatementDraftRow[];
  statementMessage: string;
  statementBusy: boolean;
  onStatementFile: (file: File | null) => void;
  updateStatementDraftRow: (id: number, field: keyof CostStatementDraftRow, value: any) => void;
  commitStatementDraft: () => void;
  discardStatementDraft: () => void;
  // Movimientos bancarios (el banco real): mudado desde Balance/Cash Flow. Es el espejo de la cuenta,
  // no suma al resultado. Se navega por mes con shiftOperationalMonth.
  bankStatementSummary: any;
  monthBankStatementEntries: any[];
  operationalMonth: string;
  monthLabel: (month: string) => string;
  shiftOperationalMonth: (delta: number) => void;
  addBankStatementEntry: () => void;
  removeBankStatementEntry: (id: number) => void;
  updateBankStatementEntry: (id: number, field: any, value: string | number | boolean) => void;
  uploadBankStatementFile: (id: number, file: File | null) => void;
};

export function CostosTab({
  suppliers,
  addSupplier,
  removeSupplier,
  updateSupplier,
  paymentsReconciliation,
  fiscalLabel,
  months,
  aggregation,
  costGroups,
  costEntries,
  companyScope,
  COMPANY_OPTIONS,
  getCompanyMeta,
  onScopeChange,
  onShiftFiscalYear,
  addCostGroup,
  removeCostGroup,
  updateCostGroup,
  addCostEntry,
  removeCostEntry,
  updateCostEntry,
  statementDraft,
  statementMessage,
  statementBusy,
  onStatementFile,
  updateStatementDraftRow,
  commitStatementDraft,
  discardStatementDraft,
  bankStatementSummary,
  monthBankStatementEntries,
  operationalMonth,
  monthLabel,
  shiftOperationalMonth,
  addBankStatementEntry,
  removeBankStatementEntry,
  updateBankStatementEntry,
  uploadBankStatementFile,
}: CostosTabProps) {
  const fixedRows = aggregation.rows.filter((row) => row.kind === "fijo");
  const variableRows = aggregation.rows.filter((row) => row.kind === "variable");

  // Solo los grupos no automaticos admiten carga manual.
  const manualGroupOptions = costGroups
    .filter((group) => group.active && !group.auto)
    .map((group) => group.name);

  // Cotejo del pago contra el extracto. Verde = el debito esta; ambar = deberia estar y no aparece
  // (o falta cargar el extracto, o el pago esta mal); gris = no pasa por el banco, no se cerifica.
  const matchByPayment = new Map(paymentsReconciliation.matches.map((m) => [m.paymentId, m]));
  const renderCotejo = (entryId: number) => {
    const match = matchByPayment.get(entryId);
    if (!match || match.status === "no_aplica") {
      return <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>;
    }
    const ok = match.status === "conciliado";
    const montoDistinto = ok && Math.abs(match.diff || 0) > 1;
    return (
      <span
        title={match.detail}
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: ok && !montoDistinto ? "#15803d" : "#b45309",
          whiteSpace: "nowrap",
        }}
      >
        {ok ? (montoDistinto ? "≠ monto" : "✓ en el banco") : "⚠ no figura"}
      </span>
    );
  };

  const monthsWithData = months.filter((m) => (aggregation.totalByMonth[m] || 0) > 0).length;
  const fixedMonthlyAverage =
    monthsWithData > 0 ? aggregation.fixedTotal / monthsWithData : 0;

  const renderGroupRows = (rows: typeof aggregation.rows, kindLabel: string) => (
    <>
      <tr>
        <td
          colSpan={months.length + 2}
          style={{ fontWeight: 800, background: "#f1f5f9", color: "#0f172a" }}
        >
          {kindLabel}
        </td>
      </tr>
      {rows.length === 0 && (
        <tr>
          <td colSpan={months.length + 2} style={{ color: "#64748b" }}>
            Sin grupos de este tipo.
          </td>
        </tr>
      )}
      {rows.map((row) => (
        <tr key={`${kindLabel}-${row.group}`}>
          <td>
            {row.group}
            {row.auto && (
              <span style={{ ...styles.chatStatus, marginLeft: 6 }}>auto</span>
            )}
          </td>
          {months.map((month) => (
            <td key={month} style={{ textAlign: "right" }}>
              {(row.byMonth[month] || 0) > 0 ? money(row.byMonth[month]) : "-"}
            </td>
          ))}
          <td style={{ textAlign: "right", fontWeight: 700 }}>{money(row.total)}</td>
        </tr>
      ))}
    </>
  );

  return (
    <>
      <Panel
        title={`Costos fijos y variables - ${fiscalLabel}`}
        span="full"
        actions={
          <>
            <ButtonLike onClick={() => onShiftFiscalYear(-1)} secondary>
              Ano anterior
            </ButtonLike>
            <ButtonLike onClick={() => onShiftFiscalYear(1)} secondary>
              Ano siguiente
            </ButtonLike>
          </>
        }
      >
        <div style={styles.grid2}>
          <Field label="Empresa">
            <select
              style={styles.input}
              value={companyScope}
              onChange={(e) => onScopeChange(e.target.value)}
            >
              <option value="__ALL__">Todas las empresas</option>
              {COMPANY_OPTIONS.map((company) => (
                <option key={company.value} value={company.value}>
                  {company.short}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={styles.metricsRow}>
          <MiniMetric label="Costos fijos del ano" value={money(aggregation.fixedTotal)} tone="out" />
          <MiniMetric
            label="Costos variables del ano"
            value={money(aggregation.variableTotal)}
            tone="out"
          />
          <MiniMetric label="Total del ano" value={money(aggregation.total)} tone="out" />
          <MiniMetric
            label={`Promedio fijo mensual (${monthsWithData} mes/es con datos)`}
            value={money(fixedMonthlyAverage)}
          />
        </div>
        <div style={styles.sectionNote}>
          Compras, caja chica y personal se agregan solos desde sus solapas (grupos "auto"): no se
          cargan aca para no contar el mismo gasto dos veces. Aca cargas lo que no vive en ninguna
          otra solapa (alquiler, servicios, impuestos), a mano o importando el extracto.
        </div>
      </Panel>

      <Panel title="Costos por grupo y mes" span="full">
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Grupo</th>
                {months.map((month) => (
                  <th key={month} style={{ textAlign: "right" }}>
                    {monthKeyLabel(month)}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {renderGroupRows(fixedRows, "Costos fijos")}
              <tr>
                <td style={{ fontWeight: 800 }}>Subtotal fijos</td>
                {months.map((month) => (
                  <td key={month} style={{ textAlign: "right", fontWeight: 800 }}>
                    {(aggregation.fixedByMonth[month] || 0) > 0
                      ? money(aggregation.fixedByMonth[month])
                      : "-"}
                  </td>
                ))}
                <td style={{ textAlign: "right", fontWeight: 800 }}>
                  {money(aggregation.fixedTotal)}
                </td>
              </tr>

              {renderGroupRows(variableRows, "Costos variables")}
              <tr>
                <td style={{ fontWeight: 800 }}>Subtotal variables</td>
                {months.map((month) => (
                  <td key={month} style={{ textAlign: "right", fontWeight: 800 }}>
                    {(aggregation.variableByMonth[month] || 0) > 0
                      ? money(aggregation.variableByMonth[month])
                      : "-"}
                  </td>
                ))}
                <td style={{ textAlign: "right", fontWeight: 800 }}>
                  {money(aggregation.variableTotal)}
                </td>
              </tr>

              <tr>
                <td style={{ fontWeight: 800 }}>TOTAL</td>
                {months.map((month) => (
                  <td key={month} style={{ textAlign: "right", fontWeight: 800 }}>
                    {(aggregation.totalByMonth[month] || 0) > 0
                      ? money(aggregation.totalByMonth[month])
                      : "-"}
                  </td>
                ))}
                <td style={{ textAlign: "right", fontWeight: 800 }}>{money(aggregation.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Importar extracto bancario"
        span="wide"
        actions={
          statementDraft.length > 0 ? (
            <>
              <ButtonLike onClick={commitStatementDraft}>
                Confirmar {statementDraft.filter((row) => row.include).length} movimiento(s)
              </ButtonLike>
              <ButtonLike onClick={discardStatementDraft} secondary>
                Descartar
              </ButtonLike>
            </>
          ) : undefined
        }
      >
        <FileDropButton
          label={statementBusy ? "Leyendo extracto..." : "Cargar extracto (Excel, PDF o CSV)"}
          accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
          onFileSelected={onStatementFile}
        />
        {statementMessage && <div style={styles.sectionNote}>{statementMessage}</div>}

        {statementDraft.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              Reviso los movimientos y te propongo un grupo. Corregi lo que haga falta y confirma:
              solo se cargan los debitos tildados. Los creditos (plata que entra) no son costos.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Cargar</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Importe</th>
                    <th>Grupo</th>
                    <th>Admin.</th>
                  </tr>
                </thead>
                <tbody>
                  {statementDraft.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            updateStatementDraftRow(row.id, "include", e.target.checked)
                          }
                        />
                      </td>
                      <td>{row.date}</td>
                      <td>{row.concept}</td>
                      <td>{row.movementType === "debito" ? "Debito" : "Credito"}</td>
                      <td style={{ textAlign: "right" }}>{money(row.amount)}</td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.group}
                          onChange={(e) => updateStatementDraftRow(row.id, "group", e.target.value)}
                        >
                          <option value="">Sin clasificar</option>
                          {manualGroupOptions.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          style={styles.input}
                          value={row.administration}
                          onChange={(e) =>
                            updateStatementDraftRow(row.id, "administration", e.target.value)
                          }
                        >
                          <option value="blanco">Blanco</option>
                          <option value="negro">Negro</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Grupos de costos"
        span="wide"
        actions={<ButtonLike onClick={addCostGroup}>Agregar grupo</ButtonLike>}
      >
        <div style={styles.sectionNote}>
          El grupo define si el gasto es fijo o variable. Los grupos "auto" se alimentan de otras
          solapas y no se pueden editar ni borrar.
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Activo</th>
              <th>Grupo</th>
              <th>Tipo</th>
              <th>Origen</th>
              <th>Observacion</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {costGroups.map((group) => (
              <tr key={group.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={group.active}
                    onChange={(e) => updateCostGroup(group.id, "active", e.target.checked)}
                  />
                </td>
                <td>
                  <input
                    style={styles.input}
                    value={group.name}
                    disabled={group.auto}
                    onChange={(e) => updateCostGroup(group.id, "name", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    style={styles.input}
                    value={group.kind}
                    onChange={(e) =>
                      updateCostGroup(group.id, "kind", e.target.value as CostKind)
                    }
                  >
                    <option value="fijo">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                </td>
                <td>{group.auto ? "Automatico" : "Manual"}</td>
                <td>
                  <input
                    style={styles.input}
                    value={group.notes}
                    onChange={(e) => updateCostGroup(group.id, "notes", e.target.value)}
                  />
                </td>
                <td>
                  {!group.auto && (
                    <ButtonLike onClick={() => removeCostGroup(group.id)} secondary>
                      Quitar
                    </ButtonLike>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Proveedores"
        span="full"
        actions={<ButtonLike onClick={addSupplier}>Agregar proveedor</ButtonLike>}
      >
        <div style={styles.sectionNote}>
          El listado sirve para vincular el pago y despues cotejarlo contra el extracto. El CUIT es lo
          que mejor funciona (el banco lo escribe en el concepto). En "Como figura en el banco" pone
          los alias con los que aparece en el resumen, separados por coma: casi nunca coincide con el
          nombre real.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Proveedor</th>
                <th>CUIT</th>
                <th>Como figura en el banco</th>
                <th>Activo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "#64748b" }}>
                    Todavia no cargaste proveedores. Sin listado el pago igual se carga, pero no se
                    puede cotejar automaticamente contra el banco.
                  </td>
                </tr>
              )}
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <select
                      style={styles.input}
                      value={supplier.company}
                      onChange={(e) => updateSupplier(supplier.id, "company", e.target.value)}
                    >
                      <option value="General">Las dos</option>
                      {COMPANY_OPTIONS.map((company) => (
                        <option key={company.value} value={company.value}>
                          {company.short}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={supplier.name}
                      onChange={(e) => updateSupplier(supplier.id, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={supplier.taxId}
                      placeholder="30-71234567-9"
                      onChange={(e) => updateSupplier(supplier.id, "taxId", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={supplier.aliases}
                      placeholder="DAC MADERAS, DACMAD"
                      onChange={(e) => updateSupplier(supplier.id, "aliases", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={supplier.active !== false}
                      onChange={(e) => updateSupplier(supplier.id, "active", e.target.checked)}
                    />
                  </td>
                  <td>
                    <ButtonLike onClick={() => removeSupplier(supplier.id)} secondary>
                      Quitar
                    </ButtonLike>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Gastos cargados"
        span="full"
        actions={<ButtonLike onClick={addCostEntry}>Agregar gasto</ButtonLike>}
      >
        <div style={styles.sectionNote}>
          Los PAGOS: lo que salio de la empresa (proveedores, alquiler, servicios, impuestos). Esto es
          lo que suma al resultado; la factura es solo el respaldo. Caja chica y sueldos se agregan
          solos desde sus solapas. {costEntries.length} cargado(s).
          {paymentsReconciliation.sinMovimiento > 0 && (
            <span style={{ color: "#b45309", fontWeight: 700 }}>
              {" "}
              · {paymentsReconciliation.sinMovimiento} pago(s) por{" "}
              {money(paymentsReconciliation.montoSinMovimiento)} dicen salir del banco pero no figuran
              en el extracto.
            </span>
          )}
        </div>
        <datalist id="lista-proveedores">
          {suppliers
            .filter((s) => s.active !== false)
            .map((s) => (
              <option key={s.id} value={s.name} />
            ))}
        </datalist>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Fecha</th>
                <th>Grupo</th>
                <th>Concepto</th>
                <th>Proveedor</th>
                <th style={{ textAlign: "right" }}>Monto</th>
                <th>Admin.</th>
                <th>Como se pago</th>
                <th>Factura</th>
                <th>Banco</th>
                <th>Carga</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {costEntries.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ color: "#64748b" }}>
                    Todavia no cargaste gastos. Agrega uno a mano o importa el extracto bancario.
                  </td>
                </tr>
              )}
              {costEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <select
                      style={styles.input}
                      value={entry.company}
                      onChange={(e) => updateCostEntry(entry.id, "company", e.target.value)}
                    >
                      {COMPANY_OPTIONS.map((company) => (
                        <option key={company.value} value={company.value}>
                          {company.short}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      style={styles.input}
                      value={entry.date}
                      onChange={(e) => updateCostEntry(entry.id, "date", e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      style={styles.input}
                      value={entry.group}
                      onChange={(e) => updateCostEntry(entry.id, "group", e.target.value)}
                    >
                      <option value="">Sin clasificar</option>
                      {manualGroupOptions.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      style={styles.input}
                      value={entry.description}
                      onChange={(e) => updateCostEntry(entry.id, "description", e.target.value)}
                    />
                  </td>
                  <td>
                    {/* Texto libre con sugerencias del listado: al elegir uno del listado queda
                        VINCULADO (supplierId), que es lo que permite cotejar contra el extracto. */}
                    <input
                      style={styles.input}
                      list="lista-proveedores"
                      value={entry.supplier}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateCostEntry(entry.id, "supplier", value);
                        const match = suppliers.find(
                          (s) => s.name.trim().toLowerCase() === value.trim().toLowerCase()
                        );
                        updateCostEntry(entry.id, "supplierId", match ? match.id : undefined);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      style={{ ...styles.input, textAlign: "right" }}
                      value={entry.amount}
                      onChange={(e) =>
                        updateCostEntry(entry.id, "amount", Number(e.target.value || 0))
                      }
                    />
                  </td>
                  <td>
                    <select
                      style={styles.input}
                      value={entry.administration}
                      onChange={(e) => updateCostEntry(entry.id, "administration", e.target.value)}
                    >
                      <option value="blanco">Blanco</option>
                      <option value="negro">Negro</option>
                    </select>
                  </td>
                  <td>
                    {/* COMO se pago. De aca sale si tiene que figurar en el extracto: es lo que
                        impide contar la misma plata dos veces. Ojo: blanco != sale del banco. */}
                    <select
                      style={styles.input}
                      value={
                        entry.paymentMethod ||
                        (entry.source === "extracto" ? "transferencia" : "efectivo")
                      }
                      onChange={(e) => updateCostEntry(entry.id, "paymentMethod", e.target.value)}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {/* La factura NO suma: respalda que el pago es blanco. */}
                    <input
                      style={styles.input}
                      value={entry.invoiceRef || ""}
                      placeholder={entry.administration === "blanco" ? "N. factura" : "-"}
                      onChange={(e) => updateCostEntry(entry.id, "invoiceRef", e.target.value)}
                    />
                  </td>
                  <td>{renderCotejo(entry.id)}</td>
                  <td>{entry.source === "extracto" ? "Extracto" : "Manual"}</td>
                  <td>
                    <ButtonLike onClick={() => removeCostEntry(entry.id)} secondary>
                      Quitar
                    </ButtonLike>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Movimientos bancarios · el banco real"
        span="full"
        actions={<ButtonLike onClick={addBankStatementEntry}>Agregar movimiento</ButtonLike>}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(-1)}>
            ‹ Mes anterior
          </ButtonLike>
          <strong style={{ minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>
            {monthLabel(operationalMonth)}
          </strong>
          <ButtonLike secondary onClick={() => shiftOperationalMonth(1)}>
            Mes siguiente ›
          </ButtonLike>
        </div>
        <div style={styles.metricGrid}>
          <MiniMetric label="Entró (créditos)" value={money(bankStatementSummary.credits)} />
          <MiniMetric label="Salió (débitos)" value={money(bankStatementSummary.debits)} />
          <MiniMetric label="Neto banco" value={money(bankStatementSummary.net)} />
          <MiniMetric label="Último saldo" value={money(bankStatementSummary.lastBalance)} />
        </div>
        <div style={styles.noticeBox}>
          Las métricas son <strong>acumuladas</strong> (todos los meses); la lista muestra solo{" "}
          <strong style={{ textTransform: "capitalize" }}>{monthLabel(operationalMonth)}</strong> —
          navegá con los botones de mes. Es el <strong>espejo de la cuenta real</strong>: no suma al
          resultado, solo refleja qué entró y salió.
        </div>
        {monthBankStatementEntries.length === 0 ? (
          <div style={styles.empty}>No hay movimientos bancarios en {monthLabel(operationalMonth)}.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empresa</th>
                  <th>Banco</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th>Arch.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {monthBankStatementEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <input
                        style={styles.input}
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateBankStatementEntry(entry.id, "date", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.company}
                        onChange={(e) => updateBankStatementEntry(entry.id, "company", e.target.value)}
                      >
                        {COMPANY_OPTIONS.map((company) => (
                          <option key={company.value} value={company.value}>
                            {company.short}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        style={styles.input}
                        value={entry.bank}
                        onChange={(e) => updateBankStatementEntry(entry.id, "bank", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        style={styles.input}
                        value={entry.movementType}
                        onChange={(e) =>
                          updateBankStatementEntry(entry.id, "movementType", e.target.value)
                        }
                      >
                        <option value="credito">Crédito</option>
                        <option value="debito">Débito</option>
                      </select>
                    </td>
                    <td>
                      <input
                        style={{ ...styles.input, minWidth: 220 }}
                        value={entry.concept}
                        onChange={(e) => updateBankStatementEntry(entry.id, "concept", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...styles.input, textAlign: "right" }}
                        type="number"
                        value={entry.amount}
                        onChange={(e) =>
                          updateBankStatementEntry(entry.id, "amount", Number(e.target.value))
                        }
                      />
                    </td>
                    <td>
                      <input
                        style={{ ...styles.input, textAlign: "right" }}
                        type="number"
                        value={entry.balance}
                        onChange={(e) =>
                          updateBankStatementEntry(entry.id, "balance", Number(e.target.value))
                        }
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <label style={styles.buttonLikeLabel} title={entry.attachmentName || "Cargar resumen / comprobante"}>
                        {entry.attachmentName ? "📎✓" : "📎"}
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => uploadBankStatementFile(entry.id, e.target.files?.[0] || null)}
                        />
                      </label>
                    </td>
                    <td>
                      <button style={styles.smallBtn} onClick={() => removeBankStatementEntry(entry.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

// Reexport util para App.tsx (evita importar el dominio dos veces en el monolito).
export { isAutoCostGroup };
