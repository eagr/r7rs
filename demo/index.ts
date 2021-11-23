import * as Compiler from '../src/index'
const beautify = (window as any).js_beautify

function escape (msg:string) : string {
    let escaped = msg.replace(/</g, '&lt;')
    return escaped
}

const prefix = `?src=`
let initCode = ''
if (window.location.search) {
    initCode = decodeURIComponent(window.location.search.substring(prefix.length))
}

window.onload = function () {
    const editor:any = document.getElementById('editor')
    const output:any = document.getElementById('output')
    const result:any = document.getElementById('result')

    if (editor) {
        editor.value = initCode
        editor.addEventListener('keydown', (ev) => {
            if (ev.ctrlKey && ev.key === 'r') {
                const src = editor.value
                const encoded = encodeURIComponent(src)
                const search = prefix + encoded
                window.history.pushState({}, 'Demo', search)

                const context = Compiler.createContext(src)
                try {

                    // lex
                    const tokens = Compiler.scan(src, context)

                    // transpile
                    const js = Compiler.transpile(tokens, context)
                    if (output) {
                        const display = `(function(){` + js + `})();`
                        output.innerHTML = beautify(display, {
                            indent_size: 2,
                            space_after_anon_function: true,
                            space_after_named_function: true,
                        })
                    }

                    // link & evaluate
                    const exe = Compiler.link(js)
                    const { res, err } = exe()
                    const display:any[] = res
                        .filter((r) => r !== undefined)
                        .map((r) => escape(r))
                    display.push(escape(err))
                    if (result) {
                        result.innerHTML = display.join('\n')
                    }

                } catch (err) {

                    // runtime errors
                    if (err instanceof ReferenceError) {
                        const matches = err.message.match(/^([^\s]+) is not defined/)
                        if (matches) {
                            const jid = matches[1]
                            err.message = err.message.replace(jid, '`' + context.scmId(jid) + '`')
                        }
                    }

                    result.innerHTML = escape(err.message)

                }
                context.destroy()
            }
        })
    }
}
