export function getSampleFixtureFiles() {
  return [
    {
      path: "src/auth/jwt.js",
      content: `import jwt from 'jsonwebtoken';

// Authenticate user and issue token
export function createSessionToken(user) {
  // Vulnerability: Hardcoded JWT Secret Key
  const secretKey = "super-secret-production-key-12345";
  return jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '2h' });
}

export function checkAdminAccess(token) {
  // Vulnerability: loose equality
  var decoded = jwt.decode(token);
  if (decoded.role == 'admin') {
    return true;
  }
  return false;
}
`,
    },
    {
      path: "src/api/users.js",
      content: `import express from 'express';
import db from '../database.js';

const router = express.Router();

router.get('/profile', async (req, res) => {
  const userId = req.query.id;
  
  // Vulnerability: SQL Injection via string interpolation
  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
  const result = await db.query(query);
  
  res.json({ user: result });
});

router.post('/settings', (req, res) => {
  // Vulnerability: Potential Prototype Pollution via Object.assign on req.body
  const updatedConfig = Object.assign({}, req.body);
  res.json({ success: true, config: updatedConfig });
});

export default router;
`,
    },
    {
      path: "src/utils/system.js",
      content: `import { exec } from 'child_process';

export function runGitCommand(branchName, callback) {
  // Vulnerability: Command Injection via shell concatenation
  exec("git checkout " + branchName, (err, stdout) => {
    if (err) return callback(err);
    callback(null, stdout);
  });
}

export function computeCalculation(expression) {
  // Vulnerability: eval() execution
  debugger;
  return eval(expression);
}
`,
    },
    {
      path: "src/config/aws.js",
      content: `// AWS configuration credentials
export const awsConfig = {
  region: 'us-east-1',
  // Vulnerability: Hardcoded AWS Access Key ID
  accessKeyId: 'AKIAEXAMPLE0000000000',
  // Hardcoded Secret URI
  backupDbUrl: 'mongodb://USER_PLACEHOLDER:PASSWORD_PLACEHOLDER@invalid.example/production',
};
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "sample-ecommerce-api",
          version: "1.0.0",
          private: true,
          dependencies: {
            express: "^4.18.2",
            jsonwebtoken: "8.5.1",
            lodash: "4.17.15",
            axios: "0.20.0",
          },
        },
        null,
        2
      ),
    },
  ];
}
