export const formatTimestamp = (value: any) => {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return `${y}-${m}-${d} ${h}:${min}:${s}`;
};

export const formatDisplayValue = (value: any, dataType?: string) => {
  if (value === null || value === undefined) return null;

  const type = dataType?.toLowerCase() || '';

  // If it's an object/array, or a JSON type, handle it
  if (type.includes('json') || typeof value === 'object') {
    try {
      // If it's a string that looks like JSON (only for json types), try to parse it
      const parsed = type.includes('json') && typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If parsing fails, return as-is
      return String(value);
    }
  }

  // If it's a date/time, use our custom formatter to avoid local timezone strings
  if (
    type.includes('timestamp') ||
    type.includes('date') ||
    type.includes('time') ||
    value instanceof Date
  ) {
    return formatTimestamp(value);
  }

  return String(value);
};
