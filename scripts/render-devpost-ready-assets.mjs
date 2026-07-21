import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const root = process.cwd();
const outputDir = resolve(root, 'artifacts/devpost-ready');
const stillDir = resolve(outputDir, 'stills');
const videoDir = resolve(outputDir, 'video');
const sourceDir = resolve(outputDir, 'source');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const slides = [
  {
    title: 'Free2PA',
    kicker: 'Developer Tools',
    line: 'C2PA-style provenance with ad-hoc verifiers, so teams can set up their own trust group around agent controls.',
    blocks: ['SOUL.md', 'AGENTS.md', 'SKILLS.md', 'TOOLS.md'],
    result: 'LOAD before context',
    narration: 'Free2PA is C2PA-style provenance with ad-hoc verifiers, so teams can set up their own trust group around the files that steer their agents.',
  },
  {
    title: 'Agent control files are supply-chain inputs.',
    kicker: 'Problem',
    line: 'A one-line edit to a prompt, skill, policy, or tool manifest can change what an agent does before the model call starts.',
    blocks: ['prompts', 'skills', 'policies', 'tool manifests'],
    result: 'Verify before read',
    narration: 'Agents increasingly load plain text files that act like code: prompts, skills, policies, tool manifests, and files like SOUL dot M D or AGENTS dot M D.',
  },
  {
    title: 'Hello World shows the product in miniature.',
    kicker: 'Live demo',
    line: 'A tiny app reads SOUL.md, asks Free2PA to verify it, then says hello only after the load gate returns.',
    blocks: ['👋 Say Hello', 'SOUL.md', 'model context'],
    result: 'User sees a real app',
    narration: 'The public demo opens with a tiny Hello World agent. The left phone is the app. The right phone is the Free2PA verify console.',
  },
  {
    title: 'The app asks one question.',
    kicker: 'Load boundary',
    line: 'May this exact agent control file enter model context right now?',
    blocks: ['current file', 'signed receipt', 'ad-hoc verifier'],
    result: 'LOAD or reject',
    narration: 'At the load boundary, the host asks one narrow question: may this exact control file enter model context right now?',
  },
  {
    title: 'Check 1: receipt signature.',
    kicker: 'Cryptographic proof',
    line: 'The sidecar receipt must be signed correctly by the embedded publisher certificate.',
    blocks: ['ES256', 'canonical JSON', 'X.509 cert'],
    result: 'Signature PASS',
    narration: 'First, Free2PA checks that the receipt signature is valid. A malformed or forged receipt cannot load.',
  },
  {
    title: 'Check 2: file matches receipt.',
    kicker: 'Tamper evidence',
    line: 'The bytes on disk must match the SHA-256 hash recorded in the signed receipt.',
    blocks: ['current SOUL.md', 'signed hash', 'exact bytes'],
    result: 'Integrity PASS',
    narration: 'Second, it checks that the current file bytes match the signed hash in the receipt.',
  },
  {
    title: 'Check 3: publisher trusted here.',
    kicker: 'Local trust group',
    line: 'Each team can create its own local trust group around the control files its agents load.',
    blocks: ['hello-group.crt', 'local-console.crt', 'revocable trust'],
    result: 'Publisher PASS',
    narration: 'Third, it checks local publisher trust. Each team can create its own ad-hoc verifier and trust group around the control files its agents load.',
  },
  {
    title: 'Only verified text reaches context.',
    kicker: 'Result',
    line: 'When signature, file hash, certificate, and publisher trust pass, Free2PA returns LOAD.',
    blocks: ['signature PASS', 'hash PASS', 'publisher PASS'],
    result: 'LOAD',
    narration: 'When every deterministic check passes, Free2PA returns LOAD. Only then can the verified control file reach the model.',
  },
  {
    title: 'The agent replies after the gate.',
    kicker: 'Visible proof',
    line: 'The user sees the Hello World response. The provenance check happened before the model saw SOUL.md.',
    blocks: ['verified SOUL.md', 'agent reply', 'safe context'],
    result: 'Hello, vibrant world!',
    narration: 'The user simply sees the app answer hello. The important part is that the provenance check happened first.',
  },
  {
    title: 'Saving an edit is not approval.',
    kicker: 'Approval semantics',
    line: 'The demo editor can flip one control word from Never to Always. That saved revision is unsigned until the local console signs it.',
    blocks: ['Never → Always', 'saved locally', 'not signed'],
    result: 'New signature required',
    narration: 'Now edit the control file. Saving an edit is not approval. The new revision is pending until a trusted local publisher signs it.',
  },
  {
    title: 'Unsigned changes stay out.',
    kicker: 'Fail closed',
    line: 'If SOUL.md changed after its signature, the current bytes no longer match the receipt.',
    blocks: ['signature PASS', 'publisher PASS', 'hash FAIL'],
    result: 'CONTENT_CHANGED',
    narration: 'On the next run, the signature and publisher can still be valid, but the file hash fails because the file changed after signing.',
  },
  {
    title: 'Repair uses the signed original.',
    kicker: 'Restore + report',
    line: 'For critical files, the host can restore the exact approved original embedded in the trusted receipt and report the rejected edit.',
    blocks: ['restore signed original', 'preserve evidence', 'run verified file'],
    result: 'RESTORE + RUN + REPORT',
    narration: 'With repair policy, the host restores the signed original from the trusted receipt, reports the rejected edit, and runs the verified version.',
  },
  {
    title: 'Intentional edits get a new receipt.',
    kicker: 'Trusted approval',
    line: 'If the change is intended, the local Free2PA console signs a new receipt. The new version can then LOAD.',
    blocks: ['local key', 'new receipt', 'trusted publisher'],
    result: 'Approved revision',
    narration: 'If the edit is intentional, the local console signs a new receipt. Only then does the changed control file become the approved version.',
  },
  {
    title: 'Install where your app reads files.',
    kicker: 'Developer toolkit',
    line: 'Add trusted publisher certificates around your agent controls, then verify them through Node, CLI, HTTP, MCP, CI, or Codex.',
    blocks: ['loadVerifiedFile()', 'free2pa verify', 'MCP verify_asset', 'GitHub Action', 'Codex skill'],
    result: 'Ship the load gate',
    narration: 'Developers add Free2PA where their app already reads prompts, skills, policies, or tool manifests. They admit trusted publisher certificates around those controls, then verify through Node, CLI, HTTP, MCP, CI, or a Codex retrofit skill.',
  },
  {
    title: 'Codex built the product; GPT-5.6 audits behavior.',
    kicker: 'OpenAI Build Week',
    line: 'Codex helped build the CLI, load gate, MCP tool, tests, demo, docs, packaging, and submission. GPT-5.6 reviews behavior; provenance decides LOAD.',
    blocks: ['Codex implementation', 'GPT-5.6 audit', 'cryptographic gate'],
    result: 'Developer Tools category',
    narration: 'Codex helped turn the prototype into a shippable developer tool: CLI, load gate, MCP, tests, demo, docs, and packaging. GPT 5.6 is optional behavioral audit. It explains risk, but the provenance gate decides LOAD or reject.',
  },
];

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54);
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, size, color = '#171717', weight = 800, lineHeight = 1.18) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${size}" font-weight="${weight}">
    ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${esc(line)}</tspan>`).join('\n')}
  </text>`;
}

