
export class FunctionCantCallError extends Error {
    constructor(functionName: string, pos?: number) {
        super(`Function "${functionName}" cannot be called.` + (pos !== undefined ? ` at position ${pos}` : ''));
    }
}