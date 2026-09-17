/**
 * PRISMA MODEL ADAPTERS
 * Provides Mongoose-compatible interface for database operations using Prisma
 * All models use PostgreSQL via Prisma ORM
 * 
 * Supports both:
 * - Static methods: Model.findById(id), Model.findOne(query)
 * - Instance methods: new Model(data), instance.save()
 */

import { prisma } from '../lib/prisma.js';

// Helper to convert MongoDB query operators to Prisma
function convertMongoToPrisma(query) {
  const where = {};
  for (const [key, value] of Object.entries(query)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Handle MongoDB operators
      const prismaOp = {};
      if (value.$gte) prismaOp.gte = value.$gte;
      if (value.$lte) prismaOp.lte = value.$lte;
      if (value.$gt) prismaOp.gt = value.$gt;
      if (value.$lt) prismaOp.lt = value.$lt;
      if (value.$ne) prismaOp.not = value.$ne;
      if (value.$in) prismaOp.in = value.$in;
      if (value.$regex) {
        // Convert MongoDB $regex to Prisma startsWith/contains/endsWith
        const pattern = value.$regex.toString();
        if (pattern.startsWith('^')) {
          prismaOp.startsWith = pattern.slice(1);
        } else if (pattern.endsWith('$')) {
          prismaOp.endsWith = pattern.slice(0, -1);
        } else {
          prismaOp.contains = pattern;
        }
      }
      if (value.$exists !== undefined) {
        // Handle $exists - map to isNot null or is null
        prismaOp[value.$exists ? 'not' : 'equals'] = value.$exists ? null : null;
        // Actually for Prisma, we should skip this as it's a different paradigm
        // Just ignore $exists and return all records
        continue;
      }
      if (Object.keys(prismaOp).length > 0) {
        where[key] = prismaOp;
      } else {
        where[key] = value;
      }
    } else {
      where[key] = value;
    }
  }
  return where;
}

// ============================================
// QUERY BUILDER - Provides Mongoose-style chaining for find() queries
// ============================================
class QueryBuilder {
  constructor(promise, AdapterClass = null) {
    this._promise = promise;
    this._AdapterClass = AdapterClass;
    this._sortOptions = null;
    this._limitValue = null;
    this._skipValue = null;
    this._populateFields = [];
    this._selectFields = null;
  }

  // Chainable methods (no-op for Prisma but allow chaining)
  populate(field, select) {
    this._populateFields.push({ field, select });
    return this;
  }

  sort(options) {
    this._sortOptions = options;
    return this;
  }

  limit(value) {
    this._limitValue = parseInt(value);
    return this;
  }

  skip(value) {
    this._skipValue = parseInt(value);
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  lean() {
    // No-op for Prisma - always returns plain objects
    return this;
  }

  // Execute the query with all options applied
  async then(resolve, reject) {
    try {
      let results = await this._promise;

      // Apply sort in JavaScript
      if (this._sortOptions) {
        results = this._applySorting(results);
      }

      // Apply skip
      if (this._skipValue) {
        results = results.slice(this._skipValue);
      }

      // Apply limit
      if (this._limitValue) {
        results = results.slice(0, this._limitValue);
      }

      resolve(results);
    } catch (error) {
      reject(error);
    }
  }

  _applySorting(results) {
    if (!this._sortOptions || !Array.isArray(results)) return results;

    return [...results].sort((a, b) => {
      for (const [field, direction] of Object.entries(this._sortOptions)) {
        const dir = direction === -1 || direction === 'desc' ? -1 : 1;
        const aVal = this._getNestedValue(a, field);
        const bVal = this._getNestedValue(b, field);

        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
      }
      return 0;
    });
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }
}

// ============================================
// USER MODEL ADAPTER
// ============================================
class UserAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.user.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.user.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, ...data } = this;
    return data;
  }

  static async findById(id) {
    const result = await prisma.user.findUnique({ where: { id } });
    return result ? Object.assign(new UserAdapter(result), { _isNew: false }) : null;
  }

  static async findByEmail(email) {
    const result = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return result ? Object.assign(new UserAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.email) where.email = query.email.toLowerCase();
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query._id) where.id = query._id;
    if (query.id) where.id = query.id;
    const result = await prisma.user.findFirst({ where: convertMongoToPrisma(where) });
    return result ? Object.assign(new UserAdapter(result), { _isNew: false }) : null;
  }

  static async findMany(query = {}) {
    const results = await prisma.user.findMany({ where: convertMongoToPrisma(query) });
    return results.map(r => Object.assign(new UserAdapter(r), { _isNew: false }));
  }

  static async countDocuments(query = {}) {
    return prisma.user.count({ where: convertMongoToPrisma(query) });
  }

  static async create(data) {
    const result = await prisma.user.create({ data });
    return Object.assign(new UserAdapter(result), { _isNew: false });
  }

  static async updateOne(query, update) {
    const where = {};
    if (query._id) where.id = query._id;
    if (query.id) where.id = query.id;
    if (query.email) where.email = query.email.toLowerCase();
    return prisma.user.updateMany({ where, data: update.$set || update });
  }
}

