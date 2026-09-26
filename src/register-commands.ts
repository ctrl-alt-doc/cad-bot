import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) {
    throw new Error('DISCORD_TOKEN is not configured');
}

if (!clientId) {
    throw new Error('DISCORD_CLIENT_ID is not configured');
}

const applicationClientId = clientId;

const commands = [
    new SlashCommandBuilder()
        .setName('docs')
        .setDescription('Search and browse the documentation')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('search')
                .setDescription('Search the documentation')
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('What do you want to find?')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('page')
                .setDescription('Open a documentation page')
                .addStringOption((option) =>
                    option
                        .setName('slug')
                        .setDescription('The documentation page slug')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('header')
                        .setDescription('A heading within the documentation page')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName('settings')
                .setDescription('Configure this server’s documentation bot')
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('colour')
                        .setDescription('Set the embed colour for this server')
                        .addStringOption((option) =>
                            option
                                .setName('hex')
                                .setDescription('Six-digit hex colour, for example #ce0985')
                                .setRequired(true)
                        )
                )
        )
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function registerCommands() {
    try {
        console.log('Registering application commands...');

        const route = guildId
            ? Routes.applicationGuildCommands(applicationClientId, guildId)
            : Routes.applicationCommands(applicationClientId);

        await rest.put(route, { body: commands });

        console.log('Application commands registered.');
    } catch (error) {
        console.error(error);
    }
}

registerCommands();
