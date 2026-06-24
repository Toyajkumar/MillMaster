/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Order {
  id: number;
  party: string;
  gsm: number;
  bf: number;
  size: number;
  unit: 'cm' | 'inch' | 'mm';
  sizeCm: number;
  w: number; // calculated roll weight in kg
  type: 'reels' | 'MT';
  qty: number;
  reels: number;
  used: number; // how many reels used in current combos
  hold: boolean;
  completed?: boolean;
}

export interface ComboItem {
  id: number;
  party: string;
  gsm: number;
  bf: number;
  size: number;
  unit: 'cm' | 'inch' | 'mm';
  sizeCm: number;
  w: number;
}

export interface Combo {
  gsm: number;
  bf: number;
  items: Order[]; // elements aligned in set
  tot: number; // total width in cm
  sets: number; // how many sets of this combination to cut
  loss: number; // waste width in cm
  lossWtKg: number; // waste weight in kg
  mixed: boolean;
  gsmMin?: number;
  gsmMax?: number;
  bfMin?: number;
  bfMax?: number;
}

export interface Config {
  dmin: number;
  dmax: number;
  mins: number;
  maxs: number;
  mult: number; // Weight multiplier e.g. 13.5 kg/inch
}

export interface Session {
  id: number;
  name: string;
  date: string;
  orders: Order[];
  combos: Combo[];
  cfg: Config;
}

export interface SavedScheme {
  id: number;
  date: string;
  combos: Combo[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  status: string;
  operator: string;
}

export interface POItem {
  id: number;
  gsm: number;
  bf: number;
  size: number;
  unit: 'cm' | 'inch' | 'mm';
  sizeCm: number;
  qty: number;
  type: 'reels' | 'MT';
  reels: number;
  w: number; // Single reel weight in kg
  completed: boolean;
}

export interface PurchaseOrder {
  id: string; // PO Number or timestamp based ID
  poNumber: string;
  party: string;
  date: string;
  items: POItem[];
  status: 'Pending' | 'Completed';
  notes?: string;
}


