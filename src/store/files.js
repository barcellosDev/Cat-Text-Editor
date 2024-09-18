import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilesStore = defineStore('files', () => {
  const files = ref([])
  const selectedFileIndex = ref(null)

  function pushFile(fileObj) {
    /*
     {
      name: 'etc.php',
      path: 'C:\\xampp...',
      text: (actual file data)
      changed: false|true
     }
    */

    removeAnySelected()

    files.value.push(Object.assign(fileObj, { selected: true, changed: false }))
    selectedFileIndex.value = files.value.length - 1
  }

  function removeFileRef(index) {
    files.value.splice(index, 1)

    if (typeof files.value[index + 1] === 'object') {
      setFileSelected(index + 1)
    }

    if (typeof files.value[index - 1] === 'object') {
      setFileSelected(index - 1)
    }
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
    return files.value[selectedFileIndex.value]
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
    getSelectedFile,
    removeFileRef
  }
})