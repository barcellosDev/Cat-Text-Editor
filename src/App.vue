<script setup>
import { RouterView } from 'vue-router'
import MainMenu from './components/MainMenu.vue';
import { onMounted } from 'vue';
import router from './router';

onMounted(() => {
  window.electron.onChangeRoute(path => {
    router.push({name: path})
  })
})
</script>

<template>
  <div id="main-app-container">
    <MainMenu></MainMenu>

    <div id="main-content" class="dark-mode-color">
      <router-view />
    </div>
  </div>
</template>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Consolas';
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

#main-content {
  width: 100%;
  
}
</style>
