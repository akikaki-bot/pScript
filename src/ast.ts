import { ParseError, TypeError } from "./errors";
import { Token, TokenType } from "./types";
import { ExprNode, ProgramNode, StmtNode } from "./types/nodes";

/**
 * Parser class to convert tokens into an AST
 * @param tokens {Token[]}
 * @returns {Parser}
 */
export class Parser {
    public tokens: Token[]; 
    public pos : number = 0;

    constructor(tokens: Token[]) { 
        this.tokens = tokens; 
    }
    peek(n = 0) { 
        return this.tokens[this.pos + n] || this.tokens[this.tokens.length - 1]; 
    }
    next() { 
        return this.tokens[this.pos++] || this.tokens[this.tokens.length - 1];
    }
    eatOp(v?: string) { 
        const t = this.peek(); 
        if (t.type === TokenType.Op && (!v || t.value === v)) { 
            this.pos++; 
            return t; 
        } 
        return null; 
    }
    eatKeyword(v?: string) { 
        const t = this.peek(); 
        if (t.type === TokenType.Keyword && (!v || t.value === v)) { 
            this.pos++; 
            return t; 
        } 
        return null; 
    }
    eatId() { 
        const t = this.peek(); 
        if (t.type === TokenType.Identifier) { 
            this.pos++; 
            return t.value; 
        } 
        return null; 
    }
    expectOp(v: string) { 
        const t = this.next(); 
        if (t.type !== TokenType.Op || t.value !== v) throw new ParseError('Expected op ' + v + ' got ' + JSON.stringify(t)); 
    }

    parseProgram(): ProgramNode {
        const body: StmtNode[] = [];
        while (this.peek().type !== TokenType.EOF) {
            body.push(this.parseStatement());
        }
        return { type: 'Program', body };
    }

    parseStatement(): StmtNode {
        const pk = this.peek();
        if (pk.type === TokenType.Keyword && pk.value === 'let') return this.parseLet_fixed();
        if (pk.type === TokenType.Keyword && pk.value === 'if') return this.parseIf();
        if (pk.type === TokenType.Keyword && pk.value === 'while') return this.parseWhile();
        if (pk.type === TokenType.Keyword && pk.value === 'fn') return this.parseFunctionDecl();
        if (pk.type === TokenType.Op && pk.value === '{') return this.parseBlock();
        if (pk.type === TokenType.Keyword && pk.value === 'return') return this.parseReturn();
        if (pk.type === TokenType.Array && pk.value === '[') return this.parseArray();
        if (pk.type === TokenType.Keyword && pk.value === 'new') return this.parseClassCreate();
        if (pk.type === TokenType.Keyword && pk.value === 'require') return this.parseRequire();
        const expr = this.parseExpression();
        if (this.peek().type === TokenType.Op && this.peek().value === ';') this.pos++;
        return { type: 'ExprStmt', expr };
    }

    parseRequire(): StmtNode {
        this.expectKeyword('require');
        this.expectOp('(');
        const moduleNameExpr = this.parseExpression();
        this.expectOp(')');
        if (this.peek().type === TokenType.Op && this.peek().value === ';') this.pos++;
        return {
            type: "RequireStmt",
            requirePath: moduleNameExpr
        }
    }

    parseClassCreate(): StmtNode {
        this.expectKeyword('new');
        const className = this.eatId();
        if (!className) throw new ParseError('Expected class name after new');
        this.expectOp('(');
        const args: ExprNode[] = [];
        while (this.peek().type !== TokenType.Op || this.peek().value !== ')') {
            const arg = this.parseExpression();
            args.push(arg);
            if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++;
            else break;
        }
        this.expectOp(')');
        return {
            type: "ClassStmt",
            name: className,
            args: args,
            isConstructed: false
        }
    }

    parseArray(): StmtNode {
        this.expectOp('[');
        const elements: ExprNode[] = [];
        while (this.peek().type !== TokenType.Op || this.peek().value !== ']') {
            const element = this.parseExpression();
            elements.push(element);
            if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++;
            else break;
        }
        this.expectOp(']');
        return {
            type: "ArrayStmt",
            elements: elements
        };
    }

