<script setup>

import Item from './Item.vue'
import Button from '@/components/ui/Button.vue'
import { useDirectoriesStore } from '@/store/directories';

const dirStore = useDirectoriesStore()



function openDir() {
    window.electron.onOpenDir(directories => {
        dirStore.directories = directories
    })
}

</script>

<template>
    <div id="file-explorer-container">
        <div v-if="dirStore.directories.length === 0" id="dir-not-selected">
            <Button @click="openDir()">Open directory</Button>
        </div>
        <div v-else>
            <div v-for="(files, dirIndex) in dirStore.directories" :key="dirIndex">
                <Item v-for="(file, fileIndex) in files" :key="fileIndex" :file="file">
                </Item>
            </div>
        </div>
    </div>
</template>

<style scoped>
</style>