function logoMark(x, y, size, color = '#171717') {
  const scale = size / 64;
  return `<g transform="translate(${x} ${y}) scale(${scale})" color="${color}">
    <path d="M18 11.8A23 23 0 1 1 18 52.2" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="square"/>
    <path d="M3.5 23.5h15.5L29 32M3.5 40.5h15.5L29 32" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="square" stroke-linejoin="miter"/>
    <circle cx="34" cy="32" r="6" fill="currentColor"/>
  </g>`;
}

function renderSlide(slide, index, { width, height, video = false }) {
  const scale = width / 1800;
  const pad = 70 * scale;
  const topHeight = 86 * scale;
  const mainY = video ? 185 * scale : 250 * scale;
  const mainHeight = video ? 665 * scale : 660 * scale;
  const number = String(index + 1).padStart(2, '0');
  const titleLines = wrapText(slide.title, video ? 25 : 27).slice(0, 3);
  const lineLines = wrapText(slide.line, video ? 64 : 62).slice(0, 3);
  const blockRows = Math.ceil(slide.blocks.length / 3);
  const blockStartY = mainY + mainHeight - (blockRows * 62 + 42) * scale;
  const blocks = slide.blocks.map((block, blockIndex) => {
    const x = pad + 58 * scale + (blockIndex % 3) * 430 * scale;
    const y = blockStartY + Math.floor(blockIndex / 3) * 62 * scale;
    const w = Math.min(390 * scale, Math.max(180 * scale, (block.length * 17 + 40) * scale));
    return `<rect x="${x}" y="${y}" width="${w}" height="${50 * scale}" fill="#f7f1de" stroke="#171717" stroke-width="${3 * scale}"/>
      <text x="${x + 16 * scale}" y="${y + 33 * scale}" fill="#171717" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${24 * scale}" font-weight="900">${esc(block)}</text>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <pattern id="dots" x="0" y="0" width="${24 * scale}" height="${24 * scale}" patternUnits="userSpaceOnUse">
        <circle cx="${18 * scale}" cy="${18 * scale}" r="${1.25 * scale}" fill="rgba(23,23,23,.16)"/>
      </pattern>
      <filter id="shadow"><feDropShadow dx="${9 * scale}" dy="${9 * scale}" stdDeviation="0" flood-color="#171717"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="#e9e2cf"/>
    <rect width="100%" height="100%" fill="url(#dots)"/>
    <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${topHeight}" fill="#fffdf4" stroke="#171717" stroke-width="${3 * scale}" filter="url(#shadow)"/>
    ${logoMark(pad + 22 * scale, pad + 18 * scale, 50 * scale)}
    <text x="${pad + 88 * scale}" y="${pad + 56 * scale}" fill="#171717" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${34 * scale}" font-weight="900">Free2PA</text>
    <text x="${pad + 250 * scale}" y="${pad + 56 * scale}" fill="#6a6254" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${20 * scale}" font-weight="800">free2pa.org</text>
    <text x="${width - pad - 105 * scale}" y="${pad + 54 * scale}" fill="#6a6254" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${24 * scale}" font-weight="900">${number}/15</text>
    <rect x="${pad}" y="${mainY}" width="${width - pad * 2}" height="${mainHeight}" fill="#fffdf4" stroke="#171717" stroke-width="${3 * scale}" filter="url(#shadow)"/>
    <rect x="${pad + 58 * scale}" y="${mainY + 58 * scale}" width="${Math.max(210, slide.kicker.length * 18) * scale}" height="${48 * scale}" fill="#dfeaff" stroke="#171717" stroke-width="${3 * scale}"/>
    <text x="${pad + 72 * scale}" y="${mainY + 91 * scale}" fill="#171717" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${23 * scale}" font-weight="900">${esc(slide.kicker.toUpperCase())}</text>
    ${textBlock(titleLines, pad + 58 * scale, mainY + 190 * scale, video ? 62 * scale : 78 * scale, '#171717', 900, .98)}
    ${textBlock(lineLines, pad + 58 * scale, mainY + (video ? 420 : 440) * scale, video ? 30 * scale : 34 * scale, '#5f584f', 800, 1.32)}
    ${blocks}
    <rect x="${pad}" y="${height - pad - 76 * scale}" width="${Math.min(width - pad * 2, Math.max(430 * scale, slide.result.length * 22 * scale))}" height="${76 * scale}" fill="#42dc8d" stroke="#171717" stroke-width="${3 * scale}" filter="url(#shadow)"/>
    <text x="${pad + 24 * scale}" y="${height - pad - 28 * scale}" fill="#171717" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${31 * scale}" font-weight="900">${esc(slide.result.toUpperCase())}</text>
    ${index === slides.length - 1 ? `<text x="${width - pad - 245 * scale}" y="${height - pad - 24 * scale}" fill="#171717" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${25 * scale}" font-weight="900">free2pa.org</text>` : ''}
  </svg>`;
}

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', rejectRun);
    child.on('close', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} exited with ${code}`));
    });
  });
}

