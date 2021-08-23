import { SchemeList } from './list'

export function toScheme (jv:any) : string {
    let scm = ''
    if (jv instanceof SchemeList.List) {
        const sv:any[] = []
        let node = jv.head
        while (node) {
            sv.push(toScheme(node.data))
            if (node === jv.tail) break
            node = node.next
        }
        scm = '(' + sv.join(' ') + ')'
    } else if (Array.isArray(jv)) {
        const sv = jv.map((x) => toScheme(x))
        scm = '(' + sv.join(' ') + ')'
    } else if (typeof jv === 'string') {
        if (jv.indexOf(`'`) === 0) {
            scm = jv.substring(1)
        } else {
            scm = JSON.stringify(jv)
        }
    } else if (typeof jv === 'boolean') {
        scm = jv ? '#t' : '#f'
    } else if (typeof jv === 'function') {
        scm = `#<procedure:${jv.name}>`
    } else {
        scm = JSON.stringify(jv)
    }
    return scm
}

export const env = {
    toScheme,
}
