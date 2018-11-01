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
 * Formats the parser options object for typescript-estree
 * @param {Object} options - ESLint parser options object
 * @returns {Object} formatted typescript-estree options object
 */
function formatOptions(options) {
    const formattedOptions = Object.assign({}, options);

    if (options.ecmaFeatures) {
        delete formattedOptions.ecmaFeatures;

        if (options.ecmaFeatures.jsx) {
            formattedOptions.jsx = options.ecmaFeatures.jsx;
        }
    }

    return formattedOptions;
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

exports.version = require("./package.json").version;

exports.parseForESLint = function parseForESLint(code, options) {
    const ast = parse(code, formatOptions(options));
    traverser.traverse(ast, {
        enter: node => {
            if (node.type === "DeclareFunction" || node.type === "FunctionExpression" || node.type === "FunctionDeclaration") {
                if (!node.body) {
                    node.type = `TSEmptyBody${node.type}`;
                }
            }
        }
    });
    return { ast, visitorKeys };
};

exports.parse = function(code, options) {
    return this.parseForESLint(code, formatOptions(options)).ast;
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
