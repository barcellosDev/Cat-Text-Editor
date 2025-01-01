<script setup>

import { onMounted, onUnmounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { TextEditor } from './text-core.js'
import { useFilesStore } from '@/store/files';
import { Selection } from "./selection";
import { LineModel } from "./line-model"

const filesStore = useFilesStore()

let textEditorMainContainer
let editor
let editorLines
let editorDomRect
let selectionsArea

var timeoutHandlerToSaveFileOnMemory
var canEnterSelectionChange = true

onMounted(() => {
    TextEditor.createHighLightCodeThreadInstance()

    selectionsArea = document.getElementById('selections')
    textEditorMainContainer = document.getElementById('text-editor-main-container')
    editor = textEditorMainContainer.querySelector('[cat-text-editor]')
    editorLines = textEditorMainContainer.querySelector('#text-editor-lines')

    const cursor = document.querySelector('.cursor')
    cursor.style.height = `${TextEditor.LINE_HEIGHT}px`

    TextEditor.setEditorElement(editor)
    TextEditor.setEditorContainerElement(textEditorMainContainer)
    TextEditor.setEditorLinesElement(editorLines)
    TextEditor.setCursorElement(cursor)

    Selection.setSelectionsAreaElement(selectionsArea)

    editor.onmouseup = (ev) => {
        editor.onmousemove = null
        canEnterSelectionChange = true

        Selection.setEnd({
            row: TextEditor.getRowCursorBufferPos(),
            column: TextEditor.getColumnCursorBufferPos()
        })

        TextEditor.getLineModelBuffer().setSelected()
    }

    document.onselectionchange = () => {
        if (!canEnterSelectionChange)
            return

        const selection = document.getSelection()

        if (!selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            let selectedTextLeftOffset = rect.left - editorDomRect.left + textEditorMainContainer.scrollLeft
            let selectedTextRightOffset = rect.right - editorDomRect.left + textEditorMainContainer.scrollLeft
            let selectedTextTopOffset = rect.top - textEditorMainContainer.offsetTop + textEditorMainContainer.scrollTop

            // in case of selecting an empty row (the rect.right/left returns 0 (as if the rect was on the initial edge of the div))
            if (selectedTextLeftOffset < 0)
                selectedTextLeftOffset = 0

            if (selectedTextRightOffset < 0)
                selectedTextRightOffset = 0

            if (rect.width === 0 && rect.top === 0)
                selectedTextTopOffset = getLineElementFrom(range.startContainer).offsetTop

            Selection.setStart({
                row: TextEditor.getScreenYToBuffer(selectedTextTopOffset),
                column: Math.floor(selectedTextLeftOffset / TextEditor.fontWidth)
            })

            let newOffsetX = Math.floor(selectedTextRightOffset)

            if (range.endContainer?.classList?.contains('line')) {
                const nextRowBufferPosBasedOnInitialPos = Selection.getStart()[0] + 1

                if (TextEditor.textBuffer[nextRowBufferPosBasedOnInitialPos]) {
                    TextEditor.setRowBufferPos(nextRowBufferPosBasedOnInitialPos)
                    newOffsetX = 0 // first offset of the next line
                } else {
                    // if its the last line, select the current line
                    newOffsetX = TextEditor.getBufferColumnToScreenX(Infinity)
                }
            }

            TextEditor.setColumnBufferPos(TextEditor.getScreenXToBuffer(newOffsetX))

            Selection.setEnd({
                row: TextEditor.getRowCursorBufferPos(),
                column: TextEditor.getColumnCursorBufferPos()
            })

            TextEditor.getLineModelBuffer().setSelected()
        }

    }

    editor.onmousedown = (ev) => {
        let mouseOffsetX = ev.offsetX
        let lineOffsetY = getOffsetTopFromElement(ev.target)

        setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)
        TextEditor.getLineModelBuffer().setSelected()

        if (TextEditor.IS_SHIFT_KEY_PRESSED) {
            canEnterSelectionChange = false

            Selection.setEnd({
                column: TextEditor.getColumnCursorBufferPos(),
                row: TextEditor.getRowCursorBufferPos()
            })
        } else {
            Selection.clear()
        }

        editor.onmousemove = (ev) => {
            const selection = window.getSelection()
            canEnterSelectionChange = false

            lineOffsetY = getOffsetTopFromElement(ev.target)

            if (selection.focusNode && !selection.focusNode?.classList?.contains('line')) {
                mouseOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * TextEditor.fontWidth)
            } else if (!selection.focusNode) {
                mouseOffsetX = ev.offsetX
            }

            setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)

            TextEditor.getLineModelBuffer().setSelected()

            Selection.setEnd({
                row: TextEditor.getRowCursorBufferPos(),
                column: TextEditor.getColumnCursorBufferPos()
            })
        }

        filesStore.files[filesStore.selectedFileIndex].cursor = TextEditor.cursorBuffer
    }

    window.onkeyup = ev => {
        TextEditor.handleReleaseKeyboard(ev)
    }

    window.onkeydown = ev => {
        TextEditor.handleInputKeyBoard(ev)

        clearTimeout(timeoutHandlerToSaveFileOnMemory)
        timeoutHandlerToSaveFileOnMemory = setTimeout(() => {
            if (filesStore.files[filesStore.selectedFileIndex].changed)
                filesStore.files[filesStore.selectedFileIndex].text = TextEditor.renderPureText()
        }, 100)
    }



    let lastScrollTop = 0
    let isTicking = false
    let lastExecutionTime = 0
    let scrollDebounceTimeout

    const throttleInterval = 30

    textEditorMainContainer.onscroll = () => {
        const now = Date.now()

        if (!isTicking) {
            window.requestAnimationFrame(() => {
                if (now - lastExecutionTime >= throttleInterval) {
                    const { start, end } = TextEditor.getViewPortRange()

                    const firstLineBufferRow = TextEditor.getMinRenderedBufferRow()
                    const lastLineBufferRow = TextEditor.getMaxRenderedBufferRow()

                    const firstSelectionBufferRow = Selection.getMinRenderedBufferRow()
                    const lastSelectionBufferRow = Selection.getMaxRenderedBufferRow()

                    if (textEditorMainContainer.scrollTop < lastScrollTop) {
                        if (start - firstLineBufferRow <= 5) {

                            const { extraStart, extraEnd } = TextEditor.getExtraViewPortRange()

                            for (let index = Math.max(0, firstLineBufferRow - 1); index >= extraStart; index--) {
                                if (editor.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                    const deletedLine = TextEditor.getDeletedLineInterval(index)
                                    console.log(deletedLine)

                                const row = TextEditor.textBuffer[index]
                                const Line = new LineModel(row, index)

                                Line.insertToDOM()
                                TextEditor.lineBuffer.push(Line)
                            }

                            for (let index = lastLineBufferRow; index > extraEnd; index--) {
                                TextEditor.deleteLineModelBuffer(index)
                            }

                            for (let index = lastSelectionBufferRow; index > extraEnd; index--) {
                                const selectionDiv = selectionsArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            Selection.render()
                        }
                    }

                    if (textEditorMainContainer.scrollTop > lastScrollTop) {
                        if (lastLineBufferRow - end <= 5) {

                            const { extraStart, extraEnd } = TextEditor.getExtraViewPortRange()

                            for (let index = Math.min(TextEditor.textBuffer.length, lastLineBufferRow + 1); index <= extraEnd; index++) {
                                if (editor.querySelector(`.line[buffer-row="${index}"]`))
                                    continue

                                    const deletedLine = TextEditor.getDeletedLineInterval(index)
                                    console.log(deletedLine)

                                const row = TextEditor.textBuffer[index]
                                const Line = new LineModel(row, index)

                                Line.insertToDOM()
                                TextEditor.lineBuffer.push(Line)
                            }


                            for (let index = firstLineBufferRow; index < extraStart; index++) {
                                TextEditor.deleteLineModelBuffer(index)
                            }

                            for (let index = firstSelectionBufferRow; index < extraStart; index++) {
                                const selectionDiv = selectionsArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                                if (selectionDiv)
                                    selectionDiv.remove()
                            }

                            Selection.render()
                        }
                    }

                    lastScrollTop = textEditorMainContainer.scrollTop
                    lastExecutionTime = now
                    
                    clearTimeout(scrollDebounceTimeout)
                    scrollDebounceTimeout = setTimeout(() => {
                        TextEditor.renderContent()
                        textEditorMainContainer.dispatchEvent(new Event('scroll-end'))
                    }, 200)
                }

                isTicking = false
            })

        }

        isTicking = true
    }

    window.addEventListener('resize', setMainEditorContainerHeight)
    window.addEventListener('resize', setEditorContainerWidth)
    window.addEventListener('ui-change', setEditorDomRect)
    window.addEventListener('tab-change', onTabChange)
    
    setEditorDomRect()
    setMainEditorContainerHeight()
    setEditorContainerWidth()
    setEditorWidth()
    onTabChange()
})

