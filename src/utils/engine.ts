/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Combo, Config } from '../types';

export function toCm(v: number, u: 'cm' | 'inch' | 'mm'): number {
  if (u === 'inch') return v * 2.54;
  if (u === 'mm') return v / 10;
  return v;
}

export function rwCalc(cm: number, mult: number): number {
  return Math.round((cm / 2.54) * mult);
}

export function calcExactWeight(order: { size: number; unit: 'cm' | 'inch' | 'mm' }, reels: number, mult: number): number {
  const s = order.size;
  const u = order.unit || 'cm';
  if (u === 'inch') return s * mult * reels;
  if (u === 'mm') return (s / 25.4) * mult * reels;
  return (s / 2.54) * mult * reels;
}

export function mt2r(mt: number, w: number): number {
  return Math.floor((mt * 1000) / w);
}

export function formatSize(o: { size: number; unit: 'cm' | 'inch' | 'mm' }): string {
  if (o.unit === 'inch') return o.size.toFixed(2) + '"';
  if (o.unit === 'mm') return o.size.toFixed(0) + 'mm';
  return o.size + 'cm';
}

function getCombinationsWithRep<T>(arr: T[], r: number): T[][] {
  const res: T[][] = [];
  function go(s: number, cur: T[]) {
    if (cur.length === r) {
      res.push([...cur]);
      return;
    }
    for (let i = s; i < arr.length; i++) {
      cur.push(arr[i]);
      go(i, cur);
      cur.pop();
    }
  }
  go(0, []);
  return res;
}

function countIds(items: Order[]): Record<number, number> {
  const c: Record<number, number> = {};
  items.forEach((o) => {
    c[o.id] = (c[o.id] || 0) + 1;
  });
  return c;
}

interface EngineParams {
  orders: Order[];
  config: Config;
  dmin: number;
  dmax: number;
  selectedPartyIds: string[] | null;
  selectedOrderIds: number[] | null;
  partyMtLimits: Record<string, number>;
  filters: { party: string; gsm: string; bf: string };
  mixMode: boolean;
  mixGsmTol: number;
  mixBfTol: number;
}

interface EngineResult {
  combos: Combo[];
  updatedOrders: Order[];
  stats: {
    totalChecked: number;
    validStructures: number;
    iterations: number;
    usedPct: number;
  };
}

