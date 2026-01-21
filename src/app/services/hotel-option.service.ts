import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class HotelOptionService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getOptionsList(
    page: number = 0,
    perPage: number = 10,
    sortField: string = 'name',
    sortOrder: string = 'asc',
    search: string = '',
    type?: 'meal_option' | 'bed_type' | 'room_type' | 'room_view'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', (page + 1).toString())
      .set('per_page', perPage.toString())
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    if (type) params = params.set('type', type);
    return this.http.get(`${this.apiUrl}/hotel-options/list`, { params });
  }

  getOption(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/hotel-options/${id}`);
  }

  createOption(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/hotel-options`, payload);
  }

  updateOption(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/hotel-options/${id}`, payload);
  }

  deleteOption(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/hotel-options/${id}`);
  }

  getActiveOptions(type?: 'meal_option' | 'bed_type' | 'room_type' | 'room_view'): Observable<any> {
    const params = type ? new HttpParams().set('type', type) : undefined;
    return this.http.get(`${this.apiUrl}/hotel-options`, { params });
  }
}

