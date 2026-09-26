import type { ListResult, PageResult, SearchResult, TocItem } from '../cad/types.js';
import { BRAND, type BrandConfig } from '../brand.js';

const truncate = (value: string, length: number) => value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
const pageUrl = (slug: string, baseUrl: string) => new URL(`/${slug}`, baseUrl).toString();

export interface DocResult {
    title: string;
    section: string;
    breadcrumb: string[];
    summary: string;
    url: string;
    sinceVersion?: string;
}

export function docEmbed(doc: DocResult, brand: BrandConfig) {
    const fields = [
        { name: 'Section', value: truncate(doc.breadcrumb.join(' › ') || doc.section, 1024), inline: true },
        ...(doc.sinceVersion ? [{ name: 'Version', value: `\`${truncate(doc.sinceVersion, 100)}+\``, inline: true }] : [])
    ];
    return {
        embeds: [{ color: brand.color, author: { name: truncate(`${BRAND.product} · ${doc.section}`, 256) }, title: truncate(doc.title, 256), description: truncate(doc.summary || 'Open the page for the full documentation.', 200), fields, footer: { text: truncate(`${BRAND.name} · ${brand.docsHost}`, 2048), icon_url: brand.avatarUrl } }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open page', url: doc.url }] }]
    };
}

export function formatPageResult(page: PageResult, baseUrl: string, brand: BrandConfig, header?: string) {
    const selected = header ? page.toc?.find((item) => item.id === header || item.title.toLowerCase() === header.toLowerCase()) : undefined;
    const doc = toDoc(page, baseUrl, page.section ?? 'Docs');

    if (selected) {
        doc.title = selected.title;
        doc.summary = sectionContent(page.content ?? '', page.toc ?? [], selected);
        doc.url = `${doc.url}#${selected.id}`;
    }

    return docEmbed(doc, brand);
}

export function headerChoices(page: PageResult, query: string) {
    return (page.toc ?? [])
        .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 25)
        .map((item) => ({ name: item.title, value: item.id }));
}

export function formatSearchResults(results: SearchResult[], baseUrl: string, query: string, brand: BrandConfig) {
    if (!results.length) return noResultsEmbed(query, baseUrl, brand);
    const response = docEmbed(toDoc(results[0]!, baseUrl, results[0]!.section ?? 'Docs'), brand);
    const additional = results.slice(1, 5);
    if (additional.length) response.embeds[0]!.fields!.push({ name: 'Also matching', value: additional.map((result) => `[${truncate(result.title, 256)}](${pageUrl(result.slug, baseUrl)})`).join('\n'), inline: false });
    return response;
}

export function errorResponse(brand: BrandConfig, explanation: string) {
    return { type: 4, data: { flags: 64, embeds: [{ color: brand.color, title: "Couldn't reach the docs", description: explanation, footer: { text: `${BRAND.name} · ${brand.docsHost}`, icon_url: brand.avatarUrl } }] } };
}

function noResultsEmbed(query: string, baseUrl: string, brand: BrandConfig) {
    return { embeds: [{ color: brand.color, author: { name: `${BRAND.product} · Search` }, title: truncate(`No matches for "${query}"`, 256), description: 'Try a broader search term or browse the documentation.', footer: { text: `${BRAND.name} · ${brand.docsHost}`, icon_url: brand.avatarUrl } }], components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Browse the docs', url: new URL('/', baseUrl).toString() }] }] };
}

function toDoc(item: PageResult | SearchResult | ListResult, baseUrl: string, fallbackSection: string, fallbackBreadcrumb?: string[]): DocResult {
    const doc: DocResult = { title: item.title, section: item.section ?? fallbackSection, breadcrumb: item.breadcrumb ?? fallbackBreadcrumb ?? [item.section ?? fallbackSection], summary: 'description' in item ? item.description || item.excerpt : '', url: pageUrl(item.slug, baseUrl) };
    if (item.sinceVersion) doc.sinceVersion = item.sinceVersion;
    return doc;
}

function sectionContent(content: string, toc: TocItem[], selected: TocItem) {
    if (!content) return `Section: ${selected.title}`;

    const heading = new RegExp(`^#{${selected.level}}\\s+${escapeRegExp(selected.title)}\\s*$`, 'im');
    const start = content.search(heading);
    if (start < 0) return `Section: ${selected.title}`;

    const afterHeading = content.slice(start).replace(/^.*\n/, '');
    const next = toc.find((item) => item.level <= selected.level && item.id !== selected.id && content.indexOf(`#${'#'.repeat(item.level - 1)} ${item.title}`, start + 1) > start);
    const end = next ? content.indexOf(`#${'#'.repeat(next.level - 1)} ${next.title}`, start + 1) : afterHeading.length;
    return afterHeading.slice(0, end < 0 ? undefined : end).replace(/[#*_`]/g, '').trim();
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
