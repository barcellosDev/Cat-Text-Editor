<script setup>

import { onMounted } from 'vue';
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

    textEditorMainContainer = document.getElementById('text-editor-main-container')
    textEditorMainContainer.style.height = `calc(100% - ${textEditorMainContainer.offsetTop}px)`


    if (selectedFile) { // has loaded file
        TextEditor.textBuffer.value = TextEditor.parseText(selectedFile.text)
        TextEditor.renderText()
    }
})


window.onkeydown = ev => {
    TextEditor.handleKeyBoard(ev)

    clearTimeout(timeoutHandlerToSaveFileOnMemory)
    timeoutHandlerToSaveFileOnMemory = setTimeout(() => {
        store.files[store.selectedFileIndex].text = editor.innerText
    }, 1000)

    textEditorMainContainer
        .querySelectorAll('#text-editor-lines, #text-editor-content')
        .forEach(el => el.style.height = `${textEditorMainContainer.scrollHeight}px`)
}

function setScreenCursorPos(ev) {
    let selectedLine = ev.path.filter(elem => elem?.classList?.contains('line'))[0] ?? null

    if (!selectedLine) {
        selectedLine = editor.querySelector(`.line:last-child`)
    }

    TextEditor.setRowBufferPos(selectedLine.bufferY)

    const charPos = Math.round(Math.abs(ev.offsetX) / TextEditor.fontWidth)

    TextEditor.setColumnBufferPos(charPos)

    const y = selectedLine.bufferY * TextEditor.LINE_HEIGHT
    let x = charPos * TextEditor.fontWidth

    if (x > selectedLine.firstElementChild.offsetWidth)
        x = selectedLine.firstElementChild.offsetWidth

    cursor.style.top = `${y}px`
    cursor.style.left = `${x}px`
}

</script>

<template>
    <EditorTabs></EditorTabs>

    <div id="text-editor-main-container">
        <div id="text-editor-lines">
            <div v-for="(line, index) in TextEditor.textBuffer.value" :key="index" class="line-count"
                :class="{ 'line-count-selected': index === TextEditor.cursorBuffer.value[0]}">
                {{ index + 1 }}
            </div>
        </div>

        <div id="text-editor-content-container">
            <div id="cursor"></div>

            <div cat-text-editor id="text-editor-content" @mouseup="setScreenCursorPos($event)">
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
    width: 100%;
}
</style>

<style>
#cursor {
    width: 2px;
    height: 23px;
    /* HAS TO BE ON SAME HEIGHT OF THE LINE */
    background-color: #cacaca;
    position: absolute;
    animation: cursor-blink 1s linear infinite;
}

@keyframes cursor-blink {
    0% {
        visibility: hidden;
    }

    100% {
        visibility: visible;
    }
}


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