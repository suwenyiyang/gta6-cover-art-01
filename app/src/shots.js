import { LAYOUTS, normalizeGrade } from './state.js';

function secondaryPanels(layout) {
  if (layout === 2) return [1];
  if (layout === 3) return [1, 2];
  if (layout === 4) return [1, 3];
  return [];
}

/** Fixed scenes for screenshots: ?shot=cover paints the poster full-bleed; ?shot=editor shows the loaded editor. */
export async function runShot(shot, query, api) {
  window.__shotReady = false;
  const isCover = shot === 'cover';
  document.body.classList.toggle('shot-cover', isCover);
  document.body.classList.toggle('shot-editor', shot === 'editor');

  const requestedLayout = Number(query.get('layout') ?? (isCover ? 3 : 3));
  const layout = LAYOUTS[requestedLayout] ? requestedLayout : 3;
  const primary = query.get('photo') ?? 'boulevard';
  const secondary = query.get('photo2');
  const caption = query.get('caption') ?? 'LEONIDA NIGHTS';
  const subtitle = query.get('subtitle') ?? 'A Vice City Story';

  api.setLayout(layout);
  api.setSplit(query.get('split') ?? (layout === 2 ? 'diagonal' : 'vertical'));
  api.setGrade(normalizeGrade(query.get('grade') ?? 'sunset'));
  api.setSize(isCover ? 'square' : (query.get('size') ?? 'square'));
  api.setCaption(caption);
  api.setSubtitle(subtitle);
  await api.loadSample(primary, true);

  if (secondary) {
    const indices = secondaryPanels(layout);
    if (indices.length) await api.loadSampleToPanels(secondary, indices);
  }

  if (query.get('vary') !== '0') api.varyPanels();
  api.setActivePanel(Number(query.get('panel') ?? 0));
  api.syncUI();
  await api.fontsReady;
  api.renderNow();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
