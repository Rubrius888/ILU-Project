/*
 * Резервная копия всей базы приложения.
 *
 * Формат файла намеренно отличается от внутреннего localStorage:
 * файл можно перенести на другой компьютер и проверить до импорта.
 */

const BACKUP_FORMAT = 'ilu-se4-backup';
const BACKUP_VERSION = 1;

function getApplicationStorageKeys() {
  return {
    state: typeof STORAGE_KEY === 'string'
      ? STORAGE_KEY
      : 'ilu-se4-state-v1',
    plans: typeof PLANS_STORAGE_KEY === 'string'
      ? PLANS_STORAGE_KEY
      : 'ilu-se4-plans-v1'
  };
}

function parseStoredValue(raw, name) {
  if (!raw) {
    throw new Error(`В localStorage отсутствуют данные: ${name}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Повреждены данные: ${name}`);
  }
}

function validateApplicationState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Основное состояние имеет неверный формат');
  }

  const requiredArrays = [
    'posts',
    'operators',
    'difficulty',
    'ergonomics',
    'trainingDays',
    'attendanceData',
    'operatorAttendance',
    'operatorRoles',
    'data',
    'trainingRecords',
    'placementLog'
  ];

  requiredArrays.forEach(key => {
    if (!Array.isArray(state[key])) {
      throw new Error(`В состоянии отсутствует массив: ${key}`);
    }
  });

  const postCount = state.posts.length;
  const operatorCount = state.operators.length;

  if (
    state.difficulty.length !== postCount ||
    state.ergonomics.length !== postCount ||
    state.trainingDays.length !== postCount ||
    state.operatorAttendance.length !== operatorCount ||
    state.operatorRoles.length !== operatorCount
  ) {
    throw new Error('Размеры массивов постов и операторов не совпадают');
  }

  ['data', 'attendanceData'].forEach(key => {
    if (
      state[key].length !== postCount ||
      state[key].some(row =>
        !Array.isArray(row) || row.length !== operatorCount
      )
    ) {
      throw new Error(`Некорректный размер матрицы: ${key}`);
    }
  });

  if (
    state.placementFilters !== undefined &&
    (
      !state.placementFilters ||
      typeof state.placementFilters !== 'object' ||
      !Array.isArray(state.placementFilters.operators) ||
      !Array.isArray(state.placementFilters.posts)
    )
  ) {
    throw new Error('Некорректные фильтры журнала расстановки');
  }

  if (
    state.placementSort !== undefined &&
    (
      !state.placementSort ||
      typeof state.placementSort !== 'object' ||
      typeof state.placementSort.key !== 'string' ||
      !['asc', 'desc'].includes(state.placementSort.direction)
    )
  ) {
    throw new Error('Некорректная сортировка журнала расстановки');
  }
}

function normalizePlans(plans) {
  if (!plans || typeof plans !== 'object' || Array.isArray(plans)) {
    throw new Error('Планы имеют неверный формат');
  }

  return {
    development: plans.development || null,
    rotation: plans.rotation || null
  };
}

function createApplicationBackup() {
  const memoryStatsHistory = typeof statsHistory !== 'undefined' && Array.isArray(statsHistory)
    ? JSON.parse(JSON.stringify(statsHistory))
    : null;
  // Перед экспортом принудительно записываем последние изменения.
  if (typeof saveState === 'function' && !saveState()) {
    throw new Error('Не удалось сохранить текущее состояние');
  }

  if (typeof savePlans === 'function') {
    savePlans();
  }

  const keys = getApplicationStorageKeys();
  const state = parseStoredValue(
    localStorage.getItem(keys.state),
    'матрица'
  );
  const plansRaw = localStorage.getItem(keys.plans);
  const plans = plansRaw
    ? parseStoredValue(plansRaw, 'планы')
    : { development: null, rotation: null };

  validateApplicationState(state);
  if (memoryStatsHistory !== null &&
      JSON.stringify(state.statsHistory || []) !== JSON.stringify(memoryStatsHistory)) {
    throw new Error('История статистики не попала в резервную копию');
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'ILU SE-4 90',
    exportedAt: new Date().toISOString(),
    state,
    plans: normalizePlans(plans)
  };
}

