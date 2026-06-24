/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash, 
  CheckCircle2, 
  Clock, 
  Search, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  X, 
  AlertCircle, 
  ArrowUpRight,
  ClipboardList,
  Layers,
  Calendar,
  User,
  PlusCircle,
  FileSpreadsheet,
  CheckSquare
} from 'lucide-react';
import { Order, Config, POItem, PurchaseOrder } from '../types';
import { toCm, rwCalc, mt2r, formatSize } from '../utils/engine';

interface PurchaseOrdersPageProps {
  pos: PurchaseOrder[];
  onSetPos: (newPosVal: PurchaseOrder[] | ((prev: PurchaseOrder[]) => PurchaseOrder[])) => void;
  config: Config;
  onAddFromPOToQueue: (orders: Omit<Order, 'id' | 'used' | 'hold'>[]) => void;
  onFlashSaveIndicator: (msg: string) => void;
  requirePin?: (actionLabel: string, onSuccess: () => void) => void;
}

export default function PurchaseOrdersPage({
  pos,
  onSetPos,
  config,
  onAddFromPOToQueue,
  onFlashSaveIndicator,
  requirePin,
}: PurchaseOrdersPageProps) {
  // Tabs & filters
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Excel/CSV import states
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const poFileInputRef = React.useRef<HTMLInputElement>(null);

  // Modal for new PO
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [party, setParty] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  });
  const [notes, setNotes] = useState('');
  
  // Interactive Line-Items Builder States represent individual item before adding
  const [lineGsm, setLineGsm] = useState('');
  const [lineBf, setLineBf] = useState('');
  const [lineSize, setLineSize] = useState('');
  const [lineUnit, setLineUnit] = useState<'cm' | 'inch' | 'mm'>('cm');
  const [lineQty, setLineQty] = useState('');
  const [lineType, setLineType] = useState<'reels' | 'MT'>('reels');
  
  // Form list of items being built for the new PO
  const [newPOItems, setNewPOItems] = useState<Omit<POItem, 'id' | 'w'>[]>([]);

  // Expanded PO cards state tracker
  const [expandedPOIds, setExpandedPOIds] = useState<string[]>([]);

  // Track selected item IDs for bulk operations per Purchase Order
  const [selectedPOItems, setSelectedPOItems] = useState<Record<string, number[]>>({});

  // Reactive Single-line weight/reels preview
  const [pveWt, setPveWt] = useState<number | null>(null);
  const [pveReels, setPveReels] = useState<number | null>(null);

  useEffect(() => {
    const sVal = parseFloat(lineSize);
    if (!isNaN(sVal) && sVal > 0) {
      const sizeInCm = toCm(sVal, lineUnit);
      const wt = rwCalc(sizeInCm, config.mult);
      setPveWt(wt);

      const qVal = parseFloat(lineQty);
      if (lineType === 'MT' && !isNaN(qVal) && qVal > 0) {
        setPveReels(mt2r(qVal, wt));
      } else {
        setPveReels(null);
      }
    } else {
      setPveWt(null);
      setPveReels(null);
    }
  }, [lineSize, lineUnit, lineQty, lineType, config.mult]);

  // Handlers
  const toggleExpand = (id: string) => {
    setExpandedPOIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const generatePONumber = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const datePart = date ? date.replace(/-/g, '').slice(2, 6) : '2606';
    setPoNumber(`PO-${datePart}-${rand}`);
  };

  const handleAddLineItem = (e: React.MouseEvent) => {
    e.preventDefault();
    const gsmVal = parseFloat(lineGsm);
    const bfVal = parseFloat(lineBf);
    const sizeVal = parseFloat(lineSize);
    const qtyVal = parseFloat(lineQty);

    if (isNaN(gsmVal) || isNaN(bfVal) || isNaN(sizeVal) || isNaN(qtyVal) || sizeVal <= 0 || qtyVal <= 0) {
      alert('Fill all item fields with positive values');
      return;
    }

    const sizeCm = toCm(sizeVal, lineUnit);
    const estReels = lineType === 'MT' ? mt2r(qtyVal, rwCalc(sizeCm, config.mult)) : Math.round(qtyVal);

    setNewPOItems((prev) => [
      ...prev,
      {
        gsm: gsmVal,
        bf: bfVal,
        size: sizeVal,
        unit: lineUnit,
        sizeCm,
        qty: qtyVal,
        type: lineType,
        reels: estReels,
        completed: false,
      }
    ]);

    // Clear builder form
    setLineSize('');
    setLineQty('');
  };

  const handleRemoveLineItem = (index: number) => {
    setNewPOItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poNumber.trim()) {
      alert('Please fill or generate a PO Number');
      return;
    }
    if (!party.trim()) {
      alert('Please enter a Client Name');
      return;
    }
    if (newPOItems.length === 0) {
      alert('Add at least one item line to this Purchase Order');
      return;
    }

    const formattedItems: POItem[] = newPOItems.map((item, idx) => {
      const w = rwCalc(item.sizeCm, config.mult);
      return {
        ...item,
        id: Date.now() + idx,
        w,
      };
    });

    const newPO: PurchaseOrder = {
      id: poNumber.trim().toUpperCase().replace(/\s+/g, '-'),
      poNumber: poNumber.trim(),
      party: party.trim(),
      date,
      items: formattedItems,
      status: 'Pending',
      notes: notes.trim() || undefined,
    };

    // Prepend new purchase order
    onSetPos((prev) => [newPO, ...prev]);
    onFlashSaveIndicator('Purchase Order Saved');

    // Reset state & close modal
    setPoNumber('');
    setParty('');
    setNotes('');
    setNewPOItems([]);
    setIsNewPOModalOpen(false);
  };

  const handleDeletePO = (id: string) => {
    const performDeletion = () => {
      onSetPos((prev) => prev.filter((p) => p.id !== id));
      onFlashSaveIndicator('PO Deleted');
    };

    if (requirePin) {
      requirePin(`Delete Purchase Order [${id}]`, performDeletion);
    } else {
      if (window.confirm(`Are you sure you want to delete purchase order "${id}"?`)) {
        performDeletion();
      }
    }
  };

  const togglePOStatus = (poId: string) => {
    onSetPos((prev) =>
      prev.map((p) => {
        if (p.id === poId) {
          const newStatus = p.status === 'Pending' ? 'Completed' : 'Pending';
          // Propagate status change to all line items for convenience
          const updatedItems = p.items.map((item) => ({
            ...item,
            completed: newStatus === 'Completed',
          }));
          return { ...p, status: newStatus, items: updatedItems };
        }
        return p;
      })
    );
    onFlashSaveIndicator('PO Status Updated');
  };

  const toggleItemStatus = (poId: string, itemId: number) => {
    onSetPos((prev) =>
      prev.map((p) => {
        if (p.id === poId) {
          const updatedItems = p.items.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          // If all items are completed, auto set PO status to Completed, else Pending
          const allCompleted = updatedItems.every((item) => item.completed);
          return {
            ...p,
            items: updatedItems,
            status: allCompleted ? 'Completed' : 'Pending',
          };
        }
        return p;
      })
    );
    onFlashSaveIndicator('Item Status Updated');
  };

  const handleToggleItemSelect = (poId: string, itemId: number) => {
    setSelectedPOItems((prev) => {
      const current = prev[poId] || [];
      const updated = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];
      return { ...prev, [poId]: updated };
    });
  };

  const handleToggleAllItemsSelect = (poId: string, itemIds: number[]) => {
    setSelectedPOItems((prev) => {
      const current = prev[poId] || [];
      const allSelected = itemIds.every((id) => current.includes(id));
      const updated = allSelected ? [] : itemIds;
      return { ...prev, [poId]: updated };
    });
  };

  const handleBulkMarkCompleted = (poId: string) => {
    const selectedIds = selectedPOItems[poId] || [];
    if (selectedIds.length === 0) {
      alert("No PO line items selected. Check at least one line item box.");
      return;
    }

    const performBulkMark = () => {
      onSetPos((prev) =>
        prev.map((p) => {
          if (p.id === poId) {
            const updatedItems = p.items.map((item) =>
              selectedIds.includes(item.id) ? { ...item, completed: true } : item
            );
            const allCompleted = updatedItems.every((item) => item.completed);
            return {
              ...p,
              items: updatedItems,
              status: allCompleted ? 'Completed' : 'Pending',
            };
          }
          return p;
        })
      );
      // Clear selection after action succeeds
      setSelectedPOItems((prev) => ({ ...prev, [poId]: [] }));
      onFlashSaveIndicator('Selected Lines Completed');
    };

    if (requirePin) {
      requirePin(`Mark ${selectedIds.length} PO line items as COMPLETED`, performBulkMark);
    } else {
      performBulkMark();
    }
  };

  const handleBulkMarkPending = (poId: string) => {
    const selectedIds = selectedPOItems[poId] || [];
    if (selectedIds.length === 0) {
      alert("No PO line items selected. Check at least one line item box.");
      return;
    }

    const performBulkPending = () => {
      onSetPos((prev) =>
        prev.map((p) => {
          if (p.id === poId) {
            const updatedItems = p.items.map((item) =>
              selectedIds.includes(item.id) ? { ...item, completed: false } : item
            );
            return {
              ...p,
              items: updatedItems,
              status: 'Pending',
            };
          }
          return p;
        })
      );
      // Clear selection after action succeeds
      setSelectedPOItems((prev) => ({ ...prev, [poId]: [] }));
      onFlashSaveIndicator('Selected Lines Set to Pending');
    };

    if (requirePin) {
      requirePin(`Mark ${selectedIds.length} PO line items as PENDING`, performBulkPending);
    } else {
      performBulkPending();
    }
  };

  const handleBulkTransferToQueue = (po: PurchaseOrder) => {
    const selectedIds = selectedPOItems[po.id] || [];
    if (selectedIds.length === 0) {
      alert("No PO line items selected. Check at least one line item box.");
      return;
    }

    const selectedItems = po.items.filter((item) => selectedIds.includes(item.id) && !item.completed);
    if (selectedItems.length === 0) {
      alert("None of the selected items are pending. (Completed items cannot be queued).");
      return;
    }

    const performTransfer = () => {
      const conversionOrders: Omit<Order, 'id' | 'used' | 'hold'>[] = selectedItems.map((item) => {
        return {
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
        };
      });

      onAddFromPOToQueue(conversionOrders);
      setSelectedPOItems((prev) => ({ ...prev, [po.id]: [] }));
      alert(`Successfully transferred ${conversionOrders.length} selected pending items from PO "${po.poNumber}" into Active Production Queue!`);
    };

    if (requirePin) {
      requirePin(`Transfer ${selectedItems.length} selected PO items to Active Cutting Queue`, performTransfer);
    } else {
      performTransfer();
    }
  };

  // Sends pending items of standard PO directly to active deckle solving queue
  const queuePOItemsToOptimizer = (po: PurchaseOrder) => {
    const pendingItems = po.items.filter((item) => !item.completed);
    if (pendingItems.length === 0) {
      alert('All items in this Purchase Order are already marked complete!');
      return;
    }

    const performTransfer = () => {
      const conversionOrders: Omit<Order, 'id' | 'used' | 'hold'>[] = pendingItems.map((item) => {
        return {
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
        };
      });

      onAddFromPOToQueue(conversionOrders);
      alert(`Successfully transferred ${conversionOrders.length} pending items from PO "${po.poNumber}" into the Active Production Queue!`);
    };

    if (requirePin) {
      requirePin(`Transfer PO "${po.poNumber}" to Active Cutting Queue`, performTransfer);
    } else {
      performTransfer();
    }
  };

  const handleDownloadPOTemplate = () => {
    const headers = 'PO Number,Party,Date,GSM,BF,Size,Unit,Type,Quantity,Notes\n';
    const rows = [
      'PO-2606-8801,Alpha Mills,2026-06-20,120,16,105,cm,reels,50,Standard quality rolls',
      'PO-2606-8801,Alpha Mills,2026-06-20,120,16,80,cm,reels,35,Standard quality rolls',
      'PO-2606-8802,Beta Printers,2026-06-20,140,18,41.73,inch,MT,6,Requires edge trimming',
      'PO-2606-8802,Beta Printers,2026-06-20,100,12,35,inch,reels,40,High BF test'
    ].join('\n');
    
    const blanks = Array(15).fill(',,,,,,,,,').join('\n');
    const csvContent = headers + rows + '\n' + blanks;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MillMaster_Bulk_PO_Template.csv');
    link.click();
  };

  const handlePOFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('Empty CSV file selection');

        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line !== '');
        if (lines.length <= 1) throw new Error('No entries found in spreadsheet rows');

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        
        // Find indices
        const idxPo = headers.findIndex((h) => h.includes('po') || h.includes('indent') || h.includes('number'));
        const idxParty = headers.findIndex((h) => h.includes('party') || h.includes('customer') || h.includes('client'));
        const idxDate = headers.findIndex((h) => h.includes('date'));
        const idxGsm = headers.findIndex((h) => h.includes('gsm'));
        const idxBf = headers.findIndex((h) => h.includes('bf'));
        const idxSize = headers.findIndex((h) => h.includes('size') || h.includes('width'));
        const idxUnit = headers.findIndex((h) => h.includes('unit'));
        const idxType = headers.findIndex((h) => h.includes('type'));
        const idxQty = headers.findIndex((h) => h.includes('quantity') || h.includes('qty') || h.includes('volume'));
        const idxNotes = headers.findIndex((h) => h.includes('note') || h.includes('spec') || h.includes('comment'));

        if (idxPo === -1 || idxParty === -1 || idxGsm === -1 || idxBf === -1 || idxSize === -1 || idxQty === -1) {
          throw new Error('Mandatory columns missing from CSV. Please check the column labels.');
        }

        // Group rows by PO Number
        const tempPOs: Record<string, { poNumber: string; party: string; date: string; notes?: string; items: Omit<POItem, 'id' | 'w'>[] }> = {};

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 6) continue;

          const rawPo = cols[idxPo];
          const rawParty = cols[idxParty];
          if (!rawPo || !rawParty) continue;

          const rawGsm = parseFloat(cols[idxGsm]);
          const rawBf = parseFloat(cols[idxBf]);
          const rawSize = parseFloat(cols[idxSize]);
          const rawQty = parseFloat(cols[idxQty]);

          if (isNaN(rawGsm) || isNaN(rawBf) || isNaN(rawSize) || isNaN(rawQty)) {
            continue; // Skip invalid numeric inputs gracefully
          }

          const rawUnit = (idxUnit !== -1 && cols[idxUnit] ? cols[idxUnit].toLowerCase() : 'cm') as 'cm' | 'inch' | 'mm';
          const rawType = (idxType !== -1 && cols[idxType] ? cols[idxType] : 'reels') as 'reels' | 'MT';
          const rawDate = idxDate !== -1 && cols[idxDate] ? cols[idxDate] : new Date().toISOString().split('T')[0];
          const rawNotes = idxNotes !== -1 && cols[idxNotes] ? cols[idxNotes] : '';

          const groupKey = rawPo.toUpperCase().trim();
          
          if (!tempPOs[groupKey]) {
            tempPOs[groupKey] = {
              poNumber: rawPo.trim(),
              party: rawParty.trim(),
              date: rawDate,
              notes: rawNotes,
              items: [],
            };
          }

          const sizeInCm = toCm(rawSize, rawUnit);
          const weight = rwCalc(sizeInCm, config.mult);
          const reels = rawType === 'MT' ? mt2r(rawQty, weight) : Math.round(rawQty);

          tempPOs[groupKey].items.push({
            gsm: rawGsm,
            bf: rawBf,
            size: rawSize,
            unit: rawUnit,
            sizeCm: sizeInCm,
            qty: rawQty,
            type: rawType,
            reels,
            completed: false,
          });
        }

        const poListToImport: PurchaseOrder[] = Object.keys(tempPOs).map((key) => {
          const poGroup = tempPOs[key];
          const formattedItems: POItem[] = poGroup.items.map((item, idx) => {
            const w = rwCalc(item.sizeCm, config.mult);
            return {
              ...item,
              id: Date.now() + Math.floor(Math.random() * 100000) + idx,
              w,
            };
          });

          return {
            id: poGroup.poNumber.toUpperCase().replace(/\s+/g, '-'),
            poNumber: poGroup.poNumber,
            party: poGroup.party,
            date: poGroup.date,
            items: formattedItems,
            status: 'Pending',
            notes: poGroup.notes || undefined,
          };
        });

        if (poListToImport.length === 0) {
          throw new Error('No valid row structures parsed from sheet. Check columns.');
        }

        // Authenticate Bulk Ingestion under local authority
        const performImport = () => {
          onSetPos((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const uniqueNew = poListToImport.filter((o) => !existingIds.has(o.id));
            return [...uniqueNew, ...prev];
          });

          setImportStatus({
            success: true,
            message: `Successfully imported ${poListToImport.length} purchase orders comprising ${poListToImport.reduce((sum, p) => sum + p.items.length, 0)} line items!`,
          });

          onFlashSaveIndicator('Spreadsheet POs Imported');
        };

        if (requirePin) {
          requirePin(`Ingest spreadsheet dataset containing ${poListToImport.length} Purchase Orders`, performImport);
        } else {
          performImport();
        }
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: `Error importing sheet: ${err.message || 'Check column formatting'}`
        });
      }
    };
    reader.readAsText(file);
  };

  // Filter Purchase Orders
  const filteredPOs = pos.filter((po) => {
    const matchesStatus = filterStatus === 'All' || po.status === filterStatus;
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.notes && po.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate high-level stats of filtered and total list
  const totalPOCount = pos.length;
  const pendingPOCount = pos.filter((p) => p.status === 'Pending').length;
  const completedPOCount = pos.filter((p) => p.status === 'Completed').length;

  const totalFilteredTonns = filteredPOs.reduce((sum, po) => {
    const poTonnage = po.items.reduce((acc, item) => {
      if (item.type === 'MT') {
        return acc + item.qty;
      } else {
        // convert reels back to weight in metric tons
        return acc + (item.reels * item.w) / 1000;
      }
    }, 0);
    return sum + poTonnage;
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      
      {/* Metrics Row - Responsive Bento cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales Indents</div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {totalPOCount} <span className="text-xs font-normal text-slate-400">Records</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Slitting</div>
          <div className="text-2xl md:text-3xl font-black text-amber-600 mt-1">
            {pendingPOCount} <span className="text-xs font-normal text-slate-450 font-sans">active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-medium">Fully Rolled / Dispatched</div>
          <div className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">
            {completedPOCount} <span className="text-xs font-normal text-slate-450 font-sans">closed</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtered Tonnage</div>
          <div className="text-2xl md:text-3xl font-black text-indigo-600 mt-1">
            {totalFilteredTonns.toFixed(1)} <span className="text-xs font-normal text-slate-400 font-sans">MT</span>
          </div>
        </div>
      </div>

      {/* Interactive Drag & Drop Excel/CSV Import Container */}
      {isImportVisible && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 no-print animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                Bulk Import Sales Indents (Excel/CSV)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Quickly import multiple purchase orders and client line items using standard spreadsheet files
              </p>
            </div>
            <button
              onClick={() => setIsImportVisible(false)}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-lg cursor-pointer transition select-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Drag & Drop Zone */}
            <div 
              onClick={() => poFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-220 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group select-none"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  if (poFileInputRef.current) {
                    poFileInputRef.current.files = dt.files;
                    const event = { target: poFileInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>;
                    handlePOFileUpload(event);
                  }
                }
              }}
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 transition" />
              <span className="font-bold text-xs text-slate-500 group-hover:text-indigo-600 transition">
                Drag &amp; drop your PO CSV here, or <span className="text-indigo-600 underline">browse local files</span>
              </span>
              <p className="text-[9px] text-slate-400 font-medium font-sans">
                Supports Standard RFC 4180 Comma Separated Spreadsheet format
              </p>
              <input
                type="file"
                ref={poFileInputRef}
                accept=".csv"
                onChange={handlePOFileUpload}
                className="hidden"
              />
            </div>

            {/* Right Column: Dynamic Guidelines and Downloader */}
            <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-700 text-xs mb-1.5 uppercase tracking-wider">Required Column Layout</h4>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                  Your Excel sheet or template columns must include the following headers on row #1:
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-600 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>PO Number</strong> (Id)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>Party</strong> (Client)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>Date</strong> (YYYY-MM-DD)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>GSM</strong> (Grade)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>BF</strong> (Durability)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>Size</strong> (Width)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>Unit</strong> (cm/inch/mm)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <strong>Qty/Type</strong> (MT/reels)
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={handleDownloadPOTemplate}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xxs py-2 px-3 rounded-lg shadow-sm transition active:scale-98 cursor-pointer border border-transparent"
                >
                  <Plus className="w-3.5 h-3.5 rotate-45" />
                  Download Empty Template CSV with Sample Data
                </button>
              </div>
            </div>
          </div>

          {importStatus && (
            <div
              className={`border p-3 rounded-xl flex items-start gap-2.5 text-xs select-none shadow-sm ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                  : 'bg-rose-50 border-rose-250 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="space-y-0.5 leading-normal">
                <p className="font-bold text-slate-800">{importStatus.success ? 'Success!' : 'Import Failed'}</p>
                <p className="font-medium text-slate-600">{importStatus.message}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Bar - Fully Phone Responsive layout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Indent#, Customer Name, spec..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-bold font-sans text-slate-800 outline-none focus:border-amber-500 transition-all"
          />
        </div>

        {/* Tab filters and Add Button */}
        <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3">
          
          {/* Grayscale filter buttons */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-50 max-w-[280px]">
            {(['All', 'Pending', 'Completed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition select-none cursor-pointer ${
                  filterStatus === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Excel/CSV Import Toggle button */}
            <button
              onClick={() => setIsImportVisible(!isImportVisible)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 font-extrabold text-xs py-2.5 px-4 rounded-xl border cursor-pointer active:scale-95 transition-all w-full text-center ${
                isImportVisible 
                  ? 'bg-indigo-50 hover:bg-indigo-100/60 text-indigo-700 border-indigo-200 shadow-sm' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Import</span>
            </button>

            {/* Add PO Button */}
            <button
              onClick={() => setIsNewPOModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all text-center"
            >
              <Plus className="w-4 h-4" />
              <span>Create Sales Indent</span>
            </button>
          </div>
        </div>
      </div>

      {/* PO Card-Based List (Stellar Responsive Design for Phones and Tablet Screens) */}
      <div className="space-y-4">
        {filteredPOs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-12 px-6 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-200" />
            <div className="font-extrabold text-sm text-slate-700">No Sales Indents Found</div>
            <p className="text-xs text-slate-400 font-medium max-w-md">
              {searchQuery ? "No indents match your search terms. Refine filters or try typing keyword." : "Add a customer sales indent with custom reel sizes, paper weights, and consignee parties."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsNewPOModalOpen(true)}
                className="mt-2 text-xs font-extrabold text-amber-500 border border-amber-300 hover:bg-amber-50 py-2 px-4 rounded-xl cursor-pointer"
              >
                Launch Create Indent Wizard
              </button>
            )}
          </div>
        ) : (
          filteredPOs.map((po) => {
            const isExpanded = expandedPOIds.includes(po.id);
            const totalItems = po.items.length;
            const completedItems = po.items.filter((i) => i.completed).length;
            const poTonnage = po.items.reduce((sum, i) => {
              return sum + (i.type === 'MT' ? i.qty : (i.reels * i.w) / 1000);
            }, 0);
            const poReels = po.items.reduce((sum, i) => sum + i.reels, 0);

            return (
              <div
                key={po.id}
                className={`bg-white border transition-all duration-300 rounded-2xl p-5 shadow-sm space-y-4 page-break-inside ${
                  po.status === 'Completed'
                    ? 'border-emerald-250 bg-emerald-50/5'
                    : 'border-slate-220 hover:border-slate-350'
                }`}
              >
                {/* Header Information Grid - Phone-Wrapped Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-100 text-slate-800 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-slate-200 uppercase">
                        {po.poNumber}
                      </span>
                      {po.status === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full select-none">
                          <CheckCircle2 className="w-3 h-3" /> COMPLETED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full select-none">
                          <Clock className="w-3 h-3 animate-pulse" /> PENDING
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      {po.party}
                    </h4>
                  </div>

                  {/* Summary Indicators & Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="flex gap-4 text-xs font-bold text-slate-500 mr-2">
                      <div>
                        <div className="text-[10px] uppercase font-normal text-slate-400 tracking-wider">Volume</div>
                        <div className="text-slate-800 font-mono mt-0.5">{poTonnage.toFixed(1)} MT ({poReels} reels)</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-normal text-slate-400 tracking-wider">Lines Complete</div>
                        <div className="text-slate-800 font-mono mt-0.5">{completedItems} / {totalItems}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 no-print">
                      <button
                        onClick={() => toggleExpand(po.id)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold cursor-pointer transition select-none"
                        title={isExpanded ? "Collapse Details" : "Expand Details"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes if applicable */}
                {po.notes && (
                  <p className="text-xxs text-slate-450 italic bg-slate-50 py-1.5 px-3 rounded-lg border-l-2 border-slate-300">
                    📝 Specs: {po.notes}
                  </p>
                )}

                {/* Expanded Details Lines (Lists all line items nicely, showing item completion status) */}
                {isExpanded && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden mt-2 bg-slate-50/50 p-2 sm:p-4 space-y-3 animate-fade-in">
                    <div className="text-xs font-black text-slate-455 pb-1 flex items-center justify-between">
                      <span>LINE ITEMS SPECIFICATIONS</span>
                      <span className="text-[10px] text-slate-400 tracking-normal font-medium">Auto-calculated single reel weights in kg</span>
                    </div>

                    {/* Dynamic Bulk Operations Panel */}
                    {(selectedPOItems[po.id] || []).length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-205 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in no-print select-none">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-indigo-650" />
                          <span className="text-xs font-extrabold text-indigo-900">
                            {(selectedPOItems[po.id] || []).length} PO items selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleBulkMarkCompleted(po.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg transition shadow-sm cursor-pointer select-none border border-transparent"
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkMarkPending(po.id)}
                            className="bg-white hover:bg-slate-100 text-slate-705 font-extrabold text-[11px] py-1.5 px-3 rounded-lg border border-slate-200 transition shadow-xs cursor-pointer select-none"
                          >
                            Mark Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkTransferToQueue(po)}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-505 font-extrabold text-[11px] py-1.5 px-3 rounded-lg border border-slate-805 transition shadow-xs cursor-pointer select-none"
                          >
                            Queue Selected ({(selectedPOItems[po.id] || []).filter(sid => !po.items.find(pi => pi.id === sid)?.completed).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPOItems((prev) => ({ ...prev, [po.id]: [] }))}
                            className="text-slate-400 hover:text-slate-650 font-bold text-xs px-2 py-1 transition cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Compact Card-Based list for Mobile and Table layout for Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left bg-white border border-slate-200 rounded-xl text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-250 text-slate-500 font-bold select-none">
                            <th className="p-2.5 text-center w-12 no-print">
                              <input
                                type="checkbox"
                                checked={po.items.length > 0 && (selectedPOItems[po.id] || []).length === po.items.length}
                                onChange={() => handleToggleAllItemsSelect(po.id, po.items.map((i) => i.id))}
                                className="w-4 h-4 text-indigo-600 border-slate-350 rounded cursor-pointer accent-indigo-600"
                              />
                            </th>
                            <th className="p-2.5 text-center w-12">#</th>
                            <th className="p-2.5 text-center w-16">GSM</th>
                            <th className="p-2.5 text-center w-16">BF</th>
                            <th className="p-2.5 text-center w-18">Size</th>
                            <th className="p-2.5 text-center">Tonnage Order</th>
                            <th className="p-2.5 text-center">Converted Reels</th>
                            <th className="p-2.5 text-right w-24">Reel Weight</th>
                            <th className="p-2.5 text-center w-24">Status</th>
                            <th className="p-2.5 text-center w-16 select-none">Toggle Only</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items.map((item, idx) => {
                            const isSelected = (selectedPOItems[po.id] || []).includes(item.id);
                            return (
                              <tr
                                key={item.id}
                                className={`border-b border-slate-100 hover:bg-slate-50/50 font-medium ${
                                  item.completed ? 'bg-emerald-50/20 text-slate-400 line-through' : ''
                                } ${isSelected ? 'bg-indigo-50/40' : ''}`}
                              >
                                <td className="p-2.5 text-center no-print">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleItemSelect(po.id, item.id)}
                                    className="w-4 h-4 text-indigo-600 border-slate-350 rounded cursor-pointer accent-indigo-600"
                                  />
                                </td>
                                <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-900">{item.gsm}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-900">{item.bf}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.size}{item.unit}</td>
                                <td className="p-2.5 text-center font-mono">{item.qty} {item.type}</td>
                                <td className="p-2.5 text-center font-mono">{item.reels}</td>
                                <td className="p-2.5 text-right font-mono text-slate-550">{item.w} kg</td>
                                <td className="p-2.5 text-center">
                                  {item.completed ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Complete
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center no-print">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => toggleItemStatus(po.id, item.id)}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded cursor-pointer accent-emerald-600"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Responsive Stacked Cards on Mobile Screen sizes */}
                    <div className="md:hidden space-y-2 select-none">
                      <div className="flex justify-between items-center bg-slate-100/70 p-2 rounded-lg text-xxs mb-1 no-print">
                        <span className="font-bold text-slate-600">Select Multiple Items</span>
                        <label className="flex items-center gap-1 cursor-pointer font-bold text-indigo-700">
                          <input
                            type="checkbox"
                            checked={po.items.length > 0 && (selectedPOItems[po.id] || []).length === po.items.length}
                            onChange={() => handleToggleAllItemsSelect(po.id, po.items.map((i) => i.id))}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 accent-indigo-600"
                          />
                          <span>Select All ({po.items.length})</span>
                        </label>
                      </div>

                      {po.items.map((item, idx) => {
                        const isSelected = (selectedPOItems[po.id] || []).includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`bg-white border rounded-xl p-3.5 space-y-2 flex flex-col relative ${
                              item.completed ? 'border-emerald-200 bg-emerald-50/5 text-slate-400 line-through' : 'border-slate-150'
                            } ${isSelected ? 'border-indigo-400 bg-indigo-50/10' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xxs font-mono bg-slate-50 text-slate-450 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1.5 no-print">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleItemSelect(po.id, item.id)}
                                  className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded cursor-pointer accent-indigo-600"
                                />
                                Line #{idx + 1}
                              </span>
                              <label className="flex items-center gap-1.5 font-bold text-xxs text-slate-500 cursor-pointer no-print">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => toggleItemStatus(po.id, item.id)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                                />
                                <span>Complete</span>
                              </label>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div>
                                <span className="text-[10px] font-normal text-slate-400 block">Grade</span>
                                <span className="font-extrabold text-slate-900">{item.gsm} GSM / {item.bf} BF</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-normal text-slate-400 block">Roll Width</span>
                                <span className="font-mono font-extrabold text-slate-800">{item.size}{item.unit}</span>
                              </div>
                              <div>
                                <span className="text-[10px] font-normal text-slate-400 block">Volume</span>
                                <span className="font-mono font-extrabold text-[#d97706]">{item.qty} {item.unit === 'cm' && item.type === 'reels' ? 'Rls' : item.type}</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xxs">
                              <div>
                                <span className="text-slate-400 block">Calculated Weight</span>
                                <span className="font-mono font-bold text-slate-800">{item.w} kg/reel </span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-right block">Total Reels</span>
                                <span className="font-mono font-bold text-right text-indigo-700 block">{item.reels} Convert</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Operations Actions bar (Send / Delete / Status Toggles) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => queuePOItemsToOptimizer(po)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 font-extrabold text-xxs rounded-xl select-none cursor-pointer transition active:scale-95 border border-slate-800"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Send to Deckle planning Queue
                    </button>
                    
                    <button
                      onClick={() => togglePOStatus(po.id)}
                      className={`flex-1 sm:flex-initial text-xxs font-extrabold py-2 px-3 rounded-xl border select-none cursor-pointer active:scale-95 transition ${
                        po.status === 'Completed'
                          ? 'border-amber-250 bg-amber-50 hover:bg-amber-100/50 text-amber-700'
                          : 'border-emerald-250 bg-emerald-50 hover:bg-emerald-100/50 text-emerald-700'
                      }`}
                    >
                      {po.status === 'Completed' ? 'Flag as Pending' : 'Flag Indent Complete'}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeletePO(po.id)}
                    className="p-2 text-slate-350 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition w-full sm:w-auto text-xxs font-extrabold cursor-pointer border border-transparent hover:border-rose-100 select-none flex items-center justify-center gap-1"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Delete Sales Indent Record
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* CREATE PURCHASE ORDER MODAL OVERLAY */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-[9990] animate-fade-in no-print">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start select-none border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-serif font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-amber-500" />
                  Create New Customer Sales Indent / PO
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Build a structured sales indent sheet with customized product specification lines</p>
              </div>
              <button
                onClick={() => setIsNewPOModalOpen(false)}
                className="p-1 text-slate-300 hover:text-slate-500 rounded-xl cursor-pointer hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with customized form and item builder */}
            <form onSubmit={handleSavePO} className="space-y-4 flex-1 overflow-y-auto pr-1 text-slate-800 text-xs">
              
              {/* Row 1: PO details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indent No / PO Number</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      placeholder="e.g. IND-7402"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="bg-slate-50 border border-slate-210 text-slate-800 font-bold py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-mono flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={generatePONumber}
                      className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold px-2 rounded-lg text-xxs transition cursor-pointer"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buyer / Customer Name (Party)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Paper Mills"
                    value={party}
                    onChange={(e) => setParty(e.target.value)}
                    className="bg-slate-50 border border-slate-210 text-slate-800 font-bold py-2 px-3 rounded-lg outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indent Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-slate-50 border border-slate-210 text-slate-800 font-mono font-bold py-2 px-3 rounded-lg outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Specifications notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indent Notes / Special Slitting Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Target delivery date 25th March, max trim waste allowed 2%"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-50 border border-slate-210 text-slate-800 py-2 px-3 rounded-lg outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Interactive Line-Items Sub-Builder Section */}
              <div className="border border-slate-200 bg-slate-50 rounded-2xl p-4 space-y-3.5 select-none">
                <div className="font-extrabold text-xs text-slate-700 flex items-center justify-between">
                  <span>ADD REEL SIZES & TARGET TONNAGE SPECIFICATION</span>
                  {pveWt !== null && (
                    <span className="text-[10px] font-mono text-indigo-700">
                      Single reel: {pveWt} kg {pveReels !== null && `| Est reels: ${pveReels}`}
                    </span>
                  )}
                </div>

                {/* Sub-Builder Row inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                  
                  {/* GSM */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">GSM</span>
                    <input
                      type="number"
                      placeholder="120"
                      value={lineGsm}
                      onChange={(e) => setLineGsm(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-800 py-1.5 px-2 rounded-lg outline-none focus:border-amber-500 text-xs text-center font-bold font-mono"
                    />
                  </div>

                  {/* BF */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">BF</span>
                    <input
                      type="number"
                      placeholder="16"
                      value={lineBf}
                      onChange={(e) => setLineBf(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-800 py-1.5 px-2 rounded-lg outline-none focus:border-amber-500 text-xs text-center font-bold font-mono"
                    />
                  </div>

                  {/* Width / Size */}
                  <div className="flex flex-col gap-1 col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Width</span>
                    <div className="grid grid-cols-3 gap-0.5">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="105"
                        value={lineSize}
                        onChange={(e) => setLineSize(e.target.value)}
                        className="col-span-2 bg-white border border-slate-200 text-slate-800 py-1.5 px-1.5 rounded-l-lg outline-none focus:border-amber-500 text-xs text-center font-bold font-mono"
                      />
                      <select
                        value={lineUnit}
                        onChange={(e) => setLineUnit(e.target.value as 'cm' | 'inch' | 'mm')}
                        className="bg-white border-y border-r border-slate-200 text-slate-600 rounded-r-lg outline-none focus:border-amber-500 text-[10px] py-1 text-center font-bold"
                      >
                        <option value="cm">cm</option>
                        <option value="inch">in</option>
                        <option value="mm">mm</option>
                      </select>
                    </div>
                  </div>

                  {/* Qty */}
                  <div className="flex flex-col gap-1 col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity</span>
                    <div className="grid grid-cols-3 gap-0.5">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="35"
                        value={lineQty}
                        onChange={(e) => setLineQty(e.target.value)}
                        className="col-span-2 bg-white border border-slate-200 text-slate-800 py-1.5 px-1.5 rounded-l-lg outline-none focus:border-amber-500 text-xs text-center font-bold font-mono"
                      />
                      <select
                        value={lineType}
                        onChange={(e) => setLineType(e.target.value as 'reels' | 'MT')}
                        className="bg-white border-y border-r border-slate-200 text-slate-600 rounded-r-lg outline-none focus:border-amber-500 text-[10px] py-1 text-center font-bold"
                      >
                        <option value="reels">Rls</option>
                        <option value="MT">MT</option>
                      </select>
                    </div>
                  </div>

                  {/* Add action */}
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 px-3 rounded-lg text-xxs tracking-wide cursor-pointer text-center w-full sm:col-span-1 flex items-center justify-center gap-1 shadow-sm active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add line
                  </button>

                </div>
              </div>

              {/* List of currently created line items inside builder modal */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide">ADDED PO ITEM REQS ({newPOItems.length} lines)</span>
                
                {newPOItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl py-6 px-4 text-center text-slate-400 text-xxs font-semibold">
                    No individual deckle lines added. Enter specs in block above and click "Add line".
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 select-none">
                    {newPOItems.map((item, idx) => {
                      const estimatedReelWeight = rwCalc(item.sizeCm, config.mult);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 items-center justify-center inline-flex font-mono text-[9px] font-black">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-slate-900">{item.gsm} GSM</span>
                            <span className="text-slate-350">/</span>
                            <span className="font-extrabold text-slate-900">{item.bf} BF</span>
                            <span className="text-slate-350">/</span>
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-black">Width: {item.size}{item.unit}</span>
                            <span className="text-slate-350">/</span>
                            <span className="font-bold text-indigo-700 font-mono">Qty: {item.qty} {item.type}</span>
                            <span className="text-slate-350">/</span>
                            <span className="text-slate-450 italic font-mono">({estimatedReelWeight} kg/reel • {item.reels} total convert reels)</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={newPOItems.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold py-3 px-4 rounded-xl transition cursor-pointer text-center select-none shadow-md shadow-emerald-600/10 active:scale-95 text-xs uppercase tracking-wide"
                >
                  Save and Create Purchase Order
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold py-3 px-5 rounded-xl transition cursor-pointer select-none text-xs"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
