<script setup>
import FileExplorer from '@/components/left-side-bar/file-explorer/FileExplorer.vue'
import Configuration from '@/components/left-side-bar/Configuration.vue'
import { onUpdated, ref } from 'vue';

const fileExplorerSideBar = ref(false)
const configSideBar = ref(false)

function loadFileExplorer() {
    fileExplorerSideBar.value = !fileExplorerSideBar.value
    configSideBar.value = false
}

function loadConfigurations() {
    configSideBar.value = !configSideBar.value
    fileExplorerSideBar.value = false
}

onUpdated(() => {
    window.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('ui-change'))
})

</script>

<template>
    <div id="main-menu" class="dark-light-mode-color">
        <div id="menu-items">
            <div>
                <i @click="loadFileExplorer()" class="white-menu-item fa-solid fa-file"></i>
            </div>
            <div>
                <i @click="loadConfigurations()" class="white-menu-item fa-solid fa-gear"></i>
            </div>
        </div>

        <div v-if="fileExplorerSideBar || configSideBar" id="left-side-bar">
            <FileExplorer v-if="fileExplorerSideBar"></FileExplorer>
            <Configuration v-if="configSideBar"></Configuration>
        </div>
    </div>
</template>

<style scoped>
#left-side-bar {
    color: whitesmoke;
    overflow-y: auto;
    min-width: max-content;
    padding: 10px;
    border-left: 1px solid #5757577e;
    font-size: .9em;
}

#main-menu {
    display: flex;
}

#menu-items {
    text-align: center;
}

#menu-items>div {
    padding: 15px;
}

#menu-items i {
    cursor: pointer;
    font-size: 30px;
}

.white-menu-item {
    color: white;
}

.selected-menu-border {
    border-left: 2px solid whitesmoke;
}
</style>