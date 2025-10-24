import { CatApp } from "./cat-app"
import { TextEditor } from "./text-core"

export class Selection {
    buffer

    /** @type {TextEditor} */
    textEditor

    constructor(textEditor) {
        this.textEditor = textEditor
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

        const { extraStart, extraEnd } = this.textEditor.getExtraViewPortRange()

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
                let selectionDiv = this.textEditor.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${row}"]`)
                let newLeft = 0

                const lineLength = this.textEditor.textBuffer.getLineLength(row)
                const newTop = this.textEditor.getBufferLineToScreenY(row)

                let newWidth = lineLength === 0 ? CatApp.getFontWidth() : this.textEditor.getBufferColumnToScreenX(lineLength)

                if (row === this.getStart().line) {
                    newLeft = this.textEditor.getBufferColumnToScreenX(this.getStart().col)
                    newWidth = newWidth - newLeft
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.textEditor.DOM.selectionArea.appendChild(selectionDiv)
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
                let selectionDiv = this.textEditor.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${row}"]`)

                const lineLength = this.textEditor.textBuffer.getLineLength(row)

                let newLeft = 0
                let newWidth = lineLength === 0 ? CatApp.getFontWidth() : this.textEditor.getBufferColumnToScreenX(lineLength)

                const newTop = this.textEditor.getBufferLineToScreenY(row)

                if (row === this.getStart().line) {
                    newWidth = this.textEditor.getBufferColumnToScreenX(this.getStart().col)
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.textEditor.DOM.selectionArea.appendChild(selectionDiv)
                }

                this.updateSelectionWrapper(selectionDiv, { left: newLeft, width: newWidth })
            }
        }


        let left = this.textEditor.getBufferColumnToScreenX(this.getStart().col)
        let right = this.textEditor.getBufferColumnToScreenX(this.getEnd().col)
        let width = right - left
        let top = this.textEditor.getBufferLineToScreenY(this.getEnd().line)

        if (width < 0) {
            left += width
            width = Math.abs(width)
        }

        let selectionDiv = this.textEditor.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${this.textEditor.cursor.getLine()}"]`)

        if (this.isMultiLine()) {
            left = 0
            width = right

            if (this.isReversed()) {
                left = this.textEditor.getBufferColumnToScreenX()
                width = this.textEditor.getBufferColumnToScreenX(this.textEditor.textBuffer.getLineLength(this.textEditor.cursor.getLine())) - left
            }
        }

        if (!selectionDiv) {
            selectionDiv = this.buildSelectionWrapper(left, width, top)
            this.textEditor.DOM.selectionArea.appendChild(selectionDiv)
        }

        this.updateSelectionWrapper(selectionDiv, { left, width, top })

        this.textEditor.DOM.selectionArea
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
        textSelectionDiv.setAttribute('buffer-row', this.textEditor.getScreenYToBuffer(top))

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
        this.textEditor.DOM.selectionArea.innerHTML = ''
        window.getSelection().removeAllRanges()

        this.buffer.end = this.buffer.start
        this.textEditor.cursor.setLine(this.getStart().line)
        this.textEditor.cursor.setCol(this.getStart().col)
    }

    collapseToEnd() {
        this.textEditor.DOM.selectionArea.innerHTML = ''
        window.getSelection().removeAllRanges()
        this.buffer.start = this.buffer.end
        this.textEditor.cursor.setLine(this.getEnd().line)
        this.textEditor.cursor.setCol(this.getEnd().col)
    }

    getMaxRenderedBufferRow() {
        if (this.textEditor.DOM.selectionArea.childElementCount === 0)
            return

        let max = this.textEditor.DOM.selectionArea.querySelector('.selected-text:last-child').getAttribute('buffer-row')

        for (let index = 0; index < this.textEditor.DOM.selectionArea.children.length; index++) {
            const bufferRow = Number(this.textEditor.DOM.selectionArea.children[index].getAttribute('buffer-row'))

            if (bufferRow > max)
                max = bufferRow
        }

        return Number(max)
    }

    getMinRenderedBufferRow() {
        if (this.textEditor.DOM.selectionArea.childElementCount === 0)
            return

        let min = this.textEditor.DOM.selectionArea.firstElementChild.getAttribute('buffer-row')

        for (let index = 0; index < this.textEditor.DOM.selectionArea.children.length; index++) {
            const bufferRow = Number(this.textEditor.DOM.selectionArea.children[index].getAttribute('buffer-row'))

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
        this.textEditor.DOM.selectionArea.innerHTML = ''
    }
}