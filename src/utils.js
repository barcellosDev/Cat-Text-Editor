import { statSync, readdirSync } from "fs";
import path from "path";
import { inspect } from 'util'


function tree(dirPath) {
    const dirData = readdirSync(dirPath)

    const treeArray = []

    dirData.forEach(fileName => {
        const filePath = `${dirPath}${path.sep}${fileName}`
        const fileStats = statSync(filePath)

        const fileObj = {}

        fileObj['name'] = fileName
        fileObj['type'] = fileStats.isFile() ? 'file' : 'directory'
        fileObj['size'] = fileStats.size
        fileObj['path'] = filePath

        if (fileStats.isDirectory()) {
            fileObj['children'] = tree(filePath)
        }

        if (fileStats.isDirectory())
            treeArray.unshift(fileObj)
        else
            treeArray.push(fileObj)

    })

    return treeArray
}

function debugObject(object) {
    console.log(
        inspect(object, { showHidden: false, depth: null, colors: true })
    )
}

function convertToBytes(size, unit) {
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 ** 2,
        'GB': 1024 ** 3,
        'TB': 1024 ** 4,
        'PB': 1024 ** 5
    }

    if (!units[unit]) {
        throw new Error("Invalid unit specified. Please use B, KB, MB, GB, TB, or PB.")
    }

    return size * units[unit]
}


export {
    tree,
    debugObject,
    convertToBytes
}