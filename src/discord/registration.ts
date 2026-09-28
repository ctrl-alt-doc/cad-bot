import { COMMANDS, commandsHash } from '../commands.js';

const DISCORD_API = 'https://discord.com/api/v10';
const HASH_KEY = 'commands:hash';

export interface RegistrationStore {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
}

export interface RegistrationEnv {
    DISCORD_TOKEN?: string;
    DISCORD_CLIENT_ID?: string;
    /** Registers to one server instead of globally, for development: guild commands update instantly. */
    DISCORD_GUILD_ID?: string;
}

export type RegistrationResult = 'registered' | 'unchanged' | 'not-configured' | 'failed';

export function commandsUrl({ DISCORD_CLIENT_ID, DISCORD_GUILD_ID }: RegistrationEnv): string {
    return DISCORD_GUILD_ID
        ? `${DISCORD_API}/applications/${DISCORD_CLIENT_ID}/guilds/${DISCORD_GUILD_ID}/commands`
        : `${DISCORD_API}/applications/${DISCORD_CLIENT_ID}/commands`;
}

/** Replaces all of the application's commands with the current definitions. */
export async function registerCommands(env: RegistrationEnv): Promise<Response> {
    return fetch(commandsUrl(env), {
        method: 'PUT',
        headers: { Authorization: `Bot ${env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(COMMANDS)
    });
}

/**
 * Registers the commands with Discord when their definitions have changed since
 * the last registration, so deploying an update is enough to publish new commands.
 */
export async function syncCommands(env: RegistrationEnv, store: RegistrationStore): Promise<RegistrationResult> {
    if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) {
        return 'not-configured';
    }

    // The target is part of the key, so switching between guild and global registration re-registers.
    const hash = `${await commandsHash()}:${env.DISCORD_GUILD_ID ?? 'global'}`;

    if (await store.get(HASH_KEY) === hash) {
        return 'unchanged';
    }

    try {
        const response = await registerCommands(env);

        if (!response.ok) {
            console.error('Command registration failed:', response.status, await response.text());
            return 'failed';
        }
    } catch (error) {
        console.error('Command registration failed:', error);
        return 'failed';
    }

    await store.put(HASH_KEY, hash);
    console.log('Registered updated application commands.');

    return 'registered';
}
