import { SHIKI } from "./highlighter";
import { CatApp } from "./cat-app";
import { TextEditor } from "./text-core";

export class LineModel {
    /** @type {HTMLElement} */
    lineElement = null

    /** @type {HTMLElement} */
    lineCountElement = null

    /** @type {TextEditor} */
    textEditor
    
    highlight
    content
    index
    DOMParser

    constructor(textEditor, content, index, highlight = false) {
        this.textEditor = textEditor
        this.content = content
        this.index = index
        this.DOMParser = new DOMParser()
        this.highlight = highlight
        this.lineElement = this.buildLine()
        this.lineCountElement = this.buildLineCount()

        this.textEditor.DOM.editorElement.appendChild(this.lineElement)
        this.textEditor.DOM.editorLinesElement.appendChild(this.lineCountElement)
    }

    getContent() {
        return this.lineElement.firstElementChild.innerText
    }

    setContent(content) {
        const htmlParsedToPureText = this.DOMParser.parseFromString(content, 'text/html').body.innerText
        this.content = htmlParsedToPureText
    }

    remove() {
        this.lineElement.remove()
        this.lineCountElement.remove()
    }

    update(data = null, highlight = this.highlight) {
        if (!this.lineElement.firstElementChild)
            throw new Error()

        if (data === null)
            data = this.content

        this.setContent(data)
        this.lineElement.appendChild(this.buildRootSpan(data, highlight))
        this.lineElement.firstElementChild.remove()
    }

    buildLineCount() {
        const lineCountDiv = document.createElement('div')
        lineCountDiv.style.lineHeight = `${CatApp.LINE_HEIGHT}px`
        lineCountDiv.classList.add('line-count')
        lineCountDiv.innerHTML = this.index + 1
        lineCountDiv.style.top = `${this.index * CatApp.LINE_HEIGHT}px`

        return lineCountDiv
    }

    buildLine() {
        const divLine = document.createElement('div')
        divLine.style.lineHeight = `${CatApp.LINE_HEIGHT}px`
        divLine.style.minHeight = `${CatApp.LINE_HEIGHT}px`
        divLine.className = `line`
        divLine.style.top = `${this.index * CatApp.LINE_HEIGHT}px`
        divLine.setAttribute('buffer-row', this.index)

        const spanRoot = this.buildRootSpan(this.content)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(content, highlight = this.highlight) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'
        
        if (highlight && this.highlight) {
            let finalHTML = SHIKI.highlight(content, this.textEditor.fileInfo.extension)
            finalHTML = this.DOMParser.parseFromString(finalHTML, 'text/html').querySelector('.line').innerHTML
    
            spanRoot.innerHTML = finalHTML
        } else {
            spanRoot.innerHTML = content
        }

        return spanRoot
    }
}