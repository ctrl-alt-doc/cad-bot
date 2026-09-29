import type { PageResult, TocItem } from '../cad/types.js';

const MAX_SECTION_LENGTH = 1500;

const HTML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#039': "'", '#39': "'", nbsp: ' ' };

// Matches CAD's table-of-contents titles, which drop inline Markdown.
const plain = (value: string) => value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '').trim().toLowerCase();

// Rendered pages always contain heading tags with the anchor IDs the table of contents refers to.
const isHtml = (content: string) => /<h[1-6]\b[^>]*\bid=/i.test(content);

/**
 * The text of one section of a page, formatted for a Discord embed. CAD sites
 * send Markdown as `markdown`; some send it as `content`, where others send HTML.
 */
export function sectionText(page: PageResult, selected: TocItem): string | undefined {
    const markdown = page.markdown ?? (page.content && !isHtml(page.content) ? page.content : undefined);
    const text = markdown !== undefined
        ? fromMarkdown(markdown, page.toc ?? [], selected)
        : page.content ? fromHtml(page.content, selected) : undefined;

    return text ? truncateMarkdown(text, MAX_SECTION_LENGTH) : undefined;
}

function fromMarkdown(markdown: string, toc: TocItem[], selected: TocItem): string | undefined {
    // Pages can repeat a heading, so find the same occurrence the table of contents refers to.
    const index = toc.findIndex((item) => item.id === selected.id);
    const occurrence = toc
        .slice(0, Math.max(index, 0))
        .filter((item) => item.level === selected.level && plain(item.title) === plain(selected.title)).length;

    const lines = markdown.split('\n');
    let fence: string | undefined;
    let seen = 0;
    let start = -1;
    let end = lines.length;

    for (const [lineIndex, line] of lines.entries()) {
        const fenceMatch = /^\s*(```|~~~)/.exec(line);
        if (fenceMatch) {
            if (!fence) fence = fenceMatch[1];
            else if (line.trim().startsWith(fence)) fence = undefined;
            continue;
        }
        if (fence) continue;

        const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
        if (!heading) continue;

        const level = heading[1]!.length;
        if (start < 0) {
            if (level === selected.level && plain(heading[2]!) === plain(selected.title) && seen++ === occurrence) start = lineIndex;
        } else if (level <= selected.level) {
            end = lineIndex;
            break;
        }
    }

    return start < 0 ? undefined : toDiscordMarkdown(lines.slice(start + 1, end));
}

/** Discord embeds render most Markdown, but not headings, directives, or embedded components. */
function toDiscordMarkdown(lines: string[]): string {
    const output: string[] = [];
    let inFence = false;

    for (const line of lines) {
        if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;

        if (inFence || /^\s*(```|~~~)/.test(line)) {
            output.push(line);
            continue;
        }

        const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
        // `:::tip[Title]` opens a block labelled "Title", `:::tip` one labelled "Tip"; a bare `:::` closes it.
        const directive = /^\s*:::(\w*)(?:\[(.*)\])?/.exec(line);

        if (heading) output.push(`**${heading[1]}**`);
        else if (directive) {
            const [, name = '', title] = directive;
            const label = title || (name && `${name[0]!.toUpperCase()}${name.slice(1)}`);
            if (label) output.push(`**${label}**`);
        } else if (!/^\s*</.test(line)) output.push(line);
    }

    return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Fallback for CAD versions that only return rendered HTML. */
function fromHtml(html: string, selected: TocItem): string | undefined {
    const open = new RegExp(`<h${selected.level}\\b[^>]*\\bid="${escapeRegExp(selected.id)}"`, 'i');
    const start = html.search(open);
    if (start < 0) return undefined;

    const closingTag = `</h${selected.level}>`;
    const headingEnd = html.indexOf(closingTag, start);
    if (headingEnd < 0) return undefined;

    const rest = html.slice(headingEnd + closingTag.length);
    const next = rest.search(new RegExp(`<h[1-${selected.level}]\\b`, 'i'));

    return (next < 0 ? rest : rest.slice(0, next))
        .replace(/<(svg|button|script|style)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<span class="code-language">[\s\S]*?<\/span>/gi, '')
        .replace(/<\/(p|div|li|pre|tr|h\d)>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&(#?\w+);/g, (entity, name: string) => HTML_ENTITIES[name] ?? entity)
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** Truncates without leaving a code block open, which would break the rest of the embed. */
export function truncateMarkdown(text: string, length: number): string {
    if (text.length <= length) return text;

    const reserve = 8;
    let cut = text.slice(0, length - reserve);
    const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
    if (lastBreak > cut.length / 2) cut = cut.slice(0, lastBreak);
    cut = cut.trimEnd();

    const openFence = (cut.match(/```/g)?.length ?? 0) % 2 === 1;

    return openFence ? `${cut}\n\`\`\`\n…` : `${cut}…`;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
