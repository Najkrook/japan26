import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';

const SOURCE_GLOB = 'src/**/*.{ts,tsx,css,html}';
const SOURCE_FILES = globSync(SOURCE_GLOB, {
  ignore: ['**/__tests__/**', '**/node_modules/**'],
});

const toUnicodeEscapes = (value: string): string =>
  Array.from(value)
    .map((char) => {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined || codePoint <= 0x7f) {
        return char;
      }

      return `\\u${codePoint.toString(16).padStart(4, '0')}`;
    })
    .join('');

const FORBIDDEN_SNIPPETS = [
  '\u00c3\u00a5', // Ã¥
  '\u00c3\u00a4', // Ã¤
  '\u00c3\u00b6', // Ã¶
  '\u00c3\u2026', // Ã…
  '\u00c3\u201e', // Ã„
  '\u00c3\u2013', // Ã–
  '\u00ef\u00bf\u00bd', // replacement character shown as mojibake
  '\ufffd', // replacement character
];

const REQUIRED_SENTINELS = [
  {
    file: 'src/App.tsx',
    expected: 'Välkommen till resedagboken',
  },
  {
    file: 'src/App.tsx',
    expected: 'Hämtar minnen...',
  },
  {
    file: 'src/components/AdminLogin.tsx',
    expected: 'Bara godkända konton får uppladdningsåtkomst och adminbehörighet.',
  },
  {
    file: 'src/config/hardcodedAccounts.ts',
    expected: 'Våring',
  },
];

const getLineNumber = (content: string, index: number): number =>
  content.slice(0, index).split('\n').length;

describe('Swedish integrity', () => {
  it('contains no mojibake or replacement characters in app source files', () => {
    const findings: string[] = [];

    for (const file of SOURCE_FILES) {
      const content = fs.readFileSync(file, 'utf8');

      for (const snippet of FORBIDDEN_SNIPPETS) {
        let searchIndex = content.indexOf(snippet);

        while (searchIndex !== -1) {
          const lineNumber = getLineNumber(content, searchIndex);
          const line = content.split('\n')[lineNumber - 1]?.trim() ?? '';
          findings.push(`${file}:${lineNumber}: ${JSON.stringify(line)}`);
          searchIndex = content.indexOf(snippet, searchIndex + snippet.length);
        }
      }
    }

    expect(
      findings,
      `Found suspicious mojibake or replacement characters:\n${findings.join('\n')}`,
    ).toHaveLength(0);
  });

  it('keeps important Swedish UI and config strings intact', () => {
    for (const sentinel of REQUIRED_SENTINELS) {
      const absolutePath = path.resolve(process.cwd(), sentinel.file);
      const content = fs.readFileSync(absolutePath, 'utf8');
      const escapedVariant = toUnicodeEscapes(sentinel.expected);

      expect(
        content.includes(sentinel.expected) || content.includes(escapedVariant),
        `${sentinel.file} should contain ${JSON.stringify(sentinel.expected)} as text or unicode escapes.`,
      ).toBe(true);
    }
  });
});
