/**
 * LabExperiment - Prisma Types
 */

// Experiment types
export const EXPERIMENT_TYPES = [
  'image_generation',
  'neural_art',
  'story_generation',
  'music_generation',
  'voice_generation',
  'emotion_analysis',
  'personality_analysis',
  'dream_analysis',
  'future_prediction',
  'battle_arena',
  'debate_arena'
];

// Experiment statuses
export const EXPERIMENT_STATUSES = ['pending', 'processing', 'completed', 'failed'];

/**
 * @typedef {Object} LabExperiment
 * @property {string} id
 * @property {string} userId
 * @property {string} type
 * @property {string} status
 * @property {Object} input
 * @property {Object} output
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */
