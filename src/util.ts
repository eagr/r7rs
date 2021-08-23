type Line = { start:number, text:string }

function toLines (input:string) : Line[] {
    let rem = input
    let head = 0
    const lines:Line[] = []
    while (rem) {
        let nextEol:number
        const nextRn = rem.indexOf(`\r\n`)
        const nextNl = rem.indexOf(`\n`)
        if (nextRn < 0) {
            nextEol = nextNl
        } else if (nextNl < 0) {
            nextEol = nextRn
        } else {
            nextEol = Math.min(nextRn, nextNl)
        }
        const rn = nextRn >= 0 && nextRn < nextNl

        const end = nextEol < 0
            ? rem.length
            : nextEol + (rn ? 2 : 1)
        const line = rem.substring(0, end)
        lines.push({
            start: head,
            text: line,
        })

        head += end
        rem = rem.substring(end)
    }
    return lines
}

function getLineNum (lines:Line[], idx:number) : number {
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]
        if (idx >= line.start) {
            return i
        }
    }
}

const uid = (function () {
    function toBase58 (id:number) : string {
        const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
        const BASE = ALPHABET.length
        if (id < BASE) return ALPHABET[id]

        let dig = ''
        while (id >= BASE) {
            dig = ALPHABET[id % BASE] + dig
            id = (id / BASE) | 0
        }
        dig = ALPHABET[(id - 1) % BASE] + dig
        return dig
    }

    return function (id:number) : string {
        const hash = '$' + toBase58(id)
        return hash
    }
})()

export {
    Line,
    toLines,
    getLineNum,
    uid,
}
