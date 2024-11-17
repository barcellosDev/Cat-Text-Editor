import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTextEditorConfigStore = defineStore('config', () => {
  const directories = ref([])

  return {
    directories
  }
})