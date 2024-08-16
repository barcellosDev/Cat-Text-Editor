import { ref } from "vue"

class TextEditor {

    LINE_HEIGHT = 23

    config = {
        fontSize: 16,
        fontFamily: 'Consolas'
    }

    fontWidth = (() => {
        const context = document.createElement('canvas').getContext('2d')
        context.font = `${this.config.fontSize}px ${this.config.fontFamily}`
        return context.measureText('A').width
    })()

    textBuffer = ref([
        []
    ])

    cursorPos = ref([0, 0]) // linha, coluna => i, j

    notPrint = {
        37: this.decrCharCursorPos, // arrowLeft
        38: () => { // arrowUp
            this.decrLineCursorPos()

            if (this.cursorPos.value[1] > this.textBuffer.value[this.cursorPos.value[0]].length)
                this.setCharCursorPos(this.textBuffer.value[this.cursorPos.value[0]].length)
        },
        39: this.incrCharCursorPos, // arrowRight
        40: () => { // arrowDown
            this.incrLineCursorPos()

            if (this.cursorPos.value[1] > this.textBuffer.value[this.cursorPos.value[0]].length)
                this.setCharCursorPos(this.textBuffer.value[this.cursorPos.value[0]].length)
        },
        13: () => { // enter
            this.insertLine()
            this.cursorPos.value[0]++
            this.setCharCursorPos(0)
        },
        8: this.handleBackSpace, // backspace
        35: () => { // end
            this.setCharCursorPos(this.textBuffer.value[this.cursorPos.value[0]].length)
        },
        36: () => { // home
            this.setCharCursorPos(0)
        }
    }

    handleKeyBoard(ev) {
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
            char = ''

            for (let counter = 1; counter <= 4; counter++) {
                this.insertChar(char)
                this.cursorPos.value[1]++
            }

            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertChar(char)
        this.cursorPos.value[1]++
    }

    handleBackSpace() {
        if (this.textBuffer.value.length === 1 && this.textBuffer.value[0].length === 0) {
            return
        }

        if (this.cursorPos.value[0] > 0 && this.cursorPos.value[1] === 0) {
            const deletedLine = this.textBuffer.value.splice(this.cursorPos.value[0], 1)[0]

            this.decrLineCursorPos()
            this.setCharCursorPos(this.textBuffer.value[this.cursorPos.value[0]].length)

            this.textBuffer.value[this.cursorPos.value[0]] = this.textBuffer.value[this.cursorPos.value[0]].concat(deletedLine)
            return
        }

        if (this.textBuffer.value.length === 1 && this.cursorPos.value[1] === 0)
            return


        if (this.cursorPos.value[1] < this.textBuffer.value[this.cursorPos.value[0]].length) {
            this.textBuffer.value[this.cursorPos.value[0]].splice(this.cursorPos.value[1] - 1, 1)
            this.decrCharCursorPos()
        } else {
            this.textBuffer.value[this.cursorPos.value[0]].pop()
            this.decrCharCursorPos()
        }
    }

    setCharCursorPos(pos) {
        if (pos < 0)
            return 0

        this.cursorPos.value[1] = pos
    }

    // function setLineCursorPos(pos) {
    //     if (pos <= 0)
    //         return 0

    //     this.cursorPos.value[0] = pos
    // }

    decrCharCursorPos() {
        if (this.cursorPos.value[1] <= 0)
            return 0

        this.cursorPos.value[1]--
    }

    decrLineCursorPos() {
        if (this.cursorPos.value[0] <= 0)
            return 0

        this.cursorPos.value[0]--
    }

    incrLineCursorPos() {
        if (this.cursorPos.value[0] >= this.textBuffer.value.length - 1)
            return

        this.cursorPos.value[0]++
    }

    incrCharCursorPos() {
        if (this.cursorPos.value[1] >= this.textBuffer.value[this.cursorPos.value[0]].length)
            return

        this.cursorPos.value[1]++
    }

    insertLine() {
        const newLine = this.textBuffer.value[this.cursorPos.value[0]].splice(this.cursorPos.value[1], Infinity)

        this.textBuffer.value.splice(this.cursorPos.value[0] + 1, 0, newLine)
    }

    insertChar(char) {
        this.textBuffer.value[this.cursorPos.value[0]].splice(this.cursorPos.value[1], 0, char)
    }

    isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 ||
            keyCode == 226 ||
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
            (keyCode > 218 && keyCode < 223) // [\]' (in order)
    }

    getScreenPosFromBufferPos(line, col) {

    }

    getBufferPosFromScreenPos(x, y) {
        // line height 23px

    }

    renderLineCount(editorLinesElement) {
        for (const key of this.textBuffer.value.keys()) {
            const divLineCount = document.createElement('div')
            divLineCount.bufferY = key
            divLineCount.className = `line-count ${key === this.cursorPos.value[0] ? 'line-count-selected' : ''}`
            divLineCount.innerText = key+1

            editorLinesElement.appendChild(divLineCount)
        }
    }

    renderText(editor) {
        editor.innerHTML = ''

        this.textBuffer.value.forEach((line, i) => {
            const divLine = document.createElement('div')
            divLine.className = `line ${i === this.cursorPos.value[0] ? 'line-selected' : ''}`
            divLine.bufferY = i

            const spanRoot = document.createElement('span')
            spanRoot.className = 'root'
            spanRoot.innerHTML = line.join('').replaceAll(' ', '&nbsp;').replaceAll('<', "&lt;").replaceAll('>', "&gt;")

            divLine.appendChild(spanRoot)
            editor.appendChild(divLine)
        })

        return editor
    }

    parseText(text) {
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.replace('\r', '').split('')
        })

        return lines
    }
}

export function useTextEditor() {
    return new TextEditor()
}