    // Adjust expect for keywords
    expectKeyword(v: string) { 
        const t = this.next(); 
        if (t.type !== TokenType.Keyword || t.value !== v) throw new Error('Expected keyword ' + v + ' got ' + JSON.stringify(t)); 
    }

    parseLet_fixed(): StmtNode {
        this.expectKeyword('let');
        const id = this.eatId(); 
        if (!id) throw new ParseError('Expected identifier after let');
        let init: ExprNode | undefined = undefined;
        if (this.peek().type === TokenType.Op && this.peek().value === '=') { 
            this.pos++; 
            init = this.parseExpression();
        }
        if (this.peek().type === TokenType.Op && this.peek().value === ';') this.pos++;
        return { type: 'LetStmt', id, init };
    }

    parseIf(): StmtNode {
        this.expectKeyword('if');
        this.expectOp('(');
        const test = this.parseExpression();
        this.expectOp(')');
        const cons = this.parseStatement();
        let alt: StmtNode | undefined;
        if (
            this.peek().type === TokenType.Keyword && 
            this.peek().value === 'else'
        ) { 
            this.pos++; 
            alt = this.parseStatement(); 
        }
        return { type: 'IfStmt', test, cons, alt };
    }

    parseWhile(): StmtNode {
        this.expectKeyword('while');
        this.expectOp('(');
        const test = this.parseExpression();
        this.expectOp(')');
        const body = this.parseStatement();
        return { type: 'WhileStmt', test, body };
    }

    parseFunctionDecl(): StmtNode {
        this.expectKeyword('fn');
        let name: string | null = null;
        const id = this.eatId();
        if (id) name = id;
        this.expectOp('(');
        const params: string[] = [];
        while (this.peek().type !== TokenType.Op || this.peek().value !== ')') {
            const p = this.eatId(); if (!p) throw new ParseError('Expected param name'); params.push(p);
            if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++;
            else break;
        }
        this.expectOp(')');
        const body = (this.parseBlock() as any).body;
        return { type: 'FunctionDecl', name, params, body };
    }

    parseBlock(): StmtNode {
        this.expectOp('{');
        const body: StmtNode[] = [];
        while (!(this.peek().type === TokenType.Op && this.peek().value === '}')) {
            if (this.peek().type === TokenType.EOF) throw new ParseError('Unterminated block');
            body.push(this.parseStatement());
        }
        this.expectOp('}');
        return { type: 'BlockStmt', body };
    }

    parseReturn(): StmtNode {
        this.expectKeyword('return');
        if (this.peek().type === TokenType.Op && this.peek().value === ';') { this.pos++; return { type: 'ReturnStmt' }; }
        const arg = this.parseExpression();
        if (this.peek().type === TokenType.Op && this.peek().value === ';') this.pos++;
        return { type: 'ReturnStmt', arg };
    }

    // Expression parsing using precedence climbing
    parseExpression(): ExprNode {
        return this.parseAssign();
    }

    parseAssign(): ExprNode {
        const left = this.parseLogicOr();
        if (this.peek().type === TokenType.Op && this.peek().value === '=') {
            this.pos++;
            const right = this.parseAssign();
            return { type: 'Assign', left, right } as ExprNode;
        }
        return left;
    }

