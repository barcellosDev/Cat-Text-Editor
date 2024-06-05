<script setup>



</script>

<template>
    <div id="main-menu" class="dark-light-mode-color">
        <div>
            <i class="white-menu-item fa-solid fa-file"></i>
        </div>
        <div>
            <i class="white-menu-item fa-solid fa-gear"></i>
        </div>
        <div>
            <i class="white-menu-item fa-solid fa-moon"></i>
        </div>
    </div>
</template>

<style scoped>
    #main-menu {
        text-align: center;
    }

    #main-menu > div {
        padding: 15px;
    }

    #main-menu i {
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