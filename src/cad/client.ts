import type {
    PageListResult,
    PageResult,
    SearchResult,
    SuggestionResult
} from './types.js';

const CAD_REQUEST_TIMEOUT_MS = 10_000;

/** A readable summary of a CAD request failure for logs, including the request URL. */
export function describeCadError(error: unknown): string {
    if (!(error instanceof Error)) return String(error);

    return error.cause ? `${error.message} (${String(error.cause)})` : error.message;
}

export class CadClient {
    constructor(
        private readonly baseUrl: string,
        private readonly timeoutMs = CAD_REQUEST_TIMEOUT_MS
    ) {}

    search(query: string): Promise<SearchResult[]> {
        return this.request('/api/search', { q: query });
    }

    getPage(slug: string): Promise<PageResult> {
        return this.request('/api/page', { slug });
    }

    listPages(category: string): Promise<PageListResult> {
        return this.request('/api/list', { category });
    }

    suggest(query: string, kind: 'page' | 'category'): Promise<SuggestionResult[]> {
        return this.request('/api/suggest', { q: query, kind });
    }

    private async request<T>(path: string, params: Record<string, string>): Promise<T> {
        const url = new URL(path, this.baseUrl);

        for (const [name, value] of Object.entries(params)) {
            url.searchParams.set(name, value);
        }

        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(this.timeoutMs)
            });
        } catch (error) {
            throw new Error('CAD_UNREACHABLE', { cause: `${url}: ${error instanceof Error ? error.message : String(error)}` });
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');

            // Cloudflare answers with a 404 when a Worker fetches another Worker in the same account without the flag.
            if (body.includes('error code: 1042')) {
                throw new Error('CAD_BLOCKED', {
                    cause: `${url}: Cloudflare error 1042. The docs site is a Worker in the same account; add the "global_fetch_strictly_public" compatibility flag to the bot's wrangler.jsonc.`
                });
            }

            throw new Error(response.status === 404 ? 'CAD_NOT_FOUND' : `CAD_HTTP_${response.status}`, { cause: `${url}: HTTP ${response.status}` });
        }

        try {
            return await response.json() as T;
        } catch {
            throw new Error('CAD_INVALID_RESPONSE', { cause: `${url}: response was not JSON` });
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }
}
