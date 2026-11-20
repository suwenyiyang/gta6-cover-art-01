// Vice City Cover Lab's hand-in program. Node 22+ with its standard library only:
// copy app/ and screenshots/ beside this file into MAKEFUN_OUTPUT_DIR (default /output),
// then write dossier.json with the vendored make.fun dossier builder.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DossierError, buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

const appSource = join(here, 'app');
const screenshotsSource = join(here, 'screenshots');
const appTarget = join(outputDir, 'app');
const screenshotsTarget = join(outputDir, 'screenshots');

rmSync(appTarget, { recursive: true, force: true });
rmSync(screenshotsTarget, { recursive: true, force: true });
cpSync(appSource, appTarget, { recursive: true });
mkdirSync(screenshotsTarget, { recursive: true });
if (existsSync(screenshotsSource)) cpSync(screenshotsSource, screenshotsTarget, { recursive: true });

const dossierPath = join(outputDir, 'dossier.json');
try {
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(dossierPath, dossier);
  console.log(`Wrote ${dossierPath}`);
} catch (error) {
  if (!(error instanceof DossierError) || !error.message.includes('screenshots/ holds no image')) throw error;
  const pending = {
    schema: 'makefun/dossier/v1',
    cover: 0,
    text: '## App\n\nScreenshots are pending. Capture them outside this build environment, place 3 or 4 PNG or JPEG files in screenshots/, and rerun main.ts to write the final dossier.\n',
    images: [],
  };
  writeFileSync(dossierPath, `${JSON.stringify(pending, null, 2)}\n`);
  console.warn(`Wrote provisional ${dossierPath}: screenshots/ is empty, so final dossier generation is pending screenshots.`);
}
