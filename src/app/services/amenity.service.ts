import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getAmenityCategories(): Observable<any> {
    return this.http.get(`${this.apiUrl}/amenity-categories`);
  }

  getAmenitiesList(
    page: number = 0,
    perPage: number = 10,
    sortField: string = 'name',
    sortOrder: string = 'asc',
    search: string = '',
    categoryId?: number,
    type?: 'hotel' | 'room'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', (page + 1).toString())
      .set('per_page', perPage.toString())
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('category_id', String(categoryId));
    if (type) params = params.set('type', type);
    return this.http.get(`${this.apiUrl}/amenities/list`, { params });
  }

  getAmenity(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/amenities/${id}`);
  }

  createAmenity(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/amenities`, payload);
  }

  updateAmenity(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/amenities/${id}`, payload);
  }

  toggleAmenityStatus(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/amenities/${id}/toggle`, {});
  }

  deleteAmenity(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/amenities/${id}`);
  }
}
