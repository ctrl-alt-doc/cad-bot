import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { COMMANDS, commandsHash } from '../src/commands.js';
import { syncCommands } from '../src/discord/registration.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

function memoryStore() {
    const values = new Map<string, string>();
    return { values, get: async (key: string) => values.get(key) ?? null, put: async (key: string, value: string) => void values.set(key, value) };
}

function recordFetch(status = 200) {
    const calls: { url: string; method?: string; auth?: string; body: unknown }[] = [];

    globalThis.fetch = (async (url: string, init: RequestInit) => {
        calls.push({ url, method: init.method, auth: (init.headers as Record<string, string>).Authorization, body: JSON.parse(init.body as string) });
        return new Response('[]', { status });
    }) as typeof fetch;

    return calls;
}

const env = { DISCORD_TOKEN: 'token', DISCORD_CLIENT_ID: 'app' };

test('registers commands once, then only when they change', async () => {
    const calls = recordFetch();
    const store = memoryStore();

    assert.equal(await syncCommands(env, store), 'registered');
    assert.equal(await syncCommands(env, store), 'unchanged');
    assert.deepEqual(calls.map(({ url, method, auth }) => ({ url, method, auth })), [
        { url: 'https://discord.com/api/v10/applications/app/commands', method: 'PUT', auth: 'Bot token' }
    ]);
    assert.deepEqual(calls[0]?.body, COMMANDS);

    store.values.set('commands:hash', 'outdated');
    assert.equal(await syncCommands(env, store), 'registered');
    assert.equal(calls.length, 2);
});

test('registers to a single server when a guild is configured', async () => {
    const calls = recordFetch();
    const store = memoryStore();

    await syncCommands(env, store);
    assert.equal(await syncCommands({ ...env, DISCORD_GUILD_ID: 'guild' }, store), 'registered', 'switching target re-registers');
    assert.equal(calls[1]?.url, 'https://discord.com/api/v10/applications/app/guilds/guild/commands');
});

test('retries later when Discord rejects the registration', async () => {
    recordFetch(401);
    const store = memoryStore();

    assert.equal(await syncCommands(env, store), 'failed');
    assert.equal(store.values.size, 0);
});

test('does nothing without a bot token', async () => {
    const calls = recordFetch();

    assert.equal(await syncCommands({ DISCORD_CLIENT_ID: 'app' }, memoryStore()), 'not-configured');
    assert.equal(calls.length, 0);
});

test('fingerprints command definitions deterministically', async () => {
    assert.equal(await commandsHash(), await commandsHash(structuredClone(COMMANDS)));
    assert.notEqual(await commandsHash(), await commandsHash([...COMMANDS, { name: 'extra' }]));
});
