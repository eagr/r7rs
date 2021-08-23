import { SchemeError } from './interface'
import { toLines, getLineNum, uid } from './util'

export function createContext (src:string) {
    let lines = toLines(src)
    const syntaxError = (error:SchemeError, lineNo?:number) : string => {
        const { idx, desc } = error

        const ln = lineNo == null ? getLineNum(lines, idx) : lineNo
        const line = lines[ln]
        const col = idx - line.start
        const msg = [
            `Line ${ln + 1}:`,                  // 1-based line number
            line.text.replace(/[\s]+$/, ''),    // remove excessive line breaks
            new Array(col + 1).join(' ') + '^', // caret pointer
            `SchemeSyntaxError: ` + desc,       // error description
        ].join('\n')
        return msg
    }

    let nextId = 0
    let j2s:Record<string, string> = {}
    let s2j:Record<string, string> = {}
    const jsId = (sid:string) : string => {
        if (s2j[sid]) return s2j[sid]
        const jid = uid(nextId++)
        s2j[sid] = jid
        j2s[jid] = sid
        return jid
    }
    const scmId = (jid:string) : string => {
        return j2s[jid]
    }

    let namesInScope:string[] = []
    const putName = (name:string) : boolean => {
        const notInScope = namesInScope.indexOf(name) < 0
        if (notInScope) namesInScope.push(name)
        return notInScope
    }
    const findName = (name:string) : boolean => {
        return namesInScope.indexOf(name) >= 0
    }

    const destroy = () => {
        lines.length = 0
        lines = null
        j2s = null
        s2j = null
        namesInScope.length = 0
        namesInScope = null
    }

    return {
        syntaxError,
        jsId,
        scmId,
        putName,
        findName,
        destroy,
    }
}
