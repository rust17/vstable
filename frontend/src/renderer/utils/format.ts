import React from 'react';

export const formatTimestamp = (value: any) => {
  if (value === null || value === undefined || value === '') return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

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
  if (value === null) return null; // handle JSX in component
  let display = String(value);
  if (dataType?.includes('json') && typeof value === 'object') {
    display = JSON.stringify(value, null, 2);
  } else if (
    dataType?.includes('timestamp') ||
    dataType?.includes('date') ||
    dataType?.includes('time')
  ) {
    display = formatTimestamp(value);
  }
  return display;
};
