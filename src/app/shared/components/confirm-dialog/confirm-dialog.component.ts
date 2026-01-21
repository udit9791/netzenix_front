import { Component, Inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  flightDetails?: any;
  travelerType?: string;
  type?: 'internal' | 'external';
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private toNumber(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private getInventory(): any {
    return this.data?.flightDetails?.inventory ?? this.data?.flightDetails ?? null;
  }

  getSellPrice(): number {
    const inv = this.getInventory();
    const p = inv?.sell_price ?? inv?.amount;
    return this.toNumber(p);
  }

  getInfantPrice(): number {
    const inv = this.getInventory();
    return this.toNumber(inv?.infant_price);
  }

  private getDaysUntilDeparture(): number {
    const inv = this.getInventory();
    const dStr = inv?.flight_date || null;
    const d = dStr ? new Date(dStr) : null;
    if (!d) return -1;
    const now = new Date();
    const ms = d.getTime() - now.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  private getFareRules(): any[] {
    const invRules = this.data?.flightDetails?.inventory?.fare_rules ?? [];
    const topRules = this.data?.flightDetails?.fare_rules ?? [];
    return Array.isArray(topRules) && topRules.length > 0 ? topRules : (Array.isArray(invRules) ? invRules : []);
  }

  private getApplicableFareRule(): any | null {
    const rules = this.getFareRules();
    if (!rules || rules.length === 0) return null;
    const days = this.getDaysUntilDeparture();
    const sorted = [...rules].sort((a: any, b: any) => Number(b.days_before_departure) - Number(a.days_before_departure));
    return sorted.find((r: any) => days >= Number(r.days_before_departure)) || null;
  }

  getPerPersonMaxRefund(): number {
    const t = String(this.data?.travelerType || '').toLowerCase();
    if (t === 'infant') return this.getInfantPrice();
    const rule = this.getApplicableFareRule();
    const amt = rule ? this.toNumber(rule.refundable_amount) : 0;
    return amt;
  }
}

@NgModule({
  declarations: [ConfirmDialogComponent],
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  exports: [ConfirmDialogComponent]
})
export class ConfirmDialogModule {}