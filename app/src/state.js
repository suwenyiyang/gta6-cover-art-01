export const LAYOUTS = {
  1: { name: 'Hero', panels: 1, note: '1 PANEL' },
  2: { name: 'Split', panels: 2, note: '2 PANELS' },
  3: { name: 'Triptych', panels: 3, note: '3 PANELS' },
  4: { name: 'Grid', panels: 4, note: '4 PANELS' },
};

export const GRADES = {
  sunset: {
    name: 'Vice City Sunset',
    filter: 'saturate(1.16) contrast(1.07) brightness(1.03) sepia(0.08)',
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.34) contrast(1.17) brightness(0.95)',
  },
  gold: {
    name: 'Palm Gold',
    filter: 'sepia(0.28) saturate(1.34) brightness(1.07) contrast(1.04)',
  },
  noir: {
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.5) brightness(0.92)',
  },
};

export const SIZES = {
  square: { width: 1080, height: 1080, label: 'Square · 1080 × 1080', file: 'vice-city-cover-1080x1080.png' },
  portrait: { width: 1080, height: 1350, label: 'Portrait · 1080 × 1350', file: 'vice-city-cover-1080x1350.png' },
  wide: { width: 1920, height: 1080, label: 'Wide · 1920 × 1080', file: 'vice-city-cover-1920x1080.png' },
};

export const SAMPLE_NAMES = ['boulevard', 'pier'];

export const GRADE_ALIASES = {
  sunset: 'sunset',
  'vice-city-sunset': 'sunset',
  'vicecitysunset': 'sunset',
  neon: 'neon',
  'neon-nights': 'neon',
  neonnights: 'neon',
  gold: 'gold',
  'palm-gold': 'gold',
  palmgold: 'gold',
  noir: 'noir',
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSample(name) {
  const clean = String(name ?? '').toLowerCase().replace(/\.(jpe?g|png|webp)$/i, '');
  return SAMPLE_NAMES.includes(clean) ? clean : 'boulevard';
}

export function normalizeGrade(name) {
  const clean = String(name ?? '').toLowerCase().replace(/[\s_]+/g, '-');
  return GRADE_ALIASES[clean] ?? 'sunset';
}

export function createPanel() {
  return {
    photo: null,
    preview: '',
    name: '',
    sample: '',
    zoom: 1,
    panX: 0,
    panY: 0,
    flip: false,
  };
}

export function createState() {
  return {
    layout: 3,
    split: 'vertical',
    grade: 'sunset',
    size: 'square',
    activePanel: 0,
    title: 'LEONIDA NIGHTS',
    subtitle: 'A Vice City Story',
    titleScale: 1,
    titleY: 0.72,
    fillAll: true,
    panels: Array.from({ length: 4 }, createPanel),
  };
}
