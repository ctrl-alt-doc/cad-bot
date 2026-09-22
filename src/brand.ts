export const BRAND = {
    color: 0xCE0985,
    name: 'ctrl alt bot',
    product: 'ctrl alt doc'
} as const;

export interface BrandConfig {
    docsHost: string;
    avatarUrl: string;
}

export function brandFor(baseUrl: string, avatarUrl?: string): BrandConfig {
    const url = new URL(baseUrl);
    return {
        docsHost: url.host,
        avatarUrl: avatarUrl ?? new URL('https://ctrlaltdoc.cc/bot/avatar-circle-transparent-512.png', url).toString()
    };
}
