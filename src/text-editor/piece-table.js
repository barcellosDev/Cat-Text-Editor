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
    EOLRegexp

    constructor(textEditor, chunks = []) {
        this.textEditor = textEditor
        this.EOLRegexp = new RegExp(textEditor.DEFAULT_EOL, 'g')

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
                chunks[i].buffer.length,
                this.EOLRegexp
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
            text.length,
            this.EOLRegexp
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
                    const newLineFeedCount = (currentPieceSubstring.match(this.EOLRegexp) || []).length

                    const currentPieceNewLine = currentPiece.start.line + newLineFeedCount
                    const currentPieceNewColumn = (currentPieceStartOffset + localIndex) - buffer.lineStarts[currentPieceNewLine]


                    newPieces.push(new Piece(
                        currentPiece.position,
                        currentPiece.start,
                        { line: currentPieceNewLine, column: currentPieceNewColumn },
                        newLineFeedCount,
                        localIndex,
                        this.EOLRegexp
                    ))
                }

                newPieces.push(newPiece)

                const remaining = currentPiece.length - localIndex

                if (remaining > 0) {

                    const buffer = this.buffers[currentPiece.position.type][currentPiece.position.bufferIndex]

                    const currentPieceStartOriginalOffset = buffer.lineStarts[currentPiece.start.line] + currentPiece.start.column
                    const currentPieceStartNewSubstring = buffer.buffer.substring(currentPieceStartOriginalOffset, currentPieceStartOriginalOffset + localIndex)
                    const newStartLineFeedCount = (currentPieceStartNewSubstring.match(this.EOLRegexp) || []).length

                    const currentPieceNewStartLine = currentPiece.start.line + newStartLineFeedCount
                    const currentPieceNewStartColumn = (currentPieceStartOriginalOffset + localIndex) - buffer.lineStarts[currentPieceNewStartLine]

                    const newStartOffset = buffer.lineStarts[currentPieceNewStartLine] + currentPieceNewStartColumn

                    const currentPieceEndNewSubstring = buffer.buffer.substring(newStartOffset, newStartOffset + remaining)
                    const newLineFeedCount = (currentPieceEndNewSubstring.match(this.EOLRegexp) || []).length

                    const currentPieceEndNewColumn = newStartOffset + remaining - buffer.lineStarts[newStartLineFeedCount + newLineFeedCount]


                    newPieces.push(new Piece(
                        currentPiece.position,
                        { line: currentPieceNewStartLine, column: currentPieceNewStartColumn },
                        { line: newStartLineFeedCount + newLineFeedCount, column: currentPieceEndNewColumn },
                        newLineFeedCount,
                        remaining,
                        this.EOLRegexp
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
        const newPieces = [];
        let offset = 0;

        for (const piece of this.pieces) {
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

            this.pieces = newPieces
            this.cachedLinesContent.clear()
            this.cachedLinesContentHighlighted.clear()
            this.computeBufferMetaData()
        }
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
            lineContent += buffer.substring(pieceStartOffset, lineStarts[pieceStartLine + 1]).replace(this.EOLRegexp, '')
            if (globalLine >= startLine && (endLine === null || globalLine <= endLine)) {
                lines[lineIndex++] = lineContent
                this.setLineContentInCache(globalLine, endLine, lineContent, false)
            }
            globalLine++

            for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
                lineContent = buffer.substring(lineStarts[line], lineStarts[line + 1]).replace(this.EOLRegexp, '')
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

                if (content.match(this.EOLRegexp).length > 0) {
                    break
                }
            }
        } else {
            chunk = this.buffers[piece.position.type][piece.position.bufferIndex]
            content += chunk.buffer.substring(chunk.lineStarts[line], chunk.lineStarts[line + 1])
        }

        return { content: content.replace(this.EOLRegexp, ''), isHighlighted: false }
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

    getLineColumnToBufferOffset(line, col) {
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