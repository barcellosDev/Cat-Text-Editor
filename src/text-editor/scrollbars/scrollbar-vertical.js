/*
<div class="custom-scrollbar" vertical>
    <div class="custom-scrollbar-track" vertical>
      <div class="custom-scrollbar-thumb" vertical></div>
    </div>
  </div>
*/

import { DOMUI } from "../dom-ui"

export class ScrollBarVertical {
    container
    thumb
    track
    isDragging = false
    lastScrollTop = 0

    /** @type {DOMUI} */
    textEditorUI

    constructor(domUI, emitter) {
        this.textEditorUI = domUI
        this.emitter = emitter

        const container = document.createElement('div')
        container.className = 'custom-scrollbar'
        container.setAttribute('vertical', '')
        
        const thumb = document.createElement('div')
        thumb.className = 'custom-scrollbar-thumb'
        thumb.setAttribute('vertical', '')
        
        const track = document.createElement('div')
        track.className = 'custom-scrollbar-track'
        track.setAttribute('vertical', '')
        
        track.appendChild(thumb)
        container.appendChild(track)
        
        this.container = container
        this.track = track
        this.thumb = thumb


        let startY;
        let startScrollTop;

        this.thumb.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            startY = e.pageY;
            startScrollTop = this.textEditorUI.textEditorContentWrapper.scrollTop;
            document.body.style.userSelect = 'none';
        })

        this.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return

            const dy = e.pageY - startY;
            const scrollRatioV = this.textEditorUI.textEditorContentWrapper.scrollHeight / this.container.clientHeight;
            this.textEditorUI.textEditorContentWrapper.scrollTop = startScrollTop + dy * scrollRatioV;
            
            this.updateThumb()
            
            if (this.textEditorUI.textEditorContentWrapper.scrollTop !== this.lastScrollTop) {
                this.emitter.emit("ScrollBarVertical:moved")
            }
            
            this.lastScrollTop = this.textEditorUI.textEditorContentWrapper.scrollTop
        })

        this.textEditorUI.textEditorContentWrapper.addEventListener('wheel', () => {
            this.updateThumb()

            if (this.textEditorUI.textEditorContentWrapper.scrollTop !== this.lastScrollTop) {
                this.emitter.emit("ScrollBarVertical:moved")
            }
            
            this.lastScrollTop = this.textEditorUI.textEditorContentWrapper.scrollTop
            
        }, { passive: true })
        
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
        const MIN_HEIGHT_IN_PX = 20
        const scrollHeight = this.textEditorUI.textEditorContentWrapper.scrollHeight;
        const clientHeight = this.textEditorUI.textEditorContentWrapper.clientHeight;
        const scrollTop = this.textEditorUI.textEditorContentWrapper.scrollTop;

        const thumbHeight = (clientHeight / scrollHeight) * this.container.clientHeight;
        this.thumb.style.height = `${thumbHeight < MIN_HEIGHT_IN_PX ? MIN_HEIGHT_IN_PX : thumbHeight}px`;

        const thumbTop = (scrollTop / scrollHeight) * this.container.clientHeight;
        this.thumb.style.top = `${thumbTop}px`;
    }

    scrollNowTo(yCoordinate) {
        this.textEditorUI.textEditorContentWrapper.scroll({
            top: yCoordinate
        })
        this.updateThumb()
    }

    dispose() {
        // document.removeEventListener('mouseup', this.handleMouseUpFn)
        // this.thumb.removeEventListener('mousedown', this.handleMouseDownFn)
        // this.container.removeEventListener('mousemove', this.handleMouseMoveFn)
    }
}