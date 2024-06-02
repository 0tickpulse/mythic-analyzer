# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [UNRELEASED]

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
