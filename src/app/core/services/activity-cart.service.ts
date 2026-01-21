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
}

@Injectable({
  providedIn: 'root'
})
export class ActivityCartService {
  private storageKey = 'activity_cart';
  private countSubject = new BehaviorSubject<number>(0);
  count$ = this.countSubject.asObservable();

  constructor() {
    this.countSubject.next(this.loadItems().length);
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
      if (item.activityId !== activityId) {
        return false;
      }
      if (item.date !== date) {
        return false;
      }
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
    if (index < 0 || index >= items.length) {
      return;
    }
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

  removeItem(index: number): void {
    const items = this.loadItems();
    if (index < 0 || index >= items.length) {
      return;
    }
    items.splice(index, 1);
    this.saveItems(items);
  }

  clear(): void {
    this.saveItems([]);
  }

  private loadItems(): ActivityCartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as ActivityCartItem[];
    } catch {
      return [];
    }
  }

  private saveItems(items: ActivityCartItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {}
    this.countSubject.next(items.length);
  }
}
