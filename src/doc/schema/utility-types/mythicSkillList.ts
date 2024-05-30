import { SemanticTokenTypes } from "vscode-languageserver";
import { isSeq } from "yaml";

import type { ParsedNode } from "yaml";
import type { Workspace } from "../../../index.js";
import type { MythicDoc, ValidationResult } from "../../index.js";

import { DIAGNOSTIC_DEFAULT } from "../../../index.js";
import { Highlight } from "../../../lsp/models/highlight.js";
import { LineConfig, LineToken } from "../../../mythicskills/lineconfig.js";
import { SkillMechanic } from "../../../mythicskills/skillmechanic.js";
import { nodePreciseSource } from "../../../util/yamlNodes.js";
import { SchemaList } from "../base-types/list.js";
import { SkillCondition } from "../../../mythicskills/skillcondition.js";

export class MythicSkillList extends SchemaList {
    public constructor(public supportsTriggers = true) {
        super();
    }

    public override internalName(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): string {
        return "list(skill)";
    }

    public override fullProcess(
        ws: Workspace,
        doc: MythicDoc,
        value: ParsedNode,
    ): ValidationResult {
        const result = super.fullProcess(ws, doc, value);
        if (!isSeq(value)) {
            return result;
        }

        ws.logger?.debug("Processing skill list");

        const items = value.items;
        for (const item of items) {
            MythicSkillList.parseSkill(ws, doc, item, result, this);
        }

        return result;
    }

    public static parseSkill(
        ws: Workspace,
        doc: MythicDoc,
        item: ParsedNode,
        result: ValidationResult,
        listSchema?: MythicSkillList,
    ): ValidationResult {
        const idxOffset = item.range[0];
        const source = LineConfig.unparseBlock(nodePreciseSource(doc, item));

        const split = source.split(" ");
        const mech = split[0]!;

        const skillConfig = new LineConfig(
            ws,
            doc,
            mech,
            idxOffset,
        ).addHighlights(ws, doc);
        if (skillConfig.main) {
            result.highlights.unshift(
                new Highlight(
                    doc.convertToRange(skillConfig.main.range),
                    SemanticTokenTypes.function,
                ),
            );
            result.completionItems.push({
                range: doc.convertToRange(skillConfig.main.range),
                items: [
                    {
                        label: "test",
                    },
                ],
            });
        }

        const skillMechanic = new SkillMechanic(source, skillConfig);

        let componentOffset = idxOffset;
        for (const [i, component] of split.entries()) {
            const adjustedOffset = LineConfig.createPos(source, componentOffset - idxOffset, idxOffset);
            if (component.startsWith("@")) {
                if (skillMechanic.targeter) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Only one targeter allowed per skill!`,
                        range: {
                            start: doc.convertToPosition(componentOffset),
                            end: doc.convertToPosition(
                                componentOffset
                                    + LineConfig.createPos(
                                        component,
                                        component.length,
                                        0,
                                    ),
                            ),
                        },
                        code: "mythic-skill-too-many-targeters",
                    });
                }

                const targeter = SkillMechanic.parseTargeter(
                    ws,
                    doc,
                    component,
                    adjustedOffset,
                ).addHighlights(ws, doc);
                skillMechanic.targeter = targeter;

                result.merge(targeter.result);
            }

            if (component.startsWith("~")) {
                if (skillMechanic.trigger) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Only one trigger allowed per skill!`,
                        range: {
                            start: doc.convertToPosition(componentOffset),
                            end: doc.convertToPosition(
                                componentOffset
                                    + LineConfig.createPos(
                                        component,
                                        component.length,
                                        0,
                                    ),
                            ),
                        },
                        code: "mythic-skill-too-many-triggers",
                    });
                }
                if (!(listSchema?.supportsTriggers ?? true)) {
                    result.diagnostics.push({
                        ...DIAGNOSTIC_DEFAULT,
                        message: `Triggers are not supported in this environment! (e.g. metaskills)`,
                        range: {
                            start: doc.convertToPosition(componentOffset),
                            end: doc.convertToPosition(
                                componentOffset
                                    + LineConfig.createPos(
                                        component,
                                        component.length,
                                        0,
                                    ),
                            ),
                        },
                        code: "mythic-skill-triggers-not-allowed",
                    });
                }

                const trigger = SkillMechanic.parseTrigger(
                    ws,
                    doc,
                    component,
                    adjustedOffset,
                ).addHighlights(ws, doc);

                skillMechanic.trigger = trigger;
                result.merge(trigger.result);
            }

            if (!component.startsWith("=") && !component.startsWith(">") && !component.startsWith("<")) {
                if (component.startsWith("?")) {
                    const condition = new SkillCondition(
                        ws,
                        doc,
                        component,
                        adjustedOffset,
                    ).addHighlights(ws, doc);

                    skillMechanic.conditions.push(condition);
                    result.merge(condition.result);
                } else if (/^[-]?[0-9]*[.]?[0-9]+$/.test(component)) {
                    if (skillMechanic.chanceToken) {
                        result.diagnostics.push({
                            ...DIAGNOSTIC_DEFAULT,
                            message: `Only one chance allowed per skill!`,
                            range: {
                                start: doc.convertToPosition(componentOffset),
                                end: doc.convertToPosition(
                                    componentOffset
                                        + LineConfig.createPos(
                                            component,
                                            component.length,
                                            0,
                                        ),
                                ),
                            },
                            code: "mythic-skill-too-many-chance-tokens",
                        });
                    }

                    skillMechanic.chanceToken = new LineToken(
                        component,
                        [
                            LineConfig.createPos(component, 0, adjustedOffset),
                            LineConfig.createPos(component, component.length, adjustedOffset),
                            LineConfig.createPos(component, component.length, adjustedOffset),
                        ],
                    );
                    skillMechanic.chanceToken.addHighlight(ws, doc, result, SemanticTokenTypes.number);

                    // Check if the mechanic matches 'delay' and chance is on the first component
                    const isDelay = mech === "delay" && i === 0;

                    const chance = parseFloat(component);
                    if ((chance < 0 || chance > 1) && !isDelay) {
                        result.diagnostics.push({
                            ...DIAGNOSTIC_DEFAULT,
                            message: `Chance must be between 0 and 1!`,
                            range: doc.convertToRange(skillMechanic.chanceToken.range),
                            code: "mythic-skill-invalid-chance",
                        });
                    }
                }
            }

            componentOffset += component.length + 1;
        }

        result.merge(skillConfig.result);
        return result;
    }
}
