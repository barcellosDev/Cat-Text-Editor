import { TextEditor } from "./text-core"

export class Selection {
    static buffer = [[], []]

    static setSelectionsAreaElement() {
        this.selectionsDivArea = document.getElementById('selections')
    }

    static getStart() {
        return this.buffer[0]
    }

    static getEnd() {
        return this.buffer[1]
    }

    static setStart({
        row = null,
        column = null
    }) {
        if (row !== null)
            this.buffer[0][0] = row

        if (column !== null)
            this.buffer[0][1] = column
    }

    static setEnd({
        row = null,
        column = null
    }) {
        if (row !== null)
            this.buffer[1][0] = row

        if (column !== null)
            this.buffer[1][1] = column

        this.render()
    }

    static render() {

        if (this.isCollapsed()) {
            this.clear()
            return
        }

        const { extraStart, extraEnd } = TextEditor.getExtraViewPortRange()

        // forward selection (normal)
        if (this.getStart()[0] < this.getEnd()[0]) {
            let start = this.getStart()[0]

            if (start < extraStart) {
                start = extraStart
            }

            let end = this.getEnd()[0]

            if (end > extraEnd) {
                end = extraEnd
            }

            for (let row = start; row < end; row++) {
                let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${row}"]`)
                let newLeft = 0

                const lineLength = TextEditor.textBuffer.value[row].length
                let newWidth = lineLength === 0 ? TextEditor.fontWidth : TextEditor.getBufferColumnToScreenX(lineLength)

                const newTop = TextEditor.getBufferLineToScreenY(row)

                if (row === this.getStart()[0]) {
                    newLeft = TextEditor.getBufferColumnToScreenX(this.getStart()[1])
                    newWidth = newWidth - newLeft
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.selectionsDivArea.appendChild(selectionDiv)
                }

                this.updateSelectionWrapper(selectionDiv, { left: newLeft, width: newWidth })
            }
        }

        // backward selection
        if (this.isReversed()) {
            let start = this.getStart()[0]

            if (start > extraEnd) {
                start = extraEnd
            }

            let end = this.getEnd()[0]

            if (end < extraStart) {
                end = extraStart
            }

            for (let row = start; row > end; row--) {
                let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${row}"]`)

                const lineLength = TextEditor.textBuffer.value[row].length
                let newLeft = 0
                let newWidth = lineLength === 0 ? TextEditor.fontWidth : TextEditor.getBufferColumnToScreenX(lineLength)
                const newTop = TextEditor.getBufferLineToScreenY(row)

                if (row === this.getStart()[0]) {
                    newWidth = TextEditor.getBufferColumnToScreenX(this.getStart()[1])
                }

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, newTop)
                    this.selectionsDivArea.appendChild(selectionDiv)
                }

                this.updateSelectionWrapper(selectionDiv, { left: newLeft, width: newWidth })
            }
        }


        let left = TextEditor.getBufferColumnToScreenX(this.getStart()[1])
        let right = TextEditor.getBufferColumnToScreenX(this.getEnd()[1])
        let width = right - left
        let top = TextEditor.getBufferLineToScreenY(this.getEnd()[0])

        if (width < 0) {
            left += width
            width = Math.abs(width)
        }

        let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${TextEditor.getRowCursorBufferPos()}"]`)

        if (this.isMultiLine()) {
            left = 0
            width = right

            if (this.isReversed()) {
                left = TextEditor.getBufferColumnToScreenX()
                width = TextEditor.getBufferColumnToScreenX(TextEditor.textBuffer.value[TextEditor.getRowCursorBufferPos()].length) - left
            }
        }

        if (!selectionDiv) {
            selectionDiv = this.buildSelectionWrapper(left, width, top)
            this.selectionsDivArea.appendChild(selectionDiv)
        }

        this.updateSelectionWrapper(selectionDiv, { left, width, top })

        this.selectionsDivArea
            .querySelectorAll(`[buffer-row]`)
            .forEach(div => {
                const bufferRow = Number(div.getAttribute('buffer-row'))

                if (this.isReversed()) {
                    if (bufferRow < this.getEnd()[0] || bufferRow > this.getStart()[0])
                        div?.remove?.()
                } else {
                    if (bufferRow > this.getEnd()[0] || bufferRow < this.getStart()[0])
                        div?.remove?.()
                }
            })
    }

    static buildSelectionWrapper(left, width, top) {
        const textSelectionDiv = document.createElement('div')

        textSelectionDiv.className = 'selected-text'
        textSelectionDiv.style.left = `${left}px`
        textSelectionDiv.style.width = `${width}px`
        textSelectionDiv.style.height = `${TextEditor.LINE_HEIGHT}px`
        textSelectionDiv.style.top = `${top}px`
        textSelectionDiv.setAttribute('buffer-row', TextEditor.getScreenYToBuffer(top))

        if (left === 0) {
            textSelectionDiv.style.borderTopLeftRadius = '0px'
            textSelectionDiv.style.borderBottomLeftRadius = '0px'
        }

        return textSelectionDiv
    }

    static updateSelectionWrapper(textSelectionDiv, {
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

    static isReversed() {
        return (
            this.getStart()[0] > this.getEnd()[0] ||
            (this.getStart()[0] === this.getEnd()[0] && this.getStart()[1] > this.getEnd()[1])
        )
    }

    static isCollapsed() {
        return (
            this.getStart()[0] === this.getEnd()[0] &&
            this.getStart()[1] === this.getEnd()[1]
        )
    }

    static isMultiLine() {
        return Math.abs(this.getStart()[0] - this.getEnd()[0]) > 0
    }

    static clear() {
        this.selectionsDivArea.innerHTML = ''
        this.buffer = [
            [TextEditor.getRowCursorBufferPos(), TextEditor.getColumnCursorBufferPos()],
            [TextEditor.getRowCursorBufferPos(), TextEditor.getColumnCursorBufferPos()]
        ]
        window.getSelection().removeAllRanges()
    }

    static collapseToStart() {
        this.selectionsDivArea.innerHTML = ''
        window.getSelection().removeAllRanges()
        this.buffer[1] = this.buffer[0]
        TextEditor.setRowBufferPos(this.getStart()[0])
        TextEditor.setColumnBufferPos(this.getStart()[1])
    }

    static collapseToEnd() {
        this.selectionsDivArea.innerHTML = ''
        window.getSelection().removeAllRanges()
        this.buffer[0] = this.buffer[1]
        TextEditor.setRowBufferPos(this.getEnd()[0])
        TextEditor.setColumnBufferPos(this.getEnd()[1])
    }

    static getMaxRenderedBufferRow() {
        if (this.selectionsDivArea.childElementCount === 0)
            return

        let max = this.selectionsDivArea.querySelector('.selected-text:last-child').getAttribute('buffer-row')

        for (let index = 0; index < this.selectionsDivArea.children.length; index++) {
            const bufferRow = Number(this.selectionsDivArea.children[index].getAttribute('buffer-row'))

            if (bufferRow > max)
                max = bufferRow
        }

        return Number(max)
    }

    static getMinRenderedBufferRow() {
        if (this.selectionsDivArea.childElementCount === 0)
            return

        let min = this.selectionsDivArea.firstElementChild.getAttribute('buffer-row')

        for (let index = 0; index < this.selectionsDivArea.children.length; index++) {
            const bufferRow = Number(this.selectionsDivArea.children[index].getAttribute('buffer-row'))

            if (bufferRow < min)
                min = bufferRow
        }

        return Number(min)
    }
}