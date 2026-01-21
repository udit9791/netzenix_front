import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AirportService } from 'src/app/services/airport.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vex-airport-create-update',
  templateUrl: './airport-create-update.component.html',
  styleUrls: ['./airport-create-update.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class AirportCreateUpdateComponent implements OnInit {
  form!: FormGroup;
  mode: 'create' | 'update' = 'create';
  countries: any[] = [];
  isLoading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private dialogRef: MatDialogRef<AirportCreateUpdateComponent>,
    private fb: FormBuilder,
    private airportService: AirportService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}
  
  // Compare function for mat-select to properly select country
  ngOnInit() {
    if (this.defaults) {
      this.mode = 'update';
    } else {
      this.defaults = {};
    }

    // Log what we received from the dialog
    console.log('Defaults received:', this.defaults);

    this.form = this.fb.group({
      code: [this.defaults.code || '', [Validators.required, Validators.maxLength(10)]],
      city: [this.defaults.city || '', [Validators.required, Validators.maxLength(255)]],
      country: [this.defaults.country, [Validators.required]],
      is_active: [this.defaults.is_active !== undefined ? this.defaults.is_active : true]
    });
    
    this.loadCountries();
  }

  loadCountries() {
    this.http.get(`${environment.apiUrl}/countries/list`)
      .subscribe(
        (response: any) => {
          this.countries = response.data;
          
          // In update mode, directly set the country value
          if (this.mode === 'update' && this.defaults) {
            console.log('Country from defaults:', this.defaults.country);
            
            // Force set the country value with a slight delay to ensure DOM is updated
            setTimeout(() => {
              // Try both country and country_id fields to ensure compatibility
              const countryValue = this.defaults.country || this.defaults.country_id;
              if (countryValue) {
                this.form.patchValue({
                  country: countryValue
                });
                console.log('Form after country set:', this.form.value);
              }
            }, 100);
          }
        },
        (error: any) => {
          this.snackBar.open('Failed to load countries', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          console.error('Error loading countries:', error);
        }
      );
  }

  // No longer need the onCountryChange method

  save() {
    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    const airport = this.form.value;

    if (this.mode === 'create') {
      this.createAirport(airport);
    } else {
      this.updateAirport(airport);
    }
  }

  createAirport(airport: any) {
    this.airportService.createAirport(airport).subscribe(
      (response: any) => {
        this.isLoading = false;
        this.snackBar.open('Airport created successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(response);
      },
      (error: any) => {
        this.isLoading = false;
        console.error('Error creating airport:', error);
        if (error.error && error.error.errors) {
          const errorMessages = Object.values(error.error.errors).flat();
          errorMessages.forEach((message: any) => 
            this.snackBar.open(message, 'Close', { duration: 3000 })
          );
        } else {
          this.snackBar.open('Failed to create airport', 'Close', { duration: 3000 });
        }
      }
    );
  }

  updateAirport(airport: any) {
    this.airportService.updateAirport(this.defaults.id, airport).subscribe(
      (response: any) => {
        this.isLoading = false;
        this.snackBar.open('Airport updated successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(response);
      },
      (error: any) => {
        this.isLoading = false;
        console.error('Error updating airport:', error);
        if (error.error && error.error.errors) {
          const errorMessages = Object.values(error.error.errors).flat();
          errorMessages.forEach((message: any) => 
            this.snackBar.open(message, 'Close', { duration: 3000 })
          );
        } else {
          this.snackBar.open('Failed to update airport', 'Close', { duration: 3000 });
        }
      }
    );
  }

  isCreateMode() {
    return this.mode === 'create';
  }

  isUpdateMode() {
    return this.mode === 'update';
  }
  
  compareCountryFn(c1: any, c2: any): boolean {
    // Convert to strings for comparison to handle both string and number types
    return c1 != null && c2 != null ? c1.toString() === c2.toString() : c1 === c2;
  }
}