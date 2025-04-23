<script setup>

import { onMounted, onUnmounted } from 'vue';
import { CatApp } from './cat-app';
import EditorTabs from '@/components/EditorTabs.vue';

onMounted(async () => {
    CatApp.createHighLightCodeThread()

    console.log(CatApp.editors)

    // window.onkeyup = ev => {
    //     activeEditor.handleReleaseKeyboard(ev)
    // }

    // window.onkeydown = ev => {
    //     activeEditor.handleInputKeyBoard(ev)
    // }

    window.addEventListener('resize', onResize)
})

onUnmounted(() => {
    window.onkeydown = null
    document.onselectionchange = null

    window.removeEventListener('resize', onResize)
    CatApp.disposeHighLightThread()
})

function onResize() {
    CatApp.editors.forEach(editor => editor.updateDOM())
}
</script>

<template>
    <EditorTabs></EditorTabs>
    <div id="text-editors"></div>
</template>

<style>
.text-editor-main-container {
    color: whitesmoke;
    position: relative;
    height: 100%;
}

.text-editor-content-container {
    width: 100%;
    height: 100%;
    display: flex;
}

.text-editor-content-wrapper {
    width: 100%;
    height: 100%;
    overflow: scroll;
}

#text-editors ::-webkit-scrollbar {
    display: none;
}

.cat-text-editor-wrapper {
    position: relative;
}


.text-editor-lines {
    position: relative;
    min-width: 60px;
    text-align: center;
    cursor: default;
}

.text-editor-content {
    position: relative;
    cursor: text;
    height: 100%;
}

.text-editor-content ::selection {
    background: none;
}

.minimap {
    height: 100%;
    width: 100px;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
}

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

.line-selected {
    outline: 1px solid #404040;
    position: absolute;
}



/*
    CURSOR BLINK BEHAVIOUR
*/
.blink-cursor {
    animation: blink-cursor 1s step-start infinite;
}

@keyframes blink-cursor {
    50% {
        opacity: 0;
    }
}







/*
    VERTICAL SCROLLBAR SECTION
*/
.custom-scrollbar[vertical] {
    position: absolute;
    overflow: hidden;
    width: 10px;
    height: 100%;
    padding-left: 30px;
    top: 0;
    right: 0;
}

.custom-scrollbar-track[vertical] {
    position: absolute;
    top: 0;
    right: 0;
    width: 10px;
    height: 100%;
}

.custom-scrollbar-thumb[vertical] {
    position: absolute;
    width: 100%;
    cursor: pointer;
}

.custom-scrollbar-thumb[vertical]:hover {
    background: #c1c1c1;
}

/*
    HORIZONTAL SCROLLBAR SECTION
*/
.custom-scrollbar[horizontal] {
    position: absolute;
    overflow: hidden;
    width: 100%;
    height: 10px;
    bottom: 0;
    left: 0;
}

.custom-scrollbar-track[horizontal] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.custom-scrollbar-thumb[horizontal] {
    position: absolute;
    height: 100%;
    cursor: pointer;
}

.custom-scrollbar-thumb[horizontal]:hover {
    background: #c1c1c1;
}

/* Add transition and default hidden */
.custom-scrollbar[horizontal],
.custom-scrollbar[vertical] {
    opacity: 0;
    transition: opacity 0.3s ease;
}

/* Visible scrollbar */
.custom-scrollbar-visible {
    opacity: 1 !important;
}
</style>
