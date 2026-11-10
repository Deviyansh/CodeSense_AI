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
    {
      path: "package-lock.json",
      content: JSON.stringify(
        {
          name: "sample-ecommerce-api",
          version: "1.0.0",
          lockfileVersion: 2,
          requires: true,
          packages: {
            "": {
              name: "sample-ecommerce-api",
              version: "1.0.0",
              dependencies: {
                express: "^4.18.2",
                jsonwebtoken: "8.5.1",
                lodash: "4.17.15",
                axios: "0.20.0",
              },
            },
            "node_modules/lodash": {
              version: "4.17.15",
              resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.15.tgz",
              integrity: "sha512-8xOcRHvCjnocdS5cpwXQXVzcnhFIeTQvmh47XFI6nm8NtGck10dQh3MhU88zAzSPBwOUHSwKA9YptUvuzWtZdQ==",
            },
            "node_modules/jsonwebtoken": {
              version: "8.5.1",
              resolved: "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-8.5.1.tgz",
              integrity: "sha512-xBJLEjun9vVm4wf30vOGHTTgkRfYVC522gmsPP5UvH/V/g+UhLiC4hQLBj11WC+NCYGnHWD24/3PfcE0IQG4kw==",
            },
            "node_modules/axios": {
              version: "0.20.0",
              resolved: "https://registry.npmjs.org/axios/-/axios-0.20.0.tgz",
              integrity: "sha512-ANA4rr2HBcmWA+Pn1LJsW36WKEuY5St2b24cj0088i8wBoy1dtmbK08lQRfYgpb5Zo8bKU75H5atNQrUzPJQ==",
            },
          },
          dependencies: {
            lodash: {
              version: "4.17.15",
              resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.15.tgz",
            },
            jsonwebtoken: {
              version: "8.5.1",
              resolved: "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-8.5.1.tgz",
            },
            axios: {
              version: "0.20.0",
              resolved: "https://registry.npmjs.org/axios/-/axios-0.20.0.tgz",
            },
          },
        },
        null,
        2
      ),
    },
  ];
}
