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
// CHAT SESSION MODEL ADAPTER
// ============================================
class ChatSessionAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const createData = {
        sessionId: this.sessionId,
        userId: this.userId,
        agentId: this.agentId,
        name: this.name,
        description: this.description,
        tags: this.tags || [],
        context: this.context || {},
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        messageCount: this.stats?.messageCount || this.messageCount || 0,
        totalTokens: this.stats?.totalTokens || this.totalTokens || 0,
        lastMessageAt: this.stats?.lastMessageAt || this.lastMessageAt,
        isActive: this.isActive !== undefined ? this.isActive : true,
        isArchived: this.isArchived || false,
      };
      const result = await prisma.chatSession.create({ data: createData });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatSession.update({
        where: { id: this.id },
        data: {
          name: this.name,
          description: this.description,
          tags: this.tags,
          isActive: this.isActive,
          isArchived: this.isArchived,
          messageCount: this.stats?.messageCount || this.messageCount,
          totalTokens: this.stats?.totalTokens || this.totalTokens,
          lastMessageAt: this.stats?.lastMessageAt || this.lastMessageAt,
        },
      });
      Object.assign(this, result);
      return this;
    }
  }

  // Mongoose-style populate (returns self for chaining)
  populate() {
    return this;
  }

  static async findById(id) {
    const result = await prisma.chatSession.findUnique({
      where: { id },
      include: { agent: true },
    });
    return result ? Object.assign(new ChatSessionAdapter(result), { _isNew: false }) : null;
  }

  static findOne(query) {
    const where = {};
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.userId) where.userId = query.userId;
    if (query.id) where.id = query.id;
    const promise = prisma.chatSession.findFirst({
      where,
      include: { agent: true },
    }).then(result => result ? Object.assign(new ChatSessionAdapter(result), { _isNew: false, agentId: result.agent }) : null);
    return new QueryBuilder(promise, ChatSessionAdapter);
  }

  static find(query = {}) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.agentId) where.agentId = query.agentId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    const promise = prisma.chatSession.findMany({
      where,
      include: { agent: true },
    }).then(results => results.map(r => {
      const session = Object.assign(new ChatSessionAdapter(r), { _isNew: false });
      // Map agent relation to agentId for Mongoose-style access
      session.agentId = r.agent;
      session.stats = {
        messageCount: r.messageCount || 0,
        totalTokens: r.totalTokens || 0,
        lastMessageAt: r.lastMessageAt,
        durationMs: 0,
      };
      return session;
    }));
    return new QueryBuilder(promise, ChatSessionAdapter);
  }

  static async create(data) {
    const instance = new ChatSessionAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.chatSession.count({ where: convertMongoToPrisma(query) });
  }

  static async deleteOne(query) {
    try {
      const where = {};
      if (query.sessionId) where.sessionId = query.sessionId;
      if (query.userId) where.userId = query.userId;
      await prisma.chatSession.deleteMany({ where });
      return { deletedCount: 1 };
    } catch (_error) {
      return { deletedCount: 0 };
    }
  }
}

