import { exec } from "child_process";

// Seeded issue 5: Command injection vulnerability
export function runSystemCommand(branchName, callback) {
  exec("git checkout " + branchName, (err, stdout) => {
    if (err) return callback(err);
    callback(null, stdout);
  });
}

// Seeded issue 6: eval() usage and debugger statement
export function evaluateCode(code) {
  debugger;
  return eval(code);
}
