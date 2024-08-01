import { defineStore } from 'pinia'
import { ref } from 'vue'
import { highlightText, textMatrix, parseText } from '@/components/text-editor/text-core.js'

export const useFilesStore = defineStore('files', () => {
  const files = ref([])
  const selectedFileIndex = ref(null)

  function pushFile(fileObj) {
    /*
     {
      name: 'etc.php',
      path: 'C:\\xampp...',
      text: (actual file data)
     }
    */

    removeAnySelected()

    files.value.push(Object.assign(fileObj, { selected: true }))
    selectedFileIndex.value = files.value.length - 1
  }

  function removeAnySelected() {
    files.value
      .filter(fileObj => fileObj?.selected)
      .forEach(file => delete file.selected)
  }

  function getFile(index) {
    return files.value[index] ?? null
  }

  function getSelectedFile() {
    return files.value.filter(fileObj => fileObj?.selected)[0] ?? null
  }

  function setFileSelected(index) {
    removeAnySelected()
    
    const file = getFile(index)
    selectedFileIndex.value = index

    if (file)
      file.selected = true

    textMatrix.value = parseText(file.text)
    window['text-editor-content'].innerHTML = highlightText()
  }

  return {
    files,
    selectedFileIndex,
    pushFile,
    getFile,
    setFileSelected,
    getSelectedFile
  }
})