"use strict";

/* eslint-disable new-cap, no-underscore-dangle */

const escope = require("eslint-scope");
const { Definition, ParameterDefinition } = require("eslint-scope/lib/definition");
const OriginalPatternVisitor = require("eslint-scope/lib/pattern-visitor");
const Reference = require("eslint-scope/lib/reference");
const OriginalReferencer = require("eslint-scope/lib/referencer");
const Scope = require("eslint-scope/lib/scope").Scope;
const fallback = require("eslint-visitor-keys").getKeys;
const childVisitorKeys = require("./visitor-keys");

/** The scope class for enum. */
class EnumScope extends Scope {
    constructor(scopeManager, upperScope, block) {
        super(scopeManager, "enum", upperScope, block, false);
    }
}

class PatternVisitor extends OriginalPatternVisitor {
    Identifier(node) {
        super.Identifier(node);
        if (node.typeAnnotation) {
            this.rightHandNodes.push(node.typeAnnotation);
        }
    }

    ArrayPattern(node) {
        node.elements.forEach(this.visit, this);
        if (node.typeAnnotation) {
            this.rightHandNodes.push(node.typeAnnotation);
        }
    }

    ObjectPattern(node) {
        node.properties.forEach(this.visit, this);
        if (node.typeAnnotation) {
            this.rightHandNodes.push(node.typeAnnotation);
        }
    }
}

class Referencer extends OriginalReferencer {
    constructor(...args) {
        super(...args);
        this.typeMode = false;
    }

    /**
     * Override to use PatternVisitor we overrode.
     * @param {Identifier} node The Identifier node to visit.
     * @param {Object} [options] The flag to visit right-hand side nodes.
     * @param {Function} callback The callback function for left-hand side nodes.
     * @returns {void}
     */
    visitPattern(node, options, callback) {
        if (!node) {
            return;
        }

        if (typeof options === "function") {
            callback = options;
            options = { processRightHandNodes: false };
        }

        const visitor = new PatternVisitor(this.options, node, callback);
        visitor.visit(node);

        if (options.processRightHandNodes) {
            visitor.rightHandNodes.forEach(this.visit, this);
        }
    }

    /**
     * Override.
     * Visit `node.typeParameters` and `node.returnType` additionally to find `typeof` expressions.
     * @param {FunctionDeclaration|FunctionExpression|ArrowFunctionExpression} node The function node to visit.
     * @returns {void}
     */
    visitFunction(node) {
        const { type, id, typeParameters, params, returnType, body } = node;
        const scopeManager = this.scopeManager;
        const upperScope = this.currentScope();

        // Process the name.
        if (type === "FunctionDeclaration") {
            upperScope.__define(
                id,
                new Definition("FunctionName", id, node, null, null, null)
            );
        } else if (type === "FunctionExpression" && id) {
            scopeManager.__nestFunctionExpressionNameScope(node);
        }

        // Process the type parameters
        if (typeParameters) {
            this.visit(typeParameters);
        }

        // Open the function scope.
        scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);
        const innerScope = this.currentScope();

        // Process parameter declarations.
        for (let i = 0; i < params.length; ++i) {
            this.visitPattern(
                params[i],
                { processRightHandNodes: true },
                (pattern, info) => {
                    innerScope.__define(
                        pattern,
                        new ParameterDefinition(
                            pattern,
                            node,
                            i,
                            info.rest
                        )
                    );
                    this.referencingDefaultValue(
                        pattern,
                        info.assignments,
                        null,
                        true
                    );
                }
            );
        }

        // Process the return type.
        if (returnType) {
            this.visit(returnType);
        }

        // Process the body.
        if (body) {
            if (body.type === "BlockStatement") {
                this.visitChildren(body);
            } else {
                this.visit(body);
            }
        }

