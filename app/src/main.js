import { LAYOUTS, SIZES, GRADES, clamp, createState, normalizeGrade, normalizeSample } from './state.js';
import { drawPoster, panelGeometry, panelPanExtent, pointInPanel } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const panelTabs = document.getElementById('panelTabs');
const panelName = document.getElementById('panelName');
const fillAllInput = document.getElementById('fillAll');
const zoomRange = document.getElementById('zoomRange');
const zoomOut = document.getElementById('zoomOut');
const panelFlip = document.getElementById('panelFlip');
const splitRow = document.getElementById('splitRow');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const titleSize = document.getElementById('titleSize');
const titleSizeOut = document.getElementById('titleSizeOut');
const titlePosition = document.getElementById('titlePosition');
const titlePositionOut = document.getElementById('titlePositionOut');
const sizeSelect = document.getElementById('sizeSelect');
const dimensionLabel = document.getElementById('dimensionLabel');
const sceneName = document.getElementById('sceneName');
const layoutCount = document.getElementById('layoutCount');
const status = document.getElementById('status');
const toast = document.getElementById('toast');
const exportButton = document.getElementById('exportBtn');

const state = createState();
const sampleCache = new Map();
let renderTicket = 0;
let dragging = null;
let toastTimer = 0;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function cacheSample(name) {
  if (!sampleCache.has(name)) {
    const pending = loadImage(`./samples/${name}.jpg`);
    pending.catch(() => sampleCache.delete(name));
    sampleCache.set(name, pending);
  }
  return sampleCache.get(name);
}

function assignImage(image, details, indices) {
  for (const index of indices) {
    const panel = state.panels[index];
    if (!panel) continue;
    panel.photo = image;
    panel.preview = details.preview;
    panel.name = details.name;
    panel.sample = details.sample;
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
    panel.flip = false;
  }
}

async function loadSample(name, all = state.fillAll, announce = true) {
  const sample = normalizeSample(name);
  const image = await cacheSample(sample);
  const indices = all ? [0, 1, 2, 3] : [state.activePanel];
  assignImage(image, {
    name: sample === 'boulevard' ? 'Boulevard sample' : 'Pier sample',
    sample,
    preview: `./samples/${sample}.jpg`,
  }, indices);
  if (announce) setStatus(`${sample === 'boulevard' ? 'Boulevard' : 'Pier'} sample loaded into ${all ? 'all panels' : `panel ${state.activePanel + 1}`}.`);
  scheduleDraw();
  syncUI();
  return image;
}

async function loadSampleToPanels(name, indices) {
  const sample = normalizeSample(name);
  const image = await cacheSample(sample);
  assignImage(image, {
    name: sample === 'boulevard' ? 'Boulevard sample' : 'Pier sample',
    sample,
    preview: `./samples/${sample}.jpg`,
  }, indices);
  scheduleDraw();
  syncUI();
  return image;
}

function readFileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function loadPhotoFile(file, all) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('That file is not an image.');
    showToast('Choose a JPEG, PNG, WebP or other image file.');
    return;
  }
  try {
    setStatus(`Reading ${file.name} on this device…`);
    const dataUrl = await readFileData(file);
    const image = await loadImage(dataUrl);
    const indices = all ? [0, 1, 2, 3] : [state.activePanel];
    assignImage(image, { name: file.name, sample: '', preview: dataUrl }, indices);
    setStatus(`${file.name} loaded locally into ${all ? 'all panels' : `panel ${state.activePanel + 1}`}.`);
    showToast('Photo loaded locally. It never left your device.');
    scheduleDraw();
    syncUI();
  } catch (error) {
    console.error(error);
    setStatus('That photo could not be opened.');
    showToast('That photo could not be opened. Try another image.');
  }
}

