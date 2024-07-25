<script setup>

import { onMounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { handleKeyBoard, highlightText, textMatrix, cursorPos, parseText, renderText } from './text-core.js'
import { useFilesStore } from '@/store/files';

const store = useFilesStore()
const selectedFile = store.getSelectedFile()

let textEditorMainContainer

onMounted(() => {
    textEditorMainContainer = document.getElementById('text-editor-main-container')
    textEditorMainContainer.style.height = `calc(100% - ${textEditorMainContainer.offsetTop}px)`

    reset()

    if (selectedFile) { // has loaded file
        textMatrix.value = parseText(selectedFile.text)
        window['text-editor-content'].innerHTML = highlightText()
    }
})

function reset() {
    textMatrix.value = [[]]
    cursorPos.value = [0, 0]
}


window.onkeydown = ev => {
    handleKeyBoard(ev)
    window['text-editor-content'].innerHTML = highlightText()

    textEditorMainContainer
        .querySelectorAll('#text-editor-lines, #text-editor-content')
        .forEach(el => el.style.height = `${textEditorMainContainer.scrollHeight}px`)
}

</script>

<template>
    <EditorTabs></EditorTabs>

    <div id="text-editor-main-container">
        <div id="text-editor-lines">
            <div class="line-count" :class="{'line-count-selected': index == cursorPos[0]}" v-for="(line, index) in textMatrix" :key="index">
                {{ index+1 }}
            </div>
        </div>

        <div id="text-editor-content">
            <div class="line line-selected">
                <span class="root"></span>
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
    height: 100%;
    background-color: #cacaca;
    display: inline-block;
    position: absolute;
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