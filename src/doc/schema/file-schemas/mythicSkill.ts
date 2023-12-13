import Decimal from "decimal.js";
import { isScalar } from "yaml";

import { MythicSkill } from "../../../document-models/mythicskill.js";
import { DIAGNOSTIC_DEFAULT } from "../../../errors.js";
import { parseDocumentation } from "../../../util/documentationparser.js";
import { mdSeeAlso } from "../../../util/markdown.js";
import { SchemaBool } from "../base-types/bool.js";
import { SchemaList } from "../base-types/list.js";
import { SchemaMap } from "../base-types/map.js";
import { SchemaNumber } from "../base-types/number.js";
import { SchemaObject } from "../base-types/object.js";
import { SchemaString } from "../base-types/string.js";
import { SCHEMA_MYTHIC_SKILL_ID } from "../utility-types/mythicSkillId.js";
import { component } from "../utils/component.js";

export const MYTHIC_SKILL_SCHEMA = new SchemaMap(
    new SchemaObject({
        CancelIfNoTargets: {
            schema: new SchemaBool(),
            description:
                "Whether to cancel the skill if there are no targets."
                + mdSeeAlso("Skills/Metaskills#cancelifnotargets"),
        },
        OnCooldownSkill: {
            schema: SCHEMA_MYTHIC_SKILL_ID,
            description:
                "A skill to run instead if the skill is on cooldown."
                + mdSeeAlso("Skills/Metaskills#oncooldownskill"),
        },
        Cooldown: {
            schema: new SchemaNumber(0, undefined, true).onPartialProcess(
                (ws, doc, v, result) => {
                    if (!isScalar(v)) {
                        return;
                    }

                    const num = v.toJSON() as unknown;

                    if (typeof num !== "number") {
                        return;
                    }

                    const numDecimal = new Decimal(num);
                    const tickDurationDecimal = new Decimal(
                        ws.mythicData.tickDuration,
                    );

                    if (!numDecimal.modulo(tickDurationDecimal).isZero()) {
                        result.diagnostics.push({
                            ...DIAGNOSTIC_DEFAULT,
                            message: `Cooldown should be divisible by ${ws.mythicData.tickDuration} (1 tick).`,
                            range: doc.convertToRange(v.range),
                        });
                    }
                },
            ),
            required: false,
            description:
                "The cooldown of this skill in seconds."
                + mdSeeAlso("Skills/Metaskills#cooldown"),
        },
        Skills: {
            schema: new SchemaList(new SchemaString()),
            required: true,
            description:
                "The skills that this skill will use."
                + mdSeeAlso("Skills/Metaskills#skills"),
        },
        Conditions: {
            schema: new SchemaList(new SchemaString()),
            required: false,
            description:
                "The conditions that this skill will check on the **caster**."
                + mdSeeAlso("Skills/Metaskills#conditions"),
        },
        TargetConditions: {
            schema: new SchemaList(new SchemaString()),
            required: false,
            description:
                "The conditions that this skill will check on the **target**."
                + mdSeeAlso("Skills/Metaskills#targetconditions"),
        },
        TriggerConditions: {
            schema: new SchemaList(new SchemaString()),
            required: false,
            description:
                "The conditions that this skill will check on the **trigger**."
                + mdSeeAlso("Skills/Metaskills#triggerconditions"),
        },
    }).withName("mythic_skill_config"),
    (ws, doc, { commentBefore }, v) => {
        if (!commentBefore) {
            return undefined;
        }
        let documentation = parseDocumentation(commentBefore);
        documentation += "\n\n";
        documentation += mdSeeAlso("Skills/Metaskills");
        return documentation;
    },
).onPartialProcess(component(MythicSkill));
