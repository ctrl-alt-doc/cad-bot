import { EPHEMERAL, type MessageData } from './responses.js';

const DISCORD_API = 'https://discord.com/api/v10';

// Discord fails any interaction that isn't answered within three seconds.
export const DEFER_AFTER_MS = 2_500;

export interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

export interface InteractionWebhook {
    application_id: string;
    token: string;
}

export interface RespondOptions {
    /** Replace the message a component belongs to, instead of sending a new reply. Ephemeral messages are still sent as new replies. */
    updatesMessage?: boolean;
    deferAfterMs?: number;
}

const isEphemeral = (message: MessageData) => ((message.flags ?? 0) & EPHEMERAL) === EPHEMERAL;

/**
 * Replies directly when the message is ready in time; otherwise sends a
 * deferred response and completes it once the message is ready.
 */
export async function respondInTime(
    message: Promise<MessageData>,
    interaction: InteractionWebhook,
    ctx: ExecutionContext,
    { updatesMessage = false, deferAfterMs = DEFER_AFTER_MS }: RespondOptions = {}
): Promise<Response> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<undefined>((resolve) => {
        timer = setTimeout(resolve, deferAfterMs, undefined);
    });

    const early = await Promise.race([message, deadline]);
    clearTimeout(timer);

    if (early) {
        return Response.json({ type: updatesMessage && !isEphemeral(early) ? 7 : 4, data: early });
    }

    ctx.waitUntil(message.then((data) => sendDeferredReply(interaction, data, updatesMessage)));

    // 6 keeps the current message while working; 5 shows "thinking" as a new reply.
    return Response.json({ type: updatesMessage ? 6 : 5 });
}

/**
 * Completes a deferred interaction. A deferred reply's visibility is fixed when
 * it is sent, so ephemeral messages go out as a follow-up and any public
 * "thinking" message is removed.
 */
export async function sendDeferredReply(interaction: InteractionWebhook, message: MessageData, updatesMessage = false): Promise<void> {
    const webhook = `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}`;

    if (isEphemeral(message)) {
        await discordRequest(webhook, 'POST', message);
        // When updating, @original is the message the component belongs to, which must stay.
        if (!updatesMessage) await discordRequest(`${webhook}/messages/@original`, 'DELETE');
        return;
    }

    const { flags: _flags, ...body } = message;
    await discordRequest(`${webhook}/messages/@original`, 'PATCH', body);
}

async function discordRequest(url: string, method: string, body?: unknown): Promise<void> {
    try {
        const response = await fetch(url, {
            method,
            ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        });

        if (!response.ok) {
            console.error(`Discord ${method} failed:`, response.status, await response.text());
        }
    } catch (error) {
        console.error(`Discord ${method} failed:`, error);
    }
}
