/**
 * @fileoverview Tests for visitor-keys alignment
 * @author Armano <https://github.com/armano2>
 * @copyright JS Foundation and other contributors, https://js.foundation//
 * MIT License
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { AST_NODE_TYPES } = require("typescript-estree/dist/ast-node-types");
const visitorKeys = require("../../visitor-keys");

//------------------------------------------------------------------------------
// Setup
//------------------------------------------------------------------------------

const astTypes = Object.keys(AST_NODE_TYPES);
astTypes.push("TSEmptyBodyFunctionExpression"); // node created by parser.js

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("visitor-keys", () => {

    for (const type of astTypes) {
        test(`type ${type} should be present in visitor-keys`, () => {
            expect(visitorKeys).toHaveProperty(type);
        });
    }

    test("check if there is no deprecated TS nodes", () => {
        const TSTypes = Object.keys(visitorKeys).filter(type => type.startsWith("TS"));
        expect(astTypes).toEqual(
            expect.arrayContaining(TSTypes),
        );
    });

});
