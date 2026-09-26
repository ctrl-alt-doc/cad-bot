export const BRAND = {
    color: 0xCE0985,
    name: 'ctrl alt bot',
    product: 'ctrl alt doc'
} as const;

export interface BrandConfig {
    docsHost: string;
    avatarUrl: string;
    color: number;
}

export function brandFor(baseUrl: string, avatarUrl?: string, color: number = BRAND.color): BrandConfig {
    const url = new URL(baseUrl);
    return {
        docsHost: url.host,
        avatarUrl: avatarUrl ?? new URL('https://ctrlaltdoc.cc/bot/avatar-circle-transparent-512.png', url).toString(),
        color
    };
}

export function parseBrandColor(value: string): number | undefined {
    const match = value.trim().match(/^#?([\da-f]{6})$/i);
    return match ? Number.parseInt(match[1]!, 16) : undefined;
}
