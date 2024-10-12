<script setup>

import { onMounted, onUnmounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { TextEditor } from './text-core.js'
import { useFilesStore } from '@/store/files';
import { useThemesStore } from '@/store/themes';

const filesStore = useFilesStore()
const selectedFile = filesStore.getSelectedFile()

let textEditorMainContainer
let editor

var timeoutHandlerToSaveFileOnMemory
var canEnterSelectionChange = true

onMounted(async () => {
    const themesStore = useThemesStore()
    await themesStore.loadHighlighter()

    TextEditor.reset()

    editor = document.querySelector('[cat-text-editor]')

    const cursor = document.querySelector('.cursor')
    cursor.style.height = `${TextEditor.LINE_HEIGHT}px`

    const editorDomRect = editor.getBoundingClientRect()


    TextEditor.setEditorElement(editor)
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
            const selectedTextLeftOffset = rect.left - editorDomRect.left
            const selectedTextRightOffset = rect.right - editorDomRect.left

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

        textEditorMainContainer
            .querySelectorAll('#text-editor-lines, #text-editor-content')
            .forEach(el => el.style.height = `${textEditorMainContainer.scrollHeight}px`)
    }

    textEditorMainContainer = document.getElementById('text-editor-main-container')
    textEditorMainContainer.style.height = `calc(100% - ${textEditorMainContainer.offsetTop}px)`


    if (selectedFile) { // has loaded file        
        TextEditor.textBuffer.value = TextEditor.parseText(selectedFile.text)
        TextEditor.renderText()
    }
})

onUnmounted(() => {
    window.onkeydown = null
})

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
        <div id="text-editor-lines">
            <div :style="`line-height: ${TextEditor.LINE_HEIGHT}px`"
                v-for="(line, index) in TextEditor.textBuffer.value" :key="index" class="line-count"
                :class="{ 'line-count-selected': index === TextEditor.cursorBuffer.value[0] }">
                {{ index + 1 }}
            </div>
        </div>

        <div id="text-editor-content-container">
            <div class="cursor"></div>

            <div cat-text-editor id="text-editor-content">
                <div class="line line-selected">
                    <span class="root"></span>
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
    display: flex;
    overflow-y: auto;
}

#text-editor-content-container {
    position: relative;
    width: 100%;
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
    position: relative;
}

.line-count {
    color: grey;
    outline: 1px solid transparent;
}

.line-count-selected {
    color: inherit;
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
