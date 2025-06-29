<script setup>

import Item from './Item.vue'
import Button from '@/components/ui/Button.vue'
import { CatApp } from '@/text-editor/cat-app.js'
import { ref } from 'vue'

const reload = ref(false)

function openDir() {
    window.electron.onOpenDir(directories => {
        CatApp.directories = directories
        reload.value = !reload.value // Trigger re-render
        console.log('Directories loaded:', CatApp.directories)
    })
}

</script>

<template>
    <div :key="reload" id="file-explorer-container">
        <div v-if="CatApp.directories.length === 0" id="dir-not-selected">
            <Button @click="openDir">Open directory</Button>
        </div>
        <div v-else>
            <div v-for="(files, dirIndex) in CatApp.directories" :key="dirIndex">
                <Item v-for="(file, fileIndex) in files" :key="fileIndex" :file="file">
                </Item>
            </div>
        </div>
    </div>
</template>

<style scoped>
</style>