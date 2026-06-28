import React from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike } from "../ui/primitives";
import type { CompanyName } from "../domain/types";

type AccesoTabProps = {
  isSupabaseLoggedIn: boolean;
  budget: any;
  isSupabaseRecoveryMode: boolean;
  supabaseNewPassword: string;
  supabaseNewPasswordConfirm: string;
  supabaseLoginEmail: string;
  supabaseLoginPassword: string;
  supabaseAuthMessage: any;
  supabaseSession: any;
  supabaseProfile: any;
  supabaseAllowedCompanies: any[];
  visibleTabOptions: any[];
  effectiveIsAdmin: boolean;
  supabaseUserDirectory: any[];
  supabaseActiveSessions: any[];
  newCompanyDraft: any;
  isSupabaseManualSaveInProgress: boolean;
  isPersistenceReady: boolean;
  lastSavedAt: any;
  storageMessage: any;
  COMPANY_OPTIONS: any[];
  getCompanyMeta: (company: CompanyName) => any;
  formatDateTimeDisplay: (dateText: any) => string;
  setSupabaseNewPassword: React.Dispatch<React.SetStateAction<string>>;
  setSupabaseNewPasswordConfirm: React.Dispatch<React.SetStateAction<string>>;
  setSupabaseLoginEmail: React.Dispatch<React.SetStateAction<string>>;
  setSupabaseLoginPassword: React.Dispatch<React.SetStateAction<string>>;
  setIsSupabaseRecoveryMode: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCompanyDraft: React.Dispatch<React.SetStateAction<any>>;
  updateSupabasePassword: () => void | Promise<void>;
  clearSupabasePasswordDrafts: () => void;
  loginSupabaseTest: () => void | Promise<void>;
  sendSupabasePasswordRecovery: () => void | Promise<void>;
  logoutSupabaseTest: () => void | Promise<void>;
  addCompanyCatalogEntry: () => void;
  restoreFromLocalSave: () => void | Promise<void>;
  restoreFromSupabaseSave: () => void | Promise<void>;
  saveToSupabaseNow: () => void | Promise<void>;
  downloadBackupFile: () => void;
  importBackupFile: (file: File | null) => void;
  clearLocalSave: () => void;
};

