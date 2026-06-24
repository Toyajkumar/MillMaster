/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileSpreadsheet,
  Settings as SettingsIcon,
  PackageCheck,
  History,
  Lock,
  Menu,
  X,
  FileDown,
  Info,
  Printer
} from 'lucide-react';

import { Order, Combo, Session, Config, SavedScheme, AuditLog, PurchaseOrder, POItem } from './types';
import { calcExactWeight } from './utils/engine';

// Component Imports
import LockScreen from './components/LockScreen';
import OrderFormAndTable from './components/OrderFormAndTable';
import CombinationEngine from './components/CombinationEngine';
import RemainingOrders from './components/RemainingOrders';
import SessionsManager from './components/SessionsManager';
import ExcelCSVPage from './components/ExcelCSVPage';
import SettingsPage from './components/SettingsPage';
import PurchaseOrdersPage from './components/PurchaseOrdersPage';

const BrandLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Animated outer cyber-circle of precision */}
    <circle cx="50" cy="50" r="46" stroke="url(#sidebarCyberRing)" strokeWidth="1" strokeDasharray="6 3" className="opacity-80" />
    
    {/* Large paper roll (Metallic and detailed) */}
    <circle cx="44" cy="50" r="28" fill="url(#sidebarMetallicRollBg)" stroke="url(#sidebarMetallicGradient)" strokeWidth="3" />
    {/* Semi-wound paper sheet layers */}
    <path d="M 44 22 A 28 28 0 1 1 16 50" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2 2" />
    
    {/* Spiral winding effect of paper mill */}
    <path d="M 44 50 A 6 6 0 0 1 38 44 A 12 12 0 0 1 50 38 A 18 18 0 0 1 62 50" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-sky-300/40" />
    
    {/* Heavy-duty steel slitter core */}
    <circle cx="44" cy="50" r="14" fill="#0f172a" stroke="url(#sidebarSteelGrid)" strokeWidth="2" />
    <circle cx="44" cy="50" r="7" stroke="#38bdf8" strokeWidth="1.5" />
    <circle cx="44" cy="50" r="2" fill="#38bdf8" />
    
    {/* Floating precision slitting blade (Gold/Amber) */}
    <circle cx="70" cy="50" r="18" fill="url(#sidebarBladeGlow)" stroke="url(#sidebarMetallicGold)" strokeWidth="2.5" />
    {/* Blade cutting teeth markers */}
    <circle cx="70" cy="50" r="14" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" className="text-amber-500/60" />
    <circle cx="70" cy="50" r="6" fill="#1e293b" stroke="url(#sidebarMetallicGold)" strokeWidth="1.5" />
    <circle cx="70" cy="50" r="2" fill="#f59e0b" />
    
    {/* Golden connector beam representing alignment */}
    <line x1="44" y1="50" x2="70" y2="50" stroke="url(#sidebarConnectorGrad)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="57" cy="50" r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1" />
    
    <defs>
      <radialGradient id="sidebarBladeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      
      <linearGradient id="sidebarCyberRing" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      
      <linearGradient id="sidebarMetallicRollBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      
      <linearGradient id="sidebarMetallicGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="35%" stopColor="#e0f2fe" />
        <stop offset="70%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      
      <linearGradient id="sidebarSteelGrid" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      
      <linearGradient id="sidebarMetallicGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="30%" stopColor="#f59e0b" />
        <stop offset="70%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      
      <linearGradient id="sidebarConnectorGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
  </svg>
);

