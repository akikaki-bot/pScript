
export class ImportError extends Error {
    constructor(moduleName: string) {
        super(`Failed to import module "${moduleName}".`);
    }
}