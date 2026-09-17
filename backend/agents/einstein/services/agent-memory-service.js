/**
 * AGENT MEMORY SERVICE
 * Handles learning extraction, memory storage, and context retrieval
 * This is the "brain" that processes conversations and builds understanding
 */

import AgentMemory from '../models/AgentMemory.js';

/**
 * Patterns to detect important information in messages
 */
const LEARNING_PATTERNS = {
  // User introducing themselves or sharing personal info
  user_introduction: [
    /my name is\s+(\w+)/i,
    /i('m| am)\s+(\w+)/i,
    /call me\s+(\w+)/i,
    /i work (as|at|for|in)\s+(.+)/i,
    /i('m| am) (a|an)\s+(\w+)/i,
    /i live in\s+(.+)/i,
    /i('m| am) from\s+(.+)/i,
  ],

  // User preferences and likes/dislikes
  preferences: [
    /i (love|like|enjoy|prefer)\s+(.+)/i,
    /i (hate|dislike|don't like|can't stand)\s+(.+)/i,
    /my favorite\s+(\w+)\s+is\s+(.+)/i,
    /i (always|usually|often|never)\s+(.+)/i,
  ],

  // Corrections from user
  corrections: [
    /no,?\s+(actually|that's not|you're wrong|incorrect)/i,
    /i (meant|mean|said)\s+(.+)/i,
    /let me (clarify|correct|explain)/i,
    /that's not (right|correct|what i)/i,
  ],

  // User goals and challenges
  goals: [
    /i (want|need|wish) to\s+(.+)/i,
    /i('m| am) trying to\s+(.+)/i,
    /my goal is\s+(.+)/i,
    /i('m| am) working on\s+(.+)/i,
    /help me (with|to)\s+(.+)/i,
  ],

  // Emotional cues
  emotions: [
    /i('m| am) (feeling|so)\s+(happy|sad|frustrated|excited|worried|anxious|stressed)/i,
    /i (feel|felt)\s+(.+)/i,
    /this (makes|made) me\s+(happy|sad|frustrated|excited|worried|anxious|angry)/i,
  ],

  // Communication style indicators
  style: [
    /can you (be more|keep it)\s+(brief|concise|detailed|simple)/i,
    /i prefer\s+(shorter|longer|detailed|simple)\s+responses/i,
    /just give me\s+(.+)/i,
    /explain it like\s+(.+)/i,
  ],
};

/**
 * Extract potential learnings from a message
 */
export function extractLearnings(message, role = 'user') {
  const learnings = [];

  if (role !== 'user') return learnings;

  // Check each pattern category
  for (const [category, patterns] of Object.entries(LEARNING_PATTERNS)) {
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        learnings.push({
          type: mapCategoryToMemoryType(category),
          content: message.slice(0, 500), // Store the original context
          data: {
            category,
            matchedPattern: pattern.toString(),
            extractedValue: match[match.length - 1]?.trim(),
          },
          importance: getImportance(category),
          tags: [category],
        });
      }
    }
  }

  // Also detect important keywords
  const importantKeywords = extractImportantKeywords(message);
  if (importantKeywords.length > 0) {
    learnings.push({
      type: 'conversation_insight',
      content: `User mentioned: ${importantKeywords.join(', ')}`,
      data: { keywords: importantKeywords },
      importance: 4,
      tags: ['keywords', ...importantKeywords.slice(0, 5)],
    });
  }

  return learnings;
}

/**
 * Map pattern categories to memory types
 */
function mapCategoryToMemoryType(category) {
  const mapping = {
    user_introduction: 'user_fact',
    preferences: 'user_preference',
    corrections: 'correction',
    goals: 'user_fact',
    emotions: 'emotional_cue',
    style: 'user_preference',
  };
  return mapping[category] || 'conversation_insight';
}

/**
 * Get importance score for a learning type
 */
function getImportance(category) {
  const scores = {
    user_introduction: 9,
    preferences: 7,
    corrections: 8,
    goals: 8,
    emotions: 6,
    style: 7,
  };
  return scores[category] || 5;
}

/**
 * Extract important keywords from a message
 */
function extractImportantKeywords(message) {
  const stopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
    'they', 'the', 'a', 'an', 'and', 'but', 'or', 'for', 'nor', 'on', 'at',
    'to', 'from', 'by', 'is', 'am', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'how', 'when', 'where', 'why', 'with', 'about', 'just', 'only',
    'very', 'really', 'also', 'some', 'any', 'more', 'most', 'other',
  ]);

  const words = message.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const wordFreq = {};

  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Return words that appear multiple times or are capitalized in original
  return Object.keys(wordFreq)
    .filter(word => wordFreq[word] >= 2 || message.includes(word.charAt(0).toUpperCase() + word.slice(1)))
    .slice(0, 10);
}

/**
 * Process a conversation and extract/store learnings
 */
export async function processConversation(userId, agentId, messages, conversationId) {
  try {
    const memory = await AgentMemory.getOrCreate(userId, agentId);
    let newLearnings = 0;

    // Process each user message
    for (const msg of messages) {
      if (msg.role === 'user') {
        const learnings = extractLearnings(msg.content, msg.role);

        for (const learning of learnings) {
          // Check if we already have a similar memory
          const isDuplicate = memory.memories.some(m =>
            m.type === learning.type &&
            m.content.toLowerCase().includes(learning.data.extractedValue?.toLowerCase() || ''),
          );

          if (!isDuplicate) {
            await memory.addMemory({
              ...learning,
              source: {
                conversationId,
                timestamp: new Date(),
              },
            });
            newLearnings++;
          }
        }
      }
    }

    // Record the interaction
    await memory.recordInteraction();

    // Update message count
    memory.relationship.totalMessages += messages.filter(m => m.role === 'user').length;
    await memory.save();

    return {
      success: true,
      newLearnings,
      totalMemories: memory.memories.length,
    };
  } catch (error) {
    console.error('Error processing conversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build enhanced system prompt with memory context
 */
export async function buildEnhancedSystemPrompt(userId, agentId, baseSystemPrompt) {
  try {
    const memory = await AgentMemory.getOrCreate(userId, agentId);
    const memoryContext = memory.buildContextString(15);

    if (!memoryContext) {
      return baseSystemPrompt;
    }

    // Insert memory context into system prompt
    const enhancedPrompt = `${baseSystemPrompt}

---

# YOUR MEMORY OF THIS USER
${memoryContext}

---

IMPORTANT: Use your memories naturally in conversation. Don't explicitly mention that you "remember" unless the user asks. Act as if you naturally know these things about them. If memories seem outdated, gently verify with the user.`;

    return enhancedPrompt;
  } catch (error) {
    console.error('Error building enhanced prompt:', error);
    return baseSystemPrompt;
  }
}

/**
 * Generate a user summary from memories (called periodically)
 */
export async function generateUserSummary(userId, agentId) {
  try {
    const memory = await AgentMemory.getOrCreate(userId, agentId);

    // Collect key information
    const facts = memory.memories.filter(m => m.type === 'user_fact');
    const preferences = memory.memories.filter(m => m.type === 'user_preference');

    // Build summary
    let summary = '';

    if (facts.length > 0) {
      summary += 'Key facts: ' + facts.map(f => f.content).slice(0, 3).join('; ') + '. ';
    }

    if (preferences.length > 0) {
      summary += 'Preferences: ' + preferences.map(p => p.data.extractedValue || p.content).slice(0, 3).join(', ') + '. ';
    }

    if (memory.relationship.totalInteractions > 0) {
      summary += `${memory.relationship.totalInteractions} conversations. `;
    }

    memory.userSummary = summary.trim().slice(0, 1000);
    await memory.save();

    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return '';
  }
}

/**
 * Update user profile based on explicit information
 */
export async function updateUserProfile(userId, agentId, profileUpdates) {
  try {
    const memory = await AgentMemory.getOrCreate(userId, agentId);
    // Handle _memoryEnabled flag separately
    if (profileUpdates && typeof profileUpdates._memoryEnabled === 'boolean') {
      memory.memoryEnabled = profileUpdates._memoryEnabled;
      const { _memoryEnabled, ...cleanUpdates } = profileUpdates;
      await memory.updateUserProfile(cleanUpdates);
    } else {
      await memory.updateUserProfile(profileUpdates);
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get memory statistics for a user-agent relationship
 */
export async function getMemoryStats(userId, agentId) {
  try {
    const memory = await AgentMemory.findOne({ userId, agentId });

    if (!memory) {
      return {
        exists: false,
        totalMemories: 0,
        relationship: null,
      };
    }

    const memoryTypeCount = {};
    memory.memories.forEach(m => {
      memoryTypeCount[m.type] = (memoryTypeCount[m.type] || 0) + 1;
    });

    return {
      exists: true,
      totalMemories: memory.memories.length,
      memories: memory.memories || [],
      memoryTypes: memoryTypeCount,
      relationship: memory.relationship,
      userProfile: memory.userProfile,
      learningMetrics: memory.learningMetrics,
      lastInteraction: memory.relationship ? memory.relationship.lastInteraction : null,
      memoryEnabled: memory.memoryEnabled !== false,
    };
  } catch (error) {
    console.error('Error getting memory stats:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Clear memories for a user-agent pair (user requested)
 */
export async function clearMemories(userId, agentId, options = {}) {
  try {
    const memory = await AgentMemory.findOne({ userId, agentId });

    if (!memory) {
      return { success: true, message: 'No memories to clear' };
    }

    if (options.clearAll) {
      // Full reset
      memory.memories = [];
      memory.userProfile = {};
      memory.userSummary = '';
      memory.conversationPatterns = {
        preferredTopics: [],
        avoidTopics: [],
        commonQuestions: [],
        feedbackPatterns: { likes: [], dislikes: [] },
      };
      memory.learningMetrics = {
        totalLearnings: 0,
        correctPredictions: 0,
        corrections: 0,
        adaptations: 0,
      };
    } else if (options.memoryType) {
      // Clear specific type
      memory.memories = memory.memories.filter(m => m.type !== options.memoryType);
    } else if (options.olderThan) {
      // Clear old memories
      const cutoff = new Date(Date.now() - options.olderThan);
      memory.memories = memory.memories.filter(m =>
        new Date(m.source.timestamp) > cutoff,
      );
    }

    await memory.save();
    return { success: true, remainingMemories: memory.memories.length };
  } catch (error) {
    console.error('Error clearing memories:', error);
    return { success: false, error: error.message };
  }
}

export default {
  extractLearnings,
  processConversation,
  buildEnhancedSystemPrompt,
  generateUserSummary,
  updateUserProfile,
  getMemoryStats,
  clearMemories,
};
