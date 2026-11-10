import { verifyToken } from "../services/auth/auth.service.js";
import { User } from "../models/user.model.js";

export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Check Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required to access this resource",
        },
        meta: { requestId: req.id },
      });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "User session is no longer valid",
        },
        meta: { requestId: req.id },
      });
    }

    req.user = {
      id: String(user._id),
      email: user.emailNormalized,
      name: user.name,
    };
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      success: false,
      error: {
        code: err.code || "AUTH_REQUIRED",
        message: err.message || "Invalid authentication credentials",
      },
      meta: { requestId: req.id },
    });
  }
}
