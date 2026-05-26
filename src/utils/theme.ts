export type Theme = 'dark' | 'cyberpunk' | 'aurora' | 'paper';

const KEY = 'fit_theme';

export const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: 'dark',      label: 'Dark',      preview: '#0d1117' },
  { id: 'cyberpunk', label: 'Cyberpunk', preview: '#0a0015' },
  { id: 'aurora',    label: 'Aurora',    preview: '#0a1628' },
  { id: 'paper',     label: 'Paper',     preview: '#f5f0e8' },
];

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || 'dark';
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
