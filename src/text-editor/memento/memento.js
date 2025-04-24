// Memento: Stores state and timestamp
class Memento {
    constructor(content) {
        this.content = content;
        this.timestamp = new Date(); // Store when the state was saved
    }

    getContent() {
        return this.content;
    }

    getTimestamp() {
        return this.timestamp;
    }
}

// Originator: The text editor
class TextEditor {
    constructor() {
        this.content = "";
    }

    write(text) {
        this.content = text;
    }

    save() {
        return new Memento(this.content); // Create a new snapshot
    }

    restore(memento) {
        this.content = memento.getContent(); // Restore to a previous state
    }

    getContent() {
        return this.content;
    }
}

// Caretaker: Manages undo/redo with a history stack
class History {
    constructor() {
        this.undoStack = []; // Store past states for undo
        this.redoStack = []; // Store undone states for redo
    }

    save(memento) {
        this.undoStack.push(memento); // Save new state
        this.redoStack = []; // Clear redo history on new save
    }

    undo() {
        if (this.undoStack.length > 1) {
            this.redoStack.push(this.undoStack.pop()); // Move last state to redo stack
            return this.undoStack[this.undoStack.length - 1]; // Return previous state
        }
        return null; // No more undos available
    }

    redo() {
        if (this.redoStack.length > 0) {
            const redoMemento = this.redoStack.pop(); // Get the last undone state
            this.undoStack.push(redoMemento); // Move it back to undo stack
            return redoMemento;
        }
        return null; // No more redos available
    }

    printHistory() {
        console.log("History States:");
        this.undoStack.forEach((memento, index) => {
            console.log(`${index + 1}: ${memento.getContent()} (Saved at: ${memento.getTimestamp()})`);
        });
    }
}

// Usage Example
const editor = new TextEditor();
const history = new History();

editor.write("Version 1");
history.save(editor.save());

editor.write("Version 2");
history.save(editor.save());

editor.write("Version 3");
history.save(editor.save());

console.log("Current Content:", editor.getContent()); // Output: Version 3

// Undo 1 step
const undo1 = history.undo();
if (undo1) editor.restore(undo1);
console.log("After Undo 1:", editor.getContent()); // Output: Version 2

// Undo 2nd step
const undo2 = history.undo();
if (undo2) editor.restore(undo2);
console.log("After Undo 2:", editor.getContent()); // Output: Version 1

// Redo 1 step
const redo1 = history.redo();
if (redo1) editor.restore(redo1);
console.log("After Redo 1:", editor.getContent()); // Output: Version 2

// Print history
history.printHistory();
