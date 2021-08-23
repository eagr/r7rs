import { isPrimitive, ErrMsg } from './_'

// TODO
function eqp (x:any, y:any) : boolean {
    return false
}

// TODO
function eqvp (x:any, y:any) : boolean {
    return false
}

// TODO
function equalp (x:any, y:any) : boolean {
    return false
}

function numEqual (x:number, y:number) : boolean {
    if (typeof x !== 'number') throw new Error(ErrMsg.contract(`=`, `number?`, x))
    if (typeof y !== 'number') throw new Error(ErrMsg.contract(`=`, `number?`, y))
    return x === y
}

function lt (x:any, y:any) : boolean {
    return x < y
}

function gt (x:any, y:any) : boolean {
    return x > y
}

function and (...args:any[]) : any {
    let rt:any = true
    for (let i = 0; i < args.length; i++) {
        rt = args[i]
        if (rt === false) return rt
    }
    return rt
}

function or (...args:any[]) : any {
    let rt:any = false
    for (let i = 0; i < args.length; i++) {
        rt = args[i]
        if (rt !== false) break
    }
    return rt
}

function not (x:any) : boolean {
    if (arguments.length !== 1) throw new Error(ErrMsg.arity('not', 1, arguments.length))
    return x === false || false
}

export const SchemeBase = {
    'eq?': eqp,
    'eqv?': eqvp,
    'equal?': equalp,
    '=': numEqual,
    '<': lt,
    '>': gt,

    and, or, not,
}
