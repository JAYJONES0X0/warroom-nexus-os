# WARROOM Command Architecture Reset — Implementation Batch 1

This patch restores WARROOM's centre:

```txt
Selected asset → synchronized intelligence → command decision → execution plan → feedback loop
```

## Files added

- `src/lib/warroomCommand.ts`
- `src/context/WarroomStateContext.tsx`
- `src/pages/CommandScreen.tsx`

## File replaced

- `src/App.tsx`

## What this batch does

- Makes `/` and `/command` render the Command screen.
- Keeps legacy home at `/legacy-home`.
- Keeps Polymarket at `/polymarket`, but it is no longer the default identity.
- Adds one global WARROOM state layer.
- Adds account-size neutral risk model.
- Adds Command states: `AUTHORIZE`, `DELAY`, `DENY`, `MONITOR`, `INVALIDATED`, `MISSING_DATA`.
- Binds the Command screen to selected asset/timeframe.
- Pulls live quote from existing `usePrices()`.
- Pulls EXA score from existing `useEXAScores()`.
- Prevents missing/stale data from becoming fake authorization.
- Adds fixed `WARROOM READ` output format.

## Required verification

Run:

```bash
npm run build
npm test
```

Manual QA:

- Select EURUSD: Command state, quote, confluence, AI read update to EURUSD.
- Select XAUUSD: Command state, quote, confluence, AI read update to XAUUSD.
- If no quote/structure/correlation is available, command must show `MISSING_DATA`.
- Changing timeframe updates WARROOM state.
- `/polymarket` still exists but is not the default.
