<script setup>
import router from '@/router';
import { useFilesStore } from '@/store/files';

const store = useFilesStore()

function selectTab(tabIndex) {
    if (store.selectedFileIndex == tabIndex)
        return
    
    store.setFileSelected(tabIndex)
    window.dispatchEvent(new Event('tab-change'))
}

function closeTab(tabIndex, isChanged) {
    if (isChanged) {
        alert('Descartar alterações?')
    }

    store.removeFileRef(tabIndex)

    if (store.files.length === 0) {
        router.push('/')
    }
}

</script>

<template>
    <div id="text-editor-tabs">
        
        <div id="group-tabs">
            <div v-for="(file, index) in store.files" 
                :key="index" 
                class="tab" 
                :class="{'tab-selected': index === store.selectedFileIndex}"
                @click="selectTab(index)"
            >
                <div>{{ file.name }}</div>
                <i @click.stop="closeTab(index, file.changed)" class="fa-solid tab-close-icon" :class="{'fa-x': !file.changed, 'fa-circle': file.changed}"></i>
            </div>
        </div>

        <div v-if="store.getSelectedFile()?.path" class="file-path">
            {{ store.getSelectedFile().path.replaceAll('\\', ' > ') }}
        </div>
    </div>
</template>

<style scoped>

#text-editor-tabs {
    color: whitesmoke;
    overflow-x: auto;
}

#group-tabs {
    display: flex;
    background-color: #31363F;
    overflow-x: auto;
}

.tab {
    padding: 15px 15px 10px 15px;
    width: fit-content;
    text-align: center;
    white-space: nowrap;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.tab-close-icon {
    color: #7a7a7a;
    font-size: .8em;
}
.tab-close-icon:hover {
    color: whitesmoke;
}

.tab-selected {
    background-color: #26282B;
}

.file-path {
    padding: 15px 15px 10px 15px;
}

</style>