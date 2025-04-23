import { LineModel } from "./line-model"
import { Selection } from "./selection";
import { PieceTable } from "./piece-table";
import { FileInfo } from "./file-info";
import { Cursor } from "./cursor";
import { CatApp } from "./cat-app";
import { ScrollBarVertical } from "./scrollbars/scrollbar-vertical";
import { ScrollBarHorizontal } from "./scrollbars/scrollbar-horizontal";


export class TextEditor {
    id = null
    DOM = {
        textEditorMainContainer: null,
        textEditorContentWrapper: null,
        textEditorContentContainer: null,
        textEditorWrapper: null,
        editorElement: null,
        editorContainer: null,
        editorLinesElement: null,
        cursorElement: null,
        absoluteInteractions: null,
        selectionArea: null,
        lineSelected: null,

        delete() {
            this.textEditorMainContainer?.remove?.()
        },

        show() {
            CatApp.hideEditors()
            this.textEditorMainContainer?.classList?.remove?.('hidden')
        },
        
        hide() {
            this.textEditorMainContainer?.classList?.add?.('hidden')
        }
    }
    canEnterSelectionChange = true
    TAB_VALUE = '  '
    EXTRA_BUFFER_ROW_OFFSET = 30
    IS_SHIFT_KEY_PRESSED = false
    deletedLinesIntervalBuffer = {}

    /** @type {PieceTable} */
    textBuffer = null

    /** @type {FileInfo} */
    fileInfo = null

    /** @type {Cursor} */
    cursor = null

    /** @type {ScrollBarVertical} */
    verticalScrollbar = null

    /** @type {ScrollBarHorizontal} */
    horizontalScrollBar = null

    /** @type {Selection} */
    selection = null

    get selection() {
        return this.selection
    }

    set selection(selection) {
        this.selection = selection

        if (selection instanceof Selection) {
            selection.render()
        } else {
            this.DOM.selectionArea.innerHTML = ''
            window.getSelection().removeAllRanges()
        }
    }

