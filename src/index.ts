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



/**
 * Creates a global environment with built-in functions and objects.
 * @returns {Environment} The global environment.
 */
export function createGlobalEnv(): Environment {
    const env = new Environment();
    env.define('Math', (function () { return Math; })());
    env.define('fetch', ( function () { return fetch; })() );
    env.define('Date', ( function () { return Date; })() );
    env.define('JSON', ( function () { return JSON; })() );
    env.define('print', (...args: any[]) => { console.log(...args); return void 0; });
    env.define('log', (...a: any[]) => { console.log(...a); });
    return env;
}

/**
 * Compile and run the given source code in the provided environment.
 * @param src {string} The source code to run.
 * @param env {Environment} The environment to run the code in.
 * @returns {any} The result of the program execution.
 */
export function run(src: string, env?: Environment) {
    const tokens = lex(src);
    const p = new Parser(tokens);
    const prog = p.parseProgram();
    return evalProgram(prog, env || createGlobalEnv());
}

