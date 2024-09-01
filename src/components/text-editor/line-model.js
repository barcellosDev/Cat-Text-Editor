import highlight from "./colorize-text"
import { TextEditor } from "./text-core"

export class LineModel {
    element

    constructor(row, index) {
        this.element = this.buildLine(row, index)
    }

    removeSelected() {
        this.element.classList.remove('line-selected')
    }

    setSelected() {
        this.element.classList.add('line-selected')
    }

    update(row = null) {
        if (!this.element.firstElementChild)
            throw new Error()

        if (!row)
            row = TextEditor.textBuffer.value[TextEditor.getRowCursorBufferPos()]

        this.element.firstElementChild.remove()
        this.element.appendChild(this.buildRootSpan(row))
    }

    buildLine(row, index) {
        const divLine = document.createElement('div')
        divLine.className = `line ${index === TextEditor.getRowCursorBufferPos() ? 'line-selected' : ''}`

        const spanRoot = this.buildRootSpan(row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(row) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'

        let rowText = row.join('').replaceAll(' ', '&nbsp;').replaceAll('<', "&lt;").replaceAll('>', "&gt;")

        spanRoot.innerHTML = rowText
        spanRoot.innerHTML = highlight(spanRoot.innerText)

        return spanRoot
    }
}