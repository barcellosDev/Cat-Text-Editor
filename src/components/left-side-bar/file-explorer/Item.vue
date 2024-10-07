<script setup>
import { defineProps, computed, ref } from 'vue';
import router from '@/router'
import { useFilesStore } from '@/store/files';

const store = useFilesStore()

const spacingOffset = 20

const showChildren = ref(false)

const props = defineProps({
    file: Object,
    spacing: {
        type: Number,
        default: 0
    }
})

const fileSpacing = computed(() => {
    return props.file.type === 'file' ? `padding-left: ${spacingOffset}px;` : ''
})

const childSpacing = computed(() => {
    return `margin-left: ${props.spacing}px;`
})

const toggleChildrenIcon = computed(() => {
    return showChildren.value ? 'fa-angle-down' : 'fa-angle-right'
})

const fileIcon = computed(() => {
    return props.file.type === 'file' ? 'fa-file' : 'fa-folder'
})

function toggleShowChildren() {
    showChildren.value = !showChildren.value
}

function openFile(file) {
    if (file.type === 'directory')
        return
    
    const filePath = file.path

    window.electron.onOpenFile(files => {
        files.forEach(fileData => {
            store.pushFile(fileData)
        })
        
        router.push('editor')
    }, [filePath])
}

</script>

<template>
    <div class="file-item-container">

        <div :style="`${childSpacing} ${fileSpacing}`" class="item" @click="toggleShowChildren(); openFile(file)">
            <i v-if="file.children" class="fa-solid " :class="toggleChildrenIcon">
            </i>

            <i class="fa-solid" :class="fileIcon"></i>

            <span>{{ file.name }}</span>
        </div>

        <div v-if="file.children && showChildren">
            <Item v-for="(child, index) in file.children" :key="index" :file="child"
                :spacing="props.spacing + spacingOffset">
            </Item>
        </div>

    </div>
</template>

<style scoped>
.item {
    padding: 5px;
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 10px;
}

.item:hover {
    background-color: #26282B;
}
</style>