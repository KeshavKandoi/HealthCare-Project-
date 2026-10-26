import userModel from '../models/UserModels.js';
import { verifyJwt } from './jwtVerify.js';

type UserRequest = { headers: { authorization?: string }; user?: { id: string }; isAdmin?: boolean };
type AuthResponse = { status(code: number): AuthResponse; json(body: { success: false; message: string }): unknown };
type Next = (error?: Error) => void;

export function userAuth(req: UserRequest, res: AuthResponse, next: Next): unknown {
  try {
    const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
    if (!token || !process.env.JWT_SECRET) throw new Error('Authentication required');
    const claims: unknown = verifyJwt(token, process.env.JWT_SECRET);
    if (!claims || typeof claims !== 'object' || !('id' in claims) || typeof claims.id !== 'string' || !claims.id) {
      throw new Error('Invalid identity');
    }
    req.user = { id: claims.id };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
}

export async function isAdmin(req: UserRequest, res: AuthResponse, next: Next): Promise<unknown> {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required' });
    const user = await userModel.findById(req.user.id);
    if (!user || user.isAdmin !== true) return res.status(403).json({ success: false, message: 'Administrator access required' });
    req.isAdmin = true;
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error('Authorization failed'));
  }
}