async function synthesizeWithAzureSpeech({ text, outputPath }) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_REGION;
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT ||
    (region ? `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1` : null);
  const voice = process.env.AZURE_SPEECH_VOICE || 'en-US-Ava:DragonHDLatestNeural';
  const style = process.env.AZURE_SPEECH_STYLE || 'confident';
  if (!key || !endpoint) {
    throw new Error('Azure Speech narration requires AZURE_SPEECH_KEY and AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT.');
  }
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${esc(voice)}">
    <mstts:express-as style="${esc(style)}">
      ${esc(text)}
    </mstts:express-as>
  </voice>
</speak>`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
      'User-Agent': 'free2pa-devpost-renderer',
    },
    body: ssml,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => `${response.status} ${response.statusText}`);
    throw new Error(`Azure Speech synthesis failed: ${response.status} ${response.statusText} ${detail}`.trim());
  }
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
}

async function renderWithChrome(svgPath, pngPath, width, height) {
  await run(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    `file://${svgPath}`,
  ]);
}

await rm(stillDir, { recursive: true, force: true });
await rm(videoDir, { recursive: true, force: true });
await rm(sourceDir, { recursive: true, force: true });
await rm(resolve(outputDir, 'Free2PA-Devpost-15-stills.zip'), { force: true });
await rm(resolve(outputDir, 'Free2PA-Devpost-contact-sheet.png'), { force: true });
await rm(resolve(outputDir, 'Free2PA-Devpost-demo.mp4'), { force: true });
await mkdir(stillDir, { recursive: true });
await mkdir(videoDir, { recursive: true });
await mkdir(sourceDir, { recursive: true });

