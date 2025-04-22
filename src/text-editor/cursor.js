import { CatApp } from "./cat-app"

export class Cursor {
    line = 0
    col = 0
    element = null
    width = 2
    height = null
    textEditor

    constructor(textEditor, line = 0, col = 0) {
        this.textEditor = textEditor
        this.line = line
        this.col = col

        // <div class="cursor"></div>

        const cursorsArea = this.textEditor.DOM.textEditorContentContainer.querySelector('.cursors')
        const div = document.createElement('div')
        div.className = 'cursor blink-cursor'
        div.style.width = `${this.width}px`
        div.style.height = `${this.height || CatApp.LINE_HEIGHT}px`
        div.style.backgroundColor = '#cacaca'
        div.style.position = 'absolute'

        this.updateLineSelectedPosition()

        this.element = div
        cursorsArea.appendChild(div)
    }

    stopBlink() {
        this.element.classList.remove('blink-cursor')
    }

    resumeBlink() {
        this.element.classList.add('blink-cursor')
    }

    updateLineSelectedPosition() {
        this.textEditor.DOM.lineSelected.style.height = `${CatApp.LINE_HEIGHT}px`
        this.textEditor.DOM.lineSelected.style.top = `${this.line * CatApp.LINE_HEIGHT}px`
    }

    getLine() {
        return this.line
    }

    getCol() {
        return this.col
    }

    setLine(line) {
        if (line < 0)
            this.line = 0

        if (line > this.textEditor.textBuffer.lineCount - 1) {
            this.line = this.textEditor.textBuffer.lineCount - 1
        } else {
            this.line = line
        }

        const y = CatApp.LINE_HEIGHT * this.line
        this.element.style.top = `${y}px`
        this.updateLineSelectedPosition()
    }

    setCol(col) {
        if (col > this.textEditor.textBuffer.getLineLength(this.getLine())) {
            this.col = this.textEditor.textBuffer.getLineLength(this.getLine())
        } else {
            this.col = col
        }

        if (col < 0)
            this.col = 0

        const x = CatApp.getFontWidth() * this.col
        this.element.style.left = `${x}px`
    }

    decrementLine() {
        if (this.line <= 0)
            return 0

        this.line--

        const y = this.element.offsetTop - CatApp.LINE_HEIGHT
        this.element.style.top = `${y}px`

        this.updateLineSelectedPosition()
    }

    incrementLine() {
        if (this.line >= this.textEditor.textBuffer.lineCount - 1)
            return

        this.line++

        const y = this.element.offsetTop + CatApp.LINE_HEIGHT
        this.element.style.top = `${y}px`

        this.updateLineSelectedPosition()
    }

    decrementCol() {
        if (this.col <= 0)
            return 0

        this.col--

        const pxFromStyle = Number(this.element.style.left.split('px')[0])
        const x = pxFromStyle - CatApp.getFontWidth()

        this.element.style.left = `${x}px`
    }

    incrementCol() {
        if (this.col >= this.textEditor.textBuffer.getLineLength(this.getLine()))
            return

        this.col++

        const pxFromStyle = Number(this.element.style.left.split('px')[0])
        const x = pxFromStyle + CatApp.getFontWidth()

        this.element.style.left = `${x}px`
    }

    setWidth(width) {
        if (!width) return

        this.width = width
        this.element.style.width = `${width}px`
    }

    setHeight(height) {
        if (!height) return

        this.height = height
        this.element.style.height = `${height}px`
    }
}