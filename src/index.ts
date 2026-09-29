import { verifyKey } from 'discord-interactions';
import { CadClient, describeCadError } from './cad/client.js';
import type { PageResult } from './cad/types.js';
import {
    formatPageResult,
    formatSearchResults,
    formatSelectedResult,
    parseResultValue,
    SEARCH_SELECT_ID,
    errorMessage,
    autocompleteChoices,
    headerChoices,
    queryChoices,
    EPHEMERAL,
    type MessageData
} from './discord/responses.js';
import { DEFER_AFTER_MS, respondInTime, type ExecutionContext } from './discord/deferred.js';
import { syncCommands, type RegistrationEnv } from './discord/registration.js';
import { brandFor, parseBrandColor, type BrandConfig } from './brand.js';

interface BrandSettings {
    get(key: string): Promise<string | null>;
    get(key: string, type: 'json'): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
}

interface Env extends RegistrationEnv {
    DISCORD_PUBLIC_KEY: string;
    CAD_BASE_URL: string;
    BRAND_AVATAR_URL?: string;
    BRAND_SETTINGS: BrandSettings;
}

// Each Worker instance checks the command definitions once, so a deploy that
// changes them takes effect with the first interaction rather than the next cron run.
let commandsChecked = false;

function checkCommandsOnce(env: Env, ctx: ExecutionContext) {
    if (commandsChecked) return;
    commandsChecked = true;
    ctx.waitUntil(syncCommands(env, env.BRAND_SETTINGS));
}

type InteractionOption = {
    name: string;
    value?: string;
    focused?: boolean;
    options?: InteractionOption[];
};

interface Interaction {
    type: number;
    application_id: string;
    token: string;
    guild_id?: string;
    member?: {
        permissions?: string;
        user?: { id: string };
    };
    user?: { id: string };
    data?: {
        name?: string;
        options?: InteractionOption[];
        custom_id?: string;
        values?: string[];
    };
    message?: {
        components?: unknown;
        interaction_metadata?: { user?: { id: string } };
    };
}

const UNAVAILABLE_COMMAND = 'That command isn’t available right now. If the bot was just updated, try again in a moment.';

const ephemeral = (content: string): MessageData => ({ content, flags: EPHEMERAL });

const optionValue = (options: InteractionOption[] | undefined, name: string) =>
    options?.find((option) => option.name === name)?.value;

async function loadBrand(interaction: Interaction, env: Env): Promise<BrandConfig> {
    const storedColor = interaction.guild_id
        ? await env.BRAND_SETTINGS.get(`color:${interaction.guild_id}`, 'json')
        : null;

    return brandFor(
        env.CAD_BASE_URL,
        env.BRAND_AVATAR_URL,
        typeof storedColor === 'number' ? storedColor : undefined
    );
}

function cadErrorMessage(error: unknown, brand: BrandConfig, notFound?: string): MessageData {
    let content = 'The documentation server returned an error.';

    if (error instanceof Error) {
        if (error.message === 'CAD_NOT_FOUND' && notFound) {
            return errorMessage(brand, notFound, 'Page not found');
        } else if (error.message === 'CAD_UNREACHABLE') {
            content = 'I couldn’t reach the documentation server.';
        } else if (error.message === 'CAD_INVALID_RESPONSE') {
            content = 'The documentation server returned an invalid response.';
        }
    }

    return errorMessage(brand, content);
}

async function searchMessage(query: string, env: Env, brand: BrandConfig): Promise<MessageData> {
    const cadClient = new CadClient(env.CAD_BASE_URL);

    try {
        const results = await cadClient.search(query);
        const top = results[0];
        // A matched heading shows that section's text, which needs the full page.
        const topPage = top?.heading
            ? await cadClient.getPage(top.slug).catch((error: unknown) => {
                console.error('CAD page for search result failed:', describeCadError(error));
                return undefined;
            })
            : undefined;

        return formatSearchResults(results, env.CAD_BASE_URL, query, brand, topPage);
    } catch (error) {
        console.error('CAD search failed:', describeCadError(error));

        return cadErrorMessage(error, brand);
    }
}

async function pageMessage(slug: string, header: string | undefined, env: Env, brand: BrandConfig): Promise<MessageData> {
    try {
        const page = await new CadClient(env.CAD_BASE_URL).getPage(slug);

        return formatPageResult(page, env.CAD_BASE_URL, brand, header);
    } catch (error) {
        console.error('CAD page failed:', describeCadError(error));

        return cadErrorMessage(error, brand, `There’s no page at \`${slug}\`. Pick one of the suggestions while typing, or try \`/ask\`.`);
    }
}

async function settingsMessage(interaction: Interaction, setting: InteractionOption | undefined, env: Env): Promise<MessageData> {
    const permissions = BigInt(interaction.member?.permissions ?? '0');
    const canManageSettings = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
    const colorValue = optionValue(setting?.options, 'hex');
    const color = colorValue ? parseBrandColor(colorValue) : undefined;

    if (!interaction.guild_id) {
        return ephemeral('Colour settings are only available in a server.');
    }
    if (!canManageSettings) {
        return ephemeral('You need the Manage Server permission to change the embed colour.');
    }
    if (setting?.name !== 'colour') {
        return ephemeral(UNAVAILABLE_COMMAND);
    }
    if (color === undefined) {
        return ephemeral('Use a six-digit hex colour such as `#ce0985`.');
    }

    await env.BRAND_SETTINGS.put(`color:${interaction.guild_id}`, JSON.stringify(color));

    return ephemeral(`Embed colour updated to \`#${color.toString(16).padStart(6, '0')}\`.`);
}

