/*
<div class="custom-scrollbar" horizontal>
    <div class="custom-scrollbar-track" horizontal>
      <div class="custom-scrollbar-thumb" horizontal></div>
    </div>
  </div>
*/

import { TextEditor } from "../text-core"

export class ScrollBarHorizontal {
    container
    track
    thumb
    isDragging = false

    /** @type {TextEditor} */
    textEditor

    constructor(textEditor) {
        this.textEditor = textEditor

        const container = document.createElement('div')
        container.className = 'custom-scrollbar'
        container.setAttribute('horizontal', '')

        const track = document.createElement('div')
        track.className = 'custom-scrollbar-track'
        track.setAttribute('horizontal', '')
        
        const thumb = document.createElement('div')
        thumb.className = 'custom-scrollbar-thumb'
        thumb.setAttribute('horizontal', '')

        track.appendChild(thumb)
        container.appendChild(track)

        this.container = container
        this.track = track
        this.thumb = thumb

        let startX;
        let startScrollLeft;

        this.thumb.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            startX = e.pageX;
            startScrollLeft = this.textEditor.DOM.textEditorContentWrapper.scrollLeft;
            document.body.style.userSelect = 'none';
        })

        this.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return

            const dx = e.pageX - startX;
            const scrollRatio = this.textEditor.DOM.textEditorContentWrapper.scrollWidth / this.container.clientWidth;
            this.textEditor.DOM.textEditorContentWrapper.scrollLeft = startScrollLeft + dx * scrollRatio;

            this.updateThumb()
        })

        this.textEditor.DOM.textEditorMainContainer.appendChild(this.container)
        this.updateThumb()
    }

    showScrollbar() {
        this.container.classList.add('custom-scrollbar-visible');
    }

    hideScrollbar() {
        if (!this.isDragging) {
            this.container.classList.remove('custom-scrollbar-visible');
        }
    }

    updateThumb() {
        const scrollWidth = this.textEditor.DOM.textEditorContentWrapper.scrollWidth;
        const clientWidth = this.textEditor.DOM.textEditorContentWrapper.clientWidth;
        const scrollLeft = this.textEditor.DOM.textEditorContentWrapper.scrollLeft;

        const thumbWidth = (clientWidth / scrollWidth) * this.container.clientWidth;
        this.thumb.style.width = `${thumbWidth}px`;

        const thumbLeft = (scrollLeft / scrollWidth) * this.container.clientWidth;
        this.thumb.style.left = `${thumbLeft}px`;
    }
}