// src/app/pages/pages/holiday/group-tour/group-tour.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';

interface HolidayPackage {
  id: number;
  title: string;
  days: string;
  rating?: number;
  thumb: string;
  shortDesc: string;
  departure: string;
  price: number;
  oldPrice?: number;
  tags?: string[];
  highlights?: string[];
  duration?: string;
}

@Component({
  selector: 'app-group-tour',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material modules used in template
    MatCardModule,
    MatListModule,
    MatCheckboxModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatButtonToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './group-tour.component.html',
  styleUrls: ['./group-tour.component.scss']
})
export class GroupTourComponent implements OnInit {
  filtersForm: FormGroup;
  minPrice = 10000;
  maxPrice = 300000;
  packages: HolidayPackage[] = [];

  constructor(private fb: FormBuilder) {
    this.filtersForm = this.fb.group({
      cities: [[]],
      rating: [0],
      priceRange: [[this.minPrice, this.maxPrice]],
      durations: [[]],
      operatorBrand: [[]]
    });
  }

  ngOnInit(): void {
    this.packages = [
      {
        id: 1,
        title: 'Amazing Bhutan',
        days: '8 days',
        rating: 4,
        thumb: 'https://picsum.photos/seed/akasa/80',
        shortDesc: 'Accommodation in All Places. Daily Breakfast & Dinner.',
        departure: 'Departure Starting 21 Sep 2025',
        price: 35999,
        oldPrice: 42000,
        tags: ['Guaranteed Fixed Departure'],
        highlights: ['Daily Breakfast', 'All Tours & Transfers'],
        duration: '8 days'
      },
      {
        id: 2,
        title: 'Kerala Backwaters',
        days: '5 days',
        rating: 5,
        thumb: 'https://picsum.photos/seed/akasa/80',
        shortDesc: 'Houseboat stay & All Transfers.',
        departure: 'Departure Starting 10 Oct 2025',
        price: 19999,
        oldPrice: 24000,
        tags: ['Limited Seats'],
        highlights: ['Houseboat', 'Local Sightseeing'],
        duration: '5 days'
      }
    ];
  }

  formatPrice(n: number) {
    return n.toLocaleString('en-IN');
  }

  onViewDetails(pkg: HolidayPackage) {
    console.log('View details for', pkg);
  }

  onMinPriceChange(value: number) {
    const current = this.filtersForm.get('priceRange')?.value || [
      this.minPrice,
      this.maxPrice
    ];
    this.filtersForm.patchValue({ priceRange: [value, current[1]] });
  }

  onMaxPriceChange(value: number) {
    const current = this.filtersForm.get('priceRange')?.value || [
      this.minPrice,
      this.maxPrice
    ];
    this.filtersForm.patchValue({ priceRange: [current[0], value] });
  }
}
