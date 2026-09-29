import assert from 'node:assert/strict';
import test from 'node:test';

import type { PageResult } from '../src/cad/types.js';
import { sectionText, truncateMarkdown } from '../src/discord/sections.js';

const toc = [
    { id: 'boiling', title: 'Boiling', level: 2 },
    { id: 'timing', title: 'Timing', level: 3 },
    { id: 'frying', title: 'Frying', level: 2 },
    { id: 'notes', title: 'Notes', level: 2 },
    { id: 'notes-2', title: 'Notes', level: 2 }
];

const markdown = [
    '## Boiling',
    '',
    'Place the **egg** in water.',
    '',
    '```bash',
    '# not a heading',
    'boil --minutes 6',
    '```',
    '',
    '### Timing',
    '',
    'Six minutes.',
    '',
    '## Frying',
    '',
    ':::tip[Hot pan]',
    'Heat the pan first.',
    ':::',
    '',
    ':::warning',
    'Mind the oil.',
    ':::',
    '',
    '## Notes',
    '',
    'First notes.',
    '',
    '## Notes',
    '',
    'Second notes.'
].join('\n');

const page = (fields: Partial<PageResult>): PageResult => ({ title: 'Eggs', description: '', excerpt: '', slug: 'eggs', toc, ...fields });

test('stops at the next heading of the same level', () => {
    const text = sectionText(page({ markdown }), toc[0]!);

    assert.ok(text?.includes('boil --minutes 6'));
    assert.ok(text?.includes('**Timing**'), 'subheadings stay, as bold text');
    assert.ok(!text?.includes('Frying'));
});

test('keeps code blocks and ignores # lines inside them', () => {
    const text = sectionText(page({ markdown }), toc[0]!);

    assert.match(text ?? '', /```bash\n# not a heading\nboil --minutes 6\n```/);
});

test('turns directives into bold titles', () => {
    assert.equal(sectionText(page({ markdown }), toc[2]!), '**Hot pan**\nHeat the pan first.\n\n**Warning**\nMind the oil.');
});

test('finds the right occurrence of a repeated heading', () => {
    assert.equal(sectionText(page({ markdown }), toc[3]!), 'First notes.');
    assert.equal(sectionText(page({ markdown }), toc[4]!), 'Second notes.');
});

test('falls back to rendered HTML when CAD sends no Markdown', () => {
    const content = [
        '<h2 id="boiling">Boiling <a class="heading-anchor" href="#boiling">#</a></h2>',
        '<p>Place the egg &amp; water in a pan.</p>',
        '<div class="code-block"><span class="code-language">ts</span><button>Copy<svg></svg></button><pre>boil();</pre></div>',
        '<h3 id="timing">Timing</h3><p>Six minutes.</p>',
        '<h2 id="frying">Frying</h2><p>Heat the pan.</p>'
    ].join('\n');

    const text = sectionText(page({ content }), toc[0]!) ?? '';

    assert.match(text, /Place the egg & water in a pan\./);
    assert.match(text, /boil\(\);/);
    assert.match(text, /Six minutes\./);
    assert.ok(!text.includes('Heat the pan'));
    assert.ok(!text.includes('Copy') && !text.includes('ts\n'));
});

test('reads Markdown sent as content by sites that predate the markdown field', () => {
    assert.equal(sectionText(page({ content: markdown }), toc[3]!), 'First notes.');
});

test('converts rendered HTML without leaking heading permalinks as Markdown', () => {
    const anchor = (id: string) => `\n\t\t\t\t<a\n\t\t\t\t\tclass="heading-anchor"\n\t\t\t\t\thref="#${id}"\n\t\t\t\t>\n\t\t\t\t\t#\n\t\t\t\t</a>\n\t\t`;
    const content = [
        `<h2 id="boiling">\n\t\t\tBoiling${anchor('boiling')}</h2>`,
        '\t<p>Place the egg in <strong>boiling</strong> water &amp; wait. Use <code>boil()</code>.</p>',
        `<h3 id="timing">\n\t\t\tTiming${anchor('timing')}</h3>`,
        '\t<p>- not a list, # not a heading</p>',
        '<ul><li>Six minutes</li><li>Seven if large</li></ul>',
        '<div class="code-block"><span class="code-language">sh</span><button>Copy</button><pre class="shiki">\n\t\t\t<code><span class="line"># set a timer</span>\n<span class="line">sleep 360</span></code></pre></div>',
        `<h2 id="frying">\n\t\t\tFrying${anchor('frying')}</h2>`,
        '<p>Heat the pan.</p>'
    ].join('\n');

    assert.equal(sectionText(page({ content }), toc[0]!), [
        'Place the egg in **boiling** water & wait. Use `boil()`.',
        '',
        '**Timing**',
        '',
        '\\- not a list, # not a heading',
        '',
        '- Six minutes',
        '- Seven if large',
        '',
        '```',
        '# set a timer',
        'sleep 360',
        '```'
    ].join('\n'));
});

test('returns nothing for a heading that is not on the page', () => {
    assert.equal(sectionText(page({ markdown }), { id: 'missing', title: 'Missing', level: 2 }), undefined);
});

test('closes a code block cut off by truncation', () => {
    const text = truncateMarkdown(`Intro\n\n\`\`\`ts\n${'const value = 1;\n'.repeat(20)}\`\`\``, 100);

    assert.ok(text.length <= 100);
    assert.equal((text.match(/```/g) ?? []).length % 2, 0);
    assert.ok(text.endsWith('…'));
});
