import type { PageListResult, PageResult, SearchResult } from '../cad/types.js';

const MAX_DISCORD_MESSAGE_LENGTH = 2000;

export function formatPageResult(page: PageResult, baseUrl: string): string {
    const url = new URL(`/${page.slug}`, baseUrl);
    const lines = [`**${page.title}**`];

    if (page.description) {
        lines.push(page.description);
    }

    if (page.excerpt) {
        lines.push(page.excerpt);
    }

    lines.push(`[read the docs](${url.toString()})`);

    return lines.join('\n\n');
}

export function formatPageList(result: PageListResult, baseUrl: string): string {
    const { category, pages } = result;
    const pageLabel = pages.length === 1 ? 'page' : 'pages';
    const heading = `${category.title} ${pageLabel} (${pages.length})`;
    const entries = pages.map((page) => {
        const url = new URL(`/${page.slug}`, baseUrl);

        return `**${page.title}** [read the docs](${url.toString()})`;
    });

    const completeMessage = [heading, ...entries].join('\n\n');

    if (completeMessage.length <= MAX_DISCORD_MESSAGE_LENGTH) {
        return completeMessage;
    }

    for (let includedCount = entries.length - 1; includedCount >= 0; includedCount -= 1) {
        const omittedCount = entries.length - includedCount;
        const omittedLabel = omittedCount === 1 ? 'page' : 'pages';
        const notice = `…and ${omittedCount} more ${omittedLabel} were not shown.`;
        const message = [heading, ...entries.slice(0, includedCount), notice].join('\n\n');

        if (message.length <= MAX_DISCORD_MESSAGE_LENGTH) {
            return message;
        }
    }

    return heading;
}

export function formatSearchResults(
    results: SearchResult[],
    baseUrl: string,
    query: string
): string {
    const resultLabel = results.length === 1 ? 'result' : 'results';
    const heading = `Search results for “${query}” (${results.length} ${resultLabel})`;
    const multipleResults = results.length > 1;
    const entries = results.map((result) => {
        const url = new URL(`/${result.slug}`, baseUrl);
        const docsLink = `read [the ${result.title} docs →](${url.toString()})`;

        if (!multipleResults && result.description) {
            return `**${result.title}**: "${result.description}" ${docsLink}`;
        }

        return `**${result.title}** ${docsLink}`;
    });

    if (results.length === 1) {
        return entries[0]!;
    }

    const completeMessage = [heading, ...entries].join('\n\n');

    if (completeMessage.length <= MAX_DISCORD_MESSAGE_LENGTH) {
        return completeMessage;
    }

    for (let includedCount = entries.length - 1; includedCount >= 0; includedCount -= 1) {
        const omittedCount = entries.length - includedCount;
        const omittedLabel = omittedCount === 1 ? 'result' : 'results';
        const notice = `…and ${omittedCount} more ${omittedLabel} were not shown.`;
        const message = [heading, ...entries.slice(0, includedCount), notice].join('\n\n');

        if (message.length <= MAX_DISCORD_MESSAGE_LENGTH) {
            return message;
        }
    }

    return heading;
}
