import { Parser } from "./ast";
import { Environment, evalProgram } from "./runner";
import { lex } from "./parser";
import { Thread } from "./internals";

/**
 * Creates a global environment with built-in functions and objects.
 * @returns {Environment} The global environment.
 */
export function createGlobalEnv(): Environment {
	const env = new Environment();
	env.define('Math', (
		function () {
			return Math;
		}
	)());
	env.define('Thread', (() => {
		return Thread;
	})())	
	env.define('fetch', (
		function () { 
			return fetch; 
		}
	)());
	env.define('Date', (
		function () { 
			return Date; 
		}
	)());
	env.define('JSON', (
		function () { 
			return JSON; 
		}
	)());
	env.define('print', 
		(...args: any[]) => { 
			console.log(...args); 
			return void 0; 
		}
	);
	env.define('log', 
		(...a: any[]) => { 
			console.log(...a); 
		}
	);
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
	console.log('Tokens:', tokens);
	const p = new Parser(tokens);
	const prog = p.parseProgram();
	return evalProgram(prog, env || createGlobalEnv());
}

export {
	Environment
} from "./runner";
export {
	Parser
} from "./ast";
export {
	lex
} from "./parser";