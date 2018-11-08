/**
 * @fileoverview Parser that converts TypeScript into ESTree format.
 * @author Nicholas C. Zakas
 * @author James Henry <https://github.com/JamesHenry>
 * @copyright jQuery Foundation and other contributors, https://jquery.org/
 * MIT License
 */

"use strict";

const parse = require("typescript-estree").parse;
const astNodeTypes = require("typescript-estree").AST_NODE_TYPES;
const traverser = require("eslint/lib/util/traverser");
const visitorKeys = require("./visitor-keys");

/**
 * Create a syntax error object.
 * @param {ASTNode} node The node that caused the error.
 * @param {string} message The error message.
 * @returns {SyntaxError} The created error.
 */
function newSyntaxError(node, message) {
    const error = new SyntaxError(message);
    error.index = node.range[0];
    error.lineNumber = node.loc.start.line;
    error.column = node.loc.start.column + 1;

    return error;
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

exports.version = require("./package.json").version;

exports.parseForESLint = function parseForESLint(code, options) {
    const ast = parse(code, options);
    traverser.traverse(ast, {
        enter: node => {
            switch (node.type) {
                // Just for backword compatibility.
                case "DeclareFunction":
                    if (!node.body) {
                        node.type = `TSEmptyBody${node.type}`;
                    }
                    break;

                // Function#body cannot be null in ESTree spec.
                case "FunctionExpression":
                case "FunctionDeclaration":
                    if (!node.body) {
                        node.type = `TSEmptyBody${node.type}`;
                    }
                    break;

                // VariableDeclaration that doesn't have any declarations is syntax error.
                case "VariableDeclaration":
                    if (node.declarations.length === 0) {
                        throw newSyntaxError(node, `'${node.kind}' declarations require one or more declarator(s).`);
                    }
                    break;

                // no default
            }
        }
    });
    return { ast, visitorKeys };
};

exports.parse = function(code, options) {
    return this.parseForESLint(code, options).ast;
};

// Deep copy.
/* istanbul ignore next */
exports.Syntax = (function() {
    let name,
        types = {};

    if (typeof Object.create === "function") {
        types = Object.create(null);
    }

    for (name in astNodeTypes) {
        if (astNodeTypes.hasOwnProperty(name)) {
            types[name] = astNodeTypes[name];
        }
    }

    if (typeof Object.freeze === "function") {
        Object.freeze(types);
    }

    return types;
}());
