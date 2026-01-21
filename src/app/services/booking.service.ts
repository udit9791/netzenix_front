import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  constructor(private http: HttpClient) {}

  getMyBookings(tenantId?: number, supplierId?: number): Observable<any> {
    let params = new HttpParams();
    if (tenantId !== undefined) {
      params = params.set('tenant_id', String(tenantId));
    }
    if (supplierId !== undefined) {
      params = params.set('supplier_id', String(supplierId));
    }
    return this.http.get(`${environment.apiUrl}/bookings/my-bookings`, {
      params
    });
  }

  getBookingDetails(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/bookings/${id}`);
  }

  getHotelRequests(tenantId?: number, supplierId?: number): Observable<any> {
    let params = new HttpParams();
    if (tenantId !== undefined) {
      params = params.set('tenant_id', String(tenantId));
    }
    if (supplierId !== undefined) {
      params = params.set('supplier_id', String(supplierId));
    }
    return this.http.get(`${environment.apiUrl}/bookings/hotel-requests`, {
      params
    });
  }

  confirmHotelRequest(orderId: number): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/bookings/hotel-requests/${orderId}/confirm`,
      {}
    );
  }

  declineHotelRequest(orderId: number): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/bookings/hotel-requests/${orderId}/decline`,
      {}
    );
  }
}
