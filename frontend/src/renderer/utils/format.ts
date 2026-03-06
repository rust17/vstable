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

  // If it's a JSON type, handle potential string-encoded JSON or direct objects
  if (type.includes('json')) {
    try {
      // If it's a string that looks like JSON, try to parse it first to avoid extra escaping
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If parsing fails (e.g. it's just a regular string in a json column), return as-is
      return String(value);
    }
  }

  // If it's a date/time, use our custom formatter to avoid local timezone strings
  if (type.includes('timestamp') || type.includes('date') || type.includes('time') || value instanceof Date) {
    return formatTimestamp(value);
  }

  return String(value);
};
