/**
 * @fileoverview Tools for running test cases
 * @author Nicholas C. Zakas
 * @author James Henry <https://github.com/JamesHenry>
 * @copyright jQuery Foundation and other contributors, https://jquery.org/
 * MIT License
 */

"use strict";

/* global expect */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const parser = require("../parser");

//------------------------------------------------------------------------------
//   Private
//--------------------------------------------------------------------------------

const defaultConfig = {
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true,
    errorOnUnknownASTType: true,
    sourceType: "module"
};

/**
 * Returns a raw copy of the given AST
 * @param  {Object} ast the AST object
 * @returns {Object}     copy of the AST object
 */
function getRaw(ast) {
    return JSON.parse(JSON.stringify(ast, (key, value) => {
        if ((key === "start" || key === "end") && typeof value === "number") {
            return undefined;
        }
        return value;
    }));
}

/**
 * Returns a function which can be used as the callback of a Jest test() block,
 * and which performs an assertion on the snapshot for the given code and config.
 * @param {string} code The source code to parse
 * @param {*} config the parser configuration
 * @returns {Function} callback for Jest test() block
 */
function createSnapshotTestBlock(code, config = {}) {
    config = Object.assign({}, defaultConfig, config);

    /**
     * @returns {Object} the AST object
     */
    function parse() {
        const ast = parser.parseForESLint(code, config).ast;
        return getRaw(ast);
    }

    return () => {
        try {
            const result = parse();
            expect(result).toMatchSnapshot();
        } catch (e) {
            /**
             * If we are deliberately throwing because of encountering an unknown
             * AST_NODE_TYPE, we rethrow to cause the test to fail
             */
            if (e.message.match("Unknown AST_NODE_TYPE")) {
                throw new Error(e);
            }
            expect(parse).toThrowErrorMatchingSnapshot();
        }
    };

}

/**
 * @param {string} code The code being parsed
 * @param {Object} config The configuration object for the parser
 * @returns {void}
 */
function testServices(code, config = {}) {
    config = Object.assign({}, defaultConfig, config);

    const services = parser.parseForESLint(code, config).services;
    expect(services).toBeDefined();
    expect(services.program).toBeDefined();
    expect(services.esTreeNodeToTSNodeMap).toBeDefined();
    expect(services.tsNodeToESTreeNodeMap).toBeDefined();
}

module.exports = {
    getRaw,
    createSnapshotTestBlock,
    testServices
};
