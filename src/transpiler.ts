import { SchemeToken, SchemeTransResult, SchemeTranspiler } from './interface'
import { T_BOOL, T_CHAR, T_NUM, T_STR, T_IDENT, T_QUOTE } from './const'
import { depIds, stdproc, env } from './dep'

let context = null

const JS_CALL_PRE = `(function(){`
const JS_CALL_SUF = `})()`
const ERR_UNBALANCED_PAREN = `Expected a \\\`)\\\` to close \\\`(\\\``

const STD_PROC = depIds.get(stdproc)
const ENV = depIds.get(env)

function transBool (token:SchemeToken, idx:number) : SchemeTransResult {
    const ll = token.lex.toLowerCase()
    if (ll === '#t' || ll === '#true') {
        return [{ js: 'true', next: idx + 1 }, null]
    }
    if (ll === '#f' || ll === '#false') {
        return [{ js: 'false', next: idx + 1 }, null]
    }
    return [null, {
        idx: token.idx,
        desc: `Expected a bool, but get \`${token.lex}\``,
    }]
}

function transChar (token:SchemeToken, idx:number) : SchemeTransResult {
    const lex = token.lex
    if (!(/^#\\/.test(lex))) {
        return [null, {
            idx: token.idx,
            desc: `Expected a char, but get \`${lex}\``,
        }]
    }

    const toHex = function (name:string) {
        const namedChars = {
            nul:        '\\x00',
            null:       '\\x00',
            alarm:      '\\x07',
            bell:       '\\x07',
            backspace:  '\\x08',
            delete:     '\\x08',
            tab:        '\\x09',
            linefeed:   '\\x0A',
            newline:    '\\x0A',
            vtab:       '\\x0B',
            return:     '\\x0D',
            esc:        '\\x1B',
            escape:     '\\x1B',
            space:      '\\x20',
        }
        return namedChars[name]
    }

    const flesh = lex.substring(2)
    const isHexChar = /^x[0-9A-Fa-f]{2,}$/.test(flesh)
    if (isHexChar) {
        return [{ js: `'${lex.substring(1)}'`, next: idx + 1 }, null]
    }
    const namedChar = toHex(flesh)
    if (namedChar) {
        return [{ js: `'${namedChar}'`, next: idx + 1 }, null]
    }
    return [{ js: `'${flesh}'`, next: idx + 1 }, null]
}

function transStr (token:SchemeToken, idx:number) : SchemeTransResult {
    const lex = token.lex
    if (!(/^".*"$/ms.test(lex))) {
        return [null, {
            idx: token.idx,
            desc: `Expected a string, but get \`${lex}\``,
        }]
    }

    let out = ''
    let head = 0
    let expectEsc = false
    let expectHex = false
    let maybeHex = false
    let hexBuf = ''

    while (head < lex.length) {
        const ch = lex[head]
        if (maybeHex) {
            maybeHex = false
            if ((/^[A-Fa-f0-9]+$/.test(ch))) {
                hexBuf += ch
            } else {
                hexBuf = '0' + hexBuf
            }
            out += hexBuf
            hexBuf = ''
        } else if (expectHex) {
            expectHex = false
            if ((/^[A-Fa-f0-9]$/.test(ch))) {
                hexBuf += ch
                maybeHex = true
            } else {
                return [null, {
                    idx: token.idx + head,
                    desc: `Expected a hex digit after \`\\x\``,
                }]
            }
        } else if (expectEsc) {
            expectEsc = false
            if (ch === 'x') {
                expectHex = true
                out += '\\x'
            } else if ('abefnrtv"\\'.indexOf(ch) >= 0) {
                if (ch === 'a') {
                    out += '\\x07'
                } else if (ch === 'e') {
                    out += '\\x1B'
                } else {
                    out += '\\' + ch
                }
            } else if (ch === '\n') {
                // ignore line break when escaped
            } else {
                return [null, {
                    idx: token.idx + head,
                    desc: `Unknown escape sequence`,
                }]
            }
        } else {
            if (ch === '"') {
                if (head > 0 && head < lex.length - 1) {
                    return [null, {
                        idx: token.idx + head,
                        desc: `Unescaped \`"\` in string`,
                    }]
                }
            }

            if (ch === '\\') {
                expectEsc = true
            } else if (ch === '\n') {
                out += '\\n'
            } else {
                out += ch
            }
        }
        ++head
    }
    return [{ js: out, next: idx + 1 }, null]
}

function transNum (token:SchemeToken, idx:number) : SchemeTransResult {
    const { lex } = token
    // TODO cover all numbers
    if (/^(?:\d+\.\d+|\d+\.|\.\d+|\d+)$/) {
        return [{ js: lex, next: idx + 1 }, null]
    }
}

function transIdent (token:SchemeToken, idx:number) : SchemeTransResult {
    const { type, lex } = token
    if (type !== T_IDENT) {
        return [null, {
            idx: token.idx,
            desc: `Expected an identifier, but got \\\`${lex}\\\``,
        }]
    }
    if (context.findName(context.jsId(lex))) {
        return [{ js: context.jsId(lex), next: idx + 1}, null]
    } else if (lex in stdproc) {
        return [{ js: `${STD_PROC}['${lex}']`, next: idx + 1}, null]
    }
    return [{ js: context.jsId(lex), next: idx + 1}, null]
}

const transNewIdent = (token:SchemeToken, idx:number) : SchemeTransResult => {
    const { type, lex } = token
    if (type !== T_IDENT) {
        return [null, {
            idx: token.idx,
            desc: `Expected an identifier, but got \\\`${lex}\\\``,
        }]
    }
    return [{ js: context.jsId(lex), next: idx + 1}, null]
}

const transPrimitive:SchemeTranspiler = function (tokens, idx) {
    const token = tokens[idx]
    switch (token.type) {
        case T_BOOL: return transBool(token, idx)
        case T_CHAR: return transChar(token, idx)
        case T_STR: return transStr(token, idx)
        case T_NUM: return transNum(token, idx)
        case T_IDENT: return transIdent(token, idx)
    }
}

// ------ begin standard forms ------

const transDefine:SchemeTranspiler = function (tokens, idx) {
    const pref = tokens[idx].lex + tokens[idx + 1].lex
    if (pref !== `(define`) {
        return [null, {
            idx: tokens[idx].idx,
            desc: `Expected \\\`(define\\\`, but got \\\`${pref}\\\``,
        }]
    }

    enum DefineState {
        INIT = 0,
        EXP_PROC_NAME = 1,
        EXP_PROC_FORMALs = 2,
        EXP_EXPR = 3,
        MAY_FIN = 4,
    }

    enum ParamState {
        NORMAL = 0,
        EXP_REST_PARAM = 1,
        HAS_REST_PARAM = 2,
    }

    let state = DefineState.INIT
    let paramState = ParamState.NORMAL
    let shorthand = false

    let out = ''
    const formals = []
    const statements = []

    let head = idx + 2
    while (head < tokens.length) {
        const token = tokens[head]
        const { lex, idx } = token

        if (state === DefineState.INIT) {
            if (lex === ')') {
                return [null, {
                    idx: idx,
                    desc: `Bad syntax in \\\`define\\\``,
                }]
            }
            if (lex === '(') {
                state += 1
                shorthand = true
                ++head
            } else {
                const [{ js }, err] = transNewIdent(token, head)
                if (err) return [null, err]
                const id = js
                out += id + '='
                if (context.putName(id)) {
                    out = 'let ' + out
                }
                state = DefineState.EXP_EXPR
                ++head
            }
        } else if (state === DefineState.EXP_PROC_NAME) {
            const [{ js }, err] = transNewIdent(token, head)
            if (err) return [null, err]
            const id = js
            context.putName(id)
            out += 'let ' + id + '='
            state += 1
            ++head
        } else if (state === DefineState.EXP_PROC_FORMALs) {
            if (lex === ')') {
                if (paramState === ParamState.EXP_REST_PARAM) {
                    return [null, {
                        idx: idx,
                        desc: `Unexpected \\\`)\\\``,
                    }]
                }
                state += 1
            } else if (lex === '.') {
                if (paramState === ParamState.NORMAL) {
                    paramState += 1
                } else {
                    return [null, {
                        idx: idx,
                        desc: `Illegal use of \\\`.\\\``,
                    }]
                }
            } else {
                if (paramState === ParamState.EXP_REST_PARAM) {
                    const [{ js }, err] = transNewIdent(token, head)
                    if (err) return [null, err]
                    const id = js
                    formals.push('...' + id)
                    paramState += 1
                } else if (paramState === ParamState.HAS_REST_PARAM) {
                    return [null, {
                        idx: idx,
                        desc: `Illegal use of \\\`.\\\``,
                    }]
                } else {
                    const [{ js }, err] = transNewIdent(token, head)
                    if (err) return [null, err]
                    const id = js
                    formals.push(id)
                }
            }
            ++head
        } else {
            if (state === DefineState.EXP_EXPR && lex === `)`) {
                const desc = shorthand
                    ? `No expression in body`
                    : `Missing expression after identifier`
                return [null, { idx, desc }]
            }

            if (lex === ')') {
                if (shorthand) {
                    const params = formals.join(',')
                    let pref = `function(${params}){`
                    if (paramState === ParamState.NORMAL) {
                        pref += `if(arguments.length!==${formals.length}){`
                        pref += `throw new Error("Arity mismatch: expected ${formals.length}, given " + arguments.length)}`
                    }

                    let body = ''
                    for (let i = 0; i < statements.length - 1; ++i) {
                        body += statements[i]
                    }
                    const last = statements[statements.length - 1]
                    out += pref + body + `return ${last};};`
                }
                return [{ js: out, next: head + 1 }, null]
            }

            if (state === DefineState.MAY_FIN && !shorthand) {
                const desc = `Multiple expressions after identifier`
                return [null, { idx, desc }]
            }

            const [{ js, next }, err] = trans(tokens, head)
            if (err) return [null, err]
            if (shorthand) {
                statements.push(js)
            } else {
                out += js + `;`
            }
            state = DefineState.MAY_FIN
            head = next
        }
    }
}

const transLet:SchemeTranspiler = function (tokens, idx) {
    let out = '(function(){'
    let names:string[] = []
    let values:any[] = []

    let expectSpecs = true
    let inSpecs = false
    let inSpec = false

    const EXP_ID = 0
    const EXP_VAL = 1
    let specState = EXP_ID

    let head = idx + 2
    while (head < tokens.length) {
        const token = tokens[head]
        const { lex } = token
        if (expectSpecs) {
            if (lex === '(') {
                if (inSpec) {
                    const [{ js, next }, err] = trans(tokens, head)
                    if (err) return [null, err]
                    head = next
                    values.push(js)
                } else if (inSpecs) {
                    inSpec = true
                    ++head
                } else {
                    inSpecs = true
                    ++head
                }
            } else if (lex === ')') {
                if (inSpec) {
                    inSpec = false
                    ++head
                } else if (inSpecs) {
                    inSpecs = false
                    expectSpecs = false
                    ++head
                }
            } else {
                const [{ js, next }, err] = trans(tokens, head)
                if (err) return [null, err]
                if (specState === EXP_ID) {
                    names.push(js)
                } else if (specState === EXP_VAL) {
                    values.push(js)
                }
                head = next
                specState = 1 - specState
            }
        } else {
            if (names.length !== values.length) {
                // TODO error
            }
            for (let i = 0; i < names.length; ++i) {
                const name = names[i]
                const val = values[i]
                out += `let ${name}=${val};`
            }
            const [{ js, next }, err] = trans(tokens, head)
            if (err) return [null, err]
            out += `return ${js}})()`
            return [{ js: out, next: next + 1 }, null]
        }
    }
}

const transLambda:SchemeTranspiler = function (tokens, idx) {
    const params = []
    let pref = ''
    let body = ''

    let expectSpecs = true
    let inSpec = false
    let head = idx + 2
    while (head < tokens.length) {
        const token = tokens[head]
        const { lex } = token
        if (expectSpecs) {
            if (inSpec) {
                if (lex === ')') {
                    inSpec = false
                    expectSpecs = false
                    pref += `function(` + params.join(',') + `){`
                    pref += `if(arguments.length!==` + params.length + `){`
                    pref += `throw new Error("Arity mismatch: expected ${params.length}, given " + arguments.length)}`
                } else {
                    const [{ js }, err] = transIdent(token, head)
                    if (err) return [null, err]
                    params.push(js)
                }
                ++head
            } else {
                if (lex === '(') {
                    inSpec = true
                } else {
                    expectSpecs = false
                    const [{ js }, err] = transIdent(token, head)
                    if (err) return [null, err]
                    params.push('...' + js)
                    pref += `function(` + params.join(',') + `){`
                }
                ++head
            }
        } else {
            if (lex === ')') {
                return [{
                    js: pref + `return ` + body + `}`,
                    next: head + 1,
                }, null]
            } else {
                const [{ js, next }, err] = trans(tokens, head)
                if (err) return [null, err]
                body += js
                head = next
            }
        }
    }
}

const transIf:SchemeTranspiler = function (tokens, idx) {
    const pref = tokens[idx].lex + tokens[idx + 1].lex
    if (pref !== `(if`) {
        return [null, {
            idx: tokens[idx].idx,
            desc: `Expected \\\`(if\\\`, but got \\\`${pref}\\\``,
        }]
    }

    enum IfState {
        EXP_TEST = 0,
        EXP_CONS = 1,
        EXP_ALT = 2,
        EXP_FIN = 3,
    }

    let state = IfState.EXP_TEST
    let out = JS_CALL_PRE + `let rt;`
    let head = idx + 2

    while (head < tokens.length) {
        const token = tokens[head]
        if (token.lex === ')') {
            if (state <= IfState.EXP_CONS) {
                return [null, {
                    idx: tokens[idx].idx,
                    desc: `Bad syntax in \\\`if\\\``,
                }]
            }
            return [{
                js: out + `return rt;` + JS_CALL_SUF,
                next: head + 1,
            }, null]
        }

        if (state === IfState.EXP_TEST) {
            const [{ js, next }, err] = trans(tokens, head)
            if (err) return [null, err]
            out += `if(${js})`
            state += 1
            head = next
        } else if (state === IfState.EXP_CONS || state === IfState.EXP_ALT) {
            const [{ js, next }, err] = trans(tokens, head)
            if (err) return [null, err]
            out += state === IfState.EXP_CONS ? `{rt=${js}}` : `else{rt=${js}}`
            state += 1
            head = next
        } else {
            return [null, {
                idx: tokens[idx].idx,
                desc: ERR_UNBALANCED_PAREN,
            }]
        }
    }
}

const transQuote:SchemeTranspiler = function (tokens, idx) {
    const token = tokens[idx]
    const { type, lex } = token
    if (type !== T_QUOTE) {
        return [null, {
            idx: token.idx,
            desc: `Expected a quote, but got \\\`${lex}\\\``,
        }]
    }

    const ws = /\s/
    let out = `'`
    const shorthand = lex[0] === `'`
    let head = shorthand ? 1 : lex.match(/^(\(\s*quote)/)[1].length
    while (head < lex.length) {
        const ch = lex[head]
        const last = out[out.length - 1]
        if (ws.test(ch)) {
            if (last !== '(' && last !== ' ' && last !== `'`) {
                out += ' '
            }
        } else if (ch === '(') {
            out += (last === '(' || last === ' ' || last === `'`)
                ? ch
                : ' ' + ch
        } else if (ch === ')') {
            if (last === ' ') {
                out = out.trim() + ch
            } else {
                out += ch
            }
        } else {
            out += last === ')'
                ? ' ' + ch
                : ch
        }
        ++head
    }
    if (!shorthand) { out = out.substring(0, out.length - 1) }

    return [{ js: '`' + out + '`', next: idx + 1 }, null]
}

const stdform = {
    'define':   transDefine,
    'lambda':   transLambda,
    'let':      transLet,

    'if':       transIf,

    'quote':    transQuote,
}

// ------ end standard forms ------

const transCall = function (tokens:SchemeToken[], idx:number, namespace='') : SchemeTransResult {
    let out = ''
    let head = idx + 2
    if (tokens[idx + 1].type === T_IDENT) {
        const fn = tokens[idx + 1].lex
        out += namespace ? `${namespace}['${fn}'](` : `${context.jsId(fn)}(`
    } else {
        const [{ js, next }, err] = trans(tokens, idx + 1)
        if (err) return [null, err]
        out += js + '('
        head = next
    }

    let args = []
    while (head < tokens.length) {
        const token = tokens[head]
        const { lex } = token
        if (lex === ')') {
            out += args.join(',') + ')'
            return [{ js: out, next: head + 1 }, null]
        } else {
            const [{ js, next }, err] = trans(tokens, head)
            if (err) return [null, err]
            args.push(js)
            head = next
        }
    }
}

const transCombination:SchemeTranspiler = function (tokens, idx) {
    if (idx >= tokens.length - 1) {
        return [null, {
            idx: tokens[idx].idx,
            desc: ERR_UNBALANCED_PAREN,
        }]
    }

    let res = null as SchemeTransResult

    const { type, lex } = tokens[idx + 1]
    if (type === T_IDENT) {
        const inScope = context.findName(context.jsId(lex))
        if (inScope) {
            res = transCall(tokens, idx)
        } else if (lex in stdform) {
            const form = stdform[lex]
            res = form(tokens, idx)
        } else if (lex in stdproc) {
            res = transCall(tokens, idx, STD_PROC)
        } else {
            res = [null, {
                idx: tokens[idx + 1].idx,
                desc: `\\\`${lex}\\\`: undefined`
            }]
        }
    } else {
        res = transCall(tokens, idx)
    }
    return res
}

function trans (tokens:SchemeToken[], idx:number) : SchemeTransResult {
    if (idx >= tokens.length) return [null, null]

    const token = tokens[idx]
    const { type, lex } = token
    if (lex === '(') {
        return transCombination(tokens, idx)
    } else if (lex === ')') {
        return [null, {
            idx: token.idx,
            desc: `Unexpected \\\`)\\\``,
        }]
    } else if (type === T_QUOTE) {
        return transQuote(tokens, idx)
    } else {
        return transPrimitive(tokens, idx)
    }
}

function transpile (tokens:SchemeToken[], ctx:any) : string {
    context = ctx

    let prefix = ''     // var definitions
    let body = ''       // transpiled code
    let suffix = ''     // return

    let id = 0          // incremental id
    let errMsg = ''     // message of the first error
    let rets = []       // values to be logged

    let head = 0
    while (head < tokens.length) {
        let pref = ''
        if (head + 1 < tokens.length) {
            pref = tokens[head].lex + tokens[head + 1].lex
        }
        const printable = !/^\(define/.test(pref) && !/^\(.+\!/.test(pref)

        let ret = ''
        if (printable) {
            ret = '_v' + id++
            rets.push(ret)
        }

        // transpile expression by expression
        const [transpiled, err] = trans(tokens, head)
        if (err) {
            errMsg = '`' + context.syntaxError(err) + '`'
            break
        }
        if (transpiled) {
            const { js, next } = transpiled
            body += ret ? `${ret}=${ENV}.toScheme(${js});` : js
            head = next
        }
    }

    if (rets.length > 0) {
        prefix += `let ${rets.join(',')};`
    }
    suffix += `return {res:[${rets.join(',')}],err:${errMsg || `''`}};`
    return prefix + body + suffix
}

export {
    transpile,
}
