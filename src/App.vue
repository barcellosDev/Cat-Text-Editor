<script setup>
import { RouterView } from 'vue-router'
import MainMenu from './components/MainMenu.vue';
import { onMounted, computed } from 'vue';
import router from './router';
import { useFilesStore } from '@/store/files';
import { SHIKI } from './components/text-editor/highlighter';

const store = useFilesStore()

const linePos = computed(() => {
  return store.files[store.selectedFileIndex].cursor[0] + 1
})

const columnPos = computed(() => {
  return store.files[store.selectedFileIndex].cursor[1] + 1
})

onMounted(() => {
  SHIKI.load()
  
  window.electron.onChangeRoute(path => {
    router.push(path)
  })

  window.electron.onNewFile(() => {
    store.newFile()
    router.push('editor')
    window.dispatchEvent(new Event('tab-change'))
  })

  window.electron.onReceiveFile(files => {
    files.forEach(fileData => {
      store.pushFile(fileData)
    })

    router.push('editor')
    window.dispatchEvent(new Event('tab-change'))
  })

  window.addEventListener('resize', setMainAppContainerHeight)

  setMainAppContainerHeight()
})

onMounted(() => {
  console.log('DESMONTADO APP.VUE')
})

function setMainAppContainerHeight() {
  const appFooter = document.getElementById('app-footer')
  document.getElementById('main-app-container').style.height = `${window.innerHeight - appFooter.offsetHeight}px`
}

</script>

<template>
  <div id="main-app-container-wrapper">

    <div id="main-app-container">
      <MainMenu></MainMenu>
  
      <div id="main-content" class="dark-mode-color">
        <router-view />
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
  font-size: 14px;
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
  flex: 1;
}

#main-app-container-wrapper {
  height: 100vh;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
}

#main-content {
  width: 100%;
}

#app-footer {

  height: 20px;
  color: white;
  padding: 2px;
  background-color: #569cd6;
  display: flex;
  justify-content: space-between;

}
</style>
