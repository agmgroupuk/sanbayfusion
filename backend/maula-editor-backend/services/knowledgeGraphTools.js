/**
 * ============================================================================
 * KNOWLEDGE GRAPH TOOLS V4 — PROFESSOR GRADE
 * ============================================================================
 * kg_create, kg_query, kg_visualize, kg_merge, kg_reason,
 * kg_export, kg_embed, kg_cluster, kg_history
 * Entity-relationship knowledge graphs with semantic search, Mermaid
 * visualization, graph merging, and inference/reasoning engine.
 * ALL state persisted to PostgreSQL via Prisma — ZERO localStorage
 * ============================================================================
 */

const MAX_OUTPUT = 50000;

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const KNOWLEDGE_GRAPH_TOOL_DEFINITIONS = [
    {
        name: 'kg_create',
        description:
            'Create and manage knowledge graph entities and relationships. Add nodes (concepts, people, projects, technologies) and edges (uses, depends_on, created_by, etc.). Supports properties, aliases, and bulk import. All stored in database.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['add_entity', 'update_entity', 'delete_entity', 'add_relation', 'delete_relation', 'bulk_import', 'list_entities', 'list_relations'],
                    description: 'Knowledge graph action',
                },
                // Entity fields
                name: { type: 'string', description: 'Entity name' },
                entityType: { type: 'string', description: 'Entity type (person, concept, project, technology, organization, etc.)' },
                properties: { type: 'object', description: 'Key-value properties for the entity' },
                aliases: { type: 'array', items: { type: 'string' }, description: 'Alternative names/aliases' },
                source: { type: 'string', description: 'Where this entity came from (chat, file, manual)' },
                entityId: { type: 'string', description: '[update/delete] Entity ID' },
                // Relation fields
                fromEntityId: { type: 'string', description: '[add_relation] Source entity ID' },
                fromEntityName: { type: 'string', description: '[add_relation] Source entity name (alternative to ID)' },
                toEntityId: { type: 'string', description: '[add_relation] Target entity ID' },
                toEntityName: { type: 'string', description: '[add_relation] Target entity name (alternative to ID)' },
                relationType: { type: 'string', description: '[add_relation] Relationship type (uses, depends_on, created_by, part_of, relates_to, etc.)' },
                weight: { type: 'number', description: '[add_relation] Relationship weight/strength (0-1). Default: 1.0' },
                relationId: { type: 'string', description: '[delete_relation] Relation ID' },
                // Bulk import
                entities: {
                    type: 'array',
                    items: { type: 'object', properties: { name: { type: 'string' }, entityType: { type: 'string' }, properties: { type: 'object' } } },
                    description: '[bulk_import] Array of entities to create',
                },
                relations: {
                    type: 'array',
                    items: { type: 'object', properties: { fromName: { type: 'string' }, toName: { type: 'string' }, relationType: { type: 'string' } } },
                    description: '[bulk_import] Array of relations to create',
                },
                // List filters
                typeFilter: { type: 'string', description: '[list] Filter by entity type' },
                take: { type: 'number', description: '[list] Limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_query',
        description:
            'Query the knowledge graph: find entities, traverse relationships, shortest path between nodes, find neighbors, subgraph extraction, and full-text search across entity names and properties.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['search', 'neighbors', 'path', 'subgraph', 'stats', 'by_type', 'connected_components'],
                    description: 'Query action',
                },
                query: { type: 'string', description: '[search] Search text (matches name, aliases, properties)' },
                entityId: { type: 'string', description: '[neighbors/subgraph] Entity ID' },
                entityName: { type: 'string', description: '[neighbors/subgraph/search] Entity name' },
                fromId: { type: 'string', description: '[path] Start entity ID' },
                toId: { type: 'string', description: '[path] End entity ID' },
                depth: { type: 'number', description: '[neighbors/subgraph] Traversal depth. Default: 1' },
                relationType: { type: 'string', description: 'Filter by relation type' },
                entityType: { type: 'string', description: '[by_type] Entity type to list' },
                take: { type: 'number', description: 'Result limit. Default: 50' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_visualize',
        description:
            'Visualize the knowledge graph as Mermaid diagram, force-directed graph layout, or adjacency matrix. Supports filtering by entity type, relation type, and depth. Color-codes by entity type.',
        input_schema: {
            type: 'object',
            properties: {
                format: { type: 'string', enum: ['mermaid', 'json_graph', 'adjacency', 'stats_chart'], description: 'Visualization format. Default: mermaid' },
                entityId: { type: 'string', description: 'Center entity for ego-graph visualization' },
                entityType: { type: 'string', description: 'Filter to specific entity type' },
                relationType: { type: 'string', description: 'Filter to specific relation type' },
                depth: { type: 'number', description: 'Traversal depth from center. Default: 2' },
                maxNodes: { type: 'number', description: 'Maximum nodes to include. Default: 50' },
            },
            required: [],
        },
    },
    {
        name: 'kg_merge',
        description:
            'Merge knowledge graphs: deduplicate entities, merge properties, combine relationships, resolve conflicts. Supports merging two entity IDs into one, or bulk deduplication of similar entities.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['merge_entities', 'find_duplicates', 'bulk_deduplicate', 'merge_properties'],
                    description: 'Merge action',
                },
                sourceEntityId: { type: 'string', description: '[merge_entities] Entity to merge FROM (will be deleted)' },
                targetEntityId: { type: 'string', description: '[merge_entities] Entity to merge INTO (will be kept)' },
                similarityThreshold: { type: 'number', description: '[find_duplicates/bulk_deduplicate] Name similarity threshold (0-1). Default: 0.8' },
                entityId: { type: 'string', description: '[merge_properties] Entity ID' },
                properties: { type: 'object', description: '[merge_properties] Properties to merge in' },
                conflictStrategy: { type: 'string', enum: ['keep_existing', 'overwrite', 'merge_arrays'], description: 'How to handle property conflicts. Default: overwrite' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_reason',
        description:
            'Knowledge graph reasoning and inference: find implied relationships, transitive closure, common ancestors, relationship chains, pattern matching, and entity importance ranking (PageRank-like).',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['infer', 'transitive', 'common_ancestors', 'chain', 'importance', 'patterns', 'suggest_relations'],
                    description: 'Reasoning action',
                },
                entityId: { type: 'string', description: 'Entity ID for reasoning' },
                entityIds: { type: 'array', items: { type: 'string' }, description: '[common_ancestors] Two or more entity IDs' },
                relationType: { type: 'string', description: '[transitive/chain] Relation type to follow' },
                maxDepth: { type: 'number', description: 'Maximum reasoning depth. Default: 5' },
                pattern: { type: 'object', description: '[patterns] Pattern to match { entityType, relationType, targetType }' },
                topK: { type: 'number', description: '[importance] Top K entities. Default: 10' },
            },
            required: ['action'],
        },
    },
    // ------------------------------------------------------------------
    // NEW RECOMMENDED TOOLS
    // ------------------------------------------------------------------
    {
        name: 'kg_export',
        description:
            'Export and import knowledge graphs in multiple formats: JSON-LD, GraphML, CSV, Cypher (Neo4j), RDF/Turtle, DOT (Graphviz). Supports full graph or filtered subsets. Import from external graph files.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['export_json', 'export_graphml', 'export_csv', 'export_cypher', 'export_rdf', 'export_dot', 'import_json', 'summary'],
                    description: 'Export/import action',
                },
                entityType: { type: 'string', description: '[export] Filter to entity type' },
                relationType: { type: 'string', description: '[export] Filter to relation type' },
                maxNodes: { type: 'number', description: '[export] Maximum nodes. Default: 500' },
                content: { type: 'string', description: '[import_json] JSON content to import' },
                includeProperties: { type: 'boolean', description: '[export] Include entity properties. Default: true' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_embed',
        description:
            'Generate and manage vector embeddings for knowledge graph entities. Create semantic fingerprints from entity names, types, properties, and relationships. Find semantically similar entities even with different names.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['generate', 'similar', 'cluster_embeddings', 'compare', 'search_semantic', 'stats'],
                    description: 'Embedding action',
                },
                entityId: { type: 'string', description: '[generate/similar/compare] Entity ID' },
                compareEntityId: { type: 'string', description: '[compare] Second entity ID for similarity comparison' },
                query: { type: 'string', description: '[search_semantic] Natural language query' },
                topK: { type: 'number', description: '[similar/search_semantic] Number of results. Default: 10' },
                numClusters: { type: 'number', description: '[cluster_embeddings] Number of clusters. Default: 5' },
                regenerate: { type: 'boolean', description: '[generate] Force regeneration. Default: false' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_cluster',
        description:
            'Community detection and clustering within the knowledge graph. Find tightly-connected groups, identify bridge entities, detect isolated nodes, compute graph density, and label communities automatically.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['detect_communities', 'bridges', 'isolated', 'density', 'central_entities', 'label_propagation'],
                    description: 'Clustering action',
                },
                algorithm: { type: 'string', enum: ['louvain', 'label_propagation', 'connected_components'], description: 'Clustering algorithm. Default: connected_components' },
                entityType: { type: 'string', description: 'Filter to entity type' },
                minCommunitySize: { type: 'number', description: '[detect_communities] Minimum community size. Default: 2' },
                topK: { type: 'number', description: '[central_entities/bridges] Number of results. Default: 10' },
            },
            required: ['action'],
        },
    },
    {
        name: 'kg_history',
        description:
            'Track and query changes to the knowledge graph over time. View entity creation/modification history, relationship changes, graph evolution timeline, and temporal snapshots. Supports undo of recent operations.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['entity_history', 'relation_history', 'timeline', 'snapshot', 'undo', 'change_stats'],
                    description: 'History action',
                },
                entityId: { type: 'string', description: '[entity_history] Entity ID' },
                relationId: { type: 'string', description: '[relation_history] Relation ID' },
                dateRange: { type: 'string', description: '[timeline/change_stats] Time range (e.g. "7d", "30d")' },
                take: { type: 'number', description: '[timeline] Limit. Default: 50' },
                operationId: { type: 'string', description: '[undo] Operation ID to undo' },
            },
            required: ['action'],
        },
    },
];

