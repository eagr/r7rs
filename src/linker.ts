import { depIds, stdproc, env } from './dep'

export type EvalResult = { res:any[], err:string }

export function link (js:string) : () => EvalResult {
    const deps = [stdproc, env]
    const params = deps.map((dep) => depIds.get(dep))
    params.push(js)
    const exe = Function.apply(null, params)
    return () => exe.apply(null, deps)
}
