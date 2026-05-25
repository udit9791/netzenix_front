import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
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
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { MultiDatePickerComponent } from 'src/app/shared/multi-date-picker/multi-date-picker.component';
import { UserService } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';

type InclusionItem = { text: string };
type FaqItem = { question: string; answer: string };

@Component({
  selector: 'vex-manage-activity',
  standalone: true,
  templateUrl: './manage-activity.component.html',
  styleUrls: ['./manage-activity.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
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
    MatStepperModule,
    MatRadioModule,
    MatTooltipModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    MatSnackBarModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MultiDatePickerComponent
  ]
})
export class ManageActivityComponent implements OnInit {
  basicsForm!: FormGroup;
  contentForm!: FormGroup;
  availabilityForm!: FormGroup;

  countries: any[] = [];
  states: any[] = [];
  cities: any[] = [];

  countryFilter = '';
  stateFilter = '';
  cityFilter = '';

  get filteredCountries(): any[] {
    const q = this.countryFilter.trim().toLowerCase();
    return q ? this.countries.filter(c => (c.name || '').toLowerCase().includes(q)) : this.countries;
  }
  get filteredStates(): any[] {
    const q = this.stateFilter.trim().toLowerCase();
    return q ? this.states.filter(s => (s.name || '').toLowerCase().includes(q)) : this.states;
  }
  get filteredCities(): any[] {
    const q = this.cityFilter.trim().toLowerCase();
    return q ? this.cities.filter(c => (c.name || '').toLowerCase().includes(q)) : this.cities;
  }

  minDate: Date = new Date();
  timeOptions: string[] = [];

  isSubmitting = false;
  isEditMode = false;
  activityId: number | null = null;

  imgBaseUrl: string = environment.imgUrl;
  private apiUrl = environment.apiUrl;

  currentCoverImagePath: string | null = null;
  coverPreviewUrl: string | null = null;
  existingImages: any[] = [];
  removedImageIds: number[] = [];
  galleryPreviews: { url: string }[] = [];
  newGalleryFiles: File[] = [];
  coverImageFile: File | null = null;

  newInclusion = '';
  newExclusion = '';

  voucherTypes = [
    { value: 'mobile', label: 'Mobile voucher' },
    { value: 'printed', label: 'Printed voucher' },
    { value: 'both', label: 'Mobile or printed' }
  ];

  confirmationTypes = [
    { value: 'instant', label: 'Instant confirmation' },
    { value: 'request', label: 'On request' }
  ];

