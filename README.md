# Deprecated: TypeScript ESLint Parser

**Important:** This repository is no longer maintained and `typescript-eslint-parser` will not receive any future updates. There is an actively maintained fork of this project available at https://typescript-eslint.io and published on npm as `@typescript-eslint-parser`.

```diff
- typescript-eslint-parser
+ @typescript-eslint/parser
```

---

An ESLint custom parser which leverages [TypeScript ESTree](https://github.com/JamesHenry/typescript-estree) to allow for ESLint to lint TypeScript source code.


## Installation:

```sh
npm install --save-dev typescript-eslint-parser
```

## Usage

In your ESLint configuration file, set the `parser` property:

```json
{
    "parser": "typescript-eslint-parser"
}
```

There is sometimes an incorrect assumption that the parser itself is what does everything necessary to facilitate the use of ESLint with TypeScript. In actuality, it is the combination of the parser _and_ one or more plugins which allow you to maximize your usage of ESLint with TypeScript.

For example, once this parser successfully produces an AST for the TypeScript source code, it might well contain some information which simply does not exist in a standard JavaScript context, such as the data for a TypeScript-specific construct, like an `interface`.

The core rules built into ESLint, such as `indent` have no knowledge of such constructs, so it is impossible to expect them to work out of the box with them.

Instead, you also need to make use of one more plugins which will add or extend rules with TypeScript-specific features.

By far the most common case will be installing the [eslint-plugin-typescript](https://github.com/nzakas/eslint-plugin-typescript) plugin, but there are also other relevant options available such a [eslint-plugin-tslint](https://github.com/JamesHenry/eslint-plugin-tslint).

## Configuration

The following additional configuration options are available by specifying them in [`parserOptions`](https://eslint.org/docs/user-guide/configuring#specifying-parser-options) in your ESLint configuration file.

- **`jsx`** - default `false`. Enable parsing JSX when `true`. More details can be found [here](https://www.typescriptlang.org/docs/handbook/jsx.html).
    - It's `false` on `*.ts` files regardless of this option.
    - It's `true` on `*.tsx` files regardless of this option.
    - Otherwise, it respects this option.

- **`useJSXTextNode`** - default `true`. Please set `false` if you use this parser on ESLint v4. If this is `false`, the parser creates the AST of JSX texts as the legacy style.

### .eslintrc.json

```json
{
    "parser": "typescript-eslint-parser",
    "parserOptions": {
        "jsx": true,
        "useJSXTextNode": true
    }
}
```

## Supported TypeScript Version

We will always endeavor to support the latest stable version of TypeScript.

The version of TypeScript currently supported by this parser is `~3.2.1`. This is reflected in the `devDependency` requirement within the package.json file, and it is what the tests will be run against. We have an open `peerDependency` requirement in order to allow for experimentation on newer/beta versions of TypeScript.

If you use a non-supported version of TypeScript, the parser will log a warning to the console.

**Please ensure that you are using a supported version before submitting any issues/bug reports.**

## Integration Tests

We have a very flexible way of running integration tests which connects all of the moving parts of the usage of this parser in the ESLint ecosystem.

We run each test within its own docker container, and so each one has complete autonomy over what dependencies/plugins are installed and what versions are used. This also has the benefit of not bloating the `package.json` and `node_modules` of the parser project itself.

> If you are going to submit an issue related to the usage of this parser with ESLint, please consider creating a failing integration test which clearly demonstrates the behavior. It's honestly super quick!

You just need to duplicate one of the existing test sub-directories found in `tests/integration/`, tweak the dependencies and ESLint config to match what you need, and add a new entry to the docker-compose.yml file which matches the format of the existing ones.

Then run:

```sh
npm run integration-tests
```

If you ever need to change what gets installed when the docker images are built by docker-compose, you will first need to kill the existing containers by running:

```sh
npm run kill-integration-test-containers
```

## Build Commands

- `npm test` - run all linting and tests
- `npm run lint` - run all linting
- `npm run integration-tests` - run only integration tests

## License

TypeScript ESLint Parser is licensed under a permissive BSD 2-clause license.
