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
    EOLRegexp

    constructor(position, start, end, lineFeedCount, length, EOLRegexp) {
        this.position = position;
        this.start = start;
        this.end = end;
        this.lineFeedCount = lineFeedCount;
        this.length = length;
        this.EOLRegexp = EOLRegexp;
    }

    static findLineForOffset(lineStarts, offset) {
        // binary search
        let lo = 0;
        let hi = lineStarts.length - 1;
        if (offset < lineStarts[0]) return 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const v = lineStarts[mid];
            if (v === offset) return mid;
            if (v < offset) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        // after loop, hi is the last index with lineStarts[hi] <= offset
        return Math.max(0, hi);
    }

    slice(sliceStart, sliceEnd, buffers) {
        const buffer = buffers[this.position.type][this.position.bufferIndex];

        // baseOffset = absolute buffer offset of piece.start
        const baseOffset = buffer.lineStarts[this.start.line] + this.start.column;

        const absoluteStart = baseOffset + sliceStart;
        const absoluteEnd = baseOffset + sliceEnd;

        // clamp absoluteEnd to buffer length just in case
        const bufferLength = buffer.buffer.length;
        const absStartClamped = Math.max(0, Math.min(absoluteStart, bufferLength));
        const absEndClamped = Math.max(0, Math.min(absoluteEnd, bufferLength));

        // find lines for start and end using binary search in lineStarts
        const startLine = Piece.findLineForOffset(buffer.lineStarts, absStartClamped);
        const endLine = Piece.findLineForOffset(buffer.lineStarts, Math.max(0, absEndClamped - 1));

        const startColumn = absStartClamped - buffer.lineStarts[startLine];
        const endColumn = absEndClamped - buffer.lineStarts[endLine];

        // substring to compute newline count
        const text = buffer.buffer.substring(absStartClamped, absEndClamped);
        const newlineMatches = text.match(this.EOLRegexp);
        const newlineCount = (newlineMatches && newlineMatches.length) || 0;

        // The `endLine` computed from binary search is consistent with newlineCount,
        // but to be safe we calculate derivedEndLine:
        const derivedEndLine = startLine + newlineCount;
        // If derivedEndLine differs because of CRLF vs \n counting quirks, prefer the derived value
        const finalEndLine = derivedEndLine;
        const finalEndColumn = (absEndClamped - buffer.lineStarts[finalEndLine]);

        return new Piece(
            this.position,
            { line: startLine, column: startColumn },
            { line: finalEndLine, column: finalEndColumn },
            newlineCount,
            sliceEnd - sliceStart,
            this.EOLRegexp
        );
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

            const lineLength = chunks[i].lineStarts.length - 1
            const bufferLength = chunks[i].buffer.length

            const piece = new Piece(
                new PiecePosition(PieceNodeTypes.ORIGINAL, i),
                { line: 0, column: 0 },
                { line: lineLength, column: bufferLength - chunks[i].lineStarts[lineLength] },
                lineLength,
                bufferLength,
                textEditor.EOLRegexp
            );

            this.buffers.original.push(chunks[i])
            this.pieces.push(piece)
            this.lineCount += lineLength
            this.length += bufferLength
        }
    }

    insert(index, text) {
        if (text.length === 0)
            return

        const buffer = this.buffers.added[0]
        const startOffset = buffer.buffer.length
        const endOffset = startOffset + text.length

        this.appendToAddBuffer(text)

        const startLine = Piece.findLineForOffset(buffer.lineStarts, startOffset)
        const startColumn = startOffset - buffer.lineStarts[startLine]
        
        const newlineCount = (text.match(this.textEditor.EOLRegexp) || []).length
        const endLine = startLine + newlineCount
        const endColumn = endOffset - buffer.lineStarts[endLine]

        const newPiece = new Piece(
            new PiecePosition(PieceNodeTypes.ADDED, 0),
            {
                line: startLine,
                column: startColumn
            },
            {
                line: endLine,
                column: endColumn
            },
            newlineCount,
            text.length,
            this.textEditor.EOLRegexp
        )

        const newPieces = []
        let offset = 0
        let inserted = false

        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i]
            const pieceStart = offset
            const pieceEnd = offset + piece.length

            if (!inserted && index >= pieceStart && index <= pieceEnd) {
                const relativeOffset = index - pieceStart

                if (relativeOffset === 0) {
                    newPieces.push(newPiece)
                    newPieces.push(piece)
                } else if (relativeOffset === piece.length) {
                    newPieces.push(piece)
                    newPieces.push(newPiece)
                } else {
                    newPieces.push(
                        piece.slice(0, relativeOffset, this.buffers)
                    )

                    newPieces.push(newPiece)

                    newPieces.push(
                        piece.slice(relativeOffset, piece.length, this.buffers)
                    )
                }

                inserted = true
            } else {
                newPieces.push(piece)
            }

            offset += piece.length
        }

        if (!inserted)
            newPieces.push(newPiece)

        this.pieces = newPieces
        this.cachedLinesContent.clear()
        this.cachedLinesContentHighlighted.clear()
        this.computeBufferMetaData()
    }

    appendToAddBuffer(text) {
        const addedLineStarts = createLineStartsFast(text)
        const buffer = this.buffers.added[0]
        const bufferLength = buffer.buffer.length

        for (let i = 1; i < addedLineStarts.length; i++) {
            const newOffset = bufferLength + addedLineStarts[i]
            buffer.lineStarts.push(newOffset)
        }

        buffer.buffer += text
    }

    colaesceAdjacentPieces() {
        
    }

    delete(index, length) {
        const newPieces = [];
        let offset = 0;

        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i]
            const pieceStart = offset;
            const pieceEnd = offset + piece.length;

            const delStart = index;
            const delEnd = index + length;

            const hasOverlap = !(pieceEnd <= delStart || pieceStart >= delEnd);

            if (!hasOverlap) {
                newPieces.push(piece);
            } else {
                const leftLen = Math.max(0, delStart - pieceStart);
                const rightStart = Math.max(0, delEnd - pieceStart);
                const rightLen = piece.length - rightStart;

                if (leftLen > 0) {
                    newPieces.push(piece.slice(0, leftLen, this.buffers));
                }

                if (rightLen > 0) {
                    newPieces.push(piece.slice(rightStart, rightStart + rightLen, this.buffers));
                }
            }

            offset += piece.length
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
            lineContent += buffer.substring(pieceStartOffset, lineStarts[pieceStartLine + 1]).replace(this.textEditor.EOLRegexp, '')
            if (globalLine >= startLine && (endLine === null || globalLine <= endLine)) {
                lines[lineIndex++] = lineContent
                this.setLineContentInCache(globalLine, endLine, lineContent, false)
            }
            globalLine++

            for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
                lineContent = buffer.substring(lineStarts[line], lineStarts[line + 1]).replace(this.textEditor.EOLRegexp, '')
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
        let lineCount = 0

        for (let index = 0; index < this.pieces.length; index++) {
            const piece = this.pieces[index]

            if (line >= lineCount && line <= lineCount + piece.lineFeedCount)
                return { lineCount, offset, piece, index }

            offset += piece.length
            lineCount += piece.lineFeedCount
        }

        return null
    }

    getLineContent(line) {
        const cachedLine = this.getCachedLine(line)
        if (cachedLine !== null)
            return cachedLine

        const pieceData = this.findPieceByLine(line)

        if (!pieceData)
            return { content: '', isHighlighted: false }

        const { piece, lineCount, index } = pieceData

        line -= lineCount

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

                if (content.match(this.textEditor.EOLRegexp).length > 0) {
                    break
                }
            }
        } else {
            chunk = this.buffers[piece.position.type][piece.position.bufferIndex]
            content += chunk.buffer.substring(chunk.lineStarts[line], chunk.lineStarts[line + 1])
        }

        return { content: content.replace(this.textEditor.EOLRegexp, ''), isHighlighted: false }
    }

    getCachedLine(line) {
        if (this.cachedLinesContentHighlighted.get(line)) {
            return { content: this.cachedLinesContentHighlighted.get(line), isHighlighted: true }
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
        let linesContent = this.getLinesContent(startLine, endLine)
        linesContent = linesContent.join(this.textEditor.DEFAULT_EOL)
        return linesContent
    }

    computeBufferMetaData() {
        let lineCount = 0
        let length = 0

        for (let index = 0; index < this.pieces.length; index++) {
            const piece = this.pieces[index]

            lineCount += piece.lineFeedCount
            length += piece.length
        }

        this.lineCount = lineCount
        this.length = length
    }

    getBufferOffsetFromLineCol(line, col) {
        const pieceData = this.findPieceByLine(line)

        if (!pieceData)
            throw new Error("Piece not found for the given line.")

        const { piece, lineCount, offset } = pieceData
        const buffer = this.buffers[piece.position.type][piece.position.bufferIndex]

        return offset + buffer.lineStarts[line - lineCount] + col
    }

    /**
     * Normalizes EOLs in all buffers (original and added) to the given EOL,
     * or to this.textEditor.defaultEOL if not specified.
     */
    normalizeAllEOLs(targetEOL = null) {
        const eol = targetEOL || this.textEditor.defaultEOL

        // Normalize original buffers
        for (let i = 0; i < this.buffers.original.length; i++) {
            const buf = this.buffers.original[i];
            if (!buf) continue;
            buf.buffer = this.textEditor.normalizeEOL(buf.buffer, eol);
            buf.lineStarts = createLineStartsFast(buf.buffer);
        }

        // Normalize added buffers
        for (let i = 0; i < this.buffers.added.length; i++) {
            const buf = this.buffers.added[i];
            if (!buf) continue;
            buf.buffer = this.textEditor.normalizeEOL(buf.buffer, eol);
            buf.lineStarts = createLineStartsFast(buf.buffer);
        }

        // Clear caches and recompute metadata
        this.cachedLinesContent.clear();
        this.cachedLinesContentHighlighted.clear();
        this.computeBufferMetaData();
    }
}