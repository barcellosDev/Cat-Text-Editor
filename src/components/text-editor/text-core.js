import { ref } from "vue"
import { LineModel } from "./line-model"
import { useFilesStore } from '@/store/files';
import { Selection } from "./selection";

export class TextEditor {
    static editorElement = null
    static editorContainer = null
    static editorLinesElement = null
    static cursorElement = null

    static LINE_HEIGHT = 19
    static TAB_VALUE = '  '

    static config = {
        fontSize: 16,
        fontFamily: 'Consolas'
    }

    static fontWidth = (() => {
        const context = document.createElement('canvas').getContext('2d')
        context.font = `${this.config.fontSize}px ${this.config.fontFamily}`
        return context.measureText('A').width
    })()

    static textBuffer = ref([
        []
    ])

    static cursorBuffer = ref([0, 0])
    static lineBuffer = []

    static notPrint = {
        37: () => { // arrowLeft
            this.decrementColumnBufferPos()
        },
        38: () => { // arrowUp
            this.decrementRowBufferPos()
            this.getLineModelBuffer().setSelected()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        39: () => { // arrowRight
            this.incrementColumnBufferPos()
        },
        40: () => { // arrowDown
            this.incrementRowBufferPos()
            this.getLineModelBuffer().setSelected()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        13: () => { // enter
            this.insertLine()
            this.getLineModelBuffer().setSelected()
        },
        8: () => { // backspace
            this.handleBackSpace()
            this.renderContent()
            this.getLineModelBuffer().setSelected()
        },
        35: () => { // end
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        36: () => { // home
            this.setColumnBufferPos(0)
        }
    }

    static controlActions(char) {
        if (char === 's') {
            const store = useFilesStore()

            store.files[store.selectedFileIndex].text = this.renderPureText()

            const fileData = JSON.stringify(store.getSelectedFile())

            window.electron.onSaveFile(fileData, (file) => {
                if (file) {
                    store.files[store.selectedFileIndex] = JSON.parse(file)
                }
            })
        }

        if (char === 'c' || char === 'x') {
            const selectedData = window.getSelection().toString()
            navigator.clipboard.writeText(selectedData)

            if (char === 'x' && selectedData.length > 0)
                this.handleBackSpace()
        }

        if (char === 'v') {
            navigator.clipboard.readText().then(text => {
                this.insertText(text)
            })
        }

        if (char === 'a') {
            const selection = window.getSelection()
            const range = document.createRange()

            selection.removeAllRanges()

            range.setStartBefore(this.editorElement.firstElementChild)
            range.setEndAfter(this.editorElement.lastElementChild)

            selection.addRange(range)

            Selection.setStart({ row: 0, column: 0 })

            this.setRowBufferPos(Infinity)
            this.setColumnBufferPos(Infinity)

            Selection.setEnd({
                row: this.getRowCursorBufferPos(),
                column: this.getColumnCursorBufferPos()
            })
        }
    }

    static setEditorElement(editor) {
        this.editorElement = editor
    }

    static setEditorContainerElement(editorContainer) {
        this.editorContainer = editorContainer
    }

    static setEditorLinesElement(editorLines) {
        this.editorLinesElement = editorLines
    }

    static setCursorElement(cursor) {
        this.cursorElement = cursor
    }

    static handleKeyBoard(ev) {
        ev.preventDefault()

        const keyCode = ev.keyCode
        let char = ev.key

        if (!this.isCharValid(keyCode))
            return

        if (typeof this.notPrint[keyCode] === "function") {
            this.notPrint[keyCode]()
            return
        }

        if (ev.ctrlKey) {
            this.controlActions(char)
            return
        }

        if (keyCode === 9) { // tab
            char = ' '

            for (let count = 1; count <= 2; count++)
                this.insertText(char)

            this.getLineModelBuffer().update()
            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertText(char)
        this.getLineModelBuffer().update()
    }

    static getLineModelBuffer(row = null) {
        if (row === null)
            row = this.getRowCursorBufferPos()

        return this.lineBuffer.filter(line => line.index === row)[0] ?? null
    }

    static insertLineModelBuffer(lineModel) {
        this.lineBuffer.push(lineModel)
    }

    static deleteLineModelBuffer(row = null) {
        if (row === null)
            row = this.getRowCursorBufferPos()

        const Line = this.getLineModelBuffer(row)
        const indexToRemove = this.lineBuffer.findIndex(line => line.index == Line.index)
        
        if (indexToRemove !== -1) {
            Line.remove()
            this.lineBuffer.splice(indexToRemove, 1)
        }
    }

    static handleBackSpace() {
        if (this.getRowCursorBufferPos() === 0 && this.getColumnCursorBufferPos() === 0) {
            return
        }

        const selectionStartRow = Selection.getStart()[0]
        const selectionEndRow = Selection.getEnd()[0]

        const selectionStartColumn = Selection.getStart()[1]
        const selectionEndColumn = Selection.getEnd()[1]

        if (selectionStartRow > selectionEndRow) {

            const startLineData = this.textBuffer.value[selectionStartRow].splice(selectionStartColumn, Infinity)

            for (let index = selectionStartRow; index > selectionEndRow; index--) {
                this.deleteLineModelBuffer(index)
                this.decrementLineModelPositions(index)
                this.textBuffer.value.splice(index, 1)
            }

            this.textBuffer.value[selectionEndRow].splice(selectionEndColumn, this.textBuffer.value[selectionEndRow].length - selectionEndColumn)
            this.textBuffer.value[selectionEndRow] = this.textBuffer.value[selectionEndRow].concat(startLineData)

            this.setRowBufferPos(selectionEndRow)
            this.getLineModelBuffer().update()
            this.setColumnBufferPos(selectionEndColumn)

            Selection.clear()
            return
        }

        if (selectionStartRow === selectionEndRow && (selectionStartColumn !== selectionEndColumn)) {

            if (selectionStartColumn < selectionEndColumn) {
                this.textBuffer.value[this.getRowCursorBufferPos()].splice(selectionStartColumn, selectionEndColumn - selectionStartColumn)
                this.getLineModelBuffer().update()
                this.setColumnBufferPos(selectionStartColumn)
            } else {
                this.textBuffer.value[this.getRowCursorBufferPos()].splice(selectionEndColumn, selectionStartColumn - selectionEndColumn)
                this.getLineModelBuffer().update()
                this.setColumnBufferPos(selectionEndColumn)
            }

            Selection.clear()

            return
        }

        if (selectionEndRow > selectionStartRow) {
            const startLineData = this.textBuffer.value[selectionEndRow].splice(selectionEndColumn, Infinity)

            for (let index = selectionEndRow; index > selectionStartRow; index--) {
                this.deleteLineModelBuffer(index)
                this.decrementLineModelPositions(index)
                this.textBuffer.value.splice(index, 1)
            }

            this.textBuffer.value[selectionStartRow].splice(selectionStartColumn, Infinity)
            this.textBuffer.value[selectionStartRow] = this.textBuffer.value[selectionStartRow].concat(startLineData)

            this.setRowBufferPos(selectionStartRow)
            this.getLineModelBuffer().update()
            this.setColumnBufferPos(selectionStartColumn)

            Selection.clear()
            return
        }

        if (this.getRowCursorBufferPos() > 0 && this.getColumnCursorBufferPos() === 0) {
            const deletedLine = this.textBuffer.value.splice(this.getRowCursorBufferPos(), 1)[0]
            this.getLineModelBuffer().update()

            this.deleteLineModelBuffer()
            this.decrementRowBufferPos()
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
            
            this.textBuffer.value[this.getRowCursorBufferPos()] = this.textBuffer.value[this.getRowCursorBufferPos()].concat(deletedLine)

            this.getLineModelBuffer().update()
            this.decrementLineModelPositions()
            return
        }

        if (this.getColumnCursorBufferPos() < this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos() - 1, 1)
            this.decrementColumnBufferPos()
            this.getLineModelBuffer().update()
        } else {
            this.textBuffer.value[this.getRowCursorBufferPos()].pop()
            this.decrementColumnBufferPos()
            this.getLineModelBuffer().update()
        }
    }

    static insertLine() {
        const oldLine = this.getLineModelBuffer()
        const currentDataToConcat = this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), Infinity)
        oldLine.update()

        this.textBuffer.value.splice(this.getRowCursorBufferPos() + 1, 0, currentDataToConcat)

        
        const newLineBuffer = this.textBuffer.value[this.getRowCursorBufferPos() + 1]
        const newLineModel = new LineModel(newLineBuffer, this.getRowCursorBufferPos() + 1)
        
        newLineModel.insertAfter(oldLine)

        this.incrementLineModelPositions()
        this.insertLineModelBuffer(newLineModel)

        this.incrementRowBufferPos()
        this.setColumnBufferPos(0)
    }

    static incrementLineModelPositions(indexToStart = null) {
        this.lineBuffer
            .filter(line => line.index > (indexToStart ?? this.getRowCursorBufferPos()))
            .forEach(line => {
                const newBufferRow = Number(line.element.getAttribute('buffer-row')) + 1
                line.index = newBufferRow

                line.element.setAttribute('buffer-row', newBufferRow)
                line.element.style.top = `${line.element.offsetTop + this.LINE_HEIGHT}px`

                line.lineCountElement.style.top = `${line.lineCountElement.offsetTop + this.LINE_HEIGHT}px`
                line.lineCountElement.innerText = line.index + 1
            })
    }

    static decrementLineModelPositions(indexToStart = null) {
        this.lineBuffer
            .filter(line => line.index > (indexToStart ?? this.getRowCursorBufferPos()))
            .forEach(line => {
                const newBufferRow = Number(line.element.getAttribute('buffer-row')) - 1
                line.index = newBufferRow

                line.element.setAttribute('buffer-row', newBufferRow)
                line.element.style.top = `${line.element.offsetTop - this.LINE_HEIGHT}px`

                line.lineCountElement.style.top = `${line.lineCountElement.offsetTop - this.LINE_HEIGHT}px`
                line.lineCountElement.innerText = line.index + 1
            })
    }

    static insertText(text) {

        // if has selection, replace all the selected text with the typed char
        // that is, delete the selected data (call handleBackSpace) and insert the char
        if (!Selection.isCollapsed()) {
            this.handleBackSpace()
        }

        const newBuffer = this.parseText(text)

        newBuffer.forEach((line, index) => {

            this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), 0, ...line)
            this.setColumnBufferPos(this.getColumnCursorBufferPos() + line.length)

            if (newBuffer[index + 1])
                this.insertLine()
            else
                this.getLineModelBuffer().update()

        })