function setStatus(text) {
  status.textContent = text;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function updateSceneName() {
  const title = String(state.title || '').trim().toUpperCase();
  sceneName.textContent = title || 'UNTITLED COVER';
}

function setActivePanel(index) {
  const count = LAYOUTS[state.layout].panels;
  state.activePanel = clamp(Number(index) || 0, 0, count - 1);
  syncUI();
}

function setLayout(index) {
  const next = Number(index);
  if (!LAYOUTS[next]) return;
  state.layout = next;
  state.activePanel = clamp(state.activePanel, 0, LAYOUTS[next].panels - 1);
  scheduleDraw();
  syncUI();
}

function setSplit(split) {
  state.split = split === 'diagonal' ? 'diagonal' : 'vertical';
  scheduleDraw();
  syncUI();
}

function setGrade(grade) {
  state.grade = normalizeGrade(grade);
  scheduleDraw();
  syncUI();
}

function setCaption(title) {
  state.title = String(title ?? '');
  if (document.activeElement !== titleInput) titleInput.value = state.title;
  updateSceneName();
  scheduleDraw();
}

function setSubtitle(subtitle) {
  state.subtitle = String(subtitle ?? '');
  if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
  scheduleDraw();
}

function setSize(name) {
  const size = SIZES[name] ?? SIZES.square;
  state.size = SIZES[name] ? name : 'square';
  canvas.width = size.width;
  canvas.height = size.height;
  dimensionLabel.textContent = `${size.width} × ${size.height} PX`;
  if (sizeSelect.value !== state.size) sizeSelect.value = state.size;
  scheduleDraw();
}

function renderNow() {
  if (renderTicket) {
    cancelAnimationFrame(renderTicket);
    renderTicket = 0;
  }
  drawPoster(canvas, state);
}

function scheduleDraw() {
  if (renderTicket) return;
  renderTicket = requestAnimationFrame(() => {
    renderTicket = 0;
    drawPoster(canvas, state);
  });
}

function makePanelTabs() {
  const count = LAYOUTS[state.layout].panels;
  panelTabs.textContent = '';
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `panel-tab${i === state.activePanel ? ' is-active' : ''}`;
    button.dataset.panel = String(i);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', i === state.activePanel ? 'true' : 'false');
    button.setAttribute('aria-label', `Edit panel ${i + 1}`);

    const thumb = document.createElement('span');
    thumb.className = 'panel-thumb';
    if (panel.preview) thumb.style.backgroundImage = `url("${panel.preview}")`;
    button.append(thumb);

    if (!panel.photo) {
      const empty = document.createElement('span');
      empty.className = 'panel-empty';
      empty.textContent = 'EMPTY';
      button.append(empty);
    }

    const number = document.createElement('span');
    number.className = 'panel-number';
    number.textContent = String(i + 1).padStart(2, '0');
    button.append(number);
    panelTabs.append(button);
  }
}