    parseLogicOr(): ExprNode {
        let node = this.parseLogicAnd();
        while (this.peek().type === TokenType.Op && (this.peek().value === '||' || this.peek().value === 'or')) {
            const op = this.next().value; 
            const right = this.parseLogicAnd(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseLogicAnd(): ExprNode {
        let node = this.parseEquality();
        while (this.peek().type === TokenType.Op && ( this.peek().value === '&&' || this.peek().value === 'and' )) {
            const op = this.next().value; 
            const right = this.parseEquality(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseEquality(): ExprNode {
        let node = this.parseComparison();
        while (
            this.peek().type === TokenType.Op && 
            (
                this.peek().value === '==' || 
                ( 
                    this.peek().value === '!=' || 
                    this.peek().value === 'isnt'
                ) 
            )
        ) {
            const op = this.next().value; 
            const right = this.parseComparison(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseComparison(): ExprNode {
        let node = this.parseTerm();
        while (this.peek().type === TokenType.Op && ['<', '>', '<=', '>='].includes(this.peek().value)) {
            const op = this.next().value; 
            const right = this.parseTerm(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseTerm(): ExprNode {
        let node = this.parseFactor();
        while (this.peek().type === TokenType.Op && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.next().value; 
            const right = this.parseFactor(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseFactor(): ExprNode {
        let node = this.parseUnary();
        while (this.peek().type === TokenType.Op && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
            const op = this.next().value; 
            const right = this.parseUnary(); 
            node = { 
                type: 'Binary', 
                op, 
                left: node, 
                right 
            };
        }
        return node;
    }
    parseUnary(): ExprNode {
        if (this.peek().type === TokenType.Op && (this.peek().value === '-' || this.peek().value === '!')) {
            const op = this.next().value; 
            const arg = this.parseUnary();
            return {
                type: 'Unary', op, arg
            };
        }
        return this.parseCall();
    }
    parseCall(): ExprNode {
        let node = this.parsePrimary();
        console.log('Call parsing, current node:', node);
        while (true) {
            if (this.peek().type === TokenType.Op && this.peek().value === '(') {
                this.pos++; const args: ExprNode[] = [];
                while (!(this.peek().type === TokenType.Op && this.peek().value === ')')) {
                    args.push(this.parseExpression());
                    if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++; else break;
                }
                this.expectOp(')');
                node = { type: 'Call', callee: node, args };
                continue;
            }
            break;
        }
        return node;
    }
    parsePrimary(): ExprNode {
        const t = this.peek();
        console.log('Primary token:', t);
        if (t.type === TokenType.Number) { this.pos++; return { type: 'NumberLiteral', value: Number(t.value) }; }
        if (t.type === TokenType.String) { this.pos++; return { type: 'StringLiteral', value: t.value }; }
        if (t.type === TokenType.Keyword && (t.value === 'true' || t.value === 'false')) { this.pos++; return { type: 'BoolLiteral', value: t.value === 'true' }; }
        if (t.type === TokenType.Op && t.value === '(') { 
            this.pos++; 
            const expr = this.parseExpression(); 
            this.expectOp(')'); 
            return expr; 
        }
        if (t.type === TokenType.Array) {
            this.pos++;
            const elements: ExprNode[] = [];
            while( this.peek(this.pos).type === TokenType.Array && this.peek(this.pos).value !== ']' ) {
                const element = this.parseExpression();
                elements.push(element);
                if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++;
                else break;
            }
            //this.expectOp(']');
            return {
                type: "ArrayExpr",
                elements: elements
            };
        }
        if (t.type === TokenType.Op && t.value === 'function') {
            // function expression: function (a,b) { ... }
        }
        if (t.type === TokenType.Keyword && t.value === 'require') {
            this.pos++;
            this.expectOp('(');
            const moduleNameExpr = this.parseExpression();
            this.expectOp(')');
            return {
                type: "RequireExpr",
                requirePath: moduleNameExpr
            };
        }
        if (t.type === TokenType.Keyword && t.value === 'fn') {
            this.pos++; this.expectOp('(');
            const params: string[] = [];
            while (!(this.peek().type === TokenType.Op && this.peek().value === ')')) {
                const p = this.eatId(); 
                if (!p) throw new ParseError('Expected param'); 
                params.push(p);
                if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++; else break;
            }
            this.expectOp(')');
            const body = (this.parseBlock() as any).body;
            return { type: 'FunctionExpr', params, body };
        }
        if (t.type === TokenType.Identifier) { 
            this.pos++; 
            return { type: 'Identifier', name: t.value }; 
        }
        if( t.type === TokenType.Keyword && t.value === 'new') {
            this.pos++;
            const className = this.eatId();
            if (!className) throw new ParseError('Expected class name after new');
            this.expectOp('(');
            const args: ExprNode[] = [];
            while (this.peek().type !== TokenType.Op || this.peek().value !== ')') {
                const arg = this.parseExpression();
                args.push(arg);
                if (this.peek().type === TokenType.Op && this.peek().value === ',') this.pos++;
                else break;
            }
            this.expectOp(')');
            return { type: 'ClassCall', name: className, params: args, isConstructed: true };
        }
        throw new TypeError('Unexpected token in primary: ', JSON.stringify(t));
    }
}

// ----------------------------- Runtime / Interpreter -----------------------------
