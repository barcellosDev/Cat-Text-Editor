import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDirectoriesStore = defineStore('directories', () => {
  const directories = ref([])

  return {
    directories
  }
})