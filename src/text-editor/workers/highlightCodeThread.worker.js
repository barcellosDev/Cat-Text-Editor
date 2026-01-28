import { SHIKI } from "../highlighter"

const shiki = SHIKI.load()

self.onmessage = (e) => {
    const data = e.data
    const buffer = data.data
    const fileExtension = data.extension

    SHIKI.setExtension(fileExtension)
        
    shiki.then(() => {
        const highLightedText = SHIKI.highlight(buffer)
        self.postMessage(highLightedText)
    })
}