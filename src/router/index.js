import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/components/HomePage.vue";
import TextEditor from '@/text-editor/TextEditor.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: HomePage
        },
        {
            path: '/editor',
            component: TextEditor
        }
    ]
})

export default router