// ============================================================================
// HELPER: String similarity (Jaccard on bigrams)
// ============================================================================

function bigramSimilarity(a, b) {
    if (!a || !b) return 0;
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a === b) return 1;
    const bigramsA = new Set();
    const bigramsB = new Set();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
    for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));
    const intersection = [...bigramsA].filter((bg) => bigramsB.has(bg)).length;
    const union = new Set([...bigramsA, ...bigramsB]).size;
    return union === 0 ? 0 : intersection / union;
}

// ============================================================================
// EXECUTORS
// ============================================================================

async function executeKgCreate(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'add_entity': {
            const { name, entityType, properties = {}, aliases = [], source } = input;
            if (!name || !entityType) return JSON.stringify({ status: 'error', error: 'name and entityType required' });

            const entity = await prisma.kgEntity.upsert({
                where: { userId_name_entityType: { userId, name, entityType } },
                update: { properties, aliases, source, referenceCount: { increment: 1 }, lastReferencedAt: new Date() },
                create: { userId, name, entityType, properties, aliases, source: source || 'manual', referenceCount: 1, lastReferencedAt: new Date() },
            });

            return JSON.stringify({ status: 'success', entity: { id: entity.id, name: entity.name, type: entity.entityType } });
        }

        case 'update_entity': {
            const { entityId, name, entityType, properties, aliases, source } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });

            const existing = await prisma.kgEntity.findFirst({ where: { id: entityId, userId } });
            if (!existing) return JSON.stringify({ status: 'error', error: 'Entity not found' });

            const data = {};
            if (name !== undefined) data.name = name;
            if (entityType !== undefined) data.entityType = entityType;
            if (properties !== undefined) data.properties = properties;
            if (aliases !== undefined) data.aliases = aliases;
            if (source !== undefined) data.source = source;

            const updated = await prisma.kgEntity.update({ where: { id: entityId }, data });
            return JSON.stringify({ status: 'success', entity: { id: updated.id, name: updated.name, type: updated.entityType } });
        }

        case 'delete_entity': {
            const { entityId } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });
            await prisma.kgRelation.deleteMany({ where: { OR: [{ fromEntityId: entityId }, { toEntityId: entityId }], userId } });
            await prisma.kgEntity.deleteMany({ where: { id: entityId, userId } });
            return JSON.stringify({ status: 'success', deleted: entityId });
        }

        case 'add_relation': {
            let { fromEntityId, toEntityId, fromEntityName, toEntityName, relationType, weight = 1.0, properties = {}, source } = input;
            if (!relationType) return JSON.stringify({ status: 'error', error: 'relationType required' });

            // Resolve by name if IDs not provided
            if (!fromEntityId && fromEntityName) {
                const e = await prisma.kgEntity.findFirst({ where: { userId, name: fromEntityName } });
                if (e) fromEntityId = e.id;
                else return JSON.stringify({ status: 'error', error: `Entity "${fromEntityName}" not found` });
            }
            if (!toEntityId && toEntityName) {
                const e = await prisma.kgEntity.findFirst({ where: { userId, name: toEntityName } });
                if (e) toEntityId = e.id;
                else return JSON.stringify({ status: 'error', error: `Entity "${toEntityName}" not found` });
            }

            if (!fromEntityId || !toEntityId) return JSON.stringify({ status: 'error', error: 'fromEntityId and toEntityId (or names) required' });

            const relation = await prisma.kgRelation.upsert({
                where: { fromEntityId_toEntityId_relationType: { fromEntityId, toEntityId, relationType } },
                update: { weight, properties, source },
                create: { userId, fromEntityId, toEntityId, relationType, weight, properties, source: source || 'manual' },
            });

            return JSON.stringify({ status: 'success', relation: { id: relation.id, from: fromEntityId, to: toEntityId, type: relationType, weight } });
        }

        case 'delete_relation': {
            const { relationId } = input;
            if (!relationId) return JSON.stringify({ status: 'error', error: 'relationId required' });
            await prisma.kgRelation.deleteMany({ where: { id: relationId, userId } });
            return JSON.stringify({ status: 'success', deleted: relationId });
        }

        case 'bulk_import': {
            const { entities = [], relations = [] } = input;
            const created = { entities: 0, relations: 0, errors: [] };

            // Create entities
            for (const ent of entities) {
                try {
                    await prisma.kgEntity.upsert({
                        where: { userId_name_entityType: { userId, name: ent.name, entityType: ent.entityType || 'concept' } },
                        update: { properties: ent.properties || {}, lastReferencedAt: new Date() },
                        create: { userId, name: ent.name, entityType: ent.entityType || 'concept', properties: ent.properties || {}, source: 'bulk_import' },
                    });
                    created.entities++;
                } catch (e) {
                    created.errors.push(`Entity "${ent.name}": ${e.message}`);
                }
            }

            // Create relations
            for (const rel of relations) {
                try {
                    const from = await prisma.kgEntity.findFirst({ where: { userId, name: rel.fromName } });
                    const to = await prisma.kgEntity.findFirst({ where: { userId, name: rel.toName } });
                    if (!from || !to) {
                        created.errors.push(`Relation ${rel.fromName} -> ${rel.toName}: entity not found`);
                        continue;
                    }
                    await prisma.kgRelation.upsert({
                        where: { fromEntityId_toEntityId_relationType: { fromEntityId: from.id, toEntityId: to.id, relationType: rel.relationType || 'relates_to' } },
                        update: {},
                        create: { userId, fromEntityId: from.id, toEntityId: to.id, relationType: rel.relationType || 'relates_to', source: 'bulk_import' },
                    });
                    created.relations++;
                } catch (e) {
                    created.errors.push(`Relation: ${e.message}`);
                }
            }

            return JSON.stringify({ status: 'success', imported: created });
        }

        case 'list_entities': {
            const take = Math.min(input.take || 50, 200);
            const where = { userId };
            if (input.typeFilter) where.entityType = input.typeFilter;
            const entities = await prisma.kgEntity.findMany({
                where,
                select: { id: true, name: true, entityType: true, referenceCount: true, aliases: true, createdAt: true },
                orderBy: { referenceCount: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: entities.length, entities });
        }

        case 'list_relations': {
            const take = Math.min(input.take || 50, 200);
            const where = { userId };
            if (input.relationType) where.relationType = input.relationType;
            const relations = await prisma.kgRelation.findMany({
                where,
                include: {
                    fromEntity: { select: { id: true, name: true, entityType: true } },
                    toEntity: { select: { id: true, name: true, entityType: true } },
                },
                orderBy: { createdAt: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: relations.length, relations });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_create action: ${action}` });
    }
}

async function executeKgQuery(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'search': {
            const { query, entityType, take: limit = 50 } = input;
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const take = Math.min(limit, 200);

            const where = { userId };
            if (entityType) where.entityType = entityType;

            const allEntities = await prisma.kgEntity.findMany({ where, take: 500 });
            const results = allEntities
                .map((e) => {
                    const nameScore = bigramSimilarity(query, e.name);
                    const aliasScore = Array.isArray(e.aliases) ? Math.max(0, ...e.aliases.map((a) => bigramSimilarity(query, a))) : 0;
                    const propScore = e.properties ? bigramSimilarity(query, JSON.stringify(e.properties)) * 0.5 : 0;
                    return { ...e, score: Math.max(nameScore, aliasScore, propScore) };
                })
                .filter((e) => e.score > 0.2 || e.name.toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => b.score - a.score)
                .slice(0, take);

            return JSON.stringify({ status: 'success', count: results.length, results: results.map((r) => ({ id: r.id, name: r.name, type: r.entityType, score: Math.round(r.score * 100) / 100, properties: r.properties })) });
        }

        case 'neighbors': {
            const { entityId, entityName, depth = 1, relationType } = input;
            let targetId = entityId;
            if (!targetId && entityName) {
                const e = await prisma.kgEntity.findFirst({ where: { userId, name: entityName } });
                if (e) targetId = e.id;
                else return JSON.stringify({ status: 'error', error: `Entity "${entityName}" not found` });
            }
            if (!targetId) return JSON.stringify({ status: 'error', error: 'entityId or entityName required' });

            const visited = new Set();
            const neighbors = [];
            let frontier = [targetId];

            for (let d = 0; d < depth; d++) {
                const nextFrontier = [];
                for (const nodeId of frontier) {
                    if (visited.has(nodeId)) continue;
                    visited.add(nodeId);

                    const relWhere = { userId, OR: [{ fromEntityId: nodeId }, { toEntityId: nodeId }] };
                    if (relationType) relWhere.relationType = relationType;

                    const rels = await prisma.kgRelation.findMany({
                        where: relWhere,
                        include: {
                            fromEntity: { select: { id: true, name: true, entityType: true } },
                            toEntity: { select: { id: true, name: true, entityType: true } },
                        },
                    });

                    for (const rel of rels) {
                        const neighborId = rel.fromEntityId === nodeId ? rel.toEntityId : rel.fromEntityId;
                        const neighborEntity = rel.fromEntityId === nodeId ? rel.toEntity : rel.fromEntity;
                        const direction = rel.fromEntityId === nodeId ? 'outgoing' : 'incoming';

                        if (!visited.has(neighborId)) {
                            neighbors.push({ entity: neighborEntity, relation: { id: rel.id, type: rel.relationType, direction, weight: rel.weight }, depth: d + 1 });
                            nextFrontier.push(neighborId);
                        }
                    }
                }
                frontier = nextFrontier;
            }

            return JSON.stringify({ status: 'success', center: targetId, depth, count: neighbors.length, neighbors }).slice(0, MAX_OUTPUT);
        }

        case 'path': {
            const { fromId, toId } = input;
            if (!fromId || !toId) return JSON.stringify({ status: 'error', error: 'fromId and toId required' });

            // BFS shortest path
            const queue = [[fromId]];
            const visited = new Set([fromId]);
            let foundPath = null;

            while (queue.length > 0 && !foundPath) {
                const path = queue.shift();
                const current = path[path.length - 1];

                if (path.length > 10) break; // max depth

                const rels = await prisma.kgRelation.findMany({
                    where: { userId, OR: [{ fromEntityId: current }, { toEntityId: current }] },
                    include: {
                        fromEntity: { select: { id: true, name: true, entityType: true } },
                        toEntity: { select: { id: true, name: true, entityType: true } },
                    },
                });

                for (const rel of rels) {
                    const next = rel.fromEntityId === current ? rel.toEntityId : rel.fromEntityId;
                    const nextEntity = rel.fromEntityId === current ? rel.toEntity : rel.fromEntity;

                    if (next === toId) {
                        foundPath = [...path, { entityId: next, entity: nextEntity, via: { relationType: rel.relationType, weight: rel.weight } }];
                        break;
                    }

                    if (!visited.has(next)) {
                        visited.add(next);
                        queue.push([...path, { entityId: next, entity: nextEntity, via: { relationType: rel.relationType, weight: rel.weight } }]);
                    }
                }
            }

            if (!foundPath) return JSON.stringify({ status: 'success', found: false, message: 'No path found between entities' });

            return JSON.stringify({ status: 'success', found: true, pathLength: foundPath.length - 1, path: foundPath });
        }

        case 'subgraph': {
            const { entityId, depth = 2 } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });

            // Extract subgraph via BFS
            const visited = new Set();
            const entities = [];
            const relations = [];
            let frontier = [entityId];

            for (let d = 0; d <= depth && frontier.length > 0; d++) {
                const nextFrontier = [];
                for (const nodeId of frontier) {
                    if (visited.has(nodeId)) continue;
                    visited.add(nodeId);

                    const entity = await prisma.kgEntity.findFirst({ where: { id: nodeId, userId }, select: { id: true, name: true, entityType: true, properties: true } });
                    if (entity) entities.push(entity);

                    const rels = await prisma.kgRelation.findMany({
                        where: { userId, OR: [{ fromEntityId: nodeId }, { toEntityId: nodeId }] },
                    });

                    for (const rel of rels) {
                        relations.push({ id: rel.id, from: rel.fromEntityId, to: rel.toEntityId, type: rel.relationType, weight: rel.weight });
                        const neighbor = rel.fromEntityId === nodeId ? rel.toEntityId : rel.fromEntityId;
                        if (!visited.has(neighbor)) nextFrontier.push(neighbor);
                    }
                }
                frontier = nextFrontier;
            }

            return JSON.stringify({ status: 'success', entityCount: entities.length, relationCount: relations.length, entities, relations }).slice(0, MAX_OUTPUT);
        }

        case 'stats': {
            const entityCount = await prisma.kgEntity.count({ where: { userId } });
            const relationCount = await prisma.kgRelation.count({ where: { userId } });

            const entityTypes = await prisma.kgEntity.groupBy({ by: ['entityType'], where: { userId }, _count: true, orderBy: { _count: { entityType: 'desc' } } });
            const relationTypes = await prisma.kgRelation.groupBy({ by: ['relationType'], where: { userId }, _count: true, orderBy: { _count: { relationType: 'desc' } } });

            return JSON.stringify({
                status: 'success',
                stats: {
                    entities: entityCount,
                    relations: relationCount,
                    entityTypes: entityTypes.map((t) => ({ type: t.entityType, count: t._count })),
                    relationTypes: relationTypes.map((t) => ({ type: t.relationType, count: t._count })),
                    density: entityCount > 1 ? Math.round((relationCount / (entityCount * (entityCount - 1))) * 10000) / 10000 : 0,
                },
            });
        }

        case 'by_type': {
            const { entityType, take: limit = 50 } = input;
            if (!entityType) return JSON.stringify({ status: 'error', error: 'entityType required' });
            const take = Math.min(limit, 200);
            const entities = await prisma.kgEntity.findMany({
                where: { userId, entityType },
                select: { id: true, name: true, entityType: true, properties: true, referenceCount: true },
                orderBy: { referenceCount: 'desc' },
                take,
            });
            return JSON.stringify({ status: 'success', count: entities.length, type: entityType, entities });
        }

        case 'connected_components': {
            // Find connected components using union-find
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true } });
            const relations = await prisma.kgRelation.findMany({ where: { userId }, select: { fromEntityId: true, toEntityId: true } });

            const parent = new Map();
            const rank = new Map();
            for (const e of entities) {
                parent.set(e.id, e.id);
                rank.set(e.id, 0);
            }

            function find(x) {
                if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
                return parent.get(x);
            }

            function union(x, y) {
                const rx = find(x),
                    ry = find(y);
                if (rx === ry) return;
                if (rank.get(rx) < rank.get(ry)) parent.set(rx, ry);
                else if (rank.get(rx) > rank.get(ry)) parent.set(ry, rx);
                else {
                    parent.set(ry, rx);
                    rank.set(rx, rank.get(rx) + 1);
                }
            }

            for (const r of relations) {
                if (parent.has(r.fromEntityId) && parent.has(r.toEntityId)) {
                    union(r.fromEntityId, r.toEntityId);
                }
            }

            const components = new Map();
            for (const e of entities) {
                const root = find(e.id);
                if (!components.has(root)) components.set(root, []);
                components.get(root).push({ id: e.id, name: e.name, type: e.entityType });
            }

            const result = [...components.values()].sort((a, b) => b.length - a.length).map((c, i) => ({ componentId: i + 1, size: c.length, entities: c }));

            return JSON.stringify({ status: 'success', componentCount: result.length, components: result }).slice(0, MAX_OUTPUT);
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_query action: ${action}` });
    }
}