function syncUI() {
  document.querySelectorAll('.layout-choice').forEach((button) => {
    const active = Number(button.dataset.layout) === state.layout;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  layoutCount.textContent = LAYOUTS[state.layout].note;
  splitRow.hidden = state.layout !== 2;
  document.querySelectorAll('[data-split]').forEach((button) => {
    button.classList.toggle('is-on', button.dataset.split === state.split);
  });
  document.querySelectorAll('.grade-choice').forEach((button) => {
    const active = button.dataset.grade === state.grade;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelectorAll('.sample-card').forEach((button) => {
    const active = state.panels[state.activePanel]?.sample === button.dataset.sample;
    button.classList.toggle('is-active', active);
  });

  makePanelTabs();
  panelName.textContent = `PANEL ${String(state.activePanel + 1).padStart(2, '0')}`;
  const panel = state.panels[state.activePanel];
  zoomRange.value = String(Math.round(panel.zoom * 100));
  zoomOut.textContent = `${Math.round(panel.zoom * 100)}%`;
  panelFlip.textContent = panel.flip ? 'Flipped' : 'Flip';
  panelFlip.classList.toggle('is-active', panel.flip);

  fillAllInput.checked = state.fillAll;
  if (document.activeElement !== titleInput) titleInput.value = state.title;
  if (document.activeElement !== subtitleInput) subtitleInput.value = state.subtitle;
  titleSize.value = String(Math.round(state.titleScale * 100));
  titleSizeOut.textContent = `${Math.round(state.titleScale * 100)}%`;
  titlePosition.value = String(Math.round(state.titleY * 100));
  titlePositionOut.textContent = `${Math.round(state.titleY * 100)}%`;
  sizeSelect.value = state.size;
  const dims = SIZES[state.size];
  dimensionLabel.textContent = `${dims.width} × ${dims.height} PX`;
  updateSceneName();
}

function copyActivePanelToAll() {
  const source = state.panels[state.activePanel];
  if (!source.photo) {
    showToast('Load a photo into this panel first.');
    return;
  }
  for (let i = 0; i < state.panels.length; i++) {
    if (i === state.activePanel) continue;
    const panel = state.panels[i];
    panel.photo = source.photo;
    panel.preview = source.preview;
    panel.name = source.name;
    panel.sample = source.sample;
    panel.zoom = source.zoom;
    panel.panX = source.panX;
    panel.panY = source.panY;
    panel.flip = source.flip;
  }
  setStatus(`Panel ${state.activePanel + 1} applied to every panel.`);
  showToast('Crop copied to all panels.');
  scheduleDraw();
  syncUI();
}

function resetActivePanel() {
  const panel = state.panels[state.activePanel];
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  panel.flip = false;
  setStatus(`Panel ${state.activePanel + 1} crop reset.`);
  scheduleDraw();
  syncUI();
}

function exportPng() {
  const size = SIZES[state.size];
  const output = document.createElement('canvas');
  output.width = size.width;
  output.height = size.height;
  drawPoster(output, state);
  setStatus(`Rendering ${size.width} × ${size.height} PNG…`);
  output.toBlob((blob) => {
    if (!blob) {
      setStatus('PNG export failed in this browser.');
      showToast('PNG export failed. Try another format.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = size.file;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus(`${size.file} exported at ${size.width} × ${size.height}.`);
    showToast(`PNG saved: ${size.width} × ${size.height}.`);
  }, 'image/png');
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    cssWidth: rect.width,
  };
}

function endDrag(event) {
  if (!dragging) return;
  dragging = null;
  document.body.classList.remove('is-dragging');
  if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function bindEvents() {
  document.querySelectorAll('.sample-card').forEach((button) => {
    button.addEventListener('click', () => {
      loadSample(button.dataset.sample, state.fillAll).catch((error) => {
        console.error(error);
        setStatus('That sample could not be loaded.');
      });
    });
  });

  document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await loadPhotoFile(file, state.fillAll);
  });

  fillAllInput.addEventListener('change', () => {
    state.fillAll = fillAllInput.checked;
  });

  document.querySelectorAll('.layout-choice').forEach((button) => {
    button.addEventListener('click', () => setLayout(button.dataset.layout));
  });

  document.querySelectorAll('[data-split]').forEach((button) => {
    button.addEventListener('click', () => setSplit(button.dataset.split));
  });

  document.querySelectorAll('.grade-choice').forEach((button) => {
    button.addEventListener('click', () => setGrade(button.dataset.grade));
  });

  panelTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-panel]');
    if (!button) return;
    setActivePanel(Number(button.dataset.panel));
  });

  document.getElementById('panelFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await loadPhotoFile(file, false);
  });

  panelFlip.addEventListener('click', () => {
    const panel = state.panels[state.activePanel];
    panel.flip = !panel.flip;
    setStatus(`Panel ${state.activePanel + 1} ${panel.flip ? 'flipped' : 'restored'}.`);
    scheduleDraw();
    syncUI();
  });

  document.getElementById('panelApply').addEventListener('click', copyActivePanelToAll);
  document.getElementById('panelReset').addEventListener('click', resetActivePanel);

  zoomRange.addEventListener('input', () => {
    const panel = state.panels[state.activePanel];
    panel.zoom = Number(zoomRange.value) / 100;
    zoomOut.textContent = `${Math.round(panel.zoom * 100)}%`;
    scheduleDraw();
  });

  titleInput.addEventListener('input', () => {
    state.title = titleInput.value;
    updateSceneName();
    scheduleDraw();
  });
  subtitleInput.addEventListener('input', () => {
    state.subtitle = subtitleInput.value;
    scheduleDraw();
  });
  titleSize.addEventListener('input', () => {
    state.titleScale = Number(titleSize.value) / 100;
    titleSizeOut.textContent = `${titleSize.value}%`;
    scheduleDraw();
  });
  titlePosition.addEventListener('input', () => {
    state.titleY = Number(titlePosition.value) / 100;
    titlePositionOut.textContent = `${titlePosition.value}%`;
    scheduleDraw();
  });

  sizeSelect.addEventListener('change', () => setSize(sizeSelect.value));
  exportButton.addEventListener('click', exportPng);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = canvasPoint(event);
    const geoms = panelGeometry(state.layout, state.split, canvas.width, canvas.height);
    let hit = -1;
    for (let i = 0; i < geoms.length; i++) {
      if (pointInPanel(geoms[i], point.x, point.y)) {
        hit = i;
        break;
      }
    }
    if (hit < 0) return;
    if (hit !== state.activePanel) setActivePanel(hit);
    const panel = state.panels[hit];
    if (!panel.photo) return;
    const [maxX, maxY] = panelPanExtent(panel, geoms[hit]);
    dragging = {
      index: hit,
      lastX: event.clientX,
      lastY: event.clientY,
      maxX,
      maxY,
      cssWidth: point.cssWidth,
    };
    canvas.setPointerCapture(event.pointerId);
    document.body.classList.add('is-dragging');
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const panel = state.panels[dragging.index];
    const dx = ((event.clientX - dragging.lastX) / dragging.cssWidth) * canvas.width;
    const dy = ((event.clientY - dragging.lastY) / dragging.cssWidth) * canvas.width;
    dragging.lastX = event.clientX;
    dragging.lastY = event.clientY;
    if (dragging.maxX > 0) {
      const direction = panel.flip ? -1 : 1;
      panel.panX = clamp(panel.panX + (direction * dx) / dragging.maxX, -1, 1);
    }
    if (dragging.maxY > 0) panel.panY = clamp(panel.panY + dy / dragging.maxY, -1, 1);
    scheduleDraw();
    event.preventDefault();
  });

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      exportPng();
    }
  });
}

