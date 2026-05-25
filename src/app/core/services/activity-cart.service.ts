import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ActivityCartItem {
  activityId: number;
  title: string;
  date: string;
  hasTimeSlot: boolean;
  slotId: number | null;
  startTime: string | null;
  endTime: string | null;
  adults: number;
  children: number;
  adultPrice: number | null;
  childPrice: number | null;
  totalPrice: number | null;
  maxAdults: number | null;
  maxChildren: number | null;
  // Display metadata for cart/checkout summary
  coverImage?: string | null;
  shortDescription?: string | null;
  cityName?: string | null;
  // Inventory lock metadata (Phase 3)
  lockId?: number | null;
  lockExpiresAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityCartService {
  private storageKey = 'activity_cart';
  private sessionKey = 'activity_cart_session';
  private countSubject = new BehaviorSubject<number>(0);
  count$ = this.countSubject.asObservable();

  constructor() {
    this.countSubject.next(this.loadItems().length);
  }

  /** Stable random token for the current browser session — identifies the cart server-side. */
  getSessionToken(): string {
    let t = '';
    try {
      t = localStorage.getItem(this.sessionKey) || '';
    } catch {
      /* ignore */
    }
    if (!t) {
      t = this.randomToken();
      try {
        localStorage.setItem(this.sessionKey, t);
      } catch {
        /* ignore */
      }
    }
    return t;
  }

  private randomToken(): string {
    const arr = new Uint8Array(24);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  getItems(): ActivityCartItem[] {
    return this.loadItems();
  }

  hasScheduleConflict(
    activityId: number,
    date: string,
    slotId: number | null,
    startTime: string | null,
    endTime: string | null
  ): boolean {
    const items = this.loadItems();
    return items.some((item) => {
      if (item.activityId !== activityId) return false;
      if (item.date !== date) return false;
      const itemSlot = item.slotId ?? null;
      const targetSlot = slotId ?? null;
      if (itemSlot !== null || targetSlot !== null) {
        return itemSlot === targetSlot;
      }
      const itemStart = item.startTime || null;
      const itemEnd = item.endTime || null;
      const targetStart = startTime || null;
      const targetEnd = endTime || null;
      return itemStart === targetStart && itemEnd === targetEnd;
    });
  }

  addItem(item: ActivityCartItem): void {
    const items = this.loadItems();
    items.push(item);
    this.saveItems(items);
  }

  updateCounts(index: number, adults: number, children: number): void {
    const items = this.loadItems();
    if (index < 0 || index >= items.length) return;
    const current = items[index];
    const safeAdults = adults < 0 ? 0 : adults;
    const safeChildren = children < 0 ? 0 : children;
    const adultPrice = current.adultPrice ?? 0;
    const childPrice = current.childPrice ?? 0;
    const total = safeAdults * adultPrice + safeChildren * childPrice;
    items[index] = {
      ...current,
      adults: safeAdults,
      children: safeChildren,
      totalPrice: Number.isFinite(total) ? total : current.totalPrice
    };
    this.saveItems(items);
  }

  setItemLock(index: number, lockId: number | null, expiresAt: string | null): void {
    const items = this.loadItems();
    if (index < 0 || index >= items.length) return;
    items[index] = { ...items[index], lockId, lockExpiresAt: expiresAt };
    this.saveItems(items);
  }

  /** Pops and returns the item at index (caller is responsible for releasing its lock). */
  popItem(index: number): ActivityCartItem | null {
    const items = this.loadItems();
    if (index < 0 || index >= items.length) return null;
    const removed = items.splice(index, 1)[0] || null;
    this.saveItems(items);
    return removed;
  }

  /** Clears local items (caller is responsible for releasing locks server-side). */
  clear(): void {
    this.saveItems([]);
  }

  private loadItems(): ActivityCartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ActivityCartItem[]) : [];
    } catch {
      return [];
    }
  }

  private saveItems(items: ActivityCartItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      /* ignore */
    }
    this.countSubject.next(items.length);
  }
}
