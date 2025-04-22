import router from '@/router/index.js'
import { TextEditor } from './text-core.js'
import HightlightCodeWorker from './workers/highlightCodeThread.worker.js'

export class CatApp {
    /** @type {TextEditor[]} */
    static editors = []

    /** @type {TextEditor} */
    static activeEditor
    
    static config = {
        fontSize: 14,
        fontFamily: 'Consolas'
    }
    static LINE_HEIGHT = 19
    static highLightCodeThread = null
    
    static getFooter() {
        return document.getElementById('app-footer')
    }

    static getMainAppContainer() {
        return document.getElementById('main-app-container')
    }

    static setMainAppContainerHeight() {
        this.getMainAppContainer().style.height = `${window.innerHeight - this.getFooter().offsetHeight}px`
    }

    static getFontWidth() {
        const context = document.createElement('canvas').getContext('2d')
        context.font = `${this.config.fontSize}px ${this.config.fontFamily}`
        return context.measureText('A').width
    }

    static setCursorPositionInFooter() {
        const ln = this.activeEditor.cursor.getLine()+1
        const col = this.activeEditor.cursor.getCol()+1
        
        if (!isNaN(ln) && !isNaN(col))
            this.getFooter().querySelector('#cursor-position').innerText = `Ln ${ln} Col ${col}`
    }

    static createHighLightCodeThread() {
        if (this.highLightCodeThread === null) {
            this.highLightCodeThread = new HightlightCodeWorker()
            console.log('CRIOU HIGHLIGHT THREAD')
        }
    }

    static disposeHighLightThread() {
        if (typeof this.highLightCodeThread?.terminate === 'function') {
            this.highLightCodeThread.terminate()
            this.highLightCodeThread = null
            console.log('TERMINOU HIGHLIGHT THREAD')
        }
    }

    static renderTabs() {
        const tabsWrapperDiv = document.getElementById('text-editor-tabs')
        if (!tabsWrapperDiv)
            return

        const groupTabs = tabsWrapperDiv.querySelector('#group-tabs')
        const filePath = tabsWrapperDiv.querySelector('#file-path')

        groupTabs.innerHTML = ''

        this.editors.forEach((editor, index) => {
            const divTab = document.createElement('div')
            divTab.className = `tab ${editor.id === this.activeEditor.id ? 'tab-selected' : ''}`
            divTab.onclick = () => this.selectTab(index, divTab)
            divTab.innerText = editor.fileInfo.name

            const iconCloseTab = document.createElement('i')
            iconCloseTab.onclick = (ev) => {
                ev.stopPropagation()
                this.closeTab(index)
            }
            iconCloseTab.className = `fa-solid tab-close-icon fa-x`

            divTab.appendChild(iconCloseTab)
            groupTabs.appendChild(divTab)
        })

        if (this.activeEditor.fileInfo.path) {
            filePath.style.display = ''
            filePath.innerText = this.activeEditor.fileInfo.path.replaceAll('\\', ' > ')
        } else {
            filePath.style.display = 'none'
        }
    }

    static selectTab(index, currentTabElement) {
        // index => index in CatApp.editors[]

        const selectedEditorIndex = this.editors.findIndex(editor => {
            return editor.id == this.activeEditor.id
        })
    
        if (selectedEditorIndex == index)
            return
        
        const previousSelectedTab = document.querySelector('#text-editor-tabs #group-tabs .tab-selected')
        
        if (previousSelectedTab) {
            previousSelectedTab.classList.remove('tab-selected')
        }
        
        currentTabElement.classList.add('tab-selected')

        this.editors.forEach((editor, i) => {
            if (i !== index) {
                editor.DOM.textEditorMainContainer.classList.add('hidden')
            }
        })

        this.activeEditor = this.editors[index]
        this.activeEditor.renderDOM()
    }

    static closeTab(index) {
        this.editors.splice(index, 1)

        if (this.editors.length === 0) {
            router.push('/')
            return
        }

        if (this.editors[index] !== undefined) {
            this.activeEditor = this.editors[index]
            this.activeEditor.renderDOM()
            this.renderTabs()
            return
        }
        
        if (this.editors[index+1] !== undefined) {
            this.activeEditor = this.editors[index+1]
            this.activeEditor.renderDOM()
            this.renderTabs()
            return
        }
    
        if (this.editors[index-1] !== undefined) {
            this.activeEditor = this.editors[index-1]
            this.activeEditor.renderDOM()
            this.renderTabs()
            return
        }
    }
}