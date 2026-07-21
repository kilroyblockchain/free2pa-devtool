import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, 'artifacts/devpost-gallery-v2');
const sourceDir = resolve(outputDir, 'source');
const htmlPath = resolve(sourceDir, 'gallery.html');
const chromeJsonUrl = 'http://127.0.0.1:9780/json';

const slides = [
  {
    title: 'Free2PA',
    kicker: 'Developer Tools',
    line: 'Tamper detection for agent control files before model context.',
    blocks: ['SOUL.md', 'AGENTS.md', 'SKILL.md', 'TOOLS.md'],
    result: 'LOAD before context',
  },
  {
    title: 'Agent control files are supply-chain inputs.',
    kicker: 'The problem',
    line: 'A one-line text edit can change identity, tools, permissions, or policy before the model call starts.',
    blocks: ['prompts', 'skills', 'policies', 'tool manifests'],
    result: 'Verify before read',
  },
  {
    title: 'Hello World Agent',
    kicker: 'The demo app',
    line: 'A tiny agent reads SOUL.md, then answers a greeting.',
    blocks: ['👋 Say Hello', 'SOUL.md', 'model context'],
    result: 'User sees the app',
  },
  {
    title: 'Free2PA verify console',
    kicker: 'The background gate',
    line: 'The app asks Free2PA whether this exact control file may enter model context.',
    blocks: ['receipt', 'file hash', 'publisher trust'],
    result: 'LOAD or reject',
  },
  {
    title: 'Check 1: receipt signature',
    kicker: 'Cryptographic proof',
    line: 'The sidecar receipt must be signed correctly by the embedded publisher certificate.',
    blocks: ['ES256', 'canonical JSON', 'X.509 cert'],
    result: 'Signature PASS',
  },
  {
    title: 'Check 2: file matches receipt',
    kicker: 'Tamper evidence',
    line: 'The current file hash must match the SHA-256 hash recorded in the signed receipt.',
    blocks: ['current SOUL.md', 'signed hash', 'exact bytes'],
    result: 'Integrity PASS',
  },
  {
    title: 'Check 3: publisher trusted here',
    kicker: 'Local trust group',
    line: 'The signer must be in this verifier’s trusted-publishers directory.',
    blocks: ['hello-group.crt', 'local-console.crt', 'revocable trust'],
    result: 'Publisher PASS',
  },
  {
    title: 'LOAD',
    kicker: 'Safe context',
    line: 'Only after every deterministic check passes can the verified control file enter model context.',
    blocks: ['signature PASS', 'hash PASS', 'publisher PASS'],
    result: 'Model call starts',
  },
  {
    title: 'Hello, vibrant world!',
    kicker: 'Visible app result',
    line: 'The user sees the agent respond. The provenance check happened before the model saw SOUL.md.',
    blocks: ['verified SOUL.md', 'optimistic rule', 'agent reply'],
    result: 'Working app',
  },
  {
    title: 'Edit SOUL.md',
    kicker: 'Unsigned local revision',
    line: 'Change one control word from Never to Always. Saving is not approval.',
    blocks: ['Never → Always', 'saved locally', 'not signed'],
    result: 'Signature required',
  },
  {
    title: 'New signature required',
    kicker: 'Approval semantics',
    line: 'A saved revision does not become active until a trusted local publisher signs it.',
    blocks: ['pending edit', 'last signed file', 'no self-approval'],
    result: 'Previous version remains active',
  },
  {
    title: 'Changed after signature',
    kicker: 'Tamper detected',
    line: 'The signature and publisher can still be valid, but the changed bytes no longer match the receipt.',
    blocks: ['signature PASS', 'publisher PASS', 'hash FAIL'],
    result: 'CONTENT_CHANGED',
  },
  {
    title: 'RESTORE + RUN + REPORT',
    kicker: 'Repair policy',
    line: 'The host restores the exact signed original from the trusted receipt and reports the rejected edit.',
    blocks: ['restore signed original', 'preserve evidence', 'run verified file'],
    result: 'Unsigned text stays out',
  },
  {
    title: 'Sign the intentional edit',
    kicker: 'Trusted approval',
    line: 'If the change is intended, the local Free2PA console signs a new receipt. The new revision can then LOAD.',
    blocks: ['local key', 'new receipt', 'trusted publisher'],
    result: 'Approved revision',
  },
  {
    title: 'Install where your app reads files.',
    kicker: 'Developer tool',
    line: 'Use the same verifier through Node, CLI, HTTP, MCP, CI, or a Codex retrofit skill.',
    blocks: ['loadVerifiedFile()', 'free2pa verify', 'MCP verify_asset', 'GitHub Action', 'Codex skill'],
    result: 'Ship the load gate',
  },
];

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderHtml() {
  const renderedSlides = slides.map((slide, index) => {
    const number = String(index + 1).padStart(2, '0');
    const blockHtml = slide.blocks.map((block) => `<span>${esc(block)}</span>`).join('');
    return `<section class="slide" data-slide="${number}">
      <div class="top">
        <div class="mark">Free2PA</div>
        <div class="number">${number}/15</div>
      </div>
      <main>
        <p class="kicker">${esc(slide.kicker)}</p>
        <h1>${esc(slide.title)}</h1>
        <p class="line">${esc(slide.line)}</p>
        <div class="blocks">${blockHtml}</div>
      </main>
      <footer>${esc(slide.result)}</footer>
    </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free2PA Gallery v2</title>
  <style>
    :root {
      --bg: #e9e2cf;
      --ink: #171717;
      --paper: #fffdf4;
      --panel: #f7f1de;
      --line: #171717;
      --blue: #4c7dff;
      --blue-soft: #dfeaff;
      --green: #42dc8d;
      --yellow: #ffe45c;
      --red: #ff6b68;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 1800px; height: 1200px; overflow: hidden; }
    body {
      background:
        radial-gradient(circle at 20px 20px, rgba(23,23,23,.08) 1px, transparent 1px),
        linear-gradient(135deg, #efe7d2, #e4ddca);
      background-size: 24px 24px, auto;
      color: var(--ink);
      font-family: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }
    .slide {
      display: none;
      width: 1800px;
      height: 1200px;
      padding: 70px;
      position: relative;
    }
    .slide.active { display: grid; grid-template-rows: auto 1fr auto; }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 3px solid var(--line);
      background: var(--paper);
      box-shadow: 9px 9px 0 var(--line);
      padding: 20px 24px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -.04em;
    }
    .mark { font-size: 34px; }
    .number { font-size: 24px; color: #5f584f; }
    main {
      align-self: center;
      border: 3px solid var(--line);
      background: var(--paper);
      box-shadow: 14px 14px 0 var(--line);
      padding: 58px;
      min-height: 660px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    main::after {
      content: "";
      position: absolute;
      right: -130px;
      top: -130px;
      width: 430px;
      height: 430px;
      border: 3px solid var(--line);
      border-radius: 999px;
      background: radial-gradient(circle at 34% 36%, var(--green), var(--blue-soft) 44%, var(--paper) 45%);
      opacity: .85;
    }
    .kicker {
      position: relative;
      z-index: 1;
      display: inline-block;
      align-self: flex-start;
      margin: 0 0 24px;
      border: 3px solid var(--line);
      background: var(--blue-soft);
      padding: 10px 14px;
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
    }
    h1 {
      position: relative;
      z-index: 1;
      max-width: 1320px;
      margin: 0;
      font-size: 92px;
      line-height: .94;
      letter-spacing: -.08em;
    }
    .line {
      position: relative;
      z-index: 1;
      max-width: 1260px;
      margin: 34px 0 0;
      color: #5f584f;
      font-size: 34px;
      line-height: 1.32;
      font-weight: 800;
    }
    .blocks {
      position: relative;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 42px;
    }
    .blocks span {
      display: inline-flex;
      align-items: center;
      min-height: 54px;
      border: 3px solid var(--line);
      background: var(--panel);
      box-shadow: 5px 5px 0 var(--line);
      padding: 12px 16px;
      font-size: 26px;
      font-weight: 900;
    }
    footer {
      align-self: end;
      justify-self: start;
      border: 3px solid var(--line);
      background: var(--green);
      box-shadow: 9px 9px 0 var(--line);
      padding: 18px 24px;
      font-size: 34px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -.05em;
    }
  </style>
</head>
<body>
  ${renderedSlides}
  <script>
    const params = new URLSearchParams(location.search);
    const slide = params.get('slide') || '01';
    document.querySelector(\`.slide[data-slide="\${slide}"]\`)?.classList.add('active');
  </script>
</body>
</html>`;
}

async function connectToChrome() {
  const targets = await (await fetch(chromeJsonUrl)).json();
  const target = targets.find((item) => item.type === 'page');
  if (!target) {
    throw new Error(`No Chrome page target found at ${chromeJsonUrl}. Start Chrome with --remote-debugging-port=9780.`);
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', rejectOpen, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  function command(method, params = {}) {
    const id = nextId++;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveCommand, rejectCommand) => pending.set(id, { resolve: resolveCommand, reject: rejectCommand }));
  }
  return { socket, command };
}

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

await mkdir(sourceDir, { recursive: true });
await writeFile(htmlPath, renderHtml());

const { socket, command } = await connectToChrome();
await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1800,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});

for (let index = 0; index < slides.length; index += 1) {
  const number = String(index + 1).padStart(2, '0');
  await command('Page.navigate', { url: `file://${htmlPath}?slide=${number}` });
  await delay(250);
  const capture = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const slug = slides[index].title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  await writeFile(resolve(outputDir, `${number}-${slug}.png`), Buffer.from(capture.data, 'base64'));
  console.log(`${number} ${slug}`);
}

socket.close();
