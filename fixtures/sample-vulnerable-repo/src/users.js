import express from "express";

const router = express.Router();

// Seeded issue 3: SQL Injection via query string interpolation
router.get("/users/search", async (req, res) => {
  const query = `SELECT * FROM users WHERE id = '${req.query.id}'`;
  res.json({ query });
});

// Seeded issue 4: Prototype pollution risk via Object.assign on req.body
router.post("/users/profile", (req, res) => {
  const profile = Object.assign({}, req.body);
  res.json({ profile });
});

export default router;
