const BACKUP_FORMAT = 'ilu-se4-backup';
const BACKUP_VERSION = 1;

const STATE_KEY = 'ilu-se4-state-v1';
const PLANS_KEY = 'ilu-se4-plans-v1';

function validateState(state) {
  if (!state || typeof state !== 'object') {
    throw new Error('Основное состояние имеет неверный формат');
  }

  const arrays = [
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

  arrays.forEach(key => {
    if (!Array.isArray(state[key])) {
      throw new Error(`Отсутствует массив: ${key}`);
    }
  });

  // Поле появилось в новой версии приложения, поэтому старые резервные
  // копии без истории статистики остаются совместимыми.
  if (
    state.statsHistory !== undefined &&
    !Array.isArray(state.statsHistory)
  ) {
    throw new Error('Некорректная история статистики');
  }

  const postCount = state.posts.length;
  const operatorCount = state.operators.length;

  if (
    state.difficulty.length !== postCount ||
    state.ergonomics.length !== postCount ||
    state.trainingDays.length !== postCount ||
    state.operatorAttendance.length !== operatorCount ||
    state.operatorRoles.length !== operatorCount
  ) {
    throw new Error('Размеры массивов не совпадают');
  }

  ['data', 'attendanceData'].forEach(key => {
    if (
      state[key].length !== postCount ||
      state[key].some(row =>
        !Array.isArray(row) ||
        row.length !== operatorCount
      )
    ) {
      throw new Error(`Некорректный размер матрицы: ${key}`);
    }
  });
}

function createBackup() {
  if (typeof saveState === 'function') {
    saveState();
  }

  if (typeof savePlans === 'function') {
    savePlans();
  }

  const stateRaw = localStorage.getItem(STATE_KEY);

  if (!stateRaw) {
    throw new Error('Данные матрицы ещё не сохранены');
  }

  const state = JSON.parse(stateRaw);
  const plansRaw = localStorage.getItem(PLANS_KEY);

  const plans = plansRaw
    ? JSON.parse(plansRaw)
    : {
        development: null,
        rotation: null
      };

  validateState(state);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'ILU SE-4 90',
    exportedAt: new Date().toISOString(),
    state,
    plans
  };
}

function createFileName(prefix) {
  const now = new Date();

  const pad = value =>
    String(value).padStart(2, '0');

  return `${prefix}-` +
    `${now.getFullYear()}-` +
    `${pad(now.getMonth() + 1)}-` +
    `${pad(now.getDate())}_` +
    `${pad(now.getHours())}-` +
    `${pad(now.getMinutes())}.json`;
}

function downloadBackup(backup, prefix) {
  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    {
      type: 'application/json;charset=utf-8'
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = createFileName(prefix);

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function exportApplicationBackup() {
  try {
    const backup = createBackup();

    downloadBackup(
      backup,
      'ilu-se4-backup'
    );

    alert(
      'Резервная копия сохранена в папку загрузок.'
    );
  } catch (error) {
    console.error('Ошибка экспорта базы:', error);

    alert(
      `Не удалось сохранить базу: ${error.message}`
    );
  }
}

function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(
          new Error('Файл не является корректным JSON')
        );
      }
    };

    reader.onerror = () => {
      reject(
        new Error('Не удалось прочитать файл')
      );
    };

    reader.readAsText(file, 'UTF-8');
  });
}

function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Файл резервной копии пуст');
  }

  if (backup.format !== BACKUP_FORMAT) {
    throw new Error(
      'Это не резервная копия ILU'
    );
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(
      `Неподдерживаемая версия: ${backup.version}`
    );
  }

  validateState(backup.state);

  if (
    !backup.plans ||
    typeof backup.plans !== 'object'
  ) {
    throw new Error('Некорректные данные планов');
  }
}

async function importApplicationBackup(event) {
  const input = event.target;
  const file = input.files[0];

  if (!file) {
    return;
  }

  try {
    const backup = await readBackupFile(file);

    validateBackup(backup);

    const confirmed = confirm(
      'Текущая матрица, журналы и планы будут заменены. Продолжить?'
    );

    if (!confirmed) {
      return;
    }

    // Автоматическая копия перед заменой
    try {
      downloadBackup(
        createBackup(),
        'ilu-se4-before-import'
      );
    } catch (error) {
      console.warn(
        'Не удалось создать копию перед импортом:',
        error
      );
    }

    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(backup.state)
    );

    localStorage.setItem(
      PLANS_KEY,
      JSON.stringify(backup.plans)
    );

    alert(
      'База загружена. Приложение будет перезапущено.'
    );

    location.reload();
  } catch (error) {
    console.error('Ошибка импорта базы:', error);

    alert(
      `Не удалось загрузить базу: ${error.message}`
    );
  } finally {
    input.value = '';
  }
}

window.exportApplicationBackup =
  exportApplicationBackup;

window.importApplicationBackup =
  importApplicationBackup;