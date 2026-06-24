/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Trash2, ArrowUpRight, Download, History, Database } from 'lucide-react';
import { Session } from '../types';

interface SessionsManagerProps {
  sessions: Session[];
  onRestoreSession: (id: number) => void;
  onDeleteSession: (id: number) => void;
  onExportSessionCSV: (id: number) => void;
  onOpenSaveSession: () => void;
  hasActiveOrders: boolean;
  requirePin?: (actionLabel: string, onSuccess: () => void) => void;
}

export default function SessionsManager({
  sessions,
  onRestoreSession,
  onDeleteSession,
  onExportSessionCSV,
  onOpenSaveSession,
  hasActiveOrders,
  requirePin,
}: SessionsManagerProps) {
  return (
    <div className="space-y-6 text-slate-800">
      {/* Title block */}
      <div className="flex flex-wrap items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-500" />
            Session Snapshot Archiver
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Reopen previous mill cutting sheets, billing reports, or roll cuts layouts from past production turns.</p>
        </div>

        <button
          onClick={onOpenSaveSession}
          disabled={!hasActiveOrders}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition shadow-md shadow-emerald-500/10 cursor-pointer"
        >
          + Save Snapshot of Queue
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-slate-400 shadow-sm animate-fade-in">
          <Database className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-bold text-slate-600 text-sm">Archived Database Empty</h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">Save snapshots of the production queue to archive your cutting runs here.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((snap) => {
              const totalSets = snap.combos.reduce((sum, c) => sum + c.sets, 0);
              const totalUsedReels = snap.orders.reduce((sum, o) => sum + o.used, 0);

              return (
                <div
                  key={snap.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-slate-350 transition duration-150"
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start select-none">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight capitalize leading-snug">
                          {snap.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono block">
                          {snap.date}
                        </span>
                      </div>
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full select-none">
                        UID: {snap.id.toString().slice(-4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 border-t border-b border-light border-slate-100 py-3 text-xs select-none">
                      <div>
                        <span className="text-xxs font-bold uppercase text-slate-400 block pb-0.5">Specifications</span>
                        <strong className="text-slate-800 font-extrabold">{snap.orders.length} in queue</strong>
                      </div>
                      <div>
                        <span className="text-xxs font-bold uppercase text-slate-400 block pb-0.5">Cutting Sets</span>
                        <strong className="text-emerald-700 font-extrabold">{totalSets} sets</strong>
                      </div>
                      <div className="col-span-2 pt-1">
                        <span className="text-xxs font-bold uppercase text-slate-400 block pb-0.5">Parameters Used</span>
                        <span className="font-mono text-slate-500 font-semibold block">
                          Deckle: {snap.cfg.dmin}&ndash;{snap.cfg.dmax}cm &middot; Mult: {snap.cfg.mult} kg/in
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between select-none">
                    <button
                      onClick={() => {
                        const performRestore = () => {
                          onRestoreSession(snap.id);
                        };

                        if (requirePin) {
                          requirePin(`Restore Queue Snapshot [${snap.name}]`, performRestore);
                        } else {
                          if (window.confirm(`Restore Snapshot: "${snap.name}"?\nWarning: This replaces all items in the current production queue.`)) {
                            performRestore();
                          }
                        }
                      }}
                      className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-black text-xs transition cursor-pointer active:scale-95"
                    >
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      Restore Queue
                    </button>

                    <div className="flex gap-1">
                      <button
                        onClick={() => onExportSessionCSV(snap.id)}
                        className="py-1 px-2 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded-lg text-slate-600 transition cursor-pointer"
                        title="Export Snapshot CSV file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const performDelete = () => {
                            onDeleteSession(snap.id);
                          };

                          if (requirePin) {
                            requirePin(`Delete Session Snapshot [${snap.name}]`, performDelete);
                          } else {
                            if (window.confirm(`Are you absolutely sure you want to delete snapshot "${snap.name}"? This cannot be undone.`)) {
                              performDelete();
                            }
                          }
                        }}
                        className="py-1 px-2 text-rose-500 hover:bg-rose-50 hover:border hover:border-rose-100 rounded-lg transition cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
