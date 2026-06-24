/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, FileDown } from 'lucide-react';
import { Order, Combo, Config } from '../types';
import { toCm, rwCalc, mt2r } from '../utils/engine';

interface ExcelCSVPageProps {
  orders: Order[];
  combos: Combo[];
  nextId: number;
  config: Config;
  onImportOrders: (imported: Order[]) => void;
  onExportOrdersCSV: () => void;
  onExportCombosCSV: () => void;
  onExportRemainingCSV: () => void;
  onExportFullReportCSV: () => void;
}

export default function ExcelCSVPage({
  orders,
  combos,
  nextId,
  config,
  onImportOrders,
  onExportOrdersCSV,
  onExportCombosCSV,
  onExportRemainingCSV,
  onExportFullReportCSV,
}: ExcelCSVPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleDownloadTemplate = () => {
    const headers = 'Party,GSM,BF,Size,Unit,Type,Quantity,Notes\n';
    const rows = [
      'Alpha Mills,120,16,105,cm,reels,50,Standard kraft paper',
      'Beta Printers,120,16,41.73,inch,MT,5,Estimated weight cut',
      'Gamma Mills,80,14,108,cm,reels,60,',
    ].join('\n');

    const blanks = Array(20).fill(',,,,,,,').join('\n');
    const csvContent = headers + rows + '\n' + blanks;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MillMaster_Order_Template.csv');
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('Could not parse empty file');

        const lines = text.split('\n').filter((l) => l.trim() !== '');
        if (lines.length <= 1) throw new Error('File has no entries');

        const headers = lines[0]
          .split(',')
          .map((h) => h.trim().toLowerCase().replace(/"/g, ''));

        const imported: Order[] = [];
        let curId = nextId;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 6) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h, j) => {
            rowData[h] = cols[j] || '';
          });

          const party = rowData['party'] || '';
          const gsm = parseFloat(rowData['gsm']);
          const bf = parseFloat(rowData['bf']);
          const size = parseFloat(rowData['size']);
          const unit = (rowData['unit'] || 'cm').toLowerCase() as 'cm' | 'inch' | 'mm';
          const type = (rowData['type'] || 'reels') as 'reels' | 'MT';
          const qty = parseFloat(rowData['quantity']);

          if (!party || isNaN(gsm) || isNaN(bf) || isNaN(size) || isNaN(qty)) {
            continue;
          }

          const sizeInCm = toCm(size, unit);
          const w = rwCalc(sizeInCm, config.mult);
          const reels = type === 'MT' ? mt2r(qty, w) : Math.round(qty);

          imported.push({
            id: curId++,
            party,
            gsm,
            bf,
            size,
            unit,
            sizeCm: sizeInCm,
            w,
            type,
            qty,
            reels,
            used: 0,
            hold: false,
          });
        }

        if (imported.length === 0) {
          throw new Error('No valid row structures parsed from sheet. Check headers.');
        }

        onImportOrders(imported);
        setImportStatus({
          success: true,
          message: `Successfully imported ${imported.length} new production client orders into the queue!`,
        });
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: `Error parsing CSV: ${err.message || 'Check column formatting'}`,
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        {/* Upload Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              Upload Spreadsheets
            </h3>

            <div className="bg-indigo-50/50 border border-indigo-100 text-[11px] font-semibold text-indigo-800 p-3 rounded-lg select-none">
              <strong>REQUIRED COLUMN STRUCTURES:</strong> Columns must map to exact billing words: <br />
              <code className="text-indigo-950 font-bold">Party, GSM, BF, Size, Unit, Type, Quantity, Notes</code>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-slate-50 rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 select-none group focus:border-amber-500 focus:outline-none"
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-300 group-hover:text-amber-500 transition" />
              <span className="font-bold text-sm text-slate-500 group-hover:text-amber-600 transition">
                Tap to pick a local .CSV file
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Standard excel format only</p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {importStatus && (
            <div
              className={`mt-4 border p-3 rounded-lg flex items-center gap-2 text-xs select-none ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                  : 'bg-rose-50 border-rose-250 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span className="font-semibold leading-normal">{importStatus.message}</span>
            </div>
          )}
        </div>

        {/* Download Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Download files &amp; report logs
            </h3>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold text-xs p-3 rounded-xl justify-start transition select-none active:scale-99 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-slate-400" />
                Download Order Batch template (Blank CSV with guide rows)
              </button>

              <button
                type="button"
                onClick={onExportOrdersCSV}
                disabled={orders.length === 0}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-45 text-slate-700 hover:text-slate-900 font-bold text-xs p-3 rounded-xl justify-start transition select-none active:scale-99 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-slate-400" />
                Current Queue List CSV: {orders.length} orders
              </button>

              <button
                type="button"
                onClick={onExportCombosCSV}
                disabled={combos.length === 0}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-45 text-slate-700 hover:text-slate-900 font-bold text-xs p-3 rounded-xl justify-start transition select-none active:scale-99 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-slate-400" />
                Cutter combos cut sheets index list CSV: {combos.length} sets
              </button>

              <button
                type="button"
                onClick={onExportRemainingCSV}
                disabled={orders.filter((o) => o.reels - o.used > 0).length === 0}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-45 text-slate-700 hover:text-slate-900 font-bold text-xs p-3 rounded-xl justify-start transition select-none active:scale-99 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-slate-400" />
                Residual leftover components ledger CSV
              </button>

              <button
                type="button"
                onClick={onExportFullReportCSV}
                disabled={orders.length === 0}
                className="flex items-center gap-2 bg-[#1e3f20] hover:bg-[#122b13] disabled:opacity-45 text-emerald-100 font-extrabold text-xs p-3 rounded-xl justify-start transition select-none active:scale-99 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                Download Consolidated Multi-Sheet billing ledger CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid structure preview layout matching custom specification */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none">
        <h3 className="text-base font-extrabold text-slate-900 mb-2 font-serif">📋 Order entry templates guide</h3>
        <p className="text-xs text-slate-450 mb-4 font-medium">Download the sheet, input billing row details, save as a basic CSV format, then import.</p>

        <div className="overflow-x-auto border border-slate-150 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold border-b border-slate-200 text-slate-400 uppercase tracking-wide select-none text-xxs">
                <th className="py-2.5 px-4">Party Name</th>
                <th className="py-2.5 px-3">GSM</th>
                <th className="py-2.5 px-3">BF</th>
                <th className="py-2.5 px-3 text-right">Size</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-4">Optional Comments</th>
              </tr>
            </thead>
            <tbody className="text-slate-400 font-medium font-sans">
              <tr className="border-b border-slate-100 italic">
                <td className="py-2 px-4 font-bold text-slate-500">Alpha Paper Co</td>
                <td className="py-2 px-3">120</td>
                <td className="py-2 px-3">16</td>
                <td className="py-2 px-3 text-right">105</td>
                <td className="py-2 px-3">cm</td>
                <td className="py-2 px-3">reels</td>
                <td className="py-2 px-3 text-right">50</td>
                <td className="py-2 px-4">Requires Natural Trim</td>
              </tr>
              <tr className="border-b border-slate-100 italic">
                <td className="py-2 px-4 font-bold text-slate-500">Beta Printers</td>
                <td className="py-2 px-3">120</td>
                <td className="py-2 px-3">16</td>
                <td className="py-2 px-3 text-right">41.73</td>
                <td className="py-2 px-3">inch</td>
                <td className="py-2 px-3">MT</td>
                <td className="py-2 px-3 text-right">5</td>
                <td className="py-2 px-4">Billing calculated matching scale rules</td>
              </tr>
              <tr className="italic text-center text-slate-350 select-none bg-slate-50/50">
                <td colSpan={8} className="py-4 font-bold text-xs">
                  &larr; Fill additional billing parameters sequentially inside the blank template cells &rarr;
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
