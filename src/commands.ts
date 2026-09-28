// Discord application command definitions, shared by the Worker's automatic
// registration and the manual `ctrlaltbot-register` script.
// https://discord.com/developers/docs/interactions/application-commands

const CHAT_INPUT = 1;
const SUB_COMMAND = 1;
const SUB_COMMAND_GROUP = 2;
const STRING = 3;

export const COMMANDS = [
    {
        type: CHAT_INPUT,
        name: 'docs',
        description: 'Search and browse the documentation',
        options: [
            {
                type: SUB_COMMAND,
                name: 'search',
                description: 'Search the documentation',
                options: [
                    { type: STRING, name: 'query', description: 'What do you want to find?', required: true, autocomplete: true }
                ]
            },
            {
                type: SUB_COMMAND,
                name: 'page',
                description: 'Open a documentation page',
                options: [
                    { type: STRING, name: 'slug', description: 'The documentation page slug', required: true, autocomplete: true },
                    { type: STRING, name: 'header', description: 'A heading within the documentation page', required: false, autocomplete: true }
                ]
            },
            {
                type: SUB_COMMAND_GROUP,
                name: 'settings',
                description: 'Configure this server’s documentation bot',
                options: [
                    {
                        type: SUB_COMMAND,
                        name: 'colour',
                        description: 'Set the embed colour for this server',
                        options: [
                            { type: STRING, name: 'hex', description: 'Six-digit hex colour, for example #ce0985', required: true }
                        ]
                    }
                ]
            }
        ]
    },
    {
        type: CHAT_INPUT,
        name: 'ask',
        description: 'Ask the documentation a question',
        options: [
            { type: STRING, name: 'question', description: 'For example: how do I add a callout?', required: true, autocomplete: true }
        ]
    }
];

/** A stable fingerprint of the command definitions, used to skip registration when nothing changed. */
export async function commandsHash(commands: unknown = COMMANDS): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(commands)));

    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
