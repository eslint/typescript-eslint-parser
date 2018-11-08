/**
 * @fileoverview Tests for TSX-specific constructs
 * @author James Henry <https://github.com/JamesHenry>
 * @copyright jQuery Foundation and other contributors, https://jquery.org/
 * MIT License
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const
    assert = require("assert"),
    path = require("path"),
    { Linter } = require("eslint"),
    shelljs = require("shelljs"),
    parser = require("../../"),
    testUtils = require("../../tools/test-utils");

//------------------------------------------------------------------------------
// Setup
//------------------------------------------------------------------------------

const TSX_FIXTURES_DIR = "./tests/fixtures/tsx";

const testFiles = shelljs.find(TSX_FIXTURES_DIR)
    .filter(filename => filename.indexOf(".src.tsx") > -1)
    // strip off ".src.tsx"
    .map(filename => filename.substring(TSX_FIXTURES_DIR.length - 1, filename.length - 8));

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("TSX", () => {
    testFiles.forEach(filename => {
        const code = shelljs.cat(`${path.resolve(TSX_FIXTURES_DIR, filename)}.src.tsx`);
        const config = {
            useJSXTextNode: true,
            jsx: true
        };
        test(`fixtures/${filename}.src`, testUtils.createSnapshotTestBlock(code, config));
    });

    describe("if the filename ends with '.tsx', enable jsx option automatically.", () => {
        const linter = new Linter();
        linter.defineParser("typescript-eslint-parser", parser);

        test("anonymous", () => {
            const code = "const element = <T/>";
            const config = {
                parser: "typescript-eslint-parser"
            };
            const messages = linter.verify(code, config);

            assert.deepStrictEqual(
                messages,
                [{
                    column: 18,
                    fatal: true,
                    line: 1,
                    message: "Parsing error: '>' expected.",
                    ruleId: null,
                    severity: 2,
                    source: "const element = <T/>"
                }]
            );
        });

        test("test.ts", () => {
            const code = "const element = <T/>";
            const config = {
                parser: "typescript-eslint-parser"
            };
            const messages = linter.verify(code, config, { filename: "test.ts" });

            assert.deepStrictEqual(
                messages,
                [{
                    column: 18,
                    fatal: true,
                    line: 1,
                    message: "Parsing error: '>' expected.",
                    ruleId: null,
                    severity: 2,
                    source: "const element = <T/>"
                }]
            );
        });

        test("test.ts with 'jsx' option", () => {
            const code = "const element = <T/>";
            const config = {
                parser: "typescript-eslint-parser",
                parserOptions: {
                    jsx: true
                }
            };
            const messages = linter.verify(code, config, { filename: "test.ts" });

            assert.deepStrictEqual(messages, []);
        });

        test("test.tsx", () => {
            const code = "const element = <T/>";
            const config = {
                parser: "typescript-eslint-parser"
            };
            const messages = linter.verify(code, config, { filename: "test.tsx" });

            assert.deepStrictEqual(messages, []);
        });
    });
});