  cancellationTypes = [
    { value: 'free', label: 'Free cancellation' },
    { value: 'non_refundable', label: 'Non-refundable' },
    { value: 'conditional', label: 'Conditional refund' }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.minDate.setHours(0, 0, 0, 0);
    this.timeOptions = this.buildTimeOptions();

    this.basicsForm = this.fb.group({
      country_id: [null, Validators.required],
      state_id: [{ value: null, disabled: true }, Validators.required],
      city_id: [{ value: null, disabled: true }, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      short_description: [''],
      description: [''],
      good_to_know: [''],
      meeting_point: [''],
      duration_minutes: [null, [Validators.min(0)]],
      language: ['English'],
      voucher_type: ['mobile'],
      confirmation_type: ['instant'],
      cancellation_policy_type: ['non_refundable'],
      cancellation_policy_text: [''],
      lead_time_hours: [0, [Validators.min(0)]],
      cutoff_hours: [0, [Validators.min(0)]],
      markup_type: [null],
      markup_value: [null, [Validators.min(0)]]
    });

    this.contentForm = this.fb.group({
      inclusions: this.fb.array([]),
      exclusions: this.fb.array([]),
      faqs: this.fb.array([]),
      isRefundable: ['non-refundable'],
      refund_rules: this.fb.array([])
    });

    this.availabilityForm = this.fb.group({
      has_time_slot: [false],
      allow_child: [false],
      max_adults: [1, [Validators.required, Validators.min(1)]],
      max_children: [{ value: 0, disabled: true }],
      child_min_age: [{ value: null, disabled: true }],
      child_max_age: [{ value: null, disabled: true }],
      has_transportation: [false],
      transportation_description: [{ value: '', disabled: true }],
      dates: this.fb.array([]),
      rangeStart: [null],
      rangeEnd: [null]
    });

    this.availabilityForm
      .get('allow_child')
      ?.valueChanges.subscribe((val: boolean) => {
        ['max_children', 'child_min_age', 'child_max_age'].forEach((k) => {
          const ctrl = this.availabilityForm.get(k);
          if (!ctrl) return;
          if (val) {
            ctrl.enable();
          } else {
            ctrl.disable();
            if (k === 'max_children') ctrl.setValue(0);
            else ctrl.setValue(null);
          }
        });
      });

    this.availabilityForm
      .get('has_transportation')
      ?.valueChanges.subscribe((val: boolean) => {
        const ctrl = this.availabilityForm.get('transportation_description');
        if (!ctrl) return;
        if (val) ctrl.enable();
        else {
          ctrl.disable();
          ctrl.setValue('');
        }
      });

    this.availabilityForm
      .get('has_time_slot')
      ?.valueChanges.subscribe(() => {
        if (!this.isEditMode) this.resetDates();
      });

    this.basicsForm
      .get('country_id')
      ?.valueChanges.subscribe((id: number) => this.onCountryChange(id));
    this.basicsForm
      .get('state_id')
      ?.valueChanges.subscribe((id: number) => this.onStateChange(id));

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

  /* ---------- accessors ---------- */
  get dates(): FormArray {
    return this.availabilityForm.get('dates') as FormArray;
  }
  get inclusions(): FormArray {
    return this.contentForm.get('inclusions') as FormArray;
  }
  get exclusions(): FormArray {
    return this.contentForm.get('exclusions') as FormArray;
  }
  get faqs(): FormArray {
    return this.contentForm.get('faqs') as FormArray;
  }
  get refundRules(): FormArray {
    return this.contentForm.get('refund_rules') as FormArray;
  }
  isRefundable(): boolean {
    return this.contentForm.get('isRefundable')?.value === 'refundable';
  }
  addRefundRule(): void {
    this.refundRules.push(
      this.fb.group({
        days_before_checkin: [null, [Validators.required, Validators.min(1)]],
        percentage: [
          null,
          [Validators.required, Validators.min(0), Validators.max(100)]
        ]
      })
    );
  }
  removeRefundRule(i: number): void {
    this.refundRules.removeAt(i);
  }

  hasTimeSlot(): boolean {
    return !!this.availabilityForm.get('has_time_slot')?.value;
  }

  /* ---------- inclusions / exclusions / FAQs ---------- */
  addInclusion(text: string): void {
    const v = (text || '').trim();
    if (!v) return;
    this.inclusions.push(this.fb.group({ text: [v, Validators.required] }));
    this.newInclusion = '';
  }
  removeInclusion(i: number): void {
    this.inclusions.removeAt(i);
  }
  addExclusion(text: string): void {
    const v = (text || '').trim();
    if (!v) return;
    this.exclusions.push(this.fb.group({ text: [v, Validators.required] }));
    this.newExclusion = '';
  }
  removeExclusion(i: number): void {
    this.exclusions.removeAt(i);
  }
  addFaq(): void {
    this.faqs.push(
      this.fb.group({
        question: ['', Validators.required],
        answer: ['', Validators.required]
      })
    );
  }
  removeFaq(i: number): void {
    this.faqs.removeAt(i);
  }

  /* ---------- date / slot groups ---------- */
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
      if (!start || !endCtrl) return;
      const minEnd = this.addMinutesToTime(start, 5);
      const currentEnd = endCtrl.value as string | null;
      if (currentEnd && this.compareTimes(currentEnd, minEnd) < 0) {
        endCtrl.setValue(null);
      }
    });
    return group;
  }

  getSlots(dateIndex: number): FormArray {
    return this.dates.at(dateIndex).get('slots') as FormArray;
  }

  addDate(): void {
    this.dates.push(this.createDateGroup());
  }
  removeDate(index: number): void {
    if (this.dates.length > 1) this.dates.removeAt(index);
  }
  addSlot(dateIndex: number): void {
    const slots = this.getSlots(dateIndex);
    const group = this.createSlotGroup();
    if (slots.length > 0) {
      const prev = slots.at(slots.length - 1) as FormGroup;
      const prevEnd = prev.get('end_time')?.value as string | null;
      if (prevEnd) group.patchValue({ start_time: prevEnd });
    }
    slots.push(group);
  }
  removeSlot(dateIndex: number, slotIndex: number): void {
    this.getSlots(dateIndex).removeAt(slotIndex);
  }

  getEndTimeOptions(dateIndex: number, slotIndex: number): string[] {
    const slots = this.getSlots(dateIndex);
    const slot = slots.at(slotIndex) as FormGroup;
    const start = slot.get('start_time')?.value as string | null;
    if (!start) return this.timeOptions;
    const minEnd = this.addMinutesToTime(start, 5);
    return this.timeOptions.filter((t) => this.compareTimes(t, minEnd) >= 0);
  }

  resetDates(): void {
    while (this.dates.length > 0) this.dates.removeAt(0);
    this.addDate();
  }

  onMultiDatesChange(dates: Date[]): void {
    this.setDatesFromList(dates);
  }

  onRangeChange(): void {
    const start = this.availabilityForm.get('rangeStart')?.value as Date | null;
    const end = this.availabilityForm.get('rangeEnd')?.value as Date | null;
    if (!start || !end) return;
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
      const existing = this.dates.controls
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
        if (nd >= this.minDate && !existing.includes(nd.getTime())) {
          const g = this.createDateGroup();
          g.patchValue({ date: nd });
          this.dates.push(g);
        }
      });
      return;
    }
    while (this.dates.length > 0) this.dates.removeAt(0);
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
      const g = this.createDateGroup();
      g.patchValue({ date: d });
      this.dates.push(g);
    });
  }

  private buildTimeOptions(): string[] {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        options.push(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        );
      }
    }
    return options;
  }

  private timeToMinutes(time: string): number {
    const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
    return hh * 60 + mm;
  }
  private minutesToTime(total: number): string {
    const hh = Math.floor(total / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  private addMinutesToTime(time: string, minutes: number): string {
    return this.minutesToTime(this.timeToMinutes(time) + minutes);
  }
  private compareTimes(a: string, b: string): number {
    return this.timeToMinutes(a) - this.timeToMinutes(b);
  }

  applyPricesToAllDates(): void {
    if (!this.dates.length) return;
    const first = this.dates.at(0) as FormGroup;
    const adult = first.get('adult_price')?.value;
    const child = first.get('child_price')?.value;
    for (let i = 1; i < this.dates.length; i++) {
      (this.dates.at(i) as FormGroup).patchValue({
        adult_price: adult,
        child_price: child
      });
    }
  }
  applySlotsToAllDates(): void {
    if (!this.dates.length) return;
    const firstDate = this.dates.at(0) as FormGroup;
    const firstSlots = firstDate.get('slots') as FormArray | null;
    if (!firstSlots || !firstSlots.length) return;
    for (let i = 1; i < this.dates.length; i++) {
      const target = this.getSlots(i);
      while (target.length > 0) target.removeAt(0);
      for (let j = 0; j < firstSlots.length; j++) {
        const src = firstSlots.at(j) as FormGroup;
        const clone = this.createSlotGroup();
        clone.patchValue(src.getRawValue());
        target.push(clone);
      }
    }
  }

  /* ---------- location ---------- */
  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (res: any) => {
        this.countries = Array.isArray(res) ? res : res?.data ? res.data : [];
      },
      error: () => (this.countries = [])
    });
  }

  onCountryChange(countryId: number): void {
    this.states = [];
    this.cities = [];
    this.basicsForm.patchValue({ state_id: null, city_id: null });
    const stateCtrl = this.basicsForm.get('state_id');
    const cityCtrl = this.basicsForm.get('city_id');
    stateCtrl?.enable();
    cityCtrl?.disable();
    if (countryId) {
      this.userService.getStatesByCountry(countryId).subscribe({
        next: (res: any) => {
          this.states = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => (this.states = [])
      });
    }
  }

  onStateChange(stateId: number): void {
    this.cities = [];
    this.basicsForm.patchValue({ city_id: null });
    const cityCtrl = this.basicsForm.get('city_id');
    if (stateId) {
      cityCtrl?.enable();
      this.userService.getCitiesByState(stateId).subscribe({
        next: (res: any) => {
          this.cities = Array.isArray(res) ? res : res?.data ? res.data : [];
        },
        error: () => (this.cities = [])
      });
    } else {
      cityCtrl?.disable();
    }
  }

  /* ---------- images ---------- */
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
    this.coverImageFile = file;
  }
  onImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.galleryPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    this.newGalleryFiles = files;
    this.galleryPreviews = files.map((f) => ({
      url: URL.createObjectURL(f)
    }));
  }
  removeExistingImage(image: any): void {
    const id = image?.id ? Number(image.id) : null;
    if (id && !this.removedImageIds.includes(id)) {
      this.removedImageIds.push(id);
    }
    this.existingImages = this.existingImages.filter((img) => img.id !== id);
  }
  removeNewImage(index: number): void {
    if (index < 0 || index >= this.newGalleryFiles.length) return;
    URL.revokeObjectURL(this.galleryPreviews[index].url);
    this.galleryPreviews.splice(index, 1);
    this.newGalleryFiles.splice(index, 1);
  }

  /* ---------- load existing ---------- */
  loadActivity(id: number): void {
    this.http.get(`${this.apiUrl}/activities/${id}`).subscribe({
      next: (res: any) => {
        if (!res?.success) return;
        const data = res.data;
        const a = data.activity;

        this.basicsForm.patchValue({
          country_id: a.country_id,
          title: a.title,
          short_description: a.short_description,
          description: a.description,
          good_to_know: a.good_to_know,
          meeting_point: a.meeting_point,
          duration_minutes: a.duration_minutes,
          language: a.language || 'English',
          voucher_type: a.voucher_type || 'mobile',
          confirmation_type: a.confirmation_type || 'instant',
          cancellation_policy_type: a.cancellation_policy_type || 'non_refundable',
          cancellation_policy_text: a.cancellation_policy_text,
          lead_time_hours: a.lead_time_hours || 0,
          cutoff_hours: a.cutoff_hours || 0,
          markup_type: a.markup_type || null,
          markup_value: a.markup_value != null ? Number(a.markup_value) : null
        });

        // Refund policy + rules: 'non_refundable' policy → 'non-refundable' radio.
        const isRef =
          (a.cancellation_policy_type || 'non_refundable') !== 'non_refundable';
        this.contentForm.patchValue({
          isRefundable: isRef ? 'refundable' : 'non-refundable'
        });
        (data.refund_rules || []).forEach((r: any) =>
          this.refundRules.push(
            this.fb.group({
              days_before_checkin: [
                r.days_before_checkin,
                [Validators.required, Validators.min(1)]
              ],
              percentage: [
                r.percentage,
                [Validators.required, Validators.min(0), Validators.max(100)]
              ]
            })
          )
        );

        this.availabilityForm.patchValue({
          has_time_slot: !!a.has_time_slot,
          allow_child: !!a.allow_child,
          max_adults: a.max_adults || 1,
          max_children: a.max_children || 0,
          child_min_age: a.child_min_age,
          child_max_age: a.child_max_age,
          has_transportation: !!a.has_transportation,
          transportation_description: a.transportation_description
        });

        this.currentCoverImagePath = a.cover_image || null;
        this.existingImages = Array.isArray(data.images) ? data.images : [];

        // inclusions / exclusions / faqs
        (data.inclusions || []).forEach((it: any) =>
          this.inclusions.push(this.fb.group({ text: [it.text] }))
        );
        (data.exclusions || []).forEach((it: any) =>
          this.exclusions.push(this.fb.group({ text: [it.text] }))
        );
        (data.faqs || []).forEach((f: any) =>
          this.faqs.push(
            this.fb.group({
              question: [f.question, Validators.required],
              answer: [f.answer, Validators.required]
            })
          )
        );

        // location chain
        this.userService.getStatesByCountry(a.country_id).subscribe((s: any) => {
          this.states = Array.isArray(s) ? s : s?.data ?? [];
          this.basicsForm.get('state_id')?.enable();
          this.basicsForm.patchValue({ state_id: a.state_id });
          this.userService.getCitiesByState(a.state_id).subscribe((c: any) => {
            this.cities = Array.isArray(c) ? c : c?.data ?? [];
            this.basicsForm.get('city_id')?.enable();
            this.basicsForm.patchValue({ city_id: a.city_id });
          });
        });

        while (this.dates.length) this.dates.removeAt(0);
        (data.dates || []).forEach((d: any) => {
          const group = this.createDateGroup();
          group.patchValue({
            id: d.id,
            date: new Date(d.activity_date),
            adult_price: d.pricing?.adult_price,
            child_price: d.pricing?.child_price
          });
          const slotsArr = group.get('slots') as FormArray;
          (d.time_slots || []).forEach((s: any) => {
            const sg = this.createSlotGroup();
            sg.patchValue({
              id: s.id,
              start_time: (s.start_time || '').substring(0, 5),
              end_time: (s.end_time || '').substring(0, 5),
              max_capacity: s.max_capacity,
              adult_price: s.pricing?.adult_price,
              child_price: s.pricing?.child_price
            });
            slotsArr.push(sg);
          });
          this.dates.push(group);
        });
      },
      error: () => {
        this.snackBar.open('Failed to load activity details', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/sale/manage-activity']);
      }
    });
  }

  /* ---------- submit ---------- */
  submit(): void {
    if (this.basicsForm.invalid || this.availabilityForm.invalid) {
      this.basicsForm.markAllAsTouched();
      this.availabilityForm.markAllAsTouched();
      this.contentForm.markAllAsTouched();
      return;
    }

    const basics = this.basicsForm.getRawValue();
    const content = this.contentForm.getRawValue();
    const avail = this.availabilityForm.getRawValue();
    const hasTimeSlot = !!avail.has_time_slot;

    const datesPayload = (avail.dates as any[]).map((d: any) => {
      const dv = d?.date ? new Date(d.date) : null;
      let dateStr: string | null = null;
      if (dv && !isNaN(dv.getTime())) {
        const y = dv.getFullYear();
        const m = (dv.getMonth() + 1).toString().padStart(2, '0');
        const da = dv.getDate().toString().padStart(2, '0');
        dateStr = `${y}-${m}-${da}`;
      }
      const datePricing = !hasTimeSlot
        ? {
            adult_price: d?.adult_price != null ? Number(d.adult_price) : null,
            child_price: d?.child_price != null ? Number(d.child_price) : null
          }
        : null;
      const slotsRaw = Array.isArray(d?.slots) ? d.slots : [];
      const timeSlots = hasTimeSlot
        ? slotsRaw.map((s: any) => ({
            id: s?.id || null,
            start_time: s?.start_time || null,
            end_time: s?.end_time || null,
            max_capacity: s?.max_capacity != null ? Number(s.max_capacity) : null,
            pricing: {
              adult_price: s?.adult_price != null ? Number(s.adult_price) : null,
              child_price: s?.child_price != null ? Number(s.child_price) : null
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

    const payload: any = {
      id: this.activityId,
      country_id: basics.country_id,
      state_id: basics.state_id,
      city_id: basics.city_id,
      title: basics.title,
      short_description: basics.short_description || null,
      description: basics.description || null,
      good_to_know: basics.good_to_know || null,
      meeting_point: basics.meeting_point || null,
      duration_minutes: basics.duration_minutes != null ? Number(basics.duration_minutes) : null,
      language: basics.language || null,
      voucher_type: basics.voucher_type || 'mobile',
      confirmation_type: basics.confirmation_type || 'instant',
      cancellation_policy_text: basics.cancellation_policy_text || null,
      lead_time_hours: Number(basics.lead_time_hours || 0),
      cutoff_hours: Number(basics.cutoff_hours || 0),
      has_time_slot: hasTimeSlot ? 1 : 0,
      allow_child: avail.allow_child ? 1 : 0,
      max_adults: avail.max_adults != null ? Number(avail.max_adults) : null,
      max_children: avail.max_children != null ? Number(avail.max_children) : 0,
      child_min_age: avail.child_min_age != null ? Number(avail.child_min_age) : null,
      child_max_age: avail.child_max_age != null ? Number(avail.child_max_age) : null,
      has_transportation: avail.has_transportation ? 1 : 0,
      transportation_description: avail.transportation_description || null,
      dates: datesPayload,
      inclusions: (content.inclusions || []).map((x: InclusionItem) => x.text),
      exclusions: (content.exclusions || []).map((x: InclusionItem) => x.text),
      faqs: (content.faqs || []) as FaqItem[],
      markup_type: basics.markup_type || null,
      markup_value:
        basics.markup_value != null && basics.markup_value !== ''
          ? Number(basics.markup_value)
          : null,
      // Refund rules only when supplier marked the activity refundable.
      refund_rules:
        content.isRefundable === 'refundable'
          ? (content.refund_rules || []).map((r: any) => ({
              days_before_checkin:
                r?.days_before_checkin != null ? Number(r.days_before_checkin) : null,
              percentage: r?.percentage != null ? Number(r.percentage) : null
            }))
          : [],
      // Sync cancellation policy type with the radio so the rest of the app stays consistent.
      cancellation_policy_type:
        content.isRefundable === 'refundable'
          ? basics.cancellation_policy_type === 'non_refundable'
            ? 'conditional'
            : basics.cancellation_policy_type
          : 'non_refundable',
      removed_image_ids: this.removedImageIds
    };

    const form = new FormData();
    form.append('activity', JSON.stringify(payload));
    if (this.coverImageFile) form.append('cover_image', this.coverImageFile);
    this.newGalleryFiles.forEach((f) => form.append('images[]', f));

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
          { duration: 3000 }
        );
        this.router.navigate(['/sale/manage-activity']);
      },
      error: () => {
        this.isSubmitting = false;
        this.snackBar.open(
          `Failed to ${this.isEditMode ? 'update' : 'save'} activity`,
          'Close',
          { duration: 3000 }
        );
      }
    });
  }
}
