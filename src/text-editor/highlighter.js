import { createHighlighter } from 'shiki'

export class SHIKI {
    static selectedThemeName = 'slack-dark'
    static fileExtensionToLang = {
        '.js': 'javascript',
        '.mjs': 'javascript',
        '.vue': 'javascript',
        '.php': 'php',
        '.html': 'html'
    }
    static selectedExtension = null

    static shiki = null

    static async load() {
        if (this.shiki === null) {
            this.shiki = await createHighlighter({
                themes: [this.selectedThemeName],
                langs: ['javascript', 'php', 'html']
            })
        }
    }

    static setExtension(extension) {
        if (!extension)
            extension = ".txt"
        
        this.selectedExtension = extension
    }

    static highlight(text) {
        return this.shiki.codeToHtml(text, {
            lang: this.fileExtensionToLang[this.selectedExtension],
            theme: this.selectedThemeName
        })
    }
}
