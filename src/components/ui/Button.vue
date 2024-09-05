<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    secondary: {
        type: Boolean,
        required: false,
        default: false
    }
})

</script>

<template>
    <div class="button" :class="{'secondary-button': props.secondary, 'default-button': !props.secondary }">
        <span><slot></slot></span>
    </div>
</template>

<style scoped>

.button {
    border-radius: 5px;
    max-width: 300px;
    cursor: pointer;
    padding: 5px;
    text-align: center;
}

.default-button {
    background-color: #0078d4;
}
.default-button:hover {
    background-color: #004a83;
}

</style>