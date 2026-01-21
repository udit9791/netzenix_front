import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MultiDatePickerComponent } from 'src/app/shared/multi-date-picker/multi-date-picker.component';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'vex-manage-activity',
  standalone: true,
  templateUrl: './manage-activity.component.html',
  styleUrls: ['./manage-activity.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MultiDatePickerComponent
  ]
})
export class ManageActivityComponent implements OnInit {
  activityForm!: FormGroup;
  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  minDate: Date = new Date();
  timeOptions: string[] = [];
  isSubmitting = false;
  isEditMode = false;
  activityId: number | null = null;
  imgBaseUrl: string = environment.imgUrl;
  currentCoverImagePath: string | null = null;
  coverPreviewUrl: string | null = null;
  existingImages: any[] = [];
  removedImageIds: number[] = [];
  galleryPreviews: { url: string }[] = [];
  newGalleryFiles: File[] = [];
  private apiUrl = environment.apiUrl;

  selectedCountryId: number | null = null;
  selectedStateId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.activityForm = this.fb.group({
      country_id: [null, Validators.required],
      state_id: [{ value: null, disabled: true }, Validators.required],
      city_id: [{ value: null, disabled: true }, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.required],
      cover_image: [null],
      has_time_slot: [false],
      max_adults: [1, [Validators.required, Validators.min(1)]],
      allow_child: [false],
      max_children: [{ value: 0, disabled: true }],
      has_transportation: [false],
      transportation_description: [{ value: '', disabled: true }],
      dates: this.fb.array([]),
      images: [[]],
      rangeStart: [null],
      rangeEnd: [null]
    });

    this.minDate.setHours(0, 0, 0, 0);

    this.timeOptions = this.buildTimeOptions();

    this.activityForm
      .get('allow_child')
      ?.valueChanges.subscribe((val: boolean) => {
        const ctrl = this.activityForm.get('max_children');
        if (!ctrl) return;
        if (val) {
          ctrl.enable();
        } else {
          ctrl.disable();
          ctrl.setValue(0);
        }
      });

    this.activityForm
      .get('has_transportation')
      ?.valueChanges.subscribe((val: boolean) => {
        const ctrl = this.activityForm.get('transportation_description');
        if (!ctrl) return;
        if (val) {
          ctrl.enable();
        } else {
          ctrl.disable();
          ctrl.setValue('');
        }
      });

    this.activityForm.get('has_time_slot')?.valueChanges.subscribe(() => {
      if (!this.isEditMode) {
        this.resetDates();
      }
    });

    this.activityForm
      .get('country_id')
      ?.valueChanges.subscribe((countryId: number) => {
        this.onCountryChange(countryId);
      });

    this.activityForm
      .get('state_id')
      ?.valueChanges.subscribe((stateId: number) => {
        this.onStateChange(stateId);
      });

