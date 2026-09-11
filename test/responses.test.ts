import assert from 'node:assert/strict';
import test from 'node:test';

import {
    formatPageList,
    formatPageResult,
    formatSearchResults
} from '../src/discord/responses.js';

const baseUrl = 'http://localhost:5173';

test('single search results omit the search heading', () => {
    const message = formatSearchResults([
        {
            title: 'Callouts',
            description: 'Highlight important information.',
            slug: 'reference/callouts',
            excerpt: ''
        }
    ], baseUrl, 'callouts');

    assert.match(message, /^\*\*Callouts\*\*/);
    assert.doesNotMatch(message, /Search results for/);
});

test('multiple search results include a heading and omit descriptions', () => {
    const message = formatSearchResults([
        { title: 'Callouts', description: 'Description', slug: 'reference/callouts', excerpt: '' },
        { title: 'Reference', description: 'Description', slug: 'reference', excerpt: '' }
    ], baseUrl, 'reference');

    assert.match(message, /Search results for “reference” \(2 results\)/);
    assert.doesNotMatch(message, /Description/);
});

test('page results omit absent excerpts', () => {
    const message = formatPageResult({
        title: 'Callouts',
        description: 'Highlight important information.',
        excerpt: '',
        slug: 'reference/callouts'
    }, baseUrl);

    assert.doesNotMatch(message, /undefined/);
    assert.match(message, /read the docs/);
});

test('page lists include the category and page links', () => {
    const message = formatPageList({
        category: { title: 'Reference', slug: 'reference' },
        pages: [{ title: 'Callouts', slug: 'reference/callouts' }]
    }, baseUrl);

    assert.match(message, /Reference page \(1\)/);
    assert.match(message, /reference\/callouts/);
});
