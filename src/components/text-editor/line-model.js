import { TextEditor } from "./text-core"
import { useFilesStore } from '@/store/files';

export class LineModel {
    element
    lineCountElement

    row
    index

    constructor(row, index) {
        this.row = row
        this.index = index

        this.element = this.buildLine()
        this.lineCountElement = this.buildLineCount()
    }

    removeSelected() {
        this.element.classList.remove('line-selected')
        this.lineCountElement.classList.remove('line-count-selected')
    }

    setSelected() {
        this.element.classList.add('line-selected')
        this.lineCountElement.classList.add('line-count-selected')
    }

    update() {
        if (!this.element.firstElementChild)
            throw new Error()

        if (!this.row)
            this.row = TextEditor.textBuffer.value[TextEditor.getRowCursorBufferPos()]

        this.element.firstElementChild.remove()
        this.element.appendChild(this.buildRootSpan(this.row))

        const store = useFilesStore()

        store.files[store.selectedFileIndex].changed = true
    }

    buildLineCount() {
        const lineCountDiv = document.createElement('div')
        lineCountDiv.style.lineHeight = `${TextEditor.LINE_HEIGHT}px`
        lineCountDiv.classList.add('line-count')
        lineCountDiv.innerHTML = this.index + 1
        lineCountDiv.style.top = `${this.index * TextEditor.LINE_HEIGHT}px`

        return lineCountDiv
    }

    buildLine() {
        const divLine = document.createElement('div')
        divLine.style.lineHeight = `${TextEditor.LINE_HEIGHT}px`
        divLine.className = `line`
        divLine.style.top = `${this.index * TextEditor.LINE_HEIGHT}px`
        

        const spanRoot = this.buildRootSpan(this.row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan() {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'

        const rowText = this.row.join('')
        spanRoot.innerText = rowText

        return spanRoot
    }
}