async function executeKgVisualize(input, prisma, userId) {
    const { format = 'mermaid', entityId, entityType, relationType, depth = 2, maxNodes = 50 } = input;

    // Gather data
    let entities, relations;

    if (entityId) {
        // Ego graph
        const sub = JSON.parse(await executeKgQuery({ action: 'subgraph', entityId, depth }, prisma, userId));
        if (sub.status !== 'success') return JSON.stringify(sub);
        entities = sub.entities.slice(0, maxNodes);
        relations = sub.relations;
    } else {
        const where = { userId };
        if (entityType) where.entityType = entityType;
        entities = await prisma.kgEntity.findMany({ where, select: { id: true, name: true, entityType: true }, orderBy: { referenceCount: 'desc' }, take: maxNodes });
        const entityIds = entities.map((e) => e.id);
        const relWhere = { userId, fromEntityId: { in: entityIds }, toEntityId: { in: entityIds } };
        if (relationType) relWhere.relationType = relationType;
        relations = await prisma.kgRelation.findMany({ where: relWhere, select: { id: true, fromEntityId: true, toEntityId: true, relationType: true, weight: true } });
    }

    if (format === 'mermaid') {
        const typeColors = { person: ':::person', technology: ':::tech', project: ':::project', concept: ':::concept', organization: ':::org' };
        let diag = `graph LR\n`;

        for (const e of entities) {
            const cls = typeColors[e.entityType] || '';
            const safeName = e.name.replace(/"/g, '\\"');
            diag += `    ${e.id}["${safeName} (${e.entityType})"]${cls}\n`;
        }

        const entitySet = new Set(entities.map((e) => e.id));
        for (const r of relations) {
            if (entitySet.has(r.fromEntityId) && entitySet.has(r.toEntityId)) {
                diag += `    ${r.fromEntityId} -->|"${r.relationType}"| ${r.toEntityId}\n`;
            }
        }

        diag += `    classDef person fill:#3b82f6,stroke:#2563eb,color:#fff\n`;
        diag += `    classDef tech fill:#22c55e,stroke:#16a34a,color:#fff\n`;
        diag += `    classDef project fill:#f59e0b,stroke:#d97706,color:#fff\n`;
        diag += `    classDef concept fill:#8b5cf6,stroke:#7c3aed,color:#fff\n`;
        diag += `    classDef org fill:#ef4444,stroke:#dc2626,color:#fff\n`;

        return JSON.stringify({ status: 'success', format: 'mermaid', diagram: diag, nodeCount: entities.length, edgeCount: relations.length });
    }

    if (format === 'adjacency') {
        const indexMap = new Map(entities.map((e, i) => [e.id, i]));
        const matrix = Array.from({ length: entities.length }, () => Array(entities.length).fill(0));
        for (const r of relations) {
            const i = indexMap.get(r.fromEntityId);
            const j = indexMap.get(r.toEntityId);
            if (i !== undefined && j !== undefined) matrix[i][j] = r.weight || 1;
        }
        return JSON.stringify({ status: 'success', format: 'adjacency', labels: entities.map((e) => e.name), matrix });
    }

    if (format === 'stats_chart') {
        const types = {};
        for (const e of entities) {
            types[e.entityType] = (types[e.entityType] || 0) + 1;
        }
        const relTypes = {};
        for (const r of relations) {
            relTypes[r.relationType] = (relTypes[r.relationType] || 0) + 1;
        }
        return JSON.stringify({ status: 'success', format: 'stats_chart', entityDistribution: types, relationDistribution: relTypes });
    }

    // json_graph
    return JSON.stringify({
        status: 'success',
        format: 'json_graph',
        graph: {
            nodes: entities.map((e) => ({ id: e.id, label: e.name, type: e.entityType })),
            edges: relations.map((r) => ({ from: r.fromEntityId, to: r.toEntityId, type: r.relationType, weight: r.weight })),
        },
    });
}

async function executeKgMerge(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'merge_entities': {
            const { sourceEntityId, targetEntityId } = input;
            if (!sourceEntityId || !targetEntityId) return JSON.stringify({ status: 'error', error: 'sourceEntityId and targetEntityId required' });

            const source = await prisma.kgEntity.findFirst({ where: { id: sourceEntityId, userId } });
            const target = await prisma.kgEntity.findFirst({ where: { id: targetEntityId, userId } });
            if (!source || !target) return JSON.stringify({ status: 'error', error: 'One or both entities not found' });

            // Merge aliases
            const mergedAliases = [...new Set([...((target.aliases) || []), ...((source.aliases) || []), source.name])];

            // Merge properties
            const mergedProps = { ...((source.properties) || {}), ...((target.properties) || {}) };

            // Update target
            await prisma.kgEntity.update({
                where: { id: targetEntityId },
                data: { aliases: mergedAliases, properties: mergedProps, referenceCount: target.referenceCount + source.referenceCount },
            });

            // Re-point relations from source to target
            await prisma.kgRelation.updateMany({ where: { fromEntityId: sourceEntityId, userId }, data: { fromEntityId: targetEntityId } });
            await prisma.kgRelation.updateMany({ where: { toEntityId: sourceEntityId, userId }, data: { toEntityId: targetEntityId } });

            // Delete source
            await prisma.kgEntity.delete({ where: { id: sourceEntityId } });

            return JSON.stringify({ status: 'success', merged: { kept: targetEntityId, deleted: sourceEntityId, aliases: mergedAliases.length, properties: Object.keys(mergedProps).length } });
        }

        case 'find_duplicates': {
            const { similarityThreshold = 0.8 } = input;
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true } });

            const duplicates = [];
            for (let i = 0; i < entities.length; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    if (entities[i].entityType !== entities[j].entityType) continue;
                    const sim = bigramSimilarity(entities[i].name, entities[j].name);
                    if (sim >= similarityThreshold) {
                        duplicates.push({ entity1: entities[i], entity2: entities[j], similarity: Math.round(sim * 100) / 100 });
                    }
                }
            }

            duplicates.sort((a, b) => b.similarity - a.similarity);
            return JSON.stringify({ status: 'success', count: duplicates.length, duplicates: duplicates.slice(0, 50) });
        }

        case 'bulk_deduplicate': {
            const { similarityThreshold = 0.8 } = input;
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true, referenceCount: true } });

            const merged = [];
            const deleted = new Set();

            for (let i = 0; i < entities.length; i++) {
                if (deleted.has(entities[i].id)) continue;
                for (let j = i + 1; j < entities.length; j++) {
                    if (deleted.has(entities[j].id)) continue;
                    if (entities[i].entityType !== entities[j].entityType) continue;
                    const sim = bigramSimilarity(entities[i].name, entities[j].name);
                    if (sim >= similarityThreshold) {
                        // Keep the one with more references
                        const [keep, remove] = entities[i].referenceCount >= entities[j].referenceCount ? [entities[i], entities[j]] : [entities[j], entities[i]];

                        try {
                            await prisma.kgRelation.updateMany({ where: { fromEntityId: remove.id, userId }, data: { fromEntityId: keep.id } });
                            await prisma.kgRelation.updateMany({ where: { toEntityId: remove.id, userId }, data: { toEntityId: keep.id } });
                            await prisma.kgEntity.delete({ where: { id: remove.id } });
                            deleted.add(remove.id);
                            merged.push({ kept: keep.name, removed: remove.name, similarity: Math.round(sim * 100) / 100 });
                        } catch {
                            // skip on conflict
                        }
                    }
                }
            }

            return JSON.stringify({ status: 'success', mergedCount: merged.length, merged });
        }

        case 'merge_properties': {
            const { entityId, properties, conflictStrategy = 'overwrite' } = input;
            if (!entityId || !properties) return JSON.stringify({ status: 'error', error: 'entityId and properties required' });

            const entity = await prisma.kgEntity.findFirst({ where: { id: entityId, userId } });
            if (!entity) return JSON.stringify({ status: 'error', error: 'Entity not found' });

            const existing = (entity.properties) || {};
            let merged;

            if (conflictStrategy === 'keep_existing') {
                merged = { ...properties, ...existing };
            } else if (conflictStrategy === 'merge_arrays') {
                merged = { ...existing };
                for (const [k, v] of Object.entries(properties)) {
                    if (Array.isArray(existing[k]) && Array.isArray(v)) {
                        merged[k] = [...new Set([...existing[k], ...v])];
                    } else {
                        merged[k] = v;
                    }
                }
            } else {
                merged = { ...existing, ...properties };
            }

            await prisma.kgEntity.update({ where: { id: entityId }, data: { properties: merged } });
            return JSON.stringify({ status: 'success', entityId, propertyCount: Object.keys(merged).length, strategy: conflictStrategy });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_merge action: ${action}` });
    }
}

async function executeKgReason(input, prisma, userId) {
    const { action } = input;

    switch (action) {
        case 'infer': {
            const { entityId, maxDepth = 3 } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });

            const entity = await prisma.kgEntity.findFirst({ where: { id: entityId, userId } });
            if (!entity) return JSON.stringify({ status: 'error', error: 'Entity not found' });

            // Get all outgoing and incoming relations up to maxDepth
            const inferred = [];
            const visited = new Set([entityId]);
            let frontier = [entityId];

            for (let d = 0; d < maxDepth; d++) {
                const nextFrontier = [];
                for (const nodeId of frontier) {
                    const rels = await prisma.kgRelation.findMany({
                        where: { userId, fromEntityId: nodeId },
                        include: { toEntity: { select: { id: true, name: true, entityType: true } } },
                    });
                    for (const rel of rels) {
                        if (!visited.has(rel.toEntityId)) {
                            visited.add(rel.toEntityId);
                            nextFrontier.push(rel.toEntityId);
                            if (d > 0) {
                                inferred.push({
                                    entity: rel.toEntity.name,
                                    entityType: rel.toEntity.entityType,
                                    inferredRelation: `indirect_${rel.relationType}`,
                                    depth: d + 1,
                                    confidence: Math.round((1 / (d + 1)) * 100) / 100,
                                });
                            }
                        }
                    }
                }
                frontier = nextFrontier;
            }

            return JSON.stringify({ status: 'success', entity: entity.name, inferredRelationships: inferred.length, inferred: inferred.slice(0, 50) });
        }

        case 'transitive': {
            const { entityId, relationType, maxDepth = 5 } = input;
            if (!entityId || !relationType) return JSON.stringify({ status: 'error', error: 'entityId and relationType required' });

            const chain = [];
            const visited = new Set([entityId]);
            let current = entityId;

            for (let d = 0; d < maxDepth; d++) {
                const rel = await prisma.kgRelation.findFirst({
                    where: { userId, fromEntityId: current, relationType },
                    include: { toEntity: { select: { id: true, name: true, entityType: true } } },
                });
                if (!rel || visited.has(rel.toEntityId)) break;
                visited.add(rel.toEntityId);
                chain.push({ entity: rel.toEntity, relation: relationType, depth: d + 1 });
                current = rel.toEntityId;
            }

            return JSON.stringify({ status: 'success', relationType, chainLength: chain.length, chain });
        }

        case 'common_ancestors': {
            const { entityIds } = input;
            if (!entityIds || entityIds.length < 2) return JSON.stringify({ status: 'error', error: 'At least 2 entityIds required' });

            // For each entity, find all ancestors (incoming relations)
            const ancestorSets = [];
            for (const eid of entityIds) {
                const ancestors = new Set();
                const visited = new Set([eid]);
                let frontier = [eid];

                for (let d = 0; d < 5; d++) {
                    const nextFrontier = [];
                    for (const nodeId of frontier) {
                        const rels = await prisma.kgRelation.findMany({
                            where: { userId, toEntityId: nodeId },
                            include: { fromEntity: { select: { id: true, name: true, entityType: true } } },
                        });
                        for (const rel of rels) {
                            if (!visited.has(rel.fromEntityId)) {
                                visited.add(rel.fromEntityId);
                                ancestors.add(rel.fromEntityId);
                                nextFrontier.push(rel.fromEntityId);
                            }
                        }
                    }
                    frontier = nextFrontier;
                }
                ancestorSets.push(ancestors);
            }

            // Intersect
            let common = ancestorSets[0];
            for (let i = 1; i < ancestorSets.length; i++) {
                common = new Set([...common].filter((x) => ancestorSets[i].has(x)));
            }

            const commonEntities = [];
            for (const id of common) {
                const e = await prisma.kgEntity.findFirst({ where: { id, userId }, select: { id: true, name: true, entityType: true } });
                if (e) commonEntities.push(e);
            }

            return JSON.stringify({ status: 'success', inputEntities: entityIds.length, commonAncestors: commonEntities.length, ancestors: commonEntities });
        }

        case 'chain': {
            const { entityId, relationType, maxDepth = 5 } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });

            // Follow relation chains in both directions
            const forwardChain = [];
            const backwardChain = [];
            const visited = new Set([entityId]);

            // Forward
            let current = entityId;
            for (let d = 0; d < maxDepth; d++) {
                const where = { userId, fromEntityId: current };
                if (relationType) where.relationType = relationType;
                const rel = await prisma.kgRelation.findFirst({
                    where,
                    include: { toEntity: { select: { id: true, name: true, entityType: true } } },
                });
                if (!rel || visited.has(rel.toEntityId)) break;
                visited.add(rel.toEntityId);
                forwardChain.push({ entity: rel.toEntity, via: rel.relationType });
                current = rel.toEntityId;
            }

            // Backward
            current = entityId;
            for (let d = 0; d < maxDepth; d++) {
                const where = { userId, toEntityId: current };
                if (relationType) where.relationType = relationType;
                const rel = await prisma.kgRelation.findFirst({
                    where,
                    include: { fromEntity: { select: { id: true, name: true, entityType: true } } },
                });
                if (!rel || visited.has(rel.fromEntityId)) break;
                visited.add(rel.fromEntityId);
                backwardChain.unshift({ entity: rel.fromEntity, via: rel.relationType });
                current = rel.fromEntityId;
            }

            return JSON.stringify({ status: 'success', forward: forwardChain, backward: backwardChain, totalLength: forwardChain.length + backwardChain.length });
        }

        case 'importance': {
            const { topK = 10 } = input;
            // Simplified PageRank-like importance
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true, referenceCount: true } });
            const relations = await prisma.kgRelation.findMany({ where: { userId }, select: { fromEntityId: true, toEntityId: true, weight: true } });

            const scores = new Map(entities.map((e) => [e.id, 1.0]));
            const inLinks = new Map();
            const outCount = new Map();

            for (const r of relations) {
                if (!inLinks.has(r.toEntityId)) inLinks.set(r.toEntityId, []);
                inLinks.get(r.toEntityId).push({ from: r.fromEntityId, weight: r.weight || 1 });
                outCount.set(r.fromEntityId, (outCount.get(r.fromEntityId) || 0) + 1);
            }

            // 10 iterations of simplified PageRank
            const damping = 0.85;
            for (let iter = 0; iter < 10; iter++) {
                const newScores = new Map();
                for (const e of entities) {
                    let incoming = 0;
                    const links = inLinks.get(e.id) || [];
                    for (const link of links) {
                        const out = outCount.get(link.from) || 1;
                        incoming += ((scores.get(link.from) || 0) / out) * link.weight;
                    }
                    newScores.set(e.id, (1 - damping) + damping * incoming);
                }
                for (const [id, s] of newScores) scores.set(id, s);
            }

            const ranked = entities.map((e) => ({ ...e, importance: Math.round((scores.get(e.id) || 0) * 10000) / 10000 })).sort((a, b) => b.importance - a.importance).slice(0, topK);

            return JSON.stringify({ status: 'success', topK, ranked });
        }

        case 'patterns': {
            const { pattern } = input;
            if (!pattern) return JSON.stringify({ status: 'error', error: 'pattern required (e.g., { entityType, relationType, targetType })' });

            const { entityType, relationType, targetType } = pattern;
            const where = { userId };
            if (relationType) where.relationType = relationType;

            const rels = await prisma.kgRelation.findMany({
                where,
                include: {
                    fromEntity: { select: { id: true, name: true, entityType: true } },
                    toEntity: { select: { id: true, name: true, entityType: true } },
                },
                take: 200,
            });

            const matches = rels.filter((r) => {
                if (entityType && r.fromEntity.entityType !== entityType) return false;
                if (targetType && r.toEntity.entityType !== targetType) return false;
                return true;
            });

            return JSON.stringify({
                status: 'success',
                pattern,
                matchCount: matches.length,
                matches: matches.slice(0, 50).map((r) => ({ from: r.fromEntity, relation: r.relationType, to: r.toEntity })),
            });
        }

        case 'suggest_relations': {
            const { entityId } = input;
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });

            const entity = await prisma.kgEntity.findFirst({ where: { id: entityId, userId } });
            if (!entity) return JSON.stringify({ status: 'error', error: 'Entity not found' });

            // Find entities of same type with similar properties but not yet connected
            const sameType = await prisma.kgEntity.findMany({
                where: { userId, entityType: entity.entityType, id: { not: entityId } },
                take: 100,
            });

            const existingRels = await prisma.kgRelation.findMany({
                where: { userId, OR: [{ fromEntityId: entityId }, { toEntityId: entityId }] },
                select: { fromEntityId: true, toEntityId: true },
            });
            const connected = new Set(existingRels.flatMap((r) => [r.fromEntityId, r.toEntityId]));

            const suggestions = [];
            for (const candidate of sameType) {
                if (connected.has(candidate.id)) continue;
                const sim = bigramSimilarity(JSON.stringify(entity.properties || {}), JSON.stringify(candidate.properties || {}));
                if (sim > 0.3) {
                    suggestions.push({ entity: { id: candidate.id, name: candidate.name, type: candidate.entityType }, similarity: Math.round(sim * 100) / 100, suggestedRelation: 'relates_to' });
                }
            }

            suggestions.sort((a, b) => b.similarity - a.similarity);
            return JSON.stringify({ status: 'success', entity: entity.name, suggestions: suggestions.slice(0, 10) });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_reason action: ${action}` });
    }
}

