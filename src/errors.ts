import type { Diagnostic } from "vscode-languageserver";

export const DIAGNOSTIC_DEFAULT: Partial<Diagnostic> = {
    source: "mythic-analyzer",
};
