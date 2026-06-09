#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const envFiles = [".env", ".env.local", ".env.auth.local"];
const authRequiredVars = [
  "SUPABASE_TEST_ADMIN_EMAIL",
  "SUPABASE_TEST_ADMIN_PASSWORD",
  "SUPABASE_TEST_RESTRICTED_EMAIL",
  "SUPABASE_TEST_RESTRICTED_PASSWORD",
];

function readEnvFiles() {
  const values = {};

  envFiles.forEach((fileName) => {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) return;

    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) return;

        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        values[match[1]] = value;
      });
  });

  return values;
}

function hasAuthSmokeCredentials() {
  const envValues = readEnvFiles();
  return authRequiredVars.every((key) => {
    const value = process.env[key] || envValues[key] || "";
    return value.trim() && value.trim() !== "replace-me";
  });
}

function runScript(scriptName, options = {}) {
  console.log(`\n== npm run ${scriptName} ==`);
  const command =
    process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm.cmd run ${scriptName}`]
      : ["run", scriptName];
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.log(`[FAIL] no pude ejecutar npm run ${scriptName}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (options.optional) {
      console.log(`[WARN] npm run ${scriptName} no termino OK, pero esta marcado como opcional.`);
      return false;
    }

    console.log(`[FAIL] npm run ${scriptName} termino con codigo ${result.status}.`);
    process.exit(result.status || 1);
  }

  console.log(`[OK] npm run ${scriptName}`);
  return true;
}

function printSummary(authSmokeRan) {
  console.log("\n== Resultado release-check ==");
  console.log("[OK] preflight completo.");
  console.log(
    authSmokeRan
      ? "[OK] auth-smoke completo con usuarios reales."
      : "[WARN] auth-smoke omitido: faltan credenciales locales de prueba."
  );
  console.log("[OK] build de produccion completo.");

  console.log("\nAntes de redeploy:");
  console.log("- Revisar que Vercel tenga las 3 variables REACT_APP_*.");
  console.log("- Correr auth-smoke con .env.auth.local completo antes de probar usuarios.");
  console.log("- Revisar supabase/rls-policies.sql antes de ejecutar SQL en Supabase.");
}

function main() {
  console.log("Release check Sistema de Gestion Grupo BGA");
  console.log("No se imprimen contrasenas, tokens ni claves.");

  runScript("preflight");

  const authSmokeReady = hasAuthSmokeCredentials();
  if (authSmokeReady) {
    runScript("auth-smoke");
  } else {
    console.log("\n== npm run auth-smoke ==");
    console.log("[WARN] omitido porque .env.auth.local no tiene los 2 usuarios de prueba.");
  }

  runScript("build");
  printSummary(authSmokeReady);

  if (!authSmokeReady) {
    process.exitCode = 2;
  }
}

main();
