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
        const rowsToSelect = Math.abs(this.getEnd()[0] - this.getStart()[0])

        let left = TextEditor.getBufferColumnToScreenX(this.getStart()[1])
        let right = TextEditor.getBufferColumnToScreenX(this.getEnd()[1])
        let width = right - left
        let top = TextEditor.getBufferLineToScreenY(this.getEnd()[0])

        if (width < 0) {
            left += width
            width = Math.abs(width)
        }

        console.log("left: " + left)
        console.log("right: " +right)
        console.log("width: " +width)
        console.log("top: " +top)
        console.log(this.isReversed())

        // multi line selection
        if (rowsToSelect > 0) {
            
        } else {
            let selectionDiv = this.selectionsDivArea.querySelector('.selected-text')

            if (!selectionDiv) {
                selectionDiv = this.buildSelectionWrapper(left, width, top)
                this.selectionsDivArea.appendChild( selectionDiv )
            }

            this.updateSelectionWrapper(selectionDiv, left, width, top)
        }
    }

    static buildSelectionWrapper(left, width, top) {
        const textSelectionDiv = document.createElement('div')

        textSelectionDiv.className = 'selected-text'
        textSelectionDiv.style.left = `${left}px`
        textSelectionDiv.style.width = `${width}px`
        textSelectionDiv.style.height = `${TextEditor.LINE_HEIGHT}px`
        textSelectionDiv.style.top = `${top}px`

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
            this.selectionBuffer[0][0] === this.selectionBuffer[1][0] &&
            this.selectionBuffer[0][1] === this.selectionBuffer[1][1]
        )
    }

    static clear() {
        this.selectionsDivArea.innerHTML = ''
        this.buffer = [[0, 0], [0, 0]]
        window.getSelection().removeAllRanges()
    }
}