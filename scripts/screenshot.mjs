/**
 * scripts/screenshot.mjs
 * Робить скриншот симулятора. Якщо dev-сервер вже запущено — використовує його.
 * Якщо ні — стартує сам і визначає порт з виводу Next.js.
 * Використання: node scripts/screenshot.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Вихідна папка ────────────────────────────────────────────────────────────
const OUT_DIR = path.join(ROOT, 'changes', 'media', 'media', 'media');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Перевірити, чи відповідає сервер на порту ────────────────────────────────
async function probe(port) {
  try {
    const r = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(2000),
    });
    return r.status < 500;
  } catch {
    return false;
  }
}

// ── Знайти вже запущений Next.js (3000, 3001, 3002) ─────────────────────────
let activePort = null;
for (const p of [3000, 3001, 3002]) {
  if (await probe(p)) { activePort = p; break; }
}

// ── Якщо нема — стартуємо next dev і чекаємо порт з виводу ──────────────────
let devServer = null;
if (activePort) {
  console.log(`✔  Dev-сервер вже на http://localhost:${activePort}`);
} else {
  console.log('▶  Запускаю next dev…');
  devServer = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  activePort = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Next.js не запустився за 60с')), 60_000);

    function tryParse(chunk) {
      const text = chunk.toString();
      process.stdout.write('[next] ' + text);
      // Next.js виводить: "Local: http://localhost:3001"
      const m = text.match(/localhost:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(Number(m[1]));
      }
    }

    devServer.stdout.on('data', tryParse);
    devServer.stderr.on('data', tryParse);
    devServer.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`next dev завершився з кодом ${code}`));
    });
  });

  // Дати ще 3с щоб сторінка скомпілювалась
  console.log(`✔  Сервер на порту ${activePort}, чекаю компіляції…`);
  await new Promise(r => setTimeout(r, 3000));
}

const URL = `http://localhost:${activePort}`;

// ── Playwright ───────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1.5,
});
const page = await context.newPage();

try {
  console.log(`🌐  Відкриваю ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30_000 });

  // Чекаємо React Flow або основний shell
  await page.waitForSelector(
    '.react-flow__renderer, [class*="canvas"], [class*="shell"]',
    { timeout: 20_000 }
  );

  // Анімації та завантаження
  await page.waitForTimeout(3000);

  // ── 1. Повний UI ──────────────────────────────────────────────────────────
  const uiPath = path.join(OUT_DIR, 'simulator_ui.png');
  await page.screenshot({ path: uiPath, fullPage: false });
  console.log(`📸  ${uiPath}`);

  // ── 2. Тільки граф (React Flow canvas) ───────────────────────────────────
  const graphEl = await page.$('.react-flow__renderer');
  if (graphEl) {
    const graphPath = path.join(OUT_DIR, 'simulator_graph.png');
    await graphEl.screenshot({ path: graphPath });
    console.log(`📸  ${graphPath}`);
  }

} finally {
  await browser.close();
  if (devServer) {
    devServer.kill('SIGTERM');
    console.log('■  Dev-сервер зупинено');
  }
}

console.log('\n✅  Готово!');
