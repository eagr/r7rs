import { ErrMsg } from './_'

function add (...args:any[]) : number {
    let res = 0
    for (let i = 0; i < args.length; ++i) {
        res += args[i]
    }
    return res
}

function subtract (...args:any[]) : number {
    if (args.length === 0) throw new Error(ErrMsg.arity(`-`, `>=1`, 0))
    if (args.length === 1) return -args[0]
    let res = args[0]
    for (let i = 1; i < args.length; ++i) {
        res -= args[i]
    }
    return res
}

function multiply (...args:any[]) : number {
    let res = 1
    for (let i = 0; i < args.length; ++i) {
        res *= args[i]
    }
    return res
}

function divide (...args:any[]) : number {
    if (args.length === 0) throw new Error(ErrMsg.arity(`/`, `>=1`, 0))
    if (args.length === 1) return 1 / args[0]
    let res = args[0]
    for (let i = 1; i < args.length; ++i) {
        res /= args[i]
    }
    return res
}

function abs (x:number) {
    if (arguments.length !== 1) throw new Error(
        ErrMsg.arity(`abs`, 1, arguments.length),
    )
    if (typeof x !== 'number') throw new Error(
        ErrMsg.contract(`abs`, `real?`, x)
    )
    return Math.abs(x)
}

export const SchemeNumeric = {
    '+': add,
    '-': subtract,
    '*': multiply,
    '/': divide,

    add, subtract, multiply, divide,
    abs,
}
