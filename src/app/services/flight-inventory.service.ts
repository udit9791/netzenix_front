import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpEvent,
  HttpRequest
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlightInventoryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createFlightInventory(payload: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/store_flight_inventory
      `,
      payload
    );
  }

  getInventories(filters: any): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        filters[key] !== undefined &&
        filters[key] !== ''
      ) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get(`${this.apiUrl}/flight_inventory`, { params });
  }

  toggleStatus(id: number) {
    return this.http.patch<{ message: string; is_active: number }>(
      `${this.apiUrl}/flight_inventory/${id}/toggle-status`,
      {}
    );
  }

  getSectors(): Observable<any> {
    return this.http.get(`${this.apiUrl}/flight_sector`);
  }

  getFlightById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/flight_inventory/${id}`);
  }

  getAirlineAirports(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/airports/search`, {
      params: { query }
    });
  }

  getAvailableDates(
    from: string,
    to: string,
    tripType?: string
  ): Observable<any> {
    const typeParam = tripType
      ? `&tripType=${encodeURIComponent(tripType)}`
      : '';
    return this.http.get(
      `${this.apiUrl}/airports/available-dates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${typeParam}`
    );
  }

  getSectorAvailableDates(tripType?: string): Observable<any> {
    let params = new HttpParams();
    if (tripType) {
      params = params.set('tripType', tripType);
    }
    return this.http.get(`${this.apiUrl}/airports/sector-available-dates`, {
      params
    });
  }

  getPairedReturnDate(
    from: string,
    to: string,
    departDate: string
  ): Observable<any> {
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('departDate', departDate);
    return this.http.get(`${this.apiUrl}/airports/paired-return-date`, {
      params
    });
  }

  uploadFlightInventory(formData: FormData): Observable<HttpEvent<any>> {
    const request = new HttpRequest(
      'POST',
      `${this.apiUrl}/flight_inventory_upload`,
      formData,
      {
        reportProgress: true,
        responseType: 'json'
      }
    );
    return this.http.request(request);
  }

  downloadFlightInventorySample(): Observable<any> {
    return this.http.get(`${this.apiUrl}/flight_inventory_sample`, {
      responseType: 'blob' as 'json'
    });
  }

  downloadExcel(filters: any): string {
    let params = new HttpParams();
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        filters[key] !== undefined &&
        filters[key] !== ''
      ) {
        params = params.set(key, filters[key]);
      }
    });

    return `${this.apiUrl}/flight_inventory_excel?${params.toString()}`;
  }

  updateSeatBlocked(payload: {
    id: number;
    seat_blocked: number;
  }): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/flight_inventory/${payload.id}/update-seat-blocked`,
      payload
    );
  }

  updateSeatAllocated(payload: {
    id: number;
    seat_allocated: number;
  }): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/flight_inventory/${payload.id}/update-seat-allocated`,
      payload
    );
  }

  /**
   * Temporarily freeze a number of seats on a flight inventory.
   * Backend should release these automatically after its configured TTL.
   */
  freezeSeats(payload: { id: number; seats: number }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/flight_inventory/${payload.id}/freeze-seats`,
      payload
    );
  }

  downloadExcelPost(filters: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/flight_inventory_excel`, filters);
  }

  updateFlightInventory(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/flight_inventory/${id}`, payload);
  }

  getSpecialFlights(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/special-flights`, { params });
  }

  /**
   * Get comprehensive flight details from flight_inventory_details table
   * @param filters - Optional filters for flight number, from, to, type, flight_date
   * @returns Observable with detailed flight information including:
   *   - flight_name: Airline name
   *   - flight_number: Flight number
   *   - from/to: Origin and destination
   *   - dep_time/arr_time: Departure and arrival times
   *   - airline information, terminal, baggage details
   *   - flight_inventory: Related inventory data with pricing and availability
   */
  getFlightDetails(filters?: {
    flight_number?: string;
    from?: string;
    to?: string;
    type?: string;
    flight_date?: string;
    [key: string]: any;
  }): Observable<any> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get(`${this.apiUrl}/flight_details`, { params });
  }
}
