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

    _blinkVisible = true
    _blinkFrame = null
    _lastBlinkTime = 0
    _blinkInterval = 530 // ms

    constructor(textEditor, line = 0, col = 0) {
        this.textEditor = textEditor
        this.line = line
        this.col = col

        const cursorsArea = this.textEditor.DOM.textEditorContentContainer.querySelector('.cursors')
        const div = document.createElement('div')
        div.className = 'cursor'
        div.style.width = `${this.width}px`
        div.style.height = `${this.height || CatApp.LINE_HEIGHT}px`
        div.style.backgroundColor = '#cacaca'
        div.style.position = 'absolute'

        this.updateLineSelectedPosition()

        this.element = div
        cursorsArea.appendChild(div)

        this.startBlink()
    }

    startBlink() {
        this._blinkVisible = true
        this._lastBlinkTime = performance.now()
        const blinkLoop = (now) => {
            if (!this.element) return
            if (now - this._lastBlinkTime >= this._blinkInterval) {
                this._blinkVisible = !this._blinkVisible
                this.element.style.visibility = this._blinkVisible ? 'visible' : 'hidden'
                this._lastBlinkTime = now
            }
            this._blinkFrame = requestAnimationFrame(blinkLoop)
        }
        this._blinkFrame = requestAnimationFrame(blinkLoop)
    }

    stopBlink() {
        if (this._blinkFrame) {
            cancelAnimationFrame(this._blinkFrame)
            this._blinkFrame = null
        }
        if (this.element) {
            this.element.style.visibility = 'visible'
        }
    }

    resumeBlink() {
        if (!this._blinkFrame) {
            this.startBlink()
        }
    }

    hideLineSelectedPosition() {
        this.textEditor.DOM.lineSelected.style.display = 'none'
    }
    
    showLineSelectedPosition() {
        this.textEditor.DOM.lineSelected.style.display = 'block'
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

        const y = Math.floor(CatApp.LINE_HEIGHT * this.line)
        this.element.style.top = `${y}px`
        this.updateLineSelectedPosition()
        this.updateTextAreaToHandleKeyboardPosition()
    }

    setCol(col) {
        const lineLength = this.textEditor.getLineModel(this.line).getContent().length

        if (col > lineLength) {
            this.col = lineLength
        } else if (col < 0) {
            this.col = 0
        } else {
            this.col = col
        }

        const x = Math.round(CatApp.getFontWidth() * this.col)
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