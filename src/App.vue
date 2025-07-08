<script setup>
import { RouterView } from 'vue-router'
import MainMenu from './components/MainMenu.vue';
import { onMounted } from 'vue';
import router from './router';
import { SHIKI } from './text-editor/highlighter';
import { CatApp } from './text-editor/cat-app';
import { TextEditor } from './text-editor/text-core';


onMounted(() => {
  SHIKI.load()

  window.electron.onChangeRoute(path => {
    router.push(path)
  })

  window.electron.onNewFile(() => {
    const textEditorInstance = new TextEditor()

    CatApp.editors.push(textEditorInstance)
    CatApp.activeEditor = textEditorInstance

    router.push('editor')
  })

  window.electron.onReceiveFile(async files => {
    let textEditorInstance = null

    files.forEach(fileData => {
      if (CatApp.editors.some(editor => editor.fileInfo.path === fileData.path)) {
        textEditorInstance = CatApp.editors.find(editor => editor.fileInfo.path === fileData.path)
        return
      }

      textEditorInstance = new TextEditor(fileData)
      CatApp.editors.push(textEditorInstance)
    })
    
    if (textEditorInstance instanceof TextEditor) {
      CatApp.activeEditor = textEditorInstance
      router.push('editor')
      CatApp.renderTabs()

      if (CatApp.editors.length > 1) {
        CatApp.activeEditor.show()
      }
    }
  })

  window.addEventListener('resize', () => CatApp.setMainAppContainerHeight)
  CatApp.setMainAppContainerHeight()
})

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
        <div id="default-eol"></div>
        <div id="cursor-position"></div>
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

*::-webkit-scrollbar-track,
.custom-scrollbar-track {
  background-color: #31363F;
}

*::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

*::-webkit-scrollbar-thumb,
.custom-scrollbar-thumb {
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

.hidden {
  display: none !important;
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

#footer-right {
  display: flex;
  gap: 20px;
  margin: 0 5px;
}
</style>
