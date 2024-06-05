import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/components/HomePage.vue";
import TextEditor from '@/components/text-editor/TextEditor.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomePage
        },
        {
            path: '/editor',
            name: 'TextEditor',
            component: TextEditor
        }
    ]
})

export default router