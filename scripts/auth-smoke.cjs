#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const projectRoot = path.resolve(__dirname, "..");
const originalEnvKeys = new Set(Object.keys(process.env));
const envFiles = [".env", ".env.local", ".env.auth.local"];

const appTabs = [
  "acceso",
  "cashflow",
  "facturacion",
  "aprobados",
  "fabricacion",
  "compras",
  "cajaChica",
  "presupuesto",
  "historial",
  "stock",
  "personal",
  "marcadores",
];

const authUsers = [
  {
    label: "superadmin",
    emailVar: "SUPABASE_TEST_ADMIN_EMAIL",
    passwordVar: "SUPABASE_TEST_ADMIN_PASSWORD",
    expectAdmin: true,
  },
  {
    label: "restringido",
    emailVar: "SUPABASE_TEST_RESTRICTED_EMAIL",
    passwordVar: "SUPABASE_TEST_RESTRICTED_PASSWORD",
    expectAdmin: false,
    expectCompaniesVar: "SUPABASE_TEST_RESTRICTED_EXPECT_COMPANIES",
    denyCompaniesVar: "SUPABASE_TEST_RESTRICTED_DENY_COMPANIES",
    expectTabsVar: "SUPABASE_TEST_RESTRICTED_EXPECT_TABS",
    denyTabsVar: "SUPABASE_TEST_RESTRICTED_DENY_TABS",
  },
];

let failures = 0;
let warnings = 0;

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function logWarn(message) {
  warnings += 1;
  console.log(`[WARN] ${message}`);
}

