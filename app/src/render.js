import { GRADES, clamp } from './state.js';

const TITLE_STACK = "'Anton', Impact, 'Arial Black', 'Noto Sans Display', 'Noto Sans', sans-serif";
const SUB_STACK = "'Pacifico', 'Brush Script MT', cursive";
const LABEL_STACK = "'Anton', 'Noto Sans Display', 'Noto Sans', sans-serif";
const TITLE_XSCALE = 0.82;

function polygon(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    points,
    bounds: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y },
  };
}

/** Panel polygons in canvas pixels for the current layout. */
export function panelGeometry(layout, split, width, height) {
  const w = width;
  const h = height;
  const n = Number(layout);
  if (n === 1) {
    return [polygon([[0, 0], [w, 0], [w, h], [0, h]])];
  }
  if (n === 2 && split === 'diagonal') {
    return [
      polygon([[0, 0], [w * 0.615, 0], [w * 0.425, h], [0, h]]),
      polygon([[w * 0.615, 0], [w, 0], [w, h], [w * 0.425, h]]),
    ];
  }
  if (n === 2) {
    return [
      polygon([[0, 0], [w * 0.535, 0], [w * 0.535, h], [0, h]]),
      polygon([[w * 0.535, 0], [w, 0], [w, h], [w * 0.535, h]]),
    ];
  }
  if (n === 3) {
    return [
      polygon([[0, 0], [w * 0.585, 0], [w * 0.585, h], [0, h]]),
      polygon([[w * 0.585, 0], [w, 0], [w, h * 0.455], [w * 0.585, h * 0.455]]),
      polygon([[w * 0.585, h * 0.455], [w, h * 0.455], [w, h], [w * 0.585, h]]),
    ];
  }
  return [
    polygon([[0, 0], [w * 0.5, 0], [w * 0.5, h * 0.5], [0, h * 0.5]]),
    polygon([[w * 0.5, 0], [w, 0], [w, h * 0.5], [w * 0.5, h * 0.5]]),
    polygon([[0, h * 0.5], [w * 0.5, h * 0.5], [w * 0.5, h], [0, h]]),
    polygon([[w * 0.5, h * 0.5], [w, h * 0.5], [w, h], [w * 0.5, h]]),
  ];
}

function tracePolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

