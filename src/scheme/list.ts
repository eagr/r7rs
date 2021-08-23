import { isPrimitive, ErrMsg } from './_'

interface Data<T extends any> {
    clone:() => T
}

class ListNode implements Data<ListNode> {
    constructor (
        public data:any,
        public next:ListNode|null,
    ) { }

    public clone () {
        //  TODO better fallback
        const data = isPrimitive(this.data)
            ? this.data
            : typeof this.data.clone === 'function'
                ? this.data.clone()
                : this.data
        return new ListNode(data, null)
    }
}

class List implements Data<List> {
    constructor (
        public head:ListNode|null,
        public tail:ListNode|null,
        public length:number,
    ) { }

    public clone () {
        const nodes:any[] = []
        let node = this.head
        while (node) {
            nodes.push(node)
            node = node.next
        }

        let head = null
        let tail = null
        for (let i = nodes.length - 1; i >= 0; --i) {
            const clone = nodes[i].clone()
            clone.next = head
            if (tail === null) tail = clone
            head = clone
        }
        return new List(head, tail, nodes.length)
    }
}

// (list 0 1 2 3)
function list (...xs:any[]) {
    let head = null
    let tail = null
    for (let i = xs.length - 1; i >= 0; --i) {
        const node = new ListNode(xs[i], head)
        if (tail === null) tail = node
        head = node
    }
    return new List(head, tail, xs.length)
}

function car (xs:List) {
    if (!pairp(xs)) {
        const desc = ErrMsg.contract(`car`, `a pair`, xs)
        throw new Error(desc)
    }
    return xs.head.data
}

function cons (x:any, xs:any) : List {
    if (listp(xs)) {
        const node = new ListNode(x, xs.head)
        const tail = xs.tail || node
        return new List(node, tail, xs.length + 1)
    } else { }
}

function cdr (xs:List) : List {
    if (!pairp(xs)) {
        const desc = ErrMsg.contract(`cdr`, `a pair`, xs)
        throw new Error(desc)
    }
    const tail = xs.head === xs.tail ? null : xs.tail
    return new List(xs.head.next, tail, xs.length - 1)
}

function length (xs:any) : number {
    return xs.length
}

// TODO
// #f (pair? '())
// #t (pair? '(1))
// #t (pair? '(1 2))
// #t (pair? '(1 . 2))
// #t (pair? '(0 1 . 2))
function pairp (x:any) : boolean {
    return x instanceof List && x.head != null
}

// TODO
// #t (list? '())
// #t (list? '(1))
// #t (list? '(1 2))
// #f (list? '(1 . 2))
// #f (list? '(0 1 . 2))
function listp (x:any) : boolean {
    return x instanceof List
}

function setCar (xs:List, x:any) {
    if (!pairp(xs)) {
        const desc = ErrMsg.contract(`set-car!`, `a pair`, xs)
        throw new Error(desc)
    }
    xs.head.data = x
}

function setCdr (xs:List, x:any) {
    if (!pairp(xs)) {
        const desc = ErrMsg.contract(`set-cdr!`, `a pair`, xs)
        throw new Error(desc)
    }
    if (listp(x)) {
        xs.head.next = x.head
    } else { }
}

function append (...xss:List[]) : List {
    const ls = new List(null, null, 0)
    for (let i = 0; i < xss.length - 1; ++i) {
        const clone = xss[i].clone()
        if (ls.head === null) ls.head = clone.head
        if (ls.tail) ls.tail.next = clone.head
        ls.tail = clone.tail || ls.tail
    }

    // last list should not be cloned
    const last = xss[xss.length - 1]
    if (last) {
        if (ls.head === null) ls.head = last.head
        if (ls.tail) ls.tail.next = last.head
        ls.tail = last.tail || ls.tail
    }
    return ls
}

function listTail (xs:any, pos:number) : List {
    //  TODO check pos
    if (pos === 0) return xs
    if (pos > 0) {
        if (!(xs instanceof List)) {
            // TODO error
            return
        }
        if (xs.length < pos) {
            //  TODO error
            return
        }

        let head = xs.head
        let count = pos
        while (count--) {
            head = head.next
        }
        return new List(head, head && xs.tail, xs.length - pos)
    }
}

function reverse (xs:List) : List {
    const data:any[] = []
    let cur = xs.head
    while (cur) {
        data.push(cur.data)
        cur = cur.next
    }

    let head = null
    let tail = null
    for (let i = 0; i < data.length; ++i) {
        const node = new ListNode(data[i], head)
        if (tail === null) tail = node
        head = node
    }
    return new List(head, tail, xs.length)
}

type Eq = (a, b) => boolean
function member (xs:List, x:any) : List {}
function memq (xs:List, x:any) : List {}
function memv (xs:List, x:any) : List {}

function assoc (x:any, xs:List, eq?:Eq) : List {}
function assq (x:any, xs:List) : List {}
function assv (x:any, xs:List) : List {}

export const SchemeList = {
    ListNode, List,
    list, cons, car, cdr,
    length, append, reverse,
    member, memq, memv,
    assoc, assq, assv,

    'pair?': pairp,
    'list?': listp,
    'set-car!': setCar,
    'set-cdr!': setCdr,
    'list-tail': listTail,
}
