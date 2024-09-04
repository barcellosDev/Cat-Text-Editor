import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    onChangeRoute: (callback) => {
        ipcRenderer.on('change-route', (event, path) => callback(path))
    },

    onOpenFile: (callback, filePaths = []) => {
        ipcRenderer.once('receive-file', (ev, fileData) => callback(fileData))
        ipcRenderer.send('read-file', filePaths)
    },

    onOpenDir: (callback) => {
        ipcRenderer.once('receive-dir', (ev, directory) => callback(directory))
        ipcRenderer.send('read-dir')
    }
})