export function solveCombos(params: EngineParams): EngineResult {
  const {
    orders,
    config,
    dmin,
    dmax,
    selectedPartyIds,
    selectedOrderIds,
    partyMtLimits,
    filters,
    mixMode,
    mixGsmTol,
    mixBfTol,
  } = params;

  // Clone orders to calculate state without modifying global state directly.
  let eligible = orders.filter((o) => {
    if (o.hold) return false;
    if (o.completed) return false;
    if (o.reels <= 0) return false;
    if (filters.party && o.party !== filters.party) return false;
    if (filters.gsm && String(o.gsm) !== String(filters.gsm)) return false;
    if (filters.bf && String(o.bf) !== String(filters.bf)) return false;
    return true;
  });

  // Apply Party and Size selections
  eligible = eligible.filter((o) => {
    if (selectedPartyIds !== null && !selectedPartyIds.includes(o.party)) return false;
    if (selectedOrderIds !== null && !selectedOrderIds.includes(o.id)) return false;
    return true;
  });

  // Apply MT Caps
  const partyCap: Record<string, number> = {};
  Object.keys(partyMtLimits).forEach((p) => {
    if (partyMtLimits[p] > 0) {
      partyCap[p] = partyMtLimits[p] * 1000; // in kg
    }
  });

  const cappedEligible = eligible
    .map((o) => {
      if (!partyCap.hasOwnProperty(o.party)) return { ...o };
      const budget = partyCap[o.party];
      if (budget <= 0) return null;
      const wtPerReel = calcExactWeight(o, 1, config.mult);
      const maxReels = Math.floor(budget / wtPerReel);
      if (maxReels <= 0) return null;
      const cappedReels = Math.min(o.reels, maxReels);
      partyCap[o.party] -= cappedReels * wtPerReel;
      return { ...o, reels: cappedReels };
    })
    .filter((o): o is Order => o !== null);

  if (cappedEligible.length === 0) {
    return {
      combos: [],
      updatedOrders: orders,
      stats: { totalChecked: 0, validStructures: 0, iterations: 0, usedPct: 0 },
    };
  }

  // Templates found matching criteria
  interface Template {
    gsm: number;
    bf: number;
    items: Order[];
    tot: number;
    loss: number;
    counts: Record<number, number>;
    mixed: boolean;
    gsmMin?: number;
    gsmMax?: number;
    bfMin?: number;
    bfMax?: number;
  }

  const templates: Template[] = [];
  let totalChecked = 0;

  // Build standard/repetition templates grouped by same GSM/BF
  const groups: Record<string, Order[]> = {};
  cappedEligible.forEach((o) => {
    const k = `${o.gsm}|${o.bf}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(o);
  });

  Object.entries(groups).forEach(([k, grp]) => {
    const [gsmStr, bfStr] = k.split('|');
    const gsm = parseInt(gsmStr, 10);
    const bf = parseInt(bfStr, 10);

    for (let r = config.mins; r <= config.maxs; r++) {
      const combosList = getCombinationsWithRep(grp, r);
      combosList.forEach((c) => {
        totalChecked++;
        const tot = c.reduce((s, o) => s + o.sizeCm, 0);
        if (tot >= dmin && tot <= dmax) {
          const counts = countIds(c);
          templates.push({
            gsm,
            bf,
            items: c,
            tot,
            loss: dmax - tot,
            counts,
            mixed: false,
          });
        }
      });
    }
  });

  if (mixMode) {
    const gsmBfKeys = Object.keys(groups);
    const processedPairs = new Set<string>();

    gsmBfKeys.forEach((keyA) => {
      const [gsmA, bfA] = keyA.split('|').map(Number);
      const compatPool: Order[] = [];

      gsmBfKeys.forEach((keyB) => {
        const [gsmB, bfB] = keyB.split('|').map(Number);
        if (Math.abs(gsmA - gsmB) <= mixGsmTol * 2 && Math.abs(bfA - bfB) <= mixBfTol * 2) {
          compatPool.push(...groups[keyB]);
        }
      });

      const seen = new Set<number>();
      const pool = compatPool.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));

      const poolKeys = Array.from(new Set(pool.map((o) => `${o.gsm}|${o.bf}`)));
      if (poolKeys.length <= 1) return; // pure group already handled

      // Safety cap: max pool size of 12 to prevent OOM
      const cappedPool =
        pool.length > 12
          ? pool.sort((a, b) => Math.abs(a.gsm - gsmA) - Math.abs(b.gsm - gsmA)).slice(0, 12)
          : pool;

      const sig = cappedPool
        .map((o) => o.id)
        .sort((a, b) => a - b)
        .join(',');
      if (processedPairs.has(sig)) return;
      processedPairs.add(sig);

      for (let r = config.mins; r <= config.maxs; r++) {
        const combosList = getCombinationsWithRep(cappedPool, r);
        combosList.forEach((combo) => {
          totalChecked++;
          const gsms = Array.from(new Set(combo.map((o) => o.gsm)));
          const bfs = Array.from(new Set(combo.map((o) => o.bf)));

          if (gsms.length === 1 && bfs.length === 1) return; // pure

          const gsmMin = Math.min(...gsms);
          const gsmMax = Math.max(...gsms);
          const bfMin = Math.min(...bfs);
          const bfMax = Math.max(...bfs);

          if (gsmMax - gsmMin > mixGsmTol * 2) return;
          if (bfMax - bfMin > mixBfTol * 2) return;

          const tot = combo.reduce((s, o) => s + o.sizeCm, 0);
          if (tot < dmin || tot > dmax) return;

          const blendGsm = Math.round((gsmMin + gsmMax) / 2 / 5) * 5;
          const blendBf = Math.round((bfMin + bfMax) / 2);
          const counts = countIds(combo);

          templates.push({
            gsm: blendGsm,
            bf: blendBf,
            items: combo,
            tot,
            loss: dmax - tot,
            counts,
            mixed: true,
            gsmMin,
            gsmMax,
            bfMin,
            bfMax,
          });
        });
      }
    });
  }

  // Execute solver
  const um: Record<number, number> = {};
  cappedEligible.forEach((o) => {
    um[o.id] = 0;
  });

  const orderReels: Record<number, number> = {};
  cappedEligible.forEach((o) => {
    orderReels[o.id] = o.reels;
  });

  const sel: Combo[] = [];
  let iterations = 0;
  const MAX_ITER = 2000;
  let phase = 1; // 1 = greedy, 2 = drain
  let drainIdx = 0;

  while (iterations < MAX_ITER) {
    iterations++;

    const avail: Record<number, number> = {};
    cappedEligible.forEach((o) => {
      avail[o.id] = Math.max(0, o.reels - (um[o.id] || 0));
    });

    if (cappedEligible.every((o) => avail[o.id] <= 0)) break;

    if (phase === 1) {
      let best: Template | null = null;
      let bestSets = 0;
      let bestLoss = Infinity;

      for (const t of templates) {
        const ok = Object.entries(t.counts).every(([id, cnt]) => (avail[Number(id)] || 0) >= cnt);
        if (!ok) continue;

        const sets = Math.min(
          ...Object.entries(t.counts).map(([id, cnt]) => Math.floor((avail[Number(id)] || 0) / cnt))
        );
        if (sets <= 0) continue;

        if (sets > bestSets || (sets === bestSets && t.loss < bestLoss)) {
          bestSets = sets;
          bestLoss = t.loss;
          best = t;
        }
      }

      if (!best) {
        phase = 2;
        drainIdx = 0;
        continue;
      }

      Object.entries(best.counts).forEach(([idStr, cnt]) => {
        const id = Number(idStr);
        um[id] = (um[id] || 0) + cnt * bestSets;
        um[id] = Math.min(um[id], orderReels[id] || 0);
      });

      const lossWtKg = (best.loss / 2.54) * config.mult * bestSets;
      sel.push({
        gsm: best.gsm,
        bf: best.bf,
        items: best.items,
        tot: best.tot,
        sets: bestSets,
        loss: best.loss,
        lossWtKg,
        mixed: best.mixed,
        gsmMin: best.gsmMin,
        gsmMax: best.gsmMax,
        bfMin: best.bfMin,
        bfMax: best.bfMax,
      });
    } else {
      let placed = false;
      for (let a = 0; a < templates.length; a++) {
        const t = templates[drainIdx % templates.length];
        drainIdx++;

        const ok = Object.entries(t.counts).every(([id, cnt]) => (avail[Number(id)] || 0) >= cnt);
        if (!ok) continue;

        Object.entries(t.counts).forEach(([idStr, cnt]) => {
          const id = Number(idStr);
          um[id] = (um[id] || 0) + cnt;
          um[id] = Math.min(um[id], orderReels[id] || 0);
        });

        const lossWtKg = (t.loss / 2.54) * config.mult;
        sel.push({
          gsm: t.gsm,
          bf: t.bf,
          items: t.items,
          tot: t.tot,
          sets: 1,
          loss: t.loss,
          lossWtKg,
          mixed: t.mixed,
          gsmMin: t.gsmMin,
          gsmMax: t.gsmMax,
          bfMin: t.bfMin,
          bfMax: t.bfMax,
        });
        placed = true;
        break;
      }
      if (!placed) break;
    }
  }

  // Merge consecutive identical combos
  const merged: Combo[] = [];
  sel.forEach((c) => {
    const last = merged[merged.length - 1];
    const isSame =
      last &&
      last.items.length === c.items.length &&
      last.items.every((x, idx) => x.id === c.items[idx].id) &&
      last.gsm === c.gsm &&
      last.bf === c.bf;

    if (isSame) {
      last.sets += c.sets;
      last.lossWtKg += c.lossWtKg;
    } else {
      merged.push({ ...c });
    }
  });

  const updatedOrders = orders.map((o) => {
    const foundCapped = cappedEligible.find((ce) => ce.id === o.id);
    if (foundCapped) {
      const usedReels = Math.min(um[foundCapped.id] || 0, foundCapped.reels);
      return { ...o, used: usedReels };
    }
    return { ...o, used: 0 };
  });

  const totalUsedReels = updatedOrders.reduce((sum, o) => sum + o.used, 0);
  const totalEligibleReels = cappedEligible.reduce((sum, o) => sum + o.reels, 0);
  const usedPct = totalEligibleReels > 0 ? Math.round((totalUsedReels / totalEligibleReels) * 100) : 0;

  return {
    combos: merged,
    updatedOrders,
    stats: {
      totalChecked,
      validStructures: templates.length,
      iterations,
      usedPct,
    },
  };
}