onUnmounted(() => {
    window.onkeydown = null
    document.onselectionchange = null

    window.removeEventListener('resize', setMainEditorContainerHeight)
    window.removeEventListener('resize', setEditorContainerWidth)
    window.removeEventListener('ui-change', setEditorDomRect)
    window.removeEventListener('tab-change', onTabChange)

    TextEditor.disposeHighLightThread()
})

function onTabChange() {
    const selectedFile = filesStore.getSelectedFile()

    if (!selectedFile)
        return

    TextEditor.reset()
    TextEditor.textBuffer = TextEditor.parseText(selectedFile.text)

    document.getElementById('text-editor-content-container').style.height = `${TextEditor.textBuffer.length * TextEditor.LINE_HEIGHT}px`

    TextEditor.renderContent()

    setEditorDomRect()
    setMainEditorContainerHeight()
    setEditorContainerWidth()
    setEditorWidth()
}

function setEditorDomRect() {
    editorDomRect = editor.getBoundingClientRect()
}

function setEditorWidth() {
    editor.style.width = `${2 * window.innerWidth}px`
}

function setEditorContainerWidth() {
    textEditorMainContainer.style.width = `${window.innerWidth - Math.abs(textEditorMainContainer.getBoundingClientRect().left)}px`
}

function setMainEditorContainerHeight() {
    textEditorMainContainer.style.height = `${window.innerHeight - Math.abs(textEditorMainContainer.getBoundingClientRect().top) - document.getElementById('app-footer').offsetHeight}px`
}

