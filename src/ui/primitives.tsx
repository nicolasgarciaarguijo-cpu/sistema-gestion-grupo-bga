import React, { useMemo, useState } from "react";
import { styles } from "./styles";
import { SEMAPHORE_PALETTE, type SemaphoreLevel } from "./theme";

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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: strong ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
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
};
