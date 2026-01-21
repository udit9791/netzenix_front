import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-special-flight-details-dialog',
  templateUrl: './special-flight-details-dialog.component.html',
  styleUrls: ['./special-flight-details-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule, HttpClientModule]
})
export class SpecialFlightDetailsDialogComponent implements OnInit {
  loadingCharges = false;
  errorCharges = '';
  fareCalculationData: any = null;
  get firstDetail(): any {
    const d = this.data?.fare?.flight_inventory_details;
    if (Array.isArray(d) && d.length) return d[0];
    return null;
  }
  get checkinWeight(): string {
    const w = this.firstDetail?.baggage_weight ?? this.data?.fare?.baggage;
    if (!w) return '15 KG';
    const s = String(w).toUpperCase();
    return s.includes('KG') ? s : `${s} KG`;
  }
  get cabinWeight(): string {
    const w = this.firstDetail?.cabin_baggage ?? null;
    if (!w) return '7 KG';
    const s = String(w).toUpperCase();
    return s.includes('KG') ? s : `${s} KG`;
  }

  constructor(
    public dialogRef: MatDialogRef<SpecialFlightDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: any; fare: any; adults?: number; children?: number; infants?: number },
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadFareCharges();
    try {
      console.log('SpecialFlightDetailsDialog open', {
        data: this.data,
        group: this.data?.group,
        fare: this.data?.fare,
        adults: this.data?.adults,
        children: this.data?.children,
        infants: this.data?.infants,
        onwardSegments: this.data?.group?.onwardSegments,
        returnSegments: this.data?.group?.returnSegments,
        allSegments: this.allSegments,
        originCode: this.originCode,
        destinationCode: this.destinationCode,
        departLabel: this.departLabel,
        summaryStops: this.summaryStops,
        summaryDuration: this.summaryDuration,
        checkinWeight: this.checkinWeight,
        cabinWeight: this.cabinWeight,
      });
    } catch {}
  }

  get allSegments(): any[] {
    const onward = this.data?.group?.onwardSegments || [];
    const ret = this.data?.group?.returnSegments || [];
    return [...onward, ...ret];
  }

  get originCode(): string {
    const s = this.allSegments[0];
    return s?.from || '';
  }

  get destinationCode(): string {
    const s = this.allSegments[this.allSegments.length - 1];
    return s?.to || '';
  }

  get departLabel(): string {
    const s = this.allSegments[0];
    return s?.flightDateLabel || '';
  }

  get summaryStops(): string {
    return this.data?.group?.stops || '';
  }

  get summaryDuration(): string {
    return this.data?.group?.duration || '';
  }

  connectingTime(segIndex: number): string | null {
    // Show connecting time between current segment end and next segment start
    const a = this.allSegments[segIndex];
    const b = this.allSegments[segIndex + 1];
    if (!a || !b) return null;
    try {
      const aDate = (a.arrivalDate || a.flightDate) || '';
      const bDate = (b.flightDate || b.arrivalDate) || '';
      const aDT = new Date(`${aDate}T${(a.arrivalTime || '00:00')}:00`);
      const bDT = new Date(`${bDate}T${(b.departureTime || '00:00')}:00`);
      const diffMs = bDT.getTime() - aDT.getTime();
      if (isNaN(diffMs) || diffMs <= 0) return null;
      const mins = Math.round(diffMs / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}Hr${h !== 1 ? 's' : ''} ${m}Min.`;
    } catch {
      return null;
    }
  }

  get isRefundable(): boolean {
    const apiVal = this.fareCalculationData?.is_refundable;
    if (apiVal !== undefined && apiVal !== null) {
      return Number(apiVal) === 1;
    }
    const invVal = this.data?.fare?.flight_inventory?.is_refundable;
    if (invVal !== undefined && invVal !== null) {
      return Number(invVal) === 1 || invVal === true;
    }
    return !!(this.data?.fare?.rules?.includes('R'));
  }

  get baseFare(): number {
    if (this.fareCalculationData) {
      const val = Number(this.fareCalculationData.total_base_fare) || 0;
      return isNaN(val) ? 0 : val;
    }
    const sell = this.data?.fare?.flight_inventory?.sell_price;
    const price = this.data?.fare?.price;
    const val = sell !== undefined && sell !== null ? Number(sell) : Number(price) || 0;
    return isNaN(val) ? 0 : val;
  }

  get totalAmount(): number {
    if (this.fareCalculationData) {
      const val = Number(this.fareCalculationData.final_total) || 0;
      return isNaN(val) ? 0 : val;
    }
    const val = Number(this.data?.fare?.price) || 0;
    return isNaN(val) ? 0 : val;
  }

  get taxCharges(): number {
    const diff = this.totalAmount - this.baseFare;
    return diff > 0 ? diff : 0;
  }

  get airlineMisc(): number {
    const misc = this.data?.fare?.flight_inventory?.markup;
    const val = misc !== undefined && misc !== null ? Number(misc) : 0;
    return isNaN(val) ? 0 : val;
  }

  get displayCancellationRules(): { label: string; amount: number }[] {
    const rules = this.fareCalculationData?.fare_rules || this.data?.fare?.flight_inventory?.fare_rules || [];
    if (!Array.isArray(rules)) return [];
    return rules.map((r: any) => ({
      label: `${r?.days_before_departure ?? '-'} Days To Departure`,
      amount: Number(r?.refundable_amount) || 0
    }));
  }

  get displayChangeRules(): { label: string; amount: number }[] {
    return [];
  }

  get displayServiceRules(): { label: string; amount: number }[] {
    return [];
  }

  private loadFareCharges() {
    try {
      const flightIdRaw = this.data?.fare?.id || this.data?.group?.inventoryId || this.data?.group?.id || 0;
      const numericFareId = Number(flightIdRaw);
      const isInternal = Number.isFinite(numericFareId) && numericFareId > 0;
      const flight_id = isInternal ? numericFareId : 0;
      const adults = Number(this.data?.adults ?? 1);
      const children = Number(this.data?.children ?? 0);
      const infants = Number(this.data?.infants ?? 0);

      const travelers: any[] = [];
      for (let i = 0; i < adults; i++) travelers.push({ type: 'adult' });
      for (let i = 0; i < children; i++) travelers.push({ type: 'child' });
      for (let i = 0; i < infants; i++) travelers.push({ type: 'infant' });

      if (travelers.length === 0) {
        return;
      }

      this.loadingCharges = true;
      this.errorCharges = '';

      let payload: any = { travelers };
      if (isInternal) {
        payload.flight_id = flight_id;
        payload.type = 'internal';
      } else {
        const price = Number(this.data?.fare?.price) || 0;
        payload.type = 'external';
        payload.price = price;
      }
      console.log('calculate-charges payload', payload);
      this.http.post<any>(`${environment.apiUrl}/orders/calculate-charges`, payload).subscribe({
        next: (response) => {
          if (response?.success && response?.data) {
            this.fareCalculationData = response.data;
            console.log('calculate-charges response', response);
          } else {
            this.errorCharges = response?.message || 'Failed to load fare charges';
          }
          this.loadingCharges = false;
        },
        error: () => {
          this.errorCharges = 'Error loading fare charges';
          this.loadingCharges = false;
        }
      });
    } catch {
      this.errorCharges = 'Error initializing fare charges';
      this.loadingCharges = false;
    }
  }
}