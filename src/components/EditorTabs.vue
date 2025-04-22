<script setup>
import { CatApp } from '@/text-editor/cat-app';
import { onMounted } from 'vue';

onMounted(() => {
    CatApp.renderTabs()
})

</script>

<template>
    <div id="text-editor-tabs">
        <div id="group-tabs">
        </div>

        <div id="file-path">
        </div>
    </div>
</template>

<style>
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

#file-path {
    padding: 15px 15px 10px 15px;
}

</style>