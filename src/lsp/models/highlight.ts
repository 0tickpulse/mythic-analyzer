import type {
    Range,
    SemanticTokenModifiers,
    SemanticTokenTypes,
} from "vscode-languageserver";

export class Highlight {
    public constructor(
        public range: Range,
        public color: SemanticTokenTypes,
        public modifiers: SemanticTokenModifiers[] = [],
    ) {}

    public colorIndex(colors: SemanticTokenTypes[]) {
        return colors.indexOf(this.color);
    }

    public modifierBitFlag(modifiers: SemanticTokenModifiers[]) {
        return this.modifiers.reduce((acc, m) => acc | (1 << modifiers.indexOf(m)), 0);
    }
}
