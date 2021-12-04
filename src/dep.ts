import { stdproc, env } from './scheme'

const depIds = new WeakMap()
depIds.set(stdproc, '_sp')
depIds.set(env, '_e')

function inject (js:string) : () => { res:any[], err:string } {
    const deps = [stdproc, env]
    const params = deps.map((dep) => depIds.get(dep))
    params.push(js)
    const proc = Function.apply(null, params)
    return () => proc.apply(null, deps)
}

export {
    stdproc,
    env,

    depIds,
    inject,
}
