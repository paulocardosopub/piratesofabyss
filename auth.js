(() => {
  "use strict";

  const SAVE_KEY = "pirates-of-the-abyss-save-v1";
  const USERS_KEY = "pirates-of-the-abyss-auth-users-v1";
  const SESSION_KEY = "pirates-of-the-abyss-auth-session-v1";
  const GUEST_KEY = "pirates-of-the-abyss-auth-guest-v1";
  const LEGACY_BACKUP_PREFIX = "pirates-of-the-abyss-legacy-save-backup-v1:";
  const PBKDF2_ITERATIONS = 150000;
  const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
  const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000;
  const SERVER_SAVE_THROTTLE_MS = 8000;
  const SERVER_REQUEST_TIMEOUT_MS = 12000;
  const MIN_USERNAME_LENGTH = 3;
  const MAX_USERNAME_LENGTH = 24;
  const MIN_PASSWORD_LENGTH = 4;
  const SAVE_VOLATILE_KEYS = ["_saveUpdatedAt", "_backedUpAt", "_backupReason"];

  let currentUser = null;
  let currentSession = null;
  let serverSaveTimer = 0;
  let serverSavePromise = null;
  let pendingServerSave = null;

  const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

  function storageGet(storage, key) {
    try { return storage.getItem(key); } catch { return null; }
  }

  function storageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(storage, key) {
    try { storage.removeItem(key); } catch {}
  }

  function readJsonFromStorage(storage, key, fallback = null) {
    try {
      const raw = storageGet(storage, key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonToStorage(storage, key, value) {
    return storageSet(storage, key, JSON.stringify(value));
  }

  function getLocalStorage() {
    try { return window.localStorage || null; } catch { return null; }
  }

  function getSessionStorage() {
    try { return window.sessionStorage || null; } catch { return null; }
  }

  function cloneData(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
  }

  function getOnlineConfig() {
    const raw = window.PIRATES_ONLINE_CONFIG || {};
    const supabaseUrl = String(raw.supabaseUrl || raw.SUPABASE_URL || "").trim().replace(/\/+$/, "");
    const supabaseAnonKey = String(raw.supabaseAnonKey || raw.SUPABASE_ANON_KEY || "").trim();
    return { supabaseUrl, supabaseAnonKey };
  }

  function isAccountServerConfigured() {
    const config = getOnlineConfig();
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function createAccountServerUnavailableError(error) {
    const timedOut = error?.name === "AbortError";
    const wrapped = new Error(timedOut
      ? "Servidor de contas demorou para responder. Verifique sua conexao e tente novamente."
      : "Servidor de contas indisponivel. Verifique sua conexao e tente novamente.");
    wrapped.serverUnavailable = true;
    wrapped.cause = error;
    return wrapped;
  }

  function isAccountServerUnavailableError(error) {
    if (error?.serverUnavailable) return true;
    const message = String(error?.message || error || "");
    return /Servidor de contas indisponivel|demorou para responder|Failed to fetch|NetworkError|Load failed|fetch failed|AbortError|TypeError: Failed/i.test(message);
  }

  async function callAccountRpc(rpcName, payload = {}) {
    const config = getOnlineConfig();
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error("Servidor de contas indisponivel.");
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), SERVER_REQUEST_TIMEOUT_MS) : 0;
    let response = null;
    try {
      response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${rpcName}`, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`
        },
        body: JSON.stringify(payload),
        signal: controller?.signal
      });
    } catch (error) {
      throw createAccountServerUnavailableError(error);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      let parsed = null;
      try {
        parsed = JSON.parse(message);
      } catch (_) {}
      if (parsed?.message || parsed?.details) throw new Error(parsed.message || parsed.details);
      throw new Error(message || `Servidor de contas indisponivel (${response.status}).`);
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function randomBase64(byteLength = 32) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
  }

  function createId(prefix = "user") {
    if (crypto.randomUUID) return crypto.randomUUID();
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function normalizeUsername(value = "") {
    const text = String(value);
    const normalized = text.normalize ? text.normalize("NFKC") : text;
    return normalized.replace(/\s+/g, " ").trim().slice(0, MAX_USERNAME_LENGTH);
  }

  function usernameKey(value = "") {
    return normalizeUsername(value).toLocaleLowerCase("pt-BR");
  }

  function isValidEmail(value = "") {
    const clean = String(value).trim();
    return !clean || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }

  function loadUsers() {
    const local = getLocalStorage();
    const data = local ? readJsonFromStorage(local, USERS_KEY, null) : null;
    if (data && data.users && data.usersByName) return data;
    return { version: 1, users: {}, usersByName: {} };
  }

  function saveUsers(data) {
    const local = getLocalStorage();
    if (!local) return false;
    data.version = 1;
    data.updatedAt = Date.now();
    return writeJsonToStorage(local, USERS_KEY, data);
  }

  function getUserSaveKey(user) {
    return user?.saveKey || `pirates-of-the-abyss-user-save-v1:${user?.id || "unknown"}`;
  }

  function readLocalSave(key) {
    const local = getLocalStorage();
    return local ? readJsonFromStorage(local, key, null) : null;
  }

  function writeLocalSave(key, save) {
    const local = getLocalStorage();
    return local ? writeJsonToStorage(local, key, save) : false;
  }

  function getSaveScore(save) {
    if (!save || typeof save !== "object") return 0;
    let score = 0;
    score += Math.max(0, Number(save.pirateLevel || 1) - 1) * 6;
    score += Math.max(0, Number(save.regionIndex || 0)) * 5;
    score += Math.max(0, Number(save.unlockedRegions || 1) - 1) * 4;
    score += Math.min(20, Math.max(0, Number(save.xp || 0)) / 100);
    score += Math.min(20, Math.max(0, Number(save.resources?.ouro || 0)) / 1000);
    score += Math.max(0, Number(save.pirateCoins || 0)) * 2;
    score += Math.max(0, Number(save.prestiges || 0)) * 20;
    score += Math.max(0, (Array.isArray(save.ownedShips) ? save.ownedShips.length : 1) - 1) * 4;
    score += Math.max(0, (Array.isArray(save.ownedPets) ? save.ownedPets.length : 0)) * 3;
    score += Math.min(30, Math.max(0, Number(save.lifetime?.enemies || 0)) / 10);
    score += Math.min(20, Math.max(0, Number(save.lifetime?.bosses || 0)) * 4);
    if (save.hasStarted) score += 8;
    if (save.captainSelectedGender) score += 3;
    return score;
  }

  function isMeaningfulSave(save) {
    return getSaveScore(save) >= 4;
  }

  function stripVolatileSaveMetadata(save) {
    const copy = cloneData(save || {});
    if (!copy || typeof copy !== "object") return copy;
    SAVE_VOLATILE_KEYS.forEach(key => { delete copy[key]; });
    return copy;
  }

  function sameSave(a, b) {
    try { return JSON.stringify(stripVolatileSaveMetadata(a)) === JSON.stringify(stripVolatileSaveMetadata(b)); } catch { return false; }
  }

  function backupLegacySave(save, reason = "auth-switch") {
    if (!isMeaningfulSave(save)) return false;
    const local = getLocalStorage();
    if (!local) return false;
    const backup = {
      ...cloneData(save),
      _backupReason: reason,
      _backedUpAt: Date.now()
    };
    return writeJsonToStorage(local, `${LEGACY_BACKUP_PREFIX}${Date.now()}`, backup);
  }

  function clearActiveGameSave(options = {}) {
    const local = getLocalStorage();
    const session = getSessionStorage();
    if (options.backup) {
      const activeSave = readLocalSave(SAVE_KEY);
      if (activeSave) backupLegacySave(activeSave, options.reason || "active-save-clear");
    }
    if (local) storageRemove(local, SAVE_KEY);
    if (session) storageRemove(session, SAVE_KEY);
  }

  function clearForeignActiveSave(user) {
    if (!user?.id) return false;
    const activeSave = readLocalSave(SAVE_KEY);
    const ownerId = String(activeSave?._authUserId || "").trim();
    if (!ownerId || ownerId === user.id) return false;
    backupLegacySave(activeSave, "foreign-user-save");
    clearActiveGameSave();
    return true;
  }

  function saveBelongsToUser(save, user) {
    if (!save || typeof save !== "object" || !user?.id) return true;
    const ownerId = String(save._authUserId || "").trim();
    return !ownerId || ownerId === user.id;
  }

  function listRecoverableSaves(user = null) {
    const local = getLocalStorage();
    if (!local) return [];
    const saves = [];
    const userId = user?.id || "";
    const username = user?.username || "";
    const pushSave = (key, reason) => {
      const save = readJsonFromStorage(local, key, null);
      if (!isMeaningfulSave(save)) return;
      const belongsToUser = user
        ? (!save._authUserId || save._authUserId === userId || save._authUsername === username)
        : !save._authUserId;
      if (!belongsToUser) return;
      saves.push({ key, reason, save, score: getSaveScore(save), updatedAt: Number(save._saveUpdatedAt || save._backedUpAt || save.lastSeen || 0) });
    };
    pushSave(SAVE_KEY, "active-save");
    if (user) pushSave(getUserSaveKey(user), "user-save");
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key?.startsWith(LEGACY_BACKUP_PREFIX)) pushSave(key, "backup");
      if (userId && key === `pirates-of-the-abyss-user-save-v1:${userId}`) pushSave(key, "user-save");
    }
    return saves.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
  }

  function getBestRecoverableSave(user = null) {
    return listRecoverableSaves(user)[0]?.save || null;
  }

  function decorateSave(save, user) {
    return {
      ...cloneData(save || {}),
      _authUserId: user.id,
      _authUsername: user.username,
      _saveUpdatedAt: Date.now()
    };
  }

  function normalizeServerUser(payload = {}) {
    const account = payload.account || payload.user || payload;
    const id = String(account.id || account.account_id || "").trim();
    const username = normalizeUsername(account.username || "");
    const key = usernameKey(account.username_key || username);
    return {
      id,
      username,
      usernameKey: key,
      email: String(account.email || "").trim(),
      saveKey: `pirates-of-the-abyss-user-save-v1:${id}`,
      server: {
        accountId: id,
        sessionToken: String(payload.session_token || account.session_token || ""),
        sessionExpiresAt: payload.session_expires_at || account.session_expires_at || "",
        syncedAt: Date.now()
      }
    };
  }

  function storeServerUser(serverUser, credentials = {}, saveData = null, remember = false, options = {}) {
    if (!serverUser?.id || !serverUser.usernameKey) throw new Error("Conta do servidor invalida.");
    const users = loadUsers();
    const oldId = users.usersByName[serverUser.usernameKey];
    const previous = oldId ? users.users[oldId] : null;
    const localUser = {
      ...(previous || {}),
      ...serverUser,
      password: {
        algorithm: "PBKDF2-SHA256",
        iterations: credentials.iterations || previous?.password?.iterations || PBKDF2_ITERATIONS,
        salt: credentials.salt || previous?.password?.salt || "",
        hash: credentials.hash || previous?.password?.hash || ""
      },
      updatedAt: Date.now()
    };
    if (oldId && oldId !== localUser.id) delete users.users[oldId];
    users.users[localUser.id] = localUser;
    users.usersByName[localUser.usernameKey] = localUser.id;
    saveUsers(users);
    currentUser = localUser;
    writeSession(localUser, remember);
    clearForeignActiveSave(localUser);
    const save = saveData || (options.allowRecoverableFallback === false ? null : getBestRecoverableSave(localUser));
    if (save) {
      writeLocalSave(getUserSaveKey(localUser), decorateSave(save, localUser));
      writeLocalSave(SAVE_KEY, decorateSave(save, localUser));
    } else if (options.clearActiveSaveIfEmpty) {
      clearActiveGameSave({ backup: true, reason: "account-start-clean" });
    }
    return localUser;
  }

  async function getServerChallenge(cleanKey) {
    return callAccountRpc("get_pirate_account_challenge", { p_username_key: cleanKey });
  }

  async function createServerAccount({ username, usernameKey: cleanKey, email, salt, passwordHash, iterations, saveData }) {
    return callAccountRpc("create_pirate_account", {
      p_username: username,
      p_username_key: cleanKey,
      p_email: email || "",
      p_password_salt: salt,
      p_password_hash: passwordHash,
      p_password_iterations: iterations,
      p_save_data: saveData || null
    });
  }

  async function loginServerAccount({ usernameKey: cleanKey, passwordHash }) {
    return callAccountRpc("login_pirate_account", {
      p_username_key: cleanKey,
      p_password_hash: passwordHash
    });
  }

  function getServerAuth(user = currentUser) {
    const token = user?.server?.sessionToken || "";
    const accountId = user?.server?.accountId || user?.id || "";
    return token && accountId ? { accountId, token } : null;
  }

  function getServerAuthContext(user = currentUser) {
    const auth = getServerAuth(user);
    return auth ? { accountId: auth.accountId, sessionToken: auth.token } : null;
  }

  function logoutServerSession(user = currentUser) {
    const auth = getServerAuth(user);
    if (!auth || !isAccountServerConfigured()) return;
    callAccountRpc("logout_pirate_account", {
      p_account_id: auth.accountId,
      p_session_token: auth.token
    }).catch(error => console.warn("Nao foi possivel invalidar a sessao no servidor.", error));
  }

  async function saveGameToServer(saveState, options = {}) {
    const auth = getServerAuth();
    if (!auth || !saveState || typeof saveState !== "object" || !isAccountServerConfigured()) return false;
    if (!saveBelongsToUser(saveState, currentUser)) {
      clearActiveGameSave({ backup: true, reason: "blocked-foreign-save" });
      return false;
    }
    const serverSaveState = decorateSave(saveState, currentUser);
    const result = await callAccountRpc("save_pirate_account_game", {
      p_account_id: auth.accountId,
      p_session_token: auth.token,
      p_save_data: serverSaveState
    });
    const serverSave = result?.save_data || result?.saveData || null;
    if (serverSave) {
      writeLocalSave(getUserSaveKey(currentUser), decorateSave(serverSave, currentUser));
      writeLocalSave(SAVE_KEY, decorateSave(serverSave, currentUser));
    }
    if (currentUser?.server) currentUser.server.syncedAt = Date.now();
    if (options.force && currentUser) {
      const users = loadUsers();
      if (users.users[currentUser.id]) {
        users.users[currentUser.id] = currentUser;
        saveUsers(users);
      }
    }
    return true;
  }

  function scheduleServerSave(saveState) {
    if (!getServerAuth() || !isAccountServerConfigured()) return;
    pendingServerSave = cloneData(saveState);
    if (serverSaveTimer) return;
    serverSaveTimer = window.setTimeout(() => {
      serverSaveTimer = 0;
      const next = pendingServerSave;
      pendingServerSave = null;
      serverSavePromise = saveGameToServer(next).catch(error => console.warn("Nao foi possivel salvar progresso no servidor.", error)).finally(() => {
        serverSavePromise = null;
        if (pendingServerSave) scheduleServerSave(pendingServerSave);
      });
    }, SERVER_SAVE_THROTTLE_MS);
  }

  async function flushCurrentGameSave(saveState) {
    if (serverSaveTimer) {
      clearTimeout(serverSaveTimer);
      serverSaveTimer = 0;
    }
    if (serverSavePromise) await serverSavePromise.catch(() => {});
    const save = saveState || pendingServerSave || readLocalSave(SAVE_KEY);
    pendingServerSave = null;
    if (save) await saveGameToServer(save, { force: true }).catch(error => console.warn("Nao foi possivel sincronizar progresso no servidor.", error));
  }

  async function refreshCurrentServerSave(user = currentUser) {
    const auth = getServerAuth(user);
    if (!auth || !isAccountServerConfigured()) return { ok: false, skipped: true };
    const before = readLocalSave(SAVE_KEY);
    const payload = await callAccountRpc("get_pirate_account_session", {
      p_account_id: auth.accountId,
      p_session_token: auth.token
    });
    const serverUser = normalizeServerUser(payload);
    const users = loadUsers();
    const stored = users.users[user.id] || user;
    const refreshed = {
      ...stored,
      ...serverUser,
      password: stored.password,
      session: stored.session,
      updatedAt: Date.now()
    };
    users.users[refreshed.id] = refreshed;
    users.usersByName[refreshed.usernameKey] = refreshed.id;
    saveUsers(users);
    currentUser = refreshed;

    const serverSave = payload?.save_data || payload?.saveData || null;
    if (serverSave && typeof serverSave === "object") {
      const decorated = decorateSave(serverSave, refreshed);
      writeLocalSave(getUserSaveKey(refreshed), decorated);
      writeLocalSave(SAVE_KEY, decorated);
      return { ok: true, loadedServerSave: true, changed: !sameSave(before, decorated) };
    }

    const local = getLocalStorage();
    if (local) {
      storageRemove(local, getUserSaveKey(refreshed));
      storageRemove(local, SAVE_KEY);
    }
    return { ok: true, loadedServerSave: false, changed: Boolean(before) };
  }

  function shouldKeepExistingSave(nextSave, existingSave) {
    if (!existingSave || !isMeaningfulSave(existingSave)) return false;
    const nextScore = getSaveScore(nextSave);
    const existingScore = getSaveScore(existingSave);
    return existingScore >= 8 && (nextScore <= 3 || (existingScore >= 20 && nextScore < existingScore * .55));
  }

  function saveUserSave(user, save, options = {}) {
    if (!user || !save || typeof save !== "object") return false;
    const key = getUserSaveKey(user);
    const existing = readLocalSave(key);
    if (!options.force && shouldKeepExistingSave(save, existing)) return false;
    const decorated = decorateSave(save, user);
    if (!writeLocalSave(key, decorated)) return false;
    const users = loadUsers();
    const stored = users.users[user.id];
    if (stored) {
      stored.saveKey = key;
      stored.saveUpdatedAt = decorated._saveUpdatedAt;
      if (options.migrated) stored.legacySaveMigratedAt = decorated._saveUpdatedAt;
      saveUsers(users);
      currentUser = stored;
    }
    return true;
  }

  async function deleteCurrentSave() {
    if (!currentUser) return;
    if (serverSaveTimer) {
      clearTimeout(serverSaveTimer);
      serverSaveTimer = 0;
    }
    pendingServerSave = null;
    if (serverSavePromise) await serverSavePromise.catch(() => {});
    const auth = getServerAuth();
    const local = getLocalStorage();
    if (local) storageRemove(local, getUserSaveKey(currentUser));
    if (auth && isAccountServerConfigured()) {
      await callAccountRpc("clear_pirate_account_save", {
        p_account_id: auth.accountId,
        p_session_token: auth.token
      }).catch(error => console.warn("Nao foi possivel limpar progresso no servidor.", error));
    }
  }

  function prepareUserSaveForLoad(user) {
    const local = getLocalStorage();
    if (!local || !user) return null;

    const legacySave = readLocalSave(SAVE_KEY);
    const userSave = readLocalSave(getUserSaveKey(user));
    const legacyIsForeign = legacySave?._authUserId && legacySave._authUserId !== user.id;

    if (legacyIsForeign) {
      backupLegacySave(legacySave, "foreign-user-save");
      storageRemove(local, SAVE_KEY);
    }

    if (isMeaningfulSave(userSave)) {
      if (isMeaningfulSave(legacySave) && !legacyIsForeign && !sameSave(legacySave, userSave)) {
        backupLegacySave(legacySave, "before-user-save-load");
      }
      writeLocalSave(SAVE_KEY, decorateSave(userSave, user));
      return userSave;
    }

    if (isMeaningfulSave(legacySave) && !legacyIsForeign) {
      saveUserSave(user, legacySave, { force: true, migrated: true });
      writeLocalSave(SAVE_KEY, decorateSave(legacySave, user));
      return legacySave;
    }

    const recoveredSave = getBestRecoverableSave(user);
    if (isMeaningfulSave(recoveredSave)) {
      saveUserSave(user, recoveredSave, { force: true, migrated: true });
      writeLocalSave(SAVE_KEY, decorateSave(recoveredSave, user));
      return recoveredSave;
    }

    if (userSave) {
      writeLocalSave(SAVE_KEY, decorateSave(userSave, user));
      return userSave;
    }

    return null;
  }

  async function hashPassword(password, saltBase64, iterations = PBKDF2_ITERATIONS) {
    if (!crypto?.subtle || !textEncoder) {
      throw new Error("Este navegador nao tem suporte a criptografia segura.");
    }
    const key = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(String(password)),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: base64ToBytes(saltBase64),
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );
    return bytesToBase64(new Uint8Array(bits));
  }

  function timingSafeEqual(a = "", b = "") {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let index = 0; index < a.length; index += 1) {
      mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return mismatch === 0;
  }

  function clearSession() {
    const local = getLocalStorage();
    const session = getSessionStorage();
    if (local) storageRemove(local, SESSION_KEY);
    if (session) storageRemove(session, SESSION_KEY);
    currentSession = null;
  }

  function setGuestMode(enabled) {
    const local = getLocalStorage();
    if (!local) return false;
    if (enabled) return storageSet(local, GUEST_KEY, "1");
    storageRemove(local, GUEST_KEY);
    return true;
  }

  function isGuestMode() {
    if (currentUser) return false;
    const local = getLocalStorage();
    return Boolean(local && storageGet(local, GUEST_KEY) === "1");
  }

  function readStoredSession() {
    const session = getSessionStorage();
    const local = getLocalStorage();
    return (session && readJsonFromStorage(session, SESSION_KEY, null))
      || (local && readJsonFromStorage(local, SESSION_KEY, null))
      || null;
  }

  function writeSession(user, remember) {
    const local = getLocalStorage();
    const session = getSessionStorage();
    const tokenHash = randomBase64(32);
    const expiresAt = Date.now() + (remember ? REMEMBER_SESSION_MS : BROWSER_SESSION_MS);
    const sessionData = {
      version: 1,
      userId: user.id,
      usernameKey: user.usernameKey,
      tokenHash,
      expiresAt,
      persistent: Boolean(remember)
    };
    if (local) storageRemove(local, SESSION_KEY);
    if (session) storageRemove(session, SESSION_KEY);
    const target = remember ? local : session;
    if (!target) throw new Error("Nao foi possivel criar a sessao.");
    writeJsonToStorage(target, SESSION_KEY, sessionData);
    setGuestMode(false);

    const users = loadUsers();
    const stored = users.users[user.id];
    if (stored) {
      stored.session = { tokenHash, expiresAt, persistent: Boolean(remember), updatedAt: Date.now() };
      stored.lastLoginAt = Date.now();
      saveUsers(users);
      currentUser = stored;
    } else {
      currentUser = user;
    }
    currentSession = sessionData;
    return sessionData;
  }

  function getValidSessionUser() {
    const sessionData = readStoredSession();
    if (!sessionData || !sessionData.userId || !sessionData.tokenHash || Number(sessionData.expiresAt || 0) < Date.now()) {
      clearSession();
      return null;
    }
    const users = loadUsers();
    const user = users.users[sessionData.userId];
    if (!user || user.session?.tokenHash !== sessionData.tokenHash || Number(user.session?.expiresAt || 0) < Date.now()) {
      clearSession();
      return null;
    }
    currentUser = user;
    currentSession = sessionData;
    return user;
  }

  function setAuthLocked(locked) {
    if (!document?.body) return;
    document.body.classList.toggle("auth-locked", Boolean(locked));
    document.body.classList.toggle("auth-ready", !locked);
  }

  function prepareInitialSave(options = {}) {
    if (options.bypass) {
      setAuthLocked(false);
      return { authenticated: true, bypassed: true, user: null };
    }
    const user = getValidSessionUser();
    if (!user) {
      if (isGuestMode()) {
        setAuthLocked(false);
        return { authenticated: true, guest: true, user: null };
      }
      setAuthLocked(true);
      return { authenticated: false, user: null };
    }
    prepareUserSaveForLoad(user);
    setAuthLocked(false);
    const result = { authenticated: true, user: { id: user.id, username: user.username } };
    if (getServerAuth(user) && isAccountServerConfigured()) {
      result.serverSyncPending = true;
      result.serverSync = refreshCurrentServerSave(user).catch(error => {
        console.warn("Nao foi possivel carregar o save real do servidor.", error);
        const message = error?.message || String(error || "");
        if (/Sessao expirada|Entre novamente/i.test(message)) {
          logout({ clearActiveSave: true });
          return { ok: false, sessionExpired: true, changed: true, error: message };
        }
        return { ok: false, error: message };
      });
    }
    return result;
  }

  function startGuest() {
    clearSession();
    currentUser = null;
    setGuestMode(true);
    setAuthLocked(false);
    return { ok: true, guest: true, user: null };
  }

  async function createAccount({ username, password, email = "", remember = false } = {}) {
    const cleanUsername = normalizeUsername(username);
    const cleanKey = usernameKey(cleanUsername);
    const cleanPassword = String(password || "");
    const cleanEmail = String(email || "").trim().slice(0, 120);

    if (cleanUsername.length < MIN_USERNAME_LENGTH) throw new Error("Informe um usuario com pelo menos 3 caracteres.");
    if (cleanPassword.length < MIN_PASSWORD_LENGTH) throw new Error("Informe uma senha com pelo menos 4 caracteres.");
    if (!isValidEmail(cleanEmail)) throw new Error("Informe um email valido ou deixe em branco.");

    const users = loadUsers();
    if (users.usersByName[cleanKey]) throw new Error("Esse usuario ja existe.");

    const salt = randomBase64(16);
    const passwordHash = await hashPassword(cleanPassword, salt);
    const activeSave = readLocalSave(SAVE_KEY);
    const saveData = isMeaningfulSave(activeSave) ? stripVolatileSaveMetadata(activeSave) : null;

    if (isAccountServerConfigured()) {
      const created = await createServerAccount({
        username: cleanUsername,
        usernameKey: cleanKey,
        email: cleanEmail,
        salt,
        passwordHash,
        iterations: PBKDF2_ITERATIONS,
        saveData
      });
      const serverUser = normalizeServerUser(created);
      storeServerUser(serverUser, { salt, hash: passwordHash, iterations: PBKDF2_ITERATIONS }, created?.save_data || saveData, remember, {
        allowRecoverableFallback: false,
        clearActiveSaveIfEmpty: !saveData
      });
      return { ok: true, user: { id: serverUser.id, username: cleanUsername } };
    }

    const id = createId("pirate");
    const user = {
      id,
      username: cleanUsername,
      usernameKey: cleanKey,
      email: cleanEmail,
      saveKey: `pirates-of-the-abyss-user-save-v1:${id}`,
      password: {
        algorithm: "PBKDF2-SHA256",
        iterations: PBKDF2_ITERATIONS,
        salt,
        hash: passwordHash
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    users.users[id] = user;
    users.usersByName[cleanKey] = id;
    saveUsers(users);
    writeSession(user, remember);
    if (saveData) {
      saveUserSave(user, saveData, { force: true, migrated: true });
      writeLocalSave(SAVE_KEY, decorateSave(saveData, user));
    } else {
      clearActiveGameSave({ backup: true, reason: "new-account-start-clean" });
    }
    return { ok: true, user: { id, username: cleanUsername } };
  }

  async function migrateLocalUserToServer(user, remember = false) {
    if (!user?.password?.salt || !user?.password?.hash || !isAccountServerConfigured()) return user;
    const saveData = prepareUserSaveForLoad(user) || getBestRecoverableSave(user);
    const created = await createServerAccount({
      username: user.username,
      usernameKey: user.usernameKey,
      email: user.email || "",
      salt: user.password.salt,
      passwordHash: user.password.hash,
      iterations: user.password.iterations || PBKDF2_ITERATIONS,
      saveData
    });
    const serverUser = normalizeServerUser(created);
    return storeServerUser(serverUser, {
      salt: user.password.salt,
      hash: user.password.hash,
      iterations: user.password.iterations || PBKDF2_ITERATIONS
    }, created?.save_data || saveData, remember);
  }

  async function login({ username, password, remember = false } = {}) {
    const cleanKey = usernameKey(username);
    const cleanPassword = String(password || "");
    let accountServerUnavailable = false;

    if (isAccountServerConfigured()) {
      try {
        const challenge = await getServerChallenge(cleanKey);
        const salt = challenge?.password_salt || challenge?.salt || "";
        const iterations = Number(challenge?.password_iterations || challenge?.iterations || PBKDF2_ITERATIONS);
        const passwordHash = await hashPassword(cleanPassword, salt, iterations);
        const logged = await loginServerAccount({ usernameKey: cleanKey, passwordHash });
        const serverUser = normalizeServerUser(logged);
        const users = loadUsers();
        const localId = users.usersByName[serverUser.usernameKey];
        const localUser = localId ? users.users[localId] : null;
        const localSave = localUser ? readLocalSave(getUserSaveKey(localUser)) : null;
        const loginSave = logged?.save_data || (isMeaningfulSave(localSave) ? localSave : null);
        storeServerUser(serverUser, { salt, hash: passwordHash, iterations }, loginSave, remember, {
          allowRecoverableFallback: false,
          clearActiveSaveIfEmpty: true
        });
        return { ok: true, user: { id: serverUser.id, username: serverUser.username } };
      } catch (serverError) {
        const message = String(serverError?.message || "");
        const serverUnavailable = isAccountServerUnavailableError(serverError);
        const canFallbackLocal = serverUnavailable || /nao encontrada|não encontrada|Usuario nao encontrado|usu[aá]rio nao encontrado/i.test(message);
        if (!canFallbackLocal) throw serverError;
        if (serverUnavailable) {
          accountServerUnavailable = true;
          const users = loadUsers();
          const userId = users.usersByName[cleanKey];
          if (!userId || !users.users[userId]) throw serverError;
        }
      }
    }

    const users = loadUsers();
    const userId = users.usersByName[cleanKey];
    const user = userId ? users.users[userId] : null;
    if (!user) throw new Error("Usuario nao encontrado.");
    const stored = user.password || {};
    const passwordHash = await hashPassword(cleanPassword, stored.salt, stored.iterations || PBKDF2_ITERATIONS);
    if (!timingSafeEqual(passwordHash, stored.hash || "")) throw new Error("Senha incorreta.");

    if (isAccountServerConfigured() && !accountServerUnavailable) {
      try {
        const migrated = await migrateLocalUserToServer(user, remember);
        return { ok: true, user: { id: migrated.id, username: migrated.username } };
      } catch (error) {
        console.warn("Nao foi possivel migrar a conta local para o servidor.", error);
      }
    }

    writeSession(user, remember);
    prepareUserSaveForLoad(currentUser || user);
    return { ok: true, user: { id: user.id, username: user.username } };
  }

  function logout(options = {}) {
    logoutServerSession();
    if (serverSaveTimer) {
      clearTimeout(serverSaveTimer);
      serverSaveTimer = 0;
    }
    pendingServerSave = null;
    if (options.clearActiveSave) clearActiveGameSave({ backup: true, reason: "logout-active-save" });
    clearSession();
    setGuestMode(false);
    currentUser = null;
    setAuthLocked(true);
  }

  function saveCurrentGame(saveState) {
    if (!currentUser || !saveState || typeof saveState !== "object") return false;
    if (!saveBelongsToUser(saveState, currentUser)) {
      clearActiveGameSave({ backup: true, reason: "blocked-foreign-save" });
      console.warn("Save bloqueado: estado pertence a outra conta.");
      return false;
    }
    const saved = saveUserSave(currentUser, saveState);
    writeLocalSave(SAVE_KEY, decorateSave(saveState, currentUser));
    scheduleServerSave(saveState);
    return saved;
  }

  function getCurrentUser() {
    if (!currentUser) getValidSessionUser();
    return currentUser ? { id: currentUser.id, username: currentUser.username, email: currentUser.email || "" } : null;
  }

  function updateEmail(email = "") {
    if (!currentUser) getValidSessionUser();
    if (!currentUser) throw new Error("Entre na conta antes de salvar o email.");
    const cleanEmail = String(email || "").trim().slice(0, 120);
    if (!cleanEmail) throw new Error("Informe um email para recuperacao.");
    if (!isValidEmail(cleanEmail)) throw new Error("Informe um email valido.");
    const users = loadUsers();
    const stored = users.users[currentUser.id];
    if (!stored) throw new Error("Conta nao encontrada.");
    if (stored.email) throw new Error("Esta conta ja tem email cadastrado.");
    stored.email = cleanEmail;
    stored.updatedAt = Date.now();
    if (!saveUsers(users)) throw new Error("Nao foi possivel salvar o email.");
    currentUser = stored;
    const auth = getServerAuth(stored);
    if (auth && isAccountServerConfigured()) {
      callAccountRpc("update_pirate_account_email", {
        p_account_id: auth.accountId,
        p_session_token: auth.token,
        p_email: cleanEmail
      }).catch(error => console.warn("Nao foi possivel salvar email no servidor.", error));
    }
    return { id: stored.id, username: stored.username, email: stored.email };
  }

  function isAuthenticated() {
    return Boolean(getCurrentUser() || isGuestMode());
  }

  function initLoginScreen(options = {}) {
    const screen = document.getElementById("auth-screen");
    if (!screen) return;

    const form = screen.querySelector("[data-auth-form]");
    const usernameInput = screen.querySelector("[data-auth-username]");
    const passwordInput = screen.querySelector("[data-auth-password]");
    const emailInput = screen.querySelector("[data-auth-email]");
    const rememberInput = screen.querySelector("[data-auth-remember]");
    const loginButton = screen.querySelector("[data-auth-login]");
    const createButton = screen.querySelector("[data-auth-create]");
    const guestButton = screen.querySelector("[data-auth-guest]");
    const forgotButton = screen.querySelector("[data-auth-forgot]");
    const status = screen.querySelector("[data-auth-status]");
    let mode = "login";
    let pending = false;

    ["keydown", "keyup", "keypress", "input", "pointerdown", "touchstart"].forEach(type => {
      screen.addEventListener(type, event => event.stopPropagation());
    });

    const setStatus = (message = "", danger = false) => {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("danger", Boolean(danger));
    };

    const setMode = nextMode => {
      mode = nextMode === "create" ? "create" : "login";
      screen.dataset.authMode = mode;
      createButton?.classList.toggle("primary", mode === "create");
      loginButton?.classList.toggle("primary", mode !== "create");
      if (mode === "create") {
        emailInput?.focus();
        setStatus("Email opcional. Criar conta entra automaticamente.");
      } else {
        usernameInput?.focus();
        setStatus("");
      }
    };

    const setPending = value => {
      pending = Boolean(value);
      [usernameInput, passwordInput, emailInput, rememberInput, loginButton, createButton, guestButton, forgotButton].forEach(item => {
        if (item) item.disabled = pending;
      });
    };

    const finishAuthenticated = result => {
      setStatus("Entrando...");
      setAuthLocked(false);
      if (typeof options.onAuthenticated === "function") {
        options.onAuthenticated(result);
        return;
      }
      window.setTimeout(() => window.location.reload(), 180);
    };

    const getValues = () => ({
      username: usernameInput?.value || "",
      password: passwordInput?.value || "",
      email: emailInput?.value || "",
      remember: Boolean(rememberInput?.checked)
    });

    async function submitLogin() {
      if (pending) return;
      setPending(true);
      try {
        const result = await login(getValues());
        finishAuthenticated(result);
      } catch (error) {
        setStatus(error.message || "Nao foi possivel entrar.", true);
      } finally {
        setPending(false);
      }
    }

    async function submitCreate() {
      if (pending) return;
      if (mode !== "create") {
        setMode("create");
        return;
      }
      setPending(true);
      try {
        const result = await createAccount(getValues());
        finishAuthenticated(result);
      } catch (error) {
        setStatus(error.message || "Nao foi possivel criar a conta.", true);
      } finally {
        setPending(false);
      }
    }

    function submitGuest() {
      if (pending) return;
      setPending(true);
      try {
        const result = startGuest();
        finishAuthenticated(result);
      } catch (error) {
        setStatus(error.message || "Nao foi possivel iniciar sem login.", true);
        setPending(false);
      }
    }

    form?.addEventListener("submit", event => {
      event.preventDefault();
      submitLogin();
    });
    loginButton?.addEventListener("click", event => {
      event.preventDefault();
      submitLogin();
    });
    createButton?.addEventListener("click", event => {
      event.preventDefault();
      submitCreate();
    });
    guestButton?.addEventListener("click", event => {
      event.preventDefault();
      submitGuest();
    });
    forgotButton?.addEventListener("click", event => {
      event.preventDefault();
      setStatus("Recuperacao de senha sera adicionada em uma proxima versao.");
    });

    if (isAuthenticated()) {
      screen.classList.add("hidden");
      setAuthLocked(false);
    } else {
      screen.classList.remove("hidden");
      setAuthLocked(true);
      setMode("login");
    }
  }

  window.PiratesAuth = {
    prepareInitialSave,
    initLoginScreen,
    createAccount,
    login,
    logout,
    startGuest,
    isAuthenticated,
    isGuest: isGuestMode,
    getCurrentUser,
    updateEmail,
    saveCurrentGame,
    flushCurrentGameSave,
    deleteCurrentSave,
    getServerAuthContext
  };
})();
