'use strict'

import { app, protocol, BrowserWindow, Menu, dialog, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import * as nodePath from 'path'
import { statSync } from 'fs'
import { writeFile, open } from 'fs/promises'
import * as utils from './utils'

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])



// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}



async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {

      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      preload: nodePath.join(__dirname, 'preload.js')
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)

    if (!process.env.IS_TEST)
      win.webContents.openDevTools()

  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          click() {
            win.webContents.send("new-file")
          }
        },
        {
          label: 'Open File',
          async click() {
            const files = await ipcOpenFile()

            if (files)
              win.webContents.send('receive-file', files)
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Home',
          click() {
            win.webContents.send("change-route", "/")
          }
        }
      ]
    }
  ]))

  ipcMain.on('open-file', async () => {

    const files = await ipcOpenFile()

    if (files)
      win.webContents.send('receive-file', files)

  })

  ipcMain.on('read-file', async (event, fileOptions) => {
    const fileData = await ipcReadFile({
      path: fileOptions.path
    })

    win.webContents.send('receive-file', [fileData])
  })

  ipcMain.on('read-dir', async () => ipcReadDir())

  ipcMain.on('save-file', async (event, fileData) => {
    const fileObj = JSON.parse(fileData)

    if (!fileObj.path) { // new file being created. Open dialog
      const result = await dialog.showSaveDialog(win)

      if (result.canceled) {
        win.webContents.send('saved-file', false)
        return
      }

      fileObj.path = result.filePath
    }

    try {
      await writeFile(fileObj.path, fileObj.text, { flag: 'w', encoding: 'utf-8' })

      fileObj.name = nodePath.basename(fileObj.path)
      fileObj.changed = false

      win.webContents.send('saved-file', JSON.stringify(fileObj))
    } catch (error) {
      win.webContents.send('saved-file', error)
    }

  })




  async function ipcReadDir() {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'multiSelections'] })

    if (!result.canceled) {

      const directories = result.filePaths.map(dirPath => {
        const fileStats = statSync(dirPath)

        return [{
          name: nodePath.basename(dirPath),
          type: 'directory',
          size: fileStats.size,
          path: dirPath,
          children: utils.tree(dirPath)
        }]

      })

      win.webContents.send('receive-dir', directories)
    }
  }


  async function ipcOpenFile() {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] })

    if (result.canceled)
      return false

    const filePaths = result.filePaths

    const filePromises = filePaths.map(async filePath => {      
      return await ipcReadFile({path: filePath})
    })

    return await Promise.all(filePromises)
  }

  async function ipcReadFile({
    path = null,
    start = 0,
    end = null
  }) {

    if (!path) {
      throw new Error('Defina um caminho para ler o arquivo')
    }

    if (end === null) {
      end = utils.convertToBytes(1, 'MB')
    }

    const fileHandler = await open(path, 'r')
    const stream = fileHandler.createReadStream({
      encoding: 'utf-8',
      start,
      end
    })

    const fileSize = statSync(path).size

    return new Promise(resolve => {
      let data = ''

      stream.on('data', (chunk) => {
        data += chunk
      })

      stream.on('end', () => {
        fileHandler.close()

        resolve({
          text: data,
          name: process.platform === 'win32' ? nodePath.win32.basename(path) : nodePath.posix.basename(path),
          path: path,
          extension: nodePath.extname(path),
          cursor: [0, 0],
          buffer: {
            start,
            end,
            remaining: fileSize - stream.bytesRead,
            total: fileSize
          }
        })
      })
    })
  }

}