import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';

const token = (await fs.readFile('./token.txt', 'utf8')).trim();
const publicKey = await fs.readFile('./public.pem', 'utf8');

// Verify JWT ignoring expiration (⚠️ only for testing)
try {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'http://localhost:8080/realms/example',
    audience: 'account',
    ignoreExpiration: true
  });

  console.log('Token is valid (ignoring expiration)');
  console.log('Decoded payload:', decoded);
} catch (err) {
  console.error('Token verification failed:', err.message);
}
