import assert from 'node:assert/strict';
import test from 'node:test';

import { CadClient } from '../src/cad/client.js';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
    globalThis.fetch = originalFetch;
});

test('search requests CAD and parses search results', async () => {
    globalThis.fetch = async (input, init) => {
        assert.equal(new URL(input.toString()).pathname, '/api/search');
        assert.ok(init?.signal instanceof AbortSignal);

        return new Response(JSON.stringify([
            {
                title: 'Callouts',
                description: 'Highlight important information.',
                slug: 'reference/callouts',
                excerpt: 'Callout content.'
            }
        ]), { status: 200 });
    };

    const results = await new CadClient('http://localhost:5173').search('callout');

    assert.equal(results[0]?.slug, 'reference/callouts');
});

test('page lookup translates an HTTP failure into a CAD error', async () => {
    globalThis.fetch = async () => new Response(null, { status: 404 });

    await assert.rejects(
        () => new CadClient('http://localhost:5173').getPage('missing'),
        { message: 'CAD_HTTP_404' }
    );
});

test('invalid JSON is translated into CAD_INVALID_RESPONSE', async () => {
    globalThis.fetch = async () => new Response('not JSON', { status: 200 });

    await assert.rejects(
        () => new CadClient('http://localhost:5173').listPages('reference'),
        { message: 'CAD_INVALID_RESPONSE' }
    );
});