// ============================================
// AGENT MODEL ADAPTER
// ============================================
class AgentAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.agent.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.agent.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, ...data } = this;
    return data;
  }

  static async findById(id) {
    const result = await prisma.agent.findUnique({ where: { id } });
    return result ? Object.assign(new AgentAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.agentId) where.agentId = query.agentId;
    if (query.id) where.id = query.id;
    if (query._id) where.id = query._id;
    if (query.status) where.status = query.status;
    const result = await prisma.agent.findFirst({ where });
    return result ? Object.assign(new AgentAdapter(result), { _isNew: false }) : null;
  }

  static async find(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.isActive !== undefined) where.status = query.isActive ? 'active' : 'deprecated';
    const results = await prisma.agent.findMany({ where, orderBy: { name: 'asc' } });
    return results.map(r => Object.assign(new AgentAdapter(r), { _isNew: false }));
  }

  static async countDocuments(query = {}) {
    return prisma.agent.count({ where: convertMongoToPrisma(query) });
  }

  static async create(data) {
    const result = await prisma.agent.create({ data });
    return Object.assign(new AgentAdapter(result), { _isNew: false });
  }
}

// ============================================
// AGENT MEMORY MODEL ADAPTER
// ============================================
class AgentMemoryAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
    // Parse memories from JSON if it's a string
    if (typeof this.memories === 'string') {
      try { this.memories = JSON.parse(this.memories); } catch { this.memories = []; }
    }
    if (!Array.isArray(this.memories)) this.memories = [];
    // Parse summary metadata (stores userProfile, relationship, learningMetrics, etc.)
    this._meta = {};
    if (this.summary) {
      try { this._meta = JSON.parse(this.summary); } catch { this._meta = {}; }
    }
    this.userProfile = this._meta.userProfile || {};
    this.relationship = this._meta.relationship || { totalInteractions: 0, lastInteraction: null, totalMessages: 0 };
    this.learningMetrics = this._meta.learningMetrics || { totalLearnings: 0, correctPredictions: 0, corrections: 0, adaptations: 0 };
    this.conversationPatterns = this._meta.conversationPatterns || { preferredTopics: [], avoidTopics: [], commonQuestions: [], feedbackPatterns: { likes: [], dislikes: [] } };
    this.userSummary = this._meta.userSummary || '';
    this.memoryEnabled = this._meta.memoryEnabled !== false; // default true
  }

  async save() {
    // Sync metadata back to summary field
    this._meta = {
      userProfile: this.userProfile || {},
      relationship: this.relationship || {},
      learningMetrics: this.learningMetrics || {},
      conversationPatterns: this.conversationPatterns || {},
      userSummary: this.userSummary || '',
      memoryEnabled: this.memoryEnabled !== false,
    };
    this.summary = JSON.stringify(this._meta);
    this.totalMemories = Array.isArray(this.memories) ? this.memories.length : 0;

    if (this._isNew) {
      const result = await prisma.agentMemory.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.agentMemory.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, _meta, userProfile, relationship, learningMetrics, conversationPatterns, userSummary, memoryEnabled, id, createdAt, updatedAt, ...data } = this;
    return data;
  }

  /** Add a memory entry to the memories array */
  async addMemory(entry) {
    if (!Array.isArray(this.memories)) this.memories = [];
    this.memories.push({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: entry.type || 'conversation_insight',
      content: entry.content || '',
      importance: entry.importance || 5,
      tags: entry.tags || [],
      data: entry.data || {},
      source: entry.source || { timestamp: new Date() },
      createdAt: new Date().toISOString(),
    });
    this.totalMemories = this.memories.length;
    this.learningMetrics.totalLearnings = (this.learningMetrics.totalLearnings || 0) + 1;
    await this.save();
    return this;
  }

  /** Record an interaction (updates relationship tracking) */
  async recordInteraction() {
    this.relationship.totalInteractions = (this.relationship.totalInteractions || 0) + 1;
    this.relationship.lastInteraction = new Date().toISOString();
    this.lastAccessed = new Date();
    return this;
  }

  /** Update the user profile (name, age, gender, nationality, etc.) */
  async updateUserProfile(updates) {
    // Enforce 18+ age requirement on the server side
    if (updates.dateOfBirth) {
      const dob = new Date(updates.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        throw new Error('User must be at least 18 years old');
      }
    }
    this.userProfile = { ...this.userProfile, ...updates };
    await this.save();
    return this;
  }

  /** Build a context string from top memories for system prompt injection */
  buildContextString(limit = 15) {
    if (!this.memories || this.memories.length === 0) return '';

    const sorted = [...this.memories]
      .sort((a, b) => (b.importance || 5) - (a.importance || 5))
      .slice(0, limit);

    let ctx = '';

    // Add user profile context
    if (this.userProfile && Object.keys(this.userProfile).length > 0) {
      const p = this.userProfile;
      ctx += '## User Profile\n';
      if (p.name) ctx += `- Name: ${p.name}\n`;
      if (p.dateOfBirth) {
        const bDate = new Date(p.dateOfBirth);
        const age = Math.floor((Date.now() - bDate.getTime()) / 31557600000);
        ctx += `- Date of Birth: ${bDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (Age: ${age})\n`;
      }
      if (p.gender) ctx += `- Gender: ${p.gender}\n`;
      if (p.nationality) ctx += `- Nationality: ${p.nationality}\n`;
      if (p.language) ctx += `- Language: ${p.language}\n`;
      if (p.profession) ctx += `- Profession: ${p.profession}\n`;
      if (p.workplace) ctx += `- Workplace: ${p.workplace}\n`;
      if (p.interests) ctx += `- Interests: ${p.interests}\n`;
      if (p.hobbies) ctx += `- Hobbies: ${p.hobbies}\n`;
      ctx += '\n';
    }

    // Add memory entries
    if (sorted.length > 0) {
      ctx += '## What You Know About This User\n';
      sorted.forEach(m => {
        ctx += `- [${m.type}] ${m.content}\n`;
      });
    }

    // Add relationship context
    if (this.relationship.totalInteractions > 0) {
      ctx += `\n## Relationship\n`;
      ctx += `- Total conversations: ${this.relationship.totalInteractions}\n`;
      if (this.relationship.lastInteraction) {
        ctx += `- Last interaction: ${new Date(this.relationship.lastInteraction).toLocaleDateString()}\n`;
      }
    }

    return ctx;
  }

  /** Get or create a memory record for a user-agent pair */
  static async getOrCreate(userId, agentId) {
    let existing = await prisma.agentMemory.findFirst({
      where: { userId, agentId },
    });

    if (existing) {
      return Object.assign(new AgentMemoryAdapter(existing), { _isNew: false });
    }

    // Create new
    const instance = new AgentMemoryAdapter({
      userId,
      agentId,
      memories: [],
      summary: JSON.stringify({
        userProfile: {},
        relationship: { totalInteractions: 0, lastInteraction: null, totalMessages: 0 },
        learningMetrics: { totalLearnings: 0, correctPredictions: 0, corrections: 0, adaptations: 0 },
        conversationPatterns: { preferredTopics: [], avoidTopics: [], commonQuestions: [], feedbackPatterns: { likes: [], dislikes: [] } },
        userSummary: '',
        memoryEnabled: true,
      }),
      totalMemories: 0,
    });
    await instance.save();
    return instance;
  }

  static async find(query = {}) {
    const results = await prisma.agentMemory.findMany({
      where: convertMongoToPrisma(query),
      orderBy: { updatedAt: 'desc' },
    });
    return results.map(r => Object.assign(new AgentMemoryAdapter(r), { _isNew: false }));
  }

  static async findOne(query) {
    const result = await prisma.agentMemory.findFirst({ where: convertMongoToPrisma(query) });
    return result ? Object.assign(new AgentMemoryAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const instance = new AgentMemoryAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.agentMemory.update({ where: { id }, data: update.$set || update });
    return Object.assign(new AgentMemoryAdapter(result), { _isNew: false });
  }

  static async findByIdAndDelete(id) {
    return prisma.agentMemory.delete({ where: { id } });
  }

  static async deleteMany(query) {
    return prisma.agentMemory.deleteMany({ where: convertMongoToPrisma(query) });
  }

  static async countDocuments(query = {}) {
    return prisma.agentMemory.count({ where: convertMongoToPrisma(query) });
  }
}

class AgentFileAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.agentFile.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.agentFile.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, id, createdAt, updatedAt, ...data } = this;
    return data;
  }

  // Mongoose-style toObject
  toObject() {
    const { _isNew, ...data } = this;
    return data;
  }

  static find(query = {}) {
    const promise = prisma.agentFile.findMany({ where: convertMongoToPrisma(query) })
      .then(results => results.map(r => Object.assign(new AgentFileAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, AgentFileAdapter);
  }

  static async findById(id) {
    const result = await prisma.agentFile.findUnique({ where: { id } });
    return result ? Object.assign(new AgentFileAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.path) where.path = query.path;
    if (query.filename) where.filename = query.filename;
    if (query.isDeleted !== undefined) where.isDeleted = query.isDeleted;
    const result = await prisma.agentFile.findFirst({ where });
    return result ? Object.assign(new AgentFileAdapter(result), { _isNew: false }) : null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.path) where.path = query.path;
    if (query.filename) where.filename = query.filename;

    const existing = await prisma.agentFile.findFirst({ where });

    if (existing) {
      const updateData = update.$set ? { ...update.$set } : { ...update };
      // Remove any _id field
      delete updateData._id;
      delete updateData.id;
      const result = await prisma.agentFile.update({
        where: { id: existing.id },
        data: updateData,
      });
      return Object.assign(new AgentFileAdapter(result), { _isNew: false });
    } else if (options.upsert) {
      const createData = { ...query, ...(update.$set || update) };
      delete createData._id;
      delete createData.id;
      const result = await prisma.agentFile.create({ data: createData });
      return Object.assign(new AgentFileAdapter(result), { _isNew: false });
    }
    return null;
  }

  static async create(data) {
    const instance = new AgentFileAdapter(data);
    return instance.save();
  }

  static async findByIdAndDelete(id) {
    return prisma.agentFile.delete({ where: { id } });
  }

  static async countDocuments(query = {}) {
    return prisma.agentFile.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// EXPORTS - PRISMA MODEL INTERFACE (Canvas App Only)
// ============================================

export const User = UserAdapter;
export const Agent = AgentAdapter;
export const AgentMemory = AgentMemoryAdapter;
export const AgentFile = AgentFileAdapter;

// Default export for index.js imports
export default {
  User,
  Agent,
  AgentMemory,
  AgentFile,
};
