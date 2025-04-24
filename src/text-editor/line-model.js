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

    constructor(textEditor, content, index, highlight = false) {
        this.textEditor = textEditor
        this.content = content
        this.index = index
        this.highlight = highlight
        this.lineElement = this.buildLine()
        this.lineCountElement = this.buildLineCount()

        this.textEditor.DOM.editorElement.appendChild(this.lineElement)
        this.textEditor.DOM.editorLinesElement.appendChild(this.lineCountElement)
    }

    remove() {
        this.lineElement.remove()
        this.lineCountElement.remove()
    }

    update() {
        if (!this.lineElement.firstElementChild)
            throw new Error()

        const textBufferRowData = this.textEditor.textBuffer.getLineContent(this.index)

        // trying to update an line that doesnt exists
        // happens in case of deleting the last line (hence trying to update the line after it)
        if (!textBufferRowData)
            return

        this.lineElement.firstElementChild.remove()
        this.lineElement.appendChild(this.buildRootSpan(textBufferRowData))
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

    buildRootSpan(content) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'
        
        if (this.highlight) {
            let finalHTML = SHIKI.highlight(content, this.textEditor.fileInfo.extension)
            finalHTML = (new DOMParser()).parseFromString(finalHTML, 'text/html').querySelector('.line').innerHTML
    
            spanRoot.innerHTML = finalHTML
        } else {
            spanRoot.innerHTML = content
        }

        return spanRoot
    }
}