import { verifyKey } from 'discord-interactions';
import { CadClient } from './cad/client.js';
import {
    formatPageResult,
    formatSearchResults,
    errorResponse,
    headerChoices
} from './discord/responses.js';
import { brandFor, parseBrandColor } from './brand.js';
interface BrandSettings {
    get(key: string, type: 'json'): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
}
interface Env {
    DISCORD_PUBLIC_KEY: string;
    CAD_BASE_URL: string;
    BRAND_AVATAR_URL?: string;
    BRAND_SETTINGS: BrandSettings;
}
function cadErrorResponse(error: unknown, brand: ReturnType<typeof brandFor>): Response {
    let content = 'The documentation server returned an error.';

    if (error instanceof Error) {
        if (error.message === 'CAD_UNREACHABLE') {
            content = 'I couldn’t reach the documentation server.';
        } else if (error.message === 'CAD_INVALID_RESPONSE') {
            content = 'The documentation server returned an invalid response.';
        }
    }

    return Response.json(errorResponse(brand, content));
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    const body = await request.text();

    if (!signature || !timestamp) {
      return new Response('Invalid request signature', {
        status: 401
      });
    }

    const valid = await verifyKey(
      body,
      signature,
      timestamp,
      env.DISCORD_PUBLIC_KEY
    );

    if (!valid) {
      return new Response('Invalid request signature', {
        status: 401
      });
    }

    type InteractionOption = {
        name: string;
        value?: string;
        focused?: boolean;
        options?: InteractionOption[];
    };
    const interaction = JSON.parse(body) as {
        type: number;
        guild_id?: string;
        member?: {
            permissions?: string;
        };
        data?: {
            name: string;
            options?: InteractionOption[];
        };
    };
    const storedColor = interaction.guild_id
        ? await env.BRAND_SETTINGS.get(`color:${interaction.guild_id}`, 'json')
        : null;
    const brand = brandFor(
        env.CAD_BASE_URL,
        env.BRAND_AVATAR_URL,
        typeof storedColor === 'number' ? storedColor : undefined
    );

    // Discord PING
    if (interaction.type === 1) {
      return Response.json({
        type: 1
      });
    }
    if (interaction.type === 4) {
        if (interaction.data?.name !== 'docs') {
            return Response.json({
                type: 8,
                data: {
                    choices: []
                }
            });
        }

        const subcommand = interaction.data.options?.[0];

        if (!subcommand) {
            return Response.json({
                type: 8,
                data: {
                    choices: []
                }
            });
        }

        if (subcommand.name !== 'page') {
            return Response.json({
                type: 8,
                data: {
                    choices: []
                }
            });
        }

        const focusedOption = subcommand.options?.find(
            (option) => option.focused
        );

        const query = focusedOption?.value ?? '';
        const cadClient = new CadClient(env.CAD_BASE_URL);

        try {
            if (focusedOption?.name === 'header') {
                const slug = subcommand.options?.find((option) => option.name === 'slug')?.value;
                if (!slug) {
                    return Response.json({ type: 8, data: { choices: [] } });
                }

                const page = await cadClient.getPage(slug);
                return Response.json({ type: 8, data: { choices: headerChoices(page, query) } });
            }

            const suggestions = await cadClient.suggest(query, 'page');

            return Response.json({
                type: 8,
                data: {
                    choices: suggestions.map((suggestion) => ({
                        name: suggestion.title,
                        value: suggestion.slug
                    }))
                }
            });
        } catch (error) {
            console.error('CAD autocomplete failed:', error);

            return Response.json({
                type: 8,
                data: {
                    choices: []
                }
            });
        }
    }
    if (interaction.type === 2) {
      if (interaction.data?.name !== 'docs') {
        return new Response('Unknown command', {
          status: 400
        });
      }

      const subcommand = interaction.data.options?.[0];

      if (subcommand?.name === 'settings') {
          const permissions = BigInt(interaction.member?.permissions ?? '0');
          const canManageSettings = (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
          const setting = subcommand.options?.[0];
          const colorValue = setting?.options?.find((option) => option.name === 'hex')?.value;
          const color = colorValue ? parseBrandColor(colorValue) : undefined;

          if (!interaction.guild_id) {
              return Response.json({ type: 4, data: { content: 'Colour settings are only available in a server.', flags: 64 } });
          }
          if (!canManageSettings) {
              return Response.json({ type: 4, data: { content: 'You need the Manage Server permission to change the embed colour.', flags: 64 } });
          }
          if (color === undefined) {
              return Response.json({ type: 4, data: { content: 'Use a six-digit hex colour such as `#ce0985`.', flags: 64 } });
          }

          await env.BRAND_SETTINGS.put(`color:${interaction.guild_id}`, JSON.stringify(color));
          return Response.json({ type: 4, data: { content: `Embed colour updated to \`#${color.toString(16).padStart(6, '0')}\`.`, flags: 64 } });
      }

      if (subcommand?.name === 'page') {
          const slugOption = subcommand.options?.find(
              (option) => option.name === 'slug'
          );
          const headerOption = subcommand.options?.find(
              (option) => option.name === 'header'
          );

          if (!slugOption?.value) {
              return new Response('Missing slug', {
                  status: 400
              });
          }

          const cadClient = new CadClient(env.CAD_BASE_URL);

          try {
              const page = await cadClient.getPage(slugOption.value);
              const message = formatPageResult(page, env.CAD_BASE_URL, brand, headerOption?.value);

              return Response.json({
                  type: 4,
                  data: {
                    ...message
                  }
              });
          } catch (error) {
              console.error('CAD page failed:', error);

              return cadErrorResponse(error, brand);
          }
      }
      if (subcommand?.name !== 'search') {
          return new Response('Unknown subcommand', {
              status: 400
          });
      }

      const queryOption = subcommand.options?.find(
        (option) => option.name === 'query'
      );

      if (!queryOption?.value) {
        return new Response('Missing query', {
          status: 400
        });
      }

      const cadClient = new CadClient(env.CAD_BASE_URL);

      try {
        const results = await cadClient.search(queryOption.value);

        if (results.length === 0) {
          return Response.json({
            type: 4,
            data: {
                ...formatSearchResults([], env.CAD_BASE_URL, queryOption.value, brand)
            }
          });
        }

        const message = formatSearchResults(
            results,
            env.CAD_BASE_URL,
            queryOption.value,
            brand
        );

        return Response.json({
          type: 4,
          data: {
            ...message
          }
        });
      } catch (error) {
        console.error('CAD search failed:', error);

        return cadErrorResponse(error, brand);
      }
    }

    return new Response('Unknown interaction', {
      status: 400
    });
  }
};
