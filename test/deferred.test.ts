import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { respondInTime, sendDeferredReply } from '../src/discord/deferred.js';

const interaction = { application_id: 'app', token: 'tok' };
const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

function recordFetch() {
    const calls: { url: string; method: string; body?: unknown }[] = [];

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : undefined });
        return new Response(null, { status: 204 });
    }) as typeof fetch;

    return calls;
}

test('replies directly when the message is ready in time', async () => {
    const pending: Promise<unknown>[] = [];
    const response = await respondInTime(Promise.resolve({ content: 'hi' }), interaction, { waitUntil: (p) => pending.push(p) }, { deferAfterMs: 50 });

    assert.deepEqual(await response.json(), { type: 4, data: { content: 'hi' } });
    assert.equal(pending.length, 0);
});

test('defers slow messages and edits the original reply', async () => {
    const calls = recordFetch();
    const pending: Promise<unknown>[] = [];
    const slow = new Promise<{ content: string }>((resolve) => setTimeout(resolve, 30, { content: 'done' }));

    const response = await respondInTime(slow, interaction, { waitUntil: (p) => pending.push(p) }, { deferAfterMs: 5 });
    assert.deepEqual(await response.json(), { type: 5 });

    await Promise.all(pending);
    assert.deepEqual(calls, [{ url: 'https://discord.com/api/v10/webhooks/app/tok/messages/@original', method: 'PATCH', body: { content: 'done' } }]);
});

test('sends late ephemeral messages as a follow-up and removes the public placeholder', async () => {
    const calls = recordFetch();

    await sendDeferredReply(interaction, { content: 'Page not found', flags: 64 });

    assert.deepEqual(calls.map(({ method, url }) => `${method} ${url}`), [
        'POST https://discord.com/api/v10/webhooks/app/tok',
        'DELETE https://discord.com/api/v10/webhooks/app/tok/messages/@original'
    ]);
    assert.deepEqual(calls[0]?.body, { content: 'Page not found', flags: 64 });
});

test('updates the component message directly when ready in time', async () => {
    const response = await respondInTime(Promise.resolve({ content: 'new' }), interaction, { waitUntil: () => {} }, { updatesMessage: true, deferAfterMs: 50 });

    assert.deepEqual(await response.json(), { type: 7, data: { content: 'new' } });
});

test('sends ephemeral component replies as new messages', async () => {
    const response = await respondInTime(Promise.resolve({ content: 'mine', flags: 64 }), interaction, { waitUntil: () => {} }, { updatesMessage: true, deferAfterMs: 50 });

    assert.deepEqual(await response.json(), { type: 4, data: { content: 'mine', flags: 64 } });
});

test('defers slow component updates without a new thinking message', async () => {
    const calls = recordFetch();
    const pending: Promise<unknown>[] = [];
    const slow = new Promise<{ content: string }>((resolve) => setTimeout(resolve, 30, { content: 'done' }));

    const response = await respondInTime(slow, interaction, { waitUntil: (p) => pending.push(p) }, { updatesMessage: true, deferAfterMs: 5 });
    assert.deepEqual(await response.json(), { type: 6 });

    await Promise.all(pending);
    assert.deepEqual(calls.map(({ method }) => method), ['PATCH']);
});

test('keeps the search message when a late component reply is ephemeral', async () => {
    const calls = recordFetch();

    await sendDeferredReply(interaction, { content: 'Page not found', flags: 64 }, true);

    assert.deepEqual(calls.map(({ method }) => method), ['POST']);
});
