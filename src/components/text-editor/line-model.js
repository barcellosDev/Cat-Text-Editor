import { TextEditor } from "./text-core"
import { useFilesStore } from '@/store/files';
import { SHIKI } from "./highlighter";

export class LineModel {
    element = null
    lineCountElement = null

    row
    index

    constructor(row, index, isRaw = false) {
        this.row = row
        this.index = index

        if (!isRaw) {
            this.element = this.buildLine()
            this.lineCountElement = this.buildLineCount()
        }

        // isRaw means that we are trying to inject another pre computed DOM element
        // to this object in order to reuse the methods
        // so the user is obligated to define the this.element and this.lineCountElement outside of this constructor
    }
    
    insertToDOM() {
        if (this.element === null || this.lineCountElement === null) {
            throw new Error('HAS TO DEFINE SOME OF THE ESSENTIAL ELEMENTS!')
        }

        TextEditor.editorElement.appendChild(this.element)
        TextEditor.editorLinesElement.appendChild(this.lineCountElement)
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

        const textBufferRowData = TextEditor.textBuffer[this.index]

        // trying to update an line that doesnt exists
        // happens in case of deleting the last line (hence trying to update the line after it)
        if (!textBufferRowData)
            return

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
        divLine.style.minHeight = `${TextEditor.LINE_HEIGHT}px`
        divLine.className = `line`
        divLine.style.top = `${this.index * TextEditor.LINE_HEIGHT}px`
        divLine.setAttribute('buffer-row', this.index)

        const spanRoot = this.buildRootSpan(this.row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(data) {
        const filesStore = useFilesStore()
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'
        
        const rowText = data.join('')

        let finalHTML = SHIKI.highlight(rowText, filesStore.getFileExtension())
        finalHTML = (new DOMParser()).parseFromString(finalHTML, 'text/html').querySelector('.line').innerHTML

        spanRoot.innerHTML = finalHTML

        return spanRoot
    }
}