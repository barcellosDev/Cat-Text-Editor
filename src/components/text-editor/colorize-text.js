import jsTokens from "js-tokens"

/*
| { type: "StringLiteral"; value: string; closed: boolean }
  | { type: "NoSubstitutionTemplate"; value: string; closed: boolean }
  | { type: "TemplateHead"; value: string }
  | { type: "TemplateMiddle"; value: string }
  | { type: "TemplateTail"; value: string; closed: boolean }
  | { type: "RegularExpressionLiteral"; value: string; closed: boolean }
  | { type: "MultiLineComment"; value: string; closed: boolean }
  | { type: "SingleLineComment"; value: string }
  | { type: "HashbangComment"; value: string }
  | { type: "IdentifierName"; value: string }
  | { type: "PrivateIdentifier"; value: string }
  | { type: "NumericLiteral"; value: string }
  | { type: "Punctuator"; value: string }
  | { type: "WhiteSpace"; value: string }
  | { type: "LineTerminatorSequence"; value: string }
  | { type: "Invalid"; value: string };
*/

// const stringLiteralRegex = /([ ' " ])(?:[^ ' " \\ \n \r ]+|(?!\1)[ ' " ]|\\(?: \r\n | [^] ))*(\1)?/

// const RegularExpressionLiteral = /\/(?![*/])(?:\[(?:[^\]\\\n\r\u2028\u2029]+|\\.)*\]|[^/\\\n\r\u2028\u2029]+|\\.)*(\/[$_\u200C\u200D\p{ID_Continue}]*|\\)?\//yu

// const Punctuator = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[ + \- % & | ^ ]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![ / * ]))=?|[ ? ~ , : ; [ \] ( ) { } ]/yu

// const Identifier = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]+|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/yu

// const NumericLiteral = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y

// const Template = /[`}]?(?:(?:[^`\\$]+|\\[^]|\\$(?!\{))*)?(`|\${)?/y;

// const WhiteSpace = /[ \t\v\f\ufeff\p{Zs}]+/yu;

// const LineTerminatorSequence = /\r?\n|[\r\u2028\u2029]/y;

// const MultiLineComment = /\/\*(?:[^*]+|\*(?!\/))*(\*\/)?/y

// const SingleLineComment = /\/\/.*/y;

// const HashbangComment = /^#!.*/;

const colorSchemeByToken = {
    'StringLiteral': '#ce9178',
    "NoSubstitutionTemplate": '',
    "TemplateHead": '',
    "TemplateMiddle": '',
    "TemplateTail": '',
    "RegularExpressionLiteral": '#d16969',
    "MultiLineComment": '#6a9955',
    "SingleLineComment": '#6a9955',
    "HashbangComment": '',
    "IdentifierName": '#569cd6',
    "PrivateIdentifier": '',
    "NumericLiteral": '#b5cea8',
    "Punctuator": 'whitesmoke',
    'WhiteSpace': '#6a9955',
    "LineTerminatorSequence": '',
    "Invalid": '#f70776'
}

const colorSchemeByWord = {
    "class": '#4ec9b0',
    'function': '#dcdcaa',
    'let': '#9cdcfe',
    'var': '#9cdcfe',
    'const': '#4fc1ff'
}

export default function highlight(text) {
    const tokens = Array.from(jsTokens(text))

    const parsed = tokens.map((token, index, originalArray) => {

        if (token.type === 'WhiteSpace') {
            return token.value.replaceAll(' ', `&nbsp;`)
        }

        let color = colorSchemeByToken[token.type]

        if (token.type === 'IdentifierName') {
            const previousToken = getPreviousIdentifierNameTokenValue(originalArray, index)
            
            if (previousToken !== undefined && colorSchemeByWord[previousToken] !== undefined) {
                color = colorSchemeByWord[previousToken]
            }
        }
            
        return `<span style="color: ${color}">${token.value}</span>`
    })

    return parsed.join('')
}

function getPreviousIdentifierNameTokenValue(array, indexToStart) {
    for (let index = indexToStart - 1; index >= 0; index--) {
        if (array[index].type === 'IdentifierName')
            return array[index].value
    }
}