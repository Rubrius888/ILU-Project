/* Additional archival. Credentials use a separate localStorage record, never backup JSON or IndexedDB. */
(() => {
  'use strict';
  const CLIENT = '6220226b8e0841189bd74e243476d93a';
  const REDIRECT = 'https://oauth.yandex.ru/verification_code';
  // The working pilot allows exactly one destination and keeps the earlier test queue isolated.
  const ROOT = 'vd:Riy12Ntnw6jCXg:disk:/Архив ILU/Сборка';
  const API = 'https://cloud-api.yandex.net/v1/disk/virtual-disks/resources';
  const DEPARTMENT = 'Сборка';
  const UNAVAILABLE = 'Облачное архивирование для данного департамента пока не подключено';
  function enabled() {
    if (typeof filterState !== 'undefined' && filterState?.department === DEPARTMENT) return true;
    status(UNAVAILABLE);
    return false;
  }
  const DELAY = 45000;
  const AUTH_KEY = 'ilu-yandex-auth-v1';
  const EXPIRED = 'Срок действия авторизации истёк. Подключите Яндекс повторно';
  const byId = id => document.getElementById(id);
  let database, token = '', expires = 0, verifier = '', capturing = false;
  let captureScheduled = false, serial = Promise.resolve(), timer, sending = false, epoch = 0, forceRequested = false;
  const requests = new Set();
  let account = 'не подключён';
  let authReady = false, restoring = false, authTimer, storageWarning = '', authNotice = null;
  let connectionWarning = 'disconnected', bannerScheduled = false, bannerRevision = 0;
  // UI-only notifications. No credentials, JSON snapshots or queue changes are sent between tabs.
  let warningChannel;
  try {
    warningChannel = new BroadcastChannel('ilu-cloud-assembly-warning-v1');
    warningChannel.onmessage = event => {
      if (event.data?.type === 'queue') refreshBanner();
      else if (event.data?.type === 'connection' && [null, 'disconnected', 'lost', 'authorization', 'forbidden'].includes(event.data.kind)) {
        connectionWarning = event.data.kind; refreshBanner();
      }
    };
  } catch (_) { /* The current tab still works without cross-tab notifications. */ }
  function announce(message) { try { warningChannel?.postMessage(message); } catch (_) {} }
  function connectionState(kind) {
    connectionWarning = kind; refreshBanner();
    announce({ type: 'connection', kind });
  }
  function refreshBanner() {
    bannerRevision++;
    if (bannerScheduled) return;
    bannerScheduled = true;
    queueMicrotask(async () => {
      bannerScheduled = false;
      const revision = bannerRevision;
      const banner = byId('cloudConnectionBanner'); if (!banner) return;
      // Connection state is independent of pending backups. Another tab's success
      // cannot make this tab look connected when it has no authorization of its own.
      const kind = token && Date.now() >= expires ? 'authorization'
        : !token && connectionWarning !== 'authorization' ? 'disconnected' : connectionWarning;
      if (!kind || typeof filterState === 'undefined' || filterState?.department !== DEPARTMENT) { banner.hidden = true; return; }
      banner.hidden = false;
      banner.dataset.kind = kind;
      byId('cloudConnectionTitle').textContent = ({
        disconnected: 'ЯНДЕКС ДИСК НЕ ПОДКЛЮЧЁН',
        lost: 'ОБЛАЧНОЕ СОЕДИНЕНИЕ ПОТЕРЯНО',
        authorization: 'ТРЕБУЕТСЯ ПОВТОРНАЯ АВТОРИЗАЦИЯ',
        forbidden: 'НЕТ ДОСТУПА К ОБЛАЧНОМУ ХРАНИЛИЩУ'
      })[kind];
      const line = byId('cloudConnectionCount');
      try {
        const db = await database;
        const count = await new Promise((resolve, reject) => {
          const tx = db.transaction('queue', 'readonly');
          const req = tx.objectStore('queue').get('state'); let value = 0;
          req.onsuccess = () => { value = Number(Boolean(req.result?.pending)) + Number(Boolean(req.result?.inflight)); };
          tx.oncomplete = () => resolve(value);
          tx.onabort = tx.onerror = () => reject(new Error('Queue read failed'));
        });
        if (revision !== bannerRevision) return;
        line.hidden = count === 0;
        line.textContent = count ? count + ' ' + (count === 1 ? 'резервная копия ожидает' : 'резервные копии ожидают') + ' отправки' : '';
      } catch (_) { if (revision === bannerRevision) line.hidden = true; } // A queue read failure must not hide a connection warning.
    });
  }

  class CloudError extends Error {
    constructor(message, status = 0, retryAfter = 0) {
      super(message); this.status = status; this.retryAfter = retryAfter;
    }
  }
  const empty = () => ({ pending: null, inflight: null, receipts: {}, lastSuccess: null });
  const canonical = value => JSON.stringify(sort(value));
  function sort(value) {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
    return value;
  }
  const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  async function fingerprint(backup) {
    const { exportedAt, ...content } = backup;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(content)));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function status(message, error = '') {
    if (restoring && !error) message = 'Восстанавливаем подключение...';
    else if (!authReady && authNotice) ({ message, error } = authNotice);
    byId('cloudStatus').textContent = message;
    byId('cloudError').textContent = error;
    byId('cloudAccount').textContent = account;
    refreshBanner();
  }
  function persistAuth() {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ access_token: token, expires_at: expires, account }));
      storageWarning = '';
    } catch (_) { storageWarning = 'Не удалось сохранить авторизацию. В этой вкладке подключение работает, но после перезапуска потребуется вход.'; }
  }
  function clearAuth(message = EXPIRED, remove = true) {
    if (message === EXPIRED) connectionState('authorization');
    else if (remove) connectionState('disconnected');
    epoch++; token = ''; expires = 0; verifier = ''; account = 'не подключён'; authReady = false; restoring = false;
    clearTimeout(timer); clearTimeout(authTimer);
    for (const request of requests) request.abort();
    let error = '';
    if (remove) try { localStorage.removeItem(AUTH_KEY); } catch (_) { error = 'Не удалось удалить сохранённую авторизацию. Очистите её в данных браузера перед следующим запуском.'; }
    byId('cloudCode').value = ''; byId('cloudCodeLabel').hidden = true;
    authNotice = { message, error }; status(message, error);
  }
  async function checkAccount() {
    const session = epoch;
    clearTimeout(authTimer); authNotice = null;
    restoring = true; authReady = false; status('Восстанавливаем подключение...');
    try {
      const info = await network('https://cloud-api.yandex.net/v1/disk/');
      if (!info.ok) throw new CloudError('Проверка аккаунта: HTTP ' + info.status, info.status);
      const disk = await info.json(); if (session !== epoch) return;
      account = disk.user?.login || disk.user?.display_name || account;
      persistAuth();
      await update(state => { if (state.inflight) state.inflight.retryAt = 0; });
      if (session !== epoch) return;
      authReady = true; restoring = false;
      status('Яндекс Диск подключён', storageWarning); schedule();
    } catch (error) {
      if (session !== epoch) return;
      restoring = false;
      if (error.status === 403) {
        authNotice = { message: 'Нет необходимых прав доступа к Яндекс Диску', error: 'HTTP 403. Авторизация сохранена; проверьте права аккаунта.' };
        status(authNotice.message, authNotice.error);
      }
      else {
        authNotice = { message: 'Не удалось подтвердить подключение · авторизация сохранена', error: error.message };
        status(authNotice.message, authNotice.error);
        if (!error.status || error.status === 429 || error.status >= 500) {
          clearTimeout(authTimer); authTimer = setTimeout(() => { checkAccount().catch(fail); }, 10000);
        }
      }
    }
  }
  async function restoreAuth() {
    if (!enabled()) return;
    let saved;
    try {
      const raw = localStorage.getItem(AUTH_KEY); if (!raw) return;
      saved = JSON.parse(raw);
      if (typeof saved.access_token !== 'string' || !saved.access_token || typeof saved.expires_at !== 'number' || !Number.isFinite(saved.expires_at)) throw new Error();
    } catch (_) { clearAuth('Сохранённая авторизация недоступна. Подключите Яндекс повторно'); return; }
    if (saved.expires_at <= Date.now()) { clearAuth(); return; }
    token = saved.access_token; expires = saved.expires_at;
    account = typeof saved.account === 'string' ? saved.account : 'подключение проверяется';
    await checkAccount();
  }
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('ilu-cloud-backup-assembly-v1', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('queue');
      req.onerror = () => reject(new Error('Недоступно хранилище облачной очереди. Локальное сохранение работает.'));
      req.onsuccess = () => resolve(req.result);
    });
  }
  // Read/modify/write in one transaction: pending snapshots cannot erase another tab's claim.
  async function update(change) {
    const db = await database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      const req = store.get('state'); let result;
      req.onsuccess = () => {
        try {
          const state = req.result || empty(); result = change(state);
          store.put(state, 'state');
        } catch (_) { tx.abort(); }
      };
      tx.oncomplete = () => { resolve(result); refreshBanner(); announce({ type: 'queue' }); };
      tx.onabort = tx.onerror = () => reject(new Error('Не удалось сохранить облачную очередь. Локальная база не затронута.'));
    });
  }
  function fail(error) { status('Ошибка архивирования', error.message); }
  function prepare(backup, text, name) {
    const department = backup.state?.filters?.department;
    if (department !== DEPARTMENT) throw new Error(UNAVAILABLE);
    if (!name.endsWith('.json') || /[\\/]/.test(name)) throw new Error('Недопустимое имя резервной копии.');
    if (Array.from(name.slice(0, -5)).length + 42 > 255) throw new Error('Полное имя с уникальным суффиксом превышает лимит облачного файла. Локальная копия доступна.');
    if (canonical(JSON.parse(text)) !== canonical(backup)) throw new Error('JSON-снимок не соответствует резервной копии.');
    return { department, text, name };
  }
  function offer(backup, text, name) {
    // An explicit local export already captured this save; do not replace its bytes with
    // a later exportedAt from the saveState notification queued by createApplicationBackup.
    if (!capturing) captureScheduled = false;
    // Clone immediately: callers may edit the matrix before asynchronous hashing ends.
    let snapshot;
    try { snapshot = prepare(backup, text, name); } catch (error) { if (error.message === UNAVAILABLE) status(UNAVAILABLE); else fail(error); return; }
    const immutable = JSON.parse(text);
    serial = serial.then(async () => {
      const hash = await fingerprint(immutable);
      const result = await update(state => {
        // A newer return to an already archived state cancels obsolete unsent edits.
        if (!state.inflight && state.lastSuccess?.hash === hash) { state.pending = null; return 'archived'; }
        if (state.inflight?.hash === hash) { state.pending = null; return 'inflight'; }
        if (state.pending?.hash === hash) {
          // Keep the bytes of an explicit local export too, without restarting debounce for unchanged data.
          state.pending.text = snapshot.text; state.pending.name = snapshot.name;
          state.pending.path = ROOT + '/' + snapshot.name.slice(0, -5) + '_' + state.pending.id + '.json';
          return 'pending';
        }
        const id = crypto.randomUUID();
        const filename = snapshot.name.slice(0, -5) + '_' + id + '.json';
        state.pending = { ...snapshot, hash, id, path: ROOT + '/' + filename,
          due: Date.now() + DELAY, retryAt: 0, attempts: 0 };
        return 'pending';
      });
      byId('cloudDepartment').textContent = snapshot.department;
      status(result === 'archived' ? 'Успешно архивировано · содержимое не изменилось'
        : token ? 'Ожидание отправки · 45 секунд после изменения' : 'Ожидание отправки · подключите Яндекс Диск');
      schedule();
    }).catch(fail);
  }
  function capture() {
    if (capturing) return;
    capturing = true;
    try {
      if (typeof createApplicationBackup !== 'function') return;
      const backup = createApplicationBackup();
      if (!backup.state?.posts?.length || !backup.state?.operators?.length) return;
      const text = JSON.stringify(backup, null, 2);
      offer(backup, text, getBackupFileName(backup, { reserve: false }));
    } catch (error) { fail(error); }
    finally { capturing = false; }
  }
  function notifySaved() {
    if (capturing || captureScheduled || !enabled()) return;
    captureScheduled = true;
    queueMicrotask(() => { if (!captureScheduled) return; captureScheduled = false; capture(); });
  }
  function schedule(wait = 1000) {
    clearTimeout(timer);
    timer = setTimeout(() => { pump().catch(fail); }, Math.max(200, wait));
  }
  async function network(url, options = {}, authenticated = true) {
    if (authenticated && (!token || Date.now() >= expires)) {
      clearAuth(); throw new CloudError(EXPIRED, 401);
    }
    const session = epoch;
    const controller = new AbortController(); requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { ...options, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { ...(authenticated ? { Authorization: 'OAuth ' + token } : {}), ...options.headers }, signal: controller.signal });
      if (authenticated && response.status === 401 && session === epoch) clearAuth();
      if (session === epoch && !url.startsWith('https://oauth.yandex.ru/')) {
        if (response.status === 403) connectionState('forbidden');
        else if (response.status === 401) connectionState('authorization');
        else if (response.status >= 500) connectionState('lost');
        else if (response.ok) connectionState(null);
      }
      return response;
    } catch (_) {
      if (session === epoch && !url.startsWith('https://oauth.yandex.ru/')) connectionState('lost');
      throw new CloudError('Сеть, CORS или тайм-аут: отправка отложена, очередь сохранена.');
    }
    finally { clearTimeout(timeout); requests.delete(controller); }
  }
  async function api(suffix, params, method = 'GET') {
    const response = await network(API + suffix + '?' + new URLSearchParams(params), { method });
    if (!response.ok) throw new CloudError('Яндекс Диск: HTTP ' + response.status,
      response.status, Math.max(0, Number(response.headers.get('Retry-After')) || 0) * 1000);
    return response.status === 204 ? null : response.json();
  }
  function linkAddress(link, method) {
    if (link?.method !== method || link.templated) throw new CloudError('Неподдерживаемая ссылка передачи Яндекса.', 400);
    const url = new URL(link.href);
    if (url.protocol !== 'https:' || url.username || url.password || !['yandex.net', 'yandex.ru', 'yandex.com'].some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) {
      throw new CloudError('Адрес передачи не принадлежит HTTPS-домену Яндекса.', 400);
    }
    return url.href;
  }
  async function verify(item) {
    const link = await api('/download', { path: item.path });
    const response = await network(linkAddress(link, 'GET'), {}, false);
    if (!response.ok) throw new CloudError('Проверка скачиванием: HTTP ' + response.status, response.status);
    const actual = new Uint8Array(await response.arrayBuffer());
    const expected = new TextEncoder().encode(item.text);
    return actual.length === expected.length && actual.every((byte, i) => byte === expected[i]);
  }
  async function upload(item) {
    const prefix = ROOT + '/';
    const filename = item.path.slice(prefix.length);
    if (item.department !== DEPARTMENT || !item.path.startsWith(prefix) || !filename.endsWith('.json') || /[\\/]/.test(filename)) {
      throw new CloudError('Заблокирован путь вне рабочего архива Сборки.', 400);
    }
    const folder = await api('', { path: ROOT });
    if (folder.type !== 'dir') throw new CloudError('Рабочая папка Сборки недоступна.', 404);
    // Reconcile a previous upload whose success response was lost, before attempting a write.
    try {
      const existing = await api('', { path: item.path });
      if (existing.type === 'file' && await verify(item)) return;
      throw new CloudError('Коллизия имени: существующий файл не будет перезаписан.', 409);
    } catch (error) { if (error.status !== 404) throw error; }
    const link = await api('/upload', { path: item.path, overwrite: false });
    const response = await network(linkAddress(link, 'PUT'), { method: 'PUT', body: new TextEncoder().encode(item.text),
      headers: { 'Content-Type': 'application/json' } }, false);
    if (!response.ok) throw new CloudError('Загрузка JSON: HTTP ' + response.status, response.status);
    if (!await verify(item)) throw new CloudError('Побайтовая проверка не пройдена. Успех не подтверждён.', 422);
  }
  async function pump(force = false) {
    if (!enabled()) return;
    if (force) forceRequested = true;
    if (!token || !authReady) return;
    if (sending) { schedule(500); return; }
    if (!navigator.locks) { status('Отправка приостановлена', 'Браузер не поддерживает блокировку параллельных отправок.'); return; }
    await navigator.locks.request('ilu-cloud-backup-assembly-send', { ifAvailable: true }, async lock => {
      if (!lock) { schedule(5000); return; }
      sending = true;
      const forceNow = forceRequested; forceRequested = false;
      let item; const session = epoch;
      try {
        item = await update(state => {
          if (!state.inflight && state.pending && (forceNow || state.pending.due <= Date.now())) {
            state.inflight = state.pending; state.pending = null;
          }
          return state.inflight && (forceNow || state.inflight.retryAt <= Date.now()) ? state.inflight : null;
        });
        if (!item) { schedule(1000); return; }
        status('Отправка · рабочий архив Сборки');
        await upload(item);
        await update(state => {
          state.receipts[item.hash] = { hash: item.hash, path: item.path, at: new Date().toISOString() };
          state.lastSuccess = state.receipts[item.hash];
          if (state.inflight?.id === item.id) state.inflight = null;
        });
        byId('cloudLastSuccess').textContent = new Date().toLocaleString();
        status('Успешно архивировано · побайтовая проверка пройдена');
        schedule(1000);
      } catch (error) {
        if (item) await update(state => {
          if (state.inflight?.id !== item.id) return;
          state.inflight.attempts++;
          if (error.status === 409) {
            state.inflight.path = ROOT + '/' + item.name.slice(0, -5) + '_' + crypto.randomUUID() + '.json';
          }
          const temporary = !error.status || error.status === 409 || error.status === 429 || error.status >= 500;
          state.inflight.retryAt = temporary ? Date.now() + Math.max(error.retryAfter || 0,
            Math.min(300000, 5000 * 2 ** Math.min(state.inflight.attempts, 6))) : Number.MAX_SAFE_INTEGER;
          state.inflight.error = error.message;
        });
        if (error.status === 401 && session === epoch) clearAuth();
        if (session === epoch) fail(error);
        if (!error.status || error.status === 409 || error.status === 429 || error.status >= 500) schedule(10000);
      } finally { sending = false; if (forceRequested) schedule(200); }
    });
  }
  async function connect() {
    if (!enabled()) return;
    epoch++; authReady = false; restoring = false;
    clearTimeout(authTimer); clearTimeout(timer);
    for (const request of requests) request.abort();
    authNotice = null;
    const popup = window.open('about:blank', '_blank');
    if (!popup) { status('Не подключено', 'Разрешите открытие окна OAuth для ILU.'); return; }
    try {
      popup.opener = null;
      verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = b64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      popup.location.href = 'https://oauth.yandex.ru/authorize?' + new URLSearchParams({ response_type: 'code',
        client_id: CLIENT, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256',
        state: b64(crypto.getRandomValues(new Uint8Array(24))) });
      byId('cloudCodeLabel').hidden = false;
      status('Введите одноразовый код с официальной страницы Яндекса');
    } catch (_) { popup.close(); status('Не подключено', 'Не удалось подготовить PKCE.'); }
  }
  async function authorize() {
    if (!enabled()) return;
    const code = byId('cloudCode').value.trim();
    if (!code || !verifier) return;
    byId('cloudAuthorize').disabled = true;
    const session = epoch;
    try {
      const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: CLIENT, code_verifier: verifier });
      byId('cloudCode').value = '';
      const response = await network('https://oauth.yandex.ru/token', { method: 'POST', body }, false);
      if (!response.ok) throw new Error('OAuth: HTTP ' + response.status + '. Получите новый одноразовый код.');
      let data;
      try { data = await response.json(); } catch (_) { throw new Error('OAuth вернул некорректный JSON. Подключите Яндекс повторно.'); }
      if (session !== epoch) return;
      if (!data.access_token || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) throw new Error('OAuth не вернул действующий токен со сроком действия.');
      token = data.access_token; expires = Date.now() + Number(data.expires_in) * 1000; verifier = '';
      authReady = false; account = 'подключение проверяется'; persistAuth();
      // Only non-secret metadata is displayed. Neither refresh token nor OAuth response is persisted.
      const details = byId('cloudAuthDetails');
      if (details) details.textContent = 'Ответ OAuth: expires_in = ' + Number(data.expires_in) + ' с; refresh_token: ' +
        (typeof data.refresh_token === 'string' && data.refresh_token ? 'поле присутствует (не сохраняется)' : 'поле отсутствует');
      byId('cloudCodeLabel').hidden = true;
      await checkAccount();
    } catch (error) { if (session === epoch) fail(error); }
    finally { byId('cloudAuthorize').disabled = false; }
  }
  function disconnect() {
    clearAuth('Отключено · очередь сохранена');
    if (!byId('cloudError').textContent) byId('cloudError').textContent = 'Токен удалён из памяти и LocalStorage. Разрешение на стороне Яндекса не отозвано.';
  }
  window.cloudBackup = Object.freeze({ notifySaved, offer });
  database = openDb();
  database.then(async () => {
    const last = await update(state => state.lastSuccess);
    if (last) byId('cloudLastSuccess').textContent = new Date(last.at).toLocaleString();
    if (enabled()) status('Ожидание отправки · подключите Яндекс Диск');
    // Do not create or overwrite a blank or corrupt production database on startup.
    if (localStorage.getItem('ilu-se4-state-v1')) notifySaved();
    await restoreAuth();
  }).catch(fail);
  byId('cloudConnect').onclick = () => { connect().catch(fail); };
  byId('cloudAuthorize').onclick = () => { authorize().catch(fail); };
  byId('cloudDisconnect').onclick = disconnect;
  byId('cloudRetry').onclick = () => {
    serial.then(() => {
      if (!enabled()) return;
      if (!token) { status('Ожидание отправки · подключите Яндекс Диск'); return; }
      if (!authReady) return checkAccount();
      return pump(true);
    }).catch(fail);
  };
  window.addEventListener('online', () => { if (token && !authReady) checkAccount().catch(fail); else schedule(); });
  window.addEventListener('storage', event => {
    if (event.key !== AUTH_KEY && event.key !== null) return;
    clearAuth('Проверка изменения авторизации в другой вкладке', false);
    restoreAuth().catch(fail);
  });
  window.addEventListener('focus', refreshBanner);
})();
