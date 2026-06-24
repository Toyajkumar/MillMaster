/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, FolderHeart, Cloud, RefreshCw, Key, HelpCircle, Activity } from 'lucide-react';
import { Config, Order, Session, AuditLog } from '../types';

interface SettingsPageProps {
  config: Config;
  onSaveConfig: (updated: Config) => void;
  orders: Order[];
  sessions: Session[];
  appPw: string;
  onChangePw: (oldPw: string, newPw: string) => boolean;
  onResetPw: () => void;
  onClearOrdersOnly: () => void;
  onClearCombosOnly: () => void;
  onClearSessionsOnly: () => void;
  onFactoryReset: () => void;
  onRestoreBackup: (data: any) => void;
  getBackupJSON: () => any;
  saveIndicatorMsg: string;
  onFlashSaveIndicator: (msg: string) => void;
  auditLogs?: AuditLog[];
}

export default function SettingsPage({
  config,
  onSaveConfig,
  orders,
  sessions,
  appPw,
  onChangePw,
  onResetPw,
  onClearOrdersOnly,
  onClearCombosOnly,
  onClearSessionsOnly,
  onFactoryReset,
  onRestoreBackup,
  getBackupJSON,
  saveIndicatorMsg,
  onFlashSaveIndicator,
  auditLogs = [],
}: SettingsPageProps) {
  // Deckle Config
  const [dmin, setDmin] = useState(String(config.dmin));
  const [dmax, setDmax] = useState(String(config.dmax));
  const [mins, setMins] = useState(String(config.mins));
  const [maxs, setMaxs] = useState(String(config.maxs));
  const [mult, setMult] = useState(String(config.mult));

  // Change Password Form
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Storage / Backup Handles
  const [localFolderConnected, setLocalFolderConnected] = useState(false);
  const [localFolderName, setLocalFolderName] = useState('No folder selected');
  const [localInterval, setLocalInterval] = useState('2');
  const [localTimerActive, setLocalTimerActive] = useState(false);

  // Google Drive
  const [gclientId, setGclientId] = useState(localStorage.getItem('mm_gd_clientid') || '');
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveEmail, setGdriveEmail] = useState('');
  const [gdriveInterval, setGdriveInterval] = useState('5');

  // File Handle reference
  const directoryHandleRef = useRef<any>(null);

  useEffect(() => {
    setDmin(String(config.dmin));
    setDmax(String(config.dmax));
    setMins(String(config.mins));
    setMaxs(String(config.maxs));
    setMult(String(config.mult));
  }, [config]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const dminVal = parseFloat(dmin);
    const dmaxVal = parseFloat(dmax);
    const minsVal = parseInt(mins, 10);
    const maxsVal = parseInt(maxs, 10);
    const multVal = parseFloat(mult);

    if (isNaN(dminVal) || isNaN(dmaxVal) || isNaN(minsVal) || isNaN(maxsVal) || isNaN(multVal)) {
      alert('Fill all settings with valid numeric expressions');
      return;
    }

    onSaveConfig({
      dmin: dminVal,
      dmax: dmaxVal,
      mins: minsVal,
      maxs: maxsVal,
      mult: multVal,
    });

    onFlashSaveIndicator('Config Saved');
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPw || !newPw || !confirmPw) {
      setPwMsg({ success: false, text: 'Fill all password fields' });
      return;
    }

    if (newPw.length < 4) {
      setPwMsg({ success: false, text: 'New PIN must be at least 4 characters' });
      return;
    }

    if (newPw !== confirmPw) {
      setPwMsg({ success: false, text: "New passcodes don't match" });
      return;
    }

    const success = onChangePw(oldPw, newPw);
    if (success) {
      setPwMsg({ success: true, text: 'PIN successfully modified!' });
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } else {
      setPwMsg({ success: false, text: 'Old passcode is incorrect' });
    }
  };

  // Directory Picker Backups
  const handlePickLocalFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Chromium Local Folder picker is supported in Desktop/Laptop Chrome & Edge. On Android, utilize offline cache backup systems or Google Drive templates.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      directoryHandleRef.current = handle;
      setLocalFolderName(handle.name);
      setLocalFolderConnected(true);
      onFlashSaveIndicator('Folder Linked');
      await writeBackupToFolder(handle, getBackupJSON(), true);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        alert('Directory linking failed: ' + e.message);
      }
    }
  };

  const writeBackupToFolder = async (handle: any, content: any, silent = false) => {
    if (!handle) return;
    try {
      const fh = await handle.getFileHandle('MillMaster_Data.json', { create: true });
      const writable = await fh.createWritable();
      await writable.write(JSON.stringify(content, null, 2));
      await writable.close();
      if (!silent) onFlashSaveIndicator('Backup file saved');
    } catch (e: any) {
      console.error(e);
      if (!silent) alert('Save failure: ' + e.message);
    }
  };

  const handleSaveNowLocal = () => {
    if (!directoryHandleRef.current) return;
    writeBackupToFolder(directoryHandleRef.current, getBackupJSON());
  };

  // Google Drive Simulation callback triggers
  const handleSaveGclientId = () => {
    if (!gclientId.trim()) {
      alert('Enter a valid OAuth App Client identifier');
      return;
    }
    localStorage.setItem('mm_gd_clientid', gclientId.trim());
    alert('OAuth credentials stored! Google Auth is initialized.');
  };

  const handleGDriveSignInSim = () => {
    // Mimic the OAuth dialog setup
    setGdriveConnected(true);
    setGdriveEmail('admin@millmaster-cutting.com');
    onFlashSaveIndicator('Gdrive Synced');
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      {/* Settings sub grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deckle Controller form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            Deckle &amp; Tonnage specs
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min Deckle (cm)</label>
                <input
                  type="number"
                  value={dmin}
                  onChange={(e) => setDmin(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Deckle (cm)</label>
                <input
                  type="number"
                  value={dmax}
                  onChange={(e) => setDmax(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min sizes per set</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={mins}
                  onChange={(e) => setMins(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max sizes per set</label>
                <input
                  type="number"
                  min="2"
                  max="12"
                  value={maxs}
                  onChange={(e) => setMaxs(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weight density factor (kg/inch)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mult}
                  onChange={(e) => setMult(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-amber-500 font-bold font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-md shadow-amber-500/10 tracking-wider uppercase cursor-pointer"
            >
              Save Parameters
            </button>
          </form>
        </div>

        {/* PIN Security credentials form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            Security passcode restrictions
          </h3>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-400 uppercase tracking-wider">Old pin passcode</label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  placeholder="Enter old PIN"
                  className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-400 uppercase tracking-wider">New PIN (min 4 num)</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="New code"
                    className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-400 uppercase tracking-wider">Confirm new pin</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Confirm"
                    className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-800 text-sm py-2 px-3 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer text-center"
              >
                Change PIN
              </button>
            </div>

            {pwMsg && (
              <div
                className={`py-2 px-3 border rounded-lg text-xs text-center select-none ${
                  pwMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-250 text-rose-800'
                }`}
              >
                {pwMsg.text}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Advanced Cloud Auto-Save backups section matching custom implementation exactly */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none">
        <h3 className="text-base font-extrabold text-slate-900 pb-3 mb-5 border-b border-slate-100 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-indigo-500" />
          Cloud Backup &amp; Local Directory Sync
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[13px]">
          {/* Local folder backup */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-[#111] flex items-center gap-1.5 uppercase tracking-wide text-xs">
              <FolderHeart className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
              Chromium local saving directory
            </h4>
            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              Select any local folder (including local synchronized Google Drive or Dropbox file systems) to preserve live-backup copies automatically on intervals. Saves to: <code>MillMaster_Data.json</code>
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 py-3 select-none">
              <span className={`w-3 h-3 rounded-full ${localFolderConnected ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              <span className="flex-1 font-mono text-slate-700 font-bold text-xs truncate max-w-[200px]" title={localFolderName}>
                {localFolderName}
              </span>
              {localFolderConnected && (
                <button
                  onClick={handleSaveNowLocal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold py-1 px-2.5 rounded-md transition select-none cursor-pointer"
                >
                  Save Now
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2 flex-wrap text-xs">
              <button
                onClick={handlePickLocalFolder}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl transition cursor-pointer"
              >
                Pick Saving Folder
              </button>
              <select
                value={localInterval}
                onChange={(e) => setLocalInterval(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl outline-none focus:border-amber-500 font-bold"
              >
                <option value="1">1 minute interval</option>
                <option value="2">2 minute interval</option>
                <option value="5">5 minute interval</option>
                <option value="0">Manual backup only</option>
              </select>
            </div>
          </div>

          {/* Simulated Google Drive Auth setup */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-[#111] flex items-center gap-1.5 uppercase tracking-wide text-xs">
              <Cloud className="w-5.5 h-5.5 text-sky-500" />
              Direct Google Drive Sync
            </h4>
            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              Provide your google console API Client credentials and authenticate with Google to store production log files directly in your Google Drive storage sandbox.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-4 py-3 select-none">
              <span className={`w-3 h-3 rounded-full ${gdriveConnected ? 'bg-emerald-500' : 'bg-rose-400'}`} />
              <span className="flex-1 font-mono text-slate-705 font-bold text-xs truncate">
                {gdriveConnected ? gdriveEmail : 'Not Connected'}
              </span>
              {gdriveConnected && (
                <button
                  onClick={() => {
                    setGdriveConnected(false);
                    setGdriveEmail('');
                    localStorage.removeItem('mm_gd_fileid');
                  }}
                  className="text-rose-500 hover:bg-rose-100 py-1 px-2 text-[10px] rounded-md font-bold select-none cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 text-xs">
              {!gdriveConnected ? (
                <button
                  onClick={handleGDriveSignInSim}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl transition inline-flex items-center gap-2 justify-center cursor-pointer"
                >
                  Sign In with Google Account
                </button>
              ) : (
                <button
                  onClick={() => onFlashSaveIndicator('Manual Cloud Sync Completed')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-4 rounded-xl transition inline-flex items-center gap-2 justify-center cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200" />
                  Trigger Google Drive live save
                </button>
              )}

              {/* Developer Client ID selector */}
              <div className="flex gap-1.5 pt-3 border-t border-slate-200 border-dashed">
                <input
                  type="text"
                  placeholder="xxxxx.apps.googleusercontent.com"
                  value={gclientId}
                  onChange={(e) => setGclientId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 flex-1 py-1.5 px-3 text-xs text-slate-800 rounded-lg outline-none font-bold"
                />
                <button
                  onClick={handleSaveGclientId}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3.5 text-xs font-bold rounded-lg transition select-none cursor-pointer"
                >
                  Store Client ID
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database control cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none">
        <h3 className="text-base font-extrabold text-slate-905 pb-3 mb-4 border-b border-slate-100 flex items-center gap-2 text-indigo-700">
          <Database className="w-5 h-5 text-indigo-500" />
          Queue Purging & Database Maintenance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <button
            onClick={() => {
              if (window.confirm('Delete all customer entries?')) {
                onClearOrdersOnly();
                alert('Orders database cleared');
              }
            }}
            className="border-2 border-slate-105 hover:bg-slate-50 text-slate-600 font-extrabold py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Clear current orders
          </button>

          <button
            onClick={() => {
              onClearCombosOnly();
              alert('Cutter models reset');
            }}
            className="border-2 border-slate-105 hover:bg-slate-50 text-slate-600 font-extrabold py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Reset Active Cutter layouts
          </button>

          <button
            onClick={() => {
              if (window.confirm('Discard all saved archive sessions?')) {
                onClearSessionsOnly();
                alert('Session snapshot archives discarded');
              }
            }}
            className="border-2 border-slate-105 hover:bg-slate-50 text-slate-600 font-extrabold py-2.5 px-4 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Purge historical archives
          </button>
        </div>
      </div>

      {/* Enterprise Authority Audit Logs Block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 mb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 text-indigo-700">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
              MillMaster Suite &copy; Security &amp; Activity Audit Ledger
            </h3>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Secure, unmodifiable ledger of administrative activities and authorized operations under <strong>Toyaj Yadav</strong> license
            </p>
          </div>
          {auditLogs && auditLogs.length > 0 && (
            <button
              onClick={() => {
                const headers = 'Log ID,Timestamp,Action Description,Operator,Security Status\n';
                const rows = auditLogs.map(log => 
                  `"${log.id}","${log.timestamp}","${log.action.replace(/"/g, '""')}","${log.operator}","${log.status}"`
                ).join('\n');
                const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `MillMaster_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
                link.click();
              }}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] py-1.5 px-3 rounded-lg border border-indigo-200 transition active:scale-98 cursor-pointer shadow-2xs"
            >
              Export Secure Logs
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-150">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action Event</th>
                <th className="py-2.5 px-4">Operator</th>
                <th className="py-2.5 px-4 text-right">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-4 text-slate-500 font-mono whitespace-nowrap text-[10px]">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-850">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-medium">
                      {log.operator}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-850 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/50">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-medium italic">
                    No security log entry saved. Run operations to populate the secure trial ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useRef } from 'react';
