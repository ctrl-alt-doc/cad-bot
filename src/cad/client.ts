import type {
    PageListResult,
    PageResult,
    SearchResult,
    SuggestionResult
} from './types.js';

const CAD_REQUEST_TIMEOUT_MS = 10_000;

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
        } catch {
            throw new Error('CAD_UNREACHABLE');
        }

        if (response.status === 404) {
            throw new Error('CAD_NOT_FOUND');
        }

        if (!response.ok) {
            throw new Error(`CAD_HTTP_${response.status}`);
        }

        try {
            return await response.json() as T;
        } catch {
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }
}
