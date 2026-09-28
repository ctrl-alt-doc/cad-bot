import type { ListResult, PageResult, SearchResult } from '../cad/types.js';
import { BRAND, type BrandConfig } from '../brand.js';
import { sectionText } from './sections.js';

export interface MessageData {
    content?: string;
    flags?: number;
    embeds?: unknown[];
    components?: unknown[];
}

export const EPHEMERAL = 64;

export const SEARCH_SELECT_ID = 'search-results';
const MAX_SELECT_OPTIONS = 10;

interface SelectOption {
    label: string;
    value: string;
    description?: string;
    default?: boolean;
}

interface SelectRow {
    type: 1;
    components: { type: 3; custom_id: string; placeholder: string; options: SelectOption[] }[];
}

const truncate = (value: string, length: number) => value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
const pageUrl = (slug: string, baseUrl: string, anchor?: string) => new URL(`/${slug}${anchor ? `#${anchor}` : ''}`, baseUrl).toString();

// Discord rejects the whole autocomplete response if any choice exceeds these limits.
const MAX_CHOICES = 25;
const MAX_CHOICE_LENGTH = 100;

export function autocompleteChoices(choices: { name: string; value: string }[]) {
    return choices
        .filter((choice) => choice.name && choice.value && choice.value.length <= MAX_CHOICE_LENGTH)
        .slice(0, MAX_CHOICES)
        .map((choice) => ({ name: truncate(choice.name, MAX_CHOICE_LENGTH), value: choice.value }));
}

export interface DocResult {
    title: string;
    section: string;
    breadcrumb: string[];
    summary: string;
    url: string;
    sinceVersion?: string;
}

export function docEmbed(doc: DocResult, brand: BrandConfig, summaryLength = 200) {
    const fields = [
        { name: 'Section', value: truncate(doc.breadcrumb.join(' › ') || doc.section, 1024), inline: true },
        ...(doc.sinceVersion ? [{ name: 'Version', value: `\`${truncate(doc.sinceVersion, 100)}+\``, inline: true }] : [])
    ];
    return {
        embeds: [{ color: brand.color, author: { name: truncate(`${BRAND.product} · ${doc.section}`, 256) }, title: truncate(doc.title, 256), description: truncate(doc.summary || 'Open the page for the full documentation.', summaryLength), fields, footer: { text: truncate(`${BRAND.name} · ${brand.docsHost}`, 2048), icon_url: brand.avatarUrl } }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Open page', url: doc.url }] }]
    };
}

export function formatPageResult(page: PageResult, baseUrl: string, brand: BrandConfig, header?: string) {
    const selected = header ? page.toc?.find((item) => item.id === header || item.title.toLowerCase() === header.toLowerCase()) : undefined;
    const doc = toDoc(page, baseUrl, page.section ?? 'Docs');

    if (selected) {
        doc.title = `${page.title} › ${selected.title}`;
        doc.summary = sectionText(page, selected) ?? 'Open the page to read this section.';
        doc.url = `${doc.url}#${selected.id}`;
    }

    // Embed descriptions allow 4096 characters; sectionText keeps sections well under that.
    return docEmbed(doc, brand, selected ? 4096 : undefined);
}

export function headerChoices(page: PageResult, query: string) {
    return autocompleteChoices((page.toc ?? [])
        .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
        .map((item) => ({ name: item.title, value: item.id })));
}

/** Keeps the typed question as the first choice so pressing Enter searches for it as written. */
export function queryChoices(query: string, titles: string[]) {
    const typed = query.trim();
    const typedChoice = typed ? [{ name: `Search: ${typed}`, value: truncate(typed, MAX_CHOICE_LENGTH) }] : [];

    return autocompleteChoices([
        ...typedChoice,
        ...titles.filter((title) => title.toLowerCase() !== typed.toLowerCase()).map((title) => ({ name: title, value: title }))
    ]);
}

/**
 * Shows the top result with a menu for switching to the others. `topPage` is the
 * top result's full page, when fetched, so a matched heading can show its section.
 */
export function formatSearchResults(results: SearchResult[], baseUrl: string, query: string, brand: BrandConfig, topPage?: PageResult) {
    if (!results.length) return noResultsEmbed(query, baseUrl, brand);
    const top = results[0]!;
    let message;
    if (topPage) {
        message = formatPageResult(topPage, baseUrl, brand, top.heading?.id);
    } else {
        const doc = toDoc(top, baseUrl, top.section ?? 'Docs');
        if (top.heading) {
            doc.title = resultTitle(top);
            doc.url = pageUrl(top.slug, baseUrl, top.heading.id);
        }
        message = docEmbed(doc, brand);
    }
    const select = searchResultSelect(results, resultValue(top.slug, top.heading?.id));
    return { ...message, components: [...(select ? [select] : []), ...message.components] };
}

/** A search result chosen from the menu, keeping the menu with the new choice selected. */
export function formatSelectedResult(page: PageResult, baseUrl: string, brand: BrandConfig, value: string, previousComponents: unknown) {
    const message = formatPageResult(page, baseUrl, brand, parseResultValue(value).header);
    const select = reselect(previousComponents, value);
    return { ...message, components: [...(select ? [select] : []), ...message.components] };
}

export const resultValue = (slug: string, headingId?: string) => headingId ? `${slug}#${headingId}` : slug;

export function parseResultValue(value: string): { slug: string; header?: string } {
    const [slug = '', header] = value.split(/#(.*)/s);
    return header ? { slug, header } : { slug };
}

const resultTitle = (result: SearchResult) => result.heading ? `${result.title} › ${result.heading.title}` : result.title;

function searchResultSelect(results: SearchResult[], selectedValue: string): SelectRow | undefined {
    const seen = new Set<string>();
    const options: SelectOption[] = [];

    for (const result of results) {
        const value = resultValue(result.slug, result.heading?.id);
        if (value.length > MAX_CHOICE_LENGTH || seen.has(value)) continue;
        seen.add(value);

        const option: SelectOption = { label: truncate(resultTitle(result), MAX_CHOICE_LENGTH), value, default: value === selectedValue };
        if (result.description) option.description = truncate(result.description, MAX_CHOICE_LENGTH);
        options.push(option);

        if (options.length === MAX_SELECT_OPTIONS) break;
    }

    return options.length > 1 ? selectRow(options) : undefined;
}

function reselect(components: unknown, value: string): SelectRow | undefined {
    if (!Array.isArray(components)) return undefined;

    for (const row of components as { components?: { custom_id?: string; options?: SelectOption[] }[] }[]) {
        const select = row.components?.find((component) => component.custom_id === SEARCH_SELECT_ID);
        if (select?.options) return selectRow(select.options.map((option) => ({ ...option, default: option.value === value })));
    }

    return undefined;
}

function selectRow(options: SelectOption[]): SelectRow {
    return { type: 1, components: [{ type: 3, custom_id: SEARCH_SELECT_ID, placeholder: 'Other matching pages', options }] };
}

export function errorMessage(brand: BrandConfig, explanation: string, title = "Couldn't reach the docs"): MessageData {
    return { flags: EPHEMERAL, embeds: [{ color: brand.color, title, description: explanation, footer: { text: `${BRAND.name} · ${brand.docsHost}`, icon_url: brand.avatarUrl } }] };
}

function noResultsEmbed(query: string, baseUrl: string, brand: BrandConfig) {
    return { embeds: [{ color: brand.color, author: { name: `${BRAND.product} · Search` }, title: truncate(`No matches for "${query}"`, 256), description: 'Try a broader search term or browse the documentation.', footer: { text: `${BRAND.name} · ${brand.docsHost}`, icon_url: brand.avatarUrl } }], components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Browse the docs', url: new URL('/', baseUrl).toString() }] }] };
}

function toDoc(item: PageResult | SearchResult | ListResult, baseUrl: string, fallbackSection: string, fallbackBreadcrumb?: string[]): DocResult {
    const doc: DocResult = { title: item.title, section: item.section ?? fallbackSection, breadcrumb: item.breadcrumb ?? fallbackBreadcrumb ?? [item.section ?? fallbackSection], summary: 'description' in item ? item.description || item.excerpt : '', url: pageUrl(item.slug, baseUrl) };
    if (item.sinceVersion) doc.sinceVersion = item.sinceVersion;
    return doc;
}
