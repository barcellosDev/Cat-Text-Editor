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

    editor.onmouseup = (ev) => {
        setScreenCursorPos(ev)

        TextEditor.selectionBuffer[1] = [TextEditor.getRowCursorBufferPos(), TextEditor.getColumnCursorBufferPos()]

        editor.onmousemove = null
    }

    editor.onmousedown = (ev) => {
        setScreenCursorPos(ev)

        TextEditor.selectionBuffer[0] = [TextEditor.getRowCursorBufferPos(), TextEditor.getColumnCursorBufferPos()]

        editor.onmousemove = (ev) => {
            setScreenCursorPos(ev)
            TextEditor.selectionBuffer[1] = [TextEditor.getRowCursorBufferPos(), TextEditor.getColumnCursorBufferPos()]
        }
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
    editor.onmousedown = null
    editor.onmouseup = null
    editor.onmousemove = null
})

function setScreenCursorPos(ev) {
    let selectedLine = getLineElementFrom(ev.target)

    if (!selectedLine) {
        selectedLine = editor.querySelector(`.line:last-child`)
    }

    const linePos = Math.floor(selectedLine.offsetTop / TextEditor.LINE_HEIGHT)
    TextEditor.setRowBufferPos(linePos)

    const offsetX = ev.offsetX > selectedLine.firstElementChild.offsetWidth ? selectedLine.firstElementChild.offsetWidth : Math.abs(ev.offsetX)
    const charPos = Math.round(offsetX / TextEditor.fontWidth)
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
    height: 23px;
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
    border: 2px solid transparent;
}

.line-count-selected {
    color: inherit;
}

.line {
    border: 2px solid transparent;
    border-left: 0.5px solid transparent;
    white-space: pre;
}

.root {
    margin-right: 10px;
}

.line-selected .root {
    border-top: 2px solid #404040;
    border-bottom: 2px solid #404040;
}

.line-selected {
    border-top: 2px solid #404040;
    border-bottom: 2px solid #404040;
    border-left: 0.5px solid #404040;
}
</style>