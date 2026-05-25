import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ActivityListItem {
  id: number;
  title: string;
  short_description?: string | null;
  has_time_slot: boolean;
  country_id: number;
  state_id: number;
  city_id: number;
  is_active: boolean;
  cover_image: string | null;
  duration_minutes: number | null;
  confirmation_type: string | null;
  min_adult_price: number | null;
  min_child_price: number | null;
  min_price: number | null;
  country_name: string;
  state_name: string;
  city_name: string;
}

export interface ActivityCountryItem {
  id: number;
  name: string;
  activity_count: number;
  sample_image: string | null;
}

export interface ActivityBookingPayload {
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    activity_id: number;
    date: string;
    slot_id: number | null;
    start_time: string | null;
    end_time: string | null;
    adults: number;
    children: number;
    adult_price: number | null;
    child_price: number | null;
    total_price: number | null;
  }>;
  travelers: Array<{
    type?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    age?: number | null;
  }>;
  total_amount: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listCountries(): Observable<ActivityCountryItem[]> {
    return this.http
      .get<any>(`${this.apiUrl}/activities/countries`)
      .pipe(map((r) => (Array.isArray(r?.data) ? r.data : [])));
  }

  list(filters: {
    search?: string;
    country_id?: number | null;
    state_id?: number | null;
    city_id?: number | null;
  } = {}): Observable<ActivityListItem[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.country_id) params = params.set('country_id', String(filters.country_id));
    if (filters.state_id) params = params.set('state_id', String(filters.state_id));
    if (filters.city_id) params = params.set('city_id', String(filters.city_id));

    return this.http
      .get<any>(`${this.apiUrl}/activities`, { params })
      .pipe(map((r) => (Array.isArray(r?.data) ? r.data : [])));
  }

  get(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/activities/${id}`)
      .pipe(map((r) => r?.data ?? r));
  }

  createBooking(payload: ActivityBookingPayload & { session_token?: string }): Observable<{
    order_id: number;
    booking_status: number;
  }> {
    return this.http
      .post<any>(`${this.apiUrl}/activity-bookings`, payload)
      .pipe(map((r) => r?.data ?? { order_id: null, booking_status: 1 }));
  }

  previewCharges(items: ActivityBookingPayload['items']): Observable<{
    total_base_fare: number;
    service_fee: number;
    markup: number;
    cgst: number;
    sgst: number;
    igst: number;
    commission: number;
    tds_on_commission: number;
    final_total: number;
    is_same_state: boolean;
  }> {
    return this.http
      .post<any>(`${this.apiUrl}/activity-bookings/preview-charges`, { items })
      .pipe(map((r) => r?.data ?? {}));
  }

  /* ===== Inventory locks ===== */

  checkCapacity(params: {
    activity_id: number;
    activity_date: string;
    time_slot_id?: number | null;
    session_token?: string;
  }): Observable<{ capacity_left: number | null }> {
    return this.http
      .post<any>(`${this.apiUrl}/activity-inventory/check`, params)
      .pipe(map((r) => r?.data ?? { capacity_left: null }));
  }

  lockInventory(params: {
    activity_id: number;
    activity_date: string;
    time_slot_id?: number | null;
    qty: number;
    session_token: string;
  }): Observable<{ lock_id: number; expires_at: string }> {
    return this.http
      .post<any>(`${this.apiUrl}/activity-inventory/lock`, params)
      .pipe(map((r) => r?.data ?? { lock_id: null, expires_at: '' }));
  }

  releaseInventory(params: {
    lock_id?: number | null;
    session_token?: string;
  }): Observable<{ released: number }> {
    return this.http
      .post<any>(`${this.apiUrl}/activity-inventory/release`, params)
      .pipe(map((r) => r?.data ?? { released: 0 }));
  }

  /* ===== Supplier ===== */

  supplierListBookings(status?: number | null): Observable<any[]> {
    const params = status != null ? { status: String(status) } : undefined;
    return this.http
      .get<any>(`${this.apiUrl}/supplier/activity-bookings`, { params })
      .pipe(map((r) => (Array.isArray(r?.data) ? r.data : [])));
  }

  supplierConfirmBooking(orderId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/supplier/activity-bookings/${orderId}/confirm`,
      {}
    );
  }

  supplierRejectBooking(orderId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/supplier/activity-bookings/${orderId}/reject`,
      {}
    );
  }
}
