/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Factory, RefreshCw, Download, FileSpreadsheet, PlusCircle, CheckCircle } from 'lucide-react';
import { Order, Combo, Config } from '../types';
import { formatSize, calcExactWeight } from '../utils/engine';

interface RemainingOrdersProps {
  orders: Order[];
  config: Config;
  combos: Combo[];
  onLoadRemainingAsNew: () => void;
  onLoadPartyAsNew: (party: string) => void;
  onExportRemainingCSV: () => void;
}

export default function RemainingOrders({
  orders,
  config,
  combos,
  onLoadRemainingAsNew,
  onLoadPartyAsNew,
  onExportRemainingCSV,
}: RemainingOrdersProps) {
  const [activeTab, setActiveTab] = useState<'leftovers' | 'production'>('leftovers');

  const remaining = orders.filter((o) => o.reels - o.used > 0);

  // Group by client
  const byParty: Record<string, Order[]> = {};
  remaining.forEach((o) => {
    if (!byParty[o.party]) byParty[o.party] = [];
    byParty[o.party].push(o);
  });

  const partyList = Object.keys(byParty).sort();
  const totalRemCount = remaining.reduce((sum, o) => sum + (o.reels - o.used), 0);
  let grandTotalRemainingWt = 0;

  // Build client production commissions map
  const partyProductionMap: Record<string, { party: string; totalOrdered: number; totalUsed: number; totalWtKg: number; combosIn: { setLabel: string; gsm: number; bf: number; sizes: string; sets: number; wtKg: number }[] }> = {};

  orders.forEach((o) => {
    if (!partyProductionMap[o.party]) {
      partyProductionMap[o.party] = {
        party: o.party,
        totalOrdered: 0,
        totalUsed: 0,
        totalWtKg: 0,
        combosIn: [],
      };
    }
    partyProductionMap[o.party].totalOrdered += o.reels;
    partyProductionMap[o.party].totalUsed += o.used;
    partyProductionMap[o.party].totalWtKg += o.used * o.w;
  });

  combos.forEach((c, idx) => {
    const partiesInSet = Array.from(new Set(c.items.map((i) => i.party)));
    partiesInSet.forEach((partyName) => {
      if (!partyProductionMap[partyName]) return;
      const partyItems = c.items.filter((i) => i.party === partyName);
      const sizes = partyItems.map((i) => formatSize(i)).join(' + ');
      const wtKg = partyItems.reduce((sum, i) => sum + i.w * c.sets, 0);

      partyProductionMap[partyName].combosIn.push({
        setLabel: `SET ${idx + 1}`,
        gsm: c.gsm,
        bf: c.bf,
        sizes,
        sets: c.sets,
        wtKg,
      });
    });
  });

  const handleExportPartyReport = (partyName: string) => {
    const pOrders = orders.filter((o) => o.party === partyName);
    const pCombos = combos.filter((c) => c.items.some((i) => i.party === partyName));

    let csvContent = `PARTY PRODUCTION REPORT - ${partyName}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csvContent += `CUSTOMER ORDERS IN QUEUE\nGSM,BF,Width,Unit,Qty,Ordered Reels,Used,Remaining,Reel Weight(kg)\n`;
    pOrders.forEach((o) => {
      csvContent += `${o.gsm},${o.bf},${o.size},${o.unit},${o.qty},${o.reels},${o.used},${o.reels - o.used},${o.w}\n`;
    });

    csvContent += `\nCOMBINATION ROLLS CREATED\nSet Index,Blended GSM,BF,Sizes Cut,Total Width(cm),Cutting Sets,Waste trim(cm)\n`;
    pCombos.forEach((c, i) => {
      csvContent += `SET ${i + 1},${c.gsm},${c.bf},"${c.items.map((o) => formatSize(o)).join(' + ')}",${c.tot.toFixed(1)},${c.sets},${c.loss.toFixed(2)}\n`;
    });

    const totalUsed = pOrders.reduce((sum, o) => sum + o.used, 0);
    const totalWt = pOrders.reduce((sum, o) => sum + o.used * o.w, 0);
    csvContent += `\nSUMMARY METRICS\nTotal Reels Used,${totalUsed}\nTotal Weight (kg),${totalWt.toFixed(1)}\nTonnage weight (MT),${(totalWt / 1000).toFixed(3)}\nPending Leftovers,${pOrders.reduce((sum, o) => sum + (o.reels - o.used), 0)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Client_${partyName.replace(/\s+/g, '_')}_Ledger.csv`);
    link.click();
  };

  const renderLeftoversTab = () => {
    if (remaining.length === 0) {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm animate-fade-in">
          <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 text-sm">All Leftovers Accounted For</h3>
          <p className="text-xs text-slate-400 mt-1">Every roll width spec in the queue has been fully processed inside active multi-cut schemes!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-fade-in text-slate-800">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-semibold text-amber-800 select-none no-print">
          ⚠️ {partyList.length} clients have a total of <strong>{totalRemCount} leftover rolls</strong>. These reels could not fit within selected Deckle cutting limits. Tap &quot;Load for Next Run&quot; to push any leftovers into a consecutive optimization run.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partyList.map((partyName) => {
            const pOrders = byParty[partyName];
            const partyRemCount = pOrders.reduce((sum, o) => sum + (o.reels - o.used), 0);
            let partyRemWt = 0;

            const byGsm: Record<string, Order[]> = {};
            pOrders.forEach((o) => {
              const gk = `${o.gsm}/${o.bf}`;
              if (!byGsm[gk]) byGsm[gk] = [];
              byGsm[gk].push(o);
            });

            return (
              <div key={partyName} className="border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col justify-between overflow-hidden">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-150 select-none">
                    <span className="border border-slate-800 font-extrabold text-xs text-slate-900 px-2.5 py-0.5 uppercase tracking-wide bg-slate-50">
                      {partyName}
                    </span>
                    <span className="text-xxs font-extrabold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full select-none">
                      {partyRemCount} reels pending
                    </span>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(byGsm).sort().map(([gk, entries]) => {
                      return (
                        <div key={gk} className="space-y-1.5">
                          <div className="text-[10px] uppercase font-extrabold text-[#4a5568] tracking-wider select-none">
                            {gk} GSM/BF grade specs
                          </div>

                          <div className="space-y-1 font-mono text-xs">
                            {entries.sort((a, b) => a.sizeCm - b.sizeCm).map((o) => {
                              const rem = o.reels - o.used;
                              const wt = calcExactWeight(o, rem, config.mult);
                              partyRemWt += wt;
                              grandTotalRemainingWt += wt;

                              return (
                                <div key={o.id} className="flex justify-between items-center py-1 border-b border-dotted border-slate-200 text-slate-700">
                                  <span className="font-extrabold text-slate-800">{formatSize(o)}</span>
                                  <span className="text-slate-400 font-sans">({rem} rolls)</span>
                                  <span className="font-bold text-slate-900">{wt.toFixed(1)} kg</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onLoadPartyAsNew(partyName)}
                    className="flex items-center gap-1 text-sky-800 hover:text-sky-950 font-bold text-xs select-none active:scale-95 transition cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
                    Load for Connected Run
                  </button>
                  <div className="border border-slate-800 bg-[#fffdf5] font-extrabold font-mono text-xs text-slate-800 px-2.5 py-0.5 rounded select-none">
                    {partyRemWt.toFixed(1)} kg Leftovers
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leftover totals summary block bar */}
        <div className="bg-slate-900 text-slate-100 rounded-xl py-4 px-6 flex flex-wrap items-center justify-between gap-4 select-none mt-6">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Leftovers Billing Summary</span>
            <div className="text-xxs text-slate-400 font-medium">Uncombined pending trimming stockpile totals</div>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-rose-400 font-mono">
              {grandTotalRemainingWt.toFixed(1)} kg &nbsp;=&nbsp; {(grandTotalRemainingWt / 1000).toFixed(3)} MT Leftover
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProductionTab = () => {
    const list = Object.values(partyProductionMap).sort((a, b) => b.totalWtKg - a.totalWtKg);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in text-slate-800">
        {list.map((p) => {
          const remReels = p.totalOrdered - p.totalUsed;
          const usedPct = p.totalOrdered > 0 ? Math.round((p.totalUsed / p.totalOrdered) * 100) : 0;
          const wtMT = (p.totalWtKg / 1000).toFixed(3);

          return (
            <div key={p.party} className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 text-xs font-bold tracking-wide select-none border-b border-slate-200 pl-5 pr-5">
                <span className="text-sm font-extrabold text-slate-950 font-serif">{p.party}</span>
                <span className="text-xxs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {p.combosIn.length} cutting setups
                </span>
              </div>

              {/* Specs subgrid metrics */}
              <div className="grid grid-cols-3 border-b border-slate-100 text-center text-xs p-3 select-none">
                <div className="border-r border-slate-150 py-1">
                  <span className="text-xxs font-bold text-slate-400 uppercase">Ordered</span>
                  <div className="text-base font-extrabold text-slate-900 mt-0.5">{p.totalOrdered} reels</div>
                </div>
                <div className="border-r border-slate-150 py-1">
                  <span className="text-xxs font-bold text-slate-400 uppercase text-emerald-600">Produced</span>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">{p.totalUsed} reels</div>
                </div>
                <div className="py-1">
                  <span className="text-xxs font-bold text-slate-400 uppercase text-amber-600">Unused</span>
                  <div className="text-base font-extrabold text-amber-700 mt-0.5">{remReels} reels</div>
                </div>
              </div>

              {/* Cut schemes specification map */}
              <div className="p-4 flex-1 space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase select-none">
                  CUT SCHEME ALLOCATIONS ({usedPct}% production ratio)
                </div>

                <div className="space-y-2 h-[120px] overflow-y-auto pr-1">
                  {p.combosIn.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs">No cut scheme layouts compiled for this party.</div>
                  ) : (
                    p.combosIn.map((c, i) => (
                      <div key={i} className="flex font-semibold items-center justify-between text-xs text-slate-700 border border-slate-200 bg-slate-50 p-2 rounded-lg">
                        <span className="bg-[#1e3f20] text-emerald-100 text-[10px] py-0.5 px-2 rounded-md font-bold">{c.setLabel}</span>
                        <span className="text-slate-600 max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">{c.gsm}G {c.sizes}</span>
                        <span className="font-bold text-slate-900">{c.sets} sets &middot; {(c.wtKg / 1000).toFixed(3)}MT</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-105 flex items-center justify-between font-serif">
                <div>
                  <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Production weight load:</div>
                  <strong className="text-amber-600 text-base">{wtMT} MT</strong>{' '}
                  <span className="text-slate-400 text-xs font-sans">({p.totalWtKg.toFixed(0)} kg)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExportPartyReport(p.party)}
                  className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 font-bold text-xs py-1.5 px-3 rounded-lg select-none active:scale-95 hover:bg-slate-50 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Excel Summary
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title bar - hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print select-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Leftovers &amp; billing summaries</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Trace left-over roll inventories, check production tonnage ledger files or download Excel summaries.</p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            onClick={onExportRemainingCSV}
            disabled={remaining.length === 0}
            className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-600 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Remaining CSV
          </button>
          <button
            onClick={onLoadRemainingAsNew}
            disabled={remaining.length === 0}
            className="flex items-center gap-1.5 bg-[#193d20] hover:bg-[#122e18] disabled:opacity-40 text-emerald-100 font-black py-2.5 px-4 rounded-xl transition cursor-pointer shadow-md shadow-[#193d20]/15"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-300" />
            Load Remaining as New Orders
          </button>
        </div>
      </div>

      {/* Tabs list - hidden in print */}
      <div className="flex border-b border-slate-200 no-print select-none">
        <button
          onClick={() => setActiveTab('leftovers')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'leftovers'
              ? 'border-amber-500 text-slate-900 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Package className="w-4 h-4" />
          Pending Leftover Inventory
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'production'
              ? 'border-amber-500 text-slate-900 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Factory className="w-4 h-4" />
          Tonnage Bill Breakdown
        </button>
      </div>

      {activeTab === 'leftovers' ? renderLeftoversTab() : renderProductionTab()}
    </div>
  );
}