function logFail(message) {
  failures += 1;
  console.log(`[FAIL] ${message}`);
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

    if (!originalEnvKeys.has(key)) {
      process.env[key] = value;
    }
  });

  return true;
}

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function maskEmail(email) {
  const value = String(email || "");
  const [name, domain] = value.split("@");
  if (!name || !domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

function listText(items) {
  return items.length > 0 ? items.join(", ") : "-";
}

function valueCandidates(row, keys) {
  return keys
    .map((key) => row?.[key])
    .filter((value) => typeof value === "string" && value.trim())
    .map(String);
}

function companyCandidates(row) {
  return valueCandidates(row, ["code", "short", "label", "name", "value"]);
}

function companyDisplayName(row) {
  return companyCandidates(row)[0] || `empresa ${row?.id ?? "sin-id"}`;
}

function tableKey(row) {
  return (
    valueCandidates(row, ["tab_key", "key", "value", "code"])[0] ||
    String(row?.id || "")
  );
}

function includesNormalized(values, expected) {
  const normalizedExpected = normalizeText(expected);
  return values.some((value) => normalizeText(value) === normalizedExpected);
}

function findCompanyById(companies, id) {
  const normalizedId = Number(id);
  return companies.find((company) => Number(company.id) === normalizedId) || null;
}

async function selectRows(client, table, columns, options = {}) {
  let query = client.from(table).select(columns, { count: "exact" });

  if (options.order) {
    query = query.order(options.order.column, {
      ascending: options.order.ascending !== false,
    });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  return {
    rows: data || [],
    count: typeof count === "number" ? count : data?.length || 0,
  };
}

function assertListContains(label, actualValues, expectedValues) {
  expectedValues.forEach((expected) => {
    if (includesNormalized(actualValues, expected)) {
      logOk(`${label} incluye ${expected}.`);
    } else {
      logFail(`${label} no incluye ${expected}. Valores: ${listText(actualValues)}`);
    }
  });
}

function assertListDoesNotContain(label, actualValues, deniedValues) {
  deniedValues.forEach((denied) => {
    if (includesNormalized(actualValues, denied)) {
      logFail(`${label} expone ${denied}. Valores: ${listText(actualValues)}`);
    } else {
      logOk(`${label} no expone ${denied}.`);
    }
  });
}

async function checkUser(userSpec) {
  const email = process.env[userSpec.emailVar];
  const password = process.env[userSpec.passwordVar];

  if (!email || !password || password === "replace-me") {
    logFail(
      `faltan ${userSpec.emailVar} y/o ${userSpec.passwordVar} para probar usuario ${userSpec.label}.`
    );
    return;
  }

  const client = createClient(
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

  console.log(`\nUsuario ${userSpec.label}: ${maskEmail(email)}`);

  const signInResult = await client.auth.signInWithPassword({ email, password });
  if (signInResult.error || !signInResult.data.user) {
    logFail(
      `login ${userSpec.label} fallo: ${
        signInResult.error?.message || "Supabase no devolvio usuario."
      }`
    );
    return;
  }

  const userId = signInResult.data.user.id;
  logOk(`login ${userSpec.label} correcto.`);

  try {
    const companies = await selectRows(client, "companies", "*", {
      order: { column: "id" },
    });
    const profiles = await selectRows(
      client,
      "profiles",
      "id,full_name,is_superadmin,active",
      { order: { column: "full_name" } }
    );
    const companyPermissions = await selectRows(
      client,
      "user_company_permissions",
      "*"
    );
    const tabPermissions = await selectRows(client, "user_tab_permissions", "*");
    const appTabsResult = await selectRows(client, "app_tabs", "*");

    const currentProfile =
      profiles.rows.find((profile) => String(profile.id) === String(userId)) || null;

    if (!currentProfile) {
      logFail(`${userSpec.label} no tiene perfil visible en profiles.`);
    } else {
      logOk(`${userSpec.label} tiene perfil visible.`);
      if (currentProfile.active === false) {
        logFail(`${userSpec.label} figura como inactivo.`);
      } else {
        logOk(`${userSpec.label} figura activo o sin bloqueo.`);
      }
    }

    const isAdmin = !!currentProfile?.is_superadmin;
    if (isAdmin === userSpec.expectAdmin) {
      logOk(
        `${userSpec.label} ${
          userSpec.expectAdmin ? "esta marcado como superadmin" : "no esta marcado como superadmin"
        }.`
      );
    } else {
      logFail(
        `${userSpec.label} tiene is_superadmin=${isAdmin}; esperado ${userSpec.expectAdmin}.`
      );
    }

    if (!isAdmin) {
      const foreignCompanyPermissions = companyPermissions.rows.filter(
        (permission) =>
          permission.user_id && String(permission.user_id) !== String(userId)
      );
      const foreignTabPermissions = tabPermissions.rows.filter(
        (permission) =>
          permission.user_id && String(permission.user_id) !== String(userId)
      );

      if (foreignCompanyPermissions.length > 0) {
        logFail(
          `${userSpec.label} recibio permisos de empresa de otros usuarios; revisar RLS.`
        );
      } else {
        logOk(`${userSpec.label} solo recibio sus permisos de empresa.`);
      }

      if (foreignTabPermissions.length > 0) {
        logFail(
          `${userSpec.label} recibio permisos de solapa de otros usuarios; revisar RLS.`
        );
      } else {
        logOk(`${userSpec.label} solo recibio sus permisos de solapa.`);
      }
    }

    const allowedCompanyNames = isAdmin
      ? companies.rows.map(companyDisplayName)
      : companyPermissions.rows
          .map((permission) => findCompanyById(companies.rows, permission.company_id))
          .filter(Boolean)
          .map(companyDisplayName);

    const allowedTabKeys = isAdmin
      ? appTabsResult.rows
          .map(tableKey)
          .filter((key) => appTabs.includes(key))
      : tabPermissions.rows
          .map((permission) => String(permission.tab_key || ""))
          .filter(Boolean);

    const visibleTabsInApp = Array.from(
      new Set(["acceso", ...allowedTabKeys.filter((key) => appTabs.includes(key))])
    );

    logOk(`empresas catalogadas visibles: ${companies.count}.`);
    logOk(
      `${userSpec.label} empresas permitidas calculadas: ${listText(allowedCompanyNames)}.`
    );
    logOk(`${userSpec.label} solapas visibles calculadas: ${listText(visibleTabsInApp)}.`);

    if (!isAdmin && allowedCompanyNames.length === 0) {
      logFail(`${userSpec.label} no tiene empresas permitidas.`);
    }

    if (!isAdmin && allowedTabKeys.length === 0) {
      logFail(`${userSpec.label} no tiene solapas permitidas.`);
    }

    if (userSpec.expectCompaniesVar) {
      assertListContains(
        `${userSpec.label} empresas`,
        allowedCompanyNames,
        parseCsv(process.env[userSpec.expectCompaniesVar])
      );
    }

    if (userSpec.denyCompaniesVar) {
      const deniedCompanies = parseCsv(process.env[userSpec.denyCompaniesVar]);
      if (deniedCompanies.length > 0) {
        assertListDoesNotContain(
          `${userSpec.label} empresas`,
          allowedCompanyNames,
          deniedCompanies
        );
      }
    }

    if (userSpec.expectTabsVar) {
      assertListContains(
        `${userSpec.label} solapas`,
        visibleTabsInApp,
        parseCsv(process.env[userSpec.expectTabsVar])
      );
    }

    if (userSpec.denyTabsVar) {
      const deniedTabs = parseCsv(process.env[userSpec.denyTabsVar]);
      if (deniedTabs.length > 0) {
        assertListDoesNotContain(`${userSpec.label} solapas`, visibleTabsInApp, deniedTabs);
      }
    }

    const readChecks = [
      ["app_state_snapshots", "payload,saved_at,updated_by"],
      ["app_state_modules", "module_key,payload,saved_at,updated_by"],
      ["crm_budgets", "local_id,company,updated_by"],
      ["crm_clients", "client_key,client_name,updated_by"],
      ["app_active_sessions", "session_id,user_id,last_seen_at"],
      ["app_internal_chat_messages", "id,user_id,message,created_at"],
    ];

    for (const [table, columns] of readChecks) {
      try {
        const result = await selectRows(client, table, columns, { limit: 5 });
        logOk(`${userSpec.label} puede leer ${table}; ${result.count} fila(s) visibles.`);
      } catch (error) {
        logFail(
          `${userSpec.label} no puede leer ${table}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  } finally {
    await client.auth.signOut();
  }
}

async function main() {
  console.log("Auth smoke test Sistema de Gestion Grupo BGA");
  console.log("No se imprimen contrasenas, tokens ni claves.\n");

  const loadedFiles = envFiles.filter(loadEnvFile);
  if (loadedFiles.length > 0) {
    logOk(`variables cargadas desde ${loadedFiles.join(", ")}.`);
  } else {
    logWarn("no encontre archivos .env; usare variables del proceso si existen.");
  }

  if (!process.env.REACT_APP_SUPABASE_URL) {
    logFail("REACT_APP_SUPABASE_URL falta.");
  }

  if (!process.env.REACT_APP_SUPABASE_ANON_KEY) {
    logFail("REACT_APP_SUPABASE_ANON_KEY falta.");
  }

  if (failures > 0) {
    console.error("\nAuth smoke detenido por configuracion incompleta.");
    process.exit(1);
  }

  for (const userSpec of authUsers) {
    await checkUser(userSpec);
  }

  console.log(
    `\nAuth smoke terminado con ${failures} error(es) y ${warnings} advertencia(s).`
  );

  if (failures > 0) {
    console.log("\nConfigura .env.auth.local con usuarios reales de prueba y vuelve a correr:");
    console.log("npm run auth-smoke");
    process.exit(1);
  }
}

main().catch((error) => {
  logFail(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
