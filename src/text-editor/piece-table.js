import { CatApp } from "./cat-app.js"
import { CharCode } from "./char-codes.js"

const PieceNodeTypes = Object.freeze({
    ORIGINAL: 'original',
    ADDED: 'added'
})

class Piece {
    position
    start
    end
    lineFeedCount
    length

    constructor(position, start, end, lineFeedCount, length) {
        this.position = position;
        this.start = start;
        this.end = end;
        this.lineFeedCount = lineFeedCount;
        this.length = length;
    }
}

class PiecePosition {
    type
    bufferIndex

    constructor(type, bufferIndex) {
        this.type = type
        this.bufferIndex = bufferIndex
    }
}

class StringBuffer {
    buffer
    lineStarts

    constructor(buffer = '', lineStarts = []) {
        this.buffer = buffer
        this.lineStarts = lineStarts
    }
}

function createLineStartsFast(str) {
    const lines = [0]
    let linesLength = 1

    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i)

        if (chr === CharCode.LineFeed) {
            lines[linesLength++] = i + 1
        }

        if (chr === CharCode.CarriageReturn) {
            if (i + 1 < str.length && str.charCodeAt(i + 1) === CharCode.LineFeed) {
                // Skip the next character as it's part of CRLF
                i++
            }
            lines[linesLength++] = i + 1
        }
    }

    return lines
}

export class PieceTable {
    pieces = []
    buffers = {
        added: [new StringBuffer('', [0])],
        original: []
    }

    lineCount = 1
    length = 0
    textEditor
    cachedLinesContent = new Map() // Cache for lines content
    cachedLinesContentHighlighted = new Map() // Cache for highlighted lines content

