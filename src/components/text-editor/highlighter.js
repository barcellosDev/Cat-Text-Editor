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

    static shiki = null

    static async load() {
        if (this.shiki === null) {
            this.shiki = await createHighlighter({
                themes: [this.selectedThemeName],
                langs: ['javascript', 'php', 'html']
            })

            console.log('LOADED SHIKI')
            return
        }

        console.log('ALREADY LOADED SHIKI')
    }

    static highlight(text, extension) {
        return this.shiki.codeToHtml(text, {
            lang: this.fileExtensionToLang[extension],
            theme: this.selectedThemeName,
            transformers: [
                {
                    line(node) {
                        node.tagName = 'div'
                    }
                }
            ]
        })
    }
}
