import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hashes a plain text password using bcrypt and
// returns the hashed string that can be safely stored
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Compares a plain text password with a hashed password from the dab
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generates a JWT token containing the provided payload
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};