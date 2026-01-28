/*
<div class="custom-scrollbar" horizontal>
    <div class="custom-scrollbar-track" horizontal>
      <div class="custom-scrollbar-thumb" horizontal></div>
    </div>
  </div>
*/

import { DOMUI } from "../dom-ui"

export class ScrollBarHorizontal {
    container
    track
    thumb
    isDragging = false

    /** @type {DOMUI} */
    textEditorUI

    emitter

    constructor(domUI, emitter) {
        this.textEditorUI = domUI
        this.emitter = emitter

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
            startScrollLeft = this.textEditorUI.textEditorContentWrapper.scrollLeft;
            document.body.style.userSelect = 'none';
        })

        this.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return

            const dx = e.pageX - startX;
            const scrollRatio = this.textEditorUI.textEditorContentWrapper.scrollWidth / this.container.clientWidth;
            this.textEditorUI.textEditorContentWrapper.scrollLeft = startScrollLeft + dx * scrollRatio;

            this.updateThumb()
        })

        this.textEditorUI.textEditorMainContainer.appendChild(this.container)
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
        const scrollWidth = this.textEditorUI.textEditorContentWrapper.scrollWidth;
        const clientWidth = this.textEditorUI.textEditorContentWrapper.clientWidth;
        const scrollLeft = this.textEditorUI.textEditorContentWrapper.scrollLeft;

        const thumbWidth = (clientWidth / scrollWidth) * this.container.clientWidth;
        this.thumb.style.width = `${thumbWidth}px`;

        const thumbLeft = (scrollLeft / scrollWidth) * this.container.clientWidth;
        this.thumb.style.left = `${thumbLeft}px`;
    }
}