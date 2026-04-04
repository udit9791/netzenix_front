import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface BookingRow {
  reference_id: string;
  location_sector: string;
  airline_hotel: string;
  travel_mode: string;
  traveller: string;
  travel_date: string;
  status_name: string;
  status: number;
  total_fare: number;
}

@Component({
  selector: 'vex-manage-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './manage-bookings.component.html',
  styleUrl: './manage-bookings.component.scss'
})
export class ManageBookingsComponent {
  searchValue = '';

  displayedColumns: string[] = [
    'reference_id',
    'location_sector',
    'airline_hotel',
    'travel_mode',
    'traveller',
    'travel_date',
    'status',
    'total_fare',
    'actions'
  ];

  bookings: BookingRow[] = [
    {
      reference_id: 'BK-1001',
      location_sector: 'AMD-BOM',
      airline_hotel: 'Akasa Air',
      travel_mode: 'Flight',
      traveller: 'Rahul Sharma',
      travel_date: '2025-02-20',
      status_name: 'Confirmed',
      status: 1,
      total_fare: 8540
    },
    {
      reference_id: 'BK-1002',
      location_sector: 'DEL-GOA',
      airline_hotel: 'Holiday Inn',
      travel_mode: 'Hotel',
      traveller: 'Priya Mehta',
      travel_date: '2025-03-05',
      status_name: 'Pending',
      status: 0,
      total_fare: 12450
    }
  ];

  get filteredBookings(): BookingRow[] {
    const term = this.searchValue.trim().toLowerCase();
    if (!term) {
      return this.bookings;
    }

    return this.bookings.filter((b) => {
      return (
        b.reference_id.toLowerCase().includes(term) ||
        b.location_sector.toLowerCase().includes(term) ||
        b.airline_hotel.toLowerCase().includes(term) ||
        b.traveller.toLowerCase().includes(term)
      );
    });
  }

  viewBooking(row: BookingRow): void {
    console.log('View booking', row);
  }
}
