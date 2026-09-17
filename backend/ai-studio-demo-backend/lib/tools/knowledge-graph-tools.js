/**
 * KNOWLEDGE GRAPH TOOLS (5 tools)
 * kg_create, kg_query, kg_visualize, kg_merge, kg_reason
 *
 * Persistent intelligence with entity-relationship storage, graph traversal,
 * semantic queries, deduplication, and inference reasoning.
 * ALL state persisted in PostgreSQL via Prisma — NO localStorage.
 */

import { prisma } from '../prisma.js';

// ── kg_create ───────────────────────────────────────────────────
async function kgCreate(params) {
    const { action = 'entity', userId, ...opts } = params;

    try {
        switch (action) {
            case 'entity': {
                if (!opts.name || !opts.type) return { success: false, error: 'name and type required' };
                const entity = await prisma.kGEntity.upsert({
                    where: { userId_name_type: { userId: userId || 'system', name: opts.name, type: opts.type } },
                    create: {
                        userId: userId || 'system',
                        name: opts.name,
                        type: opts.type,
                        properties: opts.properties || {},
                        description: opts.description || null,
                        confidence: opts.confidence ?? 1.0,
                        source: opts.source || null,
                        aliases: opts.aliases || [],
                    },
                    update: {
                        properties: opts.properties || undefined,
                        description: opts.description || undefined,
                        confidence: opts.confidence || undefined,
                        aliases: opts.aliases || undefined,
                    },
                });
                return { success: true, entity: { id: entity.id, name: entity.name, type: entity.type }, created: true };
            }

            case 'relation': {
                if (!opts.from || !opts.to || !opts.relationType) return { success: false, error: 'from, to, and relationType required' };
                // Resolve entities by name or ID
                const fromEntity = await resolveEntity(opts.from, userId);
                const toEntity = await resolveEntity(opts.to, userId);
                if (!fromEntity) return { success: false, error: `Entity not found: ${opts.from}` };
                if (!toEntity) return { success: false, error: `Entity not found: ${opts.to}` };

                const relation = await prisma.kGRelation.create({
                    data: {
                        userId: userId || 'system',
                        fromId: fromEntity.id,
                        toId: toEntity.id,
                        type: opts.relationType,
                        properties: opts.properties || {},
                        weight: opts.weight ?? 1.0,
                        bidirectional: opts.bidirectional ?? false,
                        source: opts.source || null,
                    },
                });
                return {
                    success: true,
                    relation: {
                        id: relation.id,
                        from: fromEntity.name,
                        to: toEntity.name,
                        type: relation.type,
                        weight: relation.weight,
                    },
                };
            }

            case 'batch': {
                if (!opts.entities && !opts.relations) return { success: false, error: 'entities or relations array required' };
                const results = { entities: [], relations: [], errors: [] };

                if (opts.entities) {
                    for (const e of opts.entities) {
                        try {
                            const entity = await prisma.kGEntity.upsert({
                                where: { userId_name_type: { userId: userId || 'system', name: e.name, type: e.type } },
                                create: { userId: userId || 'system', name: e.name, type: e.type, properties: e.properties || {}, description: e.description || null, source: e.source || null, aliases: e.aliases || [] },
                                update: { properties: e.properties || undefined },
                            });
                            results.entities.push({ id: entity.id, name: entity.name });
                        } catch (err) {
                            results.errors.push({ entity: e.name, error: err.message });
                        }
                    }
                }
                if (opts.relations) {
                    for (const r of opts.relations) {
                        try {
                            const from = await resolveEntity(r.from, userId);
                            const to = await resolveEntity(r.to, userId);
                            if (!from || !to) { results.errors.push({ relation: `${r.from}->${r.to}`, error: 'entity not found' }); continue; }
                            const rel = await prisma.kGRelation.create({
                                data: { userId: userId || 'system', fromId: from.id, toId: to.id, type: r.type || r.relationType, properties: r.properties || {}, weight: r.weight ?? 1.0, bidirectional: r.bidirectional ?? false },
                            });
                            results.relations.push({ id: rel.id, from: from.name, to: to.name, type: rel.type });
                        } catch (err) {
                            results.errors.push({ relation: `${r.from}->${r.to}`, error: err.message });
                        }
                    }
                }
                return { success: true, ...results, totalCreated: results.entities.length + results.relations.length };
            }

            case 'delete_entity': {
                if (!opts.id && !opts.name) return { success: false, error: 'entity id or name required' };
                const entity = opts.id ? await prisma.kGEntity.findUnique({ where: { id: opts.id } }) : await resolveEntity(opts.name, userId);
                if (!entity) return { success: false, error: 'Entity not found' };
                await prisma.kGEntity.delete({ where: { id: entity.id } }); // cascades relations
                return { success: true, deleted: entity.name };
            }

            case 'delete_relation': {
                if (!opts.id) return { success: false, error: 'relation id required' };
                await prisma.kGRelation.delete({ where: { id: opts.id } });
                return { success: true, deleted: opts.id };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use entity, relation, batch, delete_entity, delete_relation.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── kg_query ────────────────────────────────────────────────────
async function kgQuery(params) {
    const { action = 'search', userId, ...opts } = params;

    try {
        switch (action) {
            case 'search': {
                const where = { userId: userId || 'system' };
                if (opts.type) where.type = opts.type;
                if (opts.name) where.name = { contains: opts.name, mode: 'insensitive' };
                if (opts.query) where.OR = [
                    { name: { contains: opts.query, mode: 'insensitive' } },
                    { description: { contains: opts.query, mode: 'insensitive' } },
                ];
                const entities = await prisma.kGEntity.findMany({
                    where,
                    include: { outRelations: { include: { toEntity: { select: { id: true, name: true, type: true } } } }, inRelations: { include: { fromEntity: { select: { id: true, name: true, type: true } } } } },
                    take: opts.limit || 20,
                    orderBy: { updatedAt: 'desc' },
                });
                return { success: true, entities: entities.map(formatEntity), count: entities.length };
            }

            case 'get': {
                if (!opts.id && !opts.name) return { success: false, error: 'entity id or name required' };
                const entity = opts.id
                    ? await prisma.kGEntity.findUnique({ where: { id: opts.id }, include: { outRelations: { include: { toEntity: true } }, inRelations: { include: { fromEntity: true } } } })
                    : await resolveEntityFull(opts.name, userId);
                if (!entity) return { success: false, error: 'Entity not found' };
                return { success: true, entity: formatEntity(entity) };
            }

            case 'traverse': {
                if (!opts.startId && !opts.start) return { success: false, error: 'startId or start (name) required' };
                const startEntity = opts.startId ? await prisma.kGEntity.findUnique({ where: { id: opts.startId } }) : await resolveEntity(opts.start, userId);
                if (!startEntity) return { success: false, error: 'Start entity not found' };

                const maxDepth = opts.depth || 3;
                const relationType = opts.relationType || null;
                const visited = new Set();
                const graph = [];

                async function traverse(entityId, depth) {
                    if (depth > maxDepth || visited.has(entityId)) return;
                    visited.add(entityId);

                    const where = { userId: userId || 'system', fromId: entityId };
                    if (relationType) where.type = relationType;
                    const rels = await prisma.kGRelation.findMany({
                        where,
                        include: { toEntity: { select: { id: true, name: true, type: true } } },
                    });

                    // Also check bidirectional / incoming
                    const inWhere = { userId: userId || 'system', toId: entityId, bidirectional: true };
                    if (relationType) inWhere.type = relationType;
                    const inRels = await prisma.kGRelation.findMany({
                        where: inWhere,
                        include: { fromEntity: { select: { id: true, name: true, type: true } } },
                    });

                    for (const rel of rels) {
                        graph.push({ from: entityId, to: rel.toEntity.id, toName: rel.toEntity.name, toType: rel.toEntity.type, relation: rel.type, weight: rel.weight, depth });
                        await traverse(rel.toEntity.id, depth + 1);
                    }
                    for (const rel of inRels) {
                        graph.push({ from: rel.fromEntity.id, fromName: rel.fromEntity.name, to: entityId, relation: rel.type, weight: rel.weight, depth, bidirectional: true });
                        await traverse(rel.fromEntity.id, depth + 1);
                    }
                }

                await traverse(startEntity.id, 1);
                return { success: true, start: startEntity.name, graph, nodesVisited: visited.size, edgesFound: graph.length, maxDepth };
            }

            case 'shortest_path': {
                if (!opts.from || !opts.to) return { success: false, error: 'from and to required' };
                const fromEntity = await resolveEntity(opts.from, userId);
                const toEntity = await resolveEntity(opts.to, userId);
                if (!fromEntity || !toEntity) return { success: false, error: 'One or both entities not found' };

                // BFS shortest path
                const path = await bfsShortestPath(fromEntity.id, toEntity.id, userId, opts.maxDepth || 6);
                if (!path) return { success: true, found: false, message: 'No path found between entities' };
                return { success: true, found: true, path, length: path.length };
            }

            case 'neighbors': {
                if (!opts.id && !opts.name) return { success: false, error: 'entity id or name required' };
                const entity = opts.id ? await prisma.kGEntity.findUnique({ where: { id: opts.id } }) : await resolveEntity(opts.name, userId);
                if (!entity) return { success: false, error: 'Entity not found' };

                const outRels = await prisma.kGRelation.findMany({ where: { fromId: entity.id }, include: { toEntity: { select: { id: true, name: true, type: true } } } });
                const inRels = await prisma.kGRelation.findMany({ where: { toId: entity.id }, include: { fromEntity: { select: { id: true, name: true, type: true } } } });

                return {
                    success: true,
                    entity: entity.name,
                    outgoing: outRels.map(r => ({ entity: r.toEntity.name, type: r.toEntity.type, relation: r.type, weight: r.weight })),
                    incoming: inRels.map(r => ({ entity: r.fromEntity.name, type: r.fromEntity.type, relation: r.type, weight: r.weight })),
                    totalConnections: outRels.length + inRels.length,
                };
            }

            case 'stats': {
                const uid = userId || 'system';
                const [entityCount, relationCount, types, relTypes] = await Promise.all([
                    prisma.kGEntity.count({ where: { userId: uid } }),
                    prisma.kGRelation.count({ where: { userId: uid } }),
                    prisma.kGEntity.groupBy({ by: ['type'], where: { userId: uid }, _count: true }),
                    prisma.kGRelation.groupBy({ by: ['type'], where: { userId: uid }, _count: true }),
                ]);
                return {
                    success: true,
                    entityCount,
                    relationCount,
                    entityTypes: types.map(t => ({ type: t.type, count: t._count })),
                    relationTypes: relTypes.map(t => ({ type: t.type, count: t._count })),
                };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use search, get, traverse, shortest_path, neighbors, stats.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── kg_visualize ────────────────────────────────────────────────
async function kgVisualize(params) {
    const { action = 'graph', userId, ...opts } = params;

    try {
        switch (action) {
            case 'graph': {
                const where = { userId: userId || 'system' };
                if (opts.type) where.type = opts.type;
                const entities = await prisma.kGEntity.findMany({ where, take: opts.limit || 50 });
                const entityIds = entities.map(e => e.id);
                const relations = await prisma.kGRelation.findMany({
                    where: { userId: userId || 'system', OR: [{ fromId: { in: entityIds } }, { toId: { in: entityIds } }] },
                    include: { fromEntity: { select: { name: true, type: true } }, toEntity: { select: { name: true, type: true } } },
                });

                // Mermaid graph
                const lines = ['graph LR'];
                const entityMap = {};
                for (const e of entities) {
                    const safeId = e.id.replace(/[^a-zA-Z0-9]/g, '_');
                    entityMap[e.id] = safeId;
                    const shape = e.type === 'person' ? `((${e.name}))` : e.type === 'concept' ? `{${e.name}}` : `[${e.name}]`;
                    lines.push(`    ${safeId}${shape}`);
                }
                for (const r of relations) {
                    const from = entityMap[r.fromId];
                    const to = entityMap[r.toId];
                    if (from && to) {
                        const arrow = r.bidirectional ? '<-->' : '-->';
                        lines.push(`    ${from} ${arrow}|${r.type}| ${to}`);
                    }
                }
                // Color by type
                const typeColors = { person: '#4ecdc4', concept: '#ffe66d', event: '#ff6b6b', place: '#45b7d1', organization: '#96ceb4' };
                for (const [type, color] of Object.entries(typeColors)) {
                    lines.push(`    classDef ${type} fill:${color},stroke:#333`);
                }
                for (const e of entities) {
                    const safeId = entityMap[e.id];
                    if (typeColors[e.type]) lines.push(`    class ${safeId} ${e.type}`);
                }

                return { success: true, mermaid: lines.join('\n'), entities: entities.length, relations: relations.length };
            }

            case 'cluster': {
                // Group entities by type
                const uid = userId || 'system';
                const types = await prisma.kGEntity.groupBy({ by: ['type'], where: { userId: uid }, _count: true });
                const clusters = {};
                for (const t of types) {
                    const entities = await prisma.kGEntity.findMany({
                        where: { userId: uid, type: t.type },
                        select: { id: true, name: true, properties: true },
                        take: 20,
                    });
                    clusters[t.type] = { count: t._count, entities: entities.map(e => e.name) };
                }
                return { success: true, clusters, totalTypes: types.length };
            }

            case 'matrix': {
                // Adjacency matrix
                const uid = userId || 'system';
                const entities = await prisma.kGEntity.findMany({ where: { userId: uid }, take: opts.limit || 30, select: { id: true, name: true } });
                const relations = await prisma.kGRelation.findMany({ where: { userId: uid } });
                const nameMap = Object.fromEntries(entities.map(e => [e.id, e.name]));
                const matrix = {};
                for (const e of entities) matrix[e.name] = {};
                for (const r of relations) {
                    const from = nameMap[r.fromId];
                    const to = nameMap[r.toId];
                    if (from && to) {
                        matrix[from][to] = { type: r.type, weight: r.weight };
                        if (r.bidirectional) matrix[to][from] = { type: r.type, weight: r.weight };
                    }
                }
                return { success: true, matrix, size: entities.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use graph, cluster, matrix.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── kg_merge ────────────────────────────────────────────────────
async function kgMerge(params) {
    const { action = 'find_duplicates', userId, ...opts } = params;

    try {
        switch (action) {
            case 'detect':
            case 'find_duplicates': {
                const uid = userId || 'system';
                const entities = await prisma.kGEntity.findMany({ where: { userId: uid }, select: { id: true, name: true, type: true, aliases: true, properties: true } });

                const duplicates = [];
                for (let i = 0; i < entities.length; i++) {
                    for (let j = i + 1; j < entities.length; j++) {
                        const a = entities[i], b = entities[j];
                        const similarity = computeSimilarity(a, b);
                        if (similarity >= (opts.threshold || 0.7)) {
                            duplicates.push({
                                entityA: { id: a.id, name: a.name, type: a.type },
                                entityB: { id: b.id, name: b.name, type: b.type },
                                similarity: Math.round(similarity * 100) + '%',
                                reason: getSimilarityReason(a, b),
                            });
                        }
                    }
                }
                return { success: true, duplicates, count: duplicates.length };
            }

            case 'merge': {
                if (!opts.keepId || !opts.mergeId) return { success: false, error: 'keepId and mergeId required' };
                const keep = await prisma.kGEntity.findUnique({ where: { id: opts.keepId } });
                const merge = await prisma.kGEntity.findUnique({ where: { id: opts.mergeId } });
                if (!keep || !merge) return { success: false, error: 'One or both entities not found' };

                // Transfer relations from merge → keep
                await prisma.kGRelation.updateMany({ where: { fromId: opts.mergeId }, data: { fromId: opts.keepId } });
                await prisma.kGRelation.updateMany({ where: { toId: opts.mergeId }, data: { toId: opts.keepId } });

                // Merge properties and aliases
                const mergedProps = { ...(merge.properties || {}), ...(keep.properties || {}) };
                const mergedAliases = [...new Set([...(keep.aliases || []), ...(merge.aliases || []), merge.name])];
                const mergedDesc = keep.description || merge.description;

                await prisma.kGEntity.update({
                    where: { id: opts.keepId },
                    data: { properties: mergedProps, aliases: mergedAliases, description: mergedDesc },
                });

                // Delete merged entity
                await prisma.kGEntity.delete({ where: { id: opts.mergeId } });

                // Remove duplicate self-relations
                const selfRels = await prisma.kGRelation.findMany({ where: { fromId: opts.keepId, toId: opts.keepId } });
                if (selfRels.length > 0) {
                    await prisma.kGRelation.deleteMany({ where: { fromId: opts.keepId, toId: opts.keepId } });
                }

                return {
                    success: true,
                    kept: { id: keep.id, name: keep.name },
                    merged: merge.name,
                    newAliases: mergedAliases,
                    relationsTransferred: true,
                };
            }

            case 'auto_merge': {
                const uid = userId || 'system';
                const entities = await prisma.kGEntity.findMany({ where: { userId: uid }, select: { id: true, name: true, type: true, aliases: true, properties: true, confidence: true } });
                const threshold = opts.threshold || 0.85;
                const mergeLog = [];

                const processed = new Set();
                for (let i = 0; i < entities.length; i++) {
                    if (processed.has(entities[i].id)) continue;
                    for (let j = i + 1; j < entities.length; j++) {
                        if (processed.has(entities[j].id)) continue;
                        const sim = computeSimilarity(entities[i], entities[j]);
                        if (sim >= threshold) {
                            // Keep entity with higher confidence
                            const [keep, discard] = entities[i].confidence >= entities[j].confidence ? [entities[i], entities[j]] : [entities[j], entities[i]];
                            try {
                                await prisma.kGRelation.updateMany({ where: { fromId: discard.id }, data: { fromId: keep.id } });
                                await prisma.kGRelation.updateMany({ where: { toId: discard.id }, data: { toId: keep.id } });
                                await prisma.kGRelation.deleteMany({ where: { fromId: keep.id, toId: keep.id } });
                                const newAliases = [...new Set([...(keep.aliases || []), ...(discard.aliases || []), discard.name])];
                                await prisma.kGEntity.update({ where: { id: keep.id }, data: { aliases: newAliases } });
                                await prisma.kGEntity.delete({ where: { id: discard.id } });
                                processed.add(discard.id);
                                mergeLog.push({ kept: keep.name, merged: discard.name, similarity: Math.round(sim * 100) + '%' });
                            } catch { /* skip if already deleted */ }
                        }
                    }
                }
                return { success: true, merges: mergeLog, totalMerged: mergeLog.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use find_duplicates, merge, auto_merge.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ── kg_reason ───────────────────────────────────────────────────
async function kgReason(params) {
    const { action = 'infer', userId, ...opts } = params;

    try {
        switch (action) {
            case 'infer': {
                if (!opts.entityId && !opts.entity) return { success: false, error: 'entityId or entity name required' };
                const entity = opts.entityId ? await prisma.kGEntity.findUnique({ where: { id: opts.entityId } }) : await resolveEntity(opts.entity, userId);
                if (!entity) return { success: false, error: 'Entity not found' };

                // Get all connected entities up to depth 2
                const outRels = await prisma.kGRelation.findMany({ where: { fromId: entity.id }, include: { toEntity: true } });
                const inRels = await prisma.kGRelation.findMany({ where: { toId: entity.id }, include: { fromEntity: true } });

                // Inference rules
                const inferences = [];

                // Transitive inference: A->B->C implies A has indirect relation to C
                for (const rel of outRels) {
                    const secondHop = await prisma.kGRelation.findMany({
                        where: { fromId: rel.toId },
                        include: { toEntity: { select: { id: true, name: true, type: true } } },
                    });
                    for (const hop2 of secondHop) {
                        if (hop2.toId !== entity.id) {
                            inferences.push({
                                type: 'transitive',
                                path: `${entity.name} -[${rel.type}]-> ${rel.toEntity.name} -[${hop2.type}]-> ${hop2.toEntity.name}`,
                                confidence: Math.round(rel.weight * hop2.weight * 0.8 * 100) / 100,
                                suggestedRelation: inferRelationType(rel.type, hop2.type),
                            });
                        }
                    }
                }

                // Pattern inference: similar entities have similar relationships
                const sameType = await prisma.kGEntity.findMany({
                    where: { userId: userId || 'system', type: entity.type, id: { not: entity.id } },
                    take: 10,
                });
                for (const peer of sameType) {
                    const peerRels = await prisma.kGRelation.findMany({
                        where: { fromId: peer.id },
                        include: { toEntity: { select: { name: true, type: true } } },
                    });
                    for (const pRelation of peerRels) {
                        const entityHasSimilar = outRels.some(r => r.type === pRelation.type && r.toEntity.type === pRelation.toEntity.type);
                        if (!entityHasSimilar) {
                            inferences.push({
                                type: 'pattern',
                                suggestion: `${entity.name} might also have relation "${pRelation.type}" to a ${pRelation.toEntity.type} (like ${peer.name} -> ${pRelation.toEntity.name})`,
                                confidence: 0.5,
                                basedOn: peer.name,
                            });
                        }
                    }
                }

                // Hub detection
                const connections = outRels.length + inRels.length;
                if (connections > 5) {
                    inferences.push({
                        type: 'centrality',
                        observation: `${entity.name} is a hub entity with ${connections} connections`,
                        importance: connections > 10 ? 'very high' : 'high',
                    });
                }

                return { success: true, entity: entity.name, inferences, totalInferences: inferences.length };
            }

            case 'find_patterns': {
                const uid = userId || 'system';
                const relations = await prisma.kGRelation.findMany({
                    where: { userId: uid },
                    include: { fromEntity: { select: { type: true } }, toEntity: { select: { type: true } } },
                });

                // Find common patterns: (entity_type) -[relation_type]-> (entity_type)
                const patternCounts = {};
                for (const r of relations) {
                    const pattern = `(${r.fromEntity.type}) -[${r.type}]-> (${r.toEntity.type})`;
                    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
                }

                const patterns = Object.entries(patternCounts)
                    .map(([pattern, count]) => ({ pattern, count }))
                    .sort((a, b) => b.count - a.count);

                return { success: true, patterns, totalPatterns: patterns.length };
            }

            case 'suggest_connections': {
                const uid = userId || 'system';
                const entities = await prisma.kGEntity.findMany({ where: { userId: uid }, include: { outRelations: true, inRelations: true }, take: 50 });

                const suggestions = [];
                // Entities of same type with no direct relation
                for (let i = 0; i < entities.length; i++) {
                    for (let j = i + 1; j < entities.length; j++) {
                        const a = entities[i], b = entities[j];
                        if (a.type !== b.type) continue;
                        const connected = a.outRelations.some(r => r.toId === b.id) || a.inRelations.some(r => r.fromId === b.id);
                        if (!connected) {
                            // Check if they share neighbors
                            const aNeighbors = new Set([...a.outRelations.map(r => r.toId), ...a.inRelations.map(r => r.fromId)]);
                            const bNeighbors = new Set([...b.outRelations.map(r => r.toId), ...b.inRelations.map(r => r.fromId)]);
                            const shared = [...aNeighbors].filter(n => bNeighbors.has(n));
                            if (shared.length > 0) {
                                suggestions.push({
                                    from: a.name,
                                    to: b.name,
                                    type: a.type,
                                    sharedNeighbors: shared.length,
                                    confidence: Math.min(shared.length * 0.2, 0.9),
                                });
                            }
                        }
                    }
                }

                suggestions.sort((a, b) => b.confidence - a.confidence);
                return { success: true, suggestions: suggestions.slice(0, 20), count: suggestions.length };
            }

            default:
                return { success: false, error: `Unknown action: ${action}. Use infer, find_patterns, suggest_connections.` };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function resolveEntity(nameOrId, userId) {
    // Try by ID first
    let entity = await prisma.kGEntity.findUnique({ where: { id: nameOrId } }).catch(() => null);
    if (entity) return entity;
    // Try by exact name + userId
    entity = await prisma.kGEntity.findFirst({ where: { userId: userId || 'system', name: { equals: nameOrId, mode: 'insensitive' } } });
    if (entity) return entity;
    // Try by alias
    entity = await prisma.kGEntity.findFirst({ where: { userId: userId || 'system', aliases: { array_contains: [nameOrId] } } }).catch(() => null);
    return entity;
}

async function resolveEntityFull(name, userId) {
    const entity = await prisma.kGEntity.findFirst({
        where: { userId: userId || 'system', name: { equals: name, mode: 'insensitive' } },
        include: { outRelations: { include: { toEntity: true } }, inRelations: { include: { fromEntity: true } } },
    });
    return entity;
}

function formatEntity(entity) {
    return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        description: entity.description,
        properties: entity.properties,
        confidence: entity.confidence,
        aliases: entity.aliases,
        outgoing: entity.outRelations?.map(r => ({ relation: r.type, to: r.toEntity?.name || r.toId, weight: r.weight })) || [],
        incoming: entity.inRelations?.map(r => ({ relation: r.type, from: r.fromEntity?.name || r.fromId, weight: r.weight })) || [],
    };
}

function computeSimilarity(a, b) {
    let score = 0;
    // Name similarity (Levenshtein-based)
    const nameSim = 1 - levenshtein(a.name.toLowerCase(), b.name.toLowerCase()) / Math.max(a.name.length, b.name.length);
    score += nameSim * 0.5;
    // Same type
    if (a.type === b.type) score += 0.2;
    // Alias overlap
    const aAliases = (a.aliases || []).map(s => s.toLowerCase());
    const bAliases = (b.aliases || []).map(s => s.toLowerCase());
    if (aAliases.includes(b.name.toLowerCase()) || bAliases.includes(a.name.toLowerCase())) score += 0.3;
    return Math.min(score, 1);
}

function getSimilarityReason(a, b) {
    const reasons = [];
    const nameSim = 1 - levenshtein(a.name.toLowerCase(), b.name.toLowerCase()) / Math.max(a.name.length, b.name.length);
    if (nameSim > 0.7) reasons.push('similar names');
    if (a.type === b.type) reasons.push('same type');
    const aAliases = (a.aliases || []).map(s => s.toLowerCase());
    if (aAliases.includes(b.name.toLowerCase())) reasons.push('name matches alias');
    return reasons.join(', ') || 'property overlap';
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

async function bfsShortestPath(fromId, toId, userId, maxDepth) {
    const queue = [{ id: fromId, path: [] }];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
        const { id, path } = queue.shift();
        if (path.length >= maxDepth) continue;

        const entity = await prisma.kGEntity.findUnique({ where: { id }, select: { name: true } });
        const outRels = await prisma.kGRelation.findMany({
            where: { fromId: id },
            include: { toEntity: { select: { id: true, name: true } } },
        });
        const inRels = await prisma.kGRelation.findMany({
            where: { toId: id, bidirectional: true },
            include: { fromEntity: { select: { id: true, name: true } } },
        });

        const neighbors = [
            ...outRels.map(r => ({ id: r.toId, name: r.toEntity.name, via: r.type })),
            ...inRels.map(r => ({ id: r.fromId, name: r.fromEntity.name, via: r.type })),
        ];

        for (const neighbor of neighbors) {
            if (neighbor.id === toId) {
                return [...path, { from: entity?.name, to: neighbor.name, via: neighbor.via }];
            }
            if (!visited.has(neighbor.id)) {
                visited.add(neighbor.id);
                queue.push({ id: neighbor.id, path: [...path, { from: entity?.name, to: neighbor.name, via: neighbor.via }] });
            }
        }
    }
    return null;
}

function inferRelationType(rel1, rel2) {
    const combos = {
        'works_at+located_in': 'works_in',
        'part_of+contains': 'associated_with',
        'knows+works_at': 'connected_to',
        'causes+causes': 'indirectly_causes',
        'depends_on+depends_on': 'transitively_depends_on',
    };
    return combos[`${rel1}+${rel2}`] || combos[`${rel2}+${rel1}`] || 'indirectly_related';
}

export default {
    kgCreate,
    kgQuery,
    kgVisualize,
    kgMerge,
    kgReason,
};
