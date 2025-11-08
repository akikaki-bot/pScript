export enum TokenType {
    Number = "Number",
    String = "String",
    Identifier = "Identifier",
    Keyword = "Keyword",
    Punct = "Punct",
    Op = "Op",
    EOF = "EOF",
}

/**
 * A token produced by the lexer
 */
export interface Token {
    /**
     * The type of the token
     */
    type: TokenType
    /**
     * The value of the token
     */
    value: string
    /**
     * The position of the token in the input string
     */
    pos: number
};