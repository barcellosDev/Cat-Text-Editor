<script setup>

import { onMounted, onUnmounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { TextEditor } from './text-core.js'
import { useFilesStore } from '@/store/files';

const store = useFilesStore()
const selectedFile = store.getSelectedFile()

let textEditorMainContainer, cursor, editor
var timeoutHandlerToSaveFileOnMemory

onMounted(() => {
    TextEditor.reset()

    editor = document.querySelector('[cat-text-editor]')
    cursor = document.getElementById('cursor')

    TextEditor.setEditorElement(editor)
    TextEditor.setCursorElement(cursor)

    editor.onmouseup = () => {
        editor.onmousemove = null
        TextEditor.setEndSelection()
    }

    editor.onmousedown = (ev) => {
        setScreenCursorPositionToBuffer(ev)
        TextEditor.setStartSelection()

        if (ev.detail == 2) {
            TextEditor.setStartSelection(
                TextEditor.getRowCursorBufferPos(),
                Math.floor(ev.target.offsetLeft / TextEditor.fontWidth)
            )

            const newOffsetX = Math.ceil(ev.target.offsetLeft + ev.target.offsetWidth)
            setScreenXToBuffer(newOffsetX)

            TextEditor.setEndSelection()

            TextEditor.getLine().removeSelected()
        }

        if (ev.detail == 3) {
            TextEditor.setStartSelection(
                TextEditor.getRowCursorBufferPos(),
                0
            )

            if (TextEditor.textBuffer.value[TextEditor.getRowCursorBufferPos() + 1]) {
                TextEditor.incrementRowBufferPos()
                TextEditor.setColumnBufferPos(0)
            } else {
                TextEditor.setColumnBufferPos(Infinity)
            }

            TextEditor.setEndSelection()

            console.log(TextEditor.selectionBuffer)

            TextEditor.getLine().removeSelected()
        }

        editor.onmousemove = (ev) => {
            setScreenCursorPositionToBuffer(ev)

            const selection = window.getSelection()

            if (!selection.focusNode?.classList?.contains('line')) {
                const newOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * TextEditor.fontWidth)
                setScreenXToBuffer(newOffsetX)
                TextEditor.setEndSelection()
            }

            TextEditor.getLine().removeSelected()
        }

        store.files[store.selectedFileIndex].cursor = TextEditor.cursorBuffer.value
    }

    if (selectedFile) { // has loaded file        
        TextEditor.textBuffer.value = TextEditor.parseText(selectedFile.text)
        TextEditor.renderText()
    }

    window.onkeydown = ev => {
        TextEditor.handleKeyBoard(ev)

        clearTimeout(timeoutHandlerToSaveFileOnMemory)
        timeoutHandlerToSaveFileOnMemory = setTimeout(() => {
            store.files[store.selectedFileIndex].text = TextEditor.renderPureText()
        }, 100)

        textEditorMainContainer
            .querySelectorAll('#text-editor-lines, #text-editor-content')
            .forEach(el => el.style.height = `${textEditorMainContainer.scrollHeight}px`)
    }

    textEditorMainContainer = document.getElementById('text-editor-main-container')
    textEditorMainContainer.style.height = `calc(100% - ${textEditorMainContainer.offsetTop}px)`
})

onUnmounted(() => {
    window.onkeydown = null
})

function setScreenCursorPositionToBuffer(ev) {
    let selectedLine = getLineElementFrom(ev.target)

    if (!selectedLine) {
        selectedLine = editor.querySelector(`.line:last-child`)
    }

    setScreenYToBuffer(selectedLine)
    setScreenXToBuffer(ev.offsetX)
}

function setScreenYToBuffer(line) {
    const linePos = Math.floor(line.offsetTop / TextEditor.LINE_HEIGHT)
    TextEditor.setRowBufferPos(linePos)
}

function setScreenXToBuffer(offsetX) {
    const charPos = Math.round(Math.abs(offsetX) / TextEditor.fontWidth)

    TextEditor.setColumnBufferPos(charPos)
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
            <div v-for="(line, index) in TextEditor.textBuffer.value" :key="index" class="line-count"
                :class="{ 'line-count-selected': index === TextEditor.cursorBuffer.value[0] }">
                {{ index + 1 }}
            </div>
        </div>

        <div id="text-editor-content-container">
            <div id="cursor"></div>

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

#cursor {
    width: 2px;
    height: 19px;
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