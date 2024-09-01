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

        treeArray.push(fileObj)

    })

    return treeArray
}

function debugObject(object) {
    console.log(
        inspect(object, { showHidden: false, depth: null, colors: true })
    )
}

export {
    tree,
    debugObject
}