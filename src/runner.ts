import { ExprNode, ProgramNode, StmtNode } from "./ast";

type Value = any;

class ReturnException {
    value: any; constructor(value: any) { this.value = value; }
}

export class Environment {
    parent?: Environment; values: Map<string, Value> = new Map();
    constructor(parent?: Environment) { this.parent = parent; }
    get(name: string): Value {
        if (this.values.has(name)) return this.values.get(name);
        if (this.parent) return this.parent.get(name);

        if( name.includes(".") ) {
            const parts = name.split(".");
            const [ parent, ...rest ] = parts;
            if( !this.values.has(parent) ) throw new Error('Undefined namespace or variable ' + name);
            let obj: any = this.get(parts[0]);
            for( let i = 1; i < parts.length; i++ ) {
                if( obj === undefined || obj === null ) {
                    throw new Error('Undefined variable ' + name);
                }
                obj = obj[parts[i]];
            }
            return obj;
        }
        throw new Error('Undefined variable ' + name);
    }
    set(name: string, value: Value) {
        if (this.values.has(name)) { this.values.set(name, value); return; }
        if (this.parent && this.parent.has(name)) { this.parent.set(name, value); return; }
        this.values.set(name, value);
    }
    define(name: string, value: Value) { this.values.set(name, value); }
    has(name: string): boolean { return this.values.has(name) || (!!this.parent && this.parent.has(name)); }
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
        case 'LetStmt': {
            const v = node.init ? evalExpr(node.init, env) : undefined;
            env.define(node.id, v);
            return v;
        }
        case 'ExprStmt': return evalExpr(node.expr, env);
        case 'BlockStmt': {
            const sub = new Environment(env);
            let last: any;
            for (const s of node.body) { last = evalStmt(s, sub); }
            return last;
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
                // allow break/return via exceptions (not implemented break here)
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
            console.log('[evalStmt] Constructing class:', node.name, classConstructor );
            if (typeof classConstructor !== 'function') {
                throw new Error('Undefined class or not a constructor: ' + node.name);
            }

            const args = node.args.map(arg => evalExpr(arg, env));
            if (node.name && !node.isConstructed) env.define(node.name, new classConstructor(...args));
            node.isConstructed = true;
            return new classConstructor(...args);
        }
    }
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

function evalExpr(node: ExprNode, env: Environment): any {
    switch (node.type) {
        case 'NumberLiteral': return node.value;
        case 'StringLiteral': return node.value;
        case 'BoolLiteral': return node.value;
        case 'Identifier': return env.get(node.name);
        case 'Unary': {
            const v = evalExpr(node.arg, env);
            if (node.op === '-') return -v;
            if (node.op === '!') return !v;
            throw new Error('Unknown unary op ' + node.op);
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
            }
            throw new Error('Unknown binary op ' + node.op);
        }
        case 'Assign': {
            if (node.left.type !== 'Identifier') throw new Error('Left-hand side of assignment must be identifier');
            const val = evalExpr(node.right, env);
            let cur: Environment | undefined = env;
            while (cur) {
                if (cur.values.has(node.left.name)) { cur.values.set(node.left.name, val); return val; }
                cur = cur.parent;
            }
            console.log( val )
            env.define(node.left.name, val);
            return val;
        }
        case 'Call': {
            console.log( env.values )
            const callee = evalExpr(node.callee, env);
            const args = node.args.map(a => evalExpr(a, env));
            console.log(node);
            if (typeof callee !== 'function') throw new Error('Call of non-function');
            return callee(...args);
        }
        case 'FunctionExpr': {
            const fn = makeFunction(null, node.params, node.body, env);
            return fn;
        }
        case 'ClassCall': {
            const classConstructor = env.get(node.name);
            console.log('[evalStmt] Constructing class:', node.name, classConstructor);
            if (typeof classConstructor !== 'function') {
                throw new Error('Undefined class or not a constructor: ' + node.name);
            }
            const args = node.params.map(arg => evalExpr(arg, env));
            return new classConstructor(...args);
        }
    }
}