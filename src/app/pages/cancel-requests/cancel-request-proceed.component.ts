import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'vex-cancel-request-proceed',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatDividerModule
  ],
  templateUrl: './cancel-request-proceed.component.html',
  styleUrl: './cancel-request-dialog.component.scss'
})
export class CancelRequestProceedComponent implements OnInit {
  loading = false;
  amount: number | null = null;
  order: any = null;
  orderDetails: any[] = [];
  displayedColumns = ['traveler', 'status'];
  requestColumns = [
    'flight',
    'from',
    'to',
    'date',
    'segment',
    'traveler',
    'status',
    'penalty'
  ];
  private flightRequestColumns = [
    'flight',
    'from',
    'to',
    'date',
    'segment',
    'traveler',
    'status',
    'penalty'
  ];
  private hotelRequestColumns = [
    'hotel',
    'city',
    'checkin',
    'checkout',
    'room',
    'segment',
    'status',
    'penalty'
  ];
  statuses: Array<{ id: number; name: string; is_active: number }> = [];
  statusMap: Record<number, string> = {};
  requestDetails: any[] = [];
  requestDetailsView: Array<{
    segmentId: number;
    traveler?: string;
    travelerType?: string;
    status: string;
    flight?: string;
    from?: string;
    to?: string;
    date?: string;
    hotel?: string;
    city?: string;
    checkin?: string;
    checkout?: string;
    room?: string;
    baseAmount: number;
    penaltyAmount: number;
    finalAmount: number;
  }> = [];
  itineraryRefundRules: any[] = [];
  itineraryRefundRulesView: Array<{
    days: number;
    percentage: number;
    date: string;
  }> = [];
  activityRefundRules: any[] = [];
  activityRefundRulesView: Array<{
    days: number;
    percentage: number;
    date: string;
  }> = [];
  activityDetails: any = null;
  activityAdditional: any = null;
  rejectNote: string = '';
  cancelRequestId: number | null = null;
  orderId: number | null = null;
  request: any = null;
  hotelDetails: any = null;

  constructor(
    private http: HttpClient,
    private paymentService: PaymentService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.route.params.subscribe((params) => {
      const idRaw = params['id'];
      const id = idRaw ? Number(idRaw) : null;
      if (!id) {
        return;
      }
      this.cancelRequestId = id;
      this.fetchCancelRequest(id);
    });
  }

  loadStatuses(): void {
    this.paymentService.getPaymentStatuses().subscribe({
      next: (list) => {
        this.statuses = list || [];
        this.statusMap = {};
        this.statuses.forEach((s) => {
          if (s && typeof s.id === 'number') {
            this.statusMap[s.id] = s.name;
          }
        });
      },
      error: () => {
        this.statuses = [];
        this.statusMap = {};
      }
    });
  }

