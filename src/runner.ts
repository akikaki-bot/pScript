import { readFileSync } from "fs";
import { FunctionCantCallError, ParseError, TypeError } from "./errors";
import { ExprNode, ProgramNode, StmtNode } from "./types/nodes";
import { lex } from "./parser";
import { Parser } from "./ast";
import { ImportError } from "./errors/importError";
import { ReturnException } from "./types/ReturnException";
import { BreakException } from "./types/BreakException";
import { ContinueException } from "./types/ContinueException";

type Value = any;

/**
 * Defines an environment (scope) for variable storage and retrieval.
 * Supports nested environments via parent references.
 * 
 * @example
 * const globalEnv = new Environment();
 * globalEnv.define("x", 10);
 * 
 * const localEnv = new Environment(globalEnv);
 * console.log( localEnv.get("x") ); // 10
 */
export class Environment {

    public parent?: Environment; 
    public values: Map<string, Value> = new Map();

    constructor(parent?: Environment) { 
        this.parent = parent; 
    }

    get(name: string): Value {
        if (this.values.has(name)) return this.values.get(name);
        if (this.parent) return this.parent.get(name);

        if( name.includes(".") ) {
            const parts = name.split(".");
            const [ parent, ...rest ] = parts;
            if( !this.values.has(parent) ) throw new TypeError('Undefined namespace or variable ', name);
            let obj: any = this.get(parts[0]);
            for( let i = 1; i < parts.length; i++ ) {
                if( obj === undefined || obj === null ) {
                    throw new Error('Undefined variable ' + name);
                }
                obj = obj[parts[i]];
            }
            return obj;
        }

        if( name.includes("[") ) {
            const varName = name.substring(0, name.indexOf("["));
            const indexPart = name.substring(name.indexOf("["));
            let arr = this.get(varName);
            const indexMatches = indexPart.match(/\[(.*?)\]/g);
            if( !indexMatches ) throw new Error('Invalid array access syntax in ' + name);
            for( const match of indexMatches ) {
                const indexStr = match.substring(1, match.length - 1).trim();
                const index = Number(indexStr);
                if( arr.length < index + 1 ) throw new Error('Out of index access ' + index + ' in ' + name);
                if( isNaN(index) ) throw new Error('Invalid array index ' + indexStr + ' in ' + name);
                arr = arr[index];
            }
            return arr;
        }
        throw new Error('Undefined variable ' + name);
    }

    set(name: string, value: Value) {
        if (this.values.has(name)) { 
            this.values.set(name, value); 
            return; 
        }
        if (this.parent && this.parent.has(name)) { 
            this.parent.set(name, value); 
            return; 
        }
        this.values.set(name, value);
    }

    define(name: string, value: Value) { 
        this.values.set(name, value); 
    }

    has(name: string): boolean { 
        return this.values.has(name) || 
        (!!this.parent && this.parent.has(name)); 
    }
}

function isTruthy(v: any) { return !!v; }

export function evalProgram(node: ProgramNode, env: Environment) {
    let last: any = undefined;
    for (const s of node.body) {
        last = evalStmt(s, env);
    }
    return last;
}

function evalStmt(node: StmtNode, env: Environment): any {
    switch (node.type) {
        case 'RequireStmt': {
            const requirePath = evalExpr(node.requirePath, env) as ProgramNode;
            const mod = loadModule(requirePath.toString(), env);
            mod.body.forEach(
                stmt => evalStmt( stmt, env )
            );
            return;
        }
        case 'LetStmt': {
            const v = node.init ? evalExpr(node.init, env) : undefined;
            env.define(node.id, v);
            return v;
        }
        case 'ExprStmt': return evalExpr(node.expr, env);
        case 'BlockStmt': {
            const sub = new Environment(env);
            let last: any;
            for (const s of node.body) { 
                last = evalStmt(s, sub); 
            }
            return last;
        }
        case 'ArrayStmt': {
            const elements = node.elements.map( el => evalExpr(el, env) );
            return elements;
        }
        case 'IfStmt': {
            const t = evalExpr(node.test, env);
            if (isTruthy(t)) return evalStmt(node.cons, env);
            if (node.alt) return evalStmt(node.alt, env);
            return undefined;
        }
        case 'WhileStmt': {
            while (isTruthy(evalExpr(node.test, env))) {
                const res = evalStmt(node.body, env);
                if (res instanceof BreakException) break;
                if (res instanceof ContinueException) continue;
            }
            return undefined;
        }
        case 'FunctionDecl': {
            const fn = makeFunction(node.name, node.params, node.body, env);
            if (node.name) env.define(node.name, fn);
            return fn;
        }
        case 'ReturnStmt': {
            const v = node.arg ? evalExpr(node.arg, env) : undefined;
            throw new ReturnException(v);
        }
        case 'ClassStmt': {
            const classConstructor = env.get(node.name);
            if (typeof classConstructor !== 'function') {
                throw new TypeError('Undefined class or not a constructor: ', node.name);
            }

            const args = node.args.map(arg => evalExpr(arg, env));
            if (node.name && !node.isConstructed) env.define(node.name, new classConstructor(...args));
            node.isConstructed = true;
            return new classConstructor(...args);
        }
        case 'BreakStmt': {
            return new BreakException();
        }
        case 'ContinueStmt': {
            return new ContinueException();
        }
    }
}

