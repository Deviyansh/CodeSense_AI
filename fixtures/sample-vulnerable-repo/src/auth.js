import jwt from "jsonwebtoken";

// Seeded issue 1: Hardcoded secret key in JWT
export function generateToken(user) {
  const secretKey = "super-secret-production-key-12345";
  return jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: "2h" });
}

// Seeded issue 2: Loose equality comparison
export function checkAdminAccess(token) {
  var decoded = jwt.decode(token);
  if (decoded.role == "admin") {
    return true;
  }
  return false;
}
