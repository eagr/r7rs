import { SchemeToken, SchemeScanner } from './interface'
import { T_DELIMIT, T_BOOL, T_CHAR, T_NUM, T_STR, T_IDENT, T_QUOTE, T_SPECIAL } from './const'

// pattern
const P_DIGIT_BIN = `0|1`
const P_DIGIT_OCT = `0-7`
const P_DIGIT_DEC = `0-9`
const P_DIGIT_HEX = `0-9A-Fa-f`
const P_DIGIT = P_DIGIT_DEC
const P_EXP = `DdEeFfLlSs`
const P_LETTER = `A-Za-z`
const rBound = `(?=$|\\s|\\))`

function skipWhiteSpace (src:string, idx:number) : [number, number] {
    const rem = src.substring(idx)
    const matches = rem.match(/^\s+/)
    if (matches == null) return [0, 0]

    const whitespace = matches[0]
    let nl = 0
    for (let i = 0; i < whitespace.length; i++) {
        const w = whitespace[i]
        if (w === '\n') nl++
    }
    return [whitespace.length, nl]
}

// ( #( #u8( )
const scanDelimiter:SchemeScanner = function (src, idx) {
    const bytevec = '#u8('
    if (src.substring(idx, idx + 4) === bytevec) {
        return [{ type: T_DELIMIT, lex: bytevec, idx: idx }, null]
    }
    const vec = '#('
    if (src.substring(idx, idx + 2) === vec) {
        return [{ type: T_DELIMIT, lex: vec, idx: idx }, null]
    }
    const del = src[idx]
    if (del === '(' || del === ')') {
        return [{ type: T_DELIMIT, lex: del, idx: idx }, null]
    }
}

const scanStr:SchemeScanner = function (src, idx) {
    const rem = src.substring(idx)
    const maybeStr = /^"/.test(rem)
    if (maybeStr) {

        const hexEscape = `\\\\x[${P_DIGIT_HEX}]{1,4}`
        const mnemonicEscape = `\\\\[abefnrtv]`
        const metaEscape = `\\\\["\\|\\\\]`
        const lineBreak = `\\\\[ \\t]*\\n[ \\t]*`
        const strEle = `${hexEscape}|${mnemonicEscape}|${metaEscape}|${lineBreak}|[^"\\|\\\\]`
        const str = `^"(${strEle})*?"`
        const matches = rem.match(new RegExp(str))
        if (matches) return [{ type: T_STR, lex: matches[0], idx: idx }, null]

        // TODO examine string to give detailed feedback
        const desc = `Expected a closing \`"\``
        const err = { idx, desc }
        return [null, err]

    }
}

