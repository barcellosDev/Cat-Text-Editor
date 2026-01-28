import { LineModel } from "./line-model"
import { PieceTable } from "./piece-table";
import { FileInfo } from "./file-info";
import { CatApp } from "./cat-app";
import { Emitter } from "@/utils/emitter";
import { DOMUI } from "./dom-ui";
import { SHIKI } from "./highlighter";

export class TextEditor {
    id = null
    TAB_VALUE = '\t'
    EXTRA_BUFFER_ROW_OFFSET = 30
    IS_SHIFT_KEY_PRESSED = false

    DEFAULT_EOL
    EOLRegexp

    TEMP_CursorBeforeInsert = null
    TEMP_CursorBeforeDelete = null

    currentLineintermediaryBuffer = null
    intermediaryBufferToInsertAtPiece = ''

    timeoutBatchDelete = null
    timeoutBatchInput = null
    timeoutBatchDeleteTimeInMS = 1000
    timeoutBatchInputTimeInMS = 500

    emitter = null

    /** @type {PieceTable} */
    textBuffer = null

    /** @type {FileInfo} */
    fileInfo = null

    lineModelBuffer = new Map()
    notPrint = {
        9: (ev) => { // tab
            //
        },
        16: (ev) => {
            this.IS_SHIFT_KEY_PRESSED = ev.shiftKey
        },
        33: (ev) => { // pageUp
            const newYOffset = Math.max(0, this.UI.textEditorContentWrapper.scrollTop - this.getBufferLineToScreenY(this.EXTRA_BUFFER_ROW_OFFSET))

            this.UI.textEditorContentWrapper.scroll({
                top: newYOffset
            })

            this.UI.verticalScrollbar.updateThumb()
            this.emitter.emit("ScrollBarVertical:moved")

            const newRowBuffer = this.getScreenYToBuffer(newYOffset)
            this.UI.setLine(newRowBuffer)

            const lineLength = this.textBuffer.getLineLength(this.UI.cursor.getLine())
            if (this.UI.cursor.getCol() > lineLength) {
                this.UI.setCol(lineLength)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            } else {

                this.UI.selection.setStart({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            }
        },
        34: (ev) => { // pageDown
            const newYOffset = Math.min(this.UI.textEditorContentWrapper.scrollHeight, this.UI.textEditorContentWrapper.scrollTop + this.getBufferLineToScreenY(this.EXTRA_BUFFER_ROW_OFFSET))

            this.UI.textEditorContentWrapper.scroll({
                top: newYOffset
            })

            this.UI.verticalScrollbar.updateThumb()
            this.emitter.emit("ScrollBarVertical:moved")

            const newRowBuffer = this.getScreenYToBuffer(newYOffset + this.UI.textEditorContentWrapper.offsetHeight - CatApp.LINE_HEIGHT)
            this.UI.setLine(newRowBuffer)

            const lineLength = this.textBuffer.getLineLength(this.UI.cursor.getLine())

            if (this.UI.cursor.getCol() > lineLength) {
                this.UI.setCol(lineLength)
                this.notPrint[35](ev)
            }

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            } else {

                this.UI.selection.setStart({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            }
        },
        37: (ev) => { // arrowLeft
            this.UI.cursor.decrementCol()

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            } else {

                this.UI.selection.setStart({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            }

            this.UI.scrollLeftWhenCursorGetNextToLeftEdge()
        },
        38: (ev) => { // arrowUp
            this.UI.cursor.decrementLine()

            const lineLength = this.textBuffer.getLineLength(this.UI.cursor.getLine())

            if (this.UI.cursor.getCol() > lineLength)
                this.UI.setCol(lineLength)

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            } else {

                this.UI.selection.setStart({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            }

            this.UI.scrollUpWhenCursorGetNextToTop()
        },
        39: (ev) => { // arrowRight
            this.UI.cursor.incrementCol()

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol(),
                    row: this.UI.cursor.getLine()
                })
            } else {

                this.UI.selection.setStart({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            }

            this.UI.scrollRightWhenCursorGetNextToRightEdge()
        },
        40: (ev) => { // arrowDown
            this.UI.cursor.incrementLine()

            const lineLength = this.textBuffer.getLineLength(this.UI.cursor.getLine())
            if (this.UI.cursor.getCol() > lineLength)
                this.UI.setCol(lineLength)

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            } else {

                this.UI.selection.setStart({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            }

            this.UI.scrollDownWhenCursorGetNextToBottom()
        },
        8: () => { // backspace
            this.handleDelete()
        },
        35: (ev) => { // end
            const lineLength = this.textBuffer.getLineLength(this.UI.cursor.getLine())
            this.UI.setCol(lineLength)

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol()
                })
            } else {

                this.UI.selection.setStart({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            }

            this.UI.textEditorContentWrapper.scroll({
                left: lineLength - this.UI.textEditorContentWrapper.offsetWidth + this.editorLinesElement.offsetWidth + CatApp.getFontWidth() * 3
            })
        },
        36: (ev) => { // home
            this.UI.setCol(0)

            if (ev.shiftKey) {
                this.UI.selection.setEnd({
                    column: this.UI.cursor.getCol()
                })
            } else {

                this.UI.selection.setStart({
                    row: this.UI.cursor.getLine(),
                    column: this.UI.cursor.getCol()
                })
            }

            this.UI.textEditorContentWrapper.scroll({
                left: 0
            })
        }
    }

    constructor(fileData = null) {
        let textBufferInstance
        let fileInfoInstance

        this.DEFAULT_EOL = window.electron.DEFAULT_SYSTEM_EOL
        this.EOLRegexp = new RegExp(this.DEFAULT_EOL, 'g')
        this.emitter = new Emitter()

        if (fileData) {
            this.DEFAULT_EOL = fileData.defaultEOL || window.electron.DEFAULT_SYSTEM_EOL
            this.EOLRegexp = new RegExp(fileData.defaultEOL, 'g')
            textBufferInstance = new PieceTable(this, fileData.buffer)
            fileInfoInstance = new FileInfo(fileData.name, fileData.path, fileData.extension)
            SHIKI.setExtension(fileData.extension)
        } else {
            textBufferInstance = new PieceTable(this)
            fileInfoInstance = new FileInfo()
        }

        console.log(this.DEFAULT_EOL)

        this.id = CatApp.editors.length + 1
        this.textBuffer = textBufferInstance
        this.fileInfo = fileInfoInstance
        this.UI = new DOMUI(this, this.emitter)
    }

    detectEOL(text) {
        const crlf = text.indexOf('\r\n')
        if (crlf !== -1) return '\r\n'
        return '\n'
    }

    normalizeEOL(text, eol = null) {
        if (eol === null)
            eol = this.DEFAULT_EOL

        return text.replace(/\r\n|\r|\n/g, eol)
    }

    show() {
        CatApp.hideEditors()
        CatApp.updateCurrentFilePath()
        this.UI.render()
        this.UI.show()
        this.UI.update()

        if (this.UI.editorElement && this.UI.editorElement.children.length === 0)
            this.renderContent()

        CatApp.setDefaultEOLInFooter()
        CatApp.setCursorPositionInFooter()
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

            range.setStartBefore(this.UI.editorElement.firstElementChild)
            range.setEndAfter(this.UI.editorElement.lastElementChild)

            selection.addRange(range)

            this.UI.selection.setStart({ row: 0, column: 0 })

            this.UI.setLine(Infinity)
            this.UI.setCol(Infinity)

            this.UI.selection.setEnd({
                row: this.UI.cursor.getLine(),
                column: this.UI.cursor.getCol()
            })
        }
    }

    handleInputKeyBoard(ev) {
        ev.preventDefault()

        const keyCode = ev.keyCode
        let char = ev.key

        console.log(keyCode, char)

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

        if (keyCode === 32) { // space
            char = ' '
        }

        if (keyCode === 13) { // enter
            char = this.DEFAULT_EOL
        }

        this.insertText(char)
    }

    handleReleaseKeyboard(ev) {
        this.IS_SHIFT_KEY_PRESSED = ev.shiftKey
    }

    getLineModel(line = null) {
        if (line === null)
            line = this.UI.cursor.getLine()

        return this.lineModelBuffer.get(line)
    }

    deleteLineModel(line = null) {
        if (line === null)
            line = this.UI.cursor.getLine()

        const lineModel = this.lineModelBuffer.get(line)

        if (!lineModel)
            return

        lineModel.remove()
        this.lineModelBuffer.delete(line)
    }

    handleDeleteWithSelection() {
        const selectionStartRow = this.UI.selection.getStart().line
        const selectionEndRow = this.UI.selection.getEnd().line

        const selectionStartColumn = this.UI.selection.getStart().col
        const selectionEndColumn = this.UI.selection.getEnd().col

        if (selectionStartRow > selectionEndRow) {
            this.UI.verticalScrollbar.scrollNowTo(this.getBufferLineToScreenY(selectionEndRow))

            if (this.UI.selection.isReversed()) {
                //
            }
        }

        if (selectionStartRow === selectionEndRow && (selectionStartColumn !== selectionEndColumn)) {
            if (selectionStartColumn < selectionEndColumn) {
                //
            } else {
                //
            }
        }

        if (selectionEndRow > selectionStartRow) {
            this.UI.verticalScrollbar.scrollNowTo(this.getBufferLineToScreenY(selectionStartRow))

            
        }
    }

    handleDelete() {
        if (this.UI.cursor.getLine() === 0 && this.UI.cursor.getCol() === 0)
            return

        if (!this.UI.selection.isCollapsed())
            return this.handleDeleteWithSelection()

        // set TEMP_CursorBeforeDelete if not already set so batch deletes work
        if (!this.TEMP_CursorBeforeDelete) {
            this.TEMP_CursorBeforeDelete = { line: this.UI.cursor.getLine(), col: this.UI.cursor.getCol() }
        }

        if (this.UI.cursor.getLine() > 0 && this.UI.cursor.getCol() === 0) {
            const deletedLine = this.getLineModel()

            this.deleteLineModel()
            this.decrementLineModelPositions()
            this.UI.cursor.decrementLine()
            
            const currentLineModel = this.getLineModel()
            
            currentLineModel.update(currentLineModel.getContent() + deletedLine.getContent(), true)
            this.UI.setCol(currentLineModel.getContent().length)
        }

        if (this.UI.cursor.getLine() > 0 && this.UI.cursor.getCol() > 0) {
            const currentLineModel = this.getLineModel()
            const currentLineContent = currentLineModel.getContent().split('')

            const lineContentAfterCursor = currentLineContent.splice(this.UI.cursor.getCol())

            currentLineContent.splice(this.UI.cursor.getCol() - 1, 1)
            currentLineModel.update(currentLineContent.join('') + lineContentAfterCursor.join(''), true)

            this.UI.cursor.decrementCol()
        }

        clearTimeout(this.timeoutBatchDelete)
        this.timeoutBatchDelete = setTimeout(() => {
            const currentDocumentOffset = this.textBuffer.getBufferOffsetFromLineCol(this.UI.cursor.getLine(), this.UI.cursor.getCol())
            const documentOffsetBeforeDelete = this.textBuffer.getBufferOffsetFromLineCol(this.TEMP_CursorBeforeDelete.line, this.TEMP_CursorBeforeDelete.col)

            this.textBuffer.delete(currentDocumentOffset, documentOffsetBeforeDelete - currentDocumentOffset)
            this.UI.highlightContent().then(() => this.updateDOM())
            this.TEMP_CursorBeforeDelete = null
        }, this.timeoutBatchDeleteTimeInMS)
    }

    incrementLineModelPositions(indexToStart = null, offset = 1) {
        for (let index = this.lineModelBuffer.size - 1; index > (indexToStart ?? this.UI.cursor.getLine()); index--) {
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
        for (let index = (indexToStart ?? this.UI.cursor.getLine()) + 1; index < this.lineModelBuffer.size; index++) {
            const lineModel = this.lineModelBuffer.get(index)
            const newBufferRow = Number(lineModel.lineElement.getAttribute('buffer-row')) - offset

            lineModel.lineElement.setAttribute('buffer-row', newBufferRow)
            lineModel.lineElement.style.top = `${lineModel.lineElement.offsetTop - CatApp.LINE_HEIGHT * offset}px`
            
            lineModel.lineCountElement.style.top = `${lineModel.lineCountElement.offsetTop - CatApp.LINE_HEIGHT * offset}px`
            lineModel.lineCountElement.innerText = (lineModel.index - offset) + 1
            
            this.lineModelBuffer.delete(index)
            this.lineModelBuffer.set(newBufferRow, lineModel)
        }
    }

    insertText(text) {
        text = this.normalizeEOL(text, this.DEFAULT_EOL)
        const textLineFeedCount = (text.match(this.EOLRegexp) || []).length

        // if has selection, replace all the selected text with the typed char
        // that is, delete the selected data (call handleDelete) and insert the char
        //if (!this.UI.selection.isCollapsed()) {
        //    this.handleDelete()
        //}

        this.intermediaryBufferToInsertAtPiece += text
        const lineBeforeInsert = this.UI.cursor.getLine()
        const columnBeforeInsert = this.UI.cursor.getCol()

        if (!this.TEMP_CursorBeforeInsert) {
            this.TEMP_CursorBeforeInsert = { line: lineBeforeInsert, col: columnBeforeInsert }
        }

        console.log(this.intermediaryBufferToInsertAtPiece)
        console.log(textLineFeedCount)

        // enter or copied many lines
        if (textLineFeedCount > 0) {
            const { extraStart, extraEnd } = this.UI.getExtraViewPortRange()
            let currentLineModel = this.getLineModel(lineBeforeInsert)
            let currentLineModelContent = currentLineModel.getContent().split('')
            const currentLineModelContentAfterCursor = currentLineModelContent.splice(columnBeforeInsert)

            if (lineBeforeInsert + textLineFeedCount > extraEnd) {
                // the lines inserted perpasses the extra range of the viewport
                const newScreenY = this.getBufferLineToScreenY(lineBeforeInsert + textLineFeedCount)
                this.UI.verticalScrollbar.scrollNowTo(newScreenY)

            } else {
                // lines inserted is inside the viewport
                // lines are in the beggining or the middle of the viewport
                // the viewport is small enough for us to do a .split operation, it will be fast and practical

                this.incrementLineModelPositions(lineBeforeInsert, textLineFeedCount)
                const arrayOfLines = text.split(this.DEFAULT_EOL)

                const firstLineContent = arrayOfLines[0]
                currentLineModelContent.splice(columnBeforeInsert, 0, firstLineContent)
                currentLineModel.update(currentLineModelContent.join('').replace(this.EOLRegexp, ''))

                for (let index = 1; index < arrayOfLines.length; index++) {
                    const content = arrayOfLines[index]
                    const newLineIndex = lineBeforeInsert + index
                    const lineModel = new LineModel(content, newLineIndex, true)
                    this.UI.editorElement.appendChild(lineModel.lineElement)
                    this.UI.editorLinesElement.appendChild(lineModel.lineCountElement)
                    this.lineModelBuffer.set(newLineIndex, lineModel)
                }
            }

            this.UI.setLine(lineBeforeInsert + textLineFeedCount)
            currentLineModel = this.getLineModel(this.UI.cursor.getLine())
            this.UI.setCol(currentLineModel.getContent().length)

            currentLineModel.update(currentLineModel.getContent() + currentLineModelContentAfterCursor.join(''))

        } else {
            const lineModel = this.getLineModel(lineBeforeInsert)

            if (this.currentLineintermediaryBuffer === null) {
                this.currentLineintermediaryBuffer = lineModel.getContent().split('')
            }

            this.currentLineintermediaryBuffer.splice(columnBeforeInsert, 0, text)
            lineModel.update(this.currentLineintermediaryBuffer.join(''))
            this.UI.setCol(columnBeforeInsert + text.length)
        }

        clearTimeout(this.timeoutBatchInput)

        if (this.intermediaryBufferToInsertAtPiece.length > 0) {
            this.timeoutBatchInput = setTimeout(() => {
                // TIMEOUT TO INSERT TEXT TO PIECE TABLE
                // THIS IS A BATCH TYPING METHOD
    
                console.log(this.intermediaryBufferToInsertAtPiece)
                console.log(this.currentLineintermediaryBuffer)
    
                const documentOffset = this.textBuffer.getBufferOffsetFromLineCol(this.TEMP_CursorBeforeInsert.line, this.TEMP_CursorBeforeInsert.col)
                console.log(documentOffset)
    
                this.textBuffer.insert(documentOffset, this.intermediaryBufferToInsertAtPiece)
    
                this.UI.highlightContent().then(() => this.updateDOM())
    
                this.intermediaryBufferToInsertAtPiece = ''
                this.currentLineintermediaryBuffer = null
                this.TEMP_CursorBeforeInsert = null
            }, this.timeoutBatchInputTimeInMS)
        }
    }

    isCharValid(keyCode) {
        return (keyCode > 47 && keyCode < 58) || // number keys
            this.notPrint[keyCode] ||
            keyCode == 32 || keyCode == 9 || keyCode == 13 || // space, tab, enter
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

    

    renderContent(start = null, end = null) {
        const { extraStart, extraEnd } = this.UI.getExtraViewPortRange()

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
                lineModel = new LineModel(content, lineIndex, !isHighlighted)
                this.UI.editorElement.appendChild(lineModel.lineElement)
                this.UI.editorLinesElement.appendChild(lineModel.lineCountElement)
                this.lineModelBuffer.set(lineIndex, lineModel)
            } else {
                lineModel.update(content, !isHighlighted)
            }
        }

        this.emitter.emit('TextEditor:content-rendered', {
            start: extraStart,
            end: extraEnd
        })
    }
}