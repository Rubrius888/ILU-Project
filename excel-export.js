function exportCurrentTableToExcel() {
  const table = document.querySelector('#iluTable');

  if (!table) {
    alert('Матрица ILU не найдена.');
    return;
  }

  const dateText = new Date().toLocaleDateString('ru-RU');
  const tableCopy = table.cloneNode(true);

  const rows = Array.from(tableCopy.rows);
  const footerStart = rows.length - 3;

  const columnWidths = [180, 32, 32, 54];
  const operatorColumnWidth = 32;
  const textMetrics = document.createElement('canvas').getContext('2d');
  const wrappedHeight = (value, width, size, weight) => {
    textMetrics.font = `${weight} ${size}pt Arial`;
    const available = (width - 8) * 96 / 72;
    let lines = 1;
    let line = '';
    for (const word of value.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textMetrics.measureText(candidate).width > available) {
        lines++;
        line = '';
      }
      if (textMetrics.measureText(word).width > available) {
        for (const char of word) {
          if (textMetrics.measureText(line + char).width > available) {
            lines++;
            line = '';
          }
          line += char;
        }
      } else {
        line = line ? candidate : word;
      }
    }
    return Math.ceil(lines * size * 1.25 + 4);
  };

  const levelColors = {
    'level-I': ['#fef9c3', '#854d0e'],
    'level-L': ['#fed7aa', '#9a3412'],
    'level-U': ['#fecaca', '#991b1b']
  };

  rows.forEach((row, rowIndex) => {
    const header = row.parentElement.tagName === 'THEAD';
    const total = !header && rowIndex >= footerStart;
    const sizes = [180, 32, 32, 54];
    Array.from(row.cells).forEach((cell, index) => {
      const value = cell.textContent.trim();
      const presentMarker = cell.querySelector('.status-marker-present');
      const trainingMarker = cell.querySelector('.status-marker-training');
      const present = presentMarker || ['○', '◯', 'О', 'O'].includes(value);
      const training = trainingMarker || ['△', '▲'].includes(value);
      const operator = cell.hasAttribute('data-operator-index');
      const summary = cell.classList.contains('matrix-summary-column');
      const vertical = header && (summary || (rowIndex === 2 && operator));
      const status = presentMarker || trainingMarker ||
        (!header && !total && operator && index >= 4 && index % 2 === 0 && (present || training));
      const style = cell.style;

      style.fontFamily = 'Arial';
      style.fontSize = (status || (header && rowIndex === 1 && !vertical) ? 11 :
        vertical || (header && rowIndex === 0) || (total && operator) ? 9 : 10) + 'pt';
      style.fontWeight ||= header || total || cell.classList.contains('cell') ? 'bold' : 'normal';
      style.textAlign = index === 0 ? 'left' : 'center';
      style.verticalAlign = 'middle';
      style.border = '1px solid #000000';
      style.padding = '2px 3px';
      style.whiteSpace = vertical ? 'nowrap' : 'normal';
      if (!header) {
        const height = index === 0 ? wrappedHeight(value, columnWidths[0], 10, style.fontWeight) : 18;
        style.height = Math.max(18, height) + 'pt';
      }
      if (rowIndex === 1 && !vertical) {
        const width = operator ? operatorColumnWidth * cell.colSpan : columnWidths[index];
        style.height = Math.max(36, wrappedHeight(value, width, 11, style.fontWeight)) + 'pt';
      }
      if (vertical) {
        style.height = '47pt';
        cell.textContent = value;
      }
      if (index < columnWidths.length && !operator && !summary) style.width = columnWidths[index] + 'pt';
      if (header && rowIndex === 2 && operator) style.width = operatorColumnWidth + 'pt';
      if (summary) style.width = '43pt';

      if (header) {
        style.backgroundColor ||= '#f8fafc';
        style.color ||= '#475569';
      }
      const level = Object.keys(levelColors).find(key => cell.classList.contains(key));
      if (level) {
        style.backgroundColor ||= levelColors[level][0];
        style.color ||= levelColors[level][1];
      }
      if (present || training) cell.textContent = present ? 'О' : '△';
      if (status) {
        style.color = present ? '#22c55e' : '#2563eb';
        style.fontWeight = 'bold';
      }
      cell.removeAttribute('data-matrix-tooltip');
      cell.removeAttribute('title');
      // Excel's HTML importer consumes these Office-specific declarations.
      const excelStyle = (vertical ? 'mso-rotate:90;' : '') +
        (/^\(\d+\)$/.test(value) ? 'mso-number-format:"\\@";' : '');
      if (excelStyle) cell.setAttribute('style', style.cssText + excelStyle);
    });
  });

  tableCopy.classList.add('ilu-excel-table');
  const tableHtml = tableCopy.outerHTML;

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
  border-collapse: collapse;
  font: 10pt Arial, sans-serif;
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
