/** No build required. First-publication policy, equivalent to Kurone src/lib/publication.ts. */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicationDay = publicationDay;
exports.publicationFields = publicationFields;
exports.preparePublication = preparePublication;
/** Calendar day in the site's IANA zone, independent of the editing machine. */
function publicationDay(now, timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now);
    const get = (name) => parts.find((part) => part.type === name).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
}
function valueString(value) {
    return value instanceof Date ? value.toISOString().replace(/\.000Z$/, "Z") : String(value ?? "");
}
function instantText(text, key, value) {
    // Some YAML parsers return Dates. Preserve the author's valid offset spelling too.
    const match = new RegExp(`^(?:${key}|"${key}"|'${key}'):[ \\t]*["']?([^\\s"'#]+)`, "m").exec(text);
    const raw = match?.[1];
    return raw && Date.parse(raw) === Date.parse(valueString(value)) ? raw : valueString(value);
}
/** Rewrite only known scalar fields; unknown YAML, comments and the body survive. */
function publicationFields(text, changes) {
    const match = /^(---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(text);
    if (!match)
        throw new Error("publication.frontmatter");
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    let yaml = match[2];
    for (const [key, value] of Object.entries(changes)) {
        const re = new RegExp(`^(?:${key}|"${key}"|'${key}'):[^\\r\\n]*`, "m");
        const old = re.exec(yaml)?.[0];
        // Values here have already been validated; plain YAML timestamps become Dates in Astro.
        const comment = old?.match(/\s+#.*$/)?.[0] ?? "";
        const line = `${key}: ${value}${comment}`;
        yaml = old ? yaml.replace(re, () => line) : `${yaml}${nl}${line}`;
    }
    return match[1] + yaml + match[3] + text.slice(match[0].length);
}
/** Prepare at the actual publication boundary, never during an ordinary staged save. */
function preparePublication({ text, baseline, timeZone, now = new Date(), parse }) {
    const data = parse(text);
    const before = baseline == null ? null : parse(baseline);
    const changes = {};
    const rewrite = () => {
        if (!Object.keys(changes).length)
            return text;
        const output = publicationFields(text, changes);
        const check = parse(output);
        for (const [key, value] of Object.entries(changes)) {
            const actual = key === "published" || key === "updated" ? valueString(check[key]).slice(0, 10) : valueString(check[key]);
            const same = key.endsWith("At") ? Date.parse(actual) === Date.parse(String(value)) : actual === String(value);
            if (!same)
                throw new Error("publication.frontmatter");
        }
        return output;
    };
    const wasPublished = before !== null && before.draft !== true;
    if (!data.publishedAt && before?.publishedAt) {
        data.publishedAt = instantText(baseline, "publishedAt", before.publishedAt);
        changes.publishedAt = String(data.publishedAt);
    }
    // A withdrawal must not turn a legacy publication into a new first publication later.
    if (data.draft === true) {
        if (wasPublished && !data.publishedAt)
            changes.preservePublishedDate = true;
        return rewrite();
    }
    if (!data.publishedAt && !wasPublished && data.preservePublishedDate !== true) {
        if (baseline === undefined)
            throw new Error("publication.baseline");
        changes.published = publicationDay(now, timeZone);
        changes.publishedAt = now.toISOString().replace(/\.\d{3}Z$/, "Z");
        Object.assign(data, changes);
    }
    for (const [dateKey, instantKey] of [["published", "publishedAt"], ["updated", "updatedAt"]]) {
        const day = valueString(data[dateKey]).slice(0, 10);
        if (data[dateKey] != null && (!/^\d{4}-\d{2}-\d{2}$/.test(day) ||
            !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)) {
            throw new Error(`publication.${dateKey}`);
        }
        if (data[dateKey] != null)
            changes[dateKey] = day;
        if (!data[instantKey])
            continue;
        const instant = instantText(text, instantKey, data[instantKey]);
        if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(instant) ||
            !Number.isFinite(Date.parse(instant)) || publicationDay(new Date(instant), timeZone) !== day) {
            throw new Error(`publication.${instantKey}`);
        }
        // Repair quoted date scalars too: Astro's z.date() requires YAML timestamp values.
        changes[dateKey] = day;
        changes[instantKey] = instant;
    }
    return rewrite();
}