export function pointInPanel(geom, x, y) {
  const points = geom.points;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** How far a crop can travel in each direction, in canvas pixels. */
export function panelPanExtent(panel, geom) {
  if (!panel.photo) return [0, 0];
  const iw = panel.photo.naturalWidth || panel.photo.width;
  const ih = panel.photo.naturalHeight || panel.photo.height;
  const base = Math.max(geom.bounds.w / iw, geom.bounds.h / ih);
  const dw = iw * base * panel.zoom;
  const dh = ih * base * panel.zoom;
  return [Math.max(0, (dw - geom.bounds.w) / 2), Math.max(0, (dh - geom.bounds.h) / 2)];
}

function fillPlaceholder(ctx, geom, index) {
  const { x, y, w, h } = geom.bounds;
  const bg = ctx.createLinearGradient(x, y, x + w, y + h);
  bg.addColorStop(0, index % 2 ? '#251333' : '#321630');
  bg.addColorStop(0.55, '#1a0e24');
  bg.addColorStop(1, '#0e0915');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#ff8a58';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (let d = -h; d < w + h; d += Math.max(24, w * 0.15)) {
    ctx.beginPath();
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
    ctx.stroke();
  }
  ctx.restore();
  const r = Math.min(w, h) * 0.12;
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#ffba62';
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + h * 0.32, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhotoPanel(ctx, panel, geom, grade, index) {
  const { x, y, w, h } = geom.bounds;
  ctx.save();
  tracePolygon(ctx, geom.points);
  ctx.clip();
  ctx.fillStyle = '#0d0812';
  ctx.fillRect(x, y, w, h);

  if (!panel.photo) {
    fillPlaceholder(ctx, geom, index);
  } else {
    const iw = panel.photo.naturalWidth || panel.photo.width;
    const ih = panel.photo.naturalHeight || panel.photo.height;
    const base = Math.max(w / iw, h / ih);
    const dw = iw * base * panel.zoom;
    const dh = ih * base * panel.zoom;
    const [maxX, maxY] = panelPanExtent(panel, geom);
    const px = panel.panX * maxX * (panel.flip ? -1 : 1);
    const py = panel.panY * maxY;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.filter = GRADES[grade]?.filter ?? 'none';
    ctx.translate(cx, cy);
    ctx.scale(panel.flip ? -1 : 1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(panel.photo, -dw / 2 + px, -dh / 2 + py, dw, dh);
    ctx.restore();
  }

  const shade = ctx.createLinearGradient(x, y, x, y + h);
  shade.addColorStop(0, 'rgba(12,5,17,0.02)');
  shade.addColorStop(0.55, 'rgba(12,5,17,0)');
  shade.addColorStop(1, 'rgba(9,3,14,0.32)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawSunsetGrade(ctx, w, h) {
  ctx.save();
  let wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(43,10,78,0.82)');
  wash.addColorStop(0.35, 'rgba(117,30,119,0.25)');
  wash.addColorStop(0.64, 'rgba(255,72,104,0.23)');
  wash.addColorStop(0.84, 'rgba(255,130,69,0.37)');
  wash.addColorStop(1, 'rgba(255,191,91,0.58)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  const bloom = ctx.createRadialGradient(w * 0.83, h * 0.27, 0, w * 0.83, h * 0.27, Math.max(w, h) * 0.72);
  bloom.addColorStop(0, 'rgba(255,156,83,0.34)');
  bloom.addColorStop(0.32, 'rgba(255,69,139,0.14)');
  bloom.addColorStop(1, 'rgba(37,6,56,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  const magenta = ctx.createLinearGradient(0, 0, w * 0.62, h);
  magenta.addColorStop(0, 'rgba(59,8,83,0.26)');
  magenta.addColorStop(0.48, 'rgba(187,24,116,0.1)');
  magenta.addColorStop(1, 'rgba(255,126,60,0)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = magenta;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawNeonGrade(ctx, w, h) {
  ctx.save();
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(31,218,234,0.26)');
  wash.addColorStop(0.43, 'rgba(88,23,143,0.18)');
  wash.addColorStop(0.72, 'rgba(255,35,153,0.27)');
  wash.addColorStop(1, 'rgba(44,232,246,0.18)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  const cyan = ctx.createRadialGradient(w * 0.06, h * 0.86, 0, w * 0.06, h * 0.86, w * 0.82);
  cyan.addColorStop(0, 'rgba(31,243,255,0.28)');
  cyan.addColorStop(0.46, 'rgba(26,155,213,0.08)');
  cyan.addColorStop(1, 'rgba(8,13,35,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = cyan;
  ctx.fillRect(0, 0, w, h);

  const pink = ctx.createRadialGradient(w * 0.91, h * 0.11, 0, w * 0.91, h * 0.11, w * 0.74);
  pink.addColorStop(0, 'rgba(255,25,161,0.31)');
  pink.addColorStop(0.42, 'rgba(180,25,178,0.1)');
  pink.addColorStop(1, 'rgba(15,7,34,0)');
  ctx.fillStyle = pink;
  ctx.fillRect(0, 0, w, h);

  const deep = ctx.createLinearGradient(0, 0, 0, h);
  deep.addColorStop(0, 'rgba(7,4,35,0.28)');
  deep.addColorStop(0.48, 'rgba(19,4,38,0.04)');
  deep.addColorStop(1, 'rgba(4,2,16,0.2)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGoldGrade(ctx, w, h) {
  ctx.save();
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(110,48,34,0.34)');
  wash.addColorStop(0.42, 'rgba(215,117,49,0.22)');
  wash.addColorStop(0.78, 'rgba(255,185,84,0.4)');
  wash.addColorStop(1, 'rgba(255,218,139,0.58)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.79, h * 0.27, 0, w * 0.79, h * 0.27, w * 0.7);
  glow.addColorStop(0, 'rgba(255,221,128,0.33)');
  glow.addColorStop(0.42, 'rgba(255,158,66,0.09)');
  glow.addColorStop(1, 'rgba(79,28,10,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const shade = ctx.createLinearGradient(0, 0, w * 0.7, h);
  shade.addColorStop(0, 'rgba(58,24,13,0.24)');
  shade.addColorStop(1, 'rgba(255,180,81,0)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawNoirGrade(ctx, w, h) {
  ctx.save();
  const light = ctx.createLinearGradient(0, 0, w * 0.8, h);
  light.addColorStop(0, 'rgba(255,250,238,0.16)');
  light.addColorStop(0.48, 'rgba(239,234,222,0.02)');
  light.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);

  const contrast = ctx.createLinearGradient(0, 0, 0, h);
  contrast.addColorStop(0, 'rgba(15,15,16,0.26)');
  contrast.addColorStop(0.46, 'rgba(0,0,0,0.02)');
  contrast.addColorStop(1, 'rgba(0,0,0,0.47)');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = contrast;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGrade(ctx, w, h, grade) {
  if (grade === 'neon') drawNeonGrade(ctx, w, h);
  else if (grade === 'gold') drawGoldGrade(ctx, w, h);
  else if (grade === 'noir') drawNoirGrade(ctx, w, h);
  else drawSunsetGrade(ctx, w, h);
}

function drawDividers(ctx, w, h, layout, split) {
  const m = Math.min(w, h);
  const dark = Math.max(5, m * 0.011);
  const light = Math.max(1.6, m * 0.003);
  const lines = [];
  if (Number(layout) === 2 && split === 'diagonal') {
    lines.push([[w * 0.615, 0], [w * 0.425, h]]);
  } else if (Number(layout) === 2) {
    lines.push([[w * 0.535, 0], [w * 0.535, h]]);
  } else if (Number(layout) === 3) {
    lines.push([[w * 0.585, 0], [w * 0.585, h]]);
    lines.push([[w * 0.585, h * 0.455], [w, h * 0.455]]);
  } else if (Number(layout) === 4) {
    lines.push([[w * 0.5, 0], [w * 0.5, h]]);
    lines.push([[0, h * 0.5], [w, h * 0.5]]);
  }
  if (!lines.length) return;
  ctx.save();
  ctx.lineCap = 'butt';
  for (const [[x1, y1], [x2, y2]] of lines) {
    ctx.strokeStyle = 'rgba(8,3,12,0.72)';
    ctx.lineWidth = dark;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,249,237,0.9)';
    ctx.lineWidth = light;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSun(ctx, w, h) {
  const m = Math.min(w, h);
  const cx = w * 0.805;
  const cy = h * 0.292;
  const r = m * 0.108;
  ctx.save();

  const glow = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 3.3);
  glow.addColorStop(0, 'rgba(255,230,137,0.46)');
  glow.addColorStop(0.24, 'rgba(255,143,72,0.24)');
  glow.addColorStop(0.58, 'rgba(255,66,122,0.1)');
  glow.addColorStop(1, 'rgba(255,61,129,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 3.3, cy - r * 3.3, r * 6.6, r * 6.6);

  const disc = ctx.createRadialGradient(cx - r * 0.27, cy - r * 0.3, r * 0.06, cx, cy, r);
  disc.addColorStop(0, 'rgba(255,251,188,0.99)');
  disc.addColorStop(0.42, 'rgba(255,213,105,0.98)');
  disc.addColorStop(0.78, 'rgba(255,130,73,0.96)');
  disc.addColorStop(1, 'rgba(255,83,93,0.88)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(92,22,72,0.22)';
  for (let i = 1; i <= 4; i++) {
    ctx.fillRect(cx - r, cy + r * (i * 0.155 - 0.08), r * 2, r * (0.027 + i * 0.006));
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,244,189,0.42)';
  ctx.lineWidth = Math.max(1, r * 0.018);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.01, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPalm(ctx, x, baseY, height, lean, color, alpha = 1) {
  const crownX = lean * height * 0.12;
  const crownY = -height * 0.9;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(-height * 0.016, 0);
  ctx.bezierCurveTo(
    -height * 0.028,
    -height * 0.24,
    crownX * 0.7 - height * 0.018,
    -height * 0.64,
    crownX - height * 0.016,
    crownY + height * 0.01,
  );
  ctx.lineTo(crownX + height * 0.014, crownY + height * 0.01);
  ctx.bezierCurveTo(
    crownX * 0.7 + height * 0.024,
    -height * 0.61,
    height * 0.022,
    -height * 0.22,
    height * 0.017,
    0,
  );
  ctx.closePath();
  ctx.fill();

  const angles = [-3.02, -2.64, -2.22, -1.82, -1.38, -0.93, -0.48, -0.04, 0.39];
  for (let i = 0; i < angles.length; i++) {
    const length = height * (0.205 + (i % 3) * 0.018);
    const width = height * (0.029 + (i % 2) * 0.004);
    ctx.save();
    ctx.translate(crownX, crownY);
    ctx.rotate(angles[i]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(length * 0.26, -width * 1.5, length * 0.72, -width * 1.12, length, width * 0.24);
    ctx.bezierCurveTo(length * 0.66, width * 0.92, length * 0.25, width * 0.72, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(crownX - height * 0.008, crownY + height * 0.016, height * 0.014, 0, Math.PI * 2);
  ctx.arc(crownX + height * 0.012, crownY + height * 0.022, height * 0.012, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunsetMotif(ctx, w, h, grade) {
  if (grade !== 'sunset' && grade !== 'gold') return;
  if (grade === 'sunset') drawSun(ctx, w, h);
  const palmColor = grade === 'gold' ? 'rgba(34,14,17,0.93)' : 'rgba(17,7,24,0.94)';
  drawPalm(ctx, w * 0.025, h * 1.017, h * 0.53, 1.22, palmColor, grade === 'gold' ? 0.75 : 0.9);
  drawPalm(ctx, w * 0.975, h * 1.025, h * 0.46, -1.2, palmColor, grade === 'gold' ? 0.68 : 0.84);
  drawPalm(ctx, w * 0.12, h * 1.02, h * 0.28, 0.82, palmColor, 0.38);
}

function drawVignette(ctx, w, h, grade) {
  const strength = grade === 'noir' ? 0.68 : grade === 'neon' ? 0.55 : 0.48;
  const g = ctx.createRadialGradient(
    w * 0.5,
    h * 0.43,
    Math.min(w, h) * 0.22,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.62, 'rgba(6,2,10,0.02)');
  g.addColorStop(1, `rgba(5,2,9,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

let grainTile = null;
function grainPattern(ctx) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 144;
    grainTile.height = 144;
    const gctx = grainTile.getContext('2d');
    const image = gctx.createImageData(grainTile.width, grainTile.height);
    let seed = 0x13a7c9e1;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = (seed >>> 23) & 255;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 28;
    }
    gctx.putImageData(image, 0, 0);
  }
  return ctx.createPattern(grainTile, 'repeat');
}

function drawGrain(ctx, w, h, grade) {
  const pattern = grainPattern(ctx);
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = grade === 'noir' ? 'overlay' : 'soft-light';
  ctx.globalAlpha = grade === 'noir' ? 0.32 : grade === 'neon' ? 0.11 : 0.16;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawCaptionShade(ctx, w, h) {
  const g = ctx.createLinearGradient(0, h * 0.43, 0, h);
  g.addColorStop(0, 'rgba(7,2,12,0)');
  g.addColorStop(0.55, 'rgba(7,2,12,0.08)');
  g.addColorStop(0.82, 'rgba(7,2,12,0.42)');
  g.addColorStop(1, 'rgba(4,1,8,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.43, w, h * 0.57);
}

function measureTracked(ctx, text, tracking) {
  let width = 0;
  for (const ch of Array.from(text)) width += ctx.measureText(ch).width + tracking;
  return Math.max(0, width - tracking);
}

function splitBalanced(ctx, text, tracking) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];
  let best = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wa = measureTracked(ctx, a, tracking);
    const wb = measureTracked(ctx, b, tracking);
    const diff = Math.abs(wa - wb);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

function layoutTitle(ctx, state, w, h) {
  const text = String(state.title || '').trim().replace(/\s+/g, ' ').toUpperCase() || 'LEONIDA NIGHTS';
  const maxWidth = w * 0.86;
  let size = h * 0.132 * (state.titleScale || 1);
  let tracking = size * 0.012;
  ctx.font = `900 ${size}px ${TITLE_STACK}`;
  let single = measureTracked(ctx, text, tracking);
  let lines = [text];
  if (single > maxWidth / TITLE_XSCALE && text.includes(' ')) {
    lines = splitBalanced(ctx, text, tracking);
  }

  for (let guard = 0; guard < 24; guard++) {
    ctx.font = `900 ${size}px ${TITLE_STACK}`;
    tracking = size * 0.012;
    const widest = Math.max(...lines.map((line) => measureTracked(ctx, line, tracking)));
    if (widest * TITLE_XSCALE <= maxWidth || size <= h * 0.048) break;
    size *= 0.94;
  }

  const lineHeight = size * 1.02;
  const blockHeight = lineHeight * lines.length;
  const subtitleSize = h * 0.029;
  const subtitleGap = h * 0.047;
  const topMin = h * 0.11;
  const topMax = h * 0.87 - blockHeight - subtitleGap - subtitleSize;
  const top = clamp(h * state.titleY, topMin, Math.max(topMin, topMax));
  return { lines, size, tracking, lineHeight, blockHeight, subtitleSize, subtitleGap, top };
}

function paintTracked(ctx, text, cx, baseline, size, tracking, scaleX, outline, fontStack) {
  ctx.save();
  ctx.font = `900 ${size}px ${fontStack}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const widths = Array.from(text).map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, value) => sum + value, 0) + tracking * Math.max(0, widths.length - 1);
  ctx.translate(cx, baseline);
  ctx.scale(scaleX, 1);
  let x = -total / 2;
  const chars = Array.from(text);

  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#050207';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x + size * 0.045, size * 0.065);
    x += widths[i] + tracking;
  }
  ctx.globalAlpha = 1;

  x = -total / 2;
  ctx.strokeStyle = '#070309';
  ctx.lineWidth = outline;
  for (let i = 0; i < chars.length; i++) {
    ctx.strokeText(chars[i], x, 0);
    x += widths[i] + tracking;
  }

  const fill = ctx.createLinearGradient(0, -size * 0.82, 0, size * 0.12);
  fill.addColorStop(0, '#fffef9');
  fill.addColorStop(0.55, '#fff9ed');
  fill.addColorStop(1, '#eadccb');
  ctx.fillStyle = fill;
  x = -total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, 0);
    x += widths[i] + tracking;
  }
  ctx.restore();
}

function drawCaption(ctx, state, w, h) {
  const title = layoutTitle(ctx, state, w, h);
  const cx = w / 2;
  for (let i = 0; i < title.lines.length; i++) {
    const baseline = title.top + title.size * 0.84 + i * title.lineHeight;
    paintTracked(ctx, title.lines[i], cx, baseline, title.size, title.tracking, TITLE_XSCALE, title.size * 0.145, TITLE_STACK);
  }

  const rawSubtitle = String(state.subtitle || '').trim();
  if (!rawSubtitle) return;
  let subSize = title.subtitleSize;
  let tracking = subSize * 0.105;
  const subtitle = rawSubtitle.toUpperCase();
  ctx.font = `800 ${subSize}px ${SUB_STACK}`;
  const maxSubWidth = w * 0.78;
  for (let guard = 0; guard < 20 && measureTracked(ctx, subtitle, tracking) > maxSubWidth; guard++) {
    subSize *= 0.94;
    tracking = subSize * 0.105;
    ctx.font = `800 ${subSize}px ${SUB_STACK}`;
  }
  const baseline = title.top + title.blockHeight + title.subtitleGap;
  paintTracked(ctx, subtitle, cx, baseline, subSize, tracking, 0.96, Math.max(3, subSize * 0.19), SUB_STACK);
}

function drawMicroLabels(ctx, w, h) {
  const inset = Math.min(w, h) * 0.036;
  const size = Math.min(w, h) * 0.0125;
  ctx.save();
  ctx.font = `400 ${size}px ${LABEL_STACK}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,250,239,0.87)';
  ctx.shadowColor = 'rgba(4,1,7,0.9)';
  ctx.shadowBlur = size * 0.6;
  ctx.textAlign = 'left';
  ctx.fillText('VICE CITY / COVER LAB', inset, inset + size * 0.6);
  ctx.textAlign = 'right';
  ctx.fillText('LEONIDA / 2026', w - inset, inset + size * 0.6);
  ctx.restore();
}

function drawFrame(ctx, w, h) {
  const m = Math.min(w, h);
  const inset = m * 0.021;
  ctx.save();
  ctx.strokeStyle = 'rgba(5,2,8,0.72)';
  ctx.lineWidth = Math.max(4, m * 0.008);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(255,250,239,0.9)';
  ctx.lineWidth = Math.max(1.5, m * 0.0031);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.restore();
}

/** Paints the whole cover into a canvas's 2D context at its current size. */
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#140b1d';
  ctx.fillRect(0, 0, w, h);

  const geoms = panelGeometry(state.layout, state.split, w, h);
  const count = Math.min(geoms.length, state.panels.length);
  for (let i = 0; i < count; i++) drawPhotoPanel(ctx, state.panels[i], geoms[i], state.grade, i);

  drawGrade(ctx, w, h, state.grade);
  drawDividers(ctx, w, h, state.layout, state.split);
  drawSunsetMotif(ctx, w, h, state.grade);
  drawVignette(ctx, w, h, state.grade);
  drawGrain(ctx, w, h, state.grade);
  drawCaptionShade(ctx, w, h);
  drawCaption(ctx, state, w, h);
  drawMicroLabels(ctx, w, h);
  drawFrame(ctx, w, h);
  ctx.restore();
}
