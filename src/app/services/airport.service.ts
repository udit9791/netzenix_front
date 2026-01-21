import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  country_code?: string;
  is_active?: boolean;
}

export interface AirportListResponse {
  data: Airport[];
  total: number;
  current_page: number;
  per_page: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirportService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Get all airports
  getAirports(): Observable<any> {
    return this.http.get(`${this.apiUrl}/airports/list`);
  }

  // Get paginated list of airports
  getAirportsList(page: number = 1, perPage: number = 10, sortField: string = 'name', sortOrder: string = 'asc', search: string = ''): Observable<AirportListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString())
      .set('sort_field', sortField)
      .set('sort_order', sortOrder);
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<AirportListResponse>(`${this.apiUrl}/airports/list`, { params });
  }

  // Get a single airport
  getAirport(id: number) {
    return this.http.get<any>(`${environment.apiUrl}/airports/${id}`);
  }

  // Create a new airport
  createAirport(airport: Airport): Observable<Airport> {
    return this.http.post<Airport>(`${this.apiUrl}/airports`, airport);
  }

  // Update an airport
  updateAirport(id: number, airport: Airport): Observable<Airport> {
    return this.http.put<Airport>(`${this.apiUrl}/airports/${id}`, airport);
  }

  // Toggle airport status
  toggleAirportStatus(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/airports/${id}/toggle-status`, {});
  }

  // Delete an airport
  deleteAirport(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/airports/${id}`);
  }

  searchAirports(query: string): Observable<Airport[]> {
    if (!query || query.length < 2) {
      return new Observable(subscriber => {
        subscriber.next([]);
        subscriber.complete();
      });
    }
    
    return this.http.get<{success: boolean, data: Airport[]}>(`${this.apiUrl}/airports/search?query=${query}`)
      .pipe(
        map(response => response.data || [])
      );
  }
}