        // Close the function scope.
        this.close(node);
    }

    /**
     * Override.
     * Ignore it in the type mode.
     * @param {Identifier} node The Identifier node to visit.
     * @returns {void}
     */
    Identifier(node) {
        if (this.typeMode) {
            return;
        }
        super.Identifier(node);
    }

    /**
     * Override.
     * Don't make variable if `kind === "type"`.
     * It doesn't declare variables but declare types.
     * @param {VariableDeclaration} node The VariableDeclaration node to visit.
     * @returns {void}
     */
    VariableDeclaration(node) {
        if (node.kind !== "type") {
            super.VariableDeclaration(node);
            return;
        }

        // To detect typeof.
        this.typeMode = true;
        this.visitChildren(node);
        this.typeMode = false;
    }

    /**
     * Don't make variable because it declares only types.
     * Switch to the type mode and visit child nodes to find `typeof x` expression in type declarations.
     * @param {TSInterfaceDeclaration} node The TSInterfaceDeclaration node to visit.
     * @returns {void}
     */
    TSInterfaceDeclaration(node) {
        if (this.typeMode) {
            this.visitChildren(node);
        } else {
            this.typeMode = true;
            this.visitChildren(node);
            this.typeMode = false;
        }
    }

    /**
     * Switch to the type mode and visit child nodes to find `typeof x` expression in type declarations.
     * @param {TSTypeAnnotation} node The TSTypeAnnotation node to visit.
     * @returns {void}
     */
    TSTypeAnnotation(node) {
        if (this.typeMode) {
            this.visitChildren(node);
        } else {
            this.typeMode = true;
            this.visitChildren(node);
            this.typeMode = false;
        }
    }

    /**
     * Switch to the type mode and visit child nodes to find `typeof x` expression in type declarations.
     * @param {TSTypeParameterDeclaration} node The TSTypeParameterDeclaration node to visit.
     * @returns {void}
     */
    TSTypeParameterDeclaration(node) {
        if (this.typeMode) {
            this.visitChildren(node);
        } else {
            this.typeMode = true;
            this.visitChildren(node);
            this.typeMode = false;
        }
    }

    /**
     * Create reference objects for the references are in `typeof` expression.
     * @param {TSTypeQuery} node The TSTypeQuery node to visit.
     * @returns {void}
     */
    TSTypeQuery(node) {
        if (this.typeMode) {
            this.typeMode = false;
            this.visitChildren(node);
            this.typeMode = true;
        } else {
            this.visitChildren(node);
        }
    }

    /**
     * Create variable object for the enum.
     * The enum declaration creates a scope for the enum members.
     *
     * enum E {
     *   A,
     *   B,
     *   C = A + B // A and B are references to the enum member.
     * }
     *
     * const a = 0
     * enum E {
     *   A = a // a is above constant.
     * }
     *
     * @param {TSEnumDeclaration} node The TSEnumDeclaration node to visit.
     * @returns {void}
     */
    TSEnumDeclaration(node) {
        const { id, members } = node;
        const scopeManager = this.scopeManager;
        const scope = this.currentScope();

        if (id) {
            scope.__define(id, new Definition("EnumName", id, node));
        }

        scopeManager.__nestScope(new EnumScope(scopeManager, scope, node));
        for (const member of members) {
            this.visit(member);
        }
        this.close(node);
    }

    /**
     * Create variable object for the enum member and create reference object for the initializer.
     * And visit the initializer.
     *
     * @param {TSEnumMember} node The TSEnumMember node to visit.
     * @returns {void}
     */
    TSEnumMember(node) {
        const { id, initializer } = node;
        const scope = this.currentScope();

        scope.__define(id, new Definition("EnumMemberName", id, node));
        if (initializer) {
            scope.__referencing(
                id,
                Reference.WRITE,
                initializer,
                null,
                false,
                true
            );
            this.visit(initializer);
        }
    }
}

module.exports = function(ast, parserOptions, extraOptions) {
    const options = {
        ignoreEval: true,
        optimistic: false,
        directive: false,
        nodejsScope:
            ast.sourceType === "script" &&
            (parserOptions.ecmaFeatures &&
                parserOptions.ecmaFeatures.globalReturn) === true,
        impliedStrict: false,
        sourceType: extraOptions.sourceType,
        ecmaVersion: parserOptions.ecmaVersion || 2018,
        childVisitorKeys,
        fallback
    };

    const scopeManager = new escope.ScopeManager(options);
    const referencer = new Referencer(options, scopeManager);

    referencer.visit(ast);

    return scopeManager;
};