        Selection.clear()
    }

    static isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 ||
            keyCode == 226 ||
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
            (
                keyCode > 218 && keyCode < 223 &&
                keyCode !== 219 && keyCode !== 222
            ) // [\]' (in order)
    }

    static setColumnBufferPos(pos) {
        if (pos > this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.cursorBuffer.value[1] = this.textBuffer.value[this.getRowCursorBufferPos()].length
        } else {
            this.cursorBuffer.value[1] = pos
        }

        if (pos < 0)
            this.cursorBuffer.value[1] = 0

        const x = this.fontWidth * this.cursorBuffer.value[1]
        this.cursorElement.style.left = `${x}px`
    }

    static decrementColumnBufferPos() {

        if (this.cursorBuffer.value[1] <= 0)
            return 0

        this.cursorBuffer.value[1]--

        const pxFromStyle = Number(this.cursorElement.style.left.split('px')[0])
        const x = pxFromStyle - this.fontWidth

        this.cursorElement.style.left = `${x}px`
    }

    static incrementColumnBufferPos() {

        if (this.cursorBuffer.value[1] >= this.textBuffer.value[this.cursorBuffer.value[0]].length)
            return

        this.cursorBuffer.value[1]++

        const pxFromStyle = Number(this.cursorElement.style.left.split('px')[0])
        const x = pxFromStyle + this.fontWidth

        this.cursorElement.style.left = `${x}px`
    }

    static setRowBufferPos(pos) {

        if (pos < 0)
            this.cursorBuffer.value[0] = 0

        if (pos > this.textBuffer.value.length - 1) {
            this.cursorBuffer.value[0] = this.textBuffer.value.length - 1
        } else {
            this.cursorBuffer.value[0] = pos
        }


        const y = this.LINE_HEIGHT * this.cursorBuffer.value[0]
        this.cursorElement.style.top = `${y}px`
    }

    static decrementRowBufferPos() {
        if (this.cursorBuffer.value[0] <= 0)
            return 0


        this.cursorBuffer.value[0]--

        const y = this.cursorElement.offsetTop - this.LINE_HEIGHT
        this.cursorElement.style.top = `${y}px`
    }

    static incrementRowBufferPos() {
        if (this.cursorBuffer.value[0] >= this.textBuffer.value.length - 1)
            return


        this.cursorBuffer.value[0]++

        const y = this.cursorElement.offsetTop + this.LINE_HEIGHT
        this.cursorElement.style.top = `${y}px`
    }

    static getRowCursorBufferPos() {
        return this.cursorBuffer.value[0]
    }

    static getColumnCursorBufferPos() {
        return this.cursorBuffer.value[1]
    }

    static getScreenYToBuffer(offsetY) {
        return Math.floor(offsetY / TextEditor.LINE_HEIGHT)
    }

    static getScreenXToBuffer(offsetX) {
        return Math.round(Math.abs(offsetX) / TextEditor.fontWidth)
    }

    static getBufferLineToScreenY(lineIndex = null) {
        return Math.floor((lineIndex ?? this.getRowCursorBufferPos()) * this.LINE_HEIGHT)
    }

    static getBufferColumnToScreenX(columnIndex = null) {
        return Math.round((columnIndex ?? this.getColumnCursorBufferPos()) * this.fontWidth)
    }

    static renderContent() {        
        const { start, end } = this.getViewPortRange()

        this.editorElement.innerHTML = ''
        this.editorLinesElement.innerHTML = ''
        this.lineBuffer = []

        for (let index = start; index <= end; index++) {
            const row = this.textBuffer.value[index]
            const Line = new LineModel(row, index)

            this.lineBuffer.push(Line)
            this.editorElement.appendChild(Line.element)
            this.editorLinesElement.appendChild(Line.lineCountElement)
        }
    }

    static getViewPortRange() {
        const EXTRA_BUFFER_ROW_OFFSET = 3
        const firstLineOffset = Math.max(0, Math.floor(this.editorContainer.scrollTop / TextEditor.LINE_HEIGHT) - EXTRA_BUFFER_ROW_OFFSET)
        const lastLineOffset = Math.min(this.textBuffer.value.length - 1, Math.ceil((this.editorContainer.offsetHeight + this.editorContainer.scrollTop) / TextEditor.LINE_HEIGHT) + EXTRA_BUFFER_ROW_OFFSET)

        return { start: firstLineOffset, end: lastLineOffset }
    }

    static parseText(text) {
        text = text.replace(/\r\n/g, '\n').replace(/\t/g, this.TAB_VALUE)
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.split('')
        })

        return lines
    }

    static renderPureText(buffer = null) {
        let text = '';

        (buffer ?? this.textBuffer.value).forEach(line => {
            text += `${line.join('')}\n`
        })

        return text
    }

    static reset() {
        this.textBuffer.value = [[]]
        this.cursorBuffer.value = [0, 0]
        this.lineBuffer = []
        Selection.clear()
    }
}