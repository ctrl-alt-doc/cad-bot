import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { CadClient } from './cad/client.js';
import {
    formatPageList,
    formatPageResult,
    formatSearchResults
} from './discord/responses.js';
const token = process.env.DISCORD_TOKEN;
const cadBaseUrl = process.env.CAD_BASE_URL;

if (!token) {
    throw new Error('DISCORD_TOKEN is not configured');
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const cadClient = cadBaseUrl
    ? new CadClient(cadBaseUrl)
    : null;

client.once('clientReady', (client) => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isAutocomplete()) {
        if (interaction.commandName !== 'docs' || !cadClient) {
            await interaction.respond([]);
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const kind = subcommand === 'list' ? 'category' : 'page';
        const query = interaction.options.getFocused();

        try {
            const suggestions = await cadClient.suggest(query, kind);

            await interaction.respond(
                suggestions.map((suggestion) => ({
                    name: suggestion.title,
                    value: suggestion.slug
                }))
            );
        } catch (error) {
            console.error('CAD autocomplete failed:', error);
            await interaction.respond([]);
        }

        return;
    }

    if (!interaction.isChatInputCommand()) {
        return;
    }

    if (interaction.commandName !== 'docs') {
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== 'search' && subcommand !== 'page' && subcommand !== 'list') {
        return;
    }

    const query = subcommand === 'search'
        ? interaction.options.getString('query', true)
        : subcommand === 'page'
            ? interaction.options.getString('slug', true)
            : null;

    if (!cadClient || !cadBaseUrl) {
        await interaction.reply(
            'CAD_BASE_URL is not configured yet.'
        );
        return;
    }

    try {
        if (subcommand === 'page') {
            const page = await cadClient.getPage(query!);

            await interaction.reply(formatPageResult(page, cadBaseUrl));
            return;
        }

        if (subcommand === 'list') {
            const category = interaction.options.getString('category', true);
            const pages = await cadClient.listPages(category);

            await interaction.reply(formatPageList(pages, cadBaseUrl));
            return;
        }

        const results = await cadClient.search(query!);

        if (results.length === 0) {
            await interaction.reply(
                `No documentation found for "${query!}".`
            );
            return;
        }

        const message = formatSearchResults(results, cadBaseUrl, query!);
        
        await interaction.reply(message);
    } catch (error) {
        console.error('CAD search failed:', error);
    
        if (error instanceof Error) {
            switch (error.message) {
                case 'CAD_UNREACHABLE':
                    await interaction.reply(
                        'I couldn’t reach the documentation server.'
                    );
                    return;
    
                case 'CAD_INVALID_RESPONSE':
                    await interaction.reply(
                        'The documentation server returned an invalid response.'
                    );
                    return;
            }
        }
    
        await interaction.reply(
            'The documentation server returned an error.'
        );
    }
});

client.login(token);