    lineModelBuffer = new Map()
    notPrint = {
        16: (ev) => {
            this.IS_SHIFT_KEY_PRESSED = ev.shiftKey
        },
        33: (ev) => { // pageUp
            const newYOffset = Math.max(0, this.DOM.textEditorContentWrapper.scrollTop - this.getBufferLineToScreenY(this.EXTRA_BUFFER_ROW_OFFSET))

            this.DOM.textEditorContentWrapper.scroll({
                top: newYOffset
            })

            this.verticalScrollbar.updateThumb()
            this.verticalScrollbar.container.dispatchEvent(new Event('on-scroll'))

            const newRowBuffer = this.getScreenYToBuffer(newYOffset)
            this.cursor.setLine(newRowBuffer)

            let firstLineBufferRow = this.DOM.editorElement.querySelector(`[buffer-row="${newRowBuffer}"]`)

            if (!firstLineBufferRow) {
                firstLineBufferRow = this.getMinRenderedBufferRow()
            } else {
                firstLineBufferRow = firstLineBufferRow.getAttribute('buffer-row')
            }

            this.getLineModelBuffer(firstLineBufferRow).setSelected()

            if (this.cursor.getCol() > this.textBuffer[this.cursor.getLine()].length) {
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }
        },
        34: (ev) => { // pageDown
            const newYOffset = Math.min(this.DOM.textEditorContentWrapper.scrollHeight, this.DOM.textEditorContentWrapper.scrollTop + this.getBufferLineToScreenY(this.EXTRA_BUFFER_ROW_OFFSET))

            this.DOM.textEditorContentWrapper.scroll({
                top: newYOffset
            })

            this.verticalScrollbar.updateThumb()
            this.verticalScrollbar.container.dispatchEvent(new Event('on-scroll'))

            const newRowBuffer = this.getScreenYToBuffer(newYOffset + this.DOM.textEditorContentWrapper.offsetHeight - CatApp.LINE_HEIGHT)
            this.cursor.setLine(newRowBuffer)

            let lastLineBufferRow = this.DOM.editorElement.querySelector(`[buffer-row="${newRowBuffer}"]`)

            if (!lastLineBufferRow) {
                lastLineBufferRow = this.getMaxRenderedBufferRow()
            } else {
                lastLineBufferRow = lastLineBufferRow.getAttribute('buffer-row')
            }

            this.getLineModelBuffer(lastLineBufferRow).setSelected()

            if (this.cursor.getCol() > this.textBuffer[this.cursor.getLine()].length) {
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }
        },
        37: (ev) => { // arrowLeft
            this.cursor.decrementCol()

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }

            this.scrollLeftWhenCursorGetNextToLeftEdge()
        },
        38: (ev) => { // arrowUp
            this.cursor.decrementLine()


            if (this.cursor.getCol() > this.textBuffer[this.cursor.getLine()].length)
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.scrollUpWhenCursorGetNextToTop()
        },
        39: (ev) => { // arrowRight
            this.cursor.incrementCol()

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.scrollRightWhenCursorGetNextToRightEdge()
        },
        40: (ev) => { // arrowDown
            this.cursor.incrementLine()


            if (this.cursor.getCol() > this.textBuffer[this.cursor.getLine()].length)
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.scrollDownWhenCursorGetNextToBottom()
        },
        13: () => { // enter
            this.insertLine()

        },
        8: () => { // backspace
            this.handleDelete()
        },
        35: (ev) => { // end
            this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            const lineLength = this.getBufferColumnToScreenX(this.textBuffer[this.cursor.getLine()].length)

            this.DOM.textEditorContentWrapper.scroll({
                left: lineLength - this.DOM.textEditorContentWrapper.offsetWidth + this.editorLinesElement.offsetWidth + CatApp.getFontWidth() * 3
            })
        },
        36: (ev) => { // home
            this.cursor.setCol(0)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol()
                })
            } else {
                this.selection = null
                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.DOM.textEditorContentWrapper.scroll({
                left: 0
            })
        }
    }

    constructor(fileData = null) {
        let textBufferInstance = new PieceTable(this)
        let fileInfoInstance = new FileInfo()

        if (fileData) {
            textBufferInstance = new PieceTable(this, fileData.buffer)
            fileInfoInstance = new FileInfo(fileData.name, fileData.path, fileData.extension)
        }

        this.id = CatApp.editors.length + 1
        this.textBuffer = textBufferInstance
        this.fileInfo = fileInfoInstance
    }

    renderDOM() {
        const textEditorsArea = document.getElementById('text-editors')

        if (!textEditorsArea) {
            return
        }

        const currentEditor = textEditorsArea.querySelector(`[cat-text-editor="${this.id}"]`)

        if (currentEditor) {
            this.updateDOM()
            return
        }

        const domStructure = `<div class="text-editor-main-container">
            <div class="text-editor-content-wrapper">
                <div class="text-editor-content-container">

                    <div class="text-editor-lines">
                    </div>
                    <div class="cat-text-editor-wrapper">
                        <div class="absolute-interactions">
                            <div class="line-selected"></div>
                            <div class="cursors"></div>
                            <div class="selections"></div>
                        </div>

                        <div class="text-editor-content"></div>
                    </div>

                </div>
            </div>
        </div>`

        let dom = (new DOMParser()).parseFromString(domStructure, 'text/html')
        dom = dom.querySelector('body')

        this.DOM.textEditorMainContainer = dom.querySelector('.text-editor-main-container')
        this.DOM.textEditorContentWrapper = dom.querySelector('.text-editor-content-wrapper')
        this.DOM.textEditorContentContainer = dom.querySelector('.text-editor-content-container')
        this.DOM.textEditorWrapper = dom.querySelector('.cat-text-editor-wrapper')

        this.DOM.textEditorMainContainer.setAttribute('cat-text-editor', this.id)

        this.DOM.absoluteInteractions = dom.querySelector('.absolute-interactions')
        this.DOM.lineSelected = dom.querySelector('.absolute-interactions .line-selected')
        this.DOM.selectionArea = dom.querySelector('.selections')
        this.DOM.editorElement = dom.querySelector('.text-editor-content')
        this.DOM.editorLinesElement = dom.querySelector('.text-editor-lines')

        this.DOM.lineSelected.style.width = `100%`

        this.cursor = new Cursor(this)
        this.selection = new Selection(this)

        textEditorsArea.appendChild(this.DOM.textEditorMainContainer)

        this.DOM.editorElement.style.width = `${2 * window.innerWidth}px`

        this.updateDOM()

        this.verticalScrollbar = new ScrollBarVertical(this)
        this.horizontalScrollBar = new ScrollBarHorizontal(this)

        this.DOM.textEditorMainContainer.onmouseenter = () => {
            this.verticalScrollbar.showScrollbar()
            this.horizontalScrollBar.showScrollbar()
        }

        this.DOM.textEditorMainContainer.onmouseleave = () => {
            this.verticalScrollbar.hideScrollbar()
            this.horizontalScrollBar.hideScrollbar()
        }

        this.verticalScrollbar.container.onmouseenter = () => {
            this.verticalScrollbar.showScrollbar()
            this.horizontalScrollBar.showScrollbar()
        }

        this.horizontalScrollBar.container.onmouseenter = () => {
            this.verticalScrollbar.showScrollbar()
            this.horizontalScrollBar.showScrollbar()
        }

        document.addEventListener('mouseup', () => {
            this.verticalScrollbar.isDragging = false
            this.horizontalScrollBar.isDragging = false
            document.body.style.userSelect = '';
        })

        const ROWS_GAP_TO_FETCH = 15
        let lastScrollTop = 0
        let isTicking = false

        this.verticalScrollbar.container.addEventListener('on-scroll', () => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    const { start, end } = this.getViewPortRange()

                    const firstLineBufferRow = this.getMinRenderedBufferRow()
                    const lastLineBufferRow = this.getMaxRenderedBufferRow()

                    // if (firstLineBufferRow !== this.lineModelBuffer.keys().next().value) {
                    //     console.log("FIRST DIFFERENT!!!")
                    //     console.log("RENDERED: " + firstLineBufferRow)
                    //     console.log("LINE MODEL: " + this.lineModelBuffer.keys().next().value)
                    // }

                    // if (lastLineBufferRow !== Array.from(this.lineModelBuffer.keys()).pop()) {
                    //     console.log("FIRST DIFFERENT!!!")
                    //     console.log("RENDERED: " + lastLineBufferRow)
                    //     console.log("LINE MODEL: " + Array.from(this.lineModelBuffer.keys()).pop())
                    // }

                    const firstSelectionBufferRow = this.selection.getMinRenderedBufferRow()
                    const lastSelectionBufferRow = this.selection.getMaxRenderedBufferRow()

                    if (this.DOM.textEditorContentWrapper.scrollTop < lastScrollTop) {
                        if (start - firstLineBufferRow <= ROWS_GAP_TO_FETCH) {

                            const { extraStart, extraEnd } = this.getExtraViewPortRange()

                            for (let index = Math.max(0, firstLineBufferRow); index >= extraStart; index--) {
                                if (this.DOM.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                const content = this.textBuffer.getLineContent(index)
                                const lineModel = new LineModel(this, content, index)
                                this.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = lastLineBufferRow; index > extraEnd; index--) {
                                this.deleteLineModelBuffer(index)
                            }

                            for (let index = lastSelectionBufferRow; index > extraEnd; index--) {
                                const selectionDiv = this.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            this.selection.render()
                        }
                    }

                    if (this.DOM.textEditorContentWrapper.scrollTop > lastScrollTop) {
                        if (lastLineBufferRow - end <= ROWS_GAP_TO_FETCH) {
                            const lastLineOffsetInBuffer = this.textBuffer.lineCount - 1
                            const { extraStart, extraEnd } = this.getExtraViewPortRange()

                            for (let index = Math.min(lastLineOffsetInBuffer, lastLineBufferRow); index <= extraEnd; index++) {
                                if (this.DOM.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                if (index > lastLineOffsetInBuffer)
                                    break

                                const content = this.textBuffer.getLineContent(index)
                                const lineModel = new LineModel(this, content, index)
                                this.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = firstLineBufferRow; index < extraStart; index++) {
                                this.deleteLineModelBuffer(index)
                            }

                            for (let index = firstSelectionBufferRow; index < extraStart; index++) {
                                const selectionDiv = this.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            this.selection.render()
                        }
                    }

                    lastScrollTop = this.DOM.textEditorContentWrapper.scrollTop
                    isTicking = false
                })
            }

            isTicking = true
        })
    }

    updateDOM() {
        if (!this.DOM.textEditorMainContainer)
            return
        
        this.DOM.textEditorMainContainer.style.width = this.DOM.textEditorContentWrapper.style.width = `${window.innerWidth - Math.abs(this.DOM.textEditorContentWrapper.getBoundingClientRect().left)}px`
        this.DOM.textEditorMainContainer.style.height = this.DOM.textEditorContentWrapper.style.height = `${window.innerHeight - Math.abs(this.DOM.textEditorContentWrapper.getBoundingClientRect().top) - CatApp.getFooter().offsetHeight}px`
        this.DOM.textEditorContentContainer.style.height = `${Math.max(this.textBuffer.lineCount * CatApp.LINE_HEIGHT, this.DOM.textEditorMainContainer.offsetHeight)}px`
        this.verticalScrollbar?.updateThumb?.()
        this.horizontalScrollBar?.updateThumb?.()
    }

    // controlActions(char) {
    //     if (char === 's') {
    //         const fileData = JSON.stringify(store.getSelectedFile())

    //         window.electron.onSaveFile(fileData, (file) => {
    //             if (file) {

    //             }
    //         })
    //     }

    //     if (char === 'c' || char === 'x') {
    //         const selectedData = window.getSelection().toString()
    //         navigator.clipboard.writeText(selectedData)

    //         if (char === 'x' && selectedData.length > 0)
    //             this.handleDelete()
    //     }

    //     if (char === 'v') {
    //         navigator.clipboard.readText().then(text => {
    //             this.insertText(text)
    //         })
    //     }

    //     if (char === 'a') {
    //         const selection = window.getSelection()
    //         const range = document.createRange()

    //         selection.removeAllRanges()

    //         range.setStartBefore(this.DOM.editorElement.firstElementChild)
    //         range.setEndAfter(this.DOM.editorElement.lastElementChild)

    //         selection.addRange(range)

    //         this.selection.setStart({ row: 0, column: 0 })

    //         this.cursor.setLine(Infinity)
    //         this.cursor.setCol(Infinity)

    //         this.selection.setEnd({
    //             row: this.cursor.getLine(),
    //             column: this.cursor.getCol()
    //         })
    //     }
    // }

    onSelectionChange() {
        document.onselectionchange = (ev) => {
            if (!this.canEnterSelectionChange)
                return

            if (!this.GetParentByClass(ev.target, this.DOM.editorElement.className))
                return

            const selection = document.getSelection()

            if (!selection.isCollapsed && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const rect = range.getBoundingClientRect()

                let selectedTextLeftOffset = rect.left - this.DOM.editorElement.getBoundingClientRect().left + this.DOM.textEditorContentWrapper.scrollLeft
                let selectedTextRightOffset = rect.right - this.DOM.editorElement.getBoundingClientRect().left + this.DOM.textEditorContentWrapper.scrollLeft
                let selectedTextTopOffset = rect.top - this.DOM.textEditorContentWrapper.offsetTop + this.DOM.textEditorContentWrapper.scrollTop

                // in case of selecting an empty row (the rect.right/left returns 0 (as if the rect was on the initial edge of the div))
                if (selectedTextLeftOffset < 0)
                    selectedTextLeftOffset = 0

                if (selectedTextRightOffset < 0)
                    selectedTextRightOffset = 0

                if (rect.width === 0 && rect.top === 0)
                    selectedTextTopOffset = this.getLineElementFrom(range.startContainer).offsetTop

                this.selection.setStart({
                    row: this.getScreenYToBuffer(selectedTextTopOffset),
                    column: Math.floor(selectedTextLeftOffset / this.getFontWidth())
                })

                let newOffsetX = Math.floor(selectedTextRightOffset)

                if (range.endContainer?.classList?.contains('line')) {
                    const nextRowBufferPosBasedOnInitialPos = this.selection.getStart()[0] + 1

                    if (this.textBuffer[nextRowBufferPosBasedOnInitialPos]) {
                        this.cursor.setLine(nextRowBufferPosBasedOnInitialPos)
                        newOffsetX = 0 // first offset of the next line
                    } else {
                        // if its the last line, select the current line
                        newOffsetX = this.getBufferColumnToScreenX(Infinity)
                    }
                }

                this.cursor.setCol(this.getScreenXToBuffer(newOffsetX))

                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })




            }
        }
    }

    onMouseRelease() {
        this.DOM.editorElement.onmouseup = () => {
            this.canEnterSelectionChange = true

            this.selection.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })


        }
        this.DOM.editorElement.onmousemove = null
    }

    onMouseClick() {
        this.DOM.editorElement.onmousedown = (ev) => {

            const getOffsetTopFromElement = (element) => {
                let selectedLine = this.getLineElementFrom(element)

                if (!selectedLine) {
                    selectedLine = this.DOM.editorElement.querySelector(`.line:last-child`)
                }

                return selectedLine.offsetTop
            }

            let mouseOffsetX = ev.offsetX
            let lineOffsetY = getOffsetTopFromElement(ev.target)

            this.setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)


            if (this.IS_SHIFT_KEY_PRESSED) {
                this.canEnterSelectionChange = false

                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {
                this.selection = null
            }

            this.DOM.editorElement.onmousemove = (ev) => {
                const selection = window.getSelection()
                this.canEnterSelectionChange = false

                lineOffsetY = getOffsetTopFromElement(ev.target)

                if (selection.focusNode && !selection.focusNode?.classList?.contains('line')) {
                    mouseOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * this.getFontWidth())
                } else if (!selection.focusNode) {
                    mouseOffsetX = ev.offsetX
                }

                this.setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)



                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })


                CatApp.setCursorPositionInFooter()
            }
            CatApp.setCursorPositionInFooter()
        }
    }

    setScreenCursorPositionToBuffer(offsetX, offsetY) {
        this.cursor.setLine(this.getScreenYToBuffer(offsetY))
        this.cursor.setCol(this.getScreenXToBuffer(offsetX))
    }

    getLineElementFrom(element) {
        if (element.classList?.contains('line'))
            return element

        if (!element.parentElement)
            return null

        return this.getLineElementFrom(element.parentElement)
    }

    GetParentByClass(currentElement, cssClass) {
        if (!(currentElement instanceof HTMLElement))
            return false

        if (!currentElement || currentElement == Window)
            return false

        if (ContainClasses(currentElement, cssClass))
            return currentElement;
        else
            return this.GetParentByClass(currentElement.parentElement, cssClass);


        function ContainClasses(currentElement, cssClass) {
            if (!cssClass) return

            return cssClass
                .split(' ')
                .map(css => currentElement.classList && currentElement.classList.contains(css))
                .reduce((prev, current) => prev && current)
        }
    }

    handleInputKeyBoard(ev) {
        ev.preventDefault()

        const keyCode = ev.keyCode
        let char = ev.key

        if (!this.isCharValid(keyCode))
            return

        if (typeof this.notPrint[keyCode] === "function") {
            this.notPrint[keyCode](ev)

            CatApp.setCursorPositionInFooter()

            return
        }

        if (ev.ctrlKey) {
            this.controlActions(char)
            return
        }

        if (keyCode === 9) { // tab
            char = ' '

            for (let count = 1; count <= 2; count++)
                this.insertText(char)

            this.getLineModelBuffer().update()
            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertText(char)
        this.getLineModelBuffer().update()
    }

    handleReleaseKeyboard(ev) {
        this.IS_SHIFT_KEY_PRESSED = ev.shiftKey
    }

    getLineModelBuffer(row = null) {
        if (row === null)
            row = this.cursor.getLine()

        return this.lineModelBuffer.filter(line => line.index == row)[0] ?? null
    }

    deleteLineModelBuffer(line = null) {
        if (line === null)
            line = this.cursor.getLine()

        const lineModel = this.lineModelBuffer.get(line)

        if (!lineModel)
            return

        lineModel.remove()
        this.lineModelBuffer.delete(line)
    }

    getMaxRenderedBufferRow() {
        let hasChildren = this.DOM.editorElement.children.length > 0

        if (!hasChildren)
            return

        let max = this.DOM.editorElement.querySelector('.line:last-child').getAttribute('buffer-row')

        for (let index = 0; index < this.DOM.editorElement.children.length; index++) {
            const bufferRow = Number(this.DOM.editorElement.children[index].getAttribute('buffer-row'))

            if (bufferRow > max)
                max = bufferRow
        }

        return Number(max)
    }

    getMinRenderedBufferRow() {
        let hasChildren = this.DOM.editorElement.children.length > 0

        if (!hasChildren)
            return

        let min = this.DOM.editorElement.children[0].getAttribute('buffer-row')

        for (let index = 0; index < this.DOM.editorElement.children.length; index++) {
            const bufferRow = Number(this.DOM.editorElement.children[index].getAttribute('buffer-row'))

            if (bufferRow < min)
                min = bufferRow
        }

        return Number(min)
    }

    handleDeleteWithSelection() {
        const selectionStartRow = this.selection.getStart()[0]
        const selectionEndRow = this.selection.getEnd()[0]

        const selectionStartColumn = this.selection.getStart()[1]
        const selectionEndColumn = this.selection.getEnd()[1]

        if (selectionStartRow > selectionEndRow) {
            this.verticalScrollbar.scrollNowTo(this.getBufferLineToScreenY(selectionEndRow))

            this.deletedLinesIntervalBuffer = {
                amount: this.selection.buffer[1] - this.selection.buffer[0],
                start: this.selection.buffer[0],
                end: this.selection.buffer[1],
            }

            if (this.selection.isReversed()) {
                this.deletedLinesIntervalBuffer.start = this.selection.buffer[1]
                this.deletedLinesIntervalBuffer.end = this.selection.buffer[0]
            }

            this
                .renderContent()
                .then(() => {
                    this.getLineModelBuffer(selectionEndRow).setSelected()
                    this.selection = null
                })
        }

        if (selectionStartRow === selectionEndRow && (selectionStartColumn !== selectionEndColumn)) {
            if (selectionStartColumn < selectionEndColumn) {
                this.textBuffer[this.cursor.getLine()].splice(selectionStartColumn, selectionEndColumn - selectionStartColumn)
                this.getLineModelBuffer().update()
                this.cursor.setCol(selectionStartColumn)
            } else {
                this.textBuffer[this.cursor.getLine()].splice(selectionEndColumn, selectionStartColumn - selectionEndColumn)
                this.getLineModelBuffer().update()
                this.cursor.setCol(selectionEndColumn)
            }
        }

        if (selectionEndRow > selectionStartRow) {
            this.verticalScrollbar.scrollNowTo(this.getBufferLineToScreenY(selectionStartRow))

            this.deletedLinesIntervalBuffer = {
                amount: this.selection.buffer[1] - this.selection.buffer[0],
                start: this.selection.buffer[0],
                end: this.selection.buffer[1],
            }

            if (this.selection.isReversed()) {
                this.deletedLinesIntervalBuffer.start = this.selection.buffer[1]
                this.deletedLinesIntervalBuffer.end = this.selection.buffer[0]
            }

            this
                .renderContent()
                .then(() => {
                    this.getLineModelBuffer(selectionStartRow).setSelected()
                    this.selection = null
                })
        }

    }

    handleDelete() {
        if (this.selection.isCollapsed()) {
            if (this.cursor.getLine() === 0 && this.cursor.getCol() === 0) {
                return
            }

            if (this.cursor.getLine() > 0 && this.cursor.getCol() === 0) {
                const deletedLine = this.textBuffer.splice(this.cursor.getLine(), 1)[0]
                this.getLineModelBuffer().update()

                this.deleteLineModelBuffer()
                this.cursor.decrementLine()
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)

                this.textBuffer[this.cursor.getLine()] = this.textBuffer[this.cursor.getLine()].concat(deletedLine)

                this.getLineModelBuffer().update()
                this.decrementLineModelPositions()
                return
            }

            if (this.cursor.getCol() < this.textBuffer[this.cursor.getLine()].length) {
                this.textBuffer[this.cursor.getLine()].splice(this.cursor.getCol() - 1, 1)
                this.cursor.decrementCol()
                this.getLineModelBuffer().update()
            } else {
                this.textBuffer[this.cursor.getLine()].pop()
                this.cursor.decrementCol()
                this.getLineModelBuffer().update()
            }
        } else {
            this.handleDeleteWithSelection()
        }
    }

    insertLine() {
        const oldLine = this.getLineModelBuffer()
        const currentDataToConcat = this.textBuffer[this.cursor.getLine()].splice(this.cursor.getCol(), Infinity)
        oldLine.update()

        this.textBuffer.splice(this.cursor.getLine() + 1, 0, currentDataToConcat)


        const newLineBuffer = this.textBuffer[this.cursor.getLine() + 1]
        const newLineModel = new LineModel(newLineBuffer, this.cursor.getLine() + 1)

        this.incrementLineModelPositions()
        this.lineModelBuffer.push(newLineModel)

        this.cursor.incrementLine()
        this.cursor.setCol(0)
    }

    incrementLineModelPositions(indexToStart = null) {
        this.lineModelBuffer
            .filter(line => line.index > (indexToStart ?? this.cursor.getLine()))
            .forEach(line => {
                const newBufferRow = Number(line.element.getAttribute('buffer-row')) + 1
                line.index = newBufferRow

                line.element.setAttribute('buffer-row', newBufferRow)
                line.element.style.top = `${line.element.offsetTop + CatApp.LINE_HEIGHT}px`

                line.lineCountElement.style.top = `${line.lineCountElement.offsetTop + CatApp.LINE_HEIGHT}px`
                line.lineCountElement.innerText = line.index + 1
            })
    }

    decrementLineModelPositions(indexToStart = null) {
        this.lineModelBuffer
            .filter(line => line.index > (indexToStart ?? this.cursor.getLine()))
            .forEach(line => {
                const newBufferRow = Number(line.element.getAttribute('buffer-row')) - 1
                line.index = newBufferRow

                line.element.setAttribute('buffer-row', newBufferRow)
                line.element.style.top = `${line.element.offsetTop - CatApp.LINE_HEIGHT}px`

                line.lineCountElement.style.top = `${line.lineCountElement.offsetTop - CatApp.LINE_HEIGHT}px`
                line.lineCountElement.innerText = line.index + 1
            })
    }

    insertText(text) {

        // if has selection, replace all the selected text with the typed char
        // that is, delete the selected data (call handleDelete) and insert the char
        if (!this.selection.isCollapsed()) {
            this.handleDelete()
        }

        const newBuffer = this.parseText(text)

        newBuffer.forEach((line, index) => {

            this.textBuffer[this.cursor.getLine()].splice(this.cursor.getCol(), 0, ...line)
            this.cursor.setCol(this.cursor.getCol() + line.length)

            if (newBuffer[index + 1])
                this.insertLine()
            else
                this.getLineModelBuffer().update()

        })

        this.selection = null
    }

    isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 ||
            keyCode == 226 || keyCode === 33 ||
            keyCode === 16 || keyCode === 34 ||
            (keyCode > 64 && keyCode < 91) || // letter keys
            (keyCode > 95 && keyCode < 112) || // numpad keys
            (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
            (
                keyCode > 218 && keyCode < 223 &&
                keyCode !== 219 && keyCode !== 222
            ) // [\]' (in order)
    }

    getScreenYToBuffer(offsetY) {
        return Math.floor(offsetY / CatApp.LINE_HEIGHT)
    }

    getScreenXToBuffer(offsetX) {
        return Math.round(Math.abs(offsetX) / CatApp.getFontWidth())
    }

    getBufferLineToScreenY(lineIndex = null) {
        return Math.floor((lineIndex ?? this.cursor.getLine()) * CatApp.LINE_HEIGHT)
    }

    getBufferColumnToScreenX(columnIndex = null) {
        return Math.round((columnIndex ?? this.cursor.getCol()) * CatApp.getFontWidth())
    }

    scrollRightWhenCursorGetNextToRightEdge() {
        const pageWidth = this.DOM.textEditorContentWrapper.offsetWidth - this.editorLinesElement.offsetWidth + this.DOM.textEditorContentWrapper.scrollLeft
        const offsetToScroll = CatApp.getFontWidth() * 3
        const currentOffsetLeftCursorPos = this.getBufferColumnToScreenX(this.cursor.getCol())

        const hasScrollEnded = pageWidth >= this.DOM.textEditorContentWrapper.scrollWidth

        if (!hasScrollEnded && pageWidth - currentOffsetLeftCursorPos <= offsetToScroll) {
            this.DOM.textEditorContentWrapper.scroll({
                left: this.DOM.textEditorContentWrapper.scrollLeft + offsetToScroll
            })

            this.cursor.setCol(this.getScreenXToBuffer(this.DOM.textEditorContentWrapper.offsetWidth - this.editorLinesElement.offsetWidth + this.DOM.textEditorContentWrapper.scrollLeft - offsetToScroll))
        }
    }

    scrollLeftWhenCursorGetNextToLeftEdge() {
        const offsetToScroll = CatApp.getFontWidth() * 3
        const currentOffsetLeftCursorPos = this.getBufferColumnToScreenX(this.cursor.getCol())

        const hasScrollEnded = this.DOM.textEditorContentWrapper.scrollLeft <= 0

        if (!hasScrollEnded && currentOffsetLeftCursorPos - this.DOM.textEditorContentWrapper.scrollLeft <= offsetToScroll) {
            this.DOM.textEditorContentWrapper.scroll({
                left: this.DOM.textEditorContentWrapper.scrollLeft - offsetToScroll
            })

            this.cursor.setCol(this.getScreenXToBuffer(this.DOM.textEditorContentWrapper.scrollLeft + offsetToScroll))
        }
    }

    scrollDownWhenCursorGetNextToBottom() {
        const pageHeight = this.DOM.textEditorContentWrapper.offsetHeight + this.DOM.textEditorContentWrapper.scrollTop
        const offsetToScroll = CatApp.LINE_HEIGHT * 3
        const currentOffsetTopCursorPos = this.getBufferLineToScreenY(this.cursor.getLine())

        const hasScrollEnded = pageHeight >= this.DOM.textEditorContentWrapper.scrollHeight

        if (!hasScrollEnded && pageHeight - currentOffsetTopCursorPos <= offsetToScroll) {
            this.DOM.textEditorContentWrapper.scroll({
                top: this.DOM.textEditorContentWrapper.scrollTop + CatApp.LINE_HEIGHT
            })

            this.verticalScrollbar.updateThumb()
            this.verticalScrollbar.container.dispatchEvent(new Event('on-scroll'))

            this.cursor.setLine(this.getScreenYToBuffer(this.DOM.textEditorContentWrapper.offsetHeight + this.DOM.textEditorContentWrapper.scrollTop - offsetToScroll))

        }
    }

    scrollUpWhenCursorGetNextToTop() {
        const offsetToScroll = CatApp.LINE_HEIGHT * 3
        const currentOffsetTopCursorPos = this.getBufferLineToScreenY(this.cursor.getLine())

        const hasScrollEnded = this.DOM.textEditorContentWrapper.scrollTop <= 0

        if (!hasScrollEnded && currentOffsetTopCursorPos - this.DOM.textEditorContentWrapper.scrollTop <= offsetToScroll) {
            this.DOM.textEditorContentWrapper.scroll({
                top: this.DOM.textEditorContentWrapper.scrollTop - CatApp.LINE_HEIGHT
            })

            this.verticalScrollbar.updateThumb()
            this.verticalScrollbar.container.dispatchEvent(new Event('on-scroll'))

            this.cursor.setLine(this.getScreenYToBuffer(this.DOM.textEditorContentWrapper.scrollTop + offsetToScroll))

        }
    }

    async renderContent(start = null, end = null) {
        const { extraStart, extraEnd } = this.getExtraViewPortRange()

        if (!start)
            start = extraStart

        if (!end)
            end = extraEnd

        this.DOM.editorElement.innerHTML = ''
        this.DOM.editorLinesElement.innerHTML = ''
        this.lineModelBuffer.clear()

        const linesContent = await this.textBuffer.getLinesContentHighlighted()

        for (let lineIndex = start; lineIndex < end; lineIndex++) {
            const content = linesContent[lineIndex]
            // const content = this.textBuffer.getLineContent(lineIndex)

            const lineModel = new LineModel(this, content, lineIndex)

            this.lineModelBuffer.set(lineIndex, lineModel)
        }
    }

    getViewPortRange() {
        const firstLineOffset = Math.max(0, Math.floor(this.DOM.textEditorContentWrapper.scrollTop / CatApp.LINE_HEIGHT))
        const lastLineOffset = Math.min(this.textBuffer.lineCount - 1, Math.ceil((this.DOM.textEditorContentWrapper.offsetHeight + this.DOM.textEditorContentWrapper.scrollTop) / CatApp.LINE_HEIGHT))

        return { start: firstLineOffset, end: lastLineOffset }
    }

    getExtraViewPortRange() {
        const { start, end } = this.getViewPortRange()

        const extraStart = Math.max(0, start - this.EXTRA_BUFFER_ROW_OFFSET)
        const extraEnd = Math.min(this.textBuffer.lineCount - 1, end + this.EXTRA_BUFFER_ROW_OFFSET)

        return { extraStart, extraEnd }
    }

    parseText(text) {
        text = text.replace(/\r\n/g, '\n').replace(/\t/g, this.TAB_VALUE)
        const lines = text.split('\n')

        lines.forEach((line, i) => {
            lines[i] = line.split('')
        })

        return lines
    }

    renderPureText(buffer = null) {
        let text = '';

        (buffer ?? this.textBuffer).forEach(line => {
            text += `${line.join('')}\n`
        })

        return text
    }
}