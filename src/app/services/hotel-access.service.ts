import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HotelAccessService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAssignments(tenantId?: number): Observable<any> {
    const params: any = {};
    if (tenantId !== undefined && tenantId !== null) {
      params.tenant_id = String(tenantId);
    }
    return this.http.get(`${this.apiUrl}/hotel-access`, { params });
  }

  saveUserHotelAccess(userId: number, hotelIds: number[]): Observable<any> {
    const payload = {
      user_id: userId,
      hotel_ids: hotelIds
    };
    return this.http.post(`${this.apiUrl}/hotel-access`, payload);
  }

  deleteUserHotelAccess(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/hotel-access/${userId}`);
  }
}