function getBackupFileName(prefix = 'ilu-se4-backup') {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('-') + '_' + [
    pad(now.getHours()),
    pad(now.getMinutes())
  ].join('-');

  return `${prefix}-${stamp}.json`;
}

function downloadBackup(backup, prefix) {
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json;charset=utf-8' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getBackupFileName(prefix);
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportApplicationBackup(options = {}) {
  try {
    const backup = createApplicationBackup();

    downloadBackup(
      backup,
      options.prefix || 'ilu-se4-backup'
    );

    alert('Резервная копия базы сохранена в загрузки браузера.');
  } catch (error) {
    console.error('Ошибка экспорта базы:', error);
    alert(`Не удалось сохранить базу: ${error.message}`);
  }
}

const BACKUP_DIRECTORY_DB = 'ilu-backup-settings';
const BACKUP_DIRECTORY_STORE = 'handles';
const LAST_FOLDER_BACKUP_KEY = 'ilu-last-folder-backup-at';
const BACKUP_REMINDER_DEFERRED_KEY = 'ilu-backup-reminder-deferred-on';

function openBackupDirectoryDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DIRECTORY_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(BACKUP_DIRECTORY_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setBackupDirectoryHandle(handle) {
  const db = await openBackupDirectoryDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(BACKUP_DIRECTORY_STORE, 'readwrite')
      .objectStore(BACKUP_DIRECTORY_STORE).put(handle, 'directory');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function getBackupDirectoryHandle() {
  const db = await openBackupDirectoryDb();
  const handle = await new Promise((resolve, reject) => {
    const request = db.transaction(BACKUP_DIRECTORY_STORE).objectStore(BACKUP_DIRECTORY_STORE).get('directory');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

async function chooseBackupDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') {
    alert('Выбор локальной папки не поддерживается этим браузером. Используйте обычное скачивание JSON.');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await setBackupDirectoryHandle(handle);
    alert('Папка резервных копий выбрана.');
  } catch (error) {
    if (error.name !== 'AbortError') alert(`Не удалось выбрать папку: ${error.message}`);
  }
}

async function saveBackupToDirectory(options = {}) {
  try {
    if (typeof window.showDirectoryPicker !== 'function') throw new Error('File System Access API недоступен');
    let directory = await getBackupDirectoryHandle();
    if (!directory) {
      if (!options.allowChoose) {
        alert('Сначала выберите папку резервных копий.');
        return false;
      }
      await chooseBackupDirectory();
      directory = await getBackupDirectoryHandle();
      if (!directory) return false;
    }
    let permission = await directory.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      permission = await directory.requestPermission({ mode: 'readwrite' });
    }
    if (permission !== 'granted') throw new Error('Доступ к выбранной папке не предоставлен');
    const backup = createApplicationBackup();
    const baseName = getBackupFileName('ilu-se4-backup');
    const dot = baseName.lastIndexOf('.');
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : '.json';
    let fileName = baseName;
    let suffix = 1;
    while (true) {
      try {
        await directory.getFileHandle(fileName, { create: false });
        fileName = `${stem}-${suffix++}${ext}`;
      } catch (error) {
        if (error.name === 'NotFoundError') break;
        throw error;
      }
    }
    const file = await directory.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable({ keepExistingData: false });
    await writable.write(JSON.stringify(backup, null, 2));
    await writable.close();
    localStorage.setItem(LAST_FOLDER_BACKUP_KEY, new Date().toISOString());
    if (!options.silent) alert('Резервная копия сохранена в выбранную папку.');
    return true;
  } catch (error) {
    console.error('Ошибка записи резервной копии в папку:', error);
    if (!options.silent) alert(`Не удалось сохранить в выбранную папку: ${error.message}. Обычное скачивание JSON доступно.`);
    return false;
  }
}

function showBackupReminder() {
  if (document.querySelector('[data-backup-reminder]')) return;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(BACKUP_REMINDER_DEFERRED_KEY) === today) return;
  const last = localStorage.getItem(LAST_FOLDER_BACKUP_KEY);
  const overdue = !last || Date.now() - Date.parse(last) >= 72 * 60 * 60 * 1000;
  if (!overdue) return;
  const overlay = document.createElement('div');
  overlay.dataset.backupReminder = 'true';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;padding:16px;';
  const modal = document.createElement('div');
  modal.style.cssText = 'max-width:430px;background:#fff;border-radius:12px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.25);font-size:14px;color:#0f172a;';
  const text = document.createElement('div');
  text.textContent = last ? 'Вы не сохраняли резервную копию базы более 3 дней. Рекомендуем сохранить актуальную базу в выбранную папку Яндекс Диска' : 'Резервная копия базы ещё не создавалась';
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;';
  const save = document.createElement('button');
  save.className = 'btn-small'; save.textContent = 'Сохранить в папку';
  save.onclick = async () => { save.disabled = true; if (await saveBackupToDirectory({ silent: true, allowChoose: true })) overlay.remove(); else save.disabled = false; };
  const later = document.createElement('button');
  later.className = 'btn-small'; later.textContent = 'Напомнить позже';
  later.onclick = () => { localStorage.setItem(BACKUP_REMINDER_DEFERRED_KEY, today); overlay.remove(); };
  actions.append(save, later); modal.append(text, actions); overlay.append(modal); document.body.append(overlay);
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error('Файл не является корректным JSON'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Не удалось прочитать файл резервной копии'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Файл резервной копии пустой или повреждён');
  }

  if (backup.format !== BACKUP_FORMAT) {
    throw new Error('Это не резервная копия ILU');
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(
      `Неподдерживаемая версия резервной копии: ${backup.version}`
    );
  }

  validateApplicationState(backup.state);
  normalizePlans(backup.plans || {});
}

async function importApplicationBackup(event) {
  const input = event?.target;
  const file = input?.files?.[0];

  if (!file) {
    return;
  }

  try {
    const backup = await readBackupFile(file);
    validateBackup(backup);

    if (!Array.isArray(backup.state.statsHistory)) {
      const proceedWithoutHistory = confirm(
        'В этой резервной копии отсутствует история статистики. ' +
        'Импорт может удалить накопленные снимки. Продолжить?'
      );
      if (!proceedWithoutHistory) return;
    }

    const confirmed = confirm(
      'Импорт заменит текущую матрицу, журналы и планы. ' +
      'Продолжить?'
    );

    if (!confirmed) {
      return;
    }

    // Перед заменой автоматически скачиваем текущую версию.
    try {
      downloadBackup(
        createApplicationBackup(),
        'ilu-se4-before-import'
      );
    } catch (error) {
      console.warn('Не удалось создать копию перед импортом:', error);
    }

    const keys = getApplicationStorageKeys();

    localStorage.setItem(
      keys.state,
      JSON.stringify(backup.state)
    );
    localStorage.setItem(
      keys.plans,
      JSON.stringify(normalizePlans(backup.plans || {}))
    );

    alert('База успешно загружена. Приложение будет перезапущено.');
    location.reload();
  } catch (error) {
    console.error('Ошибка импорта базы:', error);
    alert(`Не удалось загрузить базу: ${error.message}`);
  } finally {
    if (input) {
      input.value = '';
    }
  }
}

window.exportApplicationBackup = exportApplicationBackup;
window.importApplicationBackup = importApplicationBackup;
window.chooseBackupDirectory = chooseBackupDirectory;
window.saveBackupToDirectory = saveBackupToDirectory;
setTimeout(showBackupReminder, 0);
