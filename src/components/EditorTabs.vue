<script setup>
import { useFilesStore } from '@/store/files';

const store = useFilesStore()

function selectTab(tabIndex) {
    store.setFileSelected(tabIndex)
}

</script>

<template>
    <div id="text-editor-tabs">
        
        <div id="group-tabs">
            <div v-for="(file, index) in store.files" 
            :key="index" 
            class="tab" 
            :class="{'tab-selected': file.selected}"
            @click="selectTab(index)">
                    {{ file.name }}
            </div>
        </div>

        <div v-if="store.getSelectedFile().path" class="file-path">
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
}

.tab {
    padding: 15px 15px 10px 15px;
    width: fit-content;
    text-align: center;
    white-space: nowrap;
    cursor: pointer;
}

.tab-selected {
    background-color: #26282B;
}

.file-path {
    padding: 15px 15px 10px 15px;
}

</style>