// ============================================
// CHAT SETTINGS MODEL ADAPTER
// ============================================
class ChatSettingsAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatSettings.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatSettings.update({
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

  static async findOne(query) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    const result = await prisma.chatSettings.findFirst({ where });
    return result ? Object.assign(new ChatSettingsAdapter(result), { _isNew: false }) : null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const where = {};
    if (query.userId) where.userId = query.userId;

    const existing = await prisma.chatSettings.findFirst({ where });

    if (existing) {
      const result = await prisma.chatSettings.update({
        where: { id: existing.id },
        data: update.$set || update,
      });
      return Object.assign(new ChatSettingsAdapter(result), { _isNew: false });
    } else if (options.upsert) {
      const result = await prisma.chatSettings.create({
        data: {
          userId: query.userId,
          ...(update.$set || update),
        },
      });
      return Object.assign(new ChatSettingsAdapter(result), { _isNew: false });
    }
    return null;
  }

  static async create(data) {
    const instance = new ChatSettingsAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.chatSettings.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// CHAT FEEDBACK MODEL ADAPTER
// ============================================
class ChatFeedbackAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatFeedback.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatFeedback.update({
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

  static async findOne(query) {
    const where = {};
    if (query.messageId) where.messageId = query.messageId;
    if (query.userId) where.userId = query.userId;
    if (query.sessionId) where.sessionId = query.sessionId;
    const result = await prisma.chatFeedback.findFirst({ where });
    return result ? Object.assign(new ChatFeedbackAdapter(result), { _isNew: false }) : null;
  }

  static async find(query = {}) {
    const where = {};
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.userId) where.userId = query.userId;
    const results = await prisma.chatFeedback.findMany({ where });
    return results.map(r => Object.assign(new ChatFeedbackAdapter(r), { _isNew: false }));
  }

  static async create(data) {
    const instance = new ChatFeedbackAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.chatFeedback.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// CHAT QUICK ACTION MODEL ADAPTER
// ============================================
class ChatQuickActionAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatQuickAction.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatQuickAction.update({
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

  static find(query = {}) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.category) where.category = query.category;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.isDefault !== undefined) where.isDefault = query.isDefault;
    const promise = prisma.chatQuickAction.findMany({
      where,
    }).then(results => results.map(r => Object.assign(new ChatQuickActionAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, ChatQuickActionAdapter);
  }

  static async findOne(query) {
    const where = {};
    if (query.actionId) where.actionId = query.actionId;
    if (query.userId) where.userId = query.userId;
    const result = await prisma.chatQuickAction.findFirst({ where });
    return result ? Object.assign(new ChatQuickActionAdapter(result), { _isNew: false }) : null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const where = {};
    if (query.actionId) where.actionId = query.actionId;
    if (query.userId) where.userId = query.userId;

    const existing = await prisma.chatQuickAction.findFirst({ where });
    if (!existing && options.upsert) {
      const createData = { ...query };
      if (update.$set) Object.assign(createData, update.$set);
      if (update.$inc) {
        for (const [key, val] of Object.entries(update.$inc)) {
          createData[key] = val;
        }
      }
      const result = await prisma.chatQuickAction.create({ data: createData });
      return Object.assign(new ChatQuickActionAdapter(result), { _isNew: false });
    }

    if (!existing) return null;

    // Handle $inc operations
    const updateData = update.$set ? { ...update.$set } : {};
    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        updateData[key] = { increment: val };
      }
    }

    const result = await prisma.chatQuickAction.update({
      where: { id: existing.id },
      data: updateData,
    });
    return Object.assign(new ChatQuickActionAdapter(result), { _isNew: false });
  }

  static async create(data) {
    const instance = new ChatQuickActionAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.chatQuickAction.update({
      where: { id },
      data: update,
    });
    return Object.assign(new ChatQuickActionAdapter(result), { _isNew: false });
  }

  static async findByIdAndDelete(id) {
    return prisma.chatQuickAction.delete({ where: { id } });
  }

  static async countDocuments(query = {}) {
    return prisma.chatQuickAction.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// CANVAS PROJECT MODEL ADAPTER
// ============================================
class ChatCanvasProjectAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatCanvasProject.create({
        data: {
          projectId: this.projectId,
          userId: this.userId,
          sessionId: this.sessionId,
          name: this.name,
          description: this.description,
          type: this.type,
          metadata: this.metadata || {},
        },
      });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatCanvasProject.update({
        where: { id: this.id },
        data: {
          name: this.name,
          description: this.description,
          type: this.type,
          metadata: this.metadata,
        },
      });
      Object.assign(this, result);
      return this;
    }
  }

  static find(query = {}) {
    const where = {};
    if (query.userId) where.userId = query.userId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.status) where.status = query.status;
    if (query.status?.$exists !== undefined) {
      // Handle Mongoose $exists - ignore, just return all
    }
    const promise = prisma.chatCanvasProject.findMany({
      where,
      include: { files: true },
    }).then(results => results.map(r => Object.assign(new ChatCanvasProjectAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, ChatCanvasProjectAdapter);
  }

  static async findById(id) {
    const result = await prisma.chatCanvasProject.findUnique({
      where: { id },
      include: { files: true },
    });
    return result ? Object.assign(new ChatCanvasProjectAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;
    const result = await prisma.chatCanvasProject.findFirst({
      where,
      include: { files: true },
    });
    return result ? Object.assign(new ChatCanvasProjectAdapter(result), { _isNew: false }) : null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const where = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;

    const existing = await prisma.chatCanvasProject.findFirst({ where });
    if (!existing) return null;

    // Handle $inc and $set operations - ChatCanvasProject doesn't have stats in schema
    // Just update normal fields
    const updateData = update.$set ? { ...update.$set } : {};
    // Copy non-operator fields
    for (const [key, val] of Object.entries(update)) {
      if (!key.startsWith('$') && key !== 'stats.lastModified') {
        updateData[key] = val;
      }
    }

    const result = await prisma.chatCanvasProject.update({
      where: { id: existing.id },
      data: updateData,
    });
    return Object.assign(new ChatCanvasProjectAdapter(result), { _isNew: false });
  }

  static async create(data) {
    const instance = new ChatCanvasProjectAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.chatCanvasProject.update({
      where: { id },
      data: update.$set || update,
    });
    return Object.assign(new ChatCanvasProjectAdapter(result), { _isNew: false });
  }

  static async findByIdAndDelete(id) {
    // Delete associated files first
    await prisma.chatCanvasFile.deleteMany({ where: { projectId: id } });
    return prisma.chatCanvasProject.delete({ where: { id } });
  }

  static async countDocuments(query = {}) {
    return prisma.chatCanvasProject.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// CANVAS FILE MODEL ADAPTER
// ============================================
class ChatCanvasFileAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatCanvasFile.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatCanvasFile.update({
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

  static find(query = {}) {
    const where = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;
    const promise = prisma.chatCanvasFile.findMany({
      where,
    }).then(results => results.map(r => Object.assign(new ChatCanvasFileAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, ChatCanvasFileAdapter);
  }

  static async findById(id) {
    const result = await prisma.chatCanvasFile.findUnique({ where: { id } });
    return result ? Object.assign(new ChatCanvasFileAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;
    if (query.path) where.path = query.path;
    if (query.fileId) where.fileId = query.fileId;
    const result = await prisma.chatCanvasFile.findFirst({ where });
    return result ? Object.assign(new ChatCanvasFileAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const instance = new ChatCanvasFileAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.chatCanvasFile.update({
      where: { id },
      data: update.$set || update,
    });
    return Object.assign(new ChatCanvasFileAdapter(result), { _isNew: false });
  }

  static async findByIdAndDelete(id) {
    return prisma.chatCanvasFile.delete({ where: { id } });
  }

  static async countDocuments(query = {}) {
    return prisma.chatCanvasFile.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// CANVAS HISTORY MODEL ADAPTER
// ============================================
class ChatCanvasHistoryAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.chatCanvasHistory.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatCanvasHistory.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, id, createdAt, ...data } = this;
    return data;
  }

  static find(query = {}) {
    const where = {};
    if (query.fileId) where.fileId = query.fileId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.userId) where.userId = query.userId;
    const promise = prisma.chatCanvasHistory.findMany({
      where,
    }).then(results => results.map(r => Object.assign(new ChatCanvasHistoryAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, ChatCanvasHistoryAdapter);
  }

  static async create(data) {
    const instance = new ChatCanvasHistoryAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.chatCanvasHistory.count({ where: convertMongoToPrisma(query) });
  }
}

// ============================================
// ANALYTICS MODELS ADAPTERS
// ============================================
class ChatInteractionAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const createData = {
        conversationId: this.conversationId,
        userId: this.userId,
        agentId: this.agentId,
        channel: this.channel || 'web',
        language: this.language || 'en',
        messages: this.messages || [],
        status: this.status || 'active',
      };
      const result = await prisma.chatAnalyticsInteraction.create({ data: createData });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.chatAnalyticsInteraction.update({
        where: { id: this.id },
        data: {
          messages: this.messages,
          status: this.status,
        },
      });
      Object.assign(this, result);
      return this;
    }
  }

  static findOne(query) {
    const where = {};
    if (query.conversationId) where.conversationId = query.conversationId;
    if (query.userId) where.userId = query.userId;
    const promise = prisma.chatAnalyticsInteraction.findFirst({ where })
      .then(result => result ? Object.assign(new ChatInteractionAdapter(result), { _isNew: false }) : null);
    return new QueryBuilder(promise, ChatInteractionAdapter);
  }

  static async findById(id) {
    const result = await prisma.chatAnalyticsInteraction.findUnique({ where: { id } });
    return result ? Object.assign(new ChatInteractionAdapter(result), { _isNew: false }) : null;
  }

  static find(query = {}) {
    const where = {};
    if (query.conversationId) where.conversationId = query.conversationId;
    if (query.userId) where.userId = query.userId;
    const promise = prisma.chatAnalyticsInteraction.findMany({
      where,
    }).then(results => results.map(r => Object.assign(new ChatInteractionAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, ChatInteractionAdapter);
  }

  static async create(data) {
    const instance = new ChatInteractionAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.chatAnalyticsInteraction.count({ where: convertMongoToPrisma(query) });
  }

  // Mongoose-style sort (returns self for chaining)  
  sort() {
    return this;
  }
}

// ============================================
// OTHER MODELS ADAPTERS
// ============================================
class JobApplicationAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.jobApplication.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.jobApplication.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, id, createdAt, updatedAt, applicationId, applicationNumber, ...rest } = this;
    // Map route format to Prisma schema format
    // Route sends: { applicant: { firstName, lastName, email, phone }, position: { id, title }, ... }
    // Prisma expects: { name, email, phone, position, ... }
    const data = {
      userId: rest.userId || null,
      name: rest.applicant
        ? `${rest.applicant.firstName} ${rest.applicant.lastName}`
        : rest.name,
      email: rest.applicant?.email || rest.email,
      phone: rest.applicant?.phone || rest.phone || null,
      position: rest.position?.title || rest.position?.id || rest.position,
      resumeUrl: rest.resume?.url || rest.resumeUrl || null,
      coverLetter: rest.coverLetter || null,
      linkedinUrl: rest.applicant?.linkedin || rest.linkedinUrl || null,
      portfolioUrl: rest.applicant?.portfolio || rest.portfolioUrl || null,
      status: rest.status || 'submitted',
      notes: rest.notes || null,
    };
    return data;
  }

  static find(query = {}) {
    const promise = prisma.jobApplication.findMany({ where: convertMongoToPrisma(query) })
      .then(results => results.map(r => Object.assign(new JobApplicationAdapter(r), { _isNew: false })));
    return new QueryBuilder(promise, JobApplicationAdapter);
  }

  static async findById(id) {
    const result = await prisma.jobApplication.findUnique({ where: { id } });
    return result ? Object.assign(new JobApplicationAdapter(result), { _isNew: false }) : null;
  }

  static async findOne(query) {
    const where = {};
    if (query.applicationId) where.applicationId = query.applicationId;
    if (query.email) where.email = query.email;
    if (query.jobId) where.jobId = query.jobId;
    const result = await prisma.jobApplication.findFirst({ where });
    return result ? Object.assign(new JobApplicationAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const instance = new JobApplicationAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.jobApplication.update({ where: { id }, data: update.$set || update });
    return Object.assign(new JobApplicationAdapter(result), { _isNew: false });
  }

  static async countDocuments(query = {}) {
    return prisma.jobApplication.count({ where: convertMongoToPrisma(query) });
  }
}

class WebinarRegistrationAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.webinarRegistration.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.webinarRegistration.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, id, createdAt, ...data } = this;
    return data;
  }

  static async find(query = {}) {
    const results = await prisma.webinarRegistration.findMany({ where: convertMongoToPrisma(query), orderBy: { createdAt: 'desc' } });
    return results.map(r => Object.assign(new WebinarRegistrationAdapter(r), { _isNew: false }));
  }

  static async findOne(query) {
    const result = await prisma.webinarRegistration.findFirst({ where: convertMongoToPrisma(query) });
    return result ? Object.assign(new WebinarRegistrationAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const instance = new WebinarRegistrationAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.webinarRegistration.count({ where: convertMongoToPrisma(query) });
  }
}

class UserFavoritesAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.userFavorites.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.userFavorites.update({
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

  static async findOne(query) {
    const result = await prisma.userFavorites.findFirst({ where: convertMongoToPrisma(query) });
    return result ? Object.assign(new UserFavoritesAdapter(result), { _isNew: false }) : null;
  }

  static async findById(id) {
    const result = await prisma.userFavorites.findUnique({ where: { id } });
    return result ? Object.assign(new UserFavoritesAdapter(result), { _isNew: false }) : null;
  }

  static async find(query = {}) {
    const results = await prisma.userFavorites.findMany({ where: convertMongoToPrisma(query), orderBy: { createdAt: 'desc' } });
    return results.map(r => Object.assign(new UserFavoritesAdapter(r), { _isNew: false }));
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const existing = await prisma.userFavorites.findFirst({ where: convertMongoToPrisma(query) });
    if (existing) {
      const result = await prisma.userFavorites.update({ where: { id: existing.id }, data: update.$set || update });
      return Object.assign(new UserFavoritesAdapter(result), { _isNew: false });
    } else if (options.upsert) {
      const result = await prisma.userFavorites.create({ data: { ...query, ...(update.$set || update) } });
      return Object.assign(new UserFavoritesAdapter(result), { _isNew: false });
    }
    return null;
  }

  static async create(data) {
    const instance = new UserFavoritesAdapter(data);
    return instance.save();
  }

  static async countDocuments(query = {}) {
    return prisma.userFavorites.count({ where: convertMongoToPrisma(query) });
  }
}

class TransactionAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    if (this._isNew) {
      const result = await prisma.transaction.create({ data: this._getData() });
      Object.assign(this, result);
      this._isNew = false;
      return this;
    } else {
      const result = await prisma.transaction.update({
        where: { id: this.id },
        data: this._getData(),
      });
      Object.assign(this, result);
      return this;
    }
  }

  _getData() {
    const { _isNew, id, createdAt, ...data } = this;
    return data;
  }

  static async find(query = {}) {
    const results = await prisma.transaction.findMany({ where: convertMongoToPrisma(query), orderBy: { createdAt: 'desc' } });
    return results.map(r => Object.assign(new TransactionAdapter(r), { _isNew: false }));
  }

  static async findOne(query) {
    const result = await prisma.transaction.findFirst({ where: convertMongoToPrisma(query) });
    return result ? Object.assign(new TransactionAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const instance = new TransactionAdapter(data);
    return instance.save();
  }

  static async findByIdAndUpdate(id, update) {
    const result = await prisma.transaction.update({ where: { id }, data: update.$set || update });
    return Object.assign(new TransactionAdapter(result), { _isNew: false });
  }

  static async countDocuments(query = {}) {
    return prisma.transaction.count({ where: convertMongoToPrisma(query) });
  }
}

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
// LAB EXPERIMENT ADAPTER
// Uses AnalyticsEvent to store lab experiments
// ============================================
class LabExperimentAdapter {
  constructor(data = {}) {
    Object.assign(this, data);
    this._isNew = true;
  }

  async save() {
    return LabExperimentAdapter.create(this);
  }

  static async find(query = {}) {
    const where = { eventName: 'lab_experiment' };
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.userId) where.userId = query.userId;
    const results = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
    return results.map(r => Object.assign(new LabExperimentAdapter(r), { _isNew: false }));
  }

  static async findById(id) {
    const result = await prisma.analyticsEvent.findUnique({ where: { id } });
    return result ? Object.assign(new LabExperimentAdapter(result), { _isNew: false }) : null;
  }

  static async create(data) {
    const result = await prisma.analyticsEvent.create({
      data: {
        visitorId: data.visitorId || 'system',
        sessionId: data.sessionId || 'system',
        userId: data.userId,
        eventName: 'lab_experiment',
        eventData: {
          experimentId: data.experimentId,
          experimentType: data.experimentType,
          input: data.input,
          output: data.output,
          status: data.status || 'completed',
          processingTime: data.processingTime,
          tokensUsed: data.tokensUsed,
          costIncurred: data.costIncurred,
          modelUsed: data.modelUsed,
          parameters: data.parameters,
          metadata: data.metadata,
        },
        timestamp: new Date(),
      },
    });
    return Object.assign(new LabExperimentAdapter(result), { _isNew: false });
  }

  static async countDocuments(query = {}) {
    const where = { eventName: 'lab_experiment' };
    if (query.timestamp) where.timestamp = convertMongoToPrisma({ timestamp: query.timestamp }).timestamp;
    return prisma.analyticsEvent.count({ where });
  }

  static async distinct(field, query = {}) {
    const where = { eventName: 'lab_experiment' };
    if (query.timestamp) where.timestamp = convertMongoToPrisma({ timestamp: query.timestamp }).timestamp;
    const events = await prisma.analyticsEvent.findMany({
      where,
      select: { [field]: true },
      distinct: [field],
    });
    return events.map(e => e[field]).filter(Boolean);
  }

  static async aggregate(pipeline) {
    // Simplified aggregation for avg duration
    const events = await prisma.analyticsEvent.findMany({
      where: { eventName: 'lab_experiment' },
    });
    if (pipeline.some(p => p.$group?._id === null)) {
      const durations = events.map(e => e.eventData?.processingTime || 0);
      const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      return [{ avgDuration: avg }];
    }
    return [];
  }
}

// ============================================
// EXPORTS - PRISMA MODEL INTERFACE
// ============================================

export const User = UserAdapter;
export const Agent = AgentAdapter;
export const ChatSession = ChatSessionAdapter;
export const ChatSettings = ChatSettingsAdapter;
export const ChatFeedback = ChatFeedbackAdapter;
export const ChatQuickAction = ChatQuickActionAdapter;
export const ChatCanvasProject = ChatCanvasProjectAdapter;
export const ChatCanvasFile = ChatCanvasFileAdapter;
export const ChatCanvasHistory = ChatCanvasHistoryAdapter;
export const ChatInteraction = ChatInteractionAdapter;



// Lab
export const LabExperiment = LabExperimentAdapter;

// Other
export const JobApplication = JobApplicationAdapter;
export const WebinarRegistration = WebinarRegistrationAdapter;
export const UserFavorites = UserFavoritesAdapter;
export const Transaction = TransactionAdapter;
export const AgentMemory = AgentMemoryAdapter;
export const AgentFile = AgentFileAdapter;

// Default export for index.js imports
export default {
  User,
  Agent,
  ChatSession,
  ChatSettings,
  ChatFeedback,
  ChatQuickAction,
  ChatCanvasProject,
  ChatCanvasFile,
  ChatCanvasHistory,
  ChatInteraction,
  LabExperiment,
  JobApplication,
  WebinarRegistration,
  UserFavorites,
  Transaction,
  AgentMemory,
  AgentFile,
};
