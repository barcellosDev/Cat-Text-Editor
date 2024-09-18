import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    onChangeRoute: (callback) => {
        ipcRenderer.on('change-route', (event, path) => callback(path))
    },

    onOpenFile: (callback, filePaths = []) => {
        ipcRenderer.once('receive-file', (ev, fileData) => callback(fileData))
        ipcRenderer.send('read-file', filePaths)
    },

    onSaveFile: (fileData, callback) => {
        ipcRenderer.once('saved-file', (ev, fileObj) => callback(fileObj))
        ipcRenderer.send('save-file', fileData)
    },

    onOpenDir: (callback) => {
        ipcRenderer.once('receive-dir', (ev, directory) => callback(directory))
        ipcRenderer.send('read-dir')
    }
})