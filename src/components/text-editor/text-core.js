import { ref } from "vue"

const textMatrix = ref([
    []
])

const cursorPos = ref([0, 0]) // linha, coluna => i, j

const notPrint = {
    37: decrCharCursorPos, // arrowLeft
    38: () => { // arrowUp
        decrLineCursorPos()

        if (cursorPos.value[1] > textMatrix.value[cursorPos.value[0]].length)
            setCharCursorPos(textMatrix.value[cursorPos.value[0]].length)
    },
    39: incrCharCursorPos, // arrowRight
    40: () => { // arrowDown
        incrLineCursorPos()

        if (cursorPos.value[1] > textMatrix.value[cursorPos.value[0]].length)
            setCharCursorPos(textMatrix.value[cursorPos.value[0]].length)
    },
    13: () => { // enter
        insertLine()
        cursorPos.value[0]++
        setCharCursorPos(0)
    },
    8: handleBackSpace, // backspace
    35: () => { // end
        setCharCursorPos(textMatrix.value[cursorPos.value[0]].length)
    },
    36: () => { // home
        setCharCursorPos(0)
    }
}

function handleKeyBoard(ev) {
    ev.preventDefault()

    const keyCode = ev.keyCode
    let char = ev.key

    if (!isCharValid(keyCode))
        return


    if (typeof notPrint[keyCode] === "function") {
        notPrint[keyCode]()
        return
    }

    if (keyCode === 9) { // tab
        char = ''

        for (let counter = 1; counter <= 4; counter++) {
            insertChar(char)
            cursorPos.value[1]++
        }

        return
    }

    if (keyCode === 32) { // space
        char = ' '
    }

    insertChar(char)
    cursorPos.value[1]++
}

function handleBackSpace() {
    if (textMatrix.value.length === 1 && textMatrix.value[0].length === 0) {
        return
    }

    if (cursorPos.value[0] > 0 && cursorPos.value[1] === 0) {
        const deletedLine = textMatrix.value.splice(cursorPos.value[0], 1)[0]

        decrLineCursorPos()
        setCharCursorPos(textMatrix.value[cursorPos.value[0]].length)

        textMatrix.value[cursorPos.value[0]] = textMatrix.value[cursorPos.value[0]].concat(deletedLine)
        return
    }

    if (textMatrix.value.length === 1 && cursorPos.value[1] === 0)
        return


    if (cursorPos.value[1] < textMatrix.value[cursorPos.value[0]].length) {
        textMatrix.value[cursorPos.value[0]].splice(cursorPos.value[1] - 1, 1)
        decrCharCursorPos()
    } else {
        textMatrix.value[cursorPos.value[0]].pop()
        decrCharCursorPos()
    }
}

function setCharCursorPos(pos) {
    if (pos < 0)
        return 0

    cursorPos.value[1] = pos
}

// function setLineCursorPos(pos) {
//     if (pos <= 0)
//         return 0

//     cursorPos.value[0] = pos
// }

function decrCharCursorPos() {
    if (cursorPos.value[1] <= 0)
        return 0

    cursorPos.value[1]--
}

function decrLineCursorPos() {
    if (cursorPos.value[0] <= 0)
        return 0

    cursorPos.value[0]--
}

function incrLineCursorPos() {
    if (cursorPos.value[0] >= textMatrix.value.length - 1)
        return

    cursorPos.value[0]++
}

function incrCharCursorPos() {
    if (cursorPos.value[1] >= textMatrix.value[cursorPos.value[0]].length)
        return

    cursorPos.value[1]++
}

function insertLine() {
    const newLine = textMatrix.value[cursorPos.value[0]].splice(cursorPos.value[1], Infinity)

    textMatrix.value.splice(cursorPos.value[0] + 1, 0, newLine)
}

function insertChar(char) {
    textMatrix.value[cursorPos.value[0]].splice(cursorPos.value[1], 0, char)
}

function isCharValid(keyCode) {
    return (keyCode > 47 && keyCode < 58) || // number keys
        notPrint[keyCode] ||
        keyCode == 32 || keyCode == 9 ||
        keyCode == 226 ||
        (keyCode > 64 && keyCode < 91) || // letter keys
        (keyCode > 95 && keyCode < 112) || // numpad keys
        (keyCode > 185 && keyCode <= 193) || // ;=,-./` (in order)
        (keyCode > 218 && keyCode < 223) // [\]' (in order)
}



function highlightText() {
    let result = ''

    textMatrix.value.forEach((line, i) => {
        result += `<div class="line ${i === cursorPos.value[0] ? 'line-selected' : ''}">`
        result += `<span class="root">`

        line.forEach((char, j) => {
            if (i === cursorPos.value[0] && j === cursorPos.value[1]) {
                result += cursorHTML()
            }

            result += char.replace(' ', '&nbsp;').replaceAll('<', "&lt;").replaceAll('>', "&gt;")

            if (i === cursorPos.value[0] && j + 1 === cursorPos.value[1]) {
                result += cursorHTML()
            }
        })

        result += `</span>`
        result += '</div>'
    })

    return result
}

function renderText() {
    let result = ''

    textMatrix.value.forEach(line => {
        result += line.join('') + '\n'
    })

    return result
}

function parseText(text) {
    const lines = text.split('\n')

    lines.forEach((line, i) => {
        lines[i] = line.replace('\r', '').split('')
    })

    return lines
}

function cursorHTML() {
    return `<div id="cursor"></div>`
}

export {
    handleKeyBoard,
    highlightText,
    renderText,
    textMatrix,
    cursorPos,
    parseText
}