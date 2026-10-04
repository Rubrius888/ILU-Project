//Функции по комбинации расстановок
function isActivePlacement(status) {
  return status === '○' || status === '△';
}

function effectivePlacementLevel(level, status) {
  // Обычный I при постановке на пост становится Lкр.
  return status === '○' && level === 'I'
    ? 'Lкр'
    : level;
}

function isQualifiedPlacementLevel(level) {
  // Lкр считается уровнем L.
  return (
    level === 'L' ||
    level === 'Lкр' ||
    level === 'U'
  );
}

function canSharePost(firstLevel, secondLevel) {
  return (
    firstLevel === 'Iкр' &&
    isQualifiedPlacementLevel(secondLevel)
  ) || (
    secondLevel === 'Iкр' &&
    isQualifiedPlacementLevel(firstLevel)
  );
}

function applyPostPlacementRule(row, col, newStatus) {
  const newLevel = effectivePlacementLevel(
    data[row][col],
    newStatus
  );

  const newIsQualified =
    isQualifiedPlacementLevel(newLevel);

  for (
    let otherCol = 0;
    otherCol < operators.length;
    otherCol++
  ) {
    if (otherCol === col) continue;

    const oldStatus =
      attendanceData[row][otherCol];

    if (!isActivePlacement(oldStatus)) {
      continue;
    }

    const oldLevel = effectivePlacementLevel(
      data[row][otherCol],
      oldStatus
    );

    // Разрешённые пары:
    // Iкр + U
    // Iкр + L
    // Iкр + Lкр
    if (canSharePost(newLevel, oldLevel)) {
      continue;
    }

    // Если ставим новый U/L/Lкр,
    // старый U/L/Lкр автоматически снимается.
    if (
      newIsQualified &&
      isQualifiedPlacementLevel(oldLevel)
    ) {
      attendanceData[row][otherCol] = '';

      const today =
        new Date().toLocaleDateString('ru-RU');

      placementLog = placementLog.filter(entry =>
        !(
          entry.date === today &&
          entry.opName === operators[otherCol] &&
          entry.postName === posts[row]
        )
      );

      continue;
    }

    alert(
      `На посте «${posts[row]}» нельзя одновременно ` +
      `поставить операторов с уровнями ` +
      `${newLevel} и ${oldLevel}.\n` +
      `Разрешена только комбинация Iкр + U ` +
      `или Iкр + L.`
    );

    return false;
  }

  return true;
}