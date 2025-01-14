/*
<div id="text-editor-scrollbar">
            <div id="text-editor-scrollbar-track">
                <div id="text-editor-scrollbar-thumb"></div>
            </div>
        </div>
*/

import { TextEditor } from "./text-core"

export class ScrollBar {
    textEditorContentContainer = null
    track = null
    thumb = null
    container = null
    isDragging = false
    scrollableArea = null

    constructor() {
        this.textEditorContentContainer = document.getElementById('text-editor-content-wrapper')
        this.scrollableArea = document.getElementById('scroll-area')

        const container = document.createElement('div')
        container.id = 'text-editor-scrollbar'
        
        const track = this.buildTrack()
        const thumb = this.buildThumb()

        track.appendChild(thumb)
        container.appendChild(track)

        this.container = container
        this.thumb = thumb
        this.track = track

        const _this = this

        document.addEventListener('mouseup', this.handleMouseUpFn.bind(_this))
        this.thumb.addEventListener('mousedown', this.handleMouseDownFn.bind(_this))
    }

    onScroll(callback) {
        const scrollFn = () => {
            callback()
        }
        
        this.scrollableArea.addEventListener('mousemove', (event) => {
            if (!this.isDragging)
                return

            this.scrollNowTo(event.clientY)
            scrollFn()
        })
        
        this.textEditorContentContainer.addEventListener('wheel', () => {
            scrollFn()
            this.updateThumbPosition()
        }, {passive: true})
    }

    handleMouseUpFn() {
        this.isDragging = false
        document.body.style.userSelect = ''
    }

    handleMouseDownFn() {
        this.isDragging = true
        document.body.style.userSelect = 'none'
    }

    buildTrack() {
        const track = document.createElement('div')
        track.id = 'text-editor-scrollbar-track'

        return track
    }

    buildThumb() {
        const thumb = document.createElement('div')
        thumb.id = 'text-editor-scrollbar-thumb'

        return thumb
    }

    scrollNowTo(yCoordinate) {
        if (!this.isDragging)
            return

        const trackRect = this.track.getBoundingClientRect();
        const newY = yCoordinate - trackRect.top;
        const maxThumbTop = this.track.clientHeight - this.thumb.clientHeight;
        const thumbTop = Math.min(Math.max(newY, 0), maxThumbTop);

        this.thumb.style.top = `${thumbTop}px`;

        const scrollRatio = thumbTop / maxThumbTop
        this.textEditorContentContainer.scrollTop = scrollRatio * (this.textEditorContentContainer.scrollHeight - this.textEditorContentContainer.clientHeight)
    }

    updateThumbHeight() {
        let thumbHeight = (this.textEditorContentContainer.clientHeight / this.textEditorContentContainer.scrollHeight) * this.track.clientHeight;

        if (thumbHeight < 20)
            thumbHeight = 20

        this.thumb.style.height = `${thumbHeight}px`;
    }

    updateThumbPosition() {
        const scrollRatio = this.textEditorContentContainer.scrollTop / (this.textEditorContentContainer.scrollHeight - this.textEditorContentContainer.clientHeight);
        const thumbTop = scrollRatio * (this.track.clientHeight - this.thumb.clientHeight);
        this.thumb.style.top = `${thumbTop}px`;
    }

    dispose() {
        // document.removeEventListener('mouseup', this.handleMouseUpFn)
        // this.thumb.removeEventListener('mousedown', this.handleMouseDownFn)
        // this.container.removeEventListener('mousemove', this.handleMouseMoveFn)
    }
}