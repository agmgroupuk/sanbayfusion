import jwt from 'jsonwebtoken';
import { getPrisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-production';
const SERVICE_KEY = process.env.SERVICE_KEY || JWT_SECRET;

/**
 * Middleware: verify admin JWT token from Authorization header or cookie.
 * Also accepts SERVICE_KEY for internal service-to-service calls (frontend proxy).
 */
export async function requireAdmin(req, res, next) {
    const token =
        req.headers.authorization?.replace('Bearer ', '') ||
        req.cookies?.admin_token;

    if (!token) return res.status(401).json({ error: 'Admin authentication required' });

    // Service-to-service auth: frontend proxy sends the service key directly
    if (token === SERVICE_KEY) {
        req.admin = { id: 'service', email: 'frontend-proxy', name: 'Frontend Proxy', role: 'superadmin' };
        return next();
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const prisma = getPrisma();
        const admin = await prisma.adminUser.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, name: true, role: true },
        });
        if (!admin) return res.status(401).json({ error: 'Admin not found' });
        req.admin = admin;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired admin token' });
    }
}

/**
 * Middleware: require superadmin role.
 */
export function requireSuperAdmin(req, res, next) {
    if (req.admin?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
}

export function signAdminToken(adminId) {
    return jwt.sign({ sub: adminId }, JWT_SECRET, { expiresIn: '12h' });
}
