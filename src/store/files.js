import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilesStore = defineStore('files', () => {
  const files = []
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

    files.push(Object.assign(fileObj, { selected: true }))
    selectedFileIndex.value = files.length - 1
  }

  function removeAnySelected() {
    files
      .filter(fileObj => fileObj?.selected)
      .forEach(file => delete file.selected)
  }

  function getFile(index) {
    return files[index] ?? null
  }

  function getSelectedFile() {
    return files.filter(fileObj => fileObj?.selected)[0] ?? null
  }

  function setFileSelected(index) {
    removeAnySelected()
    
    const file = getFile(index)
    selectedFileIndex.value = index

    if (file)
      file.selected = true
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