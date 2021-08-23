import { STD_PROC, ENV } from './const'
import { stdproc, env } from './scheme'

type EvalResult = { res:any[], err:string }

function evaluate (js:string) : EvalResult {
    const params = [STD_PROC, ENV]
    const args = [stdproc, env]
    params.push(js)
    const fn = Function.apply(null, params)
    return fn.apply(null, args)
}

export {
    evaluate,
}
