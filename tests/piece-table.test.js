import { PieceTable } from '@/text-editor/piece-table';
import assert from 'assert'

const tests = [
    {
        type: 'SIMPLE',
        name: "Insert comma in middle",
        run: () => {
            let pt = new PieceTable(null, ["Hello World"]);
            pt.insert(5, ",");
            assert.strictEqual(pt.getText(), "Hello, World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert at start",
        run: () => {
            let pt = new PieceTable(null, ["World"]);
            pt.insert(0, "Hello ");
            assert.strictEqual(pt.getText(), "Hello World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert at end",
        run: () => {
            let pt = new PieceTable(null, ["Hello"]);
            pt.insert(5, " World");
            assert.strictEqual(pt.getText(), "Hello World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Middle character insert",
        run: () => {
            let pt = new PieceTable(null, ["Helo World"]);
            pt.insert(2, "l");
            assert.strictEqual(pt.getText(), "Hello World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Multiple inserts",
        run: () => {
            let pt = new PieceTable(null, ["GoodDay"]);
            pt.insert(4, " ");
            pt.insert(5, "Sir ");
            assert.strictEqual(pt.getText(), "Good Sir Day");
        }
    },
    {
        type: 'SIMPLE',
        name: "Basic deletion",
        run: () => {
            let pt = new PieceTable(null, ["Hello Beautiful World"]);
            pt.delete(5, 10);
            assert.strictEqual(pt.getText(), "Hello World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Delete at start",
        run: () => {
            let pt = new PieceTable(null, ["Delete me"]);
            pt.delete(0, 8);
            assert.strictEqual(pt.getText(), "e");
        }
    },
    {
        type: 'SIMPLE',
        name: "Delete at end",
        run: () => {
            let pt = new PieceTable(null, ["Hello World!"]);
            pt.delete(6, 6);
            assert.strictEqual(pt.getText(), "Hello ");
        }
    },
    {
        type: 'SIMPLE',
        name: "Full deletion",
        run: () => {
            let pt = new PieceTable(null, ["Erase it all"]);
            pt.delete(0, pt.getText().length);
            assert.strictEqual(pt.getText(), "");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert then delete",
        run: () => {
            let pt = new PieceTable(null, ["Hello World"]);
            pt.insert(5, ", Beautiful");
            pt.delete(5, 11);
            assert.strictEqual(pt.getText(), "Hello World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert and delete at same spot",
        run: () => {
            let pt = new PieceTable(null, ["Hello"]);
            pt.insert(5, " World");
            pt.delete(5, 6);
            assert.strictEqual(pt.getText(), "Hello");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert-delete-insert",
        run: () => {
            let pt = new PieceTable(null, ["123456"]);
            pt.insert(3, "ABC");         // 123ABC456
            pt.delete(2, 4);             // 12 456
            pt.insert(2, "XY");          // 12XY456
            assert.strictEqual(pt.getText(), "12XY456");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert-delete-insert-delete chain",
        run: () => {
            let pt = new PieceTable(null, ["abcdefghij"])
            pt.insert(5, "123");          // abcde123fghij
            pt.delete(2, 4);              // ab23fghij
            pt.insert(2, "XY");           // abXY23fghij
            pt.delete(4, 6);              // abXYj
            assert.strictEqual(pt.getText(), "abXYj");
        }
    },
    {
        type: 'SIMPLE',
        name: "Delete spans across original and add buffer",
        run: () => {
            let pt = new PieceTable(null, ["StartEnd"])
            pt.insert(5, "Middle");       // StartMiddleEnd
            pt.delete(3, 5);              // StadleEnd
            assert.strictEqual(pt.getText(), "StadleEnd");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert at every position in a loop",
        run: () => {
            let pt = new PieceTable(null, ["A"])
            for (let i = 1; i <= 5; i++) {
                pt.insert(i, i.toString());
            }
            assert.strictEqual(pt.getText(), "A12345");
        }
    },
    {
        type: 'SIMPLE',
        name: "Multiple deletes removing overlapping ranges",
        run: () => {
            let pt = new PieceTable(null, ["ABCDEFGHIJ"])
            pt.delete(2, 4);              // ABGHIJ
            pt.delete(2, 3);              // ABJ
            assert.strictEqual(pt.getText(), "ABJ");
        }
    },
    {
        type: 'SIMPLE',
        name: "Undo-like operation by reinserting deleted text",
        run: () => {
            let pt = new PieceTable(null, ["Undo Test"])
            pt.delete(0, 5);              // "Test"
            pt.insert(0, "Undo ");        // "Undo Test"
            assert.strictEqual(pt.getText(), "Undo Test");
        }
    },
    {
        type: 'SIMPLE',
        name: "Interleaved insert-delete at boundaries",
        run: () => {
            let pt = new PieceTable(null, ["----"])
            pt.insert(0, ">");
            pt.insert(5, "<");
            pt.delete(1, 4);              // delete the "----"
            assert.strictEqual(pt.getText(), "><");
        }
    },
    {
        type: 'SIMPLE',
        name: "Rebuild string from scratch with inserts only",
        run: () => {
            let pt = new PieceTable(null, [""])
            pt.insert(0, "W");
            pt.insert(1, "o");
            pt.insert(2, "r");
            pt.insert(3, "l");
            pt.insert(4, "d");
            assert.strictEqual(pt.getText(), "World");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert in middle after full delete",
        run: () => {
            let pt = new PieceTable(null, ["123456789"])
            pt.delete(0, 9);              // ""
            pt.insert(0, "abc");
            pt.insert(1, "Z");
            assert.strictEqual(pt.getText(), "aZbc");
        }
    },
    {
        type: 'SIMPLE',
        name: "Insert same string multiple times in different positions",
        run: () => {
            let pt = new PieceTable(null, ["ABCD"])
            pt.insert(1, "XY"); // AXYBCD
            pt.insert(5, "XY"); // AXYBCXYD
            pt.insert(8, "XY"); // // AXYBCXYDXY
            assert.strictEqual(pt.getText(), "AXYBCXYDXY");
        }
    },
    {
        type: 'SIMPLE',
        name: "Delete entire add buffer content",
        run: () => {
            let pt = new PieceTable(null, ["abc"])
            pt.insert(3, "XYZ");
            pt.delete(3, 3); // Delete "XYZ"
            assert.strictEqual(pt.getText(), "abc");
        }
    },
    {
        type: 'STRESS',
        name: "Randomized stress test with performance tracking",
        run: () => {
            console.time("Stress Test Time");
    
            let pt = new PieceTable(null, []);
            let reference = "";
    
            const randomChar = () => String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
            const randomText = () => Array.from({ length: Math.floor(Math.random() * 6) + 1 }, randomChar).join('');
    
            const steps = 100; // Increase for more stress
            for (let i = 0; i < steps; i++) {
                const op = Math.random() < 0.5 ? 'insert' : 'delete';
    
                if (op === 'insert' || reference.length === 0) {
                    const text = randomText();
                    const index = Math.floor(Math.random() * (reference.length + 1));
                    pt.insert(index, text);
                    reference = reference.slice(0, index) + text + reference.slice(index);
                } else {
                    const index = Math.floor(Math.random() * reference.length);
                    const maxLen = reference.length - index;
                    const len = Math.min(Math.floor(Math.random() * 6) + 1, maxLen);
                    pt.delete(index, len);
                    reference = reference.slice(0, index) + reference.slice(index + len);
                }
    
                const actual = pt.getText();
                assert.strictEqual(actual, reference, `Mismatch at step ${i}: expected "${reference}", got "${actual}"`);
            }
    
            console.timeEnd("Stress Test Time");
        }
    }
];

// ------------------- RUNNER -------------------

console.log("Running tests...");

for (const test of tests) {
    try {
        if (test.type === 'STRESS')
            console.log('\n ----- RUNNING STRESS TESTS -----\n')

        test.run()
        console.log(`✅ ${test.name}`)

    } catch (e) {
        throw new Error(`❌ ${test.name}`)
    }
}
