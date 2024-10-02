import { ref } from "vue"
import { LineModel } from "./line-model"
import { useFilesStore } from '@/store/files';

export class TextEditor {
    static editorElement = null

    static LINE_HEIGHT = 19
    static TAB_VALUE = '  '

    static cursorElement = HTMLElement.prototype

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
    static selectionBuffer = [[], []]

    static notPrint = {
        37: () => {
            this.decrementColumnBufferPos()
        }, // arrowLeft
        38: () => { // arrowUp
            this.decrementRowBufferPos()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        39: () => {
            this.incrementColumnBufferPos()
        }, // arrowRight
        40: () => { // arrowDown
            this.incrementRowBufferPos()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        13: () => { // enter
            this.insertLine()
        },
        8: () => {
            this.handleBackSpace()
        }, // backspace
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

            store.files[store.selectedFileIndex].text = TextEditor.renderPureText()

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

            this.setStartSelection(0, 0)

            this.setRowBufferPos(Infinity)
            this.setColumnBufferPos(Infinity)

            this.setEndSelection()
        }
    }

    static setEditorElement(editor) {
        this.editorElement = editor
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
            
            this.getLine().update()                
            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertText(char)
        this.getLine().update()
    }

    static getLine(row = null) {
        if (!row)
            row = this.getRowCursorBufferPos()

        return this.lineBuffer[row]
    }

    static deleteLine(row = null) {
        if (!row)
            row = this.getRowCursorBufferPos()

        const Line = this.getLine(row)

        Line.element.remove()
        this.lineBuffer.splice(row, 1)
    }

    static handleBackSpace() {
        if (this.getRowCursorBufferPos() === 0 && this.getColumnCursorBufferPos() === 0) {
            return
        }

        const selectionStartRow = this.selectionBuffer[0][0]
        const selectionEndRow = this.selectionBuffer[1][0]

        const selectionStartColumn = this.selectionBuffer[0][1]
        const selectionEndColumn = this.selectionBuffer[1][1]

        if (selectionStartRow > selectionEndRow) {

            const startLineData = this.textBuffer.value[selectionStartRow].splice(selectionStartColumn, Infinity)

            for (let index = selectionStartRow; index > selectionEndRow; index--) {
                this.deleteLine(index)
                this.textBuffer.value.splice(index, 1)
            }

            this.textBuffer.value[selectionEndRow].splice(selectionEndColumn, this.textBuffer.value[selectionEndRow].length - selectionEndColumn)
            this.textBuffer.value[selectionEndRow] = this.textBuffer.value[selectionEndRow].concat(startLineData)

            this.setRowBufferPos(selectionEndRow)
            this.getLine().update()
            this.setColumnBufferPos(selectionEndColumn)

            this.removeSelection()
            return
        }

        if (selectionStartRow === selectionEndRow && (selectionStartColumn !== selectionEndColumn)) {

            if (selectionStartColumn < selectionEndColumn) {
                this.textBuffer.value[this.getRowCursorBufferPos()].splice(selectionStartColumn, selectionEndColumn - selectionStartColumn)
                this.getLine().update()
                this.setColumnBufferPos(selectionStartColumn)
            } else {
                this.textBuffer.value[this.getRowCursorBufferPos()].splice(selectionEndColumn, selectionStartColumn - selectionEndColumn)
                this.getLine().update()
                this.setColumnBufferPos(selectionEndColumn)
            }

            this.removeSelection()

            return
        }

        if (selectionEndRow > selectionStartRow ) {
            const startLineData = this.textBuffer.value[selectionEndRow].splice(selectionEndColumn, Infinity)

            for (let index = selectionEndRow; index > selectionStartRow; index--) {
                this.deleteLine(index)
                this.textBuffer.value.splice(index, 1)
            }

            this.textBuffer.value[selectionStartRow].splice(selectionStartColumn, Infinity)
            this.textBuffer.value[selectionStartRow] = this.textBuffer.value[selectionStartRow].concat(startLineData)

            this.setRowBufferPos(selectionStartRow)
            this.getLine().update()
            this.setColumnBufferPos(selectionStartColumn)

            this.removeSelection()
            return
        }

        if (this.getRowCursorBufferPos() > 0 && this.getColumnCursorBufferPos() === 0) {
            const deletedLine = this.textBuffer.value.splice(this.getRowCursorBufferPos(), 1)[0]

            this.deleteLine()

            this.decrementRowBufferPos()
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)

            this.textBuffer.value[this.getRowCursorBufferPos()] = this.textBuffer.value[this.getRowCursorBufferPos()].concat(deletedLine)

            this.getLine().update()
            return
        }


        if (this.getColumnCursorBufferPos() < this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos() - 1, 1)
            this.decrementColumnBufferPos()
            this.getLine().update()
        } else {
            this.textBuffer.value[this.getRowCursorBufferPos()].pop()
            this.decrementColumnBufferPos()
            this.getLine().update()
        }
    }

    static insertLine() {
        const oldLine = this.getLine()
        const currentDataToConcat = this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), Infinity)
        oldLine.update()

        this.textBuffer.value.splice(this.getRowCursorBufferPos() + 1, 0, currentDataToConcat)

        const newLineBuffer = this.textBuffer.value[this.getRowCursorBufferPos() + 1]
        const newLineModel = new LineModel(newLineBuffer, this.getRowCursorBufferPos() + 1)

        oldLine.element.parentElement.insertBefore(newLineModel.element, oldLine.element.nextElementSibling)
        this.lineBuffer.splice(this.getRowCursorBufferPos() + 1, 0, newLineModel)

        this.incrementRowBufferPos()
        this.setColumnBufferPos(0)
    }

    static insertText(text) {

        // if has selection, replace all the selected text with the typed char
        // that is, delete the selected data (call handleBackSpace) and insert the char
        if (
            this.selectionBuffer[0][0] !== this.selectionBuffer[1][0] ||
            this.selectionBuffer[0][1] !== this.selectionBuffer[1][1]
        ) {
            this.handleBackSpace()
        }

        const newBuffer = this.parseText(text)

        newBuffer.forEach((line, index) => {

            this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), 0, ...line)
            this.setColumnBufferPos(this.getColumnCursorBufferPos() + line.length)

            if (newBuffer[index + 1])
                this.insertLine()
            else
                this.getLine().update()

        })

        this.removeSelection()
    }

    static removeSelection() {
        this.selectionBuffer = [[], []]
        window.getSelection().removeAllRanges()
    }

    static isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 ||
            keyCode == 226 ||
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
            (keyCode > 218 && keyCode < 223) // [\]' (in order)
    }

    static setColumnBufferPos(pos) {
        if (pos > this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.cursorBuffer.value[1] = this.textBuffer.value[this.getRowCursorBufferPos()].length
        } else {
            this.cursorBuffer.value[1] = pos
        }

        if (pos < 0)
            this.cursorBuffer.value[1] = 0

        const x = TextEditor.fontWidth * this.cursorBuffer.value[1]
        this.cursorElement.style.left = `${x}px`
    }

    static decrementColumnBufferPos() {

        if (this.cursorBuffer.value[1] <= 0)
            return 0

        this.cursorBuffer.value[1]--

        const pxFromStyle = Number(this.cursorElement.style.left.split('px')[0])
        const x = pxFromStyle - TextEditor.fontWidth

        this.cursorElement.style.left = `${x}px`
    }

    static incrementColumnBufferPos() {

        if (this.cursorBuffer.value[1] >= this.textBuffer.value[this.cursorBuffer.value[0]].length)
            return

        this.cursorBuffer.value[1]++

        const pxFromStyle = Number(this.cursorElement.style.left.split('px')[0])
        const x = pxFromStyle + TextEditor.fontWidth

        this.cursorElement.style.left = `${x}px`
    }

    static setRowBufferPos(pos) {
        this.getLine()?.removeSelected()
        
        if (pos < 0)
            this.cursorBuffer.value[0] = 0

        if (pos > this.textBuffer.value.length-1) {
            this.cursorBuffer.value[0] = this.textBuffer.value.length-1
        } else {
            this.cursorBuffer.value[0] = pos
        }

        this.getLine().setSelected()

        const y = TextEditor.LINE_HEIGHT * this.cursorBuffer.value[0]
        this.cursorElement.style.top = `${y}px`
    }

    static decrementRowBufferPos() {
        if (this.cursorBuffer.value[0] <= 0)
            return 0


        this.getLine()?.removeSelected()
        this.cursorBuffer.value[0]--
        this.getLine().setSelected()

        const y = this.cursorElement.offsetTop - TextEditor.LINE_HEIGHT
        this.cursorElement.style.top = `${y}px`
    }

    static incrementRowBufferPos() {
        if (this.cursorBuffer.value[0] >= this.textBuffer.value.length - 1)
            return


        this.getLine()?.removeSelected()
        this.cursorBuffer.value[0]++
        this.getLine().setSelected()

        const y = this.cursorElement.offsetTop + TextEditor.LINE_HEIGHT
        this.cursorElement.style.top = `${y}px`
    }

    static getRowCursorBufferPos() {
        return this.cursorBuffer.value[0]
    }

    static getColumnCursorBufferPos() {
        return this.cursorBuffer.value[1]
    }

    static setStartSelection(row, column) {
        TextEditor.selectionBuffer[0] = [row ?? TextEditor.getRowCursorBufferPos(), column ?? TextEditor.getColumnCursorBufferPos()]
    }
    
    static setEndSelection(row, column) {
        TextEditor.selectionBuffer[1] = [row ?? TextEditor.getRowCursorBufferPos(), column ?? TextEditor.getColumnCursorBufferPos()]
    }

    static renderText() {
        this.editorElement.innerHTML = ''

        this.textBuffer.value.forEach((row, index) => {
            const Line = new LineModel(row, index)

            this.editorElement.appendChild(Line.element)
            this.lineBuffer.push(Line)
        })
    }

    static parseText(text) {
        text = text.replace(/\r\n/g, '\n').replace(/\t/g, this.TAB_VALUE)
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.split('')
        })

        return lines
    }

    static renderPureText() {
        let text = ''

        this.textBuffer.value.forEach(line => {
            text += `${line.join('')}\n`
        })

        return text
    }

    static reset() {
        this.textBuffer.value = [[]]
        this.cursorBuffer.value = [0, 0]
        this.lineBuffer = []
        this.removeSelection()
    }
}