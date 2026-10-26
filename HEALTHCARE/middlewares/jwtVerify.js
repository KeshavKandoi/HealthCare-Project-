import jwt from 'jsonwebtoken';
export const verifyJwt = (token, secret) => jwt.verify(token, secret);