function setScreenCursorPositionToBuffer(offsetX, offsetY) {
    TextEditor.setRowBufferPos(TextEditor.getScreenYToBuffer(offsetY))
    TextEditor.setColumnBufferPos(TextEditor.getScreenXToBuffer(offsetX))
}

function getOffsetTopFromElement(element) {
    let selectedLine = getLineElementFrom(element)

    if (!selectedLine) {
        selectedLine = editor.querySelector(`.line:last-child`)
    }

    return selectedLine.offsetTop
}

function getLineElementFrom(element) {
    if (element.classList?.contains('line'))
        return element

    if (!element.parentElement)
        return null

    return getLineElementFrom(element.parentElement)
}

</script>

<template>
    <EditorTabs></EditorTabs>

    <div id="text-editor-main-container">
        <div id="text-editor-content-container">
            <div id="text-editor-lines">
            </div>

            <div id="cat-text-editor-wrapper">
                <div id="absolute-interactions">
                    <div id="cursors">
                        <div class="cursor"></div>
                    </div>
                    <div id="selections">

                    </div>
                </div>

                <div cat-text-editor id="text-editor-content">

                </div>
            </div>
        </div>

        <div id="scroll-area">
            <div id="minimap"></div>
            <div id="scrollbar"></div>
        </div>
    </div>
</template>

<style scoped>
#text-editor-main-container {
    color: whitesmoke;
    position: relative;
    height: 100%;
    overflow: scroll;
}

#text-editor-content-container {
    position: relative;
    width: 100%;
    display: flex;
}

#cat-text-editor-wrapper {
    position: relative;
    width: 100%
}


#text-editor-lines {
    position: relative;
    min-width: 60px;
    text-align: center;
    cursor: default;
}

#text-editor-content {
    position: relative;
    cursor: text;
    height: 100%;
}

#text-editor-content ::selection {
    background: none;
}

.cursor {
    width: 2px;
    /* HAS TO BE ON SAME HEIGHT OF THE LINE */
    background-color: #cacaca;
    position: absolute;
}
</style>

<style>
.selected-text {
    border-radius: 5px;
    background-color: #569cd64b;
    position: absolute;
}

.line-count,
.line {
    position: absolute;
    width: 100%;
}

.line-count {
    color: grey;
    outline: 1px solid transparent;
}

.line-count-selected {
    color: whitesmoke;
}

.line {
    white-space: pre;
}

.root {
    margin-right: 10px;
}

.line-selected {
    outline: 1px solid #404040;
}
</style>
