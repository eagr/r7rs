import { SchemeBase } from './base'
import { SchemeList } from './list'
import { SchemeNumeric } from './numeric'
import { env } from './env'

const stdproc = Object.assign(
    {},
    SchemeBase,
    SchemeList,
    SchemeNumeric,
)

export {
    stdproc,
    env,
}
