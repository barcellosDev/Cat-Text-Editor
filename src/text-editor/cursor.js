import { CatApp } from "./cat-app"
import { TextEditor } from "./text-core"

export class Cursor {
    line = 0
    col = 0
    element = null
    width = 2
    height = null

    /** @type {TextEditor} */
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

    updateTextAreaToHandleKeyboardPosition() {
        this.textEditor.DOM.textAreaToHandleKeyboard.style.top = `${this.line * CatApp.LINE_HEIGHT}px`
        this.textEditor.DOM.textAreaToHandleKeyboard.style.left = `${this.col * CatApp.getFontWidth()}px`
    }

    getLine() {
        return this.line
    }

    getCol() {
        return this.col
    }

    setLine(line) {
        if (line > this.textEditor.textBuffer.lineCount - 1) {
            this.line = this.textEditor.textBuffer.lineCount - 1
        } else if (line < 0) {
            this.line = 0
        } else {
            this.line = line
        }

        const y = CatApp.LINE_HEIGHT * this.line
        this.element.style.top = `${y}px`
        this.updateLineSelectedPosition()
        this.updateTextAreaToHandleKeyboardPosition()
    }

    setCol(col) {
        const currentLineModel = this.textEditor.getLineModel(this.line)
        const lineLength = currentLineModel.content.length

        if (col > lineLength-1) {
            this.col = lineLength-1
        } else if (col < 0) {
            this.col = 0
        } else {
            this.col = col
        }

        const x = CatApp.getFontWidth() * this.col
        this.element.style.left = `${x}px`
        this.updateTextAreaToHandleKeyboardPosition()
    }

    decrementLine() {
        this.setLine(--this.line)
        this.updateLineSelectedPosition()
    }

    incrementLine() {
        this.setLine(++this.line)
        this.updateLineSelectedPosition()
    }

    decrementCol() {
        this.setCol(--this.col)
    }

    incrementCol() {
        this.setCol(++this.col)
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