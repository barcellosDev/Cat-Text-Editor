import { LineModel } from "./line-model"
import { Selection } from "./selection";
import { PieceTable } from "./piece-table";
import { FileInfo } from "./file-info";
import { Cursor } from "./cursor";
import { CatApp } from "./cat-app";
import { ScrollBarVertical } from "./scrollbars/scrollbar-vertical";
import { ScrollBarHorizontal } from "./scrollbars/scrollbar-horizontal";
import { Emitter } from "@/utils/emitter";


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
        textAreaToHandleKeyboard: null,

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
    TAB_VALUE = '&nbsp;&nbsp;&nbsp;&nbsp;'
    EXTRA_BUFFER_ROW_OFFSET = 30
    IS_SHIFT_KEY_PRESSED = false
    deletedLinesIntervalBuffer = {}

    currentLineintermediaryBuffer = null
    intermediaryBufferToInsertAtPiece = ''
    timeoutBatchInput = null

    emitter = null

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
            this.emitter.emit("vertical-scroll")

            const newRowBuffer = this.getScreenYToBuffer(newYOffset)
            this.cursor.setLine(newRowBuffer)

            const lineLength = this.textBuffer.getLineLength(this.cursor.getLine())
            if (this.cursor.getCol() > lineLength) {
                this.cursor.setCol(lineLength)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {

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
            this.emitter.emit("vertical-scroll")

            const newRowBuffer = this.getScreenYToBuffer(newYOffset + this.DOM.textEditorContentWrapper.offsetHeight - CatApp.LINE_HEIGHT)
            this.cursor.setLine(newRowBuffer)

            const lineLength = this.textBuffer.getLineLength(this.cursor.getLine())

            if (this.cursor.getCol() > lineLength) {
                this.cursor.setCol(lineLength)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            } else {

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

                this.selection.setStart({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }

            this.scrollLeftWhenCursorGetNextToLeftEdge()
        },
        38: (ev) => { // arrowUp
            this.cursor.decrementLine()

            const lineLength = this.textBuffer.getLineLength(this.cursor.getLine())

            if (this.cursor.getCol() > lineLength)
                this.cursor.setCol(lineLength)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            } else {

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

                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.scrollRightWhenCursorGetNextToRightEdge()
        },
        40: (ev) => { // arrowDown
            this.cursor.incrementLine()

            const lineLength = this.textBuffer.getLineLength(this.cursor.getLine())
            if (this.cursor.getCol() > lineLength)
                this.cursor.setCol(lineLength)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            } else {

                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

            this.scrollDownWhenCursorGetNextToBottom()
        },
        8: () => { // backspace
            this.handleDelete()
        },
        35: (ev) => { // end
            const lineLength = this.textBuffer.getLineLength(this.cursor.getLine())
            this.cursor.setCol(lineLength)

            if (ev.shiftKey) {
                this.selection.setEnd({
                    column: this.cursor.getCol()
                })
            } else {

                this.selection.setStart({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }

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
        this.emitter = new Emitter()
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

        const textAreaToHandleKeyboard = document.createElement('textarea')
        textAreaToHandleKeyboard.className = 'input-handler'

        this.DOM.textAreaToHandleKeyboard = textAreaToHandleKeyboard
        this.DOM.absoluteInteractions.appendChild(textAreaToHandleKeyboard)


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
            this.cursor.tempLineBeforeInsert = this.cursor.getLine()
            this.cursor.tempColBeforeInsert = this.cursor.getCol()
        })

        this.DOM.editorElement.addEventListener('click', () => {
            textAreaToHandleKeyboard.focus()
        })

        this.DOM.editorElement.addEventListener('focus', () => {
            textAreaToHandleKeyboard.focus()
        })

        textAreaToHandleKeyboard.onkeyup = ev => {
            this.handleReleaseKeyboard(ev)
            textAreaToHandleKeyboard.value = ''
        }

        textAreaToHandleKeyboard.onkeydown = ev => {
            this.cursor.stopBlink()
            this.handleInputKeyBoard(ev)
            this.cursor.resumeBlink()
            textAreaToHandleKeyboard.value = ''
        }

        document.addEventListener('selectionchange', (ev) => {
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
                    column: Math.floor(selectedTextLeftOffset / CatApp.getFontWidth())
                })

                let newOffsetX = Math.floor(selectedTextRightOffset)

                if (range.endContainer?.classList?.contains('line')) {
                    const nextRowBufferPosBasedOnInitialPos = this.selection.getStart()[0] + 1

                    if (this.textBuffer.getLineLength(nextRowBufferPosBasedOnInitialPos) !== null) {
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
        })

        this.DOM.editorElement.addEventListener('mouseup', () => {
            this.canEnterSelectionChange = true

            this.selection.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })

            this.DOM.editorElement.onmousemove = null
            this.cursor.resumeBlink()
        })

        this.DOM.editorElement.addEventListener('mousedown', (ev) => {
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

            this.selection.clear()
            this.selection.setStart({
                column: this.cursor.getCol(),
                row: this.cursor.getLine()
            })

            if (this.IS_SHIFT_KEY_PRESSED) {
                this.canEnterSelectionChange = false

                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }

            this.DOM.editorElement.onmousemove = (ev) => {
                const selection = window.getSelection()
                this.canEnterSelectionChange = false

                lineOffsetY = getOffsetTopFromElement(ev.target)

                if (selection.focusNode && !selection.focusNode?.classList?.contains('line')) {
                    mouseOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * CatApp.getFontWidth())
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

            this.cursor.stopBlink()
            CatApp.setCursorPositionInFooter()
        })

        const ROWS_GAP_TO_FETCH = 15
        let lastScrollTop = 0
        let isTicking = false
        let onVerticalScrollTimeoutHandler = null

        this.emitter.on("vertical-scroll", () => {
            clearTimeout(onVerticalScrollTimeoutHandler)
            onVerticalScrollTimeoutHandler = setTimeout(() => {
                this.highlightContent()
            }, 500)
        })

        this.emitter.on("vertical-scroll", () => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    const { start, end } = this.getViewPortRange()

                    const firstLineBufferRow = this.getMinRenderedBufferRow()
                    const lastLineBufferRow = this.getMaxRenderedBufferRow()
                    const firstSelectionBufferRow = this.selection.getMinRenderedBufferRow()
                    const lastSelectionBufferRow = this.selection.getMaxRenderedBufferRow()

                    if (this.DOM.textEditorContentWrapper.scrollTop < lastScrollTop) {
                        if (start - firstLineBufferRow <= ROWS_GAP_TO_FETCH) {

                            const { extraStart, extraEnd } = this.getExtraViewPortRange()

                            for (let index = Math.max(0, firstLineBufferRow); index >= extraStart; index--) {
                                if (this.DOM.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                const lineObject = this.textBuffer.getLineContent(index)
                                const content = lineObject.content
                                const isHighlighted = lineObject.isHighlighted

                                const lineModel = new LineModel(this, content, index, !isHighlighted)
                                this.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = lastLineBufferRow; index > extraEnd; index--) {
                                this.deleteLineModel(index)
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

                                const lineObject = this.textBuffer.getLineContent(index)
                                const content = lineObject.content
                                const isHighlighted = lineObject.isHighlighted

                                const lineModel = new LineModel(this, content, index, !isHighlighted)
                                this.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = firstLineBufferRow; index < extraStart; index++) {
                                this.deleteLineModel(index)
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

    show() {
        CatApp.hideEditors()
        CatApp.updateCurrentFilePath()
        this.renderDOM()
        this.DOM.show()
        this.updateDOM()

        if (this.DOM.editorElement && this.DOM.editorElement.children.length === 0)
            this.renderContent()
    }

    controlActions(char) {
        if (char === 's') {
            //
        }

        if (char === 'c' || char === 'x') {
            const selectedData = window.getSelection().toString()
            navigator.clipboard.writeText(selectedData)

            if (char === 'x' && selectedData.length > 0)
                this.handleDelete()
        }

        if (char === 'v') {
            navigator.clipboard.readText().then(text => {
                this.insertText(text)
            })
        }

        if (char === 'a') {
            const selection = window.getSelection()
            const range = document.createRange()

            selection.removeAllRanges()

            range.setStartBefore(this.DOM.editorElement.firstElementChild)
            range.setEndAfter(this.DOM.editorElement.lastElementChild)

            selection.addRange(range)

            this.selection.setStart({ row: 0, column: 0 })

            this.cursor.setLine(Infinity)
            this.cursor.setCol(Infinity)

            this.selection.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })
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

            this.getLineModel().update()
            return
        }

        if (keyCode === 32) { // space
            char = ' '
        }

        this.insertText(char)
    }

    handleReleaseKeyboard(ev) {
        this.IS_SHIFT_KEY_PRESSED = ev.shiftKey
    }

    getLineModel(line = null) {
        if (line === null)
            line = this.cursor.getLine()

        return this.lineModelBuffer.get(line)
    }

    deleteLineModel(line = null) {
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

            this.renderContent()
        }

        if (selectionStartRow === selectionEndRow && (selectionStartColumn !== selectionEndColumn)) {
            if (selectionStartColumn < selectionEndColumn) {
                this.textBuffer[this.cursor.getLine()].splice(selectionStartColumn, selectionEndColumn - selectionStartColumn)
                this.getLineModel().update()
                this.cursor.setCol(selectionStartColumn)
            } else {
                this.textBuffer[this.cursor.getLine()].splice(selectionEndColumn, selectionStartColumn - selectionEndColumn)
                this.getLineModel().update()
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

            this.renderContent()
        }

    }

    handleDelete() {
        if (this.selection.isCollapsed()) {
            if (this.cursor.getLine() === 0 && this.cursor.getCol() === 0) {
                return
            }

            if (this.cursor.getLine() > 0 && this.cursor.getCol() === 0) {
                const deletedLine = this.textBuffer.splice(this.cursor.getLine(), 1)[0]
                this.getLineModel().update()

                this.deleteLineModel()
                this.cursor.decrementLine()
                this.cursor.setCol(this.textBuffer[this.cursor.getLine()].length)

                this.textBuffer[this.cursor.getLine()] = this.textBuffer[this.cursor.getLine()].concat(deletedLine)

                this.getLineModel().update()
                this.decrementLineModelPositions()
                return
            }

            if (this.cursor.getCol() < this.textBuffer[this.cursor.getLine()].length) {
                this.textBuffer[this.cursor.getLine()].splice(this.cursor.getCol() - 1, 1)
                this.cursor.decrementCol()
                this.getLineModel().update()
            } else {
                this.textBuffer[this.cursor.getLine()].pop()
                this.cursor.decrementCol()
                this.getLineModel().update()
            }
        } else {
            this.handleDeleteWithSelection()
        }
    }

    incrementLineModelPositions(indexToStart = null, offset = 1) {
        for (let index = this.lineModelBuffer.size - 1; index > (indexToStart ?? this.cursor.getLine()); index--) {
            const lineModel = this.lineModelBuffer.get(index)
            const newBufferRow = Number(lineModel.lineElement.getAttribute('buffer-row')) + offset

            this.lineModelBuffer.delete(index)

            lineModel.lineElement.setAttribute('buffer-row', newBufferRow)
            lineModel.lineElement.style.top = `${lineModel.lineElement.offsetTop + CatApp.LINE_HEIGHT * offset}px`

            lineModel.lineCountElement.style.top = `${lineModel.lineCountElement.offsetTop + CatApp.LINE_HEIGHT * offset}px`
            lineModel.lineCountElement.innerText = lineModel.index + 1 + offset

            this.lineModelBuffer.set(newBufferRow, lineModel)
        }
    }

    decrementLineModelPositions(indexToStart = null, offset = 1) {
        for (let index = (indexToStart ?? this.cursor.getLine()); index < this.lineModelBuffer.size; index++) {
            const lineModel = this.lineModelBuffer.get(index + 1)
            const newBufferRow = Number(lineModel.lineElement.getAttribute('buffer-row')) - offset

            this.lineModelBuffer.delete(index)

            lineModel.lineElement.setAttribute('buffer-row', newBufferRow)
            lineModel.lineElement.style.top = `${lineModel.lineElement.offsetTop - CatApp.LINE_HEIGHT * offset}px`

            lineModel.lineCountElement.style.top = `${lineModel.lineCountElement.offsetTop - CatApp.LINE_HEIGHT * offset}px`
            lineModel.lineCountElement.innerText = lineModel.index + 1 - offset

            this.lineModelBuffer.set(newBufferRow, lineModel)
        }
    }

    insertText(text) {
        // if has selection, replace all the selected text with the typed char
        // that is, delete the selected data (call handleDelete) and insert the char
        //if (!this.selection.isCollapsed()) {
        //    this.handleDelete()
        //}

        this.intermediaryBufferToInsertAtPiece += text
        const textLineFeedCount = (text.match(/\n|\r\n/g) || []).length
        const lineBeforeInsert = this.cursor.getLine()
        const columnBeforeInsert = this.cursor.getCol()

        // enter or copied many lines
        if (textLineFeedCount > 0) {
            const { extraStart, extraEnd } = this.getExtraViewPortRange()
            let currentLineModel = this.getLineModel(lineBeforeInsert)
            let currentLineModelContent = currentLineModel.getContent().split('')
            const currentLineModelContentAfterCursor = currentLineModelContent.splice(columnBeforeInsert)

            if (lineBeforeInsert + textLineFeedCount > extraEnd) {
                // the lines inserted perpasses the extra range of the viewport
                const newScreenY = this.getBufferLineToScreenY(lineBeforeInsert + textLineFeedCount)
                this.verticalScrollbar.scrollNowTo(newScreenY)

            } else {
                // lines inserted is inside the viewport
                // lines are in the beggining or the middle of the viewport
                // the viewport is small enough for us to do a .split operation, it will be fast and practical

                this.incrementLineModelPositions(lineBeforeInsert, textLineFeedCount)
                const arrayOfLines = text.split(/\r\n|\r|\n/)

                const firstLineContent = arrayOfLines[0]
                currentLineModelContent.splice(columnBeforeInsert, 0, firstLineContent)
                currentLineModel.update(currentLineModelContent.join('').replace(/\r\n|\r|\n/, ''))

                for (let index = 1; index < arrayOfLines.length; index++) {
                    const content = arrayOfLines[index]
                    const newLineIndex = lineBeforeInsert + index
                    const lineModel = new LineModel(this, content, newLineIndex, true)
                    this.lineModelBuffer.set(newLineIndex, lineModel)
                }
            }

            this.cursor.setLine(lineBeforeInsert + textLineFeedCount)
            currentLineModel = this.getLineModel(this.cursor.getLine())
            this.cursor.setCol(currentLineModel.getContent().length)

            currentLineModel.update(currentLineModel.getContent() + currentLineModelContentAfterCursor.join(''))

        } else {
            const lineModel = this.getLineModel(lineBeforeInsert)

            if (this.currentLineintermediaryBuffer === null) {
                this.currentLineintermediaryBuffer = lineModel.getContent().split('')
            }

            this.currentLineintermediaryBuffer.splice(columnBeforeInsert, 0, text)
            lineModel.update(this.currentLineintermediaryBuffer.join(''))
            this.cursor.setCol(columnBeforeInsert + text.length)
        }

        clearTimeout(this.timeoutBatchInput)
        this.timeoutBatchInput = setTimeout(() => {
            // TIMEOUT TO INSERT TEXT TO PIECE TABLE
            // THIS IS A BATCH TYPING METHOD

            console.log(this.intermediaryBufferToInsertAtPiece)
            console.log(this.currentLineintermediaryBuffer)

            const documentOffset = this.textBuffer.getLineColumnToBufferOffset(this.cursor.tempLineBeforeInsert, this.cursor.tempColBeforeInsert)
            console.log(documentOffset)

            this.textBuffer.insert(documentOffset, this.intermediaryBufferToInsertAtPiece)

            this.highlightContent().then(() => this.updateDOM())

            this.intermediaryBufferToInsertAtPiece = ''
            this.currentLineintermediaryBuffer = null
            this.cursor.tempLineBeforeInsert = this.cursor.getLine()
            this.cursor.tempColBeforeInsert = this.cursor.getCol()
        }, 500)
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
            this.emitter.emit("vertical-scroll")
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
            this.emitter.emit("vertical-scroll")
            this.cursor.setLine(this.getScreenYToBuffer(this.DOM.textEditorContentWrapper.scrollTop + offsetToScroll))

        }
    }

    renderContent(start = null, end = null) {
        const { extraStart, extraEnd } = this.getExtraViewPortRange()

        if (!start)
            start = extraStart

        if (!end)
            end = extraEnd

        for (let lineIndex = start; lineIndex < end; lineIndex++) {
            const lineObject = this.textBuffer.getLineContent(lineIndex)
            let lineModel = this.lineModelBuffer.get(lineIndex)

            const content = lineObject.content
            const isHighlighted = lineObject.isHighlighted

            if (!lineModel) {
                lineModel = new LineModel(this, content, lineIndex, !isHighlighted)
                this.lineModelBuffer.set(lineIndex, lineModel)
            } else {
                lineModel.update(content, !isHighlighted)
            }
        }

        this.emitter.emit('content-rendered', {
            start: extraStart,
            end: extraEnd
        })
    }

    async highlightContent() {
        const { extraStart, extraEnd } = this.getExtraViewPortRange()
        const lines = await this.textBuffer.getLinesContentHighlighted(extraStart, extraEnd)

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const content = lines[lineIndex]
            const relativeLineIndex = extraStart + lineIndex
            let lineModel = this.lineModelBuffer.get(relativeLineIndex)

            if (!lineModel) {
                lineModel = new LineModel(this, content, relativeLineIndex)
                this.lineModelBuffer.set(relativeLineIndex, lineModel)
            } else {
                lineModel.update(content, false)
            }
        }

        this.emitter.emit('highlighted-content-rendered', {
            start: extraStart,
            end: extraEnd
        })
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
}