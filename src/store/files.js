import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilesStore = defineStore('files', () => {
  const files = ref([])
  const selectedFileIndex = ref(0)

  function pushFile(fileObj) {
    /*
     {
      name: 'etc.php',
      path: 'C:\\xampp...',
      text: (actual file data),
      extension: '.ext'
      changed: false|true,
      cursor: [12, 1],
      buffer: {
        start: 0,
        end: 29832,
        remaining: (total size of file - bytesRead from stream )
      }
     }
    */

    files.value.push(Object.assign(fileObj, { changed: false, cursor: [0, 0] }))
    selectedFileIndex.value = files.value.length - 1
  }

  function newFile() {
    pushFile({
      name: `Untitled ${files.value.filter(file => !file.path).length + 1}`,
      text: '',
    })
  }

  function removeFileRef(index) {
    files.value.splice(index, 1)
    
    if (files.value[index + 1]) {
      setFileSelected(index + 1)
    }
    
    if (files.value[index - 1]) {
      setFileSelected(index - 1)
    }

  }

  function getFile(index) {
    return files.value[index] ?? null
  }

  function getSelectedFile() {
    return files.value[selectedFileIndex.value]
  }

  function setFileSelected(index) {
    selectedFileIndex.value = index
  }

  return {
    files,
    selectedFileIndex,
    pushFile,
    getFile,
    setFileSelected,
    getSelectedFile,
    removeFileRef,
    newFile
  }
})