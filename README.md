# Mythic Analyzer

Mythic Analyzer is a library that provides a set of tools to analyze MythicMobs configurations.

## Installation

```bash
pnpm install mythic-analyzer
```

## Usage

### As a language server

```ts
import { STDOUT_LOGGER, Workspace } from "mythic-analyzer";
import { ProposedFeatures, createConnection } from "vscode-languageserver/node.js";

const workspace = new Workspace();
workspace.logger = STDOUT_LOGGER;
try {
    workspace.createLSP(createConnection(ProposedFeatures.all));
} catch (e) {
    console.error((e as any).stack);
}
```

## Credits

This library is based on this [library template](https://github.com/dzek69/ts-library-template).
