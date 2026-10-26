/**
 * Export data to CSV with UTF-8 BOM and CSV injection protection
 * @param {Array} columns - Column definitions with accessor function
 * @param {Array} rows - Data rows to export
 * @param {string} filename - Output filename (without extension)
 */
export const exportCsv = (columns, rows, filename) => {
  if (!columns || !rows || rows.length === 0) {
    return 0;
  }

  // UTF-8 BOM for proper Unicode rendering in Excel
  const bom = '\uFEFF';
  
  // Build CSV content
  const headers = columns.map(col => escapeCsvValue(col.header || col.id));
  const csvRows = [headers.join(',')];

  rows.forEach(row => {
    const values = columns.map(col => {
      const value = col.accessor ? col.accessor(row) : row[col.id];
      return escapeCsvValue(value);
    });
    csvRows.push(values.join(','));
  });

  // Use CRLF line endings for Excel compatibility
  const csvContent = bom + csvRows.join('\r\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}-${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', fullFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return rows.length;
};

/**
 * Escape CSV value and protect against injection
 * @param {*} value - Value to escape
 * @returns {string} Escaped value
 */
export const escapeCsvValue = (value) => {
  // Treat placeholders as empty
  if (value == null || value === undefined || value === '—' || value === 'Location unavailable') {
    return '';
  }
  
  const str = String(value);
  
  // Strict numeric regex: optional sign, digits, optional decimal part (no spaces)
  const isStrictNumeric = /^[-+]?\d+(\.\d+)?$/.test(str);
  
  // Formula protection: prefix with single quote if starts with =, +, -, @, tab, or carriage return
  // BUT do NOT prefix strict numeric values
  // Also check for leading whitespace followed by formula characters
  const trimmed = str.trimStart();
  const needsFormulaProtection = /^[=+\-@\t\r]/.test(trimmed);
  
  let result = str;
  let wasFormulaProtected = false;
  if (needsFormulaProtection && !isStrictNumeric) {
    result = `'${str}`;
    wasFormulaProtected = true;
  }
  
  // Quote if contains comma, double quote, CR, or LF, or if formula-protected
  if (/[,"\r\n]/.test(result) || wasFormulaProtected) {
    return `"${result.replace(/"/g, '""')}"`;
  }
  
  return result;
};
