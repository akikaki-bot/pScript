import { BaseException } from "./BaseException";

export class ContinueException implements BaseException {
    value: any;
    constructor() {
        this.value = undefined;
    }
}