import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { UserService } from 'src/app/core/services/user.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'vex-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule
  ]
})
export class CreateUserComponent implements OnInit {
  userForm!: FormGroup;
  roles: any[] = []; // will be loaded from API
  countries: any[] = []; // will be loaded from API
  states: any[] = []; // will be loaded from API for India
  showStateDropdown = false; // controls visibility of state dropdown vs textbox

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        role: ['', Validators.required],
        country: ['', Validators.required], // Changed from country_id to country
        state: [''], // Changed from state_id to state
        state_name: [''],
        pan_no: ['']
      },
      { validators: this.passwordMatchValidator }
    );

    // ✅ Fetch roles from API
    this.userService.getRoles().subscribe({
      next: (response) => {
        // Handle both array and object with data property
        this.roles = Array.isArray(response) ? response : (response.data ? response.data : []);
        console.log('Roles loaded:', this.roles);
      },
      error: (err) => {
        console.error('Failed to load roles:', err);
        this.snackbar.open('Failed to load roles', 'OK', { duration: 3000 });
      }
    });
    
    // Fetch countries from API
    this.userService.getCountries().subscribe({
      next: (response) => {
        // Handle both array and object with data property
        this.countries = Array.isArray(response) ? response : (response.data ? response.data : []);
        console.log('Countries loaded:', this.countries);
      },
      error: (err) => {
        console.error('Failed to load countries:', err);
        this.snackbar.open('Failed to load countries', 'OK', { duration: 3000 });
      }
    });
    
    // Listen for country changes to load states if India is selected
    this.userForm.get('country')?.valueChanges.subscribe(countryId => {
      this.loadStatesIfNeeded(countryId);
    });
  }

  // Load states if India is selected (country_id = 4)
  loadStatesIfNeeded(countryId: number) {
    // India's country_id is 4
    if (countryId === 4) {
      this.showStateDropdown = true;
      
      // Load states for India
      this.userService.getStatesByCountry(4).subscribe({
        next: (response) => {
          // Handle both array and object with data property
          this.states = Array.isArray(response) ? response : (response.data ? response.data : []);
          console.log('States loaded:', this.states);
        },
        error: (err) => {
          console.error('Failed to load states:', err);
          this.snackbar.open('Failed to load states', 'OK', { duration: 3000 });
        }
      });
    } else {
      this.showStateDropdown = false;
    }
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit() {
    if (this.userForm.valid) {
      // Prepare form data
      const formData = {...this.userForm.value};
      
      // Handle state fields based on country selection
      if (this.showStateDropdown) {
        // For India, use state and get state_name from the selected state
        const selectedState = this.states.find(s => s.id === formData.state);
        if (selectedState) {
          formData.state_name = selectedState.name;
        }
      } else {
        // For other countries, use state_name and remove state
        delete formData.state;
      }
      
      console.log('Submitting user data:', formData);
      this.userService.createUserWithRole(formData).subscribe({
        next: (res) => {
          this.snackbar.open('User created successfully!', 'OK', {
            duration: 3000
          });
          this.resetForm();
          this.router.navigate(['/users']); // ✅ redirect to User List
        },
        error: (err) => {
          this.snackbar.open(
            err.error?.message || 'User creation failed',
            'OK',
            { duration: 3000 }
          );
        }
      });
    }
  }

  resetForm() {
    this.userForm.reset();
  }
}
