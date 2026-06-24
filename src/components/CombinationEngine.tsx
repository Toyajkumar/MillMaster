/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Printer, ChevronDown, CheckSquare, Square, Layers, Sparkles, Filter, Calculator, Calendar, Clock, Trash, BookOpen } from 'lucide-react';
import { Order, Combo, Config, SavedScheme, PurchaseOrder } from '../types';
import { solveCombos, formatSize, calcExactWeight } from '../utils/engine';

const getPartyColors = (party: string) => {
  const p = party.toLowerCase();
  if (p.includes('millmaster') || p.includes('alpha')) {
    return { bg: 'bg-gradient-to-r from-sky-500 to-indigo-600', text: 'text-white border-sky-600' };
  }
  if (p.includes('beta')) {
    return { bg: 'bg-gradient-to-r from-amber-500 to-orange-600', text: 'text-white border-orange-600' };
  }
  if (p.includes('gamma')) {
    return { bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', text: 'text-white border-teal-600' };
  }
  
  // Custom deterministic hashing for any client name to dynamic lovely primary gradient categories
  let hash = 0;
  for (let i = 0; i < party.length; i++) {
    hash = party.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  const colors = [
    { bg: 'bg-gradient-to-r from-[#3b82f6] to-[#6366f1]', text: 'text-white' }, // Blue-Indigo
    { bg: 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]', text: 'text-white' }, // Indigo-Purple
    { bg: 'bg-gradient-to-r from-[#14b8a6] to-[#10b981]', text: 'text-white' }, // Teal-Green
    { bg: 'bg-gradient-to-r from-[#f59e0b] to-[#d97706]', text: 'text-white' }, // Amber-Orange
    { bg: 'bg-gradient-to-r from-[#64748b] to-[#475569]', text: 'text-white' }  // Cool Slate
  ];
  return colors[index];
};

interface CombinationEngineProps {
  orders: Order[];
  config: Config;
  combos: Combo[];
  savedSchemes: SavedScheme[];
  onSaveScheme: (combos: Combo[], draftOrders: Order[]) => void;
  onRemoveScheme: (id: number) => void;
  onCombosGenerated: (combos: Combo[], updatedOrders: Order[]) => void;
  onOpenSaveSession: () => void;
  requirePin?: (actionLabel: string, onSuccess: () => void) => void;
  pos?: PurchaseOrder[];
  onTriggerPrint?: () => void;
}

export default function CombinationEngine({
  orders,
  config,
  combos,
  savedSchemes,
  onSaveScheme,
  onRemoveScheme,
  onCombosGenerated,
  onOpenSaveSession,
  requirePin,
  pos = [],
  onTriggerPrint,
}: CombinationEngineProps) {
  // Proposed local draft states for uncommitted results
  const [draftCombos, setDraftCombos] = useState<Combo[] | null>(null);
  const [draftOrders, setDraftOrders] = useState<Order[] | null>(null);
  const [draftStats, setDraftStats] = useState<{
    totalChecked: number;
    validStructures: number;
    iterations: number;
    usedPct: number;
  } | null>(null);

  // Advanced Combination filter settings
  const [filterParty, setFilterParty] = useState('');
  const [filterGsm, setFilterGsm] = useState('');
  const [filterBf, setFilterBf] = useState('');

  const [deckleMin, setDeckleMin] = useState(String(config.dmin));
  const [deckleMax, setDeckleMax] = useState(String(config.dmax));

  // Custom Mix Mode settings
  const [mixMode, setMixMode] = useState(false);
  const [mixGsmTol, setMixGsmTol] = useState(5);
  const [mixBfTol, setMixBfTol] = useState(1);

  // Advanced selection panel toggle state
  const [pselOpen, setPselOpen] = useState(false);

  // Active selective sets
  const [selectedParties, setSelectedParties] = useState<string[] | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[] | null>(null);
  const [partyMtLimits, setPartyMtLimits] = useState<Record<string, number>>({});

  // Engine Stats Info
  const [engineStats, setEngineStats] = useState<{
    totalChecked: number;
    validStructures: number;
    iterations: number;
    usedPct: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Print Format options mapping exact PDF structures
  const [printStyle, setPrintStyle] = useState<'digital' | 'industrial'>(() => {
    return (localStorage.getItem('mm_print_style') as 'digital' | 'industrial') || 'industrial';
  });
  const [millName, setMillName] = useState(() => {
    return localStorage.getItem('mm_print_mill') || 'ANANYA PAPER INDUSTRIES PVT. LTD.';
  });
  const [orderSub, setOrderSub] = useState(() => {
    return localStorage.getItem('mm_print_sub') || 'MACHINE ORDER NATURAL SHADE';
  });
  const [coreDia, setCoreDia] = useState(() => {
    return localStorage.getItem('mm_print_core') || '38"';
  });
  const [editPrintSettings, setEditPrintSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('mm_print_style', printStyle);
  }, [printStyle]);

  useEffect(() => {
    localStorage.setItem('mm_print_mill', millName);
  }, [millName]);

  useEffect(() => {
    localStorage.setItem('mm_print_sub', orderSub);
  }, [orderSub]);

  useEffect(() => {
    localStorage.setItem('mm_print_core', coreDia);
  }, [coreDia]);

  const hasDraft = draftCombos !== null;
  const displayCombos = hasDraft ? draftCombos! : combos;
  const displayOrders = hasDraft ? draftOrders! : orders;
  const displayStats = hasDraft ? draftStats : engineStats;

  // Dynamically obtain filters list
  const activeOrders = orders.filter((o) => !o.hold && !o.completed && o.reels > 0);
  const partiesList = Array.from(new Set(activeOrders.map((o) => o.party))).sort();

  // If a specific party is filtered, filter GSM/BF based on that party
  let gsmPool = activeOrders;
  if (filterParty) gsmPool = gsmPool.filter((o) => o.party === filterParty);
  const gsmList = Array.from(new Set(gsmPool.map((o) => o.gsm))).sort((a, b) => a - b);

  let bfPool = gsmPool;
  if (filterGsm) bfPool = bfPool.filter((o) => String(o.gsm) === filterGsm);
  const bfList = Array.from(new Set(bfPool.map((o) => o.bf))).sort((a, b) => a - b);

  // Clear filters if the active list changes
  useEffect(() => {
    if (filterParty && !partiesList.includes(filterParty)) setFilterParty('');
  }, [orders]);

  // Synchronise deckles with settings updates
  useEffect(() => {
    setDeckleMin(String(config.dmin));
    setDeckleMax(String(config.dmax));
  }, [config]);

  // Reset selected groups when queue empties
  useEffect(() => {
    if (orders.length === 0) {
      setSelectedParties(null);
      setSelectedOrderIds(null);
      setPartyMtLimits({});
    }
  }, [orders]);

  const handleRunOptimizer = () => {
    setLoading(true);
    setTimeout(() => {
      const dMinVal = parseFloat(deckleMin) || config.dmin;
      const dMaxVal = parseFloat(deckleMax) || config.dmax;

      const result = solveCombos({
        orders,
        config,
        dmin: dMinVal,
        dmax: dMaxVal,
        selectedPartyIds: selectedParties,
        selectedOrderIds,
        partyMtLimits,
        filters: { party: filterParty, gsm: filterGsm, bf: filterBf },
        mixMode,
        mixGsmTol,
        mixBfTol,
      });

      setDraftCombos(result.combos);
      setDraftOrders(result.updatedOrders);
      setDraftStats(result.stats);
      setLoading(false);
    }, 150);
  };

  const handleCommitDraft = () => {
    if (draftCombos && draftOrders) {
      onSaveScheme(draftCombos, draftOrders);
      setDraftCombos(null);
      setDraftOrders(null);
      setDraftStats(null);
    }
  };

  const handleDismissDraft = () => {
    setDraftCombos(null);
    setDraftOrders(null);
    setDraftStats(null);
  };

  const handlePrint = () => {
    if (onTriggerPrint) {
      onTriggerPrint();
    } else {
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.warn("Print dialogue trigger failed", e);
      }
    }
  };

  // Advanced selector utility
  const handleTogglePartySelection = (partyName: string) => {
    const list = selectedParties === null ? [...partiesList] : [...selectedParties];
    if (list.includes(partyName)) {
      const filtered = list.filter((p) => p !== partyName);
      setSelectedParties(filtered.length === partiesList.length ? null : filtered);
    } else {
      list.push(partyName);
      setSelectedParties(list.length === partiesList.length ? null : list);
    }
  };

  const handleSelectAllParties = () => {
    setSelectedParties(null);
  };

  const handleClearAllParties = () => {
    setSelectedParties([]);
  };

  const handleToggleOrderSelection = (id: number) => {
    const allIds = activeOrders.map((o) => o.id);
    const list = selectedOrderIds === null ? [...allIds] : [...selectedOrderIds];
    if (list.includes(id)) {
      const filtered = list.filter((oid) => oid !== id);
      setSelectedOrderIds(filtered.length === allIds.length ? null : filtered);
    } else {
      list.push(id);
      setSelectedOrderIds(list.length === allIds.length ? null : list);
    }
  };

  const handleSelectAllSizes = () => {
    setSelectedOrderIds(null);
  };

  const handlePartyLimitChange = (partyName: string, maxMt: string) => {
    const val = parseFloat(maxMt);
    setPartyMtLimits((prev) => {
      const copy = { ...prev };
      if (isNaN(val) || val <= 0) {
        delete copy[partyName];
      } else {
        copy[partyName] = val;
      }
      return copy;
    });
  };

  // Render Machine Sheet & Ledgers
  const renderResults = () => {
    if (displayCombos.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm animate-fade-in">
          <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 text-sm">No Active Multi-Cut Schemes</h3>
          <p className="text-xs text-slate-400 mt-1">Configure your Deckle constraints, toggle filters and run the combination engine to generate potential layouts.</p>
        </div>
      );
    }

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const maxComboWidth = Math.max(...displayCombos.map((c) => c.items.length));

    const totalSets = displayCombos.reduce((sum, c) => sum + c.sets, 0);
    const totalLossCm = displayCombos.reduce((sum, c) => sum + c.loss * c.sets, 0);
    const totalLossKg = displayCombos.reduce((sum, c) => sum + c.lossWtKg, 0);
    const totalUsedReels = displayOrders.reduce((sum, o) => sum + o.used, 0);
    const totalWeightKg = displayOrders.reduce((sum, o) => sum + o.used * o.w, 0);

    // Ledger Calculation Maps
    const partyMap: Record<string, Record<string, Record<number, { size: number; unit: 'cm' | 'inch' | 'mm'; sizeCm: number; w: number; reels: number; exactWeight: number }>>> = {};

    displayCombos.forEach((c) => {
      const countMap: Record<number, number> = {};
      c.items.forEach((item) => {
        countMap[item.id] = (countMap[item.id] || 0) + 1;
      });

      const seen = new Set<number>();
      c.items.forEach((o) => {
        if (seen.has(o.id)) return;
        seen.add(o.id);

        const cnt = countMap[o.id];
        const reelsUsed = c.sets * cnt;
        const exactWt = calcExactWeight(o, reelsUsed, config.mult);

        if (!partyMap[o.party]) partyMap[o.party] = {};
        const gk = `${o.gsm}/${o.bf}`;
        if (!partyMap[o.party][gk]) partyMap[o.party][gk] = {};
        if (!partyMap[o.party][gk][o.id]) {
          partyMap[o.party][gk][o.id] = {
            size: o.size,
            unit: o.unit,
            sizeCm: o.sizeCm,
            w: o.w,
            reels: 0,
            exactWeight: 0,
          };
        }
        partyMap[o.party][gk][o.id].reels += reelsUsed;
        partyMap[o.party][gk][o.id].exactWeight += exactWt;
      });
    });

    const isMixedActivated = displayCombos.some((c) => c.mixed);

    return (
      <div className="space-y-6">
        {/* Proposed draft vs active saved bar */}
        {hasDraft ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 select-none no-print animate-fade-in">
            <div className="space-y-0.5">
              <div className="text-amber-800 font-extrabold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                Proposed Cut Scheme Draft: {totalSets} sets generated
              </div>
              <div className="text-amber-650 text-xxs font-semibold leading-relaxed">
                🔴 This combination is a proposed draft. Active orders and remaining stock are NOT affected yet.
              </div>
            </div>
            <div className="flex gap-2 text-xxs font-bold">
              <button
                type="button"
                onClick={handleDismissDraft}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-3 rounded-xl transition cursor-pointer select-none border border-slate-300"
              >
                Dismiss Draft
              </button>
              <button
                type="button"
                onClick={handleCommitDraft}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 px-4 rounded-xl transition cursor-pointer select-none shadow-md shadow-amber-500/15"
              >
                💾 Save Combination Scheme
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 select-none no-print">
            <div>
              <div className="text-emerald-800 font-extrabold text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Active Multi-Cut Scheme: {totalSets} sets generated
              </div>
              <div className="text-emerald-700 text-xs font-semibold mt-0.5">
                Utilized <span className="font-extrabold">{totalUsedReels} reels</span> in cuts &middot;{' '}
                <span className="font-extrabold font-mono">{(totalWeightKg / 1000).toFixed(3)} MT</span> produced tonnage weight inside limits.
              </div>
            </div>
            <button
              onClick={onOpenSaveSession}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl transition shadow-md shadow-emerald-600/15 cursor-pointer"
            >
              Save Session Snapshot
            </button>
          </div>
        )}

        {/* Engine Performance telemetry debug bar */}
        {displayStats && (
          <div className="bg-sky-50/50 border border-sky-100 rounded-xl py-2 px-4 text-xs font-semibold flex flex-wrap gap-x-6 gap-y-1 text-sky-800 select-none no-print">
            <span className="flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-sky-500" />
              Checked: <strong>{displayStats.totalChecked.toLocaleString()}</strong> loops
            </span>
            <span>
              Valid structures: <strong>{displayStats.validStructures}</strong>
            </span>
            <span>
              Phase Iterations: <strong>{displayStats.iterations}</strong>
            </span>
            <span>
              Reel Yield Ratio: <strong>{displayStats.usedPct}%</strong>
            </span>
            {isMixedActivated && <span className="text-purple-700">🔀 Mix Mode: Activated</span>}
          </div>
        )}

        {/* REPORT & PRINT LAYOUT FORMAT SELECTOR PANEL */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print select-none mb-6">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-indigo-600 animate-bounce" />
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider">Report & Print Layout Format</div>
              <div className="text-[11px] text-slate-500 font-medium">Select a format to print the slitting program and billing ledgers.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPrintStyle('digital')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                printStyle === 'digital'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
              }`}
            >
              💻 Digital Interactive
            </button>
            <button
              onClick={() => setPrintStyle('industrial')}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                printStyle === 'industrial'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-250'
              }`}
            >
              🏭 Industrial Style (Invoice Print)
            </button>

            <button
              onClick={() => setEditPrintSettings(!editPrintSettings)}
              className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                editPrintSettings
                  ? 'bg-amber-100 border-amber-300 text-amber-805'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              ⚙️ {editPrintSettings ? 'Close' : 'Edit Header'}
            </button>
          </div>
        </div>

        {/* CUSTOMIZE PRINT HEADER INPUTS PANEL */}
        {editPrintSettings && (
          <div className="bg-amber-50/60 border border-amber-250 rounded-2xl p-5 space-y-4 no-print animate-fade-in mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-extrabold text-slate-550 uppercase">Company Name (Print Header)</label>
                <input
                  type="text"
                  value={millName}
                  onChange={(e) => setMillName(e.target.value.toUpperCase())}
                  placeholder="ANANYA PAPER INDUSTRIES PVT. LTD."
                  className="bg-white border border-slate-250 rounded-xl py-1.5 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-extrabold text-slate-550 uppercase">Machine / Subtitle text</label>
                <input
                  type="text"
                  value={orderSub}
                  onChange={(e) => setOrderSub(e.target.value.toUpperCase())}
                  placeholder="MACHINE ORDER NATURAL SHADE"
                  className="bg-white border border-slate-250 rounded-xl py-1.5 px-3 text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-extrabold text-slate-550 uppercase">Core/Diameter</label>
                <input
                  type="text"
                  value={coreDia}
                  onChange={(e) => setCoreDia(e.target.value)}
                  placeholder='38"'
                  className="bg-white border border-slate-250 rounded-xl py-1.5 px-3 text-xs font-mono font-bold outline-none focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {printStyle === 'digital' ? (
          /* DIGITAL INTERACTIVE VIEW TYPE */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm page-break-inside animate-fade-in">
            {/* Centered Header block with style to match the user's green photo exactly */}
            <div className="bg-[#1e3f20] text-emerald-100 py-5 px-6 flex flex-col items-center justify-center text-center select-none border-b border-[#122b13] gap-1 relative">
              <div className="text-[9.5px] text-[#a3c9a6] tracking-widest uppercase font-extrabold">
                {orderSub || 'MILLMASTER Real-Time Dynamic Deckle Slitting Program'}
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-wider text-white uppercase font-serif mt-0.5">
                🏭 {millName}
              </h1>
              <div className="text-xxs text-[#a3c9a6] tracking-wider uppercase font-bold">
                Rewinder Slitter & Cutter Planning Sheet
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xxs font-mono font-bold text-emerald-100 mt-2 bg-[#173318] py-1 px-4 rounded-full border border-[#2d5d30]">
                <span>DATE: {formattedDate}</span>
                <span className="opacity-40">|</span>
                <span>CORE/DIA: {coreDia}</span>
                <span className="opacity-40">|</span>
                <span>TRIM: NATURAL SHADE</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse font-sans font-medium text-xs text-slate-700">
                <thead>
                  <tr className="bg-[#2d5d30] text-slate-100 font-extrabold select-none">
                    <th className="py-2.5 px-3 border border-[#234e26] text-left min-w-[120px] tracking-wide uppercase text-xxs">GSM/BF Grade</th>
                    {Array.from({ length: maxComboWidth }).map((_, i) => (
                      <th key={i} className="py-2.5 px-3 border border-[#234e26] min-w-[85px] tracking-wide uppercase text-xxs">Slit {i + 1} Width</th>
                    ))}
                    <th className="py-2.5 px-3 border border-[#234e26] min-w-[90px] tracking-wide uppercase text-xxs">Deckle Width</th>
                    <th className="py-2.5 px-3 border border-[#234e26] min-w-[60px] tracking-wide text-center uppercase text-xxs">SETS</th>
                    <th className="py-2.5 px-3 border border-[#234e26] min-w-[85px] tracking-wide uppercase text-xxs bg-rose-950 text-rose-200">Trim Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCombos.map((c, idx) => {
                    return (
                      <React.Fragment key={idx}>
                        {/* Specs Row */}
                        <tr className="bg-slate-50 font-bold border-b border-slate-200">
                          <td className="py-2 px-3 border border-[#ddd0bb] text-left text-slate-900 bg-[#ede4d2]">
                            {c.mixed ? (
                              <div className="flex flex-col">
                                <span className="text-slate-800">{c.gsm}G+{c.bf}B*</span>
                                <span className="text-[10px] text-purple-600 font-normal select-none">Mixed Specs</span>
                              </div>
                            ) : (
                              <span>{c.gsm}GSM + {c.bf}B</span>
                            )}
                          </td>

                          {Array.from({ length: maxComboWidth }).map((_, i) => {
                            const item = c.items[i];
                            return (
                              <td key={i} className="py-2 px-3 border border-[#ddd0bb]">
                                {item ? (
                                  <div className="leading-tight">
                                    <div className="font-extrabold text-[#111]">{formatSize(item)}</div>
                                    <div className="text-[9px] text-slate-500 font-extrabold font-sans select-none mt-0.5">
                                      ({item.gsm} GSM / {item.bf} BF)
                                    </div>
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}

                          <td className="py-2 px-3 border border-[#ddd0bb] font-extrabold font-mono text-emerald-800 text-sm bg-emerald-50/40">
                            {c.tot.toFixed(1)} CM
                          </td>
                          <td className="py-2 px-3 border border-[#ddd0bb] text-center font-black font-mono text-base text-slate-900 bg-amber-50">
                            {c.sets}
                          </td>
                          <td className="py-2 px-3 border border-[#ddd0bb] font-extrabold font-mono bg-rose-50 text-rose-700 text-sm">
                            {c.loss.toFixed(2)} cm
                          </td>
                        </tr>

                        {/* Clients/Tonnage Row matching prototype picture exactly */}
                        <tr className="bg-white border-b border-slate-200 text-[#4a5568]">
                          <td className="py-1 px-3 border border-[#ddd0bb] text-left text-[10px] text-slate-400 select-none font-bold">
                            SET {idx + 1}
                          </td>

                          {Array.from({ length: maxComboWidth }).map((_, i) => {
                            const item = c.items[i];
                            return (
                              <td key={i} className="py-1 px-3 border border-[#ddd0bb] text-center bg-slate-50/30 text-xxs">
                                {item ? (
                                  <div className="leading-normal font-semibold max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap mx-auto" title={item.party}>
                                    {item.party}
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}

                          <td colSpan={3} className="py-1 px-3 border border-[#ddd0bb] bg-slate-50 text-slate-500 font-mono text-[10px] text-left pl-4">
                            Roll Weight: <strong className="text-slate-700">{c.items[0]?.w || 0} kg</strong> &middot;{' '}
                            Trim Waste Loss: <strong className="text-rose-600">{c.lossWtKg.toFixed(1)} kg</strong>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer block summary with match size */}
            <div className="bg-[#1e3f20] text-slate-200 py-3.5 px-6 font-bold text-xs flex flex-wrap items-center justify-between gap-4 border-t border-[#122b13]">
              <div className="flex gap-4">
                <span>TOTAL SETS CUT: <span className="text-white text-sm font-black underline">{totalSets} sets</span></span>
                <span className="text-slate-400">|</span>
                <span>Trim Width Loss: <span className="text-rose-300">{totalLossCm.toFixed(1)} cm</span></span>
              </div>
              <div>
                <span>Trim Weight Loss: <span className="text-rose-300 font-serif text-sm font-black">{totalLossKg.toFixed(1)} KG</span></span>
              </div>
            </div>
          </div>
        ) : (
          /* INDUSTRIAL PRINT BOOKLET (ANANYA ACCURATE STYLE) */
          <div className="bg-white border-2 border-slate-900 rounded-none p-4 md:p-8 space-y-6 page-break-inside animate-fade-in text-black font-sans">
            {/* Header company bar with precise look & feel */}
            <div className="border border-slate-900 overflow-hidden">
              <div className="text-center py-4 border-b border-slate-900 bg-slate-50/10">
                <h1 className="text-2xl md:text-3xl font-black font-sans tracking-wide text-[#0060df] uppercase">
                  {millName}
                </h1>
              </div>

              {/* Subtitle / date row */}
              <div className="grid grid-cols-2 text-center text-xs font-black divide-x divide-slate-900 uppercase">
                <div className="py-2.5 bg-white tracking-widest text-[#111]">
                  {orderSub}
                </div>
                <div className="py-2.5 bg-white tracking-wider text-[#111] flex justify-center items-center gap-2">
                  <span>DATE :-</span>
                  <span className="bg-slate-100 px-3 py-0.5 border border-slate-300 font-bold font-mono">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Main Industrial Slitting Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs font-bold text-slate-900">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-900 text-[10px] font-black uppercase text-slate-700 divide-x divide-slate-800">
                    <th className="py-2.5 px-1 border border-slate-900 w-[14%]">GSM+BF Grade</th>
                    {Array.from({ length: Math.max(5, maxComboWidth) }).map((_, i) => (
                      <th key={i} className="py-2.5 px-1 border border-slate-900 w-[12%]">Slit Width {i + 1}</th>
                    ))}
                    <th className="py-2.5 px-1 border border-slate-900 w-[10%] bg-slate-100">Deckle Width</th>
                    <th className="py-2.5 px-1 border border-slate-900 w-[5%] bg-slate-100">SETS</th>
                    <th className="py-2.5 px-1 border border-slate-900 w-[5%]">Core/Dia</th>
                    <th className="py-2.5 px-1 border border-slate-900 w-[7%]">Waste Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCombos.map((c, idx) => {
                    const columns = Math.max(5, maxComboWidth);
                    return (
                      <React.Fragment key={idx}>
                        {/* Cut Sizes Row */}
                        <tr className="divide-x divide-slate-900 font-black border-t border-slate-900">
                          {/* Rowspanned Spec */}
                          <td rowSpan={2} className="py-3 px-1 border border-slate-900 bg-slate-50/50 text-left font-black text-xxs text-slate-900 align-middle">
                            {c.gsm}GSM + {c.bf}BF
                          </td>

                          {Array.from({ length: columns }).map((_, i) => {
                            const item = c.items[i];
                            return (
                              <td key={i} className="py-1 px-1 border border-slate-900 bg-white font-mono text-slate-900">
                                {item ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className="font-extrabold text-xs text-[#111]">{formatSize(item)}</span>
                                    <span className="text-[9px] font-black text-slate-500 block leading-tight mt-0.5">
                                      ({item.gsm} GSM / {item.bf} BF)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-bold">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Deckle Width */}
                          <td className="py-2 px-1 border-y border-slate-900 border-l border-slate-950 bg-slate-100/50 font-mono text-xs font-extrabold text-slate-950">
                            {c.tot.toFixed(1)} CM
                          </td>

                          {/* Sets */}
                          <td className="py-2 px-1 border border-slate-900 bg-yellow-50/20 font-mono text-sm font-black text-slate-950">
                            {c.sets}
                          </td>

                          {/* Diameter */}
                          <td className="py-2 px-1 border border-slate-900 bg-white font-mono text-xs font-extrabold text-slate-950">
                            {coreDia}
                          </td>

                          {/* Waste Loss CM */}
                          <td className="py-2 px-1 border border-slate-900 bg-rose-50/10 font-mono text-xs text-rose-700">
                            {c.loss.toFixed(1)} CM
                          </td>
                        </tr>

                        {/* Customer Names Row */}
                        <tr className="divide-x divide-slate-900 font-bold border-b border-slate-900 text-[10px] text-slate-700 bg-white">
                          {Array.from({ length: columns }).map((_, i) => {
                            const item = c.items[i];
                            return (
                              <td key={i} className="py-1.5 px-0.5 border border-slate-950 text-center max-w-[85px] leading-tight select-none truncate font-bold text-slate-800">
                                {item ? item.party : ''}
                              </td>
                            );
                          })}

                          {/* Empty spacer cells */}
                          <td className="border border-slate-900 bg-slate-50/40"></td>
                          <td className="border border-slate-900 bg-slate-50/40"></td>
                          <td className="border border-slate-900 bg-slate-50/40"></td>
                          <td className="border border-slate-900 bg-slate-50/40"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Summary row 1 matching exactly */}
                  <tr className="border-t border-slate-950 bg-slate-50 font-black divide-x divide-slate-900">
                    <td colSpan={7} className="py-3 px-3 uppercase text-center tracking-widest text-[#111] text-xs">
                      TOTAL
                    </td>
                    <td className="py-3 px-1 text-center font-mono text-sm bg-[#fffded] border border-slate-900 text-slate-950">
                      {totalSets} SET
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-xs tracking-wider text-slate-950 border border-slate-900 font-mono">
                      {totalLossCm.toFixed(2)} Cm Loss
                    </td>
                  </tr>

                  {/* Summary row 2 matching exactly */}
                  <tr className="border-t border-slate-900 bg-slate-100 font-black">
                    <td colSpan={10} className="py-2 px-4 text-center font-mono text-[#000] text-sm tracking-wide bg-amber-50/10 border border-slate-900">
                      Total Weight Loss = {totalLossKg.toFixed(2)} KG
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PARTY WISE PRODUCTION BILLING SUMMARY / LEDGERS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm page-break-inside mt-8">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-serif">
                {printStyle === 'industrial' ? '📋 PARTY-WISE ROLL LIST / PO SUMMARY' : '📋 Party-wise Ledger Bill Breakdown'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Exact weight metrics based on cutting sets multiplier density formula</p>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold py-1.5 px-3 rounded-lg transition select-none no-print cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Instruction Slips
            </button>
          </div>

          {/* Guide banner */}
          <div className="bg-sky-50 border border-sky-100 text-sky-850 text-xxs font-semibold p-2.5 rounded-lg mb-6 select-none no-print">
            <strong>BILLING METRIC RULES:</strong> Width specs are rounded to client original dimensions. Weights calculated using:{' '}
            <code>(cm / 2.54) * {config.mult} kg/inch</code> density factor. Total boxed weights denote MT client tonnage.
          </div>

          {printStyle === 'digital' ? (
            /* DIGITAL CARDS LAYOUT */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {Object.entries(partyMap).sort().map(([partyName, gsmGroups]) => {
                let partyTotalWt = 0;
                let partyTotalReels = 0;

                return (
                  <div key={partyName} className="border-2 border-slate-900 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="p-4 border-b border-slate-100 flex-1">
                      {/* Border block name signature */}
                      <div className="inline-block border-2 border-slate-900 font-black text-xs text-slate-900 bg-white px-3 py-1 uppercase tracking-wide mb-3">
                        {partyName}
                      </div>

                      <div className="space-y-4">
                        {Object.entries(gsmGroups).sort().map(([gsmBfKey, entries]) => {
                          return (
                            <div key={gsmBfKey} className="space-y-1.5">
                              <div className="text-xxs uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-200 pb-0.5">
                                {gsmBfKey} GSM/BF SPECIFICATION SHEET
                              </div>

                              <div className="space-y-1">
                                {Object.values(entries).map((e, i) => {
                                  partyTotalWt += e.exactWeight;
                                  partyTotalReels += e.reels;

                                  return (
                                    <div key={i} className="flex justify-between items-center text-xs text-slate-700 py-1 border-b border-dotted border-slate-200 font-mono">
                                      <span className="font-extrabold text-slate-800">{e.size} {e.unit}</span>
                                      <span className="text-slate-400 font-sans">({e.reels} reels)</span>
                                      <span className="font-bold text-slate-900">{e.exactWeight.toFixed(1)} kg</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Client Total block box */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase select-none">
                        {partyTotalReels} rolls total
                      </span>
                      <div className="border-2 border-slate-900 bg-[#fffdf0] px-3 py-1 font-bold font-mono text-sm text-slate-900 shadow-sm">
                        {partyTotalWt.toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* INDUSTRIAL EXCLUDE CARDS - RENDER ACCURATE PARTITIONS GRID (Page 3 format) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black font-sans bg-white pb-6 animate-fade-in divide-x-0 md:divide-x divide-none md:divide-slate-300">
              {(() => {
                const parties = Object.entries(partyMap).sort();
                // We will render columns side-by-side
                return parties.map(([partyName, gsmGroups]) => {
                  let partyTotalWt = 0;
                  const poNum = pos.find((p) => p.party.trim().toLowerCase() === partyName.trim().toLowerCase())?.poNumber || 'N/A';
                  const poDateOriginal = pos.find((p) => p.party.trim().toLowerCase() === partyName.trim().toLowerCase())?.date || '';
                  const poDate = (() => {
                    if (!poDateOriginal) return '';
                    const parts = poDateOriginal.split('-');
                    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : poDateOriginal;
                  })();

                  return (
                    <div key={partyName} className="flex flex-row justify-between items-start border-b border-slate-300 pb-6 pt-4 md:px-4">
                      {/* Left section: Name header box & spec lists */}
                      <div className="flex-1 space-y-4">
                        {/* Company Name bordered block */}
                        <div className="inline-block border border-black font-black text-xs text-black bg-white px-4 py-1.5 uppercase tracking-wide">
                          {partyName}
                        </div>

                        {/* Specs detailed lines */}
                        <div className="space-y-4 pr-3">
                          {Object.entries(gsmGroups).map(([gsmBfKey, entries]) => {
                            // clean format e.g. 120/16 instead of 120G+16B
                            const gradeLabel = gsmBfKey.replace('GSM', '').replace('BF', '').replace('G', '').replace('B', '').replace('+', '/');
                            return (
                              <div key={gsmBfKey} className="space-y-1">
                                <div className="text-[10px] font-black text-slate-500 tracking-wider">
                                  {gradeLabel}
                                </div>
                                <div className="space-y-1 bg-slate-50/30 p-1.5 rounded border border-slate-150">
                                  {Object.values(entries).map((e, i) => {
                                    partyTotalWt += e.exactWeight;
                                    return (
                                      <div key={i} className="grid grid-cols-3 text-xxs font-mono text-slate-800 border-b border-dashed border-slate-200 py-1 last:border-b-0">
                                        <span className="font-extrabold text-black text-center">{e.size} {e.unit === 'inch' ? '"' : e.unit}</span>
                                        <span className="text-center font-bold text-slate-500 font-sans">{e.reels}</span>
                                        <span className="text-right font-bold text-slate-900">{e.exactWeight.toFixed(3)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sum of Weight Box at footer */}
                        <div className="inline-block border border-black bg-white px-4 py-2 font-black font-mono text-xs text-black shadow-sm mt-2">
                          {partyTotalWt.toFixed(2)}
                        </div>
                      </div>

                      {/* Right Section: PO NO. Block */}
                      <div className="w-24 flex flex-col justify-center items-center gap-1.5 pt-2 font-sans">
                        <div className="border border-black text-center bg-white">
                          <div className="border-b border-black font-black text-[9px] text-[#222] py-0.5 px-3 uppercase tracking-wide bg-slate-105">
                            PO NO.
                          </div>
                          <div className="py-2.5 px-3 font-mono font-black text-xs text-black tracking-wide min-w-[70px]">
                            {poNum}
                          </div>
                        </div>
                        {poDate && (
                          <div className="text-[9px] font-mono font-black border border-slate-300 py-0.5 px-1.5 text-slate-700 bg-slate-50 rounded">
                            {poDate}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Grand total summaries block banner */}
          <div className="bg-[#1e3f20] text-emerald-100 py-4 px-6 rounded-xl mt-6 flex flex-wrap items-center justify-between gap-4 font-bold select-none border border-[#122b13]">
            <div>
              <div className="text-[10px] uppercase text-emerald-300 tracking-wider">Tonnage summary (All Clients Combined)</div>
              <div className="text-xxs text-emerald-400 font-normal mt-0.5">
                Total sum computed with billing spec multiplier factor
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg text-white font-serif font-black">
                {totalWeightKg.toFixed(1)} kg &nbsp;=&nbsp; {(totalWeightKg / 1000).toFixed(3)} MT
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Configuration controller engine - hidden in print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm no-print">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Play className="w-5 h-5 text-amber-500 fill-amber-500" />
          Optimal Combination Calculator
        </h2>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Party</label>
            <select
              value={filterParty}
              onChange={(e) => {
                setFilterParty(e.target.value);
                setFilterGsm('');
                setFilterBf('');
              }}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 transition-all font-medium"
            >
              <option value="">All Parties</option>
              {partiesList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter GSM</label>
            <select
              value={filterGsm}
              onChange={(e) => {
                setFilterGsm(e.target.value);
                setFilterBf('');
              }}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 transition-all font-medium"
            >
              <option value="">All GSM</option>
              {gsmList.map((g) => (
                <option key={g} value={g}>
                  {g} GSM
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter BF</label>
            <select
              value={filterBf}
              onChange={(e) => setFilterBf(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 transition-all font-medium"
            >
              <option value="">All BF</option>
              {bfList.map((b) => (
                <option key={b} value={b}>
                  {b} BF
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min deckle (cm)</label>
            <input
              type="number"
              value={deckleMin}
              onChange={(e) => setDeckleMin(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 transition-all font-medium font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max deckle (cm)</label>
            <input
              type="number"
              value={deckleMax}
              onChange={(e) => setDeckleMax(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 transition-all font-medium font-mono"
            />
          </div>
        </div>

        {/* ADVANCED SELECTIONS TOGGLE LIST PANEL */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div
            onClick={() => setPselOpen(!pselOpen)}
            className="flex items-center justify-between cursor-pointer select-none border border-slate-100 hover:bg-slate-50 rounded-xl p-3"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-700">
              <Filter className="w-4 h-4 text-indigo-500" />
              Advanced selectors & Tonnage capping limits
              {(selectedParties !== null || selectedOrderIds !== null || Object.keys(partyMtLimits).length > 0) && (
                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full select-none">
                  Selective mode active
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Choose specific clients, roll widths & set MT thresholds</span>
              <ChevronDown className={`w-4 h-4 transition duration-200 ${pselOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {pselOpen && (
            <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4 animate-fade-in text-[13px]">
              <div className="flex gap-2 flex-wrap pb-2 border-b border-slate-200/60 select-none">
                <button
                  type="button"
                  onClick={handleSelectAllParties}
                  className="bg-white border border-slate-200 text-xxs font-extrabold text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 active:scale-95 transition tracking-wide cursor-pointer"
                >
                  SELECT ALL CLIENTS
                </button>
                <button
                  type="button"
                  onClick={handleClearAllParties}
                  className="bg-white border border-slate-200 text-xxs font-extrabold text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 active:scale-95 transition tracking-wide cursor-pointer"
                >
                  CLEAR SELECTION
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllSizes}
                  className="bg-white border border-slate-200 text-xxs font-extrabold text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 active:scale-95 transition tracking-wide cursor-pointer"
                >
                  ALLOW ALL ROLL WIDTHS
                </button>
              </div>

              <div className="space-y-3">
                {partiesList.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">No active clients in production queue.</div>
                ) : (
                  partiesList.map((pName) => {
                    const filteredOrders = activeOrders.filter((o) => o.party === pName);
                    const isPartyChecked = selectedParties === null || selectedParties.includes(pName);

                    return (
                      <div key={pName} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                        <div className="bg-slate-100/50 py-2 px-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 text-xs select-none">
                          <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isPartyChecked}
                              onChange={() => handleTogglePartySelection(pName)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                            />
                            <span>{pName}</span>
                          </label>

                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-semibold">{filteredOrders.length} sizes</span>
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                              <span className="text-slate-400 font-extrabold text-[10px] uppercase">Cap Limit (MT):</span>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="No limit"
                                value={partyMtLimits[pName] || ''}
                                onChange={(e) => handlePartyLimitChange(pName, e.target.value)}
                                className="bg-white border border-slate-200 w-24 py-1 px-2 text-slate-800 text-xs rounded outline-none focus:border-amber-500 font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="p-3 flex flex-wrap gap-2 select-none">
                          {filteredOrders.map((o) => {
                            const isSizeChecked = selectedOrderIds === null || selectedOrderIds.includes(o.id);
                            return (
                              <label
                                key={o.id}
                                className={`text-[11px] font-bold py-1.5 px-3 rounded-full border cursor-pointer select-none transition flex items-center gap-1.5 ${
                                  isSizeChecked
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSizeChecked}
                                  onChange={() => handleToggleOrderSelection(o.id)}
                                  className="sr-only"
                                />
                                {formatSize(o)}
                                <span className="text-[9px] font-normal opacity-75">
                                  ({o.gsm}g/{o.bf}b &middot; {o.reels}r)
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* MIX GSM/BF MODE WITH TOLERANCE CHECKBOX CONTROLS */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 gap-y-2 select-none">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={mixMode}
              onChange={() => setMixMode(!mixMode)}
              className="w-4.5 h-4.5 rounded border-slate-300 text-purple-600 accent-purple-600 cursor-pointer"
            />
            <span className="text-purple-700 flex items-center gap-1">🔀 Mix GSM/BF Combinations Mode</span>
          </label>

          {mixMode && (
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl py-2 px-4 flex flex-wrap items-center gap-4 text-xs font-semibold select-none animate-fade-in text-purple-800">
              <div className="flex items-center gap-1.5">
                <span>GSM Tolerance: &plusmn;</span>
                <input
                  type="number"
                  value={mixGsmTol}
                  onChange={(e) => setMixGsmTol(Math.max(1, parseInt(e.target.value, 10) || 5))}
                  className="bg-white border border-purple-200 w-12 text-center py-1 px-1 rounded font-bold outline-none text-purple-900"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>BF Tolerance: &plusmn;</span>
                <input
                  type="number"
                  value={mixBfTol}
                  onChange={(e) => setMixBfTol(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border border-purple-200 w-12 text-center py-1 px-1 rounded font-bold outline-none text-purple-900"
                />
              </div>
              <span className="text-[10px] text-purple-500 font-medium">Allows mixing different paper grades inside specified range.</span>
            </div>
          )}
        </div>

        {/* Buttons Row */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleRunOptimizer}
            disabled={loading || activeOrders.length === 0}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold py-3 px-6 rounded-xl text-sm transition active:scale-95 shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Executing Cutting Stock Optimizer...</span>
            ) : (
              <>
                <span>⚡ Run Deckle combination solver</span>
              </>
            )}
          </button>
          {displayCombos.length > 0 && (
            <button
              onClick={handlePrint}
              disabled={loading}
              className="border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-extrabold py-3 px-5 rounded-xl text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          )}
        </div>
      </div>

      {renderResults()}

      {/* Saved Combinations Log */}
      {savedSchemes && savedSchemes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4 animate-fade-in no-print mt-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#111] text-sm">Saved Combination Schemes History</h3>
              <p className="text-slate-400 text-[10px] uppercase tracking-wide font-bold mt-0.5">
                Saved {savedSchemes.length} run{savedSchemes.length > 1 ? 's' : ''} in local system
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-105">
            {savedSchemes.map((scheme, idx) => {
              const totalSets = scheme.combos.reduce((s, c) => s + c.sets, 0);
              const totalItemsCount = scheme.combos.reduce((s, c) => s + c.items.length * c.sets, 0);
              return (
                <div key={scheme.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
                      <span>Scheme #{savedSchemes.length - idx}</span>
                      <span className="text-slate-500 text-[10px] font-normal flex items-center gap-1 bg-slate-50 border border-slate-150 py-0.5 px-2 rounded-full font-mono select-none">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {scheme.date}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xxs font-semibold leading-relaxed">
                      Generated sets: <strong className="text-slate-700">{totalSets} sets</strong> &middot;{' '}
                      Produced reels: <strong className="text-slate-700">{totalItemsCount} reels</strong> &middot;{' '}
                      Combinations contained: <span className="font-bold text-slate-700">{scheme.combos.length} unique templates</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveScheme(scheme.id)}
                    className="p-2 text-slate-450 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer flex items-center gap-1.5 text-xxs font-black"
                    title="Reverse all reel deductions and delete scheme"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Delete &amp; Reverse</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
