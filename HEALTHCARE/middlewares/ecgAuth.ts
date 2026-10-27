import { accountFromToken } from '../lib/supabaseAuth.js';

type HeaderRequest = { headers: { authorization?: string }; patientId?: string };
type Response = { status(code: number): Response; json(body: { success: false; message: string }): unknown };
type Next = (error?: Error) => void;
type Socket = { handshake: { auth?: { token?: string } }; data: { patientId?: string } };

export async function patientAuth(req: HeaderRequest, res: Response, next: Next): Promise<unknown> {
  try {
    const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
    const account = await accountFromToken(token);
    req.patientId = account._id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
}

export async function authenticateSocket(socket: Socket, next: Next): Promise<void> {
  try {
    const account = await accountFromToken(socket.handshake.auth?.token);
    socket.data.patientId = account._id;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
}
