(() => {
  "use strict";

  const SAVE_KEY = "pirates-of-the-abyss-save-v1";
  const USERS_KEY = "pirates-of-the-abyss-auth-users-v1";
  const SESSION_KEY = "pirates-of-the-abyss-auth-session-v1";
  const LEGACY_BACKUP_PREFIX = "pirates-of-the-abyss-legacy-save-backup-v1:";
  const PBKDF2_ITERATIONS = 150000;
  const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
  const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000;
  const MIN_USERNAME_LENGTH = 3;
  const MAX_USERNAME_LENGTH = 24;
  const MIN_PASSWORD_LENGTH = 4;

  let currentUser = null;
  let currentSession = null;

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

  function sameSave(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
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

  function decorateSave(save, user) {
    return {
      ...cloneData(save || {}),
      _authUserId: user.id,
      _authUsername: user.username,
      _saveUpdatedAt: Date.now()
    };
  }

  function shouldKeepExistingSave(nextSave, existingSave) {
    if (!existingSave || !isMeaningfulSave(existingSave)) return false;
    const nextScore = getSaveScore(nextSave);
    const existingScore = getSaveScore(existingSave);
    return existingScore >= 8 && nextScore <= 1;
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

  function deleteCurrentSave() {
    if (!currentUser) return;
    const local = getLocalStorage();
    if (!local) return;
    storageRemove(local, getUserSaveKey(currentUser));
  }

  function prepareUserSaveForLoad(user) {
    const local = getLocalStorage();
    if (!local || !user) return null;

    const legacySave = readLocalSave(SAVE_KEY);
    const userSave = readLocalSave(getUserSaveKey(user));
    const legacyIsForeign = legacySave?._authUserId && legacySave._authUserId !== user.id;

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

    if (legacyIsForeign) {
      backupLegacySave(legacySave, "foreign-user-save");
      storageRemove(local, SAVE_KEY);
    } else if (userSave) {
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
      setAuthLocked(true);
      return { authenticated: false, user: null };
    }
    prepareUserSaveForLoad(user);
    setAuthLocked(false);
    return { authenticated: true, user: { id: user.id, username: user.username } };
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
    prepareUserSaveForLoad(currentUser || user);
    return { ok: true, user: { id, username: cleanUsername } };
  }

  async function login({ username, password, remember = false } = {}) {
    const cleanKey = usernameKey(username);
    const users = loadUsers();
    const userId = users.usersByName[cleanKey];
    const user = userId ? users.users[userId] : null;
    if (!user) throw new Error("Usuario nao encontrado.");
    const stored = user.password || {};
    const passwordHash = await hashPassword(String(password || ""), stored.salt, stored.iterations || PBKDF2_ITERATIONS);
    if (!timingSafeEqual(passwordHash, stored.hash || "")) throw new Error("Senha incorreta.");
    writeSession(user, remember);
    prepareUserSaveForLoad(currentUser || user);
    return { ok: true, user: { id: user.id, username: user.username } };
  }

  function logout(options = {}) {
    clearSession();
    currentUser = null;
    if (options.clearActiveSave) {
      const local = getLocalStorage();
      if (local) storageRemove(local, SAVE_KEY);
    }
    setAuthLocked(true);
  }

  function saveCurrentGame(saveState) {
    if (!currentUser) return false;
    return saveUserSave(currentUser, saveState);
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
    return { id: stored.id, username: stored.username, email: stored.email };
  }

  function isAuthenticated() {
    return Boolean(getCurrentUser());
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
    const forgotButton = screen.querySelector("[data-auth-forgot]");
    const status = screen.querySelector("[data-auth-status]");
    let mode = "login";
    let pending = false;

    ["keydown", "keyup", "keypress", "input", "pointerdown", "touchstart"].forEach(type => {
      screen.addEventListener(type, event => event.stopPropagation(), true);
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
      [usernameInput, passwordInput, emailInput, rememberInput, loginButton, createButton, forgotButton].forEach(item => {
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
    isAuthenticated,
    getCurrentUser,
    updateEmail,
    saveCurrentGame,
    deleteCurrentSave
  };
})();
