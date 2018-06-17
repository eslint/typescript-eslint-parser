/**
 * @fileoverview Parser that converts TypeScript into ESTree format.
 * @author Nicholas C. Zakas
 * @author James Henry <https://github.com/JamesHenry>
 * @copyright jQuery Foundation and other contributors, https://jquery.org/
 * MIT License
 */

"use strict";

const astNodeTypes = require("./lib/ast-node-types"),
    ts = require("typescript"),
    convert = require("./lib/ast-converter"),
    semver = require("semver");

const SUPPORTED_TYPESCRIPT_VERSIONS = require("./package.json").devDependencies.typescript;
const ACTIVE_TYPESCRIPT_VERSION = ts.version;
const isRunningSupportedTypeScriptVersion = semver.satisfies(ACTIVE_TYPESCRIPT_VERSION, SUPPORTED_TYPESCRIPT_VERSIONS);

const WARNING_BORDER = "=============";
const DEFAULT_ESLINT_FILEPATH = "<text>";

let extra;
let warnedAboutTSVersion = false;
let warnedAboutJSXOverride = false;

/**
 * Resets the extra config object
 * @returns {void}
 */
function resetExtra() {
    extra = {
        tokens: null,
        range: false,
        loc: false,
        comment: false,
        comments: [],
        tolerant: false,
        errors: [],
        strict: false,
        ecmaFeatures: {},
        useJSXTextNode: false,
        log: console.log // eslint-disable-line no-console
    };
}

//------------------------------------------------------------------------------
// Parser
//------------------------------------------------------------------------------

/**
 * Parses the given source code to produce a valid AST
 * @param {mixed} code    TypeScript code
 * @param {Object} options configuration object for the parser
 * @param {Object} additionalParsingContext additional internal configuration
 * @returns {Object}         the AST
 */
function generateAST(code, options, additionalParsingContext) {
    additionalParsingContext = additionalParsingContext || {};

    const toString = String;

    if (typeof code !== "string" && !(code instanceof String)) {
        code = toString(code);
    }

    resetExtra();

    if (typeof options !== "undefined") {
        extra.range = (typeof options.range === "boolean") && options.range;
        extra.loc = (typeof options.loc === "boolean") && options.loc;

        if (extra.loc && options.source !== null && options.source !== undefined) {
            extra.source = toString(options.source);
        }

        if (typeof options.tokens === "boolean" && options.tokens) {
            extra.tokens = [];
        }

        if (typeof options.comment === "boolean" && options.comment) {
            extra.comment = true;
            extra.comments = [];
        }

        if (typeof options.tolerant === "boolean" && options.tolerant) {
            extra.errors = [];
        }

        const hasEcmaFeatures = options.ecmaFeatures && typeof options.ecmaFeatures === "object";

        // Allows user to parse a string of text passed on the command line in JSX mode.
        if (hasEcmaFeatures) {
            extra.ecmaFeatures.jsx = options.ecmaFeatures.jsx;
        }

        const hasFilePath = additionalParsingContext.isParseForESLint ? options.filePath !== DEFAULT_ESLINT_FILEPATH : options.filePath;
        const hasTsxExtension = hasFilePath && /.tsx$/.test(options.filePath);

        // Infer whether or not the parser should parse in "JSX mode" or not.
        // This will override the parserOptions.ecmaFeatures.jsx config option if a filePath is provided.
        if (hasFilePath) {
            extra.ecmaFeatures.jsx = hasTsxExtension;
        }

        /**
         * Allow the user to cause the parser to error if it encounters an unknown AST Node Type
         * (used in testing).
         */
        if (options.errorOnUnknownASTType) {
            extra.errorOnUnknownASTType = true;
        }

        if (typeof options.useJSXTextNode === "boolean" && options.useJSXTextNode) {
            extra.useJSXTextNode = true;
        }

        /**
         * Allow the user to override the function used for logging
         */
        if (typeof options.loggerFn === "function") {
            extra.log = options.loggerFn;
        } else if (options.loggerFn === false) {
            extra.log = Function.prototype;
        }

        /**
         * Provide the context as to whether or not we are parsing for ESLint,
         * specifically
         */
        if (additionalParsingContext.isParseForESLint) {
            extra.parseForESLint = true;
        }

        if (!warnedAboutJSXOverride && hasFilePath && hasEcmaFeatures && typeof options.ecmaFeatures.jsx !== "undefined") {
            const warning = [
                WARNING_BORDER,
                "typescript-eslint-parser will automatically detect whether it should be parsing in JSX mode or not based on file extension.",
                "Consider removing parserOptions.ecmaFeatures.jsx from your configuration, as it will be overridden by the extension of the file being parsed.",
                WARNING_BORDER
            ];

            extra.log(warning.join("\n\n"));
            warnedAboutJSXOverride = true;
        }
    }

    if (!isRunningSupportedTypeScriptVersion && !warnedAboutTSVersion) {
        const versionWarning = [
            WARNING_BORDER,
            "WARNING: You are currently running a version of TypeScript which is not officially supported by typescript-eslint-parser.",
            "You may find that it works just fine, or you may not.",
            `SUPPORTED TYPESCRIPT VERSIONS: ${SUPPORTED_TYPESCRIPT_VERSIONS}`,
            `YOUR TYPESCRIPT VERSION: ${ACTIVE_TYPESCRIPT_VERSION}`,
            "Please only submit bug reports when using the officially supported version.",
            WARNING_BORDER
        ];
        extra.log(versionWarning.join("\n\n"));
        warnedAboutTSVersion = true;
    }

    // Even if jsx option is set in typescript compiler, filename still has to
    // contain .tsx file extension
    const FILENAME = (extra.ecmaFeatures.jsx) ? "eslint.tsx" : "eslint.ts";

    const compilerHost = {
        fileExists() {
            return true;
        },
        getCanonicalFileName() {
            return FILENAME;
        },
        getCurrentDirectory() {
            return "";
        },
        getDefaultLibFileName() {
            return "lib.d.ts";
        },

        // TODO: Support Windows CRLF
        getNewLine() {
            return "\n";
        },
        getSourceFile(filename) {
            return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);
        },
        readFile() {
            return null;
        },
        useCaseSensitiveFileNames() {
            return true;
        },
        writeFile() {
            return null;
        }
    };

    const program = ts.createProgram([FILENAME], {
        noResolve: true,
        target: ts.ScriptTarget.Latest,
        jsx: extra.ecmaFeatures.jsx ? "preserve" : undefined
    }, compilerHost);

    const ast = program.getSourceFile(FILENAME);

    extra.code = code;
    return convert(ast, extra);
}

//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------

exports.version = require("./package.json").version;

exports.parse = function parse(code, options) {
    return generateAST(code, options, { isParseForESLint: false });
};

exports.parseForESLint = function parseForESLint(code, options) {
    const ast = generateAST(code, options, { isParseForESLint: true });
    return { ast };
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
