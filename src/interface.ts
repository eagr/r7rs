type SchemeError = { idx:number, desc:string }
type SchemeLexError = SchemeError
type SchemeTransError = SchemeError

type SchemeToken = { type:string, lex:string, idx:number }
type SchemeLexResult = [SchemeToken, null] | [null, SchemeLexError]
type SchemeScanner = (src:string, idx:number) => SchemeLexResult

type SchemeTranspiled = { js:string, next:number }
type SchemeTransResult = [SchemeTranspiled, null] | [null, SchemeTransError]
type SchemeTranspiler = (tokens:SchemeToken[], idx:number) => SchemeTransResult

export {
    SchemeError,
    SchemeLexError,
    SchemeTransError,

    SchemeToken,
    SchemeLexResult,
    SchemeScanner,

    SchemeTranspiled,
    SchemeTransResult,
    SchemeTranspiler,
}
