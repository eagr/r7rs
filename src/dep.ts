import { stdproc, env } from './scheme'

const depIds = new WeakMap()
depIds.set(stdproc, '_s')
depIds.set(env, '_e')

export {
    depIds,
    stdproc,
    env,
}
