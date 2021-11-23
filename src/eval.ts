import { depIds, stdproc, env } from './dep'

type EvalResult = { res:any[], err:string }

function evaluate (js:string) : EvalResult {
    const args = [stdproc, env]
    const params = args.map((arg) => depIds.get(arg))
    params.push(js)
    const fn = Function.apply(null, params)
    return fn.apply(null, args)
}

export {
    evaluate,
}