function isFunction( v: any ): v is Function {
    return typeof v === 'function';
}

function makeFunction(name: string | null, params: string[], body: StmtNode[], env: Environment) {
    return function (...args: any[]) {
        const local = new Environment(env);
        for (let i = 0; i < params.length; i++) local.define(params[i], args[i]);
        try {
            for (const s of body) evalStmt(s, local);
            return undefined;
        } catch (e) {
            if (e instanceof ReturnException) return e.value;
            throw e;
        }
    };
}

function loadModule(path: string, env: Environment): ProgramNode {
    try {
        const file = readFileSync(path, 'utf-8');
        const tokens = lex(file);
        const p = new Parser(tokens);
        const prog = p.parseProgram();
        return prog;
    } catch (e) {
        throw new ImportError('Error loading module at path: ' + path + ' - ' + (e as Error).message);
    }
}

function evalExpr(node: ExprNode, env: Environment): any {
    switch (node.type) {
        case 'RequireExpr': {
            const requirePath = evalExpr(node.requirePath, env);
            const mod = loadModule(requirePath, env);
            //console.log('Loaded module from ', requirePath);
            return mod;
        }
        case 'NumberLiteral': return node.value;
        case 'StringLiteral': return node.value;
        case 'BoolLiteral': return node.value;
        case 'Identifier': return env.get(node.name);
        case 'ArrayExpr': {
            const elements = node.elements.map( el => evalExpr(el, env) );
            return elements;
        }
        case 'Unary': {
            const v = evalExpr(node.arg, env);
            if (node.op === '-') return -v;
            if (node.op === '!') return !v;
            throw new ParseError('Unknown unary op ' + node.op);
        }
        case 'Binary': {
            const L = evalExpr(node.left, env);
            const R = evalExpr(node.right, env);
            switch (node.op) {
                case '+': return L + R;
                case '-': return L - R;
                case '*': return L * R;
                case '/': return L / R;
                case '%': return L % R;
                case '==': return L == R;
                case '!=': return L != R;
                case '<': return L < R;
                case '>': return L > R;
                case '<=': return L <= R;
                case '>=': return L >= R;
                case '&&': return L && R;
                case '||': return L || R;
                case 'and': return L && R;
                case 'or': return L || R;
                case 'isnt': return L != R;
            }
            throw new ParseError('Unknown binary op ' + node.op);
        }
        case 'Assign': {
            if (node.left.type !== 'Identifier') throw new ParseError('Left-hand side of assignment must be identifier');
            const val = evalExpr(node.right, env);
            let cur: Environment | undefined = env;
            while (cur) {
                if (cur.values.has(node.left.name)) { 
                    cur.values.set(node.left.name, val); 
                    return val; 
                }
                cur = cur.parent;
            }
            env.define(node.left.name, val);
            return val;
        }
        case 'Call': {
            const args = node.args.map(a => evalExpr(a, env));

            if (node.callee.type === 'Identifier' && node.callee.name.includes('.')) {
                const parts = node.callee.name.split('.');
                let receiver: any = env.get(parts[0]);
                for (let i = 1; i < parts.length - 1; i++) {
                    if (receiver === undefined || receiver === null) throw new ParseError('Undefined variable ' + parts.slice(0, i + 1).join('.'));
                    receiver = receiver[parts[i]];
                }
                const methodName = parts[parts.length - 1];
                const fn = receiver ? receiver[methodName] : undefined;
                if (!isFunction(fn)) throw new FunctionCantCallError('Call of non-function');
                return (fn as Function).call(receiver, ...args);
            }

            // default: evaluate callee and call with no receiver
            const callee = evalExpr(node.callee, env);
            if (!isFunction(callee)) throw new FunctionCantCallError('Call of non-function');
            return (callee as Function).call(null, ...args);
        }
        case 'FunctionExpr': {
            const fn = makeFunction(null, node.params, node.body, env);
            return fn;
        }
        case 'ClassCall': {
            const classConstructor = env.get(node.name);
            if (typeof classConstructor !== 'function') {
                throw new TypeError('Undefined class or not a constructor: ', node.name);
            }
            const args = node.params.map(arg => evalExpr(arg, env));
            return new classConstructor(...args);
        }
    }
}