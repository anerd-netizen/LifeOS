/* Chart.js setup with theme-aware defaults */
import {
  Chart, BarController, BarElement, LineController, LineElement, PointElement, DoughnutController, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';

Chart.register(
  BarController, BarElement, LineController, LineElement, PointElement, DoughnutController, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler
);

export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = parseInt(n, 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`;
}

const registry = [];

export function destroyCharts() {
  registry.splice(0).forEach((c) => c.destroy());
}

export function mountChart(canvas, config) {
  if (!canvas) return null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--border');
  Chart.defaults.font.family = "'Geist', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.animation = reduce ? false : { duration: 600 };
  config.options = config.options || {};
  config.options.responsive = true;
  config.options.maintainAspectRatio = false;
  config.options.plugins = config.options.plugins || {};
  config.options.plugins.tooltip = {
    backgroundColor: css('--text'),
    titleColor: css('--surface'),
    bodyColor: css('--surface'),
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
    ...(config.options.plugins.tooltip || {}),
  };
  const chart = new Chart(canvas, config);
  registry.push(chart);
  return chart;
}

export const gridScale = (extra = {}) => ({
  beginAtZero: true,
  grid: { color: css('--border'), drawTicks: false },
  border: { display: false },
  ticks: { precision: 0, padding: 8 },
  ...extra,
});

export const plainScale = (extra = {}) => ({
  grid: { display: false },
  border: { display: false },
  ticks: { maxRotation: 0, autoSkipPadding: 12 },
  ...extra,
});