export function AccesoTab({
  isSupabaseLoggedIn,
  budget,
  isSupabaseRecoveryMode,
  supabaseNewPassword,
  supabaseNewPasswordConfirm,
  supabaseLoginEmail,
  supabaseLoginPassword,
  supabaseAuthMessage,
  supabaseSession,
  supabaseProfile,
  supabaseAllowedCompanies,
  visibleTabOptions,
  effectiveIsAdmin,
  supabaseUserDirectory,
  supabaseActiveSessions,
  newCompanyDraft,
  isSupabaseManualSaveInProgress,
  isPersistenceReady,
  lastSavedAt,
  storageMessage,
  COMPANY_OPTIONS,
  getCompanyMeta,
  formatDateTimeDisplay,
  setSupabaseNewPassword,
  setSupabaseNewPasswordConfirm,
  setSupabaseLoginEmail,
  setSupabaseLoginPassword,
  setIsSupabaseRecoveryMode,
  setNewCompanyDraft,
  updateSupabasePassword,
  clearSupabasePasswordDrafts,
  loginSupabaseTest,
  sendSupabasePasswordRecovery,
  logoutSupabaseTest,
  addCompanyCatalogEntry,
  restoreFromLocalSave,
  restoreFromSupabaseSave,
  saveToSupabaseNow,
  downloadBackupFile,
  importBackupFile,
  clearLocalSave,
}: AccesoTabProps) {
  return (
        !isSupabaseLoggedIn ? (
          <div style={styles.accessShell}>
            <div style={styles.accessCard}>
              <div style={styles.accessBrand}>
                {budget.logos[0]?.preview ? (
                  <img src={budget.logos[0].preview} alt="Logo Grupo BGA" style={styles.accessLogo} />
                ) : (
                  <div style={styles.accessLogoPlaceholder}>BGA</div>
                )}
                <div style={styles.accessTitle}>Grupo BGA</div>
                <div style={styles.accessSubtitle}>Acceso al sistema</div>
                <div style={styles.accessSubcompaniesHint}>
                  Luego agregaremos aqui los logos de las subempresas.
                </div>
              </div>

              <div style={styles.accessFormCard}>
                <div style={styles.accessFormTitle}>
                  {isSupabaseRecoveryMode
                    ? "Definir nueva contrasena"
                    : "Iniciar sesion con Supabase"}
                </div>
                <div style={styles.accessFormText}>
                  {isSupabaseRecoveryMode
                    ? "Estas dentro del flujo de recuperacion. Escribe tu nueva contrasena para terminar el cambio."
                    : "Usa tu mail y contrasena habilitados en Supabase para entrar al sistema compartido."}
                </div>
                {isSupabaseRecoveryMode ? (
                  <>
                    <div style={styles.accessInputStack}>
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseNewPassword}
                        onChange={(e) => setSupabaseNewPassword(e.target.value)}
                        placeholder="Nueva contrasena"
                        autoComplete="new-password"
                      />
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseNewPasswordConfirm}
                        onChange={(e) => setSupabaseNewPasswordConfirm(e.target.value)}
                        placeholder="Repetir nueva contrasena"
                        autoComplete="new-password"
                      />
                    </div>
                    <button style={styles.accessSubmitBtn} onClick={updateSupabasePassword}>
                      Guardar nueva contrasena
                    </button>
                    <button
                      style={styles.accessSecondaryBtn}
                      onClick={() => {
                        setIsSupabaseRecoveryMode(false);
                        clearSupabasePasswordDrafts();
                      }}
                    >
                      Volver al ingreso
                    </button>
                  </>
                ) : (
                  <>
                    <div style={styles.accessInputStack}>
                      <input
                        style={styles.accessInput}
                        value={supabaseLoginEmail}
                        onChange={(e) => setSupabaseLoginEmail(e.target.value)}
                        placeholder="Mail de Supabase"
                        autoComplete="username"
                      />
                      <input
                        style={styles.accessInput}
                        type="password"
                        value={supabaseLoginPassword}
                        onChange={(e) => setSupabaseLoginPassword(e.target.value)}
                        placeholder="Contrasena de Supabase"
                        autoComplete="current-password"
                      />
                    </div>
                    <button style={styles.accessSubmitBtn} onClick={loginSupabaseTest}>
                      Ingresar al sistema
                    </button>
                    <button style={styles.accessSecondaryBtn} onClick={sendSupabasePasswordRecovery}>
                      Olvide mi contrasena
                    </button>
                  </>
                )}
                <div style={styles.accessHelpText}>
                  El acceso local fue deshabilitado. Todo el sistema usa autenticacion por Supabase.
                </div>
                {supabaseAuthMessage && (
                  <div style={styles.accessFeedback}>{supabaseAuthMessage}</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.column}>
            <Panel
              title="Sesion Supabase"
              span="half"
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ButtonLike onClick={logoutSupabaseTest} secondary>
                    Cerrar sesion Supabase
                  </ButtonLike>
                </div>
              }
            >
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Sesion actual</div>
                  <div style={styles.muted}>
                    Usuario: <strong>{supabaseSession?.user?.email || "Usuario Supabase"}</strong>
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Rol: {supabaseProfile?.is_superadmin ? "Administrador Supabase" : "Usuario Supabase"}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Permisos cargados</div>
                  <div style={styles.muted}>
                    Empresas: {supabaseAllowedCompanies.map((item) => getCompanyMeta(item).short).join(", ") || "-"}
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Solapas: {visibleTabOptions.map((item) => item.label).join(", ") || "-"}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Seguridad de acceso" span="half">
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Cambiar contrasena</div>
                  <div style={styles.muted}>
                    Puedes actualizarla directamente desde aqui, sin salir del sistema.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    style={styles.input}
                    type="password"
                    value={supabaseNewPassword}
                    onChange={(e) => setSupabaseNewPassword(e.target.value)}
                    placeholder="Nueva contrasena"
                    autoComplete="new-password"
                  />
                  <input
                    style={styles.input}
                    type="password"
                    value={supabaseNewPasswordConfirm}
                    onChange={(e) => setSupabaseNewPasswordConfirm(e.target.value)}
                    placeholder="Repetir nueva contrasena"
                    autoComplete="new-password"
                  />
                  <div>
                    <ButtonLike onClick={updateSupabasePassword}>Actualizar contrasena</ButtonLike>
                  </div>
                </div>
              </div>
            </Panel>

            {effectiveIsAdmin && (
              <Panel title="Usuarios creados en Supabase" span="wide">
                {supabaseUserDirectory.length === 0 ? (
                  <div style={styles.empty}>
                    No pude leer perfiles todavia. Si esto sigue vacio, corre el SQL de
                    colaboracion actualizado para habilitar el directorio interno.
                  </div>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>En linea</th>
                        <th>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supabaseUserDirectory.map((user) => {
                        const activeSession = supabaseActiveSessions.find(
                          (session) => session.user_id === user.id
                        );
                        return (
                          <tr key={`directory-user-${user.id}`}>
                            <td>{user.full_name || "Usuario sin nombre"}</td>
                            <td>{user.is_superadmin ? "Administrador" : "Operativo"}</td>
                            <td>{user.active === false ? "Inactivo" : "Activo"}</td>
                            <td>{activeSession ? "Conectado" : "Sin sesion"}</td>
                            <td>{user.id.slice(0, 8)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Panel>
            )}

            {effectiveIsAdmin && (
              <Panel title="Empresas del sistema" span="wide">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={styles.label}>Empresas activas</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "start" }}>
                      {COMPANY_OPTIONS.map((company) => (
                        <div key={`company-card-${company.value}`} style={styles.subCard}>
                          <div style={styles.inlineActions}>
                            <div
                              style={{
                                ...styles.companyRibbonMini,
                                background: company.soft,
                                color: company.primary,
                              }}
                            >
                              {company.short}
                            </div>
                            <strong>{company.value}</strong>
                          </div>
                          <div style={styles.muted}>CUIT: {company.taxId || "-"}</div>
                          <div style={styles.muted}>Banco: {company.bankName || "-"}</div>
                          <div style={styles.muted}>Alias: {company.bankAlias || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={styles.label}>Agregar nueva empresa</div>
                    <div style={styles.grid2}>
                      <input
                        style={styles.input}
                        value={newCompanyDraft.value}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, value: e.target.value }))
                        }
                        placeholder="Razon social"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.short}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, short: e.target.value }))
                        }
                        placeholder="Nombre corto"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.taxId}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, taxId: e.target.value }))
                        }
                        placeholder="CUIT"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankName}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        placeholder="Banco"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankAlias}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankAlias: e.target.value }))
                        }
                        placeholder="Alias"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankCbu}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankCbu: e.target.value }))
                        }
                        placeholder="CBU"
                      />
                      <input
                        style={styles.input}
                        value={newCompanyDraft.bankAccount}
                        onChange={(e) =>
                          setNewCompanyDraft((prev) => ({ ...prev, bankAccount: e.target.value }))
                        }
                        placeholder="Cuenta"
                      />
                      <div style={styles.inlineActions}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="color"
                          value={newCompanyDraft.primary}
                          onChange={(e) =>
                            setNewCompanyDraft((prev) => ({ ...prev, primary: e.target.value }))
                          }
                        />
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="color"
                          value={newCompanyDraft.soft}
                          onChange={(e) =>
                            setNewCompanyDraft((prev) => ({ ...prev, soft: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <ButtonLike onClick={addCompanyCatalogEntry}>Agregar empresa</ButtonLike>
                    </div>
                    <div style={{ ...styles.muted, marginTop: 10 }}>
                      Esto la suma al sistema publicado. Despues hay que darla de alta tambien en Supabase para permisos y seguridad.
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            <Panel
              title="Datos y guardado"
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ButtonLike onClick={restoreFromLocalSave} secondary>
                    Restaurar guardado local
                  </ButtonLike>
                  <ButtonLike onClick={restoreFromSupabaseSave} secondary>
                    Restaurar Supabase
                  </ButtonLike>
                  <ButtonLike
                    onClick={saveToSupabaseNow}
                    secondary
                    disabled={isSupabaseManualSaveInProgress}
                  >
                    {isSupabaseManualSaveInProgress ? "Guardando..." : "Guardar en Supabase"}
                  </ButtonLike>
                  <ButtonLike onClick={downloadBackupFile} secondary>
                    Descargar backup
                  </ButtonLike>
                  <label style={styles.buttonLikeLabel}>
                    Cargar backup
                    <input
                      type="file"
                      accept="application/json,.json,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => importBackupFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <ButtonLike onClick={clearLocalSave} secondary>
                    Borrar guardado local
                  </ButtonLike>
                </div>
              }
            >
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Guardado automatico</div>
                  <div style={styles.muted}>
                    {isPersistenceReady
                      ? "Activo en este navegador y sincronizado con Supabase en tiempo real mientras la sesion este iniciada."
                      : "Preparando el guardado automatico..."}
                  </div>
                  <div style={{ ...styles.muted, marginTop: 6 }}>
                    Ultimo guardado: {formatDateTimeDisplay(lastSavedAt)}
                  </div>
                </div>
                <div>
                  <div style={styles.label}>Uso recomendado</div>
                  <div style={styles.muted}>
                    Los cambios ahora se comparten en tiempo real. Usa Guardar en Supabase como confirmacion manual adicional antes de cerrar.
                  </div>
                  {storageMessage && (
                    <div style={{ ...styles.muted, marginTop: 6 }}>{storageMessage}</div>
                  )}
                  {supabaseAuthMessage && (
                    <div style={{ ...styles.muted, marginTop: 6 }}>{supabaseAuthMessage}</div>
                  )}
                </div>
              </div>
            </Panel>

          </div>
        )
  );
}
