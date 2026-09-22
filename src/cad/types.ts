export interface SearchResult {
    title: string;
    description: string;
    slug: string;
    excerpt: string;
    section?: string;
    breadcrumb?: string[];
    sinceVersion?: string;
}

export interface PageResult {
    title: string;
    description: string;
    excerpt: string;
    slug: string;
    section?: string;
    breadcrumb?: string[];
    sinceVersion?: string;
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
