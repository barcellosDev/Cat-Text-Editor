import { ref } from "vue"

export class TextEditor {
    static editorElement = null
    static LINE_HEIGHT = 23

    static cursorElement = HTMLElement.prototype

    static config = {
        fontSize: 16,
        fontFamily: 'Consolas'
    }

    static fontWidth = (() => {
        const context = document.createElement('canvas').getContext('2d')
        context.font = `${this.config.fontSize}px ${this.config.fontFamily}`
        return context.measureText('A').width
    })()

    static textBuffer = ref([
        []
    ])

    static cursorBuffer = ref([0, 0])

    static notPrint = {
        37: () => {
            this.decrementColumnBufferPos()
        }, // arrowLeft
        38: () => { // arrowUp
            this.decrementRowBufferPos()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        39: () => {
            this.incrementColumnBufferPos()
        }, // arrowRight
        40: () => { // arrowDown
            this.incrementRowBufferPos()

            if (this.getColumnCursorBufferPos() > this.textBuffer.value[this.getRowCursorBufferPos()].length)
                this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        13: () => { // enter
            this.insertLine()
            this.incrementRowBufferPos()
            this.setColumnBufferPos(0)
        },
        8: () => {
            this.handleBackSpace()
        }, // backspace
        35: () => { // end
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)
        },
        36: () => { // home
            this.setColumnBufferPos(0)
        }
    }

    static setEditorElement(editor) {
        this.editorElement = editor
    }

    static setCursorElement(cursor) {
        this.cursorElement = cursor
    }

    static handleKeyBoard(ev) {
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

            for (let counter = 1; counter <= 2; counter++) {
                this.insertChar(char)
            }

            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertChar(char)
        this.renderLine()
    }

    static handleBackSpace() {
        if (this.textBuffer.value.length === 1 && this.textBuffer.value[0].length === 0) {
            return
        }

        if (this.getRowCursorBufferPos() > 0 && this.getColumnCursorBufferPos() === 0) {
            const deletedLine = this.textBuffer.value.splice(this.getRowCursorBufferPos(), 1)[0]

            this.decrementRowBufferPos()
            this.setColumnBufferPos(this.textBuffer.value[this.getRowCursorBufferPos()].length)

            this.textBuffer.value[this.getRowCursorBufferPos()] = this.textBuffer.value[this.getRowCursorBufferPos()].concat(deletedLine)
            return
        }

        if (this.textBuffer.value.length === 1 && this.getColumnCursorBufferPos() === 0)
            return


        if (this.getColumnCursorBufferPos() < this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos() - 1, 1)
            this.decrementColumnBufferPos()
        } else {
            this.textBuffer.value[this.getRowCursorBufferPos()].pop()
            this.decrementColumnBufferPos()
        }
    }

    static insertLine() {
        const newLine = this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), Infinity)

        this.textBuffer.value.splice(this.getRowCursorBufferPos() + 1, 0, newLine)
    }

    static insertChar(char) {
        this.textBuffer.value[this.getRowCursorBufferPos()].splice(this.getColumnCursorBufferPos(), 0, char)
        this.incrementColumnBufferPos()
    }

    static isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 ||
            keyCode == 226 ||
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
            (keyCode > 218 && keyCode < 223) // [\]' (in order)
    }

    static setColumnBufferPos(pos) {
        if (pos < 0)
            return 0

        if (pos > this.textBuffer.value[this.getRowCursorBufferPos()].length) {
            this.cursorBuffer.value[1] = this.textBuffer.value[this.getRowCursorBufferPos()].length
            return
        }

        this.cursorBuffer.value[1] = pos

        const x = TextEditor.fontWidth * pos
        this.cursorElement.value.style.left = `${x}px`
    }

    static decrementColumnBufferPos() {
        
        if (this.cursorBuffer.value[1] <= 0)
            return 0
        
        this.cursorBuffer.value[1]--
        
        const pxFromStyle = Number(this.cursorElement.value.style.left.split('px')[0])
        const x = pxFromStyle - TextEditor.fontWidth

        this.cursorElement.value.style.left = `${x}px`
    }

    static incrementColumnBufferPos() {
        
        if (this.cursorBuffer.value[1] >= this.textBuffer.value[this.cursorBuffer.value[0]].length)
            return
        
        this.cursorBuffer.value[1]++

        const pxFromStyle = Number(this.cursorElement.value.style.left.split('px')[0])
        const x = pxFromStyle + TextEditor.fontWidth

        this.cursorElement.value.style.left = `${x}px`
    }

    static setRowBufferPos(pos) {
        if (pos < 0)
            return 0

        if (pos > this.textBuffer.value.length) {
            this.cursorBuffer.value[1] = this.textBuffer.value.length
            return
        }

        this.cursorBuffer.value[0] = pos

        const y = TextEditor.LINE_HEIGHT * pos
        this.cursorElement.value.style.top = `${y}px`
    }

    static decrementRowBufferPos() {
        if (this.cursorBuffer.value[0] <= 0)
            return 0

        this.cursorBuffer.value[0]--

        const y = this.cursorElement.value.offsetTop - TextEditor.LINE_HEIGHT
        this.cursorElement.value.style.top = `${y}px`
    }

    static incrementRowBufferPos() {
        if (this.cursorBuffer.value[0] >= this.textBuffer.value.length - 1)
            return

        this.cursorBuffer.value[0]++

        const y = this.cursorElement.value.offsetTop + TextEditor.LINE_HEIGHT
        this.cursorElement.value.style.top = `${y}px`
    }

    static getRowCursorBufferPos() {
        return this.cursorBuffer.value[0]
    }

    static getColumnCursorBufferPos() {
        return this.cursorBuffer.value[1]
    }

    static renderText() {
        this.editorElement.innerHTML = ''

        this.textBuffer.value.forEach((line, i) => {
            const divLine = document.createElement('div')
            divLine.className = `line ${i === this.getRowCursorBufferPos() ? 'line-selected' : ''}`
            divLine.bufferY = i
            divLine.setAttribute('buffer-y', i)

            const spanRoot = this.buildRootSpan(line)

            divLine.appendChild(spanRoot)
            this.editorElement.appendChild(divLine)
        })
    }

    static buildRootSpan(line) {
        const spanRoot = document.createElement('span')
        spanRoot.className = 'root'
        spanRoot.innerHTML = line.join('').replaceAll(' ', '&nbsp;').replaceAll('<', "&lt;").replaceAll('>', "&gt;")
        return spanRoot
    }

    static renderLine() {
        const currentLine = document.querySelector(`[buffer-y="${this.cursorBuffer.value[0]}"]`)
        currentLine.firstElementChild?.remove?.()

        const currentBufferLine = this.textBuffer.value[this.cursorBuffer.value[0]]
        currentLine.appendChild( this.buildRootSpan(currentBufferLine) )
    }

    static parseText(text) {
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.replace('\r', '').split('')
        })

        return lines
    }
}