import { verifyJwt } from './jwtVerify.js';

type HeaderRequest = { headers: { authorization?: string }; patientId?: string };
type Response = { status(code: number): Response; json(body: { success: false; message: string }): unknown };
type Next = (error?: Error) => void;
type Socket = { handshake: { auth?: { token?: string } }; data: { patientId?: string } };

type PatientClaims = { id?: unknown };
const verifyToken = (token: string | undefined): PatientClaims => {
  if (!token || !process.env.JWT_SECRET) throw new Error('Authentication required');
  return verifyJwt(token, process.env.JWT_SECRET) as PatientClaims;
};

export function patientAuth(req: HeaderRequest, res: Response, next: Next): unknown {
  try {
    const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
    const claims = verifyToken(token);
    if (typeof claims.id !== 'string' || !claims.id) throw new Error('Missing identity');
    req.patientId = claims.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
}

export function authenticateSocket(socket: Socket, next: Next): void {
  try {
    const claims = verifyToken(socket.handshake.auth?.token);
    if (typeof claims.id !== 'string' || !claims.id) throw new Error('Missing identity');
    socket.data.patientId = claims.id;
    next();
  } catch {
    next(new Error('Authentication required'));
  }
}
