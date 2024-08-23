import { ref } from "vue"

class LineModel {
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
        divLine.bufferY = index

        const spanRoot = this.buildRootSpan(row)
        divLine.appendChild(spanRoot)

        return divLine
    }

    buildRootSpan(row) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'
        spanRoot.innerHTML = row.join('').replaceAll(' ', '&nbsp;').replaceAll('<', "&lt;").replaceAll('>', "&gt;")
        return spanRoot
    }
}

export class TextEditor {
    static editorElement = null
    static LINE_HEIGHT = 23

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

        if (keyCode === 9) { // tab
            char = ' '

            for (let counter = 1; counter <= 2; counter++) {
                this.insertChar(char)
            }

            this.getLine().update()

            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertChar(char)
        this.getLine().update()
    }

    static getLine(row = null) {
        if (!row)
            row = this.getRowCursorBufferPos()

        return this.lineBuffer[row]
    }

    static deleteLine(from = null, to = null) {
        if (!from && !to) {
            from = this.getRowCursorBufferPos()
            to = this.getRowCursorBufferPos()
        }

        for (let index = from; index <= to; index++) {
            const Line = this.getLine(index)
            Line.element.remove()
        }

        let deleteCount = to - from

        if (deleteCount === 0)
            deleteCount = 1

        this.lineBuffer.splice(from, deleteCount)
    }

    static handleBackSpace() {
        if (this.textBuffer.value.length === 1 && this.textBuffer.value[0].length === 0) {
            return
        }

        if (this.getRowCursorBufferPos() > 0 && this.getColumnCursorBufferPos() === 0) {
            const deletedLine = this.textBuffer.value.splice(this.getRowCursorBufferPos(), 1)[0]

            this.deleteLine()

            this.decrementRowBufferPos()
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)

            this.textBuffer.value[this.getRowCursorBufferPos()] = this.textBuffer.value[this.getRowCursorBufferPos()].concat(deletedLine)

            this.getLine().update()
            this.rebuildLinesBufferYPositions()
            return
        }

        if (this.textBuffer.value.length === 1 && this.getColumnCursorBufferPos() === 0)
            return


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
        this.rebuildLinesBufferYPositions()
    }

    // OPTIMIZE THIS CODE
    static rebuildLinesBufferYPositions() {
        for (let index = this.getRowCursorBufferPos(); index < this.textBuffer.value.length; index++) {
            this.lineBuffer[index].element.bufferY = index
        }
    }

    static insertChar(char) {
        this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), 0, char)
        this.incrementColumnBufferPos()
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
        if (pos < 0)
            return 0

        if (pos > this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.cursorBuffer.value[1] = this.textBuffer.value[this.getRowCursorBufferPos()].length
            return
        }

        this.cursorBuffer.value[1] = pos

        const x = TextEditor.fontWidth * pos
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
        if (pos < 0)
            return 0
        
        if (pos > this.textBuffer.value.length) {
            this.cursorBuffer.value[0] = this.textBuffer.value.length
            return
        }

        this.getLine().removeSelected()
        this.cursorBuffer.value[0] = pos
        this.getLine().setSelected()

        const y = TextEditor.LINE_HEIGHT * pos
        this.cursorElement.style.top = `${y}px`
    }

    static decrementRowBufferPos() {
        if (this.cursorBuffer.value[0] <= 0)
            return 0


        this.getLine().removeSelected()

        this.cursorBuffer.value[0]--

        this.getLine().setSelected()

        const y = this.cursorElement.offsetTop - TextEditor.LINE_HEIGHT
        this.cursorElement.style.top = `${y}px`
    }

    static incrementRowBufferPos() {
        if (this.cursorBuffer.value[0] >= this.textBuffer.value.length - 1)
            return


        this.getLine().removeSelected()
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

    static renderText() {
        this.editorElement.innerHTML = ''

        this.textBuffer.value.forEach((row, index) => {
            const Line = new LineModel(row, index)

            this.editorElement.appendChild(Line.element)
            this.lineBuffer.push(Line)
        })
    }

    static parseText(text) {
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.replace('\r', '').split('')
        })

        return lines
    }

    static reset() {
        TextEditor.textBuffer.value = [[]]
        TextEditor.cursorBuffer.value = [0, 0]
        TextEditor.lineBuffer = []
    }
}