import { CatApp } from "./cat-app"

export class FileInfo {
    name = null
    path = null
    extension = null

    constructor(name = null, path = null, extension = null) {

        if (!name) {
            name = `Untitled ${CatApp.editors.length+1}`
        }
        
        this.name = name
        this.path = path
        this.extension = extension
    }
}