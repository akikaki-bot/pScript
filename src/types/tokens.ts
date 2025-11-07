export enum TokenType {
    Number = "Number",
    String = "String",
    Identifier = "Identifier",
    Keyword = "Keyword",
    Punct = "Punct",
    Op = "Op",
    EOF = "EOF",
    Array = "Array",
}

export type Token = {
    type: TokenType;
    value: string;
    pos: number;
};