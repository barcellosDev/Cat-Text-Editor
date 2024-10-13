import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    onChangeRoute: (callback) => {
        ipcRenderer.once('change-route', (ev, path) => callback(path))
    },

    onNewFile: (callback) => {
        ipcRenderer.on('new-file', () => callback())
    },

    onOpenFile: () => {
        ipcRenderer.send('open-file')
    },

    onReadFile: (fileOptions) => {
        ipcRenderer.send('read-file', fileOptions)
    },
    
    onReceiveFile: (callback) => {
        ipcRenderer.on('receive-file', (ev, fileData) => callback(fileData))
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