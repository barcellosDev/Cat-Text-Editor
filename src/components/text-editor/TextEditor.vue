<script setup>

import { onMounted, onUnmounted } from 'vue';
import EditorTabs from '../EditorTabs.vue';
import { TextEditor } from './text-core.js'
import { useFilesStore } from '@/store/files';
import { Selection } from "./selection";
import { LineModel } from "./line-model"



const filesStore = useFilesStore()
const selectedFile = filesStore.getSelectedFile()

let textEditorMainContainer
let editor
let editorLines
let editorDomRect
let selectionsArea

var timeoutHandlerToSaveFileOnMemory
var canEnterSelectionChange = true

onMounted(() => {

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
            const selectedTextLeftOffset = rect.left - editorDomRect.left + textEditorMainContainer.scrollLeft
            const selectedTextRightOffset = rect.right - editorDomRect.left + textEditorMainContainer.scrollLeft

            Selection.setStart({
                row: TextEditor.getScreenYToBuffer(rect.top - editorDomRect.top + textEditorMainContainer.scrollTop),
                column: Math.floor(selectedTextLeftOffset / TextEditor.fontWidth)
            })

            let newOffsetX = Math.floor(selectedTextRightOffset)

            if (range.endContainer?.classList?.contains('line')) {
                TextEditor.setRowBufferPos(TextEditor.getScreenYToBuffer(range.endContainer.offsetTop))
                newOffsetX = 0 // first offset of the next line
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
        Selection.clear()

        let mouseOffsetX = ev.offsetX
        let lineOffsetY = getOffsetTopFromElement(ev.target)

        setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)

        TextEditor.getLineModelBuffer().setSelected()

        Selection.setStart({
            row: TextEditor.getRowCursorBufferPos(),
            column: TextEditor.getColumnCursorBufferPos()
        })


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

        filesStore.files[filesStore.selectedFileIndex].cursor = TextEditor.cursorBuffer.value
    }

    window.onkeydown = ev => {
        TextEditor.handleKeyBoard(ev)

        clearTimeout(timeoutHandlerToSaveFileOnMemory)
        timeoutHandlerToSaveFileOnMemory = setTimeout(() => {
            filesStore.files[filesStore.selectedFileIndex].text = TextEditor.renderPureText()
        }, 100)
    }



    let lastScrollTop = 0
    let isRendering = false

    textEditorMainContainer.onscroll = () => {

        if (!isRendering) {
            window.requestAnimationFrame(() => {
                if (textEditorMainContainer.scrollTop === lastScrollTop)
                    return
    
                const deadLineToLoadNewBuffer = ((textEditorMainContainer.scrollHeight - textEditorMainContainer.scrollTop) - textEditorMainContainer.offsetHeight) <= textEditorMainContainer.offsetHeight
                const { start, end } = TextEditor.getViewPortRange()
    
                if (textEditorMainContainer.scrollTop < lastScrollTop) {
                    if (!editor.querySelector(`.line[buffer-row="${start}"]`)) {
                        const firstLineElement = editor.querySelector(`.line:first-child`)
                        const firstLineModel = TextEditor.getLineModelBuffer(firstLineElement.getAttribute('buffer-row'))
    
                        const row = TextEditor.textBuffer.value[start]
                        const Line = new LineModel(row, start)
    
                        Line.insertBefore(firstLineModel)
                        TextEditor.lineBuffer.push(Line)
                    }
    
                    const lastLineVp = editor.querySelector(`.line[buffer-row="${end}"]`)
    
                    if (lastLineVp) {
                        TextEditor.deleteLineModelBuffer(end)
                    }
                }
    
                if (textEditorMainContainer.scrollTop > lastScrollTop) {
                    if (!editor.querySelector(`.line[buffer-row="${end}"]`)) {
                        const lastLineElement = editor.querySelector(`.line:last-child`)
                        const lastLineModel = TextEditor.getLineModelBuffer(lastLineElement.getAttribute('buffer-row'))
                        
                        const row = TextEditor.textBuffer.value[end]
                        const Line = new LineModel(row, end)
    
                        Line.insertAfter(lastLineModel)
                        TextEditor.lineBuffer.push(Line)
                    }
    
                    const firstVpLine = editor.querySelector(`.line[buffer-row="${start}"]`)
    
                    if (firstVpLine) {
                        TextEditor.deleteLineModelBuffer(start)
                    }
                }
    
                lastScrollTop = textEditorMainContainer.scrollTop
                isRendering = false
            })

        }

        isRendering = true
    }

    window.addEventListener('resize', setMainEditorContainerHeight)
    window.addEventListener('resize', setEditorContainerWidth)
    window.addEventListener('ui-change', setEditorDomRect)

    TextEditor.reset()

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
