import { verifyKey } from 'discord-interactions';
import { CadClient } from './cad/client.js';
import {
    formatPageList,
    formatPageResult,
    formatSearchResults
} from './discord/responses.js';
interface Env {
    DISCORD_PUBLIC_KEY: string;
    CAD_BASE_URL: string;
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

    const interaction = JSON.parse(body) as {
        type: number;
        data?: {
            name: string;
            options?: Array<{
                name: string;
                options?: Array<{
                    name: string;
                    value?: string;
                    focused?: boolean;
                }>;
            }>;
        };
    };

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

        let kind: 'page' | 'category';

        if (subcommand.name === 'page') {
            kind = 'page';
        } else if (subcommand.name === 'list') {
            kind = 'category';
        } else {
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
            const suggestions = await cadClient.suggest(query, kind);

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

      if (subcommand?.name === 'page') {
          const slugOption = subcommand.options?.find(
              (option) => option.name === 'slug'
          );

          if (!slugOption?.value) {
              return new Response('Missing slug', {
                  status: 400
              });
          }

          const cadClient = new CadClient(env.CAD_BASE_URL);

          try {
              const page = await cadClient.getPage(slugOption.value);
              const message = formatPageResult(page, env.CAD_BASE_URL);

              return Response.json({
                  type: 4,
                  data: {
                      content: message
                  }
              });
          } catch (error) {
              console.error('CAD page failed:', error);

              let content = 'The documentation server returned an error.';

              if (error instanceof Error) {
                  if (error.message === 'CAD_UNREACHABLE') {
                      content = 'I couldn’t reach the documentation server.';
                  } else if (error.message === 'CAD_INVALID_RESPONSE') {
                      content = 'The documentation server returned an invalid response.';
                  }
              }

              return Response.json({
                  type: 4,
                  data: {
                      content
                  }
              });
          }
      }
      if (subcommand?.name === 'list') {
          const categoryOption = subcommand.options?.find(
              (option) => option.name === 'category'
          );

          if (!categoryOption?.value) {
              return new Response('Missing category', {
                  status: 400
              });
          }

          const cadClient = new CadClient(env.CAD_BASE_URL);

          try {
              const pages = await cadClient.listPages(categoryOption.value);
              const message = formatPageList(pages, env.CAD_BASE_URL);

              return Response.json({
                  type: 4,
                  data: {
                      content: message
                  }
              });
          } catch (error) {
              console.error('CAD list failed:', error);

              let content = 'The documentation server returned an error.';

              if (error instanceof Error) {
                  if (error.message === 'CAD_UNREACHABLE') {
                      content = 'I couldn’t reach the documentation server.';
                  } else if (error.message === 'CAD_INVALID_RESPONSE') {
                      content = 'The documentation server returned an invalid response.';
                  }
              }

              return Response.json({
                  type: 4,
                  data: {
                      content
                  }
              });
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
              content: `No documentation found for "${queryOption.value}".`
            }
          });
        }

        const message = formatSearchResults(
            results,
            env.CAD_BASE_URL,
            queryOption.value
        );

        return Response.json({
          type: 4,
          data: {
            content: message
          }
        });
      } catch (error) {
        console.error('CAD search failed:', error);

        let content = 'The documentation server returned an error.';

        if (error instanceof Error) {
          if (error.message === 'CAD_UNREACHABLE') {
            content = 'I couldn’t reach the documentation server.';
          } else if (error.message === 'CAD_INVALID_RESPONSE') {
            content = 'The documentation server returned an invalid response.';
          }
        }

        return Response.json({
          type: 4,
          data: {
            content
          }
        });
      }
    }

    return new Response('Unknown interaction', {
      status: 400
    });
  }
};