const stillPaths = [];
const videoFramePaths = [];
for (let index = 0; index < slides.length; index += 1) {
  const number = String(index + 1).padStart(2, '0');
  const name = `${number}-${slug(slides[index].title)}`;
  const stillSvg = resolve(sourceDir, `${name}-still.svg`);
  const stillPng = resolve(stillDir, `${name}.png`);
  const videoSvg = resolve(sourceDir, `${name}-video.svg`);
  const videoPng = resolve(videoDir, `${name}.png`);
  await writeFile(stillSvg, renderSlide(slides[index], index, { width: 1800, height: 1200 }));
  await writeFile(videoSvg, renderSlide(slides[index], index, { width: 1920, height: 1080, video: true }));
  await renderWithChrome(stillSvg, stillPng, 1800, 1200);
  await renderWithChrome(videoSvg, videoPng, 1920, 1080);
  stillPaths.push(stillPng);
  videoFramePaths.push(videoPng);
  console.log(`rendered ${basename(stillPng)}`);
}

await run('ffmpeg', [
  '-y',
  '-pattern_type', 'glob',
  '-i', resolve(stillDir, '*.png'),
  '-vf', 'scale=360:240,tile=5x3:padding=18:margin=18:color=0xe9e2cfff',
  '-frames:v', '1',
  '-update', '1',
  resolve(outputDir, 'Free2PA-Devpost-contact-sheet.png'),
]);

const narration = `${slides.map((slide) => slide.narration).join(' ')} Free2PA gives agent developers a simple rule: signed and trusted control files load; changed or untrusted files do not.`;
const narrationPath = resolve(videoDir, 'Free2PA-demo-narration.txt');
const audioPath = resolve(videoDir, 'Free2PA-demo-narration.wav');
await writeFile(narrationPath, narration);
await synthesizeWithAzureSpeech({ text: narration, outputPath: audioPath });

const concatPath = resolve(videoDir, 'slideshow.txt');
const duration = 9.6;
const concat = videoFramePaths
  .map((framePath) => `file '${framePath.replaceAll("'", "'\\''")}'\nduration ${duration}`)
  .join('\n') + `\nfile '${videoFramePaths.at(-1).replaceAll("'", "'\\''")}'\n`;
await writeFile(concatPath, concat);

await run('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatPath,
  '-i', audioPath,
  '-vf', 'fps=30,format=yuv420p',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-c:a', 'aac',
  '-b:a', '160k',
  '-shortest',
  '-movflags', '+faststart',
  resolve(outputDir, 'Free2PA-Devpost-demo.mp4'),
]);

await run('zip', ['-j', resolve(outputDir, 'Free2PA-Devpost-15-stills.zip'), ...stillPaths]);

console.log(`\nAssets written to ${outputDir}`);
