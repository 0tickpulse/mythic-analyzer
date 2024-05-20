import type {
    CodeDescription,
    Diagnostic,
    DiagnosticRelatedInformation,
    DiagnosticSeverity,
    DiagnosticTag,
} from "vscode-languageserver";
import type { Range } from "vscode-languageserver-textdocument";

const DIAGNOSTIC_DEFAULT: Partial<Diagnostic> = {
    source: "mythic-analyzer",
};

class MythicDiagnosticBuilder implements Diagnostic {
    public range: Range;

    public message: string;

    public severity?: DiagnosticSeverity;

    public code?: number | string;

    public codeDescription?: CodeDescription;

    public source?: string;

    public tags?: DiagnosticTag[];

    public relatedInformation?: DiagnosticRelatedInformation[];

    public constructor({
        message,
        range,
        severity,
        code,
        codeDescription,
        source,
        tags,
        relatedInformation,
    }: Diagnostic) {
        this.range = range;
        this.message = message;
        severity && (this.severity = severity);
        code && (this.code = code);
        codeDescription && (this.codeDescription = codeDescription);
        source && (this.source = source);
        tags && (this.tags = tags);
        relatedInformation && (this.relatedInformation = relatedInformation);
    }

    public setRange(range: Range): this {
        this.range = range;
        return this;
    }

    public setMessage(message: string): this {
        this.message = message;
        return this;
    }

    public setSeverity(severity: DiagnosticSeverity): this {
        this.severity = severity;
        return this;
    }

    public setCode(code: number | string): this {
        this.code = code;
        return this;
    }

    public setCodeDescription(codeDescription: CodeDescription): this {
        this.codeDescription = codeDescription;
        return this;
    }

    public setSource(source: string): this {
        this.source = source;
        return this;
    }

    public setTags(tags: DiagnosticTag[]): this {
        this.tags = tags;
        return this;
    }

    public setRelatedInformation(relatedInformation: DiagnosticRelatedInformation[]): this {
        this.relatedInformation = relatedInformation;
        return this;
    }

    public build(): Diagnostic {
        return {
            range: this.range,
            message: this.message,
            severity: this.severity,
            code: this.code,
            codeDescription: this.codeDescription,
            source: this.source,
            tags: this.tags,
            relatedInformation: this.relatedInformation,
        };
    }

    public clone(): MythicDiagnosticBuilder {
        return new MythicDiagnosticBuilder(this);
    }
}

export { DIAGNOSTIC_DEFAULT, MythicDiagnosticBuilder };
