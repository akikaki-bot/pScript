import { BaseException } from "./BaseException";



export class BreakException implements BaseException {
    value: any;
    constructor() {
        this.value = undefined;
    }
}