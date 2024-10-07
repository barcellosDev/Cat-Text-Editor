<script setup>
import { RouterView } from 'vue-router'
import MainMenu from './components/MainMenu.vue';
import { onMounted, computed } from 'vue';
import router from './router';
import { useFilesStore } from '@/store/files';

const store = useFilesStore()

const linePos = computed(() => {
  return store.files[store.selectedFileIndex].cursor[0] + 1
})

const columnPos = computed(() => {
  return store.files[store.selectedFileIndex].cursor[1] + 1
})

onMounted(() => {
  window.electron.onChangeRoute(path => {
    router.push(path)
  })

  window.electron.onNewFile(() => {
    store.newFile()
    router.push('editor')
  })

  window.electron.onReceiveFile(files => {
    files.forEach(fileData => {
      store.pushFile(fileData)
    })

    router.push('editor')
  })

  window.onresize = () => {
    const mainMenuWidth = document.getElementById('main-menu').offsetWidth
    document.getElementById('main-content').style.width = `calc(100% - ${mainMenuWidth}px)`
  }
})
</script>

<template>
  <div id="main-app-container-wrapper">

    <div id="main-app-container">
      <MainMenu></MainMenu>
  
      <div id="main-content" class="dark-mode-color">
        <router-view :key="store.selectedFileIndex" />
      </div>
    </div>

    <div id="app-footer">
      <div id="footer-left"></div>
      <div id="footer-right">
        <div v-if="store.getSelectedFile()" id="cursor-position">
          Ln {{ linePos }}, Col {{ columnPos }}
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Consolas';
}

*::-webkit-scrollbar-track {
    background-color: #31363F;
}

*::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

*::-webkit-scrollbar-thumb {
    background-color: #ffffff44;
}

#app {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
}

.dark-mode-color {
  background-color: #26282B;
}

.dark-light-mode-color {
  background-color: #31363F;
}

.light-mode-color {
  background-color: #fff2ed;
}
</style>

<style scoped>
#main-app-container {
  display: flex;
  height: 100%;
}

#main-app-container-wrapper {
  height: 100%;
}

#main-content {
  width: 100%;
}

#app-footer {

  color: white;
  padding: 2px;
  background-color: #569cd6;
  display: flex;
  justify-content: space-between;

}
</style>