    this.loadCountries();

    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEditMode = true;
        this.activityId = +params['id'];
        this.loadActivity(this.activityId);
      } else {
        this.addDate();
      }
    });
  }

  loadActivity(id: number): void {
    this.http.get(`${this.apiUrl}/activities/${id}`).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data = res.data;
          const activity = data.activity;

          this.activityForm.patchValue({
            country_id: activity.country_id,
            title: activity.title,
            description: activity.description,
            has_time_slot: !!activity.has_time_slot,
            max_adults: activity.max_adults,
            allow_child: !!activity.allow_child,
            max_children: activity.max_children,
            has_transportation: !!activity.has_transportation,
            transportation_description: activity.transportation_description
          });

          this.currentCoverImagePath = activity.cover_image || null;
          this.existingImages = Array.isArray(data.images) ? data.images : [];

          // Handle state and city loading sequentially
          this.userService
            .getStatesByCountry(activity.country_id)
            .subscribe((states: any) => {
              this.states = Array.isArray(states)
                ? states
                : states?.data
                  ? states.data
                  : [];
              this.activityForm.get('state_id')?.enable();
              this.activityForm.patchValue({ state_id: activity.state_id });

              this.userService
                .getCitiesByState(activity.state_id)
                .subscribe((cities: any) => {
                  this.cities = Array.isArray(cities)
                    ? cities
                    : cities?.data
                      ? cities.data
                      : [];
                  this.activityForm.get('city_id')?.enable();
                  this.activityForm.patchValue({ city_id: activity.city_id });
                });
            });

          // Clear existing dates
          while (this.dates.length) {
            this.dates.removeAt(0);
          }

          // Add dates and slots
          data.dates.forEach((d: any) => {
            const dateGroup = this.createDateGroup();
            dateGroup.patchValue({
              id: d.id,
              date: new Date(d.activity_date),
              adult_price: d.pricing?.adult_price,
              child_price: d.pricing?.child_price
            });

            const slotsArray = dateGroup.get('slots') as FormArray;
            d.time_slots.forEach((s: any) => {
              const slotGroup = this.createSlotGroup();
              slotGroup.patchValue({
                id: s.id,
                start_time: s.start_time.substring(0, 5), // HH:mm:ss to HH:mm
                end_time: s.end_time.substring(0, 5),
                max_capacity: s.max_capacity,
                adult_price: s.pricing?.adult_price,
                child_price: s.pricing?.child_price
              });
              slotsArray.push(slotGroup);
            });

            this.dates.push(dateGroup);
          });
        }
      },
      error: () => {
        this.snackBar.open('Failed to load activity details', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/sale/manage-activity']);
      }
    });
  }

  get dates(): FormArray {
    return this.activityForm.get('dates') as FormArray;
  }

  hasTimeSlot(): boolean {
    return !!this.activityForm.get('has_time_slot')?.value;
  }

  createDateGroup(): FormGroup {
    return this.fb.group({
      id: [null],
      date: [null, Validators.required],
      slots: this.fb.array([]),
      adult_price: [null, [Validators.min(0)]],
      child_price: [null, [Validators.min(0)]]
    });
  }

  createSlotGroup(): FormGroup {
    const group = this.fb.group({
      id: [null],
      start_time: ['', Validators.required],
      end_time: ['', Validators.required],
      max_capacity: [1, [Validators.required, Validators.min(1)]],
      adult_price: [null, [Validators.min(0)]],
      child_price: [null, [Validators.min(0)]]
    });

    const startCtrl = group.get('start_time');
    const endCtrl = group.get('end_time');

    startCtrl?.valueChanges.subscribe((start) => {
      if (!start || !endCtrl) {
        return;
      }
      const minEnd = this.addMinutesToTime(start, 5);
      const currentEnd = endCtrl.value as string | null;
      if (currentEnd) {
        if (this.compareTimes(currentEnd, minEnd) < 0) {
          endCtrl.setValue(null);
        }
      }
    });

    return group;
  }

  private timeToMinutes(time: string): number {
    const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
    return hh * 60 + mm;
  }

  private minutesToTime(totalMinutes: number): string {
    const hh = Math.floor(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const mm = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const total = this.timeToMinutes(time) + minutes;
    return this.minutesToTime(total);
  }

  private compareTimes(a: string, b: string): number {
    const ma = this.timeToMinutes(a);
    const mb = this.timeToMinutes(b);
    return ma - mb;
  }

  getSlots(dateIndex: number): FormArray {
    return this.dates.at(dateIndex).get('slots') as FormArray;
  }

  addDate(): void {
    this.dates.push(this.createDateGroup());
  }

  removeDate(index: number): void {
    if (this.dates.length > 1) {
      this.dates.removeAt(index);
    }
  }

  addSlot(dateIndex: number): void {
    const slots = this.getSlots(dateIndex);
    const group = this.createSlotGroup();

    if (slots.length > 0) {
      const prev = slots.at(slots.length - 1) as FormGroup;
      const prevEnd = prev.get('end_time')?.value as string | null;
      if (prevEnd) {
        group.patchValue({ start_time: prevEnd });
      }
    }

    slots.push(group);
  }

  getEndTimeOptions(dateIndex: number, slotIndex: number): string[] {
    const slots = this.getSlots(dateIndex);
    const slot = slots.at(slotIndex) as FormGroup;
    const start = slot.get('start_time')?.value as string | null;
    if (!start) {
      return this.timeOptions;
    }
    const minEnd = this.addMinutesToTime(start, 5);
    return this.timeOptions.filter((t) => this.compareTimes(t, minEnd) >= 0);
  }

  removeSlot(dateIndex: number, slotIndex: number): void {
    this.getSlots(dateIndex).removeAt(slotIndex);
  }

  resetDates(): void {
    while (this.dates.length > 0) {
      this.dates.removeAt(0);
    }
    this.addDate();
  }

  onMultiDatesChange(dates: Date[]): void {
    this.setDatesFromList(dates);
  }

  onRangeChange(): void {
    const start = this.activityForm.get('rangeStart')?.value as Date | null;
    const end = this.activityForm.get('rangeEnd')?.value as Date | null;
    if (!start || !end) {
      return;
    }
    const dates: Date[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    this.setDatesFromList(dates);
  }

  private setDatesFromList(dates: Date[]): void {
    if (this.isEditMode) {
      // In edit mode, only add dates that don't already exist
      const existingDates = this.dates.controls
        .map((c) => {
          const d = c.get('date')?.value;
          if (!d) return null;
          const nd = new Date(d);
          nd.setHours(0, 0, 0, 0);
          return nd.getTime();
        })
        .filter((t) => t !== null);

      dates.forEach((d) => {
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        if (nd >= this.minDate && !existingDates.includes(nd.getTime())) {
          const group = this.createDateGroup();
          group.patchValue({ date: nd });
          this.dates.push(group);
        }
      });
      return;
    }

    while (this.dates.length > 0) {
      this.dates.removeAt(0);
    }

    if (!dates || !dates.length) {
      this.addDate();
      return;
    }

    const normalized = dates
      .map((d) => {
        const nd = new Date(d);
        nd.setHours(0, 0, 0, 0);
        return nd;
      })
      .filter((d) => d >= this.minDate)
      .sort((a, b) => a.getTime() - b.getTime());

    if (!normalized.length) {
      this.addDate();
      return;
    }

    normalized.forEach((d) => {
      const group = this.createDateGroup();
      group.patchValue({ date: d });
      this.dates.push(group);
    });
  }

  private buildTimeOptions(): string[] {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        options.push(`${hh}:${mm}`);
      }
    }
    return options;
  }

  applyPricesToAllDates(): void {
    if (!this.dates.length) {
      return;
    }
    const firstGroup = this.dates.at(0) as FormGroup;
    const adult = firstGroup.get('adult_price')?.value;
    const child = firstGroup.get('child_price')?.value;
    for (let i = 1; i < this.dates.length; i++) {
      const group = this.dates.at(i) as FormGroup;
      group.patchValue({
        adult_price: adult,
        child_price: child
      });
    }
  }

  applySlotsToAllDates(): void {
    if (!this.dates.length) {
      return;
    }
    const firstDateGroup = this.dates.at(0) as FormGroup;
    const firstSlots = firstDateGroup.get('slots') as FormArray | null;
    if (!firstSlots || !firstSlots.length) {
      return;
    }
    for (let i = 1; i < this.dates.length; i++) {
      const targetSlots = this.getSlots(i);
      while (targetSlots.length > 0) {
        targetSlots.removeAt(0);
      }
      for (let j = 0; j < firstSlots.length; j++) {
        const sourceSlot = firstSlots.at(j) as FormGroup;
        const clone = this.createSlotGroup();
        clone.patchValue(sourceSlot.getRawValue());
        targetSlots.push(clone);
      }
    }
  }

  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => {
        this.countries = [];
      }
    });
  }

  onCountryChange(countryId: number): void {
    this.selectedCountryId = countryId || null;
    this.states = [];
    this.cities = [];
    this.selectedStateId = null;
    this.activityForm.patchValue({
      state_id: null,
      city_id: null
    });
    const stateCtrl = this.activityForm.get('state_id');
    const cityCtrl = this.activityForm.get('city_id');
    stateCtrl?.enable();
    cityCtrl?.disable();
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (res: any) => {
          this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.states = [];
        }
      });
    }
  }

  onStateChange(stateId: number): void {
    this.selectedStateId = stateId || null;
    this.cities = [];
    this.activityForm.patchValue({
      city_id: null
    });
    const cityCtrl = this.activityForm.get('city_id');
    if (stateId) {
      cityCtrl?.enable();
      this.userService.getCitiesByState(stateId).subscribe({
        next: (res: any) => {
          this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => {
          this.cities = [];
        }
      });
    } else {
      cityCtrl?.disable();
    }
  }

  onCoverImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (this.coverPreviewUrl) {
      URL.revokeObjectURL(this.coverPreviewUrl);
      this.coverPreviewUrl = null;
    }
    if (file) {
      this.coverPreviewUrl = URL.createObjectURL(file);
      this.currentCoverImagePath = null;
    }
    this.activityForm.patchValue({ cover_image: file });
  }

  onImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.newGalleryFiles = files;
    this.galleryPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    this.galleryPreviews = this.newGalleryFiles.map((f) => ({
      url: URL.createObjectURL(f)
    }));
    this.activityForm.patchValue({ images: this.newGalleryFiles });
  }

  removeExistingImage(image: any): void {
    const id = image && image.id ? Number(image.id) : null;
    if (id && !this.removedImageIds.includes(id)) {
      this.removedImageIds.push(id);
    }
    this.existingImages = this.existingImages.filter((img) => img.id !== id);
  }

  removeNewImage(index: number): void {
    if (index < 0 || index >= this.newGalleryFiles.length) {
      return;
    }
    URL.revokeObjectURL(this.galleryPreviews[index].url);
    this.galleryPreviews.splice(index, 1);
    this.newGalleryFiles.splice(index, 1);
    this.activityForm.patchValue({ images: this.newGalleryFiles });
  }

  submit(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    const raw = this.activityForm.getRawValue();
    const hasTimeSlot = !!raw.has_time_slot;
    const datesArray = Array.isArray(raw.dates) ? raw.dates : [];

    const datesPayload = datesArray.map((d: any) => {
      const dateValue = d?.date ? new Date(d.date) : null;
      let dateStr: string | null = null;
      if (dateValue && !isNaN(dateValue.getTime())) {
        const y = dateValue.getFullYear();
        const m = (dateValue.getMonth() + 1).toString().padStart(2, '0');
        const da = dateValue.getDate().toString().padStart(2, '0');
        dateStr = `${y}-${m}-${da}`;
      }

      const datePricing = !hasTimeSlot
        ? {
            adult_price:
              d?.adult_price !== undefined && d?.adult_price !== null
                ? Number(d.adult_price)
                : null,
            child_price:
              d?.child_price !== undefined && d?.child_price !== null
                ? Number(d.child_price)
                : null
          }
        : null;

      const slotsRaw = Array.isArray(d?.slots) ? d.slots : [];
      const timeSlots = hasTimeSlot
        ? slotsRaw.map((s: any) => ({
            id: s?.id || null,
            start_time: s?.start_time || null,
            end_time: s?.end_time || null,
            max_capacity:
              s?.max_capacity !== undefined && s?.max_capacity !== null
                ? Number(s.max_capacity)
                : null,
            pricing: {
              adult_price:
                s?.adult_price !== undefined && s?.adult_price !== null
                  ? Number(s.adult_price)
                  : null,
              child_price:
                s?.child_price !== undefined && s?.child_price !== null
                  ? Number(s.child_price)
                  : null
            }
          }))
        : [];

      return {
        id: d?.id || null,
        activity_date: dateStr,
        is_active: 1,
        pricing: datePricing,
        time_slots: timeSlots
      };
    });

    const activityPayload: any = {
      id: this.activityId,
      country_id: raw.country_id,
      state_id: raw.state_id,
      city_id: raw.city_id,
      title: raw.title,
      description: raw.description,
      has_time_slot: hasTimeSlot ? 1 : 0,
      max_adults:
        raw.max_adults !== undefined && raw.max_adults !== null
          ? Number(raw.max_adults)
          : null,
      allow_child: raw.allow_child ? 1 : 0,
      max_children:
        raw.max_children !== undefined && raw.max_children !== null
          ? Number(raw.max_children)
          : 0,
      has_transportation: raw.has_transportation ? 1 : 0,
      transportation_description:
        raw.transportation_description && raw.transportation_description !== ''
          ? raw.transportation_description
          : null,
      dates: datesPayload,
      removed_image_ids: this.removedImageIds
    };

    const coverImage: File | null = raw.cover_image ?? null;
    const images: File[] = Array.isArray(raw.images) ? raw.images : [];

    const form = new FormData();
    form.append('activity', JSON.stringify(activityPayload));
    if (coverImage) {
      form.append('cover_image', coverImage);
    }
    images.forEach((img) => {
      form.append('images[]', img);
    });

    this.isSubmitting = true;
    const url = this.isEditMode
      ? `${this.apiUrl}/activities/${this.activityId}`
      : `${this.apiUrl}/activities`;

    this.http.post(url, form).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(
          `Activity ${this.isEditMode ? 'updated' : 'saved'} successfully`,
          'Close',
          {
            duration: 3000
          }
        );
        this.router.navigate(['/sale/manage-activity']);
      },
      error: () => {
        this.isSubmitting = false;
        this.snackBar.open(
          `Failed to ${this.isEditMode ? 'update' : 'save'} activity`,
          'Close',
          {
            duration: 3000
          }
        );
      }
    });
  }
}
