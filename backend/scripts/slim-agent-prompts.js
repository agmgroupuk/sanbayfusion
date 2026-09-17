/**
 * Script: slim-agent-prompts.js
 *
 * Each agent's lib/agent-strict-prompts.js currently contains ALL 18 agents'
 * prompts, temperatures, and provider configs (4,248 lines) — identical across
 * every agent folder. This script trims each one to contain ONLY that agent's
 * own data (~50 lines each).
 *
 * Run from backend/ directory:
 *   node scripts/slim-agent-prompts.js
 */

import { writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(__dirname, '..', 'agents');

const AGENTS = [
  'ben-sega', 'bishop-burger', 'chef-biew', 'chess-player',
  'comedy-king', 'drama-queen', 'einstein', 'emma-emotional',
  'fitness-guru', 'julie-girlfriend', 'knight-logic', 'lazy-pawn',
  'mrs-boss', 'nid-gaming', 'professor-astrology', 'rook-jokey',
  'tech-wizard', 'travel-buddy',
];

// Load the full prompts data from ben-sega (all files are identical)
const sourceFile = new URL(
  `file://${path.join(AGENTS_DIR, 'ben-sega', 'lib', 'agent-strict-prompts.js')}`
).href;

const { STRICT_AGENT_PROMPTS, AGENT_TEMPERATURES, AGENT_PROVIDERS } =
  await import(sourceFile);

// Serialize an object to JS source with single-quoted keys
function jsObj(obj, indent = 3) {
  return JSON.stringify(obj, null, indent)
    .replace(/"([^"]+)":/g, "'$1':");
}

// Wrap a string value as a JSON string literal (handles all escaping)
function jsStr(str) {
  return JSON.stringify(str);
}

let written = 0;
let skipped = 0;

for (const slug of AGENTS) {
  const filePath = path.join(AGENTS_DIR, slug, 'lib', 'agent-strict-prompts.js');

  if (!existsSync(filePath)) {
    console.warn(`[SKIP] ${slug}: file not found at ${filePath}`);
    skipped++;
    continue;
  }

  const agentPrompt    = STRICT_AGENT_PROMPTS[slug];
  const defaultPrompt  = STRICT_AGENT_PROMPTS['default'];
  const agentTemp      = AGENT_TEMPERATURES[slug];
  const defaultProv    = AGENT_PROVIDERS['default'];
  const agentProv      = AGENT_PROVIDERS[slug];

  const promptsSection = [
    `const STRICT_AGENT_PROMPTS = {`,
    agentPrompt
      ? `   '${slug}': ${jsStr(agentPrompt)},`
      : `   // No dedicated prompt for '${slug}'`,
    `};`,
  ].join('\n');

  const tempsSection = [
    `const AGENT_TEMPERATURES = {`,
    agentTemp !== undefined
      ? `   '${slug}': ${agentTemp},`
      : `   // No specific temperature for '${slug}' — default applies`,
    `};`,
  ].join('\n');

  const providersSection = [
    `const AGENT_PROVIDERS = {`,
    agentProv
      ? `   '${slug}': ${jsObj(agentProv)},`
      : `   // No specific provider for '${slug}' — 'default' is used as fallback`,
    `};`,
  ].join('\n');

  const output = [
    `/**`,
    ` * Agent: ${slug} — Strict Prompts`,
    ` * Contains ONLY this agent's prompt, temperature, and provider config.`,
    ` * Trimmed from the shared monolith — all other agents' data removed.`,
    ` */`,
    ``,
    promptsSection,
    ``,
    tempsSection,
    ``,
    providersSection,
    ``,
    `const agent_strict_prompts_default = STRICT_AGENT_PROMPTS;`,
    `export {`,
    `   AGENT_TEMPERATURES,`,
    `   AGENT_PROVIDERS,`,
    `   STRICT_AGENT_PROMPTS,`,
    `   agent_strict_prompts_default as default,`,
    `};`,
    ``,
  ].join('\n');

  writeFileSync(filePath, output, 'utf8');
  console.log(`[OK] ${slug}`);
  written++;
}

console.log(`\nDone: ${written} files written, ${skipped} skipped.`);
