<script setup>

import { onMounted, onUnmounted } from 'vue';
import { Selection } from "./selection";
import { LineModel } from "./line-model"
import { CatApp } from './cat-app';
import EditorTabs from '@/components/EditorTabs.vue';

var canEnterSelectionChange = true

onMounted(async () => {
    CatApp.createHighLightCodeThread()
    const activeEditor = CatApp.activeEditor

    console.log(activeEditor)
    console.log(CatApp.editors)

    await activeEditor.renderDOM()
    const selectionInstance = new Selection(activeEditor)

    activeEditor.onSelectionChange(function () {
        if (!canEnterSelectionChange)
            return

        const selection = document.getSelection()

        if (!selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            let selectedTextLeftOffset = rect.left - activeEditor.DOM.editorElement.getBoundingClientRect().left + activeEditor.DOM.textEditorContentWrapper.scrollLeft
            let selectedTextRightOffset = rect.right - activeEditor.DOM.editorElement.getBoundingClientRect().left + activeEditor.DOM.textEditorContentWrapper.scrollLeft
            let selectedTextTopOffset = rect.top - activeEditor.DOM.textEditorContentWrapper.offsetTop + activeEditor.DOM.textEditorContentWrapper.scrollTop

            // in case of selecting an empty row (the rect.right/left returns 0 (as if the rect was on the initial edge of the div))
            if (selectedTextLeftOffset < 0)
                selectedTextLeftOffset = 0

            if (selectedTextRightOffset < 0)
                selectedTextRightOffset = 0

            if (rect.width === 0 && rect.top === 0)
                selectedTextTopOffset = getLineElementFrom(range.startContainer).offsetTop

            selectionInstance.setStart({
                row: this.getScreenYToBuffer(selectedTextTopOffset),
                column: Math.floor(selectedTextLeftOffset / this.getFontWidth())
            })

            let newOffsetX = Math.floor(selectedTextRightOffset)

            if (range.endContainer?.classList?.contains('line')) {
                const nextRowBufferPosBasedOnInitialPos = selectionInstance.getStart()[0] + 1

                if (this.textBuffer[nextRowBufferPosBasedOnInitialPos]) {
                    this.cursor.setLine(nextRowBufferPosBasedOnInitialPos)
                    newOffsetX = 0 // first offset of the next line
                } else {
                    // if its the last line, select the current line
                    newOffsetX = this.getBufferColumnToScreenX(Infinity)
                }
            }

            this.cursor.setCol(this.getScreenXToBuffer(newOffsetX))

            selectionInstance.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })

            activeEditor.selection = selectionInstance


        }
    })

    activeEditor.onMouseRelease(function () {
        canEnterSelectionChange = true

        selectionInstance.setEnd({
            row: this.cursor.getLine(),
            column: this.cursor.getCol()
        })

        activeEditor.selection = selectionInstance


    })

    activeEditor.onMouseClick(function (ev) {
        let mouseOffsetX = ev.offsetX
        let lineOffsetY = getOffsetTopFromElement(ev.target)

        setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)


        if (this.IS_SHIFT_KEY_PRESSED) {
            canEnterSelectionChange = false

            selectionInstance.setEnd({
                column: this.cursor.getCol(),
                row: this.cursor.getLine()
            })
        } else {
            activeEditor.selection = null
        }

        activeEditor.onMouseMove(function (ev) {
            const selection = window.getSelection()
            canEnterSelectionChange = false

            lineOffsetY = getOffsetTopFromElement(ev.target)

            if (selection.focusNode && !selection.focusNode?.classList?.contains('line')) {
                mouseOffsetX = selection.focusNode.parentElement.offsetLeft + (selection.focusOffset * this.getFontWidth())
            } else if (!selection.focusNode) {
                mouseOffsetX = ev.offsetX
            }

            setScreenCursorPositionToBuffer(mouseOffsetX, lineOffsetY)



            selectionInstance.setEnd({
                row: this.cursor.getLine(),
                column: this.cursor.getCol()
            })

            activeEditor.selection = selectionInstance
            CatApp.setCursorPositionInFooter()
        })

        activeEditor.selection = selectionInstance
        CatApp.setCursorPositionInFooter()
    })

    window.onkeyup = ev => {
        activeEditor.handleReleaseKeyboard(ev)
    }

    window.onkeydown = ev => {
        activeEditor.handleInputKeyBoard(ev)
    }

    window.addEventListener('resize', onResize)



    const ROWS_GAP_TO_FETCH = 15
    let lastScrollTop = 0
    let isTicking = false

    activeEditor.verticalScrollbar.container.addEventListener('on-scroll', (event) => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const { start, end } = activeEditor.getViewPortRange()

                const firstLineBufferRow = activeEditor.getMinRenderedBufferRow()
                const lastLineBufferRow = activeEditor.getMaxRenderedBufferRow()

                // if (firstLineBufferRow !== activeEditor.lineModelBuffer.keys().next().value) {
                //     console.log("FIRST DIFFERENT!!!")
                //     console.log("RENDERED: " + firstLineBufferRow)
                //     console.log("LINE MODEL: " + activeEditor.lineModelBuffer.keys().next().value)
                // }

                // if (lastLineBufferRow !== Array.from(activeEditor.lineModelBuffer.keys()).pop()) {
                //     console.log("FIRST DIFFERENT!!!")
                //     console.log("RENDERED: " + lastLineBufferRow)
                //     console.log("LINE MODEL: " + Array.from(activeEditor.lineModelBuffer.keys()).pop())
                // }

                const firstSelectionBufferRow = selectionInstance.getMinRenderedBufferRow()
                const lastSelectionBufferRow = selectionInstance.getMaxRenderedBufferRow()

                if (activeEditor.DOM.textEditorContentWrapper.scrollTop < lastScrollTop) {
                    if (start - firstLineBufferRow <= ROWS_GAP_TO_FETCH) {

                        const { extraStart, extraEnd } = activeEditor.getExtraViewPortRange()

                        for (let index = Math.max(0, firstLineBufferRow); index > extraStart; index--) {
                            if (activeEditor.DOM.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                continue

                            const content = activeEditor.textBuffer.getLineContent(index)
                            const lineModel = new LineModel(activeEditor, content, index)
                            activeEditor.lineModelBuffer.set(index, lineModel)
                        }

                        for (let index = lastLineBufferRow; index > extraEnd; index--) {
                            activeEditor.deleteLineModelBuffer(index)
                        }

                        for (let index = lastSelectionBufferRow; index > extraEnd; index--) {
                            const selectionDiv = activeEditor.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                            if (selectionDiv)
                                selectionDiv.remove()
                        }

                        selectionInstance.render()
                    }
                }

                if (activeEditor.DOM.textEditorContentWrapper.scrollTop > lastScrollTop) {
                    if (lastLineBufferRow - end <= ROWS_GAP_TO_FETCH) {
                        const lastLineOffsetInBuffer = activeEditor.textBuffer.lineCount-1
                        const { extraStart, extraEnd } = activeEditor.getExtraViewPortRange()

                        for (let index = Math.min(lastLineOffsetInBuffer, lastLineBufferRow); index < extraEnd; index++) {
                            if (activeEditor.DOM.editorElement.querySelector(`.line[buffer-row="${index}"]`))
                                continue

                            if (index > lastLineOffsetInBuffer)
                                break

                            const content = activeEditor.textBuffer.getLineContent(index)
                            const lineModel = new LineModel(activeEditor, content, index)
                            activeEditor.lineModelBuffer.set(index, lineModel)
                        }

                        for (let index = firstLineBufferRow; index < extraStart; index++) {
                            activeEditor.deleteLineModelBuffer(index)
                        }

                        for (let index = firstSelectionBufferRow; index < extraStart; index++) {
                            const selectionDiv = activeEditor.DOM.selectionArea.querySelector(`.selected-text[buffer-row="${index}"]`)

                            if (selectionDiv)
                                selectionDiv.remove()
                        }

                        selectionInstance.render()
                    }
                }

                lastScrollTop = activeEditor.DOM.textEditorContentWrapper.scrollTop
                isTicking = false
            })
        }

        isTicking = true
    })
})

onUnmounted(() => {
    window.onkeydown = null
    document.onselectionchange = null

    window.removeEventListener('resize', onResize)
    CatApp.disposeHighLightThread()
})

function onResize() {
    CatApp.activeEditor.renderDOM()
}

function setScreenCursorPositionToBuffer(offsetX, offsetY) {
    CatApp.activeEditor.cursor.setLine(CatApp.activeEditor.getScreenYToBuffer(offsetY))
    CatApp.activeEditor.cursor.setCol(CatApp.activeEditor.getScreenXToBuffer(offsetX))
}

function getOffsetTopFromElement(element) {
    let selectedLine = getLineElementFrom(element)

    if (!selectedLine) {
        selectedLine = CatApp.activeEditor.DOM.editorElement.querySelector(`.line:last-child`)
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
