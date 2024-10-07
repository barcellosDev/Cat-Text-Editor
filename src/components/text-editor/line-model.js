import highlight from "./colorize-text"
import { TextEditor } from "./text-core"
import { useFilesStore } from '@/store/files';

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

        const store = useFilesStore()

        store.files[store.selectedFileIndex].changed = true
    }

    buildLine(row, index) {
        const divLine = document.createElement('div')
        divLine.style.lineHeight = `${TextEditor.LINE_HEIGHT}px`
        divLine.className = `line ${index === TextEditor.getRowCursorBufferPos() ? 'line-selected' : ''}`

        const spanRoot = this.buildRootSpan(row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(row) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'

        const highLightedText = highlight(row.join(''))
        spanRoot.innerHTML = highLightedText

        return spanRoot
    }
}