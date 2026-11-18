# Stitch pattern & "Next stitch" — design

## Why
While knitting an easy pattern, see which stitch comes next without counting it out.

## What
- Each project can have **stitches on needles** (e.g. 40) → stitch card shows "12 of 40".
- Each project can have a **pattern**: a repeating list of steps. Each step has:
  - optional side label: RS / WS
  - stitches, e.g. `k1 p1`, `k2 p2`, `k` (k/p only; spaces optional, `k 1 p 1` works)
  - how many rows it lasts (≥ 1)
- The **Rows** count (rows done) picks the current step, cycling through the list.
- The stitch card shows **Next: k / p**, from the step's repeat and the stitch count.
- Tapping **Row +** sets Stitches back to 0 (new row). Row − leaves Stitches alone (it's a correction).
- No automatic row change when the row's stitch total is reached.

## Not now
- Stitches that change the count (yo, k2tog, …), charts, per-row stitch totals.

## Decided by the builder
- Stitches past the total aren't blocked; the "of 40" just turns rose to flag it.
- Old saved projects load with an empty pattern and no total.
- Pattern editing happens in a pearl pop-up opened from a "Pattern" button.
