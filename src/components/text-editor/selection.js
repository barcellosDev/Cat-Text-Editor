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

        if (this.isCollapsed())
            return

        let left = TextEditor.getBufferColumnToScreenX(this.getStart()[1])
        let right = TextEditor.getBufferColumnToScreenX(this.getEnd()[1])
        let width = right - left
        let top = TextEditor.getBufferLineToScreenY(this.getEnd()[0])

        if (width < 0) {
            left += width
            width = Math.abs(width)
        }

        // console.log("left: " + left)
        // console.log("right: " +right)
        // console.log("width: " +width)
        // console.log("top: " +top)
        // console.log(this.isReversed())



        // forward selection (normal)
        if (this.getStart()[0] < this.getEnd()[0]) {
            for (let row = this.getStart()[0]; row <= this.getEnd()[0]; row++) {
                let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${row}"]`)

                const newLeft = 0
                const newWidth = TextEditor.getBufferColumnToScreenX(TextEditor.textBuffer.value[row].length)

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, top)
                    this.selectionsDivArea.appendChild(selectionDiv)
                }
            }
        }

        // backward selection
        if (this.getStart()[0] > this.getEnd()[0]) {
            for (let row = this.getStart()[0]; row >= this.getEnd()[0]; row--) {
                let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${row}"]`)

                const newLeft = 0
                const newWidth = TextEditor.getBufferColumnToScreenX(TextEditor.textBuffer.value[row].length)

                if (!selectionDiv) {
                    selectionDiv = this.buildSelectionWrapper(newLeft, newWidth, top)
                    this.selectionsDivArea.appendChild(selectionDiv)
                }
            }
        }

        if (this.getStart()[0] == this.getEnd()[0]) {
            let selectionDiv = this.selectionsDivArea.querySelector(`.selected-text[buffer-row="${this.getStart()[0]}"]`)

            if (!selectionDiv) {
                selectionDiv = this.buildSelectionWrapper(left, width, top)
                this.selectionsDivArea.appendChild(selectionDiv)
            }

            this.updateSelectionWrapper(selectionDiv, left, width, top)
        }

        this.selectionsDivArea
            .querySelectorAll(`[buffer-row="${this.getEnd()[0]}"] ~ [buffer-row]`)
            .forEach(div => div?.remove?.())

    }

    static buildSelectionWrapper(left, width, top) {
        const textSelectionDiv = document.createElement('div')

        textSelectionDiv.className = 'selected-text'
        textSelectionDiv.style.left = `${left}px`
        textSelectionDiv.style.width = `${width}px`
        textSelectionDiv.style.height = `${TextEditor.LINE_HEIGHT}px`
        textSelectionDiv.style.top = `${top}px`
        textSelectionDiv.style.minWidth = `${TextEditor.fontWidth}px`
        textSelectionDiv.setAttribute('buffer-row', TextEditor.getScreenYToBuffer(top))

        if (left === 0) {
            textSelectionDiv.style.borderTopLeftRadius = '0px'
            textSelectionDiv.style.borderBottomLeftRadius = '0px'
        }

        return textSelectionDiv
    }

    static updateSelectionWrapper(textSelectionDiv, left, width, top) {
        textSelectionDiv.style.left = `${left}px`
        textSelectionDiv.style.width = `${width}px`
        textSelectionDiv.style.top = `${top}px`
    }

    static isReversed() {
        return (
            this.getStart()[0] > this.getEnd()[0] ||
            this.getStart()[1] > this.getEnd()[1]
        )
    }

    static isCollapsed() {
        return (
            this.getStart()[0] === this.getEnd()[0] &&
            this.getStart()[1] === this.getEnd()[1]
        )
    }

    static clear() {
        this.selectionsDivArea.innerHTML = ''
        this.buffer = [[], []]
        window.getSelection().removeAllRanges()
    }
}