    constructor(textEditor, chunks = []) {
        this.textEditor = textEditor

        if (chunks.length === 0) {
            this.buffers.original[0] = new StringBuffer('', [0])
        }

        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i].length === 0)
                continue

            const lineStartsOffsetsArray = createLineStartsFast(chunks[i])
            chunks[i] = new StringBuffer(chunks[i], lineStartsOffsetsArray)

            const piece = new Piece(
                new PiecePosition(PieceNodeTypes.ORIGINAL, i),
                { line: 0, column: 0 },
                { line: chunks[i].lineStarts.length - 1, column: chunks[i].buffer.length - chunks[i].lineStarts[chunks[i].lineStarts.length - 1] },
                chunks[i].lineStarts.length - 1,
                chunks[i].buffer.length
            );

            this.buffers.original.push(chunks[i])
            this.pieces.push(piece)
            this.lineCount += chunks[i].lineStarts.length - 1
            this.length += chunks[i].buffer.length
        }
    }

    insert(index, text) {
        const lastLineIndex = this.buffers.added[0].lineStarts.length - 1
        const lastLineOffset = this.buffers.added[0].lineStarts[lastLineIndex]
        const lastLineColumnEnd = this.buffers.added[0].buffer.substring(lastLineOffset).length

        let lineStartsBufferToAppend = []

        const adddedBufferLines = createLineStartsFast(text)

        if (adddedBufferLines.length > 1) {
            lineStartsBufferToAppend = this.getNewLineStartsArrayOffsets(adddedBufferLines)
        }

        this.buffers.added[0].buffer += text
        this.buffers.added[0].lineStarts = this.buffers.added[0].lineStarts.concat(lineStartsBufferToAppend)

        const newPiece = new Piece(
            new PiecePosition(PieceNodeTypes.ADDED, 0),
            {
                line: lastLineIndex,
                column: lastLineColumnEnd
            },
            {
                line: this.buffers.added[0].lineStarts.length - 1,
                column: this.buffers.added[0].buffer.length - this.buffers.added[0].lineStarts[this.buffers.added[0].lineStarts.length - 1]
            },
            adddedBufferLines.length - 1,
            text.length
        )

        let newPieces = []
        let offset = 0

        for (let i = 0; i < this.pieces.length; i++) {
            const currentPiece = this.pieces[i]

            if (offset + currentPiece.length < index) {
                newPieces.push(currentPiece)
                offset += currentPiece.length
            } else {

                const localIndex = index - offset

                if (localIndex > 0) {
                    const buffer = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                    const currentPieceStartOffset = buffer.lineStarts[currentPiece.start.line] + currentPiece.start.column
                    const currentPieceSubstring = buffer.buffer.substring(currentPieceStartOffset, currentPieceStartOffset + localIndex)
                    const newLineFeedCount = (currentPieceSubstring.match(/\n/g) || []).length

                    const currentPieceNewLine = currentPiece.start.line + newLineFeedCount
                    const currentPieceNewColumn = (currentPieceStartOffset + localIndex) - buffer.lineStarts[currentPieceNewLine]


                    newPieces.push(new Piece(
                        currentPiece.position,
                        currentPiece.start,
                        { line: currentPieceNewLine, column: currentPieceNewColumn },
                        newLineFeedCount,
                        localIndex
                    ))
                }

                newPieces.push(newPiece)

                const remaining = currentPiece.length - localIndex

                if (remaining > 0) {

                    const buffer = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                    const currentPieceStartOriginalOffset = buffer.lineStarts[currentPiece.start.line] + currentPiece.start.column
                    const currentPieceStartNewSubstring = buffer.buffer.substring(currentPieceStartOriginalOffset, currentPieceStartOriginalOffset + localIndex)
                    const newStartLineFeedCount = (currentPieceStartNewSubstring.match(/\n/g) || []).length

                    const currentPieceNewStartLine = currentPiece.start.line + newStartLineFeedCount
                    const currentPieceNewStartColumn = (currentPieceStartOriginalOffset + localIndex) - buffer.lineStarts[currentPieceNewStartLine]

                    const newStartOffset = buffer.lineStarts[currentPieceNewStartLine] + currentPieceNewStartColumn

                    const currentPieceEndNewSubstring = buffer.buffer.substring(newStartOffset, newStartOffset + remaining)
                    const newLineFeedCount = (currentPieceEndNewSubstring.match(/\n/g) || []).length

                    const currentPieceEndNewColumn = newStartOffset + remaining - buffer.lineStarts[newStartLineFeedCount + newLineFeedCount]


                    newPieces.push(new Piece(
                        currentPiece.position,
                        { line: currentPieceNewStartLine, column: currentPieceNewStartColumn },
                        { line: newStartLineFeedCount + newLineFeedCount, column: currentPieceEndNewColumn },
                        newLineFeedCount,
                        remaining
                    ))
                }

                // Add remaining pieces as-is
                for (let j = i + 1; j < this.pieces.length; j++) {
                    newPieces.push(this.pieces[j])
                }
                this.pieces = newPieces
                this.cachedLinesContent.clear()
                this.cachedLinesContentHighlighted.clear()
                this.computeBufferMetaData()
                return
            }
        }

        newPieces.push(newPiece)
        this.pieces = newPieces
        this.cachedLinesContent.clear()
        this.cachedLinesContentHighlighted.clear()
        this.computeBufferMetaData()
    }

    getNewLineStartsArrayOffsets(addedLinesArrayOffsets) {
        const appendLineStartsArray = []
        const lastLineOffset = this.buffers.added[0].lineStarts[this.buffers.added[0].lineStarts.length - 1]
        const lastLineBufferLength = this.buffers.added[0].buffer.substring(lastLineOffset).length

        let lineLength = 0

        for (let i = 1; i < addedLinesArrayOffsets.length; i++) {
            const newOffset = lastLineOffset + lastLineBufferLength + addedLinesArrayOffsets[i]

            appendLineStartsArray[lineLength++] = newOffset
        }

        return appendLineStartsArray
    }


    delete(index, length) {
        let newPieces = [];
        let offset = 0;

        for (let i = 0; i < this.pieces.length; i++) {
            const currentPiece = this.pieces[i]
            const pieceStart = offset
            const pieceEnd = offset + currentPiece.length

            if (pieceEnd <= index || index + length <= pieceStart) {
                // the piece is outside the delete range
                newPieces.push(currentPiece)
            } else {
                const deleteStart = Math.max(index, pieceStart);
                const deleteEnd = Math.min(index + length, pieceEnd);

                const preDeleteLen = deleteStart - pieceStart;
                const postDeleteLen = pieceEnd - deleteEnd;

                if (preDeleteLen > 0) {
                    const buffer = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                    const currentPieceStartOffset = buffer.lineStarts[currentPiece.start.line] + currentPiece.start.column
                    const currentPieceSubstring = buffer.buffer.substring(currentPieceStartOffset, currentPieceStartOffset + preDeleteLen)
                    const newLineFeedCount = (currentPieceSubstring.match(/\n/g) || []).length

                    const currentPieceNewLine = currentPiece.start.line + newLineFeedCount
                    const currentPieceNewColumn = (currentPieceStartOffset + preDeleteLen) - buffer.lineStarts[currentPieceNewLine]

                    newPieces.push(new Piece(
                        currentPiece.position,
                        currentPiece.start,
                        { line: currentPieceNewLine, column: currentPieceNewColumn },
                        newLineFeedCount,
                        preDeleteLen
                    ))
                }

                if (postDeleteLen > 0) {
                    const buffer = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                    const currentPieceOriginalStartOffset = buffer.lineStarts[currentPiece.start.line] + currentPiece.start.column
                    const currentPieceNewStartOffset = currentPieceOriginalStartOffset + currentPiece.length - postDeleteLen

                    let currentPieceNewStartLine = currentPiece.start.line
                    let currentPieceNewStartColumn = currentPiece.start.column

                    if (currentPieceNewStartOffset >= currentPieceOriginalStartOffset) {
                        const bufferSubstring = buffer.buffer.substring(currentPieceOriginalStartOffset, currentPieceNewStartOffset)
                        const bufferSubstringLineCount = (bufferSubstring.match(/\n/g) || []).length

                        currentPieceNewStartLine += bufferSubstringLineCount
                        currentPieceNewStartColumn = currentPieceNewStartOffset - buffer.lineStarts[currentPieceNewStartLine]
                    } else {
                        const bufferSubstring = buffer.buffer.substring(currentPieceNewStartOffset, currentPieceOriginalStartOffset)
                        const bufferSubstringLineCount = (bufferSubstring.match(/\n/g) || []).length

                        currentPieceNewStartLine -= bufferSubstringLineCount
                        currentPieceNewStartColumn = currentPieceNewStartOffset - buffer.lineStarts[currentPieceNewStartLine]
                    }


                    const currentPieceNewEndBufferSubstring = buffer.buffer.substring(buffer.lineStarts[currentPieceNewStartLine], buffer.lineStarts[currentPieceNewStartLine] + postDeleteLen)
                    const bufferSubstringLineCount = (currentPieceNewEndBufferSubstring.match(/\n/g) || []).length

                    const currentPieceEndNewLine = currentPieceNewStartLine + bufferSubstringLineCount
                    const currentPieceEndNewColumn = (buffer.lineStarts[currentPieceNewStartLine] + postDeleteLen) - buffer.lineStarts[currentPieceEndNewLine]


                    newPieces.push(new Piece(
                        currentPiece.position,
                        {
                            line: currentPieceNewStartLine,
                            column: currentPieceNewStartColumn
                        },
                        {
                            line: currentPieceEndNewLine,
                            column: currentPieceEndNewColumn
                        },
                        bufferSubstringLineCount,
                        postDeleteLen
                    ))
                }
            }

            offset += currentPiece.length
        }

        this.pieces = newPieces
        this.cachedLinesContent.clear()
        this.cachedLinesContentHighlighted.clear()
        this.computeBufferMetaData()
    }

    setLineContentInCache(start, end, content, isHighlightCache) {
        const isFullRange = (start === 0 && (end === null || end >= this.lineCount - 1))
        if (!isFullRange) {
            if (isHighlightCache) {
                this.cachedLinesContentHighlighted.set(start, content)
            } else {
                this.cachedLinesContent.set(start, content)
            }
        }
    }
    
    getLinesContent(startLine = 0, endLine = null) {
        const lines = []
        let lineIndex = 0
        let lineContent = ''
        let globalLine = 0

        for (let index = 0; index < this.pieces.length; index++) {
            const piece = this.pieces[index]
            const chunk = this.buffers[piece.position.type][piece.position.bufferIndex]

            const buffer = chunk.buffer
            const lineStarts = chunk.lineStarts

            const pieceStartLine = piece.start.line
            const pieceStartCol = piece.start.column

            const pieceEndLine = piece.end.line
            const pieceEndCol = piece.end.column

            const pieceStartOffset = lineStarts[pieceStartLine] + pieceStartCol

            if (pieceStartLine === pieceEndLine) {
                // no new lines
                lineContent += buffer.substring(pieceStartOffset, pieceStartOffset + piece.length)
                continue
            }

            // add the text before the first line start in this piece
            lineContent += buffer.substring(pieceStartOffset, lineStarts[pieceStartLine + 1]).replace(/\n|\r\n/, '')
            if (globalLine >= startLine && (endLine === null || globalLine <= endLine)) {
                lines[lineIndex++] = lineContent
                this.setLineContentInCache(globalLine, endLine, lineContent, false)
            }
            globalLine++

            for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
                lineContent = buffer.substring(lineStarts[line], lineStarts[line + 1]).replace(/\n|\r\n/, '')
                if (globalLine >= startLine && (endLine === null || globalLine <= endLine)) {
                    lines[lineIndex++] = lineContent
                    this.setLineContentInCache(globalLine, endLine, lineContent, false)
                }
                globalLine++
            }

            lineContent = buffer.substring(lineStarts[pieceEndLine], lineStarts[pieceEndLine] + pieceEndCol)
        }

        if (globalLine >= startLine && (endLine === null || globalLine <= endLine)) {
            lines[lineIndex++] = lineContent
            this.setLineContentInCache(globalLine, endLine, lineContent, false)
        }

        return lines
    }

    getLinesContentHighlighted(startLine = 0, endLine = null) {
        return new Promise(resolve => {
            if (CatApp.highLightCodeThread !== null) {
                CatApp.highLightCodeThread.onmessage = (event) => {
                    const lines = []
                    const html = event.data
                    const linesElements = Array.from((new DOMParser()).parseFromString(html, 'text/html').querySelector('code').children)

                    let index = 0

                    for (let i = 0; i < linesElements.length; i++) {
                        const htmlContent = linesElements[i].innerHTML
                        lines[index++] = htmlContent
                        this.setLineContentInCache(startLine + i, endLine, htmlContent, true)
                    }

                    resolve(lines)
                }

                CatApp.highLightCodeThread.postMessage({
                    data: this.getText(startLine, endLine),
                    extension: this.textEditor.fileInfo.extension
                })

            } else {
                resolve(this.getLinesContent(startLine, endLine))
            }
        })
    }

    findPieceByLine(line) {
        let offset = 0

        for (let index = 0; index < this.pieces.length; index++) {
            const piece = this.pieces[index]

            if (line >= offset && line <= offset + piece.lineFeedCount)
                return { offset, piece }

            offset += piece.lineFeedCount
        }

        return null
    }

    getLineContent(line) {
        const cachedLine = this.getCachedLine(line)
        if (cachedLine !== null)
            return cachedLine

        const { piece, offset, index } = this.findPieceByLine(line)

        line -= offset

        let chunk = this.buffers[piece.position.type][piece.position.bufferIndex]

        let content = ''

        if (line == piece.end.line) {
            content += chunk.buffer.substring(chunk.lineStarts[piece.end.line], chunk.lineStarts[piece.end.line] + piece.end.column)

            for (let i = index + 1; i < this.pieces.length; i++) {
                const currentPiece = this.pieces[i]
                chunk = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                const buffer = chunk.buffer
                const lineStarts = chunk.lineStarts

                const pieceStartLine = currentPiece.start.line
                const pieceStartCol = currentPiece.start.column

                const pieceEndLine = currentPiece.end.line
                const pieceStartOffset = lineStarts[pieceStartLine] + pieceStartCol

                if (pieceStartLine === pieceEndLine) {
                    // no new lines
                    content += buffer.substring(pieceStartOffset, pieceStartOffset + currentPiece.length)
                    continue
                }

                content += buffer.substring(pieceStartOffset, lineStarts[currentPiece.start.line + 1])

                if (content.match(/\n|\r\n/g).length > 0) {
                    break
                }
            }
        } else {
            chunk = this.buffers[piece.position.type][piece.position.bufferIndex]
            content += chunk.buffer.substring(chunk.lineStarts[line], chunk.lineStarts[line + 1])
        }

        return { content: content.replace(/\n|\r\n/g, ''), isHighlighted: false }
    }

    getCachedLine(line) {
        if (this.cachedLinesContentHighlighted.get(line)) {
            return {  content: this.cachedLinesContentHighlighted.get(line), isHighlighted: true }
        }

        if (this.cachedLinesContent.get(line)) {
            return { content: this.cachedLinesContent.get(line), isHighlighted: false }
        }

        return null
    }

    getLineLength(line) {
        if (line > this.lineCount)
            return null

        const cachedLine = this.cachedLinesContent.get(line)

        if (cachedLine !== undefined) {
            return cachedLine.length
        }
        
        return this.getLineContent(line).content.length
    }

    getText(startLine = 0, endLine = null) {
        const linesContent = this.getLinesContent(startLine, endLine)
        return linesContent.join('\n')
    }

    computeBufferMetaData() {
        let lineCount = 1
        let length = 0

        for (let index = 0; index < this.pieces.length; index++) {
            const piece = this.pieces[index]

            lineCount += piece.lineFeedCount
            length += piece.length
        }

        this.lineCount = lineCount
        this.length = length
    }

    getLineColumnToBufferOffset(line, col) {
        let offset = 0
        let lineFeedCount = 0
        let foundPiece = null

        for (const piece of this.pieces) {
            if (line > lineFeedCount && line <= lineFeedCount + piece.lineFeedCount) {
                foundPiece = piece
                break
            }

            offset += piece.length
            lineFeedCount += piece.lineFeedCount
        }

        const buffer = this.buffers[foundPiece.position.type][foundPiece.position.bufferIndex]

        return offset + buffer.lineStarts[line - lineFeedCount] + col
    }
}