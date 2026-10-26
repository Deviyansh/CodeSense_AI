import { registerUser, loginUser, toPublicUser } from "../services/auth/auth.service.js";
import { registerSchema, loginSchema } from "../validators/schemas.js";
import { User } from "../models/user.model.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req, res, next) {
  try {
    const input = registerSchema.parse(req.body);
    const { user, token } = await registerUser(input);

    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      data: { user },
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const input = loginSchema.parse(req.body);
    const { user, token } = await loginUser(input);

    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(200).json({
      success: true,
      data: { user },
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}

export async function logout(req, res) {
  res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  res.status(200).json({
    success: true,
    data: { message: "Logged out successfully" },
    meta: { requestId: req.id },
  });
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
        meta: { requestId: req.id },
      });
    }

    res.status(200).json({
      success: true,
      data: { user: toPublicUser(user) },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}
