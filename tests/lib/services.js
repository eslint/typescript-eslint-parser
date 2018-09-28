/**
 * @fileoverview Tests for TypeScript-specific constructs
 * @author Benjamin Lichtman
 * @copyright jQuery Foundation and other contributors, https://jquery.org/
 * MIT License
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const path = require("path"),
    shelljs = require("shelljs"),
    testUtils = require("../../tools/test-utils");

//------------------------------------------------------------------------------
// Setup
//------------------------------------------------------------------------------

const FIXTURES_DIR = "./tests/fixtures/services";

const testFiles = shelljs.find(FIXTURES_DIR)
    .filter(filename => filename.indexOf(".src.ts") > -1)
    // strip off ".src.ts"
    .map(filename => filename.substring(FIXTURES_DIR.length - 1, filename.length - 7));

/**
 * @param {string} filename Full path to file being tested
 * @returns {Object} Config object
 */
function createConfig(filename) {
    return {
        filePath: filename,
        generateServices: true,
        project: "./tsconfig.json",
        tsconfigRootDir: path.resolve(FIXTURES_DIR)
    };
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("services", () => {

    testFiles.forEach(filename => {
        const fullFileName = `${path.resolve(FIXTURES_DIR, filename)}.src.ts`;
        const code = shelljs.cat(fullFileName);
        const config = createConfig(fullFileName);
        test(`fixtures/${filename}.src`, testUtils.createSnapshotTestBlock(code, config));
        test(`fixtures/${filename}.src services`, () => {
            testUtils.testServices(code, config);
        });
    });

});
