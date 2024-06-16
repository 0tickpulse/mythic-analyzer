# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.2.0]

### Added

- Implemented the new `Logger#debug` method for `STDOUT_LOGGER`.
- Added the `RangedCompletionItems` type:

    ```ts
    type RangedCompletionItems = {
        range: Range;
        // pos: Position;
        items: CompletionItem[];
        conditions?: (ws: Workspace, doc: MythicDoc, position: Position) => boolean;
    };
    ```

    The LSP completion handler uses the conditions accordingly.

- Added the `SchemaObject#addCompletions` method:

    ```ts
    private addCompletions(
        ws: Workspace,
        doc: MythicDoc,
        value: YAMLMap.Parsed,
        properties: Record<string, SchemaObjectProperty>,
        keyPrefix = "",
    ): RangedCompletionItems[] {
    ```

- Added the `recursedPairs` function:

    ```ts
    function recursedPairs(map: YAMLMap.Parsed): Pair<ParsedNode, ParsedNode | null>[] {
    ```

### Changed

- Changed the `SchemaObject#findValueKey` method:

  - From:

    ```ts
    protected findValueKey(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        key: string,
    ): Pair<ParsedNode, ParsedNode | null> | null {
    ```

  - To:

    ```ts
    protected findValueKey(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        key: string,
    ): Pair<ParsedNode, ParsedNode | null>[] {
    ```

- Changed the `SchemaObject#nodeHasProperty` method:

  - From:

    ```ts
    protected nodeHasProperty(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        aliases: string[],
    ): Pair<ParsedNode, ParsedNode | null> | null {
    ```

  - To:

    ```ts
    protected nodeHasProperty(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        aliases: string[],
    ): Pair<ParsedNode, ParsedNode | null>[] {
    ```

- `SchemObject`s now completely operate using submapped properties. Exceptions for `SchemaMap`s are implemented directly in the class.

### Fixed

- Fixed some issues with calculations in the `posIsIn` function (especially when the range and position are in the same line).

## [0.1.1]

### Added

- Added the `SchemaObject#findValueKey` method.

### Changed

- Improved IntelliSense for field aliases, including better support for submapping.
- Changed the `SchemaObject#valueHasProperty` method:
  - From:

    ```ts
    protected valueHasProperty(
        ws: Workspace,
        doc: MythicDoc,
        value: YAMLMap.Parsed,
        key: string,
        properties: Record<string, SchemaObjectProperty>,
    ): boolean
    ```

  - To:

    ```ts
    protected nodeHasProperty(
        ws: Workspace,
        doc: MythicDoc,
        node: YAMLMap.Parsed | Pair<ParsedNode, ParsedNode | null>,
        aliases: string[],
    ): Pair<ParsedNode, ParsedNode | null> | null
    ```

### Fixed

- Fixed a bug where errors when reading a file would crash the Language Server.
- Fixed a bug where opening VSCode without a workspace open would crash the Language Server.

## [0.1.0] - 2024-05-30

### Added

- first version
