import { BaseException } from "./BaseException";

export class ReturnException implements BaseException {
    value: any;
    constructor(value: any) {
        this.value = value;
    }
}