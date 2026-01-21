import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getFlightById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/flights/${id}`);
  }

  // Add other flight-related methods as needed
}