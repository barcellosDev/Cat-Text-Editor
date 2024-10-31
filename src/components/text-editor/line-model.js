import { TextEditor } from "./text-core"
import { useFilesStore } from '@/store/files';
import { useThemesStore } from '@/store/themes';

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

    insertAfter(lineModel = null) {
        TextEditor.editorElement.insertBefore(this.element, lineModel?.element?.nextElementSibling)
        TextEditor.editorLinesElement.insertBefore(this.lineCountElement, lineModel?.lineCountElement?.nextElementSibling)
    }

    insertBefore(lineModel) {
        if (!lineModel) {
            TextEditor.editorElement.insertBefore(this.element, TextEditor.editorElement.firstElementChild)
            TextEditor.editorLinesElement.insertBefore(this.lineCountElement, TextEditor.editorLinesElement.firstElementChild)
        } else {
            TextEditor.editorElement.insertBefore(this.element, lineModel.element)
            TextEditor.editorLinesElement.insertBefore(this.lineCountElement, lineModel.lineCountElement)
        }
    }

    remove() {
        this.element.remove()
        this.lineCountElement.remove()
    }

    setSelected() {
        const currentLineSelected = TextEditor.editorElement.querySelector('.line-selected')
        currentLineSelected?.classList?.remove?.('line-selected')

        const currentLineCountSelected = TextEditor.editorLinesElement.querySelector('.line-count-selected')
        currentLineCountSelected?.classList?.remove?.('line-count-selected')

        this.element.classList.add('line-selected')
        this.lineCountElement.classList.add('line-count-selected')
    }

    update() {
        if (!this.element.firstElementChild)
            throw new Error()

        const textBufferRowData = TextEditor.textBuffer.value[this.index]

        this.element.firstElementChild.remove()
        this.element.appendChild(this.buildRootSpan(textBufferRowData))

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
        divLine.setAttribute('buffer-row', this.index)

        const spanRoot = this.buildRootSpan(this.row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(data) {
        const themesStore = useThemesStore()
        const spanRoot = document.createElement('span')

        spanRoot.className = 'root'

        const rowText = data.join('')

        const highLightedText = themesStore.highlightCode(rowText)
        const parsedHtml = (new DOMParser()).parseFromString(highLightedText, 'text/html')
        const highLightedCode = parsedHtml.querySelector('code > .line').innerHTML

        spanRoot.innerHTML = highLightedCode

        return spanRoot
    }
}