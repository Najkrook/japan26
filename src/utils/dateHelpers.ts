export const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const pad = (value: number): string => value.toString().padStart(2, '0');

export const formatDateKey = (date: Date): string => {
  const normalized = startOfDay(date);
  return `${normalized.getFullYear()}-${pad(normalized.getMonth() + 1)}-${pad(normalized.getDate())}`;
};

export const dateFromDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateSwedish = (date: Date): string =>
  date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatDateTimeSwedish = (date: Date | null | undefined): string => {
  if (!date) {
    return 'Nyss';
  }

  return date.toLocaleString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
