import { CatApp } from "./cat-app"
import { DOMUI } from "./dom-ui"

export class Selection {
    buffer

    /** @type {DOMUI} */
    textEditorUI

    constructor(domUI) {
        this.textEditorUI = domUI
        this.buffer = {
            start: { line: 0, col: 0 },
            end: { line: 0, col: 0 }
        }
    }

    getStart() {
        return this.buffer.start
    }

    getEnd() {
        return this.buffer.end
    }

    setStart({
        row = null,
        column = null
    }) {
        if (row !== null)
            this.buffer.start.line = row

        if (column !== null)
            this.buffer.start.col = column
    }

    setEnd({
        row = null,
        column = null
    }) {
        if (row !== null)
            this.buffer.end.line = row

        if (column !== null)
            this.buffer.end.col = column

        this.render()
    }

    render() {
        if (this.isCollapsed()) {
            return
        }

        const { extraStart, extraEnd } = this.textEditorUI.getExtraViewPortRange()

        // forward selection (normal)
        if (this.getStart().line < this.getEnd().line) {
            let start = this.getStart().line

            if (start < extraStart) {
                start = extraStart
            }

            let end = this.getEnd().line

            if (end > extraEnd) {
                end = extraEnd
            }

            for (let row = start; row < end; row++) {
                let selectionDiv = this.textEditorUI.selectionArea.querySelector(`.selected-text[buffer-row="${row}"]`)
                let newLeft = 0

                const lineLength = this.textEditorUI.textEditor.textBuffer.getLineLength(row)
                const newTop = this.textEditorUI.getBufferLineToScreenY(row)

                let newWidth = lineLength === 0 ? CatApp.getFontWidth() : this.textEditorUI.getBufferColumnToScreenX(lineLength)

                if (row === this.getStart().line) {
                    newLeft = this.textEditorUI.getBufferColumnToScreenX(this.getStart().col)
                    newWidth = newWidth - newLeft
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.textEditorUI.selectionArea.appendChild(selectionDiv)
                }

                this.updateSelectionWrapper(selectionDiv, { left: newLeft, width: newWidth })
            }
        }

        // backward selection
        if (this.isReversed()) {
            let start = this.getStart().line

            if (start > extraEnd) {
                start = extraEnd
            }

            let end = this.getEnd().line

            if (end < extraStart) {
                end = extraStart
            }

            for (let row = start; row > end; row--) {
                let selectionDiv = this.textEditorUI.selectionArea.querySelector(`.selected-text[buffer-row="${row}"]`)

                const lineLength = this.textEditorUI.textEditor.textBuffer.getLineLength(row)

                let newLeft = 0
                let newWidth = lineLength === 0 ? CatApp.getFontWidth() : this.textEditorUI.getBufferColumnToScreenX(lineLength)

                const newTop = this.textEditorUI.getBufferLineToScreenY(row)

                if (row === this.getStart().line) {
                    newWidth = this.textEditorUI.getBufferColumnToScreenX(this.getStart().col)
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.textEditorUI.selectionArea.appendChild(selectionDiv)
                }

                this.updateSelectionWrapper(selectionDiv, { left: newLeft, width: newWidth })
            }
        }


        let left = this.textEditorUI.getBufferColumnToScreenX(this.getStart().col)
        let right = this.textEditorUI.getBufferColumnToScreenX(this.getEnd().col)
        let width = right - left
        let top = this.textEditorUI.getBufferLineToScreenY(this.getEnd().line)

        if (width < 0) {
            left += width
            width = Math.abs(width)
        }

        let selectionDiv = this.textEditorUI.selectionArea.querySelector(`.selected-text[buffer-row="${this.textEditorUI.cursor.getLine()}"]`)

        if (this.isMultiLine()) {
            left = 0
            width = right

            if (this.isReversed()) {
                left = this.textEditorUI.getBufferColumnToScreenX()
                width = this.textEditorUI.getBufferColumnToScreenX(this.textEditorUI.textEditor.textBuffer.getLineLength(this.textEditorUI.cursor.getLine())) - left
            }
        }

        if (!selectionDiv) {
            selectionDiv = this.buildSelectionWrapper(left, width, top)
            this.textEditorUI.selectionArea.appendChild(selectionDiv)
        }

        this.updateSelectionWrapper(selectionDiv, { left, width, top })

        this.textEditorUI.selectionArea
            .querySelectorAll(`[buffer-row]`)
            .forEach(div => {
                const bufferRow = Number(div.getAttribute('buffer-row'))

                if (this.isReversed()) {
                    if (bufferRow < this.getEnd().line || bufferRow > this.getStart().line)
                        div?.remove?.()
                } else {
                    if (bufferRow > this.getEnd().line || bufferRow < this.getStart().line)
                        div?.remove?.()
                }
            })
    }