export default function App() {
  // Load States from Local Storage
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const v = localStorage.getItem('mm_orders');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [combos, setCombos] = useState<Combo[]>(() => {
    try {
      const v = localStorage.getItem('mm_combos');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const v = localStorage.getItem('mm_sessions');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [pos, setPos] = useState<PurchaseOrder[]>(() => {
    try {
      const v = localStorage.getItem('mm_pos');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>(() => {
    try {
      const v = localStorage.getItem('mm_saved_schemes');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<Config>(() => {
    try {
      const v = localStorage.getItem('mm_cfg');
      return v ? JSON.parse(v) : { dmin: 315, dmax: 320, mins: 2, maxs: 7, mult: 13.5 };
    } catch {
      return { dmin: 315, dmax: 320, mins: 2, maxs: 7, mult: 13.5 };
    }
  });

  const [nextId, setNextId] = useState<number>(() => {
    try {
      const v = localStorage.getItem('mm_nid');
      return v ? JSON.parse(v) : 1;
    } catch {
      return 1;
    }
  });

  const [appPw, setAppPw] = useState<string>(() => {
    try {
      const v = localStorage.getItem('mm_pw');
      return v ? JSON.parse(v) : '1234';
    } catch {
      return '1234';
    }
  });

  // App Navigation & Session States
  const [isLocked, setIsLocked] = useState(true);
  const [activePage, setActivePage] = useState<'orders' | 'combos' | 'remaining' | 'sessions' | 'excel' | 'settings' | 'po'>('orders');
  const [saveIndicator, setSaveIndicator] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPrintToast, setShowPrintToast] = useState(false);

  const triggerPrint = () => {
    setShowPrintToast(true);
    // Programmatic focus is critical to bypass iframe print blocks in sandboxed containers
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (e) {
        console.warn("Print action triggered, checking browser context...", e);
      }
    }, 150);
  };

  // Audit Logs State for Industrial Accountability & Anti-Data Loss
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const v = localStorage.getItem('mm_audit_logs');
      return v ? JSON.parse(v) : [
        {
          id: 'system-init',
          timestamp: new Date().toLocaleString(),
          action: 'MillMaster Security Logs Initialized',
          status: 'System Ready',
          operator: 'Toyaj Yadav'
        }
      ];
    } catch {
      return [];
    }
  });

  const logAction = (actionDesc: string, operator: string = 'Toyaj Yadav', status: string = 'Authorized & Logged') => {
    const newLog: AuditLog = {
      id: 'L-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString(),
      action: actionDesc,
      status,
      operator
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 500));
  };

  // Modal Save Session Snapshot
  const [saveSessionModalOpen, setSaveSessionModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');

  // Security PIN prompts for destructive modifications
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinSuccessCallback, setPinSuccessCallback] = useState<(() => void) | null>(null);
  const [pinActionLabel, setPinActionLabel] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const requirePin = (actionLabel: string, onSuccess: () => void) => {
    setPinActionLabel(actionLabel);
    setPinSuccessCallback(() => () => {
      onSuccess();
      logAction(actionLabel, 'Toyaj Yadav', 'PIN Verified & Completed');
    });
    setPinInput('');
    setPinError(false);
    setPinPromptOpen(true);
  };

  const handleVerifyActionPin = () => {
    if (pinInput === appPw) {
      setPinPromptOpen(false);
      if (pinSuccessCallback) {
        pinSuccessCallback();
      }
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Recalculate utilized order counts based on active schemes
  const recalculateOrdersUsed = (currentOrders: Order[], schemes: SavedScheme[]): Order[] => {
    const usedMap: Record<number, number> = {};
    schemes.forEach((scheme) => {
      scheme.combos.forEach((c) => {
        c.items.forEach((item) => {
          usedMap[item.id] = (usedMap[item.id] || 0) + c.sets;
        });
      });
    });

    return currentOrders.map((o) => ({
      ...o,
      used: Math.min(o.reels, usedMap[o.id] || 0),
    }));
  };

  // Synced updates to purchase orders
  const handleUpdatePos = (newPosVal: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => {
    setPos((prev) => {
      const nextPosVal = typeof newPosVal === 'function' ? newPosVal(prev) : newPosVal;

      setOrders((currentOrders) => {
        let changed = false;
        const updatedOrders = [...currentOrders];

        // 1. Add missing pending PO items to orders list
        nextPosVal.forEach((po) => {
          po.items.forEach((item) => {
            if (!item.completed) {
              const exists = updatedOrders.some(
                (o) => o.poNumber === po.poNumber && o.poItemId === item.id
              );
              if (!exists) {
                updatedOrders.push({
                  id: nextId + Math.floor(Math.random() * 1000000),
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
                  used: 0,
                  hold: false,
                  poNumber: po.poNumber,
                  poItemId: item.id,
                });
                changed = true;
              }
            }
          });
        });

        // 2. Remove PO items from orders if marked complete or PO was deleted
        const filteredOrders = updatedOrders.filter((o) => {
          if (o.poNumber && o.poItemId) {
            const matchedPo = nextPosVal.find((p) => p.poNumber === o.poNumber);
            if (!matchedPo) return false;
            const item = matchedPo.items.find((i) => i.id === o.poItemId);
            if (!item || item.completed) return false;
          }
          return true;
        });

        if (filteredOrders.length !== currentOrders.length) {
          changed = true;
        }

        return recalculateOrdersUsed(changed ? filteredOrders : currentOrders, savedSchemes);
      });

      return nextPosVal;
    });
  };

  // One-time startup synchronization for existing POs
  useEffect(() => {
    setOrders((currentOrders) => {
      let changed = false;
      const updatedOrders = [...currentOrders];

      pos.forEach((po) => {
        po.items.forEach((item) => {
          if (!item.completed) {
            const exists = updatedOrders.some(
              (o) => o.poNumber === po.poNumber && o.poItemId === item.id
            );
            if (!exists) {
              updatedOrders.push({
                id: nextId + Math.floor(Math.random() * 1000000),
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
                used: 0,
                hold: false,
                poNumber: po.poNumber,
                poItemId: item.id,
              });
              changed = true;
            }
          }
        });
      });

      const filteredOrders = updatedOrders.filter((o) => {
        if (o.poNumber && o.poItemId) {
          const matchedPo = pos.find((p) => p.poNumber === o.poNumber);
          if (!matchedPo) return false;
          const item = matchedPo.items.find((i) => i.id === o.poItemId);
          if (!item || item.completed) return false;
        }
        return true;
      });

      if (filteredOrders.length !== currentOrders.length) {
        changed = true;
      }

      return recalculateOrdersUsed(changed ? filteredOrders : currentOrders, savedSchemes);
    });
  }, []);

  // Persistent synchronisation loop
  useEffect(() => {
    localStorage.setItem('mm_orders', JSON.stringify(orders));
    localStorage.setItem('mm_combos', JSON.stringify(combos));
    localStorage.setItem('mm_sessions', JSON.stringify(sessions));
    localStorage.setItem('mm_cfg', JSON.stringify(config));
    localStorage.setItem('mm_nid', String(nextId));
    localStorage.setItem('mm_pw', JSON.stringify(appPw));
    localStorage.setItem('mm_pos', JSON.stringify(pos));
    localStorage.setItem('mm_saved_schemes', JSON.stringify(savedSchemes));
    localStorage.setItem('mm_audit_logs', JSON.stringify(auditLogs));
  }, [orders, combos, sessions, config, nextId, appPw, pos, savedSchemes, auditLogs]);

  const flashSaveIndicator = (msg: string) => {
    setSaveIndicator(msg);
    setTimeout(() => {
      setSaveIndicator('');
    }, 2200);
  };

  // State Triggers / Sub-callbacks
  const handleAddOrder = (newOrderData: Omit<Order, 'id' | 'used' | 'hold'>) => {
    const o: Order = {
      ...newOrderData,
      id: nextId,
      used: 0,
      hold: false,
    };
    setOrders((prev) => [...prev, o]);
    setNextId((prev) => prev + 1);
    flashSaveIndicator('Order Added');
    logAction(`Add Active Order: Client ${o.party} specs ${o.size}${o.unit} x ${o.reels} reels`, 'Toyaj Yadav', 'Direct Added');
  };

  const handleDeleteOrder = (id: number) => {
    const o = orders.find((x) => x.id === id);
    const label = o ? `${o.party} (${o.gsm} GSM / ${o.bf} BF / ${o.size}${o.unit})` : String(id);
    requirePin(`Delete Active Production Order: "${label}"`, () => {
      setOrders((prev) => prev.filter((o) => o.id !== id));
      flashSaveIndicator('Order Deleted');
    });
  };

  const handleToggleHold = (id: number) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, hold: !o.hold } : o)));
    flashSaveIndicator('Hold status modified');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    flashSaveIndicator('Order Specs Updated');
  };

  const handleCombosGenerated = (newCombos: Combo[], updatedOrders: Order[]) => {
    setCombos(newCombos);
    setOrders(updatedOrders);
    flashSaveIndicator('Combos Optimized');
  };

  const handleClearAllOrders = () => {
    requirePin('Wipe the production active orders queue entirely', () => {
      setOrders([]);
      setCombos([]);
      setSavedSchemes([]);
      flashSaveIndicator('Queue Wiped');
    });
  };

  const handleSaveConfig = (updated: Config) => {
    setConfig(updated);
    flashSaveIndicator('Settings Overridden');
  };

  const handleChangePassword = (oldPw: string, newPw: string): boolean => {
    if (oldPw === appPw) {
      setAppPw(newPw);
      flashSaveIndicator('PIN Modified');
      return true;
    }
    return false;
  };

  const handleResetPassword = () => {
    setAppPw('1234');
    flashSaveIndicator('PIN Reset');
  };

  const handleSaveScheme = (newCombos: Combo[], draftOrders: Order[]) => {
    const today = new Date();
    const formattedDate = today.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const newScheme: SavedScheme = {
      id: Date.now(),
      date: formattedDate,
      combos: newCombos,
    };

    const updatedSchemes = [newScheme, ...savedSchemes];
    setSavedSchemes(updatedSchemes);

    // Recalculate orders used counts dynamically
    const updatedOrders = recalculateOrdersUsed(orders, updatedSchemes);
    setOrders(updatedOrders);

    // Update active combos
    setCombos(updatedSchemes.flatMap((s) => s.combos));

    flashSaveIndicator('Scheme Saved');
  };

  const handleRemoveScheme = (schemeId: number) => {
    const s = savedSchemes.find((x) => x.id === schemeId);
    const label = s ? `Created ${s.date}` : String(schemeId);
    requirePin(`Delete Saved Combination Scheme & Reverse all reel deductions: "${label}"`, () => {
      const updatedSchemes = savedSchemes.filter((x) => x.id !== schemeId);
      setSavedSchemes(updatedSchemes);

      // Recalculate orders used counts
      const updatedOrders = recalculateOrdersUsed(orders, updatedSchemes);
      setOrders(updatedOrders);

      // Re-compile active combos list
      setCombos(updatedSchemes.flatMap((x) => x.combos));

      flashSaveIndicator('Scheme Reversed');
    });
  };

  // Snapshot commit sessions
  const handleCommitSnapshotSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      alert('Fill standard descriptive snapshot label');
      return;
    }

    const snap: Session = {
      id: Date.now(),
      name: sessionName.trim(),
      date: new Date().toLocaleString(),
      orders: JSON.parse(JSON.stringify(orders)),
      combos: JSON.parse(JSON.stringify(combos)),
      cfg: { ...config },
    };

    setSessions((prev) => [snap, ...prev]);

    // Deduction committing subtraction logic
    setOrders((prev) =>
      prev.map((o) => {
        if (o.used > 0) {
          const remainder = Math.max(0, o.reels - o.used);
          return {
            ...o,
            reels: remainder,
            qty: remainder, // update quantity display for reels
            used: 0,
            completed: remainder <= 0,
          };
        }
        return o;
      })
    );

    setCombos([]); // Clear combos for clean run turning
    setSavedSchemes([]); // Clear saved schemes since they have been permanent committed!
    setSaveSessionModalOpen(false);
    setSessionName('');
    flashSaveIndicator('Session snapshot committed');
    alert(`Snapshot "${snap.name}" successfully stored and deducted from live ordered totals! leftover roll inventories recalculated.`);
  };

  const handleRestoreSession = (id: number) => {
    const found = sessions.find((s) => s.id === id);
    if (!found) return;
    setOrders(JSON.parse(JSON.stringify(found.orders)));
    setCombos(JSON.parse(JSON.stringify(found.combos)));
    setConfig({ ...found.cfg });
    flashSaveIndicator('Historical Session Restored');
  };

  const handleDeleteSession = (id: number) => {
    const s = sessions.find((x) => x.id === id);
    const label = s ? s.name : String(id);
    requirePin(`Delete Archived Snapshot Session: "${label}"`, () => {
      setSessions((prev) => prev.filter((x) => x.id !== id));
      flashSaveIndicator('Archived Snapshot Wiped');
    });
  };

  const handleExportSessionCSV = (id: number) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    const h = 'Party,GSM,BF,Size,Unit,Type,Qty,Reels,Used,Remaining\n';
    const r = s.orders
      .map((o) => `${o.party},${o.gsm},${o.bf},${o.size},${o.unit},${o.type},${o.qty},${o.reels},${o.used},${o.reels - o.used}`)
      .join('\n');
    downloadFile(`SessionArchive_${s.name.replace(/\s+/g, '_')}.csv`, h + r);
  };

  const handleImportCSVOrders = (imported: Order[]) => {
    setOrders((prev) => [...prev, ...imported]);
    const maxImpId = Math.max(...imported.map((i) => i.id));
    setNextId(maxImpId + 1);
    flashSaveIndicator('Spreadsheet Imported');
  };

  // CSV Exporters
  const handleExportCurrentOrdersCSV = () => {
    const h = 'Party,GSM,BF,Size,Unit,Type,Qty,Reels,Used,Remaining,ReelWt(kg)\n';
    const r = orders
      .map((o) => `${o.party},${o.gsm},${o.bf},${o.size},${o.unit},${o.type},${o.qty},${o.reels},${o.used},${o.reels - o.used},${o.w}`)
      .join('\n');
    downloadFile('MillMaster_ActiveOrders.csv', h + r);
  };

  const handleExportCombosCSV = () => {
    const h = 'Set index,GSM,BF,Sizes combined,Parties,Total width(cm),Cutting sets counts,Trim Waste loss(cm),Waste wt(kg)\n';
    const r = combos
      .map(
        (c, i) =>
          `${i + 1},${c.gsm},${c.bf},"${c.items.map((o) => o.size + o.unit).join(' + ')}","${c.items.map((o) => o.party).join(' + ')}",${c.tot.toFixed(1)},${c.sets},${c.loss.toFixed(2)},${c.lossWtKg.toFixed(1)}`
      )
      .join('\n');
    downloadFile('MillMaster_Combos_Instruct.csv', h + r);
  };

  const handleExportRemainingCSV = () => {
    const rem = orders.filter((o) => o.reels - o.used > 0);
    const h = 'Party,GSM,BF,Size,Unit,Uncompleted leftovers reels,Calculated Weight(kg)\n';
    const r = rem
      .map((o) => `${o.party},${o.gsm},${o.bf},${o.size},${o.unit},${o.reels - o.used},${o.w}`)
      .join('\n');
    downloadFile('MillMaster_Residual_Leftovers.csv', h + r);
  };

  const handleExportFullConsolidatedReportCSV = () => {
    let csv = `MILLMASTER INTEGRATED BATCH REPORT\nGenerated:,${new Date().toLocaleString()}\n\n`;
    csv += `Section 1: ACTIVE PRODUCTION ORDERS\n`;
    csv += 'Party,GSM,BF,Size,Unit,Type,Qty,Reels,Used,Remaining,ReelWt(kg)\n';
    csv += orders
      .map((o) => `${o.party},${o.gsm},${o.bf},${o.size},${o.unit},${o.type},${o.qty},${o.reels},${o.used},${o.reels - o.used},${o.w}`)
      .join('\n');

    csv += `\n\nSection 2: SOLVED ROLLS CUTTINGS MATRIX\n`;
    csv += 'Set,GSM,BF,Sizes,Parties,Total cm,Sets,Loss cm,LossWt(kg)\n';
    csv += combos
      .map(
        (c, i) =>
          `${i + 1},${c.gsm},${c.bf},"${c.items.map((o) => o.size + o.unit).join(' + ')}","${c.items.map((o) => o.party).join(' + ')}",${c.tot.toFixed(1)},${c.sets},${c.loss.toFixed(2)},${c.lossWtKg.toFixed(1)}`
      )
      .join('\n');

    const rem = orders.filter((o) => o.reels - o.used > 0);
    csv += `\n\nSection 3: UNCOMPLETED RESIDUAL LEFTOVERS\n`;
    csv += 'Party,GSM,BF,Size,Unit,Remaining,ReelWt(kg)\n';
    csv += rem
      .map((o) => `${o.party},${o.gsm},${o.bf},${o.size},${o.unit},${o.reels - o.used},${o.w}`)
      .join('\n');

    const totalSets = combos.reduce((s, c) => s + c.sets, 0);
    const totalLossKg = combos.reduce((s, c) => s + c.lossWtKg, 0);
    csv += `\n\nSUMMARY TOTALS\nTotal Orders in Queue,${orders.length}\nTotal Sets Cutler,${totalSets}\nTrim Waste Loss(kg),${totalLossKg.toFixed(1)}\nLeftovers in stockpile,${rem.reduce((sum, o) => sum + (o.reels - o.used), 0)}`;

    downloadFile('Consolidated_Batch_Summary.csv', csv);
  };

  const downloadFile = (fileName: string, data: string) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.click();
  };

  // Push single leftover group to queue
  const handleLoadPartyRemainingAsNew = (partyName: string) => {
    const rem = orders.filter((o) => o.party === partyName && o.reels - o.used > 0);
    if (rem.length === 0) return;
    let curId = nextId;

    const copied: Order[] = rem.map((o) => ({
      ...o,
      id: curId++,
      reels: o.reels - o.used,
      qty: o.reels - o.used,
      type: 'reels',
      used: 0,
      completed: false,
    }));

    setOrders((prev) => [...prev, ...copied]);
    setNextId(curId);
    flashSaveIndicator('Party Leftovers Queued');
    setActivePage('orders');
    alert(`Deducted residual group for "${partyName}" successfully appended back into the Active production form!`);
  };

  // Push all leftovers as new run
  const handleLoadAllRemainingAsNew = () => {
    const rem = orders.filter((o) => o.reels - o.used > 0);
    if (rem.length === 0) return;
    let curId = nextId;

    const copied: Order[] = rem.map((o) => ({
      ...o,
      id: curId++,
      reels: o.reels - o.used,
      qty: o.reels - o.used,
      type: 'reels',
      used: 0,
      completed: false,
    }));

    setOrders((prev) => [...prev, ...copied]);
    setNextId(curId);
    flashSaveIndicator('All leftovers elements queued');
    setActivePage('orders');
    alert(`All leftover indices appended into active processing run! ready for consecutive deckle solving.`);
  };

  // Purging & Factories
  const handleClearOrdersOnly = () => {
    setOrders([]);
    setCombos([]);
    flashSaveIndicator('Orders purged');
  };

  const handleClearCombosOnly = () => {
    setCombos([]);
    setOrders((prev) => prev.map((o) => ({ ...o, used: 0, completed: false })));
    flashSaveIndicator('Cuts models reset');
  };

  const handleClearSessionsOnly = () => {
    setSessions([]);
    flashSaveIndicator('Snapshots discarded');
  };

  const handleFactoryResetWipe = () => {
    setOrders([]);
    setCombos([]);
    setSessions([]);
    setConfig({ dmin: 315, dmax: 320, mins: 2, maxs: 7, mult: 13.5 });
    setNextId(1);
    setAppPw('1234');
    flashSaveIndicator('Full System Wipe');
    setActivePage('orders');
    setIsLocked(true);
  };

  // Snapshot JSON backup retrieval
  const handleGetBackupJSON = () => {
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      orders,
      combos,
      sessions,
      pos,
      cfg: config,
      nid: nextId,
      pw: appPw,
    };
  };

  // Render Section Selector
  const renderActiveSectionPage = () => {
    switch (activePage) {
      case 'po':
        return (
          <PurchaseOrdersPage
            pos={pos}
            onSetPos={handleUpdatePos}
            config={config}
            onAddFromPOToQueue={(newOrders) => {
              let curId = nextId;
              const mappedOrders = newOrders.map(o => ({
                ...o,
                id: curId++,
                used: 0,
                hold: false
              }));
              setOrders(prev => [...prev, ...mappedOrders]);
              setNextId(curId);
              flashSaveIndicator('PO Items Queued');
            }}
            onFlashSaveIndicator={flashSaveIndicator}
            requirePin={requirePin}
          />
        );
      case 'orders':
        return (
          <OrderFormAndTable
            orders={orders}
            config={config}
            onAddOrder={handleAddOrder}
            onDeleteOrder={handleDeleteOrder}
            onToggleHold={handleToggleHold}
            onClearAll={handleClearAllOrders}
            onOpenSaveSession={() => setSaveSessionModalOpen(true)}
            sessionCount={sessions.length}
            pos={pos}
            onSetPos={handleUpdatePos}
            onUpdateOrder={handleUpdateOrder}
            onAddFromPOToQueue={(newOrders) => {
              let curId = nextId;
              const mappedOrders = newOrders.map(o => ({
                ...o,
                id: curId++,
                used: 0,
                hold: false
              }));
              setOrders(prev => [...prev, ...mappedOrders]);
              setNextId(curId);
              flashSaveIndicator('PO Items Queued');
            }}
          />
        );
      case 'combos':
        return (
          <CombinationEngine
            orders={orders}
            config={config}
            combos={combos}
            savedSchemes={savedSchemes}
            onSaveScheme={handleSaveScheme}
            onRemoveScheme={handleRemoveScheme}
            onCombosGenerated={handleCombosGenerated}
            onOpenSaveSession={() => setSaveSessionModalOpen(true)}
            requirePin={requirePin}
            pos={pos}
            onTriggerPrint={triggerPrint}
          />
        );
      case 'remaining':
        return (
          <RemainingOrders
            orders={orders}
            config={config}
            combos={combos}
            onLoadRemainingAsNew={handleLoadAllRemainingAsNew}
            onLoadPartyAsNew={handleLoadPartyRemainingAsNew}
            onExportRemainingCSV={handleExportRemainingCSV}
          />
        );
      case 'sessions':
        return (
          <SessionsManager
            sessions={sessions}
            onRestoreSession={handleRestoreSession}
            onDeleteSession={handleDeleteSession}
            onExportSessionCSV={handleExportSessionCSV}
            onOpenSaveSession={() => setSaveSessionModalOpen(true)}
            hasActiveOrders={orders.length > 0}
            requirePin={requirePin}
          />
        );
      case 'excel':
        return (
          <ExcelCSVPage
            orders={orders}
            combos={combos}
            nextId={nextId}
            config={config}
            onImportOrders={handleImportCSVOrders}
            onExportOrdersCSV={handleExportCurrentOrdersCSV}
            onExportCombosCSV={handleExportCombosCSV}
            onExportRemainingCSV={handleExportRemainingCSV}
            onExportFullReportCSV={handleExportFullConsolidatedReportCSV}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            config={config}
            onSaveConfig={handleSaveConfig}
            orders={orders}
            sessions={sessions}
            appPw={appPw}
            onChangePw={handleChangePassword}
            onResetPw={handleResetPassword}
            onClearOrdersOnly={handleClearOrdersOnly}
            onClearCombosOnly={handleClearCombosOnly}
            onClearSessionsOnly={handleClearSessionsOnly}
            onFactoryReset={handleFactoryResetWipe}
            onRestoreBackup={(snap) => {
              setOrders(snap.orders || []);
              setCombos(snap.combos || []);
              setSessions(snap.sessions || []);
              setPos(snap.pos || []);
              setConfig(snap.cfg || { dmin: 315, dmax: 320, mins: 2, maxs: 7, mult: 13.5 });
              setNextId(snap.nid || 1);
              setAppPw(snap.pw || '1234');
            }}
            getBackupJSON={handleGetBackupJSON}
            saveIndicatorMsg={saveIndicator}
            onFlashSaveIndicator={flashSaveIndicator}
            auditLogs={auditLogs}
          />
        );
      default:
        return null;
    }
  };

  // Locked check validation
  if (isLocked) {
    return <LockScreen correctPw={appPw} onUnlock={() => setIsLocked(false)} />;
  }

  // Sidebar navigators metadata
  const navigators = [
    { id: 'po', title: 'Sales Indents & POs', subtitle: 'Customer Reel Demands', badge: pos.filter(p => p.status === 'Pending').length, bColor: 'bg-indigo-600' },
    { id: 'orders', title: 'Deckle Planning Queue', subtitle: 'Active slitting program specs', badge: orders.length, bColor: 'bg-amber-600' },
    { id: 'combos', title: 'Deckle Trim Optimizer', subtitle: 'Automatic reel slitting solver' },
    { id: 'remaining', title: 'Side-Run Stock Logs', subtitle: 'Trim waste & buyer financials', badge: new Set(orders.filter((o) => o.reels - o.used > 0).map((o) => o.party)).size, bColor: 'bg-indigo-600' },
    { id: 'sessions', title: 'Batch Production Logs', subtitle: 'Archived slitting run snapshots', badge: sessions.length, bColor: 'bg-purple-600' },
    { id: 'excel', title: 'Data Import & Export', subtitle: 'CSV registries & reports' },
    { id: 'settings', title: 'Machine Constraints', subtitle: 'Deckle boundaries & PIN setup' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans font-medium selection:bg-amber-100 selection:text-amber-800 antialiased leading-relaxed">
      {/* Dynamic Save Auto-indicator */}
      <div className={`fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-amber-500 font-extrabold text-xs py-2.5 px-4.5 rounded-full shadow-2xl transition-all duration-300 z-[9000] flex items-center gap-2 select-none pointer-events-none ${
        saveIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}>
        <span>💾</span>
        <span>{saveIndicator || 'Database auto-saved'}</span>
      </div>

      {/* SIDEBAR FOR DESKTOP (Hidden on print) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-[#0f172a] text-slate-300 no-print">
        <div className="bg-[#1e293b] py-5 px-5 border-b border-slate-800 select-none flex items-center gap-3">
          <div className="bg-[#0f172a] p-1.5 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center">
            <BrandLogo className="w-8 h-8 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-widest leading-none">
              MILLMASTER™
            </h2>
            <span className="text-[9px] text-amber-500 font-extrabold uppercase mt-1 block font-serif tracking-widest">
              PRO ENTERPRISE
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navigators.map((n) => {
            const isActive = activePage === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setActivePage(n.id as any)}
                className={`w-full flex items-center justify-between text-left py-2.5 px-4 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white font-extrabold shadow-lg shadow-amber-500/10'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <div>
                  <span className="block text-sm font-semibold">{n.title}</span>
                  <span className={`text-[10px] uppercase font-normal tracking-wide block mt-0.5 ${isActive ? 'text-amber-100' : 'text-slate-500'}`}>
                    {n.subtitle}
                  </span>
                </div>
                {n.badge !== undefined && n.badge > 0 && (
                  <span className={`text-[10px] font-black leading-none py-1 px-2 rounded-full text-white ${
                    isActive ? 'bg-amber-600' : n.bColor || 'bg-slate-800'
                  }`}>
                    {n.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer element */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xxs font-semibold text-slate-500 select-none">
          <div className="flex items-center gap-1.5 pl-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-save: ON</span>
          </div>
          <button
            onClick={() => setIsLocked(true)}
            className="border border-slate-800 hover:border-rose-900 hover:bg-rose-950 hover:text-rose-200 px-2 py-0.5 text-[10px] text-slate-400 font-bold tracking-wide uppercase transition rounded-md cursor-pointer select-none"
          >
            Lock
          </button>
        </div>

        {/* Professional Engineering & Security Badge */}
        <div className="p-4 bg-[#090d16] border-t border-slate-900 flex flex-col gap-1 items-center justify-center text-center select-none">
          <div className="text-[8px] text-slate-500 font-bold tracking-widest uppercase flex items-center gap-1 justify-center">
            <span>🛡️</span> SECURE SYSTEM ENGINE
          </div>
          <div className="text-[10px] font-semibold text-slate-300 tracking-wide">
            Owner &amp; Licensee: <span className="text-amber-500 font-bold">Toyaj Yadav</span>
          </div>
          <div className="text-[8.5px] text-emerald-500 font-bold tracking-wider">
            AES-256 DIRECT ENCRYPTED
          </div>
          <p className="text-[9px] text-[#475569] font-medium">
            MillMaster &copy; 2026 All Rights Secured
          </p>
        </div>
      </aside>

      {/* MOBILE HEADER & BAR (Hidden in print) */}
      <div className="lg:hidden fixed top-0 inset-x-0 bg-[#0f172a] text-slate-100 border-b border-slate-800 h-14 flex items-center justify-between px-4 z-40 no-print select-none">
        <div className="flex items-center gap-2.5 leading-tight">
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800">
            <BrandLogo className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wide uppercase">MillMaster Pro</h2>
            <span className="text-[9px] text-amber-500 uppercase font-extrabold tracking-wider block font-serif">Deckle Trim Solver</span>
          </div>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE SIDEBAR PANEL (Hidden in print) */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 no-print" onClick={() => setIsSidebarOpen(false)}>
          <div
            className="w-64 max-w-[85vw] h-full bg-[#0f172a] text-slate-350 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="bg-[#1e293b] py-4 px-6 border-b border-slate-800 select-none flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                    <BrandLogo className="w-6 h-6 text-sky-450" />
                  </div>
                  <div>
                    <h2 className="text-[#38bdf8] text-xs font-serif font-black tracking-widest">MILLMASTER</h2>
                    <span className="text-[9px] text-amber-500 uppercase font-bold block mt-0.5">MillMaster™</span>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-2 space-y-1">
                {navigators.map((n) => {
                  const isActive = activePage === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setActivePage(n.id as any);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left py-2.5 px-4 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-white font-extrabold shadow-lg shadow-amber-500/10'
                          : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold text-xs">{n.title}</span>
                        <span className="text-[10px] font-normal opacity-50 block">{n.subtitle}</span>
                      </div>
                      {n.badge !== undefined && n.badge > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-slate-300">
                          {n.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-xxs font-bold text-slate-500">Auto-save &bull; Active</span>
                <button
                  onClick={() => {
                    setIsLocked(true);
                    setIsSidebarOpen(false);
                  }}
                  className="bg-rose-950 text-rose-200 border border-transparent hover:border-rose-900 py-1 px-3 rounded-lg text-xxs font-bold cursor-pointer"
                >
                  Lock system
                </button>
              </div>
              <div className="text-center pt-2 border-t border-slate-900">
                <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">SYSTEM PLATFORM &amp; SECURITY</div>
                <div className="text-xs font-bold text-slate-200 tracking-wider mt-0.5">Owner: Toyaj Yadav</div>
                <span className="text-[8.5px] text-amber-500 uppercase font-bold tracking-widest block mt-0.5 font-serif">Enterprise Secure Edition™</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER AREA */}
      <main className="flex-1 min-h-screen flex flex-col pt-14 lg:pt-0">
        {/* Sticky Header Topbar - hidden on print */}
        <header className="sticky top-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 no-print select-none">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
              {navigators.find((n) => n.id === activePage)?.title}
            </h2>
            <p className="text-xxs text-slate-400 mt-0.5 tracking-wide font-medium">
              {navigators.find((n) => n.id === activePage)?.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <button
              id="global-print-report-btn"
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-500 hover:text-amber-400 active:scale-95 transition rounded-lg cursor-pointer shadow-sm select-none"
              title="Print active view"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <span className="text-slate-450 hidden sm:inline-flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-300" />
              Tonnage Calculation active
            </span>
          </div>
        </header>

        {/* Real-time Content panel */}
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto pb-16">
          {renderActiveSectionPage()}
        </div>
      </main>

      {/* COMMIT Snapshot save session modal - overlay matches prototype looks */}
      {saveSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9990] animate-fade-in no-print">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start select-none">
              <h3 className="font-extrabold font-serif text-slate-900 text-lg">💾 Save snap session</h3>
              <button
                onClick={() => setSaveSessionModalOpen(false)}
                className="p-1 text-slate-300 hover:text-slate-500 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommitSnapshotSession} className="space-y-4 text-slate-800 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wide">Descriptive Name / Batch Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. March Week 2 cut run"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="bg-slate-50 border border-slate-205 p-3 rounded-xl text-slate-450 font-medium select-none space-y-1.5 leading-snug">
                <div>⚠️ <strong>SNAPSHOT COMMIT CONSEQUENCES:</strong></div>
                <p className="text-[11px]">
                  Saving a snapshot permanently deducts the cut reels from the Active production list. Leftover backlog reels remain in the queue and are rolled forward for the next batch optimization runs.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition cursor-pointer active:scale-95 text-center select-none"
                >
                  Confirm &amp; Commit snapshot
                </button>
                <button
                  type="button"
                  onClick={() => setSaveSessionModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer select-none"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Security PIN Validation Modal */}
      {pinPromptOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in no-print">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            <button
              onClick={() => setPinPromptOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition p-1.5 hover:bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-white">Security Authorization</h3>
            <p className="text-slate-450 text-xxs mt-1 font-semibold leading-relaxed">
              Verify your security credentials to authorize the following action:
            </p>

            <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl text-xxs font-extrabold text-amber-500 mt-3 mb-5 inline-block w-full text-center truncate select-none">
              ⚠️ {pinActionLabel}
            </div>

            <div className="space-y-4">
              <input
                type="password"
                maxLength={8}
                placeholder="Enter System PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinError(false);
                  setPinInput(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-white text-center py-3 px-4 rounded-xl text-lg font-bold font-mono tracking-widest focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerifyActionPin();
                  }
                }}
              />

              {pinError && (
                <p className="text-rose-500 text-xxs font-extrabold animate-bounce">
                  ❌ Incorrect security PIN code!
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setPinPromptOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyActionPin}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shadow-md shadow-amber-500/10 select-none"
                >
                  Confirm &amp; Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive print guidance toast */}
      {showPrintToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 bg-slate-900 border border-slate-700 text-white py-3.5 px-5 rounded-2xl shadow-2xl z-[9995] max-w-md w-[calc(100%-2rem)] flex gap-3.5 items-start animate-fade-in no-print font-sans select-none">
          <div className="bg-amber-500/10 text-amber-500 p-2 rounded-xl border border-amber-500/20 shrink-0">
            <Printer className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-black text-slate-100 tracking-wider uppercase">🖨️ Printing Initiated</h4>
            <p className="text-xxs text-slate-400 mt-1 leading-relaxed font-semibold">
              Preparing document... If the print dialogue does not appear, your browser might be blocking popup windows inside of this workspace frame.
            </p>
            <p className="text-xxs text-amber-400 mt-2 bg-amber-950/40 border border-amber-900/40 py-1 px-2.5 rounded-lg inline-flex items-center gap-1 font-bold">
              <span>💡 Tip: Click </span>
              <span className="font-extrabold underline">"Open in New Tab" ↗️</span>
              <span> in preview to bypass blocks!</span>
            </p>
          </div>
          <button
            onClick={() => setShowPrintToast(false)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg shrink-0 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