  fetchCancelRequest(requestId: number): void {
    this.loading = true;
    this.http
      .get(`${environment.apiUrl}/cancellation-requests/${requestId}`)
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || {};
          this.request = data;
          this.orderId = data.order_id;
          if (Array.isArray(data.details)) {
            this.requestDetails = data.details;
          }
          if (this.orderId) {
            this.fetchOrder(this.orderId);
          } else {
            this.buildRequestDetailsView();
            this.loading = false;
          }
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  fetchOrder(orderId: number): void {
    this.http.get(`${environment.apiUrl}/orders/${orderId}`).subscribe({
      next: (res: any) => {
        const o = res?.data || res;
        this.order = o;
        this.orderDetails = Array.isArray(o?.details) ? o.details : [];
        if (this.isHotelType()) {
          this.requestColumns = [...this.hotelRequestColumns];
          const typeId = Number(this.order?.type_id || 0);
          if (typeId) {
            this.fetchHotelDetails(typeId);
          } else {
            this.buildRequestDetailsView();
          }
        } else if (this.isItineraryType()) {
          this.requestColumns = ['traveler', 'status', 'penalty'];
          this.loadItineraryRefundRules();
        } else if (this.isActivityType()) {
          this.requestColumns = ['traveler', 'status', 'penalty'];
          this.loadActivityRefundRules();
        } else {
          this.requestColumns = [...this.flightRequestColumns];
          this.buildRequestDetailsView();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private fetchHotelDetails(typeId: number): void {
    this.http.get(`${environment.apiUrl}/hotel-details/${typeId}`).subscribe({
      next: (res: any) => {
        this.hotelDetails = res?.data ?? res;
        this.buildRequestDetailsView();
      },
      error: () => {
        this.hotelDetails = null;
        this.buildRequestDetailsView();
      }
    });
  }

  getStatusName(id: any): string {
    const num = Number(id);
    return this.statusMap[num] || String(id || '');
  }

  hasIGST(): boolean {
    return Number(this.order?.igst || 0) > 0;
  }

  hasSGST(): boolean {
    return Number(this.order?.sgst || 0) > 0;
  }

  hasCGST(): boolean {
    return Number(this.order?.cgst || 0) > 0;
  }

  private getCancellationBaseTotal(): number {
    if (this.isHotelType()) {
      const rooms: any[] = Array.isArray(this.order?.hotel_rooms)
        ? this.order.hotel_rooms
        : [];
      const roomIds: number[] = [];
      const src = Array.isArray(this.requestDetails)
        ? this.requestDetails
        : Array.isArray(this.request?.details)
          ? this.request.details
          : [];
      src.forEach((d: any) => {
        const rid = Number(d.segment_id ?? d.segmentId ?? 0);
        if (rid && !roomIds.includes(rid)) roomIds.push(rid);
      });
      if (!roomIds.length) return 0;
      const idSet = new Set(roomIds);
      return rooms.reduce((sum: number, r: any) => {
        const rid = Number(r.id ?? r.room_id ?? 0);
        if (!rid || !idSet.has(rid)) return sum;
        const baseRaw = r.total_price ?? r.price ?? 0;
        const v = Number(baseRaw || 0);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
    }

    if (!Array.isArray(this.orderDetails) || !this.orderDetails.length)
      return 0;

    const ids: number[] = [];
    if (Array.isArray(this.requestDetails) && this.requestDetails.length) {
      this.requestDetails.forEach((d) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !ids.includes(id)) {
          ids.push(id);
        }
      });
    } else if (this.request && Array.isArray(this.request.details)) {
      this.request.details.forEach((d: any) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !ids.includes(id)) {
          ids.push(id);
        }
      });
    }

    if (!ids.length) {
      return 0;
    }

    const idSet = new Set(ids);
    return this.orderDetails.reduce((sum, od) => {
      const odId = Number(od.id ?? od.order_detail_id ?? od.detail_id ?? 0);
      if (!odId || !idSet.has(odId)) {
        return sum;
      }
      const baseRaw =
        od.base_price ??
        od.basePrice ??
        od.base_fare ??
        od.baseFare ??
        od.price ??
        0;
      const v = Number(baseRaw || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }

  get effectiveFinalAmount(): number {
    const finalRaw =
      this.request?.final_amount ?? this.request?.finalAmount ?? 0;
    const finalAmount = Number(finalRaw || 0);
    const baseTotal = this.getCancellationBaseTotal();
    if (baseTotal > 0 && finalAmount > baseTotal) {
      return baseTotal;
    }
    return finalAmount;
  }

  get baseAmountForCancellation(): number {
    return this.getCancellationBaseTotal();
  }

  onPenaltyChange(row: {
    baseAmount: number;
    penaltyAmount: number;
    finalAmount: number;
  }): void {
    const base = Number(row?.baseAmount || 0);
    const penalty = Number(row?.penaltyAmount || 0);
    let eff = penalty > 0 ? penalty : 0;
    if (base > 0 && eff > base) {
      eff = base;
    }
    row.finalAmount = eff;
    this.recalculatePenaltyTotal();
  }

  buildRequestDetailsView(): void {
    if (
      !Array.isArray(this.orderDetails) ||
      !Array.isArray(this.requestDetails)
    ) {
      this.requestDetailsView = [];
      return;
    }
    const totalFinalRaw =
      this.request?.final_amount ?? this.request?.finalAmount ?? 0;
    const totalFinal = Number(totalFinalRaw || 0);
    const perRowFinal = totalFinal > 0 ? totalFinal : 0;

    if (this.isHotelType()) {
      const rooms: any[] = Array.isArray(this.order?.hotel_rooms)
        ? this.order.hotel_rooms
        : [];
      const hotelName = this.order?.hotel_info?.hotel_name || '';
      const cityName = this.order?.hotel_info?.city_name || '';
      const rules =
        (this.hotelDetails?.refund_rules ??
          this.hotelDetails?.inventory?.refund_rules) ||
        [];
      this.requestDetailsView = this.requestDetails.map((d) => {
        const segmentId = Number(d.segment_id ?? d.segmentId ?? 0);
        const room =
          rooms.find(
            (r) => Number(r.id ?? r.room_id ?? 0) === Number(segmentId)
          ) || null;
        const baseAmount = Number(room?.total_price ?? 0);
        const checkIn = room?.check_in ? new Date(room.check_in) : null;
        let computedPenalty = 0;
        if (checkIn && Array.isArray(rules) && rules.length > 0) {
          const today = new Date();
          const ms =
            checkIn.getTime() - new Date(today.toDateString()).getTime();
          const diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
          const sorted = [...rules].sort(
            (a: any, b: any) =>
              Number(b.days_before_checkin ?? 0) -
              Number(a.days_before_checkin ?? 0)
          );
          for (const r of sorted) {
            const days = Number(r.days_before_checkin ?? 0);
            if (diffDays >= days) {
              const amt = Number(r.amount ?? 0);
              const pct = Number(r.percentage ?? 0);
              if (amt > 0) {
                computedPenalty = amt;
              } else if (pct > 0 && baseAmount > 0) {
                computedPenalty = Math.round((baseAmount * pct) / 100);
              }
              break;
            }
          }
        }
        const statusRaw = d.status_name ?? d.status ?? '';
        const status = statusRaw != null ? String(statusRaw) : '';
        const penaltyAmount =
          computedPenalty > 0
            ? computedPenalty
            : Number(
                d.penalty_amount ??
                  d.penaltyAmount ??
                  d.refund_amount ??
                  d.refundAmount ??
                  d.final_amount ??
                  d.finalAmount ??
                  d.amount ??
                  0
              );
        const finalAmount = penaltyAmount;
        return {
          segmentId,
          status,
          hotel: hotelName,
          city: cityName,
          checkin: room?.check_in || '',
          checkout: room?.check_out || '',
          room: room
            ? `${room.room_name || 'Room'}${
                room.meal_type_name ? ' • ' + room.meal_type_name : ''
              }`
            : String(segmentId),
          baseAmount,
          penaltyAmount,
          finalAmount
        };
      });
    } else if (this.isActivityType()) {
      const tripDate = this.getActivityEarliestDate();
      let diffDays = 0;
      if (tripDate) {
        const today = new Date();
        const startOfToday = new Date(today.toDateString());
        const ms = tripDate.getTime() - startOfToday.getTime();
        diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          diffDays = 0;
        }
      }

      const rules = Array.isArray(this.activityRefundRules)
        ? [...this.activityRefundRules]
        : [];
      rules.sort(
        (a: any, b: any) =>
          Number(b?.days_before_checkin ?? 0) -
          Number(a?.days_before_checkin ?? 0)
      );

      let selectedPct = 0;
      let selectedAmt = 0;
      for (const r of rules) {
        const days = Number(r?.days_before_checkin ?? 0);
        if (diffDays >= days) {
          selectedAmt = Number(r?.amount ?? 0);
          selectedPct = Number(r?.percentage ?? 0);
          break;
        }
      }

      this.requestDetailsView = this.requestDetails.map((d) => {
        const detailId = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        const detail = this.orderDetails.find(
          (od) => Number(od.id) === detailId
        );
        const traveler = detail
          ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim()
          : String(detailId || '');
        const travelerTypeRaw =
          detail?.passanger_type ?? detail?.passenger_type ?? '';
        const travelerType = travelerTypeRaw
          ? String(travelerTypeRaw).charAt(0).toUpperCase() +
            String(travelerTypeRaw).slice(1).toLowerCase()
          : '';
        const statusRaw = d.status_name ?? d.status ?? '';
        const status = statusRaw != null ? String(statusRaw) : '';
        const baseRaw =
          detail?.base_price ??
          detail?.basePrice ??
          detail?.base_fare ??
          detail?.baseFare ??
          detail?.price ??
          0;
        const baseAmount = Number(baseRaw || 0);

        let penaltyAmount = 0;
        if (selectedAmt > 0) {
          penaltyAmount = selectedAmt;
        } else if (selectedPct > 0 && baseAmount > 0) {
          penaltyAmount = Math.round((baseAmount * selectedPct) / 100);
        } else {
          const penaltyRaw =
            d.penalty_amount ??
            d.penaltyAmount ??
            d.refund_amount ??
            d.refundAmount ??
            d.final_amount ??
            d.finalAmount ??
            d.amount ??
            0;
          penaltyAmount = Number(penaltyRaw || 0);
        }
        const finalAmount = penaltyAmount;

        return {
          segmentId: 0,
          traveler,
          travelerType,
          status,
          baseAmount,
          penaltyAmount,
          finalAmount
        };
      });
    } else if (this.isItineraryType()) {
      const itOrder: any = this.order?.itinerary_order || {};
      const travelDateStr: string | undefined = itOrder?.travel_date;
      let diffDays = 0;
      if (travelDateStr) {
        const travelDate = new Date(travelDateStr);
        if (!isNaN(travelDate.getTime())) {
          const today = new Date();
          const startOfToday = new Date(today.toDateString());
          const ms = travelDate.getTime() - startOfToday.getTime();
          diffDays = Math.floor(ms / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            diffDays = 0;
          }
        }
      }

      const rules = Array.isArray(this.itineraryRefundRules)
        ? [...this.itineraryRefundRules]
        : [];
      rules.sort(
        (a: any, b: any) =>
          Number(b?.days_before_checkin ?? 0) -
          Number(a?.days_before_checkin ?? 0)
      );

      let selectedPct = 0;
      for (const r of rules) {
        const days = Number(r?.days_before_checkin ?? 0);
        if (diffDays >= days) {
          selectedPct = Number(r?.percentage ?? 0);
          break;
        }
      }

      this.requestDetailsView = this.requestDetails.map((d) => {
        const detailId = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        const detail = this.orderDetails.find(
          (od) => Number(od.id) === detailId
        );
        const traveler = detail
          ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim()
          : String(detailId || '');
        const travelerTypeRaw =
          detail?.passanger_type ?? detail?.passenger_type ?? '';
        const travelerType = travelerTypeRaw
          ? String(travelerTypeRaw).charAt(0).toUpperCase() +
            String(travelerTypeRaw).slice(1).toLowerCase()
          : '';
        const statusRaw = d.status_name ?? d.status ?? '';
        const status = statusRaw != null ? String(statusRaw) : '';
        const baseRaw =
          detail?.base_price ??
          detail?.basePrice ??
          detail?.base_fare ??
          detail?.baseFare ??
          detail?.price ??
          0;
        const baseAmount = Number(baseRaw || 0);

        let penaltyAmount = 0;
        if (selectedPct > 0 && baseAmount > 0) {
          penaltyAmount = Math.round((baseAmount * selectedPct) / 100);
        } else {
          const penaltyRaw =
            d.penalty_amount ??
            d.penaltyAmount ??
            d.refund_amount ??
            d.refundAmount ??
            d.final_amount ??
            d.finalAmount ??
            d.amount ??
            0;
          penaltyAmount = Number(penaltyRaw || 0);
        }
        const finalAmount = penaltyAmount;

        return {
          segmentId: 0,
          traveler,
          travelerType,
          status,
          baseAmount,
          penaltyAmount,
          finalAmount
        };
      });
    } else {
      this.requestDetailsView = this.requestDetails.map((d) => {
        const segmentId = Number(d.segment_id ?? d.segmentId ?? 0);
        const detailId = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        const detail = this.orderDetails.find(
          (od) => Number(od.id) === detailId
        );
        const traveler = detail
          ? `${detail.first_name || ''} ${detail.last_name || ''}`.trim()
          : String(detailId || '');
        const travelerTypeRaw =
          detail?.passanger_type ?? detail?.passenger_type ?? '';
        const travelerType = travelerTypeRaw
          ? String(travelerTypeRaw).charAt(0).toUpperCase() +
            String(travelerTypeRaw).slice(1).toLowerCase()
          : '';
        const statusRaw = d.status_name ?? d.status ?? '';
        const status = statusRaw != null ? String(statusRaw) : '';
        const flight = (d.flight_number ?? d.flightNumber ?? '') || '';
        const from = (d.from ?? d.source ?? '') || '';
        const to = (d.to ?? d.destination ?? '') || '';
        const dateRaw = d.flight_date ?? d.date ?? '';
        const date = dateRaw != null ? String(dateRaw) : '';
        const baseRaw =
          detail?.base_price ??
          detail?.basePrice ??
          detail?.base_fare ??
          detail?.baseFare ??
          detail?.price ??
          0;
        const baseAmount = Number(baseRaw || 0);
        const penaltyRaw =
          d.penalty_amount ??
          d.penaltyAmount ??
          d.panalty_amount ??
          d.refund_amount ??
          d.refundAmount ??
          d.final_amount ??
          d.finalAmount ??
          d.amount ??
          0;
        let penaltyAmount = Number(penaltyRaw || 0);
        const finalRaw =
          d.final_amount ?? d.finalAmount ?? d.amount ?? penaltyRaw ?? 0;
        let finalAmount = Number(finalRaw || 0);

        if (perRowFinal > 0 && penaltyAmount <= 0 && finalAmount <= 0) {
          let eff = perRowFinal;
          if (baseAmount > 0 && eff > baseAmount) {
            eff = baseAmount;
          }
          penaltyAmount = eff;
          finalAmount = eff;
        }
        return {
          segmentId,
          traveler,
          travelerType,
          status,
          flight,
          from,
          to,
          date,
          baseAmount,
          penaltyAmount,
          finalAmount
        };
      });
    }
    this.recalculatePenaltyTotal();
  }

  format(amount: any): string {
    const n = Number(amount || 0);
    return `₹ ${n.toFixed(2)}`;
  }

  recalculatePenaltyTotal(): void {
    const total = this.requestDetailsView.reduce((sum, r) => {
      const v = Number(r.finalAmount || 0);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    this.amount = total > 0 ? total : 0;
  }

  refundForRow(r: { baseAmount: number; finalAmount: number }): number {
    const base = Number(r?.baseAmount || 0);
    const penalty = Number(r?.finalAmount || 0);
    const refund = base - penalty;
    return refund > 0 ? refund : 0;
  }

  get totalRefundToUser(): number {
    return this.requestDetailsView.reduce(
      (sum, r) => sum + this.refundForRow(r),
      0
    );
  }

  confirm(): void {
    const total = Number(this.amount || 0);
    const totalText = this.format(total);
    const message =
      `Total Cancellation Amount: ${totalText}\n\n` +
      'Are you sure you want to approve this cancellation amount?';
    const ok = window.confirm(message);
    if (!ok) {
      return;
    }

    const note = (this.rejectNote || '').trim();
    const orderDetailIds: number[] = [];

    if (Array.isArray(this.requestDetails) && this.requestDetails.length) {
      this.requestDetails.forEach((d) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !orderDetailIds.includes(id)) {
          orderDetailIds.push(id);
        }
      });
    } else if (this.request && Array.isArray(this.request.details)) {
      this.request.details.forEach((d: any) => {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id && !orderDetailIds.includes(id)) {
          orderDetailIds.push(id);
        }
      });
    }

    const payload = {
      order_id: this.orderId,
      approve_amount: this.amount,
      request_id: this.request?.id,
      note,
      order_detail_id: orderDetailIds
    };
    this.http
      .post(`${environment.apiUrl}/orders/cancel-approve`, payload)
      .subscribe({
        next: () => {
          this.router.navigate(['/transactions/cancel-requests']);
        },
        error: () => {}
      });
  }

  reject(): void {
    const note = (this.rejectNote || '').trim();
    if (!note) {
      alert('Please enter note before reject');
      return;
    }
    const ok = window.confirm(
      'Are you sure you want to reject this cancellation request?'
    );
    if (!ok) {
      return;
    }
    let orderDetailId: number | null = null;
    if (Array.isArray(this.requestDetails) && this.requestDetails.length) {
      for (const d of this.requestDetails) {
        const id = Number(
          d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
        );
        if (id) {
          orderDetailId = id;
          break;
        }
      }
    } else if (this.request) {
      const d = this.request as any;
      const id = Number(
        d.order_detail_id ?? d.detail_id ?? d.orderDetailId ?? 0
      );
      if (id) {
        orderDetailId = id;
      }
    }
    const payload = {
      order_id: this.orderId,
      request_id: this.request?.id,
      order_detail_id: orderDetailId,
      note
    };
    this.http
      .post(`${environment.apiUrl}/orders/cancel-reject`, payload)
      .subscribe({
        next: () => {
          this.router.navigate(['/transactions/cancel-requests']);
        },
        error: () => {}
      });
  }

  cancel(): void {
    this.router.navigate(['/transactions/cancel-requests']);
  }

  viewDetails(): void {
    if (!this.orderId) {
      return;
    }
    const tree = this.router.createUrlTree([
      '/flights/booking-cancellation',
      this.orderId
    ]);
    const url = this.router.serializeUrl(tree);
    window.open(url, '_blank');
  }

  private isHotelType(): boolean {
    const t = this.order?.type ?? this.request?.type ?? '';
    return String(t).toLowerCase() === 'hotel';
  }

  isItineraryType(): boolean {
    const t = this.order?.type ?? this.request?.type ?? '';
    return String(t).toLowerCase() === 'itinerary';
  }

  private loadItineraryRefundRules(): void {
    const itOrder: any = this.order?.itinerary_order || {};
    const itineraryId = Number(
      itOrder?.itinerary_id ?? this.order?.type_id ?? 0
    );
    if (!itineraryId) {
      this.itineraryRefundRules = Array.isArray(
        this.order?.itinerary_info?.refund_rules
      )
        ? this.order.itinerary_info.refund_rules
        : [];
      this.buildRequestDetailsView();
      return;
    }

    const params: any = {};
    if (itOrder.departure_id != null) {
      params.departure_id = String(itOrder.departure_id);
    }
    if (itOrder.rooms != null) {
      params.rooms = String(itOrder.rooms);
    }
    if (itOrder.adults != null) {
      params.adults = String(itOrder.adults);
    }
    if (itOrder.children != null) {
      params.children = String(itOrder.children);
    }

    this.http
      .get<any>(
        `${environment.apiUrl}/itineraries/${itineraryId}/selected-detail`,
        { params }
      )
      .subscribe({
        next: (res: any) => {
          const data = res && res.data ? res.data : res;
          const rules = Array.isArray(data?.refund_rules)
            ? data.refund_rules
            : [];
          this.itineraryRefundRules = rules;
          this.buildItineraryRefundRulesView();
          this.buildRequestDetailsView();
        },
        error: () => {
          this.itineraryRefundRules = Array.isArray(
            this.order?.itinerary_info?.refund_rules
          )
            ? this.order.itinerary_info.refund_rules
            : [];
          this.buildItineraryRefundRulesView();
          this.buildRequestDetailsView();
        }
      });
  }

  private buildItineraryRefundRulesView(): void {
    const rules = Array.isArray(this.itineraryRefundRules)
      ? this.itineraryRefundRules
      : [];
    const itOrder: any = this.order?.itinerary_order || {};
    const travelDateStr: string | undefined = itOrder?.travel_date;
    let travelDate: Date | null = null;
    if (travelDateStr) {
      const d = new Date(travelDateStr);
      if (!isNaN(d.getTime())) {
        travelDate = d;
      }
    }
    this.itineraryRefundRulesView = rules.map((r: any) => {
      const daysRaw = r?.days_before_checkin;
      const days =
        typeof daysRaw === 'number'
          ? daysRaw
          : daysRaw != null
            ? Number(daysRaw)
            : 0;
      let dateText = '';
      if (travelDate && !isNaN(days)) {
        const d = new Date(travelDate);
        d.setDate(d.getDate() - days);
        dateText = d.toLocaleDateString('en-IN');
      } else if (!isNaN(days)) {
        dateText = `${days} days before check-in`;
      }
      const pctRaw = r?.percentage;
      const pct =
        typeof pctRaw === 'number'
          ? pctRaw
          : pctRaw != null
            ? Number(pctRaw)
            : 0;
      return {
        days,
        percentage: pct,
        date: dateText
      };
    });
  }

  isActivityType(): boolean {
    const t = this.order?.type ?? this.request?.type ?? '';
    return String(t).toLowerCase() === 'activity';
  }

  private getActivityEarliestDate(): Date | null {
    try {
      let additional = this.activityAdditional;
      if (!additional) {
        const raw = this.order?.additional_data;
        if (raw) {
          additional = typeof raw === 'string' ? JSON.parse(raw) : raw;
          this.activityAdditional = additional;
        }
      }
      const items = additional?.items;
      if (!Array.isArray(items) || !items.length) return null;
      let earliest: Date | null = null;
      for (const it of items) {
        const ds = it?.date;
        if (!ds) continue;
        const d = new Date(ds);
        if (isNaN(d.getTime())) continue;
        if (earliest === null || d.getTime() < earliest.getTime()) {
          earliest = d;
        }
      }
      return earliest;
    } catch {
      return null;
    }
  }

  private loadActivityRefundRules(): void {
    const activityId = Number(this.order?.type_id ?? 0);
    if (!activityId) {
      this.activityRefundRules = [];
      this.buildActivityRefundRulesView();
      this.buildRequestDetailsView();
      return;
    }
    this.http
      .get<any>(`${environment.apiUrl}/activities/${activityId}`)
      .subscribe({
        next: (res: any) => {
          const data = res && res.data ? res.data : res;
          this.activityDetails = data;
          this.activityRefundRules = Array.isArray(data?.refund_rules)
            ? data.refund_rules
            : [];
          this.buildActivityRefundRulesView();
          this.buildRequestDetailsView();
        },
        error: () => {
          this.activityRefundRules = [];
          this.buildActivityRefundRulesView();
          this.buildRequestDetailsView();
        }
      });
  }

  private buildActivityRefundRulesView(): void {
    const rules = Array.isArray(this.activityRefundRules)
      ? this.activityRefundRules
      : [];
    const tripDate = this.getActivityEarliestDate();
    this.activityRefundRulesView = rules.map((r: any) => {
      const daysRaw = r?.days_before_checkin;
      const days =
        typeof daysRaw === 'number'
          ? daysRaw
          : daysRaw != null
            ? Number(daysRaw)
            : 0;
      let dateText = '';
      if (tripDate && !isNaN(days)) {
        const d = new Date(tripDate);
        d.setDate(d.getDate() - days);
        dateText = d.toLocaleDateString('en-IN');
      } else if (!isNaN(days)) {
        dateText = `${days} days before activity`;
      }
      const pctRaw = r?.percentage;
      const pct =
        typeof pctRaw === 'number'
          ? pctRaw
          : pctRaw != null
            ? Number(pctRaw)
            : 0;
      return {
        days,
        percentage: pct,
        date: dateText
      };
    });
  }
}
