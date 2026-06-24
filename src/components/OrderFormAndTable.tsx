import React, { useState, useEffect } from 'react';
import { 
  Trash, 
  EyeOff, 
  CheckCircle2, 
  RotateCcw, 
  HelpCircle, 
  Save, 
  FileSpreadsheet,
  Edit2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingCart,
  X,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Order, Config, PurchaseOrder, POItem } from '../types';
import { toCm, rwCalc, mt2r, formatSize } from '../utils/engine';

interface OrderFormAndTableProps {
  orders: Order[];
  config: Config;
  onAddOrder: (order: Omit<Order, 'id' | 'used' | 'hold'>) => void;
  onDeleteOrder: (id: number) => void;
  onToggleHold: (id: number) => void;
  onClearAll: () => void;
  onOpenSaveSession: () => void;
  sessionCount: number;
  pos?: PurchaseOrder[];
  onSetPos?: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onUpdateOrder?: (order: Order) => void;
  onAddFromPOToQueue?: (orders: Omit<Order, 'id' | 'used' | 'hold'>[]) => void;
}

export default function OrderFormAndTable({
  orders,
  config,
  onAddOrder,
  onDeleteOrder,
  onToggleHold,
  onClearAll,
  onOpenSaveSession,
  sessionCount,
  pos = [],
  onSetPos,
  onUpdateOrder,
  onAddFromPOToQueue,
}: OrderFormAndTableProps) {


  // Search Filter State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // PO Import Collapse states
  const [poSectionExpanded, setPoSectionExpanded] = useState(true);
  const [expandedPOIds, setExpandedPOIds] = useState<Record<string, boolean>>({});

  // Editing Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editParty, setEditParty] = useState('');
  const [editGsm, setEditGsm] = useState('');
  const [editBf, setEditBf] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editUnit, setEditUnit] = useState<'cm' | 'inch' | 'mm'>('cm');
  const [editQty, setEditQty] = useState('');
  const [editType, setEditType] = useState<'reels' | 'MT'>('reels');

  // Computed edit displays
  const [editReelWt, setEditReelWt] = useState<number | null>(null);
  const [editEstReels, setEditEstReels] = useState<number | null>(null);



  // Handle Edit computations
  useEffect(() => {
    if (!editingOrder) return;
    const sVal = parseFloat(editSize);
    if (!isNaN(sVal) && sVal > 0) {
      const sizeInCm = toCm(sVal, editUnit);
      const wt = rwCalc(sizeInCm, config.mult);
      setEditReelWt(wt);

      const qVal = parseFloat(editQty);
      if (editType === 'MT' && !isNaN(qVal) && qVal > 0) {
        setEditEstReels(mt2r(qVal, wt));
      } else {
        setEditEstReels(null);
      }
    } else {
      setEditReelWt(null);
      setEditEstReels(null);
    }
  }, [editSize, editUnit, editQty, editType, editingOrder, config.mult]);



  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !onUpdateOrder) return;

    const gsmVal = parseFloat(editGsm);
    const bfVal = parseFloat(editBf);
    const sizeVal = parseFloat(editSize);
    const qtyVal = parseFloat(editQty);

    if (!editParty.trim() || isNaN(gsmVal) || isNaN(bfVal) || isNaN(sizeVal) || isNaN(qtyVal)) {
      alert('Please fill all fields with valid specifications');
      return;
    }

    const sizeInCm = toCm(sizeVal, editUnit);
    const w = rwCalc(sizeInCm, config.mult);
    const reelsVal = editType === 'MT' ? mt2r(qtyVal, w) : Math.round(qtyVal);

    const updated: Order = {
      ...editingOrder,
      party: editParty.trim(),
      gsm: gsmVal,
      bf: bfVal,
      size: sizeVal,
      unit: editUnit,
      sizeCm: sizeInCm,
      w,
      type: editType,
      qty: qtyVal,
      reels: reelsVal,
    };

    onUpdateOrder(updated);
    setEditingOrder(null);
  };

  const importPOItem = (po: PurchaseOrder, item: POItem) => {
    if (!onAddFromPOToQueue || !onSetPos) return;

    onAddFromPOToQueue([{
      party: po.party,
      gsm: item.gsm,
      bf: item.bf,
      size: item.size,
      unit: item.unit,
      sizeCm: item.sizeCm,
      w: item.w,
      type: item.type,
      qty: item.qty,
      reels: item.reels,
    }]);

    onSetPos(prev => prev.map(p => {
      if (p.id === po.id) {
        const updatedItems = p.items.map(it => 
          it.id === item.id ? { ...it, completed: true } : it
        );
        const allCompleted = updatedItems.every(i => i.completed);
        return {
          ...p,
          items: updatedItems,
          status: allCompleted ? 'Completed' : 'Pending'
        };
      }
      return p;
    }));
  };

  const importAllPOItems = (po: PurchaseOrder) => {
    if (!onAddFromPOToQueue || !onSetPos) return;

    const pendingItems = po.items.filter(it => !it.completed);
    if (pendingItems.length === 0) return;

    const list = pendingItems.map(item => ({
      party: po.party,
      gsm: item.gsm,
      bf: item.bf,
      size: item.size,
      unit: item.unit,
      sizeCm: item.sizeCm,
      w: item.w,
      type: item.type,
      qty: item.qty,
      reels: item.reels,
    }));
    onAddFromPOToQueue(list);

    onSetPos(prev => prev.map(p => {
      if (p.id === po.id) {
        const updatedItems = p.items.map(it => ({ ...it, completed: true }));
        return {
          ...p,
          items: updatedItems,
          status: 'Completed'
        };
      }
      return p;
    }));
  };

  const importAllPendingAcrossAllPOs = () => {
    if (!pos || !onAddFromPOToQueue || !onSetPos) return;

    const allPendingLines: Array<{ po: PurchaseOrder, item: POItem }> = [];
    pos.forEach(po => {
      po.items.forEach(it => {
        if (!it.completed) {
          allPendingLines.push({ po, item: it });
        }
      });
    });

    if (allPendingLines.length === 0) {
      alert('No pending lines to import across any purchase orders!');
      return;
    }

    const list = allPendingLines.map(({ po, item }) => ({
      party: po.party,
      gsm: item.gsm,
      bf: item.bf,
      size: item.size,
      unit: item.unit,
      sizeCm: item.sizeCm,
      w: item.w,
      type: item.type,
      qty: item.qty,
      reels: item.reels,
    }));
    onAddFromPOToQueue(list);

    onSetPos(prev => prev.map(p => {
      const updatedItems = p.items.map(it => ({ ...it, completed: true }));
      return {
        ...p,
        items: updatedItems,
        status: 'Completed'
      };
    }));
  };

  const togglePOExpand = (id: string) => {
    setExpandedPOIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Metrics
  const totalReels = orders.reduce((sum, o) => sum + o.reels, 0);
  const totalUsed = orders.reduce((sum, o) => sum + o.used, 0);
  const remainingReels = totalReels - totalUsed;
  const distinctParties = new Set(orders.map((o) => o.party)).size;

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const term = orderSearchQuery.toLowerCase();
    return (
      o.party.toLowerCase().includes(term) ||
      o.gsm.toString().includes(term) ||
      o.bf.toString().includes(term) ||
      o.size.toString().includes(term) ||
      o.type.toLowerCase().includes(term)
    );
  });

  const pendingPOs = pos.filter(p => p.items.some(i => !i.completed));
  const pendingLinesCount = pos.reduce((sum, p) => sum + p.items.filter(i => !i.completed).length, 0);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reel Demands</div>
          <div className="text-3xl font-black text-slate-900 mt-1">
            {totalReels} <span className="text-xs font-normal text-slate-400">Rls</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-medium">Allocated to Deckle</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">
            {totalUsed} <span className="text-xs font-normal text-slate-400">Rls</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unallocated Leftover</div>
          <div className="text-3xl font-black text-amber-600 mt-1">
            {remainingReels} <span className="text-xs font-normal text-slate-400">Rls</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mill Buyers</div>
          <div className="text-3xl font-black text-indigo-600 mt-1">{distinctParties}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saved Batches</div>
          <div className="text-3xl font-black text-purple-600 mt-1">{sessionCount}</div>
        </div>
      </div>

      {/* Pending Purchase Orders Importer Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 no-print">
        <div 
          onClick={() => setPoSectionExpanded(!poSectionExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                Import from Purchase Orders
                {pendingLinesCount > 0 && (
                  <span className="bg-rose-500 text-white font-mono text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                    {pendingLinesCount} line{pendingLinesCount !== 1 ? 's' : ''} pending
                  </span>
                )}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Quickly import pending purchase order specifications into active queue</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {pendingLinesCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  importAllPendingAcrossAllPOs();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 font-extrabold text-white text-xs px-3.5 py-2 rounded-xl transition shadow-md shadow-indigo-600/30"
              >
                Import All Pending POs ({pendingLinesCount})
              </button>
            )}
            <div className="p-1 bg-slate-800 rounded-lg text-slate-300">
              {poSectionExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {poSectionExpanded && (
          <div className="mt-5 border-t border-slate-800 pt-4 space-y-4">
            {pendingPOs.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <span className="font-extrabold text-slate-300">No pending purchase orders configured yet.</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Add purchase orders in the separate Purchase Orders tab, then use this panel to load them into production.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
                {pendingPOs.map(po => {
                  const poPendingItems = po.items.filter(it => !it.completed);
                  const isExpanded = !!expandedPOIds[po.id];
                  return (
                    <div key={po.id} className="bg-[#1e293b]/40 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                      {/* PO Card Inner Header */}
                      <div className="p-4 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <div>
                            <div className="font-black text-xs font-mono text-slate-200">PO: {po.poNumber}</div>
                            <div className="text-xs font-black text-white font-serif mt-0.5">{po.party}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => togglePOExpand(po.id)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* PO Inner Items */}
                      {isExpanded ? (
                        <div className="p-4 divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                          {po.items.map(item => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                              <div className="space-y-0.5">
                                <div className="text-[11px] text-slate-400 font-extrabold">
                                  {item.gsm}g / {item.bf}f &middot; Width: <span className="text-yellow-400 font-black">{item.size}{item.unit}</span>
                                </div>
                                <div className="text-[10px] text-indigo-400 font-extrabold">
                                  Qty: {item.qty} {item.type} (≈ {item.reels} reels)
                                </div>
                              </div>

                              <div>
                                {item.completed ? (
                                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">IMPORTED</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => importPOItem(po, item)}
                                    className="bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                                  >
                                    Import Line +
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-800/20 flex items-center justify-between text-slate-400 text-xs">
                          <span className="text-[10px] font-black uppercase text-indigo-400">
                            {poPendingItems.length} line item{poPendingItems.length !== 1 ? 's' : ''} pending
                          </span>
                          <button
                            type="button"
                            onClick={() => importAllPOItems(po)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3.5 py-1 rounded-lg font-extrabold transition cursor-pointer"
                          >
                            Import All {poPendingItems.length} Lines +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders Table Display */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Current Production Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Orders actively considered for cutting stock combinations</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search active orders..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-44 md:w-56 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-850 text-xs rounded-xl outline-none focus:border-amber-500 focus:bg-white transition font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {orderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOrderSearchQuery('')}
                  className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  &times;
                </button>
              )}
            </div>

            <button
              onClick={onOpenSaveSession}
              disabled={orders.length === 0}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-md shadow-emerald-600/10 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Snapshot Session
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you absolutely sure you want to clear the production queue?')) {
                  onClearAll();
                }
              }}
              disabled={orders.length === 0}
              className="border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-500 text-xs font-bold py-2 px-3 rounded-xl transition cursor-pointer"
            >
              Clear Queue
            </button>
          </div>
        </div>

        {/* Desktop and Tablet Wide Screen View (Horizontal Tabular) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 select-none">
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-12">#</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Party Name</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-16">GSM</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-16">BF</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right w-24">Size</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Order Type/Qty</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-20">Total Reels</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center text-emerald-600 w-20">Used</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center text-amber-600 w-24">Unused</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right w-24">Reel Wt</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-20 no-print">Hold</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-center w-16 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-slate-205" />
                      <div className="font-bold text-sm text-slate-500">
                        {orderSearchQuery ? 'No Matching Orders' : 'Order Entry Queue is Empty'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {orderSearchQuery ? 'Try adjusting your search criteria.' : 'Add orders manually above or import from purchase orders.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, idx) => {
                  const rem = o.reels - o.used;
                  const isDone = o.completed || rem <= 0;
                  return (
                    <tr
                      key={o.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition duration-150 ${
                        isDone ? 'bg-emerald-50/20 text-slate-400 opacity-60' : o.hold ? 'bg-amber-50/10 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-center text-xs text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{o.party}</td>
                      <td className="py-3.5 px-4 text-center font-semibold font-mono">{o.gsm}</td>
                      <td className="py-3.5 px-4 text-center font-semibold font-mono">{o.bf}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold font-mono text-slate-700">{formatSize(o)}</td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        {o.qty} <span className="text-xs text-slate-400 font-normal">{o.type}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold font-mono text-slate-800">
                        {o.type === 'MT' ? (
                          <span className="tooltip flex items-center justify-center gap-0.5" title="Tons converted to Reels">
                            ≈{o.reels}
                          </span>
                        ) : (
                          o.reels
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold font-mono text-emerald-600">{o.used}</td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {isDone ? (
                          <span className="inline-flex items-center gap-0.5 text-xxs font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full select-none">
                            <CheckCircle2 className="w-3 h-3" /> DONE
                          </span>
                        ) : o.hold ? (
                          <span className="text-xs font-semibold text-amber-500 bg-amber-100/50 px-2 py-0.5 rounded-md">HOLD</span>
                        ) : (
                          <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{rem}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-500">{o.w} kg</td>
                      <td className="py-3.5 px-4 text-center no-print">
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => onToggleHold(o.id)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border transition cursor-pointer select-none active:scale-95 ${
                              o.hold
                                ? 'bg-amber-100 border-amber-200 text-amber-700'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            {o.hold ? 'Locked' : 'Hold'}
                          </button>
                        )}
                        {isDone && <span className="text-xs text-emerald-500">Finished</span>}
                      </td>
                      <td className="py-3.5 px-4 text-center no-print">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOrder(o);
                              setEditParty(o.party);
                              setEditGsm(String(o.gsm));
                              setEditBf(String(o.bf));
                              setEditSize(String(o.size));
                              setEditUnit(o.unit);
                              setEditQty(String(o.qty));
                              setEditType(o.type);
                            }}
                            className="p-1 text-slate-300 hover:text-amber-500 transition cursor-pointer"
                            title="Edit order specifications"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(o.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                            title="Delete order"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Tactile Cards List (Highly phone compatible) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 select-none">
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-200" />
                <div className="font-bold text-sm text-slate-500">
                  {orderSearchQuery ? 'No Matching Orders' : 'Order Queue is Empty'}
                </div>
                <p className="text-xs text-slate-400 px-6">
                  {orderSearchQuery ? 'Try adjusting your search query.' : 'Use form or import purchase orders to begin.'}
                </p>
              </div>
            </div>
          ) : (
            filteredOrders.map((o, idx) => {
              const rem = o.reels - o.used;
              const isDone = o.completed || rem <= 0;
              return (
                <div
                  key={o.id}
                  className={`p-4 space-y-3 transition duration-150 ${
                    isDone ? 'bg-emerald-50/20 text-slate-400' : o.hold ? 'bg-amber-50/10' : 'bg-white'
                  }`}
                >
                  {/* Card Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-full font-mono text-[10px] flex items-center justify-center font-black">
                        #{idx + 1}
                      </span>
                      <span className="font-extrabold text-slate-905 font-serif text-sm">{o.party}</span>
                    </div>

                    <div className="flex items-center gap-1.5 no-print">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrder(o);
                          setEditParty(o.party);
                          setEditGsm(String(o.gsm));
                          setEditBf(String(o.bf));
                          setEditSize(String(o.size));
                          setEditUnit(o.unit);
                          setEditQty(String(o.qty));
                          setEditType(o.type);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-50 rounded-lg transition"
                        title="Edit order"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrder(o.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition rounded-lg hover:bg-slate-50 no-print"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Specification grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Paper Grade</span>
                      <span className="font-extrabold text-slate-800 font-mono">{o.gsm} GSM / {o.bf} BF</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Roll width</span>
                      <span className="font-extrabold text-slate-800 font-mono">{formatSize(o)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Order amount</span>
                      <span className="font-bold font-mono text-slate-700">{o.qty} {o.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Reel weight</span>
                      <span className="font-bold font-mono text-indigo-700">{o.w} kg</span>
                    </div>
                  </div>

                  {/* Status Indicator & Quick actions */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 uppercase block font-bold">Status:</span>
                      <div>
                        {isDone ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full select-none">
                            <CheckCircle2 className="w-3 h-3" /> DONE
                          </span>
                        ) : o.hold ? (
                          <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">ON HOLD</span>
                        ) : (
                          <span className="text-[9px] font-black text-slate-100 bg-[#eab308] px-2 py-0.5 rounded-full font-sans">
                            ACTIVE &middot; {rem} reels remaining
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="no-print font-sans">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => onToggleHold(o.id)}
                          className={`text-xxx font-black uppercase tracking-wider px-3.5 py-1 rounded-lg border transition cursor-pointer select-none active:scale-95 text-[10px] ${
                            o.hold
                              ? 'bg-amber-100 border-amber-200 text-amber-700'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                          }`}
                        >
                          {o.hold ? 'Unlock' : 'Lock Hold'}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editing Modal specifications form */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900">Edit Order Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 font-sans">
              <div className="space-y-4">
                {/* Party */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Party / Client Name</label>
                  <input
                    type="text"
                    value={editParty}
                    onChange={(e) => setEditParty(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* GSM */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">GSM</label>
                    <input
                      type="number"
                      value={editGsm}
                      onChange={(e) => setEditGsm(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition"
                      required
                    />
                  </div>
                  {/* BF */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">BF (Burst Factor)</label>
                    <input
                      type="number"
                      value={editBf}
                      onChange={(e) => setEditBf(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Size */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Roll Width (Size)</label>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={editSize}
                        onChange={(e) => setEditSize(e.target.value)}
                        className="col-span-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-2 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition"
                        required
                      />
                      <select
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value as 'cm' | 'inch' | 'mm')}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-0.5 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition text-center"
                      >
                        <option value="cm">cm</option>
                        <option value="inch">in</option>
                        <option value="mm">mm</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tonnage / Reels</label>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="col-span-2 bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-2 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition"
                        required
                      />
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as 'reels' | 'MT')}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-sm py-2 px-0.5 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition text-center"
                      >
                        <option value="reels">reels</option>
                        <option value="MT">MT</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Estimate weight row */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Estimated Weight</span>
                    <span className="font-extrabold text-slate-850 text-sm">{editReelWt !== null ? `${editReelWt} kg/reel` : 'N/A'}</span>
                  </div>
                  {editEstReels !== null && (
                    <div className="text-right">
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Calculated Reels Count</span>
                      <span className="font-extrabold text-indigo-600 text-sm">≈ {editEstReels} reels</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold px-4 py-2 rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
