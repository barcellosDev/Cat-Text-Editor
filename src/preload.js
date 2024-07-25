import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    onChangeRoute: (callback) => {
        ipcRenderer.on('change-route', (event, path) => callback(path))
    },

    onOpenFile: (callback) => {        
        ipcRenderer.send('read-file')
        ipcRenderer.on('receive-file', (ev, fileData) => callback(fileData))
    }
})