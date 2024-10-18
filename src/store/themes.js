import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useFilesStore } from './files'
import { createHighlighter } from 'shiki'

export const useThemesStore = defineStore('themes', () => {
    const filesStore = useFilesStore()
    const selectedThemeName = 'slack-dark'
    const fileExtensionToLang = {
        '.js': 'javascript',
        '.php': 'php',
        '.html': 'html'
    }

    const highlighter = ref()

    async function loadHighlighter() {
        highlighter.value = await createHighlighter({
            themes: [selectedThemeName],
            langs: ['javascript', 'php', 'html']
        })
    }

    function highlightCode(text) {
        const fileObj = filesStore.getSelectedFile()

        const fileType = fileExtensionToLang[fileObj.extension]

        console.log(fileType)

        return highlighter.value.codeToHtml(text, {
            lang: fileType,
            theme: selectedThemeName
        })
    }

    return {
        highlightCode,
        loadHighlighter,
    }
})