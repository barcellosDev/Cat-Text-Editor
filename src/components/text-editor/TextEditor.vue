<script setup>

import { onMounted, onUnmounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { TextEditor } from './text-core.js'
import { useFilesStore } from '@/store/files';
import { useThemesStore } from '@/store/themes';
import { LineModel } from "./line-model"


const filesStore = useFilesStore()
const selectedFile = filesStore.getSelectedFile()
const themesStore = useThemesStore()


let textEditorMainContainer
let editor
let editorLines
let editorDomRect

var timeoutHandlerToSaveFileOnMemory
var canEnterSelectionChange = true

onMounted(() => {
    TextEditor.reset()

    textEditorMainContainer = document.getElementById('text-editor-main-container')
    editor = textEditorMainContainer.querySelector('[cat-text-editor]')
    editorLines = textEditorMainContainer.querySelector('#text-editor-lines')

    const cursor = document.querySelector('.cursor')
    cursor.style.height = `${TextEditor.LINE_HEIGHT}px`

    TextEditor.setEditorElement(editor)
    TextEditor.setEditorContainerElement(textEditorMainContainer)
    TextEditor.setEditorLinesElement(editorLines)
    TextEditor.setCursorElement(cursor)

    editor.onmouseup = (ev) => {
        editor.onmousemove = null
        canEnterSelectionChange = true

        TextEditor.setEndSelection({
            row: TextEditor.getRowCursorBufferPos(),
            column: TextEditor.getColumnCursorBufferPos()
        })

        // CODE TO HANDLE REVERSED SELECTIONS
        // REFACTOR TO A CLASS SELECTION WITH isReversed property
        if (
            TextEditor.selectionBuffer[0][0] > TextEditor.selectionBuffer[1][0] ||
            TextEditor.selectionBuffer[0][1] > TextEditor.selectionBuffer[1][1]
        ) {
            const selection = window.getSelection()
            const endBufferY = TextEditor.getScreenYToBuffer(getOffsetTopFromElement(ev.target))
            const startBufferX = TextEditor.getScreenXToBuffer(selection.anchorNode.parentElement.offsetLeft + (selection.anchorOffset * TextEditor.fontWidth))
            const endBufferX = TextEditor.getScreenXToBuffer(selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * TextEditor.fontWidth))

            TextEditor.setStartSelection({ column: startBufferX })
            TextEditor.setEndSelection({
                row: endBufferY,
                column: endBufferX
            })
        }
    }

    document.onselectionchange = () => {
        if (!canEnterSelectionChange)
            return

        const selection = document.getSelection()

        if (!selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            const selectedTextLeftOffset = rect.left - editorDomRect.left + textEditorMainContainer.scrollLeft
            const selectedTextRightOffset = rect.right - editorDomRect.left + textEditorMainContainer.scrollLeft

            TextEditor.setStartSelection({
                row: TextEditor.getRowCursorBufferPos(),
                column: Math.floor(selectedTextLeftOffset / TextEditor.fontWidth)
            })

            let newOffsetX = Math.floor(selectedTextRightOffset)

            if (range.endContainer?.classList?.contains('line')) {
                TextEditor.setRowBufferPos(TextEditor.getScreenYToBuffer(range.endContainer.offsetTop))
                newOffsetX = 0 // first offset of then next line
            }

            TextEditor.setColumnBufferPos(TextEditor.getScreenXToBuffer(newOffsetX))
            TextEditor.setEndSelection({
                row: TextEditor.getRowCursorBufferPos(),
                column: TextEditor.getColumnCursorBufferPos()
            })
            TextEditor.getLine().removeSelected()
        }

    }

    editor.onmousedown = (ev) => {

        let mouseOffsetX = ev.offsetX
        let lineOffsetY = getOffsetTopFromElement(ev.target)

        setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)

        TextEditor.setStartSelection({
            row: TextEditor.getRowCursorBufferPos(),
            column: TextEditor.getColumnCursorBufferPos()
        })

        const selection = window.getSelection()

        editor.onmousemove = (ev) => {
            canEnterSelectionChange = false

            if (!editor.contains(selection.focusNode)) {
                return
            }

            lineOffsetY = getOffsetTopFromElement(ev.target)

            if (!selection.focusNode?.classList?.contains('line')) {
                mouseOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * TextEditor.fontWidth)
            }

            setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)

            TextEditor.setEndSelection({
                row: TextEditor.getRowCursorBufferPos(),
                column: TextEditor.getColumnCursorBufferPos()
            })

            TextEditor.getLine().removeSelected()
        }

        filesStore.files[filesStore.selectedFileIndex].cursor = TextEditor.cursorBuffer.value
    }

    window.onkeydown = ev => {
        TextEditor.handleKeyBoard(ev)

        clearTimeout(timeoutHandlerToSaveFileOnMemory)
        timeoutHandlerToSaveFileOnMemory = setTimeout(() => {
            filesStore.files[filesStore.selectedFileIndex].text = TextEditor.renderPureText()
        }, 100)
    }



    let lastScrollTop = null

    textEditorMainContainer.onscroll = () => {
        window.requestAnimationFrame(() => {

            if (textEditorMainContainer.scrollTop === lastScrollTop)
                return

            const deadLineToLoadNewBuffer = ((textEditorMainContainer.scrollHeight - textEditorMainContainer.scrollTop) - textEditorMainContainer.offsetHeight) <= textEditorMainContainer.offsetHeight
            console.log(deadLineToLoadNewBuffer)

            TextEditor.renderContent()

            lastScrollTop = textEditorMainContainer.scrollTop
        })
    }

    window.addEventListener('resize', setMainEditorContainerHeight)
    window.addEventListener('resize', setEditorContainerWidth)
    window.addEventListener('ui-change', setEditorDomRect)

    if (selectedFile) { // has loaded file        
        TextEditor.textBuffer.value = TextEditor.parseText(selectedFile.text)

        document.getElementById('text-editor-content-container').style.height = `${TextEditor.textBuffer.value.length * TextEditor.LINE_HEIGHT}px`

        TextEditor.renderContent()
    }

    setEditorDomRect()
    setMainEditorContainerHeight()
    setEditorContainerWidth()
    setEditorWidth()
})

onUnmounted(() => {
    window.onkeydown = null
    window.removeEventListener('resize', setMainEditorContainerHeight)
    window.removeEventListener('resize', setEditorContainerWidth)
    window.removeEventListener('ui-change', setEditorDomRect)
})

function setEditorDomRect() {
    editorDomRect = editor.getBoundingClientRect()
}

function setEditorWidth() {
    editor.style.width = `calc(100% + ${textEditorMainContainer.scrollWidth}px)`
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
                <div class="cursor"></div>

                <div cat-text-editor id="text-editor-content">
                    <div class="line line-selected">
                        <span class="root"></span>
                    </div>
                </div>
            </div>
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
    background-color: #569cd64b;
}

.cursor {
    width: 2px;
    /* HAS TO BE ON SAME HEIGHT OF THE LINE */
    background-color: #cacaca;
    position: absolute;
}
</style>

<style>
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
