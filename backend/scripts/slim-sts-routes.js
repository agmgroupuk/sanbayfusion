/**
 * slim-sts-routes.js
 * Trims each agent's sts-routes.js to contain only that agent's own voice config.
 * Removes all other agents' entries from ELEVENLABS_VOICES, LMNT_VOICES,
 * OPENAI_VOICES, and AGENT_VOICE_CONFIG.
 * Also removes dead fallback references.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, '../agents');

// All 18 agents' voice data
const VOICE_DATA = {
  'julie-girlfriend': {
    elevenlabs: { id: 'M7ya1YbaeFaPXljg9BpK', comment: '// Custom romantic female' },
    lmnt: 'lily',
    openai: { voice: 'shimmer', comment: '// Warm, romantic' },
    config: { gender: 'female', personality: 'romantic, caring, flirty, soft, loving girlfriend' },
  },
  'drama-queen': {
    elevenlabs: { id: 'gJx1vCzNCD1EQHT212Ls', comment: '// Custom theatrical female' },
    lmnt: 'aurora',
    openai: { voice: 'coral', comment: '// Expressive, theatrical' },
    config: { gender: 'female', personality: 'theatrical, expressive, dramatic, passionate, creative' },
  },
  'mrs-boss': {
    elevenlabs: { id: 'l4Coq6695JDX9xtLqXDE', comment: '// Custom authoritative female' },
    lmnt: 'nova',
    openai: { voice: 'sage', comment: '// Authoritative, confident' },
    config: { gender: 'female', personality: 'authoritative, confident, professional, commanding leader' },
  },
  'comedy-king': {
    elevenlabs: { id: 'UgBBYS2sOqTuMpoF3BR0', comment: '// Custom witty male' },
    lmnt: 'marcus',
    openai: { voice: 'alloy', comment: '// Cheerful, witty' },
    config: { gender: 'male', personality: 'hilarious, witty, playful, entertaining comedian' },
  },
  'chef-biew': {
    elevenlabs: { id: 'zGjIP4SZlMnY9m93k97r', comment: '// Custom passionate female' },
    lmnt: 'sophia',
    openai: { voice: 'coral', comment: '// Passionate, creative' },
    config: { gender: 'female', personality: 'passionate, creative, warm, expressive Asian cuisine master' },
  },
  'emma-emotional': {
    elevenlabs: { id: 'EXAVITQu4vr4xnSDxMaL', comment: '// Bella - soft, caring, empathetic' },
    lmnt: 'mia',
    openai: { voice: 'shimmer', comment: '// Soft, empathetic' },
    config: { gender: 'female', personality: 'empathetic, supportive, understanding, warm, caring' },
  },
  'professor-astrology': {
    elevenlabs: { id: 'LcfcDJNUP1GQjkzn1xUU', comment: '// Emily - calm, mystical, wise' },
    lmnt: 'stella',
    openai: { voice: 'verse', comment: '// Mystical, wise' },
    config: { gender: 'female', personality: 'mystical, wise, cosmic, intuitive, spiritual guide' },
  },
  'nid-gaming': {
    elevenlabs: { id: 'MF3mGyEYCl7XYWbV9V6O', comment: '// Elli - young, energetic, competitive' },
    lmnt: 'zoe',
    openai: { voice: 'ballad', comment: '// Energetic, young' },
    config: { gender: 'female', personality: 'excited, energetic, competitive, fun pro gamer girl' },
  },
  'einstein': {
    elevenlabs: { id: 'onwK4e9ZLuTAKqWW03F9', comment: '// Daniel - wise, authoritative, intellectual' },
    lmnt: 'daniel',
    openai: { voice: 'echo', comment: '// Wise, intellectual' },
    config: { gender: 'male', personality: 'wise, thoughtful, intellectual, curious genius' },
  },
  'fitness-guru': {
    elevenlabs: { id: 'TxGEqnHWrfWFTfGW9XjX', comment: '// Josh - deep, motivational, energetic' },
    lmnt: 'ryan',
    openai: { voice: 'ash', comment: '// Energetic, motivational' },
    config: { gender: 'male', personality: 'motivational, energetic, encouraging fitness coach' },
  },
  'tech-wizard': {
    elevenlabs: { id: 'N2lVS1w4EtoT3dr4eOWO', comment: '// Callum - clear, helpful, knowledgeable' },
    lmnt: 'alex',
    openai: { voice: 'echo', comment: '// Clear, helpful' },
    config: { gender: 'male', personality: 'helpful, knowledgeable, patient tech expert' },
  },
  'lazy-pawn': {
    elevenlabs: { id: 'yoZ06aMxZJJ28mfd3POQ', comment: '// Sam - raspy, laid-back, relaxed' },
    lmnt: 'max',
    openai: { voice: 'verse', comment: '// Laid-back, relaxed' },
    config: { gender: 'male', personality: 'laid-back, relaxed, humorous, unmotivated chess piece' },
  },
  'knight-logic': {
    elevenlabs: { id: 'pNInz6obpgDQGcFmaJgB', comment: '// Adam - deep, strategic, analytical' },
    lmnt: 'oliver',
    openai: { voice: 'echo', comment: '// Analytical, strategic' },
    config: { gender: 'male', personality: 'analytical, strategic, calm, precise L-shaped thinker' },
  },
  'bishop-burger': {
    elevenlabs: { id: '2EiwWnXFnvU5JabPnv8n', comment: '// Clyde - wise, spiritual, thoughtful' },
    lmnt: 'james',
    openai: { voice: 'sage', comment: '// Wise, thoughtful' },
    config: { gender: 'male', personality: 'strategic, spiritual, wise diagonal thinker' },
  },
  'rook-jokey': {
    elevenlabs: { id: 'IKne3meq5aSn9XLyUdCD', comment: '// Charlie - casual, witty, direct' },
    lmnt: 'charlie',
    openai: { voice: 'alloy', comment: '// Witty, playful' },
    config: { gender: 'male', personality: 'punny, direct, witty, straight-line joker' },
  },
  'travel-buddy': {
    elevenlabs: { id: 'ErXwobaYiN019PkySvjV', comment: '// Antoni - warm, adventurous, enthusiastic' },
    lmnt: 'leo',
    openai: { voice: 'coral', comment: '// Adventurous, warm' },
    config: { gender: 'male', personality: 'adventurous, enthusiastic, knowledgeable explorer' },
  },
  'ben-sega': {
    elevenlabs: { id: 'VR6AewLTigWG4xSOukaG', comment: '// Arnold - crisp, nostalgic, playful' },
    lmnt: 'sam',
    openai: { voice: 'ballad', comment: '// Nostalgic, playful' },
    config: { gender: 'male', personality: 'retro, nostalgic, playful gaming historian' },
  },
  'chess-player': {
    elevenlabs: { id: 'pqHfZKP75CvOlQylNhV4', comment: '// Bill - thoughtful, patient, educational' },
    lmnt: 'william',
    openai: { voice: 'sage', comment: '// Patient, educational' },
    config: { gender: 'male', personality: 'thoughtful, strategic, patient chess teacher' },
  },
};

for (const [slug, d] of Object.entries(VOICE_DATA)) {
  const file = join(AGENTS_DIR, slug, 'routes', 'sts-routes.js');
  let content = readFileSync(file, 'utf8');

  // 1. Replace entire ELEVENLABS_VOICES block
  content = content.replace(
    /const ELEVENLABS_VOICES = \{[\s\S]*?\};/,
    `const ELEVENLABS_VOICES = {\n  '${slug}': '${d.elevenlabs.id}',  ${d.elevenlabs.comment}\n};`
  );

  // 2. Replace entire LMNT_VOICES block
  content = content.replace(
    /const LMNT_VOICES = \{[\s\S]*?\};/,
    `const LMNT_VOICES = {\n  '${slug}': '${d.lmnt}',\n};`
  );

  // 3. Replace entire OPENAI_VOICES block
  content = content.replace(
    /const OPENAI_VOICES = \{[\s\S]*?\};/,
    `const OPENAI_VOICES = {\n  '${slug}': '${d.openai.voice}',  ${d.openai.comment}\n};`
  );

  // 4. Replace entire AGENT_VOICE_CONFIG block
  const agentConfigBlock = [
    `const AGENT_VOICE_CONFIG = {`,
    `  '${slug}': {`,
    `    gender: '${d.config.gender}',`,
    `    openaiVoice: OPENAI_VOICES['${slug}'],`,
    `    elevenlabsVoice: ELEVENLABS_VOICES['${slug}'],`,
    `    lmntVoice: LMNT_VOICES['${slug}'],`,
    `    personality: '${d.config.personality}'`,
    `  }`,
    `};`,
  ].join('\n');

  content = content.replace(
    /const AGENT_VOICE_CONFIG = \{[\s\S]*?\};/,
    agentConfigBlock
  );

  // 5. Remove dead fallback: || AGENT_VOICE_CONFIG['julie-girlfriend']
  content = content.replace(
    / \|\| AGENT_VOICE_CONFIG\['julie-girlfriend'\]/g,
    ''
  );

  // 6. Remove dead fallback: || STRICT_AGENT_PROMPTS['default']
  content = content.replace(
    / \|\| STRICT_AGENT_PROMPTS\['default'\]/g,
    ''
  );

  writeFileSync(file, content, 'utf8');
  console.log(`[OK] ${slug}`);
}

console.log('\nDone. All 18 sts-routes.js files trimmed.');
