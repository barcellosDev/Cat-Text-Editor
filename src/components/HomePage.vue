<script setup>
import router from '@/router'
import { useFilesStore } from '@/store/files';

const store = useFilesStore()

function openFile() {
    window.electron.onOpenFile(files => {
        files.forEach(fileData => {
            store.pushFile(fileData)
        })
        
        router.push('editor')
    })
}

function newFile() {
    store.pushFile({
        name: 'Untitled 1',
        text: ''
    })
    router.push('editor')
}

</script>

<template>
    <div id="container">

        <div id="intro">
            <div id="intro-logo">

            </div>
            <div id="links">
                <p>
                    <a @click="newFile()">New file</a>
                </p>
                <p><a @click="openFile()">Open existing file</a></p>
            </div>
        </div>

    </div>
</template>

<style scoped>
a {
    text-decoration: none;
    color: white;
    cursor: pointer;
}

#container {
    height: 100%;
    color: whitesmoke;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

#intro-logo {
    width: 200px;
    height: 200px;
    background-image: url('../assets/cat1.png');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
}

#links {
    margin-top: 20px;
}
</style>