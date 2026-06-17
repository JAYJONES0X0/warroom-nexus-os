import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_WARROOM_STATE,
  getSessionLabel,
  type AccountProfile,
  type ConfluenceState,
  type QuoteState,
  type SetupState,
  type WarroomState,
  type WarroomTimeframe,
} from "@/lib/warroomCommand";

interface WarroomContextValue {
  state: WarroomState;
  setAsset: (asset: string) => void;
  setTimeframe: (timeframe: WarroomTimeframe) => void;
  updateAccount: (patch: Partial<AccountProfile>) => void;
  updateQuote: (quote: QuoteState | null) => void;
  updateConfluence: (patch: Partial<ConfluenceState>) => void;
  updateSetup: (patch: Partial<SetupState>) => void;
  setStructureReady: (ready: boolean) => void;
  setCorrelationReady: (ready: boolean) => void;
  reset: () => void;
}

const WarroomContext = createContext<WarroomContextValue | null>(null);
const STORAGE_KEY = "warroom.command.state.v1";

function loadInitial(): WarroomState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WARROOM_STATE;
    const saved = JSON.parse(raw) as Partial<WarroomState>;
    return {
      ...DEFAULT_WARROOM_STATE,
      ...saved,
      selectedSession: getSessionLabel(),
      // never restore old quotes as live truth
      liveQuote: null,
      confluence: saved.confluence ?? DEFAULT_WARROOM_STATE.confluence,
      setup: saved.setup ?? DEFAULT_WARROOM_STATE.setup,
      accountProfile: {
        ...DEFAULT_WARROOM_STATE.accountProfile,
        ...(saved.accountProfile ?? {}),
      },
    };
  } catch {
    return DEFAULT_WARROOM_STATE;
  }
}

export function WarroomProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WarroomState>(loadInitial);

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => ({ ...s, selectedSession: getSessionLabel() }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const persistable: WarroomState = { ...state, liveQuote: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [state]);

  // Actions are memoized with stable identities (empty deps) and use functional
  // setState — they need nothing from the closure. This is the fix for the patch's
  // original [state]-keyed memo, which recreated these callbacks on every state
  // change and, combined with CommandScreen's effect dependency arrays, caused an
  // infinite "Maximum update depth exceeded" loop at runtime.
  const setAsset = useCallback((asset: string) => setState((s) => ({
    ...s,
    selectedAsset: asset,
    liveQuote: null,
    structureContext: null,
    correlationState: null,
    confluence: {
      score: 0,
      reasons: [],
      blockers: [`${asset} selected. Awaiting synchronized data.`],
    },
    setup: {
      command: "MISSING_DATA",
      direction: "NEUTRAL",
      nextCheck: "Load selected-asset quote, structure, and correlation state.",
    },
    journalDraft: null,
  })), []);

  const setTimeframe = useCallback((timeframe: WarroomTimeframe) =>
    setState((s) => ({ ...s, selectedTimeframe: timeframe })), []);

  const updateAccount = useCallback((patch: Partial<AccountProfile>) =>
    setState((s) => ({ ...s, accountProfile: { ...s.accountProfile, ...patch } })), []);

  const updateQuote = useCallback((quote: QuoteState | null) =>
    setState((s) => ({ ...s, liveQuote: quote })), []);

  const updateConfluence = useCallback((patch: Partial<ConfluenceState>) =>
    setState((s) => ({ ...s, confluence: { ...s.confluence, ...patch } })), []);

  const updateSetup = useCallback((patch: Partial<SetupState>) =>
    setState((s) => ({ ...s, setup: { ...s.setup, ...patch } })), []);

  const setStructureReady = useCallback((ready: boolean) => setState((s) => ({
    ...s,
    structureContext: ready ? { source: "manual-or-engine", timestamp: Date.now() } : null,
  })), []);

  const setCorrelationReady = useCallback((ready: boolean) => setState((s) => ({
    ...s,
    correlationState: ready ? { source: "warroom-correlation-shield", timestamp: Date.now() } : null,
  })), []);

  const reset = useCallback(() => setState(DEFAULT_WARROOM_STATE), []);

  const value = useMemo<WarroomContextValue>(() => ({
    state, setAsset, setTimeframe, updateAccount, updateQuote,
    updateConfluence, updateSetup, setStructureReady, setCorrelationReady, reset,
  }), [state, setAsset, setTimeframe, updateAccount, updateQuote, updateConfluence, updateSetup, setStructureReady, setCorrelationReady, reset]);

  return <WarroomContext.Provider value={value}>{children}</WarroomContext.Provider>;
}

export function useWarroom() {
  const ctx = useContext(WarroomContext);
  if (!ctx) throw new Error("useWarroom must be used inside WarroomProvider");
  return ctx;
}
