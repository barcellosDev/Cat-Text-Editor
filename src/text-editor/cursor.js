import { CatApp } from "./cat-app"
import { DOMUI } from "./dom-ui"

export class Cursor {
    line = 0
    col = 0

    element = null
    width = 2
    height = null

    /** @type {DOMUI} */
    textEditorUI

    _blinkVisible = true
    _blinkFrame = null
    _lastBlinkTime = 0
    _blinkInterval = 530 // ms

    constructor(domUI, line = 0, col = 0) {
        this.textEditorUI = domUI
        this.line = line
        this.col = col

        const cursorsArea = this.textEditorUI.textEditorContentContainer.querySelector('.cursors')
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

    setVisible(visible) {
        if (visible) {
            this.element.style.visibility = 'visible'
            return
        }

        this.element.style.visibility = 'hidden'
    }

    startBlink() {
        this._blinkVisible = true
        this._lastBlinkTime = performance.now()
        const blinkLoop = (now) => {
            if (!this.element) return
            if (now - this._lastBlinkTime >= this._blinkInterval) {
                this._blinkVisible = !this._blinkVisible
                this.setVisible(this._blinkVisible)
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
        this.textEditorUI.lineSelected.style.display = 'none'
    }
    
    showLineSelectedPosition() {
        this.textEditorUI.lineSelected.style.display = 'block'
    }

    updateLineSelectedPosition() {
        this.textEditorUI.lineSelected.style.height = `${CatApp.LINE_HEIGHT}px`
        this.textEditorUI.lineSelected.style.top = `${this.line * CatApp.LINE_HEIGHT}px`
    }

    updateTextAreaToHandleKeyboardPosition() {
        this.textEditorUI.textAreaToHandleKeyboard.style.top = `${this.line * CatApp.LINE_HEIGHT}px`
        this.textEditorUI.textAreaToHandleKeyboard.style.left = `${this.col * CatApp.getFontWidth()}px`
    }

    getLine() {
        return this.line
    }

    getCol() {
        return this.col
    }

    setLine(line) {
        this.line = line
        const y = Math.floor(CatApp.LINE_HEIGHT * this.line)
        this.element.style.top = `${y}px`
        this.updateLineSelectedPosition()
        this.updateTextAreaToHandleKeyboardPosition()
    }

    setCol(col) {
        this.col = col
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