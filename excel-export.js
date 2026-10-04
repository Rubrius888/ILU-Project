function exportCurrentTableToExcel() {
  const table = document.querySelector('#iluTable');

  if (!table) {
    alert('Матрица ILU не найдена.');
    return;
  }

  const dateText = new Date().toLocaleDateString('ru-RU');
  const tableCopy = table.cloneNode(true);

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  tableCopy.querySelectorAll('tr').forEach((row) => {
    Array.from(row.cells).forEach((cell, cellIndex) => {
      const value = cell.textContent.trim();

      const presentMarker =
  cell.querySelector('.status-marker-present');

const trainingMarker =
  cell.querySelector('.status-marker-training');

if (presentMarker) {
  cell.innerHTML =
    '<font face="Arial" size="6"><b>О</b></font>';

  cell.className += ' operator-mark';

  cell.style.cssText = `
    height:77px !important;
    min-height:77px !important;
    max-height:77px !important;
    padding:0 !important;
    text-align:center !important;
    vertical-align:middle !important;
    line-height:77px !important;
    white-space:nowrap !important;
  `;

  return;
}

if (trainingMarker) {
  cell.innerHTML =
    '<font face="Arial" size="6"><b>△</b></font>';

  cell.className += ' training-mark';

  cell.style.cssText = `
    height:77px !important;
    min-height:77px !important;
    max-height:77px !important;
    padding:0 !important;
    text-align:center !important;
    vertical-align:middle !important;
    line-height:77px !important;
    white-space:nowrap !important;
  `;

  return;
}

      if (!value) {
        return;
      }

      /*
       * Кружок означает, что оператор уже стоит на посту.
       * Выводим крупную букву О.
       */
      if (
        value === '○' ||
        value === '◯' ||
        value === 'О' ||
        value === 'O'
      ) {
        cell.innerHTML =
          '<font face="Arial" size="6"><b>О</b></font>';

        cell.className += ' operator-mark';

        cell.style.cssText = `
          height:77px !important;
          min-height:77px !important;
          max-height:77px !important;
          padding:0 !important;
          text-align:center !important;
          vertical-align:middle !important;
          line-height:77px !important;
          white-space:nowrap !important;
        `;

        return;
      }

      /*
       * Треугольник означает обучение оператора.
       */
      if (
        value === '△' ||
        value === '▲'
      ) {
        cell.innerHTML =
          '<font face="Arial" size="6"><b>△</b></font>';

        cell.className += ' training-mark';

        cell.style.cssText = `
          height:77px !important;
          min-height:77px !important;
          max-height:77px !important;
          padding:0 !important;
          text-align:center !important;
          vertical-align:middle !important;
          line-height:77px !important;
          white-space:nowrap !important;
        `;

        return;
      }

      /*
       * Уровни операторов: U, L, Iкр и другие.
       */
      if (cellIndex >= 4 && cell.tagName === 'TD') {
        cell.innerHTML =
          `<font face="Arial" size="6"><b>${escapeHtml(value)}</b></font>`;

        cell.style.cssText = `
          height:77px !important;
          min-height:77px !important;
          max-height:77px !important;
          padding:1px !important;
          text-align:center !important;
          vertical-align:middle !important;
          line-height:77px !important;
          white-space:nowrap !important;
        `;
      }
    });
  });

  const tableHtml = tableCopy.outerHTML.replace(
    '<table',
    '<table class="ilu-excel-table"'
  );

  const html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">

<head>
<meta charset="UTF-8">

<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Матрица ILU</x:Name>

        <x:WorksheetOptions>
          <x:Selected/>

          <x:PageSetup>
            <x:Layout x:Orientation="Landscape"/>
            <x:PageMargins
              x:Left="0.1"
              x:Right="0.1"
              x:Top="0.1"
              x:Bottom="0.1"
              x:Header="0"
              x:Footer="0"/>
          </x:PageSetup>

          <x:Print>
            <x:ValidPrinterInfo/>
            <x:PaperSizeIndex>9</x:PaperSizeIndex>
            <x:Scale>100</x:Scale>
            <x:FitWidth>1</x:FitWidth>
            <x:FitHeight>0</x:FitHeight>
          </x:Print>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->

<style>
@page {
  size: A4 landscape;
  margin: 3mm;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #000;
  font-family: Arial, sans-serif;
}

.excel-sheet {
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
  padding: 0;
}

.ilu-excel-table {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
  font-family: Arial, sans-serif !important;
  font-weight: 700 !important;
}

.ilu-excel-table th,
.ilu-excel-table td {
  height: 77px !important;
  min-height: 77px !important;
  max-height: 77px !important;
  border: 1px solid #000 !important;
  padding: 2px !important;
  text-align: center !important;
  vertical-align: middle !important;
  line-height: 1.05 !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  font-family: Arial, sans-serif !important;
  font-weight: 700 !important;
}

.ilu-excel-table tbody tr,
.ilu-excel-table tbody td {
  height: 77px !important;
  min-height: 77px !important;
  max-height: 77px !important;
}

.ilu-excel-table th:first-child,
.ilu-excel-table td:first-child {
  width: 15% !important;
  text-align: left !important;
  white-space: normal !important;
  word-break: break-word !important;
}

.ilu-excel-table th:nth-child(2),
.ilu-excel-table td:nth-child(2),
.ilu-excel-table th:nth-child(3),
.ilu-excel-table td:nth-child(3),
.ilu-excel-table th:nth-child(4),
.ilu-excel-table td:nth-child(4) {
  width: 3% !important;
}

.ilu-excel-table th:nth-child(n + 5),
.ilu-excel-table td:nth-child(n + 5) {
  width: 1.9% !important;
  min-width: 0 !important;
  max-width: none !important;
  padding: 1px !important;
  text-align: center !important;
  vertical-align: middle !important;
  white-space: nowrap !important;
}

.ilu-excel-table thead th:nth-child(n + 5) {
  height: 35mm !important;
  min-height: 35mm !important;
  max-height: 35mm !important;
  writing-mode: vertical-rl !important;
  transform: rotate(180deg) !important;
  white-space: nowrap !important;
  font-size: 8px !important;
}

.ilu-excel-table th:nth-last-child(1),
.ilu-excel-table td:nth-last-child(1),
.ilu-excel-table th:nth-last-child(2),
.ilu-excel-table td:nth-last-child(2),
.ilu-excel-table th:nth-last-child(3),
.ilu-excel-table td:nth-last-child(3) {
  width: 3.5% !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 77px !important;
  text-align: center !important;
  vertical-align: middle !important;
}

.ilu-excel-table th:nth-last-child(1),
.ilu-excel-table th:nth-last-child(2),
.ilu-excel-table th:nth-last-child(3) {
  height: 35mm !important;
  writing-mode: vertical-rl !important;
  transform: rotate(180deg) !important;
}

.ilu-excel-table td.operator-mark,
.ilu-excel-table td.training-mark {
  height: 77px !important;
  min-height: 77px !important;
  max-height: 77px !important;
  padding: 0 !important;
  text-align: center !important;
  vertical-align: middle !important;
  line-height: 77px !important;
  white-space: nowrap !important;
  font-family: Arial, sans-serif !important;
  font-size: 26pt !important;
  font-weight: 700 !important;
}

tr {
  page-break-inside: avoid;
}
</style>
</head>

<body>
  <div class="excel-sheet">
    ${tableHtml}
  </div>
</body>

</html>
`;

  const blob = new Blob(
    ['\uFEFF', html],
    {
      type: 'application/vnd.ms-excel;charset=utf-8;'
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download =
    `ILU_Матрица_${dateText.replace(/\./g, '-')}.xls`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

window.exportCurrentTableToExcel =
  exportCurrentTableToExcel;