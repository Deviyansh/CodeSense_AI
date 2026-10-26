import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";
import { User } from "../../models/user.model.js";

const SALT_ROUNDS = 10;

export async function registerUser({ name, email, password }) {
  const emailNormalized = email.trim().toLowerCase();

  // Check if existing user
  const existing = await User.findOne({ emailNormalized });
  if (existing) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    error.code = "EMAIL_ALREADY_EXISTS";
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name: name.trim(),
    emailNormalized,
    passwordHash,
  });

  const token = generateToken(user);
  return {
    user: toPublicUser(user),
    token,
  };
}

export async function loginUser({ email, password }) {
  const emailNormalized = email.trim().toLowerCase();
  const user = await User.findOne({ emailNormalized });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const token = generateToken(user);
  return {
    user: toPublicUser(user),
    token,
  };
}

export function generateToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.emailNormalized,
      name: user.name,
    },
    config.sessionSecret,
    {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      expiresIn: "7d",
    }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.sessionSecret, {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  } catch (err) {
    const error = new Error("Invalid or expired session token");
    error.statusCode = 401;
    error.code = "AUTH_REQUIRED";
    throw error;
  }
}

export function toPublicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.emailNormalized,
    createdAt: user.createdAt,
  };
}