    buildSelectionWrapper(left, width, top) {
        const textSelectionDiv = document.createElement('div')

        textSelectionDiv.className = 'selected-text'
        textSelectionDiv.style.left = `${left}px`
        textSelectionDiv.style.width = `${width}px`
        textSelectionDiv.style.height = `${CatApp.LINE_HEIGHT}px`
        textSelectionDiv.style.top = `${top}px`
        textSelectionDiv.setAttribute('buffer-row', this.textEditorUI.getScreenYToBuffer(top))

        if (left === 0) {
            textSelectionDiv.style.borderTopLeftRadius = '0px'
            textSelectionDiv.style.borderBottomLeftRadius = '0px'
        }

        return textSelectionDiv
    }

    updateSelectionWrapper(textSelectionDiv, {
        left = null,
        width = null,
        top = null
    }) {
        if (left !== null) {
            textSelectionDiv.style.left = `${left}px`

            if (left === 0) {
                textSelectionDiv.style.borderTopLeftRadius = '0px'
                textSelectionDiv.style.borderBottomLeftRadius = '0px'
            }
        }

        if (width !== null)
            textSelectionDiv.style.width = `${width}px`

        if (top !== null)
            textSelectionDiv.style.top = `${top}px`
    }

    isReversed() {
        return (
            this.getStart().line > this.getEnd().line ||
            (this.getStart().line === this.getEnd().line && this.getStart().col > this.getEnd().col)
        )
    }

    isCollapsed() {
        return (
            this.getStart().line === this.getEnd().line &&
            this.getStart().col === this.getEnd().col
        )
    }

    isMultiLine() {
        return Math.abs(this.getStart().line - this.getEnd().line) > 0
    }

    collapseToStart() {
        this.textEditorUI.selectionArea.innerHTML = ''
        window.getSelection().removeAllRanges()

        this.buffer.end = this.buffer.start
        this.textEditorUI.setLine(this.getStart().line)
        this.textEditorUI.setCol(this.getStart().col)
    }

    collapseToEnd() {
        this.textEditorUI.selectionArea.innerHTML = ''
        window.getSelection().removeAllRanges()
        this.buffer.start = this.buffer.end
        this.textEditorUI.setLine(this.getEnd().line)
        this.textEditorUI.setCol(this.getEnd().col)
    }

    getMaxRenderedBufferRow() {
        if (this.textEditorUI.selectionArea.childElementCount === 0)
            return

        let max = this.textEditorUI.selectionArea.querySelector('.selected-text:last-child').getAttribute('buffer-row')

        for (let index = 0; index < this.textEditorUI.selectionArea.children.length; index++) {
            const bufferRow = Number(this.textEditorUI.selectionArea.children[index].getAttribute('buffer-row'))

            if (bufferRow > max)
                max = bufferRow
        }

        return Number(max)
    }

    getMinRenderedBufferRow() {
        if (this.textEditorUI.selectionArea.childElementCount === 0)
            return

        let min = this.textEditorUI.selectionArea.firstElementChild.getAttribute('buffer-row')

        for (let index = 0; index < this.textEditorUI.selectionArea.children.length; index++) {
            const bufferRow = Number(this.textEditorUI.selectionArea.children[index].getAttribute('buffer-row'))

            if (bufferRow < min)
                min = bufferRow
        }

        return Number(min)
    }

    clear() {
        this.buffer = {
            start: { line: 0, col: 0 },
            end: { line: 0, col: 0 }
        }
        this.textEditorUI.selectionArea.innerHTML = ''
    }
}