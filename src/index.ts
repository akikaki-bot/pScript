// mini-lang.ts
// A small AST parser + interpreter (runtime) written in TypeScript for Node.js.
// Features:
// - Numbers, booleans, strings
// - Variables (let), assignment
// - Arithmetic and boolean expressions
// - If, while
// - Function definitions and calls (first-class functions)
// - Return statements
// - Builtins: print, Math.*
//
// To run:
// 1. Save this file as `mini-lang.ts`.
// 2. `npm init -y && npm i -D typescript @types/node ts-node` (or use ts-node directly)
// 3. `npx ts-node mini-lang.ts`  (it will run the example programs at the bottom)

import { Parser } from "./ast";
import { Environment, evalProgram } from "./runner";
import { lex } from "./parser";



// ----------------------------- Runner / Builtins -----------------------------

function createGlobalEnv(): Environment {
    const env = new Environment();
    env.define('Math', (function () { return Math; })());
    env.define('fetch', ( function () { return fetch; })() );
    env.define('Date', ( function () { return Date; })() );
    env.define('JSON', ( function () { return JSON; })() );
    env.define('print', (...args: any[]) => { console.log(...args); return void 0; });
    env.define('log', (...a: any[]) => { console.log(...a); });
    return env;
}

function run(src: string, env?: Environment) {
    const tokens = lex(src);
    const p = new Parser(tokens);
    const prog = p.parseProgram();
    return evalProgram(prog, env || createGlobalEnv());
}

// ----------------------------- Example programs -----------------------------

const example1 = `
let x = 10;
let y = 20;
print("sum:", x + y);
`;

const example2 = `
function fact(n) {
  if (n == 0) { return 1; }
  return n * fact(n - 1);
}
print(fact(6));
`;

const example3 = `
let a = 0;
while (a < 5) {
  print(a);
  a = a + 1;
}
`;

const example4 = `
let add = function(a,b) { return a + b; };
print(add(3,4));
`;

// Run examples when executed directly
if (require.main === module) {
    const env = createGlobalEnv();
    console.log('--- example1 ---'); run(example1, env);
    console.log('--- example2 ---'); run(example2, env);
    console.log('--- example3 ---'); run(example3, env);
    console.log('--- example4 ---'); run(example4, env);
}

// Export for embedding
export { run, createGlobalEnv };