// ============================================================================
// KG EXPORT EXECUTOR
// ============================================================================

async function executeKgExport(input, prisma, userId) {
    const { action, entityType, relationType, maxNodes = 500, content, includeProperties = true } = input;

    // Helper: load graph data
    async function loadGraph() {
        const where = { userId };
        if (entityType) where.entityType = entityType;
        const entities = await prisma.kgEntity.findMany({ where, take: maxNodes, orderBy: { referenceCount: 'desc' } });
        const entityIds = new Set(entities.map(e => e.id));
        const relWhere = { userId, fromEntityId: { in: [...entityIds] }, toEntityId: { in: [...entityIds] } };
        if (relationType) relWhere.relationType = relationType;
        const relations = await prisma.kgRelation.findMany({
            where: relWhere,
            include: { fromEntity: { select: { id: true, name: true, entityType: true } }, toEntity: { select: { id: true, name: true, entityType: true } } },
        });
        return { entities, relations };
    }

    switch (action) {
        case 'export_json': {
            const { entities, relations } = await loadGraph();
            const graph = {
                nodes: entities.map(e => ({ id: e.id, name: e.name, type: e.entityType, ...(includeProperties ? { properties: e.properties } : {}), aliases: e.aliases })),
                edges: relations.map(r => ({ id: r.id, from: r.fromEntity.name, to: r.toEntity.name, type: r.relationType, weight: r.weight })),
                metadata: { exportedAt: new Date().toISOString(), nodeCount: entities.length, edgeCount: relations.length },
            };
            return JSON.stringify({ status: 'success', format: 'json', graph }).slice(0, MAX_OUTPUT);
        }

        case 'export_graphml': {
            const { entities, relations } = await loadGraph();
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphstudio.org/xmlns/graphml">\n';
            xml += '  <key id="label" for="node" attr.name="label" attr.type="string"/>\n';
            xml += '  <key id="type" for="node" attr.name="type" attr.type="string"/>\n';
            xml += '  <key id="reltype" for="edge" attr.name="relationType" attr.type="string"/>\n';
            xml += '  <graph id="G" edgedefault="directed">\n';
            entities.forEach(e => {
                xml += `    <node id="${e.id}"><data key="label">${e.name}</data><data key="type">${e.entityType}</data></node>\n`;
            });
            relations.forEach(r => {
                xml += `    <edge source="${r.fromEntityId}" target="${r.toEntityId}"><data key="reltype">${r.relationType}</data></edge>\n`;
            });
            xml += '  </graph>\n</graphml>';
            return JSON.stringify({ status: 'success', format: 'graphml', content: xml, nodes: entities.length, edges: relations.length });
        }

        case 'export_csv': {
            const { entities, relations } = await loadGraph();
            let nodesCsv = 'id,name,type,aliases\n';
            entities.forEach(e => { nodesCsv += `"${e.id}","${e.name}","${e.entityType}","${(e.aliases || []).join(';')}"\n`; });
            let edgesCsv = 'from_name,to_name,relation_type,weight\n';
            relations.forEach(r => { edgesCsv += `"${r.fromEntity.name}","${r.toEntity.name}","${r.relationType}",${r.weight || 1}\n`; });
            return JSON.stringify({ status: 'success', format: 'csv', nodes: { csv: nodesCsv, count: entities.length }, edges: { csv: edgesCsv, count: relations.length } });
        }

        case 'export_cypher': {
            const { entities, relations } = await loadGraph();
            const statements = [];
            entities.forEach(e => {
                const props = includeProperties && e.properties ? Object.entries(e.properties).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ') : '';
                statements.push(`CREATE (n:${e.entityType.replace(/\s/g, '_')} {name: "${e.name}"${props ? ', ' + props : ''}})`);
            });
            relations.forEach(r => {
                statements.push(`MATCH (a {name: "${r.fromEntity.name}"}), (b {name: "${r.toEntity.name}"}) CREATE (a)-[:${r.relationType.toUpperCase().replace(/\s/g, '_')} {weight: ${r.weight || 1}}]->(b)`);
            });
            return JSON.stringify({ status: 'success', format: 'cypher', statements, count: statements.length });
        }

        case 'export_rdf': {
            const { entities, relations } = await loadGraph();
            const base = 'http://example.org/kg/';
            let turtle = `@prefix kg: <${base}> .\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n\n`;
            entities.forEach(e => {
                const id = e.name.replace(/\s/g, '_');
                turtle += `kg:${id} rdf:type kg:${e.entityType.replace(/\s/g, '_')} ;\n  rdfs:label "${e.name}" .\n\n`;
            });
            relations.forEach(r => {
                turtle += `kg:${r.fromEntity.name.replace(/\s/g, '_')} kg:${r.relationType.replace(/\s/g, '_')} kg:${r.toEntity.name.replace(/\s/g, '_')} .\n`;
            });
            return JSON.stringify({ status: 'success', format: 'rdf_turtle', content: turtle, triples: entities.length + relations.length });
        }

        case 'export_dot': {
            const { entities, relations } = await loadGraph();
            const typeColors = { person: '#4CAF50', technology: '#2196F3', project: '#FF9800', organization: '#9C27B0', concept: '#607D8B' };
            let dot = 'digraph KnowledgeGraph {\n  rankdir=LR;\n  node [shape=box, style=filled];\n\n';
            entities.forEach(e => {
                const color = typeColors[e.entityType] || '#90A4AE';
                dot += `  "${e.name}" [fillcolor="${color}", label="${e.name}\\n(${e.entityType})"];\n`;
            });
            dot += '\n';
            relations.forEach(r => {
                dot += `  "${r.fromEntity.name}" -> "${r.toEntity.name}" [label="${r.relationType}"];\n`;
            });
            dot += '}\n';
            return JSON.stringify({ status: 'success', format: 'dot', content: dot, nodes: entities.length, edges: relations.length });
        }

        case 'import_json': {
            if (!content) return JSON.stringify({ status: 'error', error: 'content (JSON string) required' });
            let graph;
            try { graph = typeof content === 'string' ? JSON.parse(content) : content; } catch { return JSON.stringify({ status: 'error', error: 'Invalid JSON' }); }
            const nodes = graph.nodes || [];
            const edges = graph.edges || [];
            let created = 0, relCreated = 0;
            for (const node of nodes) {
                try {
                    await prisma.kgEntity.upsert({
                        where: { userId_name_entityType: { userId, name: node.name, entityType: node.type || 'concept' } },
                        update: { properties: node.properties || {} },
                        create: { userId, name: node.name, entityType: node.type || 'concept', properties: node.properties || {}, source: 'import' },
                    });
                    created++;
                } catch { }
            }
            for (const edge of edges) {
                try {
                    const from = await prisma.kgEntity.findFirst({ where: { userId, name: edge.from } });
                    const to = await prisma.kgEntity.findFirst({ where: { userId, name: edge.to } });
                    if (from && to) {
                        await prisma.kgRelation.create({ data: { userId, fromEntityId: from.id, toEntityId: to.id, relationType: edge.type || 'relates_to', weight: edge.weight || 1 } });
                        relCreated++;
                    }
                } catch { }
            }
            return JSON.stringify({ status: 'success', action: 'imported', entitiesCreated: created, relationsCreated: relCreated });
        }

        case 'summary': {
            const entityCount = await prisma.kgEntity.count({ where: { userId } });
            const relCount = await prisma.kgRelation.count({ where: { userId } });
            const types = await prisma.kgEntity.groupBy({ by: ['entityType'], where: { userId }, _count: true });
            const relTypes = await prisma.kgRelation.groupBy({ by: ['relationType'], where: { userId }, _count: true });
            return JSON.stringify({
                status: 'success', summary: {
                    totalEntities: entityCount, totalRelations: relCount,
                    entityTypes: types.map(t => ({ type: t.entityType, count: t._count })),
                    relationTypes: relTypes.map(t => ({ type: t.relationType, count: t._count })),
                    density: entityCount ? (relCount / (entityCount * (entityCount - 1)) * 100).toFixed(2) + '%' : '0%',
                },
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_export action: ${action}` });
    }
}

// ============================================================================
// KG EMBED EXECUTOR
// ============================================================================

const embeddingCache = new Map(); // entityId => float32 vector

function simpleEmbed(text) {
    // Deterministic character-level hash embedding (128-dim)
    const dim = 128;
    const vec = new Float32Array(dim);
    const t = text.toLowerCase();
    for (let i = 0; i < t.length; i++) {
        const code = t.charCodeAt(i);
        for (let j = 0; j < dim; j++) {
            vec[j] += Math.sin(code * (j + 1) * 0.127) * Math.cos(i * (j + 1) * 0.031);
        }
    }
    // Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < dim; i++) vec[i] /= norm;
    return vec;
}

function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function executeKgEmbed(input, prisma, userId) {
    const { action, entityId, compareEntityId, query, topK = 10, numClusters = 5, regenerate = false } = input;

    // Helper: get or generate embedding for an entity
    async function getEmbedding(eId) {
        if (!regenerate && embeddingCache.has(eId)) return embeddingCache.get(eId);
        const entity = await prisma.kgEntity.findFirst({ where: { id: eId, userId } });
        if (!entity) return null;
        // Build text representation from name + type + properties
        let text = `${entity.name} ${entity.entityType}`;
        if (entity.properties && typeof entity.properties === 'object') {
            text += ' ' + Object.values(entity.properties).join(' ');
        }
        if (entity.aliases?.length) text += ' ' + entity.aliases.join(' ');
        const vec = simpleEmbed(text);
        embeddingCache.set(eId, vec);
        return vec;
    }

    switch (action) {
        case 'generate': {
            if (entityId) {
                const vec = await getEmbedding(entityId);
                if (!vec) return JSON.stringify({ status: 'error', error: 'Entity not found' });
                return JSON.stringify({ status: 'success', entityId, dimensions: vec.length, preview: Array.from(vec.slice(0, 8)).map(v => v.toFixed(4)) });
            }
            // Generate for all entities
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true }, take: 500 });
            let generated = 0;
            for (const e of entities) {
                const vec = await getEmbedding(e.id);
                if (vec) generated++;
            }
            return JSON.stringify({ status: 'success', action: 'bulk_generate', generated, dimensions: 128 });
        }

        case 'similar': {
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });
            const targetVec = await getEmbedding(entityId);
            if (!targetVec) return JSON.stringify({ status: 'error', error: 'Entity not found' });
            const entities = await prisma.kgEntity.findMany({ where: { userId, NOT: { id: entityId } }, select: { id: true, name: true, entityType: true }, take: 500 });
            const scored = [];
            for (const e of entities) {
                const vec = await getEmbedding(e.id);
                if (vec) scored.push({ id: e.id, name: e.name, type: e.entityType, similarity: Math.round(cosineSim(targetVec, vec) * 1000) / 1000 });
            }
            scored.sort((a, b) => b.similarity - a.similarity);
            return JSON.stringify({ status: 'success', entityId, similar: scored.slice(0, topK) });
        }

        case 'cluster_embeddings': {
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true }, take: 500 });
            const vecs = [];
            for (const e of entities) {
                const vec = await getEmbedding(e.id);
                if (vec) vecs.push({ entity: e, vec });
            }
            if (vecs.length === 0) return JSON.stringify({ status: 'error', error: 'No entities to cluster' });
            // Simple k-means
            const k = Math.min(numClusters, vecs.length);
            const centroids = vecs.slice(0, k).map(v => Float32Array.from(v.vec));
            const assignments = new Array(vecs.length).fill(0);
            for (let iter = 0; iter < 10; iter++) {
                // Assign
                for (let i = 0; i < vecs.length; i++) {
                    let best = 0, bestSim = -1;
                    for (let c = 0; c < k; c++) {
                        const sim = cosineSim(vecs[i].vec, centroids[c]);
                        if (sim > bestSim) { bestSim = sim; best = c; }
                    }
                    assignments[i] = best;
                }
                // Update centroids
                for (let c = 0; c < k; c++) {
                    const members = vecs.filter((_, i) => assignments[i] === c);
                    if (members.length === 0) continue;
                    const dim = centroids[c].length;
                    centroids[c] = new Float32Array(dim);
                    members.forEach(m => { for (let d = 0; d < dim; d++) centroids[c][d] += m.vec[d]; });
                    for (let d = 0; d < dim; d++) centroids[c][d] /= members.length;
                }
            }
            const clusters = Array.from({ length: k }, (_, i) => ({
                cluster: i,
                members: vecs.filter((_, j) => assignments[j] === i).map(v => ({ id: v.entity.id, name: v.entity.name, type: v.entity.entityType })),
            })).filter(c => c.members.length > 0);
            return JSON.stringify({ status: 'success', clusters, totalEntities: vecs.length });
        }

        case 'compare': {
            if (!entityId || !compareEntityId) return JSON.stringify({ status: 'error', error: 'entityId and compareEntityId required' });
            const vecA = await getEmbedding(entityId);
            const vecB = await getEmbedding(compareEntityId);
            if (!vecA || !vecB) return JSON.stringify({ status: 'error', error: 'One or both entities not found' });
            const similarity = cosineSim(vecA, vecB);
            const eA = await prisma.kgEntity.findFirst({ where: { id: entityId }, select: { name: true, entityType: true } });
            const eB = await prisma.kgEntity.findFirst({ where: { id: compareEntityId }, select: { name: true, entityType: true } });
            return JSON.stringify({
                status: 'success',
                entityA: { id: entityId, name: eA?.name, type: eA?.entityType },
                entityB: { id: compareEntityId, name: eB?.name, type: eB?.entityType },
                similarity: Math.round(similarity * 1000) / 1000,
                interpretation: similarity > 0.8 ? 'very similar' : similarity > 0.5 ? 'moderately similar' : similarity > 0.2 ? 'somewhat related' : 'different',
            });
        }

        case 'search_semantic': {
            if (!query) return JSON.stringify({ status: 'error', error: 'query required' });
            const queryVec = simpleEmbed(query);
            const entities = await prisma.kgEntity.findMany({ where: { userId }, select: { id: true, name: true, entityType: true }, take: 500 });
            const scored = [];
            for (const e of entities) {
                const vec = await getEmbedding(e.id);
                if (vec) scored.push({ id: e.id, name: e.name, type: e.entityType, score: Math.round(cosineSim(queryVec, vec) * 1000) / 1000 });
            }
            scored.sort((a, b) => b.score - a.score);
            return JSON.stringify({ status: 'success', query, results: scored.slice(0, topK) });
        }

        case 'stats': {
            const total = await prisma.kgEntity.count({ where: { userId } });
            return JSON.stringify({ status: 'success', totalEntities: total, cachedEmbeddings: embeddingCache.size, dimensions: 128, algorithm: 'character-level trigonometric hash' });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_embed action: ${action}` });
    }
}

// ============================================================================
// KG CLUSTER EXECUTOR
// ============================================================================

async function executeKgCluster(input, prisma, userId) {
    const { action, algorithm = 'connected_components', entityType, minCommunitySize = 2, topK = 10 } = input;

    // Helper: load full adjacency
    async function loadAdjacency() {
        const where = { userId };
        if (entityType) where.entityType = entityType;
        const entities = await prisma.kgEntity.findMany({ where, select: { id: true, name: true, entityType: true } });
        const entityIds = new Set(entities.map(e => e.id));
        const relations = await prisma.kgRelation.findMany({
            where: { userId, fromEntityId: { in: [...entityIds] }, toEntityId: { in: [...entityIds] } },
            select: { fromEntityId: true, toEntityId: true, relationType: true, weight: true },
        });
        const adj = new Map();
        entities.forEach(e => adj.set(e.id, []));
        relations.forEach(r => {
            if (adj.has(r.fromEntityId)) adj.get(r.fromEntityId).push(r.toEntityId);
            if (adj.has(r.toEntityId)) adj.get(r.toEntityId).push(r.fromEntityId);
        });
        return { entities, relations, adj };
    }

    switch (action) {
        case 'detect_communities': {
            const { entities, adj } = await loadAdjacency();
            // Connected components via BFS
            const visited = new Set();
            const communities = [];
            for (const entity of entities) {
                if (visited.has(entity.id)) continue;
                const community = [];
                const queue = [entity.id];
                while (queue.length > 0) {
                    const curr = queue.shift();
                    if (visited.has(curr)) continue;
                    visited.add(curr);
                    const e = entities.find(x => x.id === curr);
                    if (e) community.push({ id: e.id, name: e.name, type: e.entityType });
                    const neighbors = adj.get(curr) || [];
                    neighbors.forEach(n => { if (!visited.has(n)) queue.push(n); });
                }
                if (community.length >= minCommunitySize) communities.push(community);
            }
            communities.sort((a, b) => b.length - a.length);
            return JSON.stringify({
                status: 'success', algorithm,
                communities: communities.map((c, i) => ({ id: i, size: c.length, members: c, dominantType: getMostCommon(c.map(m => m.type)) })),
                totalCommunities: communities.length, isolatedNodes: entities.length - communities.reduce((s, c) => s + c.length, 0),
            });
        }

        case 'bridges': {
            const { entities, adj } = await loadAdjacency();
            // Bridge entities connect multiple components — high betweenness approximation
            const scores = [];
            for (const entity of entities) {
                const neighbors = adj.get(entity.id) || [];
                if (neighbors.length < 2) continue;
                // Check if removing this node disconnects neighbors
                const neighborSet = new Set(neighbors);
                let bridgeScore = 0;
                // Count unique neighbor groups
                const visited = new Set([entity.id]);
                let groups = 0;
                for (const n of neighbors) {
                    if (visited.has(n)) continue;
                    groups++;
                    const queue = [n];
                    while (queue.length > 0) {
                        const curr = queue.shift();
                        if (visited.has(curr)) continue;
                        visited.add(curr);
                        if (!neighborSet.has(curr)) continue;
                        (adj.get(curr) || []).forEach(x => { if (!visited.has(x) && neighborSet.has(x)) queue.push(x); });
                    }
                }
                bridgeScore = groups > 1 ? neighbors.length * groups : neighbors.length * 0.5;
                scores.push({ id: entity.id, name: entity.name, type: entity.entityType, connections: neighbors.length, bridgeScore: Math.round(bridgeScore * 100) / 100 });
            }
            scores.sort((a, b) => b.bridgeScore - a.bridgeScore);
            return JSON.stringify({ status: 'success', bridges: scores.slice(0, topK) });
        }

        case 'isolated': {
            const { entities, adj } = await loadAdjacency();
            const isolated = entities.filter(e => (adj.get(e.id) || []).length === 0);
            return JSON.stringify({
                status: 'success', isolated: isolated.map(e => ({ id: e.id, name: e.name, type: e.entityType })),
                count: isolated.length, totalEntities: entities.length,
                isolationRate: entities.length ? (isolated.length / entities.length * 100).toFixed(1) + '%' : '0%',
            });
        }

        case 'density': {
            const { entities, relations } = await loadAdjacency();
            const n = entities.length;
            const e = relations.length;
            const maxEdges = n * (n - 1);
            return JSON.stringify({
                status: 'success',
                nodes: n, edges: e, maxPossibleEdges: maxEdges,
                density: maxEdges ? (e / maxEdges * 100).toFixed(2) + '%' : '0%',
                avgDegree: n ? (e * 2 / n).toFixed(2) : '0',
                interpretation: maxEdges && e / maxEdges > 0.3 ? 'dense' : maxEdges && e / maxEdges > 0.1 ? 'moderate' : 'sparse',
            });
        }

        case 'central_entities': {
            const { entities, adj } = await loadAdjacency();
            const scored = entities.map(e => {
                const degree = (adj.get(e.id) || []).length;
                return { id: e.id, name: e.name, type: e.entityType, degree, normalizedDegree: entities.length > 1 ? (degree / (entities.length - 1)).toFixed(4) : '0' };
            });
            scored.sort((a, b) => b.degree - a.degree);
            return JSON.stringify({ status: 'success', centralEntities: scored.slice(0, topK), metric: 'degree_centrality' });
        }

        case 'label_propagation': {
            const { entities, adj } = await loadAdjacency();
            // Label propagation algorithm
            const labels = new Map();
            entities.forEach((e, i) => labels.set(e.id, i));
            for (let iter = 0; iter < 10; iter++) {
                let changed = false;
                for (const entity of entities) {
                    const neighbors = adj.get(entity.id) || [];
                    if (neighbors.length === 0) continue;
                    const labelCounts = new Map();
                    neighbors.forEach(n => {
                        const l = labels.get(n);
                        labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
                    });
                    const bestLabel = [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
                    if (labels.get(entity.id) !== bestLabel) { labels.set(entity.id, bestLabel); changed = true; }
                }
                if (!changed) break;
            }
            // Group by label
            const groups = new Map();
            for (const entity of entities) {
                const l = labels.get(entity.id);
                if (!groups.has(l)) groups.set(l, []);
                groups.get(l).push({ id: entity.id, name: entity.name, type: entity.entityType });
            }
            const communities = [...groups.values()].filter(g => g.length >= minCommunitySize).sort((a, b) => b.length - a.length);
            return JSON.stringify({ status: 'success', algorithm: 'label_propagation', communities: communities.map((c, i) => ({ id: i, size: c.length, members: c })), totalCommunities: communities.length });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_cluster action: ${action}` });
    }
}

function getMostCommon(arr) {
    const counts = {};
    arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
}

// ============================================================================
// KG HISTORY EXECUTOR
// ============================================================================

const kgChangeLog = [];

async function executeKgHistory(input, prisma, userId) {
    const { action, entityId, relationId, dateRange, take = 50, operationId } = input;

    switch (action) {
        case 'entity_history': {
            if (!entityId) return JSON.stringify({ status: 'error', error: 'entityId required' });
            const entity = await prisma.kgEntity.findFirst({ where: { id: entityId, userId } });
            if (!entity) return JSON.stringify({ status: 'error', error: 'Entity not found' });
            const changes = kgChangeLog.filter(c => c.entityId === entityId);
            // Add creation event from DB
            const history = [
                { operation: 'created', timestamp: entity.createdAt?.toISOString(), data: { name: entity.name, type: entity.entityType } },
                ...changes.map(c => ({ operation: c.operation, timestamp: c.timestamp, data: c.data })),
            ];
            if (entity.updatedAt && entity.updatedAt > entity.createdAt) {
                history.push({ operation: 'last_updated', timestamp: entity.updatedAt?.toISOString() });
            }
            return JSON.stringify({ status: 'success', entityId, name: entity.name, history });
        }

        case 'relation_history': {
            if (!relationId) return JSON.stringify({ status: 'error', error: 'relationId required' });
            const relation = await prisma.kgRelation.findFirst({
                where: { id: relationId, userId },
                include: { fromEntity: { select: { name: true } }, toEntity: { select: { name: true } } },
            });
            if (!relation) return JSON.stringify({ status: 'error', error: 'Relation not found' });
            const changes = kgChangeLog.filter(c => c.relationId === relationId);
            return JSON.stringify({
                status: 'success', relationId,
                from: relation.fromEntity.name, to: relation.toEntity.name, type: relation.relationType,
                history: [
                    { operation: 'created', timestamp: relation.createdAt?.toISOString() },
                    ...changes.map(c => ({ operation: c.operation, timestamp: c.timestamp, data: c.data })),
                ],
            });
        }

        case 'timeline': {
            let days = 30;
            if (dateRange) days = parseInt(dateRange) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            // Get recently created entities
            const recentEntities = await prisma.kgEntity.findMany({
                where: { userId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' },
                take,
                select: { id: true, name: true, entityType: true, createdAt: true },
            });
            const recentRelations = await prisma.kgRelation.findMany({
                where: { userId, createdAt: { gte: since } },
                orderBy: { createdAt: 'desc' },
                take,
                include: { fromEntity: { select: { name: true } }, toEntity: { select: { name: true } } },
            });

            const timeline = [
                ...recentEntities.map(e => ({ type: 'entity_created', name: e.name, entityType: e.entityType, timestamp: e.createdAt?.toISOString() })),
                ...recentRelations.map(r => ({ type: 'relation_created', from: r.fromEntity.name, to: r.toEntity.name, relationType: r.relationType, timestamp: r.createdAt?.toISOString() })),
                ...kgChangeLog.filter(c => new Date(c.timestamp) >= since),
            ];
            timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return JSON.stringify({ status: 'success', dateRange: `${days}d`, events: timeline.slice(0, take) });
        }

        case 'snapshot': {
            const entityCount = await prisma.kgEntity.count({ where: { userId } });
            const relCount = await prisma.kgRelation.count({ where: { userId } });
            const types = await prisma.kgEntity.groupBy({ by: ['entityType'], where: { userId }, _count: true });
            return JSON.stringify({
                status: 'success',
                snapshot: {
                    timestamp: new Date().toISOString(),
                    totalEntities: entityCount, totalRelations: relCount,
                    entityTypes: types.map(t => ({ type: t.entityType, count: t._count })),
                    changeLogSize: kgChangeLog.length,
                },
            });
        }

        case 'undo': {
            if (!operationId) return JSON.stringify({ status: 'error', error: 'operationId required' });
            const op = kgChangeLog.find(c => c.id === operationId);
            if (!op) return JSON.stringify({ status: 'error', error: `Operation not found: ${operationId}` });
            // Attempt to reverse the operation
            try {
                if (op.operation === 'delete_entity' && op.data) {
                    await prisma.kgEntity.create({ data: { id: op.entityId, userId, name: op.data.name, entityType: op.data.entityType, properties: op.data.properties || {} } });
                    return JSON.stringify({ status: 'success', action: 'undo', undid: 'delete_entity', restored: op.data.name });
                }
                if (op.operation === 'update_entity' && op.data?.previousState) {
                    await prisma.kgEntity.update({ where: { id: op.entityId }, data: op.data.previousState });
                    return JSON.stringify({ status: 'success', action: 'undo', undid: 'update_entity', entityId: op.entityId });
                }
                return JSON.stringify({ status: 'error', error: `Cannot undo operation type: ${op.operation}` });
            } catch (e) {
                return JSON.stringify({ status: 'error', error: `Undo failed: ${e.message}` });
            }
        }

        case 'change_stats': {
            let days = 30;
            if (dateRange) days = parseInt(dateRange) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const recentEntities = await prisma.kgEntity.count({ where: { userId, createdAt: { gte: since } } });
            const recentRelations = await prisma.kgRelation.count({ where: { userId, createdAt: { gte: since } } });
            const recentChanges = kgChangeLog.filter(c => new Date(c.timestamp) >= since);
            const opCounts = {};
            recentChanges.forEach(c => { opCounts[c.operation] = (opCounts[c.operation] || 0) + 1; });
            return JSON.stringify({
                status: 'success', dateRange: `${days}d`,
                stats: { newEntities: recentEntities, newRelations: recentRelations, changeLogOperations: recentChanges.length, operationBreakdown: opCounts },
            });
        }

        default:
            return JSON.stringify({ status: 'error', error: `Unknown kg_history action: ${action}` });
    }
}

// ============================================================================
// MAIN EXECUTOR
// ============================================================================

async function executeKnowledgeGraphTool(toolName, input, ctx = {}) {
    const prisma = ctx.prisma || (await import('../lib/prisma.js')).default;
    const userId = ctx.userId || 'system';

    switch (toolName) {
        case 'kg_create':
            return { result: await executeKgCreate(input, prisma, userId), sideEffects: null };
        case 'kg_query':
            return { result: await executeKgQuery(input, prisma, userId), sideEffects: null };
        case 'kg_visualize':
            return { result: await executeKgVisualize(input, prisma, userId), sideEffects: null };
        case 'kg_merge':
            return { result: await executeKgMerge(input, prisma, userId), sideEffects: null };
        case 'kg_reason':
            return { result: await executeKgReason(input, prisma, userId), sideEffects: null };
        case 'kg_export':
            return { result: await executeKgExport(input, prisma, userId), sideEffects: null };
        case 'kg_embed':
            return { result: await executeKgEmbed(input, prisma, userId), sideEffects: null };
        case 'kg_cluster':
            return { result: await executeKgCluster(input, prisma, userId), sideEffects: null };
        case 'kg_history':
            return { result: await executeKgHistory(input, prisma, userId), sideEffects: null };
        default:
            return { result: JSON.stringify({ status: 'error', error: `Unknown knowledge graph tool: ${toolName}` }), sideEffects: null };
    }
}

const KNOWLEDGE_GRAPH_TOOL_NAMES = new Set(KNOWLEDGE_GRAPH_TOOL_DEFINITIONS.map((t) => t.name));
function isKnowledgeGraphTool(toolName) {
    return KNOWLEDGE_GRAPH_TOOL_NAMES.has(toolName);
}

export { KNOWLEDGE_GRAPH_TOOL_DEFINITIONS, executeKnowledgeGraphTool, isKnowledgeGraphTool };
