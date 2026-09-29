import assert from 'node:assert/strict';
import test from 'node:test';

import { brandFor } from '../src/brand.js';
import { autocompleteChoices, formatSearchResults, formatSelectedResult, parseResultValue, queryChoices } from '../src/discord/responses.js';

const baseUrl = 'https://docs.example.com';
const brand = brandFor(baseUrl);

type Message = {
    embeds: { title?: string; description?: string }[];
    components: { components: { type: number; url?: string; options?: { label: string; value: string; default?: boolean }[] }[] }[];
};

const results = [
    { title: 'Cooking eggs', description: 'Boil and fry.', slug: 'cooking/eggs', excerpt: '', heading: { id: 'boiling-an-egg', title: 'Boiling an egg' } },
    { title: 'Pasta', description: '', slug: 'cooking/pasta', excerpt: '' }
];

const eggsPage = {
    title: 'Cooking eggs',
    description: 'Boil and fry.',
    excerpt: '',
    slug: 'cooking/eggs',
    toc: [{ id: 'boiling-an-egg', title: 'Boiling an egg', level: 2 }, { id: 'frying', title: 'Frying', level: 2 }],
    markdown: '## Boiling an egg\n\nPlace the egg in water.\n\n## Frying\n\nHeat the pan.'
};

const select = (message: Message) => message.components.flatMap((row) => row.components).find((component) => component.type === 3);
const link = (message: Message) => message.components.flatMap((row) => row.components).find((component) => component.type === 2)?.url;

test('links the top search result to its matched heading', () => {
    const message = formatSearchResults(results, baseUrl, 'how to boil an egg', brand) as Message;

    assert.equal(message.embeds[0]?.title, 'Cooking eggs › Boiling an egg');
    assert.equal(link(message), 'https://docs.example.com/cooking/eggs#boiling-an-egg');
});

test('shows the matched section when the top page was fetched', () => {
    const message = formatSearchResults(results, baseUrl, 'boil an egg', brand, eggsPage) as Message;

    assert.equal(message.embeds[0]?.title, 'Cooking eggs › Boiling an egg');
    assert.equal(message.embeds[0]?.description, 'Place the egg in water.');
});

test('lists results in a menu with the shown result selected', () => {
    const options = select(formatSearchResults(results, baseUrl, 'cooking', brand) as Message)?.options;

    assert.deepEqual(options?.map(({ label, value, default: selected }) => ({ label, value, selected })), [
        { label: 'Cooking eggs › Boiling an egg', value: 'cooking/eggs#boiling-an-egg', selected: true },
        { label: 'Pasta', value: 'cooking/pasta', selected: false }
    ]);
});

test('omits the menu for a single result and skips values Discord would reject', () => {
    assert.equal(select(formatSearchResults(results.slice(1), baseUrl, 'pasta', brand) as Message), undefined);

    const longSlug = { title: 'Long', description: '', slug: 'x'.repeat(101), excerpt: '' };
    assert.equal(select(formatSearchResults([results[1]!, longSlug], baseUrl, 'pasta', brand) as Message), undefined);
});

test('leaves the home page out of the menu, since Discord rejects empty option values', () => {
    const home = { title: 'Home', description: 'Welcome.', slug: '', excerpt: '' };
    const options = select(formatSearchResults([...results, home], baseUrl, 'cooking', brand) as Message)?.options ?? [];

    assert.deepEqual(options.map((option) => option.value), ['cooking/eggs#boiling-an-egg', 'cooking/pasta']);
    assert.ok(options.every((option) => option.value.length > 0 && option.value.length <= 100));
});

test('moves the selection when another result is chosen', () => {
    const original = formatSearchResults(results, baseUrl, 'cooking', brand) as Message;
    const updated = formatSelectedResult(eggsPage, baseUrl, brand, 'cooking/eggs#frying', original.components) as Message;

    assert.equal(updated.embeds[0]?.title, 'Cooking eggs › Frying');
    assert.equal(updated.embeds[0]?.description, 'Heat the pan.');
    assert.equal(link(updated), 'https://docs.example.com/cooking/eggs#frying');
    assert.deepEqual(select(updated)?.options?.map((option) => option.default), [false, false]);

    const pasta = formatSelectedResult({ ...eggsPage, title: 'Pasta', slug: 'cooking/pasta' }, baseUrl, brand, 'cooking/pasta', original.components) as Message;
    assert.deepEqual(select(pasta)?.options?.map((option) => option.default), [false, true]);
});

test('parses result values', () => {
    assert.deepEqual(parseResultValue('cooking/eggs#boiling-an-egg'), { slug: 'cooking/eggs', header: 'boiling-an-egg' });
    assert.deepEqual(parseResultValue('cooking/pasta'), { slug: 'cooking/pasta' });
});

test('keeps the typed question as the first autocomplete choice', () => {
    assert.deepEqual(queryChoices('how to cook an egg', ['Cooking eggs', 'Pasta']), [
        { name: 'Search: how to cook an egg', value: 'how to cook an egg' },
        { name: 'Cooking eggs', value: 'Cooking eggs' },
        { name: 'Pasta', value: 'Pasta' }
    ]);
    assert.deepEqual(queryChoices('pasta', ['Pasta']), [{ name: 'Search: pasta', value: 'pasta' }]);
    assert.deepEqual(queryChoices('  ', []), []);
});

test('enforces Discord autocomplete limits', () => {
    const choices = autocompleteChoices([
        { name: 'x'.repeat(150), value: 'long-name' },
        { name: 'Too long', value: 'y'.repeat(101) },
        ...Array.from({ length: 30 }, (_, index) => ({ name: `Page ${index}`, value: `page-${index}` }))
    ]);

    assert.equal(choices.length, 25);
    assert.equal(choices[0]?.name.length, 100);
    assert.ok(choices.every((choice) => choice.value.length <= 100));
});