async function commandMessage(interaction: Interaction, env: Env): Promise<MessageData> {
    const command = interaction.data?.name;

    if (command === 'ask') {
        const question = optionValue(interaction.data?.options, 'question');

        return question ? searchMessage(question, env, await loadBrand(interaction, env)) : ephemeral('Type a question to search for.');
    }

    if (command !== 'docs') {
        return ephemeral(UNAVAILABLE_COMMAND);
    }

    const subcommand = interaction.data?.options?.[0];

    switch (subcommand?.name) {
        case 'settings':
            return settingsMessage(interaction, subcommand.options?.[0], env);
        case 'page': {
            const slug = optionValue(subcommand.options, 'slug');

            return slug
                ? pageMessage(slug, optionValue(subcommand.options, 'header'), env, await loadBrand(interaction, env))
                : ephemeral('Choose a page to open.');
        }
        case 'search': {
            const query = optionValue(subcommand.options, 'query');

            return query ? searchMessage(query, env, await loadBrand(interaction, env)) : ephemeral('Type something to search for.');
        }
        default:
            return ephemeral(UNAVAILABLE_COMMAND);
    }
}

async function componentMessage(interaction: Interaction, env: Env): Promise<MessageData> {
    const value = interaction.data?.values?.[0];

    if (interaction.data?.custom_id !== SEARCH_SELECT_ID || !value) {
        return ephemeral(UNAVAILABLE_COMMAND);
    }

    const { slug, header } = parseResultValue(value);
    const brand = await loadBrand(interaction, env);
    let page: PageResult;

    try {
        page = await new CadClient(env.CAD_BASE_URL).getPage(slug);
    } catch (error) {
        console.error('CAD page for search result failed:', describeCadError(error));

        return cadErrorMessage(error, brand, 'That page has been moved or removed. Try searching again.');
    }

    // Only the person who searched can change the shared message; anyone else gets their own copy.
    const searcher = interaction.message?.interaction_metadata?.user?.id;
    const user = interaction.member?.user?.id ?? interaction.user?.id;

    if (searcher && searcher !== user) {
        return { ...formatPageResult(page, env.CAD_BASE_URL, brand, header), flags: EPHEMERAL };
    }

    return formatSelectedResult(page, env.CAD_BASE_URL, brand, value, interaction.message?.components);
}

async function autocompleteResponse(interaction: Interaction, env: Env): Promise<Response> {
    const options = interaction.data?.name === 'ask'
        ? interaction.data.options
        : interaction.data?.name === 'docs'
            ? interaction.data.options?.[0]?.options
            : undefined;
    const focusedOption = options?.find((option) => option.focused);
    const query = focusedOption?.value ?? '';
    const isQuery = focusedOption?.name === 'query' || focusedOption?.name === 'question';
    // Autocomplete can't be deferred, so give up early rather than miss Discord's deadline.
    const cadClient = new CadClient(env.CAD_BASE_URL, DEFER_AFTER_MS);
    let choices: { name: string; value: string }[] = [];

    try {
        if (focusedOption?.name === 'header') {
            const slug = optionValue(options, 'slug');
            if (slug) choices = headerChoices(await cadClient.getPage(slug), query);
        } else if (focusedOption?.name === 'slug') {
            const suggestions = await cadClient.suggest(query, 'page');
            choices = autocompleteChoices(suggestions.map((suggestion) => ({ name: suggestion.title, value: suggestion.slug })));
        } else if (isQuery) {
            const suggestions = query.trim() ? await cadClient.suggest(query, 'page') : [];
            choices = queryChoices(query, suggestions.map((suggestion) => suggestion.title));
        }
    } catch (error) {
        console.error('CAD autocomplete failed:', describeCadError(error));
        choices = isQuery ? queryChoices(query, []) : [];
    }

    return Response.json({ type: 8, data: { choices } });
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response('Not Found', { status: 404 });
        }

        const signature = request.headers.get('X-Signature-Ed25519');
        const timestamp = request.headers.get('X-Signature-Timestamp');
        const body = await request.text();

        if (!signature || !timestamp) {
            return new Response('Invalid request signature', { status: 401 });
        }

        const valid = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);

        if (!valid) {
            return new Response('Invalid request signature', { status: 401 });
        }

        const interaction = JSON.parse(body) as Interaction;

        checkCommandsOnce(env, ctx);

        switch (interaction.type) {
            // PING
            case 1:
                return Response.json({ type: 1 });
            // APPLICATION_COMMAND
            case 2: {
                const message = commandMessage(interaction, env).catch((error: unknown) => {
                    console.error('Command failed:', error);

                    return ephemeral('Something went wrong. Please try again.');
                });

                return respondInTime(message, interaction, ctx);
            }
            // MESSAGE_COMPONENT
            case 3: {
                const message = componentMessage(interaction, env).catch((error: unknown) => {
                    console.error('Component failed:', error);

                    return ephemeral('Something went wrong. Please try again.');
                });

                return respondInTime(message, interaction, ctx, { updatesMessage: true });
            }
            // APPLICATION_COMMAND_AUTOCOMPLETE
            case 4:
                return autocompleteResponse(interaction, env);
            default:
                return new Response('Unknown interaction', { status: 400 });
        }
    },

    async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(syncCommands(env, env.BRAND_SETTINGS));
    }
};
