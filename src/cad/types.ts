export interface SearchResult {
    title: string;
    description: string;
    slug: string;
    excerpt: string;
    section?: string;
    breadcrumb?: string[];
    sinceVersion?: string;
    heading?: SearchResultHeading;
}

export interface SearchResultHeading {
    id: string;
    title: string;
}

export interface PageResult {
    title: string;
    description: string;
    excerpt: string;
    slug: string;
    section?: string;
    breadcrumb?: string[];
    sinceVersion?: string;
    toc?: TocItem[];
    /** Rendered HTML. */
    content?: string;
    /** Markdown source, preferred for section text when CAD provides it. */
    markdown?: string;
}

export interface TocItem {
    id: string;
    title: string;
    level: number;
}

export interface ListResult {
    title: string;
    slug: string;
    section?: string;
    breadcrumb?: string[];
    sinceVersion?: string;
}

export interface PageListResult {
    category: {
        title: string;
        slug: string;
    };
    pages: ListResult[];
}

export interface SuggestionResult {
    title: string;
    slug: string;
}
