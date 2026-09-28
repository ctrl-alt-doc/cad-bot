// Registers the slash commands manually. Deployed Workers with DISCORD_TOKEN set
// register them automatically, so this is only needed without that secret.
import { existsSync } from 'node:fs';
import { commandsUrl, registerCommands } from './discord/registration.js';

if (existsSync('.env')) {
    process.loadEnvFile('.env');
}

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not configured');
}

if (!DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_CLIENT_ID is not configured');
}

const env = { DISCORD_TOKEN, DISCORD_CLIENT_ID, ...(DISCORD_GUILD_ID ? { DISCORD_GUILD_ID } : {}) };

console.log(`Registering application commands ${env.DISCORD_GUILD_ID ? `for server ${env.DISCORD_GUILD_ID}` : 'globally'}...`);

const response = await registerCommands(env);

if (!response.ok) {
    console.error(`Registration failed (${response.status}) at ${commandsUrl(env)}:`, await response.text());
    process.exitCode = 1;
} else {
    console.log('Application commands registered.');
}
