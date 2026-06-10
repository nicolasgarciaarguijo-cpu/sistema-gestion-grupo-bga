#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const projectRoot = path.resolve(__dirname, "..");
const envFiles = [".env", ".env.local"];
let failures = 0;
let warnings = 0;

const requiredEnvVars = [
  "REACT_APP_SUPABASE_URL",
  "REACT_APP_SUPABASE_ANON_KEY",
];

const tableChecks = [
  {
    table: "companies",
    columns: "*",
    purpose: "catalogo de empresas",
  },
  {
    table: "app_tabs",
    columns: "*",
    purpose: "catalogo de solapas",
  },
  {
    table: "profiles",
    columns: "id,full_name,is_superadmin,active",
    purpose: "directorio de usuarios",
  },
  {
    table: "user_company_permissions",
    columns: "*",
    purpose: "permisos por empresa",
  },
  {
    table: "user_tab_permissions",
    columns: "*",
    purpose: "permisos por solapa",
  },
  {
    table: "app_state_snapshots",
    columns: "payload,saved_at,updated_by",
    purpose: "guardado compatible del sistema",
  },
  {
    table: "app_state_modules",
    columns: "module_key,payload,saved_at,updated_by",
    purpose: "guardado liviano por modulos",
  },
  {
    table: "crm_clients",
    columns: "client_key,client_name,payload,updated_by",
    purpose: "CRM",
  },
  {
    table: "crm_budgets",
    columns: "local_id,company,snapshot,updated_by",
    purpose: "presupuestos CRM",
  },
  {
    table: "app_active_sessions",
    columns: "session_id,user_id,last_seen_at",
    purpose: "usuarios activos",
  },
  {
    table: "app_internal_chat_messages",
    columns: "id,user_id,message,read_by,created_at",
    purpose: "chat interno",
  },
];

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function logWarn(message) {
  warnings += 1;
  console.warn(`[WARN] ${message}`);
}

function logFail(message) {
  failures += 1;
  console.error(`[FAIL] ${message}`);
}

function loadEnvFile(fileName) {
  const filePath = path.join(projectRoot, fileName);
  if (!fs.existsSync(filePath)) return false;

  const contents = fs.readFileSync(filePath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  return true;
}

function maskValue(value) {
  if (!value) return "(vacio)";
  if (value.length <= 10) return "***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function validateUrl(name, value, required) {
  if (!value) {
    if (required) logFail(`${name} no esta configurada.`);
    return;
  }

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      logFail(`${name} debe usar http o https.`);
      return;
    }
    logOk(`${name} tiene formato valido (${parsed.origin}).`);
  } catch {
    logFail(`${name} no tiene formato de URL valido.`);
  }
}

async function checkLocalhost() {
  const localUrl = process.env.PREFLIGHT_LOCAL_URL || "http://localhost:3000";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(localUrl, { signal: controller.signal });
    if (response.ok) {
      logOk(`localhost responde en ${localUrl} (${response.status}).`);
    } else {
      logWarn(`localhost responde en ${localUrl}, pero con estado ${response.status}.`);
    }
  } catch {
    logWarn(`localhost no responde en ${localUrl}. Si no estas probando local, ignora este aviso.`);
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSupabaseTable(client, check) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { count, error } = await client
      .from(check.table)
      .select(check.columns, { count: "exact", head: true });

    if (!error) {
      const visibleRows =
        typeof count === "number" ? `${count} filas visibles con anon` : "sin conteo";
      logOk(`${check.table} (${check.purpose}) disponible; ${visibleRows}.`);
      return;
    }

    lastError = error;
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }

  const code = lastError?.code ? `${lastError.code}: ` : "";
  const message = lastError?.message || String(lastError || "error desconocido");
  logFail(`${check.table} (${check.purpose}) no paso el control: ${code}${message}`);
}

async function main() {
  console.log("Preflight Sistema de Gestion Grupo BGA");
  console.log("No se imprimen claves ni tokens.\n");

  const loadedFiles = envFiles.filter(loadEnvFile);
  if (loadedFiles.length > 0) {
    logOk(`variables cargadas desde ${loadedFiles.join(", ")}.`);
  } else {
    logWarn("no encontre .env ni .env.local; usare variables del proceso si existen.");
  }

  requiredEnvVars.forEach((name) => {
    const value = process.env[name];
    if (!value) {
      logFail(`${name} falta.`);
    } else {
      logOk(`${name} configurada (${maskValue(value)}).`);
    }
  });

  validateUrl("REACT_APP_SUPABASE_URL", process.env.REACT_APP_SUPABASE_URL, true);
  validateUrl(
    "REACT_APP_SUPABASE_AUTH_REDIRECT_URL",
    process.env.REACT_APP_SUPABASE_AUTH_REDIRECT_URL,
    false
  );

  if (failures > 0) {
    console.error("\nPreflight detenido por errores de configuracion.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  for (const check of tableChecks) {
    await checkSupabaseTable(supabase, check);
  }

  await checkLocalhost();

  console.log(
    `\nPreflight terminado con ${failures} error(es) y ${warnings} advertencia(s).`
  );

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  logFail(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
