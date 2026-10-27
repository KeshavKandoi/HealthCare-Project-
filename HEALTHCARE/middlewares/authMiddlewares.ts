import userModel from '../models/UserModels.js';
import { accountFromToken } from '../lib/supabaseAuth.js';

type UserRequest = { headers: { authorization?: string }; user?: { id: string }; isAdmin?: boolean };
type AuthResponse = { status(code: number): AuthResponse; json(body: { success: false; message: string }): unknown };
type Next = (error?: Error) => void;

export async function userAuth(req: UserRequest, res: AuthResponse, next: Next): Promise<unknown> {
  try {
    const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
    const account = await accountFromToken(token);
    req.user = { id: account._id };
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