function varyPanels() {
  const count = LAYOUTS[state.layout].panels;
  const variants = [
    { zoom: 1.07, panX: -0.18, panY: 0.04, flip: false },
    { zoom: 1.34, panX: 0.12, panY: -0.18, flip: true },
    { zoom: 1.19, panX: -0.14, panY: 0.2, flip: false },
    { zoom: 1.42, panX: 0.2, panY: 0.12, flip: true },
  ];
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    if (!panel.photo) continue;
    panel.zoom = variants[i].zoom;
    panel.panX = variants[i].panX;
    panel.panY = variants[i].panY;
    panel.flip = variants[i].flip;
  }
}

function waitForPosterFonts() {
  if (!document.fonts) return Promise.resolve();
  return Promise.all([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('400 40px "Pacifico"'),
  ]).then(() => document.fonts.ready);
}

async function boot() {
  bindEvents();
  setSize('square');
  syncUI();
  const fontsReady = waitForPosterFonts().catch(() => undefined);
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  const api = {
    loadSample,
    loadSampleToPanels,
    setLayout,
    setSplit,
    setGrade,
    setSize,
    setCaption,
    setSubtitle,
    setActivePanel,
    varyPanels,
    syncUI,
    renderNow,
    fontsReady,
    setStatus,
  };

  try {
    if (shot) {
      await runShot(shot, params, api);
    } else {
      await fontsReady;
      await loadSample('boulevard', true, false);
      setStatus('Sample photos loaded locally. Choose a photo or start editing.');
      syncUI();
      renderNow();
    }
    window.__appReady = true;
  } catch (error) {
    console.error(error);
    setStatus(error?.message ?? 'The cover could not be drawn.');
    window.__shotError = String(error);
    if (shot) window.__shotReady = true;
  }
}

boot();
