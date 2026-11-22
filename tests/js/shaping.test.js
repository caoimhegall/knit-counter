import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    parseStitches, nextStitch, stitchesUsed, rowEndCount, STITCHES,
} from '../../resources/js/counter.js';

test('parseStitches reads increases and decreases', () => {
    assert.deepEqual(parseStitches('k2 m1r k2tog'), ['k', 'k', 'm1r', 'k2tog']);
    assert.deepEqual(parseStitches('ssk yo p2tog'), ['ssk', 'yo', 'p2tog']);
    assert.deepEqual(parseStitches('kfb pfb m1 m1l m1p'), ['kfb', 'pfb', 'm1', 'm1l', 'm1p']);
    assert.deepEqual(parseStitches('k3tog sk2p sl1'), ['k3tog', 'sk2p', 'sl1']);
});

test('parseStitches: k2tog is one stitch, not k2 + tog; counts repeat any stitch', () => {
    assert.deepEqual(parseStitches('k2tog'), ['k2tog']);
    assert.deepEqual(parseStitches('K2TOG, P2'), ['k2tog', 'p', 'p']);
    assert.deepEqual(parseStitches('yo2'), ['yo', 'yo']);
    assert.deepEqual(parseStitches('k2togk2'), ['k2tog', 'k', 'k']);
});

test('every supported stitch has uses/makes and a spoken name', () => {
    for (const [name, st] of Object.entries(STITCHES)) {
        assert.ok(Number.isInteger(st.uses) && st.uses >= 0, name);
        assert.ok(Number.isInteger(st.makes) && st.makes >= 1, name);
        assert.ok(st.label.length > 0, name);
    }
    assert.deepEqual([STITCHES.k2tog.uses, STITCHES.k2tog.makes], [2, 1]);
    assert.deepEqual([STITCHES.m1r.uses, STITCHES.m1r.makes], [0, 1]);
    assert.deepEqual([STITCHES.kfb.uses, STITCHES.kfb.makes], [1, 2]);
    assert.deepEqual([STITCHES.sk2p.uses, STITCHES.sk2p.makes], [3, 1]);
});

const shaped = [{ side: '', stitches: 'k2 m1r k2tog', rows: 1 }];

test('nextStitch walks through shaped stitches', () => {
    assert.equal(nextStitch(shaped, 0, 0), 'k');
    assert.equal(nextStitch(shaped, 0, 2), 'm1r');
    assert.equal(nextStitch(shaped, 0, 3), 'k2tog');
    assert.equal(nextStitch(shaped, 0, 4), 'k');
});

test('stitchesUsed counts stitches taken off the left needle', () => {
    assert.equal(stitchesUsed(shaped, 0, 0), 0);
    assert.equal(stitchesUsed(shaped, 0, 2), 2);   // k k
    assert.equal(stitchesUsed(shaped, 0, 3), 2);   // + m1r uses none
    assert.equal(stitchesUsed(shaped, 0, 4), 4);   // + k2tog uses two
    assert.equal(stitchesUsed(shaped, 0, 9), 9);   // two repeats (8) + k
});

test('stitchesUsed with no pattern is just the tap count', () => {
    assert.equal(stitchesUsed([], 0, 7), 7);
});

test('rowEndCount: stitches you will have when the row is done', () => {
    const inc = [{ side: '', stitches: 'k2 m1r k2', rows: 1 }];
    assert.equal(rowEndCount(inc, 0, 40), 50);
    const dec = [{ side: '', stitches: 'k2 k2tog', rows: 1 }];
    assert.equal(rowEndCount(dec, 0, 40), 30);
    assert.equal(rowEndCount([{ side: '', stitches: 'k1 p1', rows: 1 }], 0, 40), 40);
});

test('rowEndCount stops before a decrease that would run past the end', () => {
    // 10 stitches of "k2tog k1": 3 repeats use 9 (make 6); a k2tog won't fit the last 1, which is counted as worked plain
    const dec = [{ side: '', stitches: 'k2tog k1', rows: 1 }];
    assert.equal(rowEndCount(dec, 0, 10), 6 + 1);
});

test('rowEndCount is null without a total or with a repeat that uses no stitches', () => {
    assert.equal(rowEndCount(shaped, 0, null), null);
    assert.equal(rowEndCount([{ side: '', stitches: 'm1 yo', rows: 1 }], 0, 40), null);
    assert.equal(rowEndCount([], 0, 40), null);
});
