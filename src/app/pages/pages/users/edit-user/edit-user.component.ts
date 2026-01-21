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
import { Router, ActivatedRoute } from '@angular/router';
import { stagger80ms } from '@vex/animations/stagger.animation';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';

@Component({
  selector: 'vex-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
  animations: [
    stagger80ms,
    fadeInUp400ms
  ],
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
export class EditUserComponent implements OnInit {
  userForm!: FormGroup;
  roles: any[] = []; // will be loaded from API
  countries: any[] = []; // will be loaded from API
  states: any[] = []; // will be loaded from API for India
  showStateDropdown = false; // controls visibility of state dropdown vs textbox
  userId!: number;
  loading = true;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      country_id: ['', Validators.required],
      state_id: [''],
      state_name: [''],
      pan_no: ['']
    });

    // Get user ID from route
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      this.loadUserData();
    });

    // ✅ Fetch roles from API
    this.userService.getRoles().subscribe({
      next: (response) => {
        // Ensure roles is always an array
        this.roles = Array.isArray(response) ? response : (response.data ? response.data : []);
      },
      error: () =>
        this.snackbar.open('Failed to load roles', 'OK', { duration: 3000 })
    });
    
    // Fetch countries from API
    this.userService.getCountries().subscribe({
      next: (response) => {
        // Ensure countries is always an array and log the response
        console.log('Countries response:', response);
        this.countries = Array.isArray(response) ? response : (response.data ? response.data : []);
        console.log('Processed countries:', this.countries);
      },
      error: (err) => {
        console.error('Failed to load countries:', err);
        this.snackbar.open('Failed to load countries', 'OK', { duration: 3000 });
      }
    });
    
    // Listen for country changes
    this.userForm.get('country_id')?.valueChanges.subscribe(countryId => {
      // Reset state fields
      this.userForm.get('state_id')?.setValue('');
      this.userForm.get('state_name')?.setValue('');
      
      // Check if India (ID: 4) is selected
      if (countryId === 4) {
        this.showStateDropdown = true;
        // Load states for India
        this.userService.getStatesByCountry(4).subscribe({
          next: (response) => {
            // Ensure states is always an array
            this.states = Array.isArray(response) ? response : (response.data ? response.data : []);
          },
          error: () =>
            this.snackbar.open('Failed to load states', 'OK', { duration: 3000 })
        });
      } else {
        this.showStateDropdown = false;
      }
    });
  }

  loadUserData() {
    this.userService.getUser(this.userId).subscribe({
      next: (user) => {
        // Get the role name from the user's roles
        const roleName = user.roles && user.roles.length > 0 ? user.roles[0].name : '';
        
        // Ensure country_id is a number for proper selection
        let countryId: number | null = null;
        // Check both country_id and country fields (API returns either one)
        if (user.country_id) {
          countryId = parseInt(user.country_id, 10);
          if (isNaN(countryId)) {
            countryId = null;
          }
        } else if (user.country) {
          // If country_id is not available, try using country field
          countryId = parseInt(user.country, 10);
          if (isNaN(countryId)) {
            countryId = null;
          }
        }
        console.log('User data country field:', user.country);
        console.log('User data country_id field:', user.country_id);
        
        // Ensure state_id is a number for proper selection
        let stateId: number | null = null;
        // Check both state_id and state fields (API returns either one)
        if (user.state_id) {
          stateId = parseInt(user.state_id, 10);
          if (isNaN(stateId)) {
            stateId = null;
          }
        } else if (user.state) {
          // If state_id is not available, try using state field
          stateId = parseInt(user.state, 10);
          if (isNaN(stateId)) {
            stateId = null;
          }
        }
        console.log('User data state field:', user.state);
        console.log('User data state_id field:', user.state_id);
        
        // Wait for countries to load before setting the form value
        this.userService.getCountries().subscribe({
          next: (response) => {
            // Ensure countries is always an array
            this.countries = Array.isArray(response) ? response : (response.data ? response.data : []);
            
            // Set form values after countries are loaded
            this.userForm.patchValue({
              name: user.name,
              email: user.email,
              role: roleName,
              country_id: countryId,
              state_id: stateId,
              state_name: user.state_name || '',
              pan_no: user.pan_no || ''
            });
            
            console.log('Countries loaded:', this.countries);
            console.log('Country ID from API:', user.country_id);
            console.log('Country ID after conversion:', countryId);
            
            // Load states if needed
            this.loadStatesIfNeeded(countryId);
            
            // Set loading to false after everything is loaded
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to load countries:', err);
            this.snackbar.open('Failed to load countries', 'OK', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading user data:', err);
        this.snackbar.open('Failed to load user data', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // Trigger country change to load states if needed - this will be called from the countries subscription
  private loadStatesIfNeeded(countryId: number | null) {
    const stateId = this.userForm.get('state_id')?.value;
    const stateName = this.userForm.get('state_name')?.value;
    
    if (countryId === 4) {
      // For India, show dropdown and load states
      this.showStateDropdown = true;
      
      // Reset state_name field as we'll use state_id for India
      this.userForm.get('state_name')?.setValue('');
      
      this.userService.getStatesByCountry(4).subscribe({
        next: (response) => {
          // Ensure states is always an array
          this.states = Array.isArray(response) ? response : (response.data ? response.data : []);
          console.log('States loaded:', this.states);
          console.log('State ID to select:', stateId);
          
          // Re-set the state_id after states are loaded
          if (stateId) {
            this.userForm.patchValue({
              state_id: stateId
            });
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load states:', err);
          this.snackbar.open('Failed to load states', 'OK', { duration: 3000 });
          this.loading = false;
        }
      });
    } else {
      // For other countries, show text field
      this.showStateDropdown = false;
      
      // Reset state_id field as we'll use state_name for other countries
      this.userForm.get('state_id')?.setValue(null);
      
      // Keep any existing state_name value
      if (stateName) {
        this.userForm.patchValue({
          state_name: stateName
        });
      }
      
      this.loading = false;
    }
  }

  onSubmit() {
    if (this.userForm.valid) {
      // Prepare form data
      const formData = {...this.userForm.value};
      
      // Rename country_id to country for the API
      if (formData.country_id) {
        formData.country = formData.country_id;
        delete formData.country_id;
      }
      
      // Handle state fields based on country selection
      if (this.showStateDropdown) {
        // For India, use state_id and get state_name from the selected state
        const selectedState = this.states.find(s => s.id === formData.state_id);
        if (selectedState) {
          formData.state_name = selectedState.name;
          // Rename state_id to state for the API
          formData.state = formData.state_id;
          delete formData.state_id;
        }
      } else {
        // For other countries, use state_name and remove state_id
        delete formData.state_id;
      }
      
      console.log('Submitting user data:', formData);
      
      this.userService.updateUser(this.userId, formData).subscribe({
        next: (res) => {
          this.snackbar.open('User updated successfully!', 'OK', {
            duration: 3000
          });
          this.router.navigate(['/users']); // redirect to User List
        },
        error: (err) => {
          console.error('Error updating user:', err);
          this.snackbar.open(
            err.error?.message || 'User update failed',
            'OK',
            { duration: 3000 }
          );
        }
      });
    }
  }
  
  cancel() {
    this.router.navigate(['/users']);
  }
}