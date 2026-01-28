import { CatApp } from "./cat-app";
import { ScrollBarVertical } from "./scrollbars/scrollbar-vertical";
import { ScrollBarHorizontal } from "./scrollbars/scrollbar-horizontal";
import { Cursor } from "./cursor";
import { LineModel } from "./line-model"
import { Selection } from "./selection";
import { TextEditor } from "./text-core";



export class DOMUI {
    /** @type {TextEditor} */
    textEditor = null

    emitter

    textEditorMainContainer = null
    textEditorContentWrapper = null
    textEditorContentContainer = null
    textEditorWrapper = null
    editorElement = null
    editorContainer = null
    editorLinesElement = null
    cursorElement = null
    absoluteInteractions = null
    selectionArea = null
    lineSelected = null
    textAreaToHandleKeyboard = null
    canEnterSelectionChange = true

    /** @type {Selection} */
    selection

    /** @type {Cursor} */
    cursor

    constructor(textEditor, emitter) {
        this.textEditor = textEditor
        this.emitter = emitter
    }

    delete() {
        this.textEditorMainContainer?.remove?.()
    }

    show() {
        CatApp.hideEditors()
        this.textEditorMainContainer?.classList?.remove?.('hidden')
    }

    hide() {
        this.textEditorMainContainer?.classList?.add?.('hidden')
    }

    update() {
        if (!this.textEditorMainContainer)
            return

        this.textEditorMainContainer.style.width = this.textEditorContentWrapper.style.width = `${window.innerWidth - Math.abs(this.textEditorContentWrapper.getBoundingClientRect().left)}px`
        this.textEditorMainContainer.style.height = this.textEditorContentWrapper.style.height = `${window.innerHeight - Math.abs(this.textEditorContentWrapper.getBoundingClientRect().top) - CatApp.getFooter().offsetHeight}px`
        this.textEditorContentContainer.style.height = `${Math.max(this.textEditor.textBuffer.lineCount * CatApp.LINE_HEIGHT, this.textEditorMainContainer.offsetHeight)}px`
        this.verticalScrollbar?.updateThumb?.()
        this.horizontalScrollBar?.updateThumb?.()
    }

    render() {
        const textEditorsArea = document.getElementById('text-editors')

        if (!textEditorsArea) {
            return
        }

        const currentEditor = textEditorsArea.querySelector(`[cat-text-editor="${this.id}"]`)

        if (currentEditor) {
            this.update()
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

        this.textEditorMainContainer = dom.querySelector('.text-editor-main-container')
        this.textEditorContentWrapper = dom.querySelector('.text-editor-content-wrapper')
        this.textEditorContentContainer = dom.querySelector('.text-editor-content-container')
        this.textEditorWrapper = dom.querySelector('.cat-text-editor-wrapper')

        this.textEditorMainContainer.setAttribute('cat-text-editor', this.id)

        this.absoluteInteractions = dom.querySelector('.absolute-interactions')
        this.lineSelected = dom.querySelector('.absolute-interactions .line-selected')
        this.selectionArea = dom.querySelector('.selections')
        this.editorElement = dom.querySelector('.text-editor-content')
        this.editorLinesElement = dom.querySelector('.text-editor-lines')

        this.lineSelected.style.width = `100%`

        this.cursor = new Cursor(this, this.emitter)
        this.selection = new Selection(this, this.emitter)

        textEditorsArea.appendChild(this.textEditorMainContainer)


        this.editorElement.style.width = `${2 * window.innerWidth}px`
        this.update()

        const textAreaToHandleKeyboard = document.createElement('textarea')
        textAreaToHandleKeyboard.className = 'input-handler'

        this.textAreaToHandleKeyboard = textAreaToHandleKeyboard
        this.absoluteInteractions.appendChild(textAreaToHandleKeyboard)


        this.verticalScrollbar = new ScrollBarVertical(this, this.emitter)
        this.horizontalScrollBar = new ScrollBarHorizontal(this, this.emitter)

        this.textEditorMainContainer.onmouseenter = () => {
            this.verticalScrollbar.showScrollbar()
            this.horizontalScrollBar.showScrollbar()
        }

        this.textEditorMainContainer.onmouseleave = () => {
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

        this.editorElement.addEventListener('click', () => {
            textAreaToHandleKeyboard.focus()
        })

        this.editorElement.addEventListener('focus', () => {
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

            if (!this.GetParentByClass(ev.target, this.editorElement.className))
                return

            const selection = document.getSelection()

            if (!selection.isCollapsed && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                const rect = range.getBoundingClientRect()

                let selectedTextLeftOffset = rect.left - this.editorElement.getBoundingClientRect().left + this.textEditorContentWrapper.scrollLeft
                let selectedTextRightOffset = rect.right - this.editorElement.getBoundingClientRect().left + this.textEditorContentWrapper.scrollLeft
                let selectedTextTopOffset = rect.top - this.textEditorContentWrapper.offsetTop + this.textEditorContentWrapper.scrollTop

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
                    const nextRowBufferPosBasedOnInitialPos = this.selection.getStart().line + 1

                    if (this.textEditor.textBuffer.getLineLength(nextRowBufferPosBasedOnInitialPos) !== null) {
                        this.setLine(nextRowBufferPosBasedOnInitialPos)
                        newOffsetX = 0 // first offset of the next line
                    } else {
                        // if its the last line, select the current line
                        newOffsetX = this.getBufferColumnToScreenX(Infinity)
                    }
                }

                this.setCol(this.getScreenXToBuffer(newOffsetX))

                this.selection.setEnd({
                    row: this.cursor.getLine(),
                    column: this.cursor.getCol()
                })
            }
        })

        this.editorElement.addEventListener('mouseup', () => {
            this.canEnterSelectionChange = true

            this.selection.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })

            this.editorElement.onmousemove = null
            this.cursor.resumeBlink()

            if (this.selection.isCollapsed())
                this.cursor.showLineSelectedPosition()

            console.log(this.textEditor.textBuffer.getBufferOffsetFromLineCol(this.cursor.getLine(), this.cursor.getCol()))
        })

        this.editorElement.addEventListener('mousedown', (ev) => {
            const getOffsetTopFromElement = (element) => {
                let selectedLine = this.getLineElementFrom(element)

                if (!selectedLine) {
                    selectedLine = this.editorElement.querySelector(`.line:last-child`)
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

            if (this.textEditor.IS_SHIFT_KEY_PRESSED) {
                this.canEnterSelectionChange = false

                this.selection.setEnd({
                    column: this.cursor.getCol(),
                    row: this.cursor.getLine()
                })
            }

            this.editorElement.onmousemove = (ev) => {
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

                this.cursor.hideLineSelectedPosition()
                CatApp.setCursorPositionInFooter()
            }

            this.cursor.stopBlink()
            CatApp.setCursorPositionInFooter()
        })

        const ROWS_GAP_TO_FETCH = 15
        let lastScrollTop = 0
        let isTicking = false
        let onVerticalScrollTimeoutHandler = null

        this.emitter.on("ScrollBarVertical:moved", () => {
            clearTimeout(onVerticalScrollTimeoutHandler)
            onVerticalScrollTimeoutHandler = setTimeout(() => {
                this.highlightContent()
            }, 500)
        })

        this.emitter.on("ScrollBarVertical:moved", () => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    const { start, end } = this.getViewPortRange()

                    const firstLineBufferRow = this.getMinRenderedBufferRow()
                    const lastLineBufferRow = this.getMaxRenderedBufferRow()
                    const firstSelectionBufferRow = this.selection.getMinRenderedBufferRow()
                    const lastSelectionBufferRow = this.selection.getMaxRenderedBufferRow()

                    if (this.textEditorContentWrapper.scrollTop < lastScrollTop) {
                        if (start - firstLineBufferRow <= ROWS_GAP_TO_FETCH) {

                            const { extraStart, extraEnd } = this.getExtraViewPortRange()

                            for (let index = Math.max(0, firstLineBufferRow); index >= extraStart; index--) {
                                if (this.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                const lineObject = this.textEditor.textBuffer.getLineContent(index)
                                const content = lineObject.content
                                const isHighlighted = lineObject.isHighlighted

                                const lineModel = new LineModel(content, index, !isHighlighted)
                                this.editorElement.appendChild(lineModel.lineElement)
                                this.editorLinesElement.appendChild(lineModel.lineCountElement)

                                this.textEditor.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = lastLineBufferRow; index > extraEnd; index--) {
                                this.textEditor.deleteLineModel(index)
                            }

                            for (let index = lastSelectionBufferRow; index > extraEnd; index--) {
                                const selectionDiv = this.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            this.selection.render()
                        }
                    }

                    if (this.textEditorContentWrapper.scrollTop > lastScrollTop) {
                        if (lastLineBufferRow - end <= ROWS_GAP_TO_FETCH) {
                            const lastLineOffsetInBuffer = this.textEditor.textBuffer.lineCount - 1
                            const { extraStart, extraEnd } = this.getExtraViewPortRange()

                            for (let index = Math.min(lastLineOffsetInBuffer, lastLineBufferRow); index <= extraEnd; index++) {
                                if (this.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                if (index > lastLineOffsetInBuffer)
                                    break

                                const lineObject = this.textEditor.textBuffer.getLineContent(index)
                                const content = lineObject.content
                                const isHighlighted = lineObject.isHighlighted

                                const lineModel = new LineModel(content, index, !isHighlighted)
                                this.editorElement.appendChild(lineModel.lineElement)
                                this.editorLinesElement.appendChild(lineModel.lineCountElement)

                                this.textEditor.lineModelBuffer.set(index, lineModel)
                            }

                            for (let index = firstLineBufferRow; index < extraStart; index++) {
                                this.textEditor.deleteLineModel(index)
                            }

                            for (let index = firstSelectionBufferRow; index < extraStart; index++) {
                                const selectionDiv = this.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            this.selection.render()
                        }
                    }

                    lastScrollTop = this.textEditorContentWrapper.scrollTop
                    isTicking = false
                })
            }

            isTicking = true
        })
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
        const pageWidth = this.textEditorContentWrapper.offsetWidth - this.editorLinesElement.offsetWidth + this.textEditorContentWrapper.scrollLeft
        const offsetToScroll = CatApp.getFontWidth() * 3
        const currentOffsetLeftCursorPos = this.getBufferColumnToScreenX(this.cursor.getCol())

        const hasScrollEnded = pageWidth >= this.textEditorContentWrapper.scrollWidth

        if (!hasScrollEnded && pageWidth - currentOffsetLeftCursorPos <= offsetToScroll) {
            this.textEditorContentWrapper.scroll({
                left: this.textEditorContentWrapper.scrollLeft + offsetToScroll
            })

            this.setCol(this.getScreenXToBuffer(this.textEditorContentWrapper.offsetWidth - this.editorLinesElement.offsetWidth + this.textEditorContentWrapper.scrollLeft - offsetToScroll))
        }
    }

    scrollLeftWhenCursorGetNextToLeftEdge() {
        const offsetToScroll = CatApp.getFontWidth() * 3
        const currentOffsetLeftCursorPos = this.getBufferColumnToScreenX(this.cursor.getCol())

        const hasScrollEnded = this.textEditorContentWrapper.scrollLeft <= 0

        if (!hasScrollEnded && currentOffsetLeftCursorPos - this.textEditorContentWrapper.scrollLeft <= offsetToScroll) {
            this.textEditorContentWrapper.scroll({
                left: this.textEditorContentWrapper.scrollLeft - offsetToScroll
            })

            this.setCol(this.getScreenXToBuffer(this.textEditorContentWrapper.scrollLeft + offsetToScroll))
        }
    }

    scrollDownWhenCursorGetNextToBottom() {
        const pageHeight = this.textEditorContentWrapper.offsetHeight + this.textEditorContentWrapper.scrollTop
        const offsetToScroll = CatApp.LINE_HEIGHT * 3
        const currentOffsetTopCursorPos = this.getBufferLineToScreenY(this.cursor.getLine())

        const hasScrollEnded = pageHeight >= this.textEditorContentWrapper.scrollHeight

        if (!hasScrollEnded && pageHeight - currentOffsetTopCursorPos <= offsetToScroll) {
            this.textEditorContentWrapper.scroll({
                top: this.textEditorContentWrapper.scrollTop + CatApp.LINE_HEIGHT
            })

            this.verticalScrollbar.updateThumb()
            this.emitter.emit("ScrollBarVertical:moved")
            this.setLine(this.getScreenYToBuffer(this.textEditorContentWrapper.offsetHeight + this.textEditorContentWrapper.scrollTop - offsetToScroll))

        }
    }

    scrollUpWhenCursorGetNextToTop() {
        const offsetToScroll = CatApp.LINE_HEIGHT * 3
        const currentOffsetTopCursorPos = this.getBufferLineToScreenY(this.cursor.getLine())

        const hasScrollEnded = this.textEditorContentWrapper.scrollTop <= 0

        if (!hasScrollEnded && currentOffsetTopCursorPos - this.textEditorContentWrapper.scrollTop <= offsetToScroll) {
            this.textEditorContentWrapper.scroll({
                top: this.textEditorContentWrapper.scrollTop - CatApp.LINE_HEIGHT
            })

            this.verticalScrollbar.updateThumb()
            this.emitter.emit("ScrollBarVertical:moved")
            this.setLine(this.getScreenYToBuffer(this.textEditorContentWrapper.scrollTop + offsetToScroll))

        }
    }

    setScreenCursorPositionToBuffer(offsetX, offsetY) {
        this.setLine(this.getScreenYToBuffer(offsetY))
        this.setCol(this.getScreenXToBuffer(offsetX))
    }

    setLine(line) {
        if (line > this.textEditor.textBuffer.lineCount) {
            return this.cursor.setLine(this.textEditor.textBuffer.lineCount)
        }
        if (line < 0) {
            return this.cursor.setLine(0)
        }

        this.cursor.setLine(line)
    }

    setCol(col) {
        const lineLength = this.textEditor.getLineModel(this.line).getContent().length

        if (col > lineLength) {
            return this.cursor.setCol(lineLength)
        }
        if (col < 0) {
            return this.cursor.setCol(0)
        }

        this.cursor.setCol(col)
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

    getViewPortRange() {
        const firstLineOffset = Math.max(0, Math.floor(this.textEditorContentWrapper.scrollTop / CatApp.LINE_HEIGHT))
        const lastLineOffset = Math.min(this.textEditor.textBuffer.lineCount, Math.ceil((this.textEditorContentWrapper.offsetHeight + this.textEditorContentWrapper.scrollTop) / CatApp.LINE_HEIGHT))

        return { start: firstLineOffset, end: lastLineOffset }
    }

    getExtraViewPortRange() {
        const { start, end } = this.getViewPortRange()

        const extraStart = Math.max(0, start - this.textEditor.EXTRA_BUFFER_ROW_OFFSET)
        const extraEnd = Math.min(this.textEditor.textBuffer.lineCount, end + this.textEditor.EXTRA_BUFFER_ROW_OFFSET)

        return { extraStart, extraEnd }
    }

    getMaxRenderedBufferRow() {
        let hasChildren = this.editorElement.children.length > 0

        if (!hasChildren)
            return

        let max = this.editorElement.querySelector('.line:last-child').getAttribute('buffer-row')

        for (let index = 0; index < this.editorElement.children.length; index++) {
            const bufferRow = Number(this.editorElement.children[index].getAttribute('buffer-row'))

            if (bufferRow > max)
                max = bufferRow
        }

        return Number(max)
    }

    getMinRenderedBufferRow() {
        let hasChildren = this.editorElement.children.length > 0

        if (!hasChildren)
            return

        let min = this.editorElement.children[0].getAttribute('buffer-row')

        for (let index = 0; index < this.editorElement.children.length; index++) {
            const bufferRow = Number(this.editorElement.children[index].getAttribute('buffer-row'))

            if (bufferRow < min)
                min = bufferRow
        }

        return Number(min)
    }

    async highlightContent() {
        const { extraStart, extraEnd } = this.getExtraViewPortRange()
        const lines = await this.textEditor.textBuffer.getLinesContentHighlighted(extraStart, extraEnd)

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const content = lines[lineIndex]
            const relativeLineIndex = extraStart + lineIndex
            let lineModel = this.textEditor.lineModelBuffer.get(relativeLineIndex)

            if (!lineModel) {
                lineModel = new LineModel(content, relativeLineIndex)
                this.editorElement.appendChild(lineModel.lineElement)
                this.editorLinesElement.appendChild(lineModel.lineCountElement)

                this.textEditor.lineModelBuffer.set(relativeLineIndex, lineModel)
            } else {
                lineModel.update(content, false)
            }
        }

        this.emitter.emit('TextEditor:highlighted-content-rendered', {
            start: extraStart,
            end: extraEnd
        })
    }
}