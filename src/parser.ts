import { 
    Token, 
    TokenType 
} from "./types";
import {
    KEYWORDS
} from "./keys";
import { TypeError } from "./errors";


function isWhitespace(ch: string) {
    return /\s/.test(ch);
}
function isDigit(ch: string) {
    return /[0-9]/.test(ch);
}
function isIdStart(ch: string) {
    return /[a-zA-Z_]/.test(ch) || /([a-zA-Z_]+.)+/.test(ch);
}
function isId(ch: string) {
    return /[a-zA-Z0-9_\.]/.test(ch) || /([a-zA-Z_]+.)+/.test(ch);
}

/**
 * Parse to AST tokens
 * @param input {string}
 * @returns {Token[]}
 */
export function lex(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
        const ch = input[i];
        if (isWhitespace(ch)) { 
            i++; 
            continue; 
        }
        // numbers
        if (isDigit(ch) || (ch === '.' && isDigit(input[i + 1] || ''))) {
            let j = i; 
            let seenDot = false;
            while (
                j < input.length && 
                (isDigit(input[j]) || (!seenDot && input[j] === '.'))
            ) {
                if (input[j] === '.') seenDot = true;
                j++;
            }
            tokens.push({ 
                type: TokenType.Number, 
                value: input.slice(i, j), 
                pos: i 
            });
            i = j; 
            continue;
        }
        // strings
        if (ch === '"' || ch === "'") {
            const quote = ch; 
            let j = i + 1; 
            let str = '';
            while (j < input.length && input[j] !== quote) {
                if (input[j] === '\\') { // escape
                    const nxt = input[j + 1] || '';
                    // handle common escapes
                    if (nxt === 'n') { 
                        str += '\n'; 
                        j += 2; 
                        continue; 
                    }
                    if (nxt === 't') { 
                        str += '\t'; 
                        j += 2; 
                        continue; 
                    }
                    str += nxt; 
                    j += 2; 
                    continue;
                }
                str += input[j++];
            }
            if (input[j] !== quote) throw new TypeError('Unterminated string at ', "", i);
            tokens.push({ 
                type: TokenType.String, 
                value: str, 
                pos: i 
            });
            i = j + 1; 
            continue;
        }
        // comments ( # to end of line )
        if( ch === "#" ){
            let j = i + 1;
            while( j < input.length && input[j] !== "\n" ) {
                j++;
            }
            i = j;
            continue;
        }
        // identifiers / keywords (including dot notation)
        if (
            isIdStart(ch) || 
            (ch === '.' && isIdStart(input[i + 1]))
        ) {
            let j = i; 
            if( ch == "." ) j++;
            let dotEncountered = false;
            while (j < input.length && (isId(input[j]) || (!dotEncountered && input[j] === '.' && isIdStart(input[j + 1])))) {
                if (input[j] === '.' && isIdStart(input[j + 1])) {
                    dotEncountered = true;
                }
                j++;
            }
            const word = input.slice(i, j);
            if (word.includes('.')) {
                tokens.push({ 
                    type: TokenType.Identifier, 
                    value: word, 
                    pos: i 
                });
            } else {
                tokens.push({ 
                    type: KEYWORDS.has(word) ? TokenType.Keyword : TokenType.Identifier, 
                    value: word, 
                    pos: i 
                });
            }
            i = j; continue;
        }
        // two-char operators
        const two = input.slice(i, i + 2);
        const twoOps = new Set(['==', '!=', '<=', '>=', '&&', '||']);
        if (twoOps.has(two)) { 
            tokens.push({ 
                type: TokenType.Op, 
                value: two, 
                pos: i 
            }); 
            i += 2; 
            continue; 
        }
        // single char operators / punctuation
        const singleOps = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '!', '(', ')', '{', '}', ',', ';']);
        if (singleOps.has(ch)) { 
            tokens.push({ 
                type: TokenType.Op, 
                value: ch, 
                pos: i 
            }); 
            i++; 
            continue; 
        }

        throw new Error('Unknown char ' + ch + ' at ' + i);
    }
    tokens.push({ type: TokenType.EOF, value: '<EOF>', pos: input.length });
    return tokens;
}

