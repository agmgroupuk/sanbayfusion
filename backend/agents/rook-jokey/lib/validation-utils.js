/**
 * Validation Utilities
 * String ID validation utilities for PostgreSQL/Prisma (cuid, uuid, etc.)
 */

/**
 * Validate if a string is a valid UUID v4
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate if a string is a valid ID (UUID, CUID, or simple string ID)
 * Prisma typically uses cuid() or uuid() for IDs
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
export function isValidId(id) {
  if (!id) return false;
  if (typeof id !== 'string') {
    // Handle numbers - convert to string
    if (typeof id === 'number') return true;
    return false;
  }
  
  // Accept UUIDs
  if (isValidUUID(id)) return true;
  
  // Accept CUIDs (start with 'c' and are 25 chars) - Prisma default
  if (/^c[a-z0-9]{24}$/i.test(id)) return true;
  
  // Accept other reasonable string IDs (alphanumeric, dashes, underscores, 1-64 chars)
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return true;
  
  return false;
}

/**
 * Sanitize and validate request params
 * @param {object} params - Request params object
 * @param {string[]} requiredIds - Array of param names that should be valid IDs
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateIdParams(params, requiredIds = []) {
  const errors = [];
  
  for (const idName of requiredIds) {
    const id = params[idName];
    if (!id) {
      errors.push(`${idName} is required`);
    } else if (!isValidId(id)) {
      errors.push(`Invalid ${idName} format`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Default export for backwards compatibility
export default {
  isValidUUID,
  isValidId,
  validateIdParams,
};
