import React, { useEffect, useMemo, useState } from "react";
import { styles } from "./styles";
import { SEMAPHORE_PALETTE, type SemaphoreLevel } from "./theme";
import { formatAmountInput, formatAmountTyping, parseAmountInput } from "../lib/format";

// Campo para tipear plata: miles con "." y decimal con "," (es-AR), y VACIO en vez de "0" (asi no
// queda el cero adelante al empezar a escribir). Mantiene el texto en progreso mientras el foco esta
// puesto y se sincroniza con el numero de afuera al perder foco. Emite numeros por onChange.
function AmountInput({
  value,
  onChange,
  style,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const [text, setText] = useState<string>(() => formatAmountInput(value));
  const [editing, setEditing] = useState(false);

  // Si el valor cambia desde afuera (carga, reset) y no lo estoy editando, refresco el texto.
  useEffect(() => {
    if (!editing) setText(formatAmountInput(value));
  }, [value, editing]);

  return (
    <input
      style={style}
      type="text"
      inputMode="decimal"
      placeholder={placeholder ?? "0"}
      value={text}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        setEditing(false);
        setText(formatAmountInput(value)); // al salir, dejo el numero prolijo
      }}
      onChange={(e) => {
        setText(formatAmountTyping(e.target.value));
        onChange(parseAmountInput(e.target.value));
      }}
    />
  );
}

function PrintReport({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} style={{ ...styles.printSheet, display: "none" }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      {children}
    </div>
  );
}

function Panel({
  title,
  children,
  actions,
  nested = false,
  green = false,
  span = "auto",
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  nested?: boolean;
  green?: boolean;
  span?: "auto" | "half" | "wide" | "full" | "third";
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        ...styles.panel,
        ...(span === "third" ? styles.panelThird : {}),
        ...(span === "half" ? styles.panelHalf : {}),
        ...(span === "wide" ? styles.panelWide : {}),
        ...(span === "full" ? styles.panelFull : {}),
        ...(nested ? styles.nestedPanel : {}),
        ...(green ? styles.greenPanel : {}),
      }}
    >
      <div style={styles.panelHeader}>
        <button
          type="button"
          style={styles.panelTitleToggle}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <span style={styles.panelCollapseBadge}>{collapsed ? "+" : "-"}</span>
          <span>{title}</span>
        </button>
        <div style={styles.panelHeaderRight}>
          {actions}
        </div>
      </div>
      {!collapsed && children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.label}>{label}</div>
      {children}
    </div>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={styles.grid2}>{children}</div>;
}

function Semaforo({
  level,
  size = 12,
  title,
  ring = false,
}: {
  level: SemaphoreLevel;
  size?: number;
  title?: string;
  ring?: boolean;
}) {
  return (
    <span
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: SEMAPHORE_PALETTE[level].color,
        boxShadow: ring ? `0 0 0 4px ${SEMAPHORE_PALETTE[level].soft}` : undefined,
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}

function SemaforoResumen({
  items,
}: {
  items: { level: SemaphoreLevel; label: string; value: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ ...styles.metric, display: "flex", alignItems: "center", gap: 12 }}>
          <Semaforo level={it.level} size={24} ring />
          <div>
            <div style={styles.metricLabel}>{it.label}</div>
            <div style={{ fontWeight: 700 }}>{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Convención de color de plata para TODO el sistema:
//   - lo que SUMA / entra  -> verde
//   - lo que RESTA / sale   -> rojo
//   - neutro (saldo, dato)  -> tinta oscura
export const MONEY_IN_COLOR = "#16a34a"; // verde (entra / suma)
export const MONEY_OUT_COLOR = "#dc2626"; // rojo (sale / resta)
export const moneyToneColor = (tone?: "in" | "out"): string =>
  tone === "in" ? MONEY_IN_COLOR : tone === "out" ? MONEY_OUT_COLOR : "#0f172a";

// Aclaración de PROCEDENCIA de un monto: círculo blanco con "B" (blanco) o negro con "N" (negro).
// Se pone al lado del número. Reutilizable en todo el sistema.
function ColorTag({
  color,
  size = 15,
  style,
}: {
  color: "blanco" | "negro";
  size?: number;
  style?: React.CSSProperties;
}) {
  const isNegro = color === "negro";
  return (
    <span
      title={isNegro ? "Negro" : "Blanco"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        fontSize: Math.round(size * 0.62),
        fontWeight: 800,
        lineHeight: 1,
        marginLeft: 5,
        verticalAlign: "middle",
        flex: "none",
        background: isNegro ? "#0f172a" : "#ffffff",
        color: isNegro ? "#ffffff" : "#0f172a",
        border: isNegro ? "1px solid #0f172a" : "1px solid #94a3b8",
        ...style,
      }}
    >
      {isNegro ? "N" : "B"}
    </span>
  );
}

// Estilo compacto de todo el sistema: etiqueta a la izquierda y numero pegado a la derecha (poco
// recorrido para el ojo), en fila. tone: "out" pinta el monto en rojo (sale plata), "in" en verde
// (entra). `color` agrega el badge B/N de procedencia al lado del número.
function MiniMetric({
  label,
  value,
  tone,
  color,
}: {
  label: string;
  value: string;
  tone?: "out" | "in";
  color?: "blanco" | "negro";
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "3px 0" }}>
      <span style={{ fontSize: 12.5, color: "#64748b", minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: moneyToneColor(tone),
          whiteSpace: "nowrap",
        }}
      >
        {value}
        {color && <ColorTag color={color} />}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  tone,
  color,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "out" | "in";
  color?: "blanco" | "negro";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: strong ? 700 : 400 }}>
      <span>{label}</span>
      <span style={{ color: tone ? moneyToneColor(tone) : undefined }}>
        {value}
        {color && <ColorTag color={color} />}
      </span>
    </div>
  );
}

function ButtonLike({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        ...(secondary ? styles.buttonSecondary : {}),
        ...(disabled ? styles.buttonDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function FileDropButton({
  label,
  fileName,
  onFileSelected,
  onFilesSelected,
  accept = "image/*,.pdf,application/pdf",
  allowMultiple = false,
}: {
  label: string;
  fileName?: string;
  onFileSelected?: (file: File | null) => void;
  onFilesSelected?: (files: FileList | null) => void;
  accept?: string;
  allowMultiple?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = useMemo(
    () =>
      `upload-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,
    [label]
  );

  const handleFiles = (files: FileList | null) => {
    if (onFilesSelected) {
      onFilesSelected(files);
      return;
    }
    if (onFileSelected) {
      onFileSelected(files?.[0] || null);
    }
  };

  return (
    <div
      style={{
        ...styles.fileDropZone,
        ...(isDragging ? styles.fileDropZoneActive : {}),
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <label htmlFor={inputId} style={styles.fileDropLabel}>
        {label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        capture={accept.includes("image/*") ? ("environment" as any) : undefined}
        style={{ display: "none" }}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <div style={styles.fileDropHint}>
        Arrastra archivo{allowMultiple ? "s" : ""} aqui o toca para elegir
        {accept.includes("image/*") ? " / sacar foto" : ""}.
      </div>
      {fileName && <div style={styles.fileName}>{fileName}</div>}
    </div>
  );
}

export {
  PrintReport,
  Panel,
  Field,
  TwoCol,
  Semaforo,
  SemaforoResumen,
  MiniMetric,
  SummaryRow,
  ButtonLike,
  FileDropButton,
  AmountInput,
  ColorTag,
};
