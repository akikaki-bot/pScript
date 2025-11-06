export type ASTNode =
    | ProgramNode
    | StmtNode
    | ExprNode;

export type ProgramNode = { type: 'Program', body: StmtNode[] };

export type StmtNode =
    | { type: 'LetStmt', id: string, init?: ExprNode }
    | { type: 'ExprStmt', expr: ExprNode }
    | { type: 'BlockStmt', body: StmtNode[] }
    | { type: 'IfStmt', test: ExprNode, cons: StmtNode, alt?: StmtNode }
    | { type: 'WhileStmt', test: ExprNode, body: StmtNode }
    | { type: 'FunctionDecl', name: string | null, params: string[], body: StmtNode[] }
    | { type: 'ReturnStmt', arg?: ExprNode }
    | { type: 'ClassStmt', name: string, args: ExprNode[], isConstructed: boolean }
    | { type: 'RequireStmt', requirePath: ExprNode }
    
export type ExprNode =
    | { type: 'NumberLiteral', value: number }
    | { type: 'StringLiteral', value: string }
    | { type: 'BoolLiteral', value: boolean }
    | { type: 'Identifier', name: string }
    | { type: 'Binary', op: string, left: ExprNode, right: ExprNode }
    | { type: 'Unary', op: string, arg: ExprNode }
    | { type: 'Assign', left: ExprNode, right: ExprNode }
    | { type: 'Call', callee: ExprNode, args: ExprNode[] }
    | { type: 'FunctionExpr', params: string[], body: StmtNode[] }
    | { type: 'RequireExpr', requirePath: ExprNode }
    | { type: 'ClassCall', name: string, params: ExprNode[], isConstructed: boolean };
