export class TypeError extends Error {
    constructor(
        message: string,
        invalidValue?: any,
        pos?: number,
    ) {
        super(`${message}` + (pos !== undefined ? ` at position ${pos}` : '') + (invalidValue !== undefined ? ` (invalid value: ${invalidValue})` : ''));
    }
}