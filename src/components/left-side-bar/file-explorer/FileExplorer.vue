<script setup>

import ListDirectories from './ListDirectories.vue'
import Button from '@/components/ui/Button.vue'
import { useDirectoriesStore } from '@/store/directories';

const dirStore = useDirectoriesStore()



function openDir() {
    window.electron.onOpenDir(directories => {
        dirStore.directories = directories

        console.log(dirStore)
    })
}

</script>

<template>
    <div id="file-explorer-container">
        <div v-if="dirStore.directories.length === 0" id="dir-not-selected">
            <Button @click="openDir()">Open directory</Button>
        </div>
        <div v-else>
            <ListDirectories v-for="(files, index) in dirStore.directories" :key="index"
            :files="files"
            >
            </ListDirectories>
        </div>
    </div>
</template>

<style scoped></style>