import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Native confirm()/prompt() dialogs are silently blocked in some browsers and
// embedded web views (they return false/null instantly), which made Reset,
// Delete and Rename do nothing. The page must confirm in-page instead.
for (const file of ['resources/js/app.js', 'resources/views/counter.blade.php']) {
    test(`${file} does not use native confirm/prompt/alert dialogs`, () => {
        const src = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
        assert.doesNotMatch(src, /\b(confirm|prompt|alert)\s*\(/);
    });
}
