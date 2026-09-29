import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { CadClient, describeCadError } from '../src/cad/client.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

const respondWith = (body: string, status: number) => {
    globalThis.fetch = (async () => new Response(body, { status })) as typeof fetch;
};

const failure = async () => {
    try {
        await new CadClient('https://docs.example.com').search('eggs');
    } catch (error) {
        return error as Error;
    }
    assert.fail('expected the request to fail');
};

test('explains Cloudflare blocking a same-account Worker', async () => {
    respondWith('error code: 1042', 404);
    const error = await failure();

    assert.equal(error.message, 'CAD_BLOCKED');
    assert.match(describeCadError(error), /global_fetch_strictly_public/);
    assert.match(describeCadError(error), /https:\/\/docs\.example\.com\/api\/search\?q=eggs/);
});

test('reports missing pages and HTTP errors with the URL', async () => {
    respondWith('Not found', 404);
    assert.equal((await failure()).message, 'CAD_NOT_FOUND');

    respondWith('Oops', 502);
    const error = await failure();
    assert.equal(error.message, 'CAD_HTTP_502');
    assert.match(describeCadError(error), /api\/search\?q=eggs: HTTP 502/);
});

test('keeps the network error when CAD is unreachable', async () => {
    globalThis.fetch = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const error = await failure();

    assert.equal(error.message, 'CAD_UNREACHABLE');
    assert.match(describeCadError(error), /fetch failed/);
});

test('flags responses that are not JSON', async () => {
    respondWith('<!doctype html>', 200);
    assert.equal((await failure()).message, 'CAD_INVALID_RESPONSE');
});
