export function isPrimitive (x:any) : boolean {
    if (x == null) return true
    return typeof x !== 'object' && typeof x !== 'function'
}

export const ErrMsg = {
    arity: function (fn:string, exp:number|string, giv:number) {
        return `\`${fn}\` arity mismatch: expected ${exp}, given ${giv}`
    },
    contract: function (fn:string, exp:any, giv:any) {
        return `\`${fn}\` contract violation: expected ${exp}, given ${giv}`
    },
}
