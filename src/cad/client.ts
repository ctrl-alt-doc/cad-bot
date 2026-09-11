import type {
    PageListResult,
    PageResult,
    SearchResult,
    SuggestionResult
} from './types.js';

const CAD_REQUEST_TIMEOUT_MS = 10_000;

export class CadClient {
    constructor(private readonly baseUrl: string) {}

    async search(query: string): Promise<SearchResult[]> {
        const url = new URL('/api/search', this.baseUrl);
        url.searchParams.set('q', query);

        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(CAD_REQUEST_TIMEOUT_MS)
            });
        } catch {
            throw new Error('CAD_UNREACHABLE');
        }

        if (!response.ok) {
            throw new Error(`CAD_HTTP_${response.status}`);
        }

        try {
            return await response.json() as SearchResult[];
        } catch {
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }

    async getPage(slug: string): Promise<PageResult> {
        const url = new URL('/api/page', this.baseUrl);
        url.searchParams.set('slug', slug);

        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(CAD_REQUEST_TIMEOUT_MS)
            });
        } catch {
            throw new Error('CAD_UNREACHABLE');
        }

        if (!response.ok) {
            throw new Error(`CAD_HTTP_${response.status}`);
        }

        try {
            return await response.json() as PageResult;
        } catch {
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }

    async listPages(category: string): Promise<PageListResult> {
        const url = new URL('/api/list', this.baseUrl);
        url.searchParams.set('category', category);
        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(CAD_REQUEST_TIMEOUT_MS)
            });
        } catch {
            throw new Error('CAD_UNREACHABLE');
        }

        if (!response.ok) {
            throw new Error(`CAD_HTTP_${response.status}`);
        }

        try {
            return await response.json() as PageListResult;
        } catch {
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }

    async suggest(query: string, kind: 'page' | 'category'): Promise<SuggestionResult[]> {
        const url = new URL('/api/suggest', this.baseUrl);
        url.searchParams.set('q', query);
        url.searchParams.set('kind', kind);

        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(CAD_REQUEST_TIMEOUT_MS)
            });
        } catch {
            throw new Error('CAD_UNREACHABLE');
        }

        if (!response.ok) {
            throw new Error(`CAD_HTTP_${response.status}`);
        }

        try {
            return await response.json() as SuggestionResult[];
        } catch {
            throw new Error('CAD_INVALID_RESPONSE');
        }
    }
}
