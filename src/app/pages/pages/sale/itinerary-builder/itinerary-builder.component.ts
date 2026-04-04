import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
  FormGroup
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface ItineraryDay {
  title: string;
  description: string;
}

interface Itinerary {
  id: number;
  name: string;
  days: ItineraryDay[];
  is_active: number;
}

@Component({
  selector: 'vex-itinerary-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './itinerary-builder.component.html',
  styleUrls: ['./itinerary-builder.component.scss']
})
export class ItineraryBuilderComponent implements OnInit {
  form: FormGroup;

  displayedColumns: string[] = ['name', 'days', 'actions'];
  items: Itinerary[] = [];
  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      name: [''],
      days: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadItineraries();
  }

  get days(): FormArray {
    return this.form.get('days') as FormArray;
  }

  addDay(): void {
    const dayGroup = this.fb.group({
      title: [''],
      description: ['']
    });
    this.days.push(dayGroup);
  }

  removeDay(index: number): void {
    if (index >= 0 && index < this.days.length) {
      this.days.removeAt(index);
    }
  }

  asFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }

  private loadItineraries(): void {
    this.http.get<any>(`${this.apiUrl}/itineraries`).subscribe({
      next: (res) => {
        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const list = Array.isArray(raw) ? raw : [];
        this.items = list.map((row: any) => ({
          id: Number(row.id || 0) || 0,
          name: String(row.name || ''),
          days: Array.isArray(row.days)
            ? row.days.map((d: any) => ({
                title: String(d.title || ''),
                description: String(d.description || '')
              }))
            : [],
          is_active:
            Number(
              (row as any).is_active !== undefined &&
                (row as any).is_active !== null
                ? (row as any).is_active
                : 1
            ) || 0
        }));
      },
      error: () => {
        this.items = [];
      }
    });
  }

  toggleStatus(row: Itinerary): void {
    const id = Number(row.id || 0) || 0;
    if (!id) {
      return;
    }
    const current = Number(row.is_active || 0) || 0;
    const next = current === 1 ? 0 : 1;
    this.http
      .patch<any>(`${this.apiUrl}/itineraries/${id}/toggle-status`, {
        is_active: next === 1
      })
      .subscribe({
        next: () => {
          this.items = this.items.map((it) =>
            it.id === id ? { ...it, is_active: next } : it
          );
        },
        error: () => {}
      });
  }
}