const scanBool:SchemeScanner = function (src, idx) {
    const rem = src.substring(idx)
    const maybeBool = rem.match(/^#[ft][^\s]*/i)
    if (maybeBool) {

        const bool = `^#(?:false|true|F|T|f|t)${rBound}`
        const matches = rem.match(new RegExp(bool))
        if (matches) return [{ type: T_BOOL, lex: matches[0], idx: idx }, null]

        const desc = `Invalid syntax \`${maybeBool[0]}\``
        const err = { idx, desc }
        return [null, err]

    }
}

const scanChar:SchemeScanner = function (src, idx) {
    const rem = src.substring(idx)
    const maybeChar = rem.match(/^#\\[^\s]*/)
    if (maybeChar) {

        const charName = `nul|null|alarm|bell|backspace|delete|tab|linefeed|newline|vtab|return|esc|escape|space`
        const charHex = `x[${P_DIGIT_HEX}]{2,}`
        const char = `^#\\\\((${charName})|(${charHex})|(.))${rBound}`
        const matches = rem.match(new RegExp(char))
        if (matches) return [{ type: T_CHAR, lex: matches[0], idx: idx }, null]

        let desc:string
        if (maybeChar[0] === `#\\`) {
            desc = `Expected a character after \`#\\\``
        } else {
            desc = `Invalid char \`${maybeChar[0]}\``
        }
        const err = { idx, desc }
        return [null, err]

    }
}

const scanNum:SchemeScanner = function (src, idx) {
    const rem = src.substring(idx)

    const exactness = `#[EeIi]`
    const radices = `#[BbDdOoXx]`
    const sign = `[+-]`
    const infnan = `${sign}(?:inf|nan)\\.0`

    function getRadixPattern (rad:string) : string {
        rad = rad.toLowerCase()
        if (rad === '#x') return 'Xx'
        if (rad === '#b') return 'Bb'
        if (rad === '#o') return 'Oo'
        if (rad === '#d') return 'Dd'
    }

    function getDigitPattern (rad:string) : string {
        rad = rad.toLowerCase()
        if (rad === '#x') return P_DIGIT_HEX
        if (rad === '#b') return P_DIGIT_BIN
        if (rad === '#o') return P_DIGIT_OCT
        if (rad === '#d') return P_DIGIT_DEC
    }

    function getExpPattern (rad:string) : string {
        rad = rad.toLowerCase()
        if (rad === '#x') return 'LSls'
        return P_EXP
    }

    // determine digit & exp patterns before generating regexp
    let radix = radices
    let digit = P_DIGIT
    let exp = P_EXP
    const radixExact = `^(?:(?:(${radices})(?:${exactness})?)|(?:(?:${exactness})(${radices})))`
    const prefMatch = rem.match(new RegExp(radixExact))
    if (prefMatch) {
        // radix is captured in either group if present
        const rad = prefMatch[1] || prefMatch[2]
        if (rad) {
            const radixPattern = getRadixPattern(rad)
            if (radixPattern) {
                radix = radixPattern
            }
            const digitPattern = getDigitPattern(rad)
            if (digitPattern) {
                digit = digitPattern
            }
            exp = getExpPattern(rad)
        }
    }
    radix = `#[${radix}]`
    digit = `[${digit}]`
    exp = `[${exp}]`

    const uint = `${digit}+`
    const rational = `${uint}\\/${uint}`
    const suffix = `(?:${exp}${sign}?${digit}+)`
    const decimal = `(?:(?:${digit}+\\.${digit}*|\\.${digit}+|${digit}+)${suffix}?)`
    const ureal = `(?:${rational}|${decimal}|${uint})`
    const real = `(?:${infnan}|${sign}?${ureal})`
    const complex = `(?:${real}?${infnan}i|${real}${sign}${ureal}?i|${sign}${ureal}i|${real}@${real}|${real}|\\+i|-i)`
    const pref = `(?:${exactness}${radix}|${radix}${exactness}|${exactness}|${radix})`
    const num = `^${pref}?${complex}${rBound}`

    const matches = rem.match(new RegExp(num))
    if (matches) return [{ type: T_NUM, lex: matches[0], idx: idx }, null]
}

const scanId:SchemeScanner = function (src, idx) {
    const rem = src.substring(idx)

    const specialInit = `!$%&*/:<=>?^_~`
    const init = P_LETTER + specialInit

    const specialSub = `.@+-`
    const sub = init + P_DIGIT + specialSub

    const peculiarInit = `*/+-`
    const identifier = `^(?:[${init}][${sub}]*|[${peculiarInit}][${sub}]*)${rBound}`

    const matches = rem.match(new RegExp(identifier))
    if (matches) return [{ type: T_IDENT, lex: matches[0], idx: idx }, null]
}

const scanSpecial:SchemeScanner = function (src, idx) {
    const sp = src[idx]
    if (sp === `'` || sp === '`' || sp === '.') {
        return [{ type: T_SPECIAL, lex: sp, idx: idx }, null]
    }
}

// order matters
const scanners:SchemeScanner[] = [
    scanDelimiter,
    scanStr,
    scanBool,
    scanChar,
    scanNum,
    scanId,
    scanSpecial,
]

const doScan:SchemeScanner = function (src, idx) {
    if (idx >= src.length) return [null, null]

    for (let i = 0; i < scanners.length; i++) {
        const tok = scanners[i]
        const res = tok(src, idx)
        if (res) return res
    }

    const desc = `Unexpected token`
    const err = { idx, desc }
    return [null, err]
}

function scan (src:string, context:any) : SchemeToken[] {
    let head = 0
    let ln = 0

    const tokens:SchemeToken[] = []
    while (head < src.length) {
        const [ff, nl] = skipWhiteSpace(src, head)
        head += ff
        ln += nl

        const [tok, err] = doScan(src, head)
        if (err) {
            const msg = context.syntaxError(err, ln)
            throw new SyntaxError(msg)
        }
        if (tok) {
            tokens.push(tok)
            const lexeme = tok.lex
            head += lexeme.length
        }
    }
    return tokens
}

export {
    scan,
}
