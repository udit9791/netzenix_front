import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

interface TransportationItem {
  id: number;
  vehicleType: string;
  vehicleTypeName?: string;
  vehicleName: string;
  photos: string[];
  minOccupancy: number;
  maxOccupancy: number;
  singleAdultPrice?: number | null;
  singleChildPrice?: number | null;
  singlePersonPrice: number | null;
  maxOccupancyPrice: number | null;
  singlePrice: number | null;
  maxPrice: number | null;
  description: string;
  manufactureYear: number | null;
  serviceCharge?: number | null;
  rcBookFileName?: string;
  insuranceFileName?: string;
  is_active?: number;
}

interface VehicleTypeOption {
  id: string | number;
  name: string;
}

@Component({
  selector: 'vex-transportation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './transportation.component.html',
  styleUrls: ['./transportation.component.scss']
})
export class TransportationComponent implements OnInit {
  displayedColumns: string[] = [
    'photo',
    'vehicleType',
    'vehicleName',
    'minOccupancy',
    'maxOccupancy',
    'rcBook',
    'insurance',
    'manufactureYear',
    'serviceCharge',
    'actions'
  ];

  items: TransportationItem[] = [];
  form: FormGroup;
  editingItem: TransportationItem | null = null;
  isFormVisible = false;

  vehicleTypes: VehicleTypeOption[] = [];

  selectedPhotos: string[] = [];
  selectedPhotoFiles: File[] = [];
  selectedRcBookFileName = '';
  selectedRcBookFile: File | null = null;
  selectedInsuranceFileName = '';
  selectedInsuranceFile: File | null = null;

  adultAgeOptions: number[] = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  freeChildAgeOptions: number[] = [];

  private apiUrl = environment.apiUrl;
  imgUrl = environment.imgUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      vehicleType: ['', Validators.required],
      type: [''],
      vehicleName: ['', Validators.required],
      minOccupancy: [1, [Validators.required, Validators.min(1)]],
      maxOccupancy: [1, [Validators.required, Validators.min(1)]],
      adultAgeLimit: [12, [Validators.required, Validators.min(1)]],
      freeChildAge: [null, [Validators.min(0)]],
      singleAdultPrice: [null, [Validators.min(0)]],
      singleChildPrice: [null, [Validators.min(0)]],
      singlePersonPrice: [null, [Validators.min(0)]],
      maxOccupancyPrice: [null, [Validators.min(0)]],
      description: [''],
      manufactureYear: [null, [Validators.min(1900)]],
      serviceCharge: [null, [Validators.min(0)]]
    });

    const adultCtrl = this.form.get('adultAgeLimit');
    const initialAdult = Number(adultCtrl?.value || 0);
    this.updateFreeChildAgeOptions(initialAdult);
    adultCtrl?.valueChanges.subscribe((val) => {
      const num = Number(val || 0);
      this.updateFreeChildAgeOptions(num);
    });
  }

  ngOnInit(): void {
    this.loadVehicleTypes();
    this.loadTransportations();
  }

  private updateFreeChildAgeOptions(max: number): void {
    const limit = Number(max || 0);
    const ctrl = this.form.get('freeChildAge');
    if (!limit || limit < 1) {
      this.freeChildAgeOptions = [];
      ctrl?.setValue(null);
      return;
    }
    const list: number[] = [];
    for (let i = 1; i <= limit; i++) {
      list.push(i);
    }
    this.freeChildAgeOptions = list;
    const current = Number(ctrl?.value || 0);
    if (current && current > limit) {
      ctrl?.setValue(null);
    }
  }

  get isEditMode(): boolean {
    return !!this.editingItem;
  }

  openCreateForm(): void {
    this.editingItem = null;
    this.isFormVisible = true;
    this.selectedPhotos = [];
    this.selectedPhotoFiles = [];
    this.selectedRcBookFileName = '';
    this.selectedRcBookFile = null;
    this.selectedInsuranceFileName = '';
    this.selectedInsuranceFile = null;
    this.form.reset({
      vehicleType: '',
      type: '',
      vehicleName: '',
      minOccupancy: 1,
      maxOccupancy: 1,
      adultAgeLimit: 12,
      freeChildAge: null,
      singleAdultPrice: null,
      singleChildPrice: null,
      singlePersonPrice: null,
      maxOccupancyPrice: null,
      description: '',
      manufactureYear: null,
      serviceCharge: null
    });
  }

  openEditForm(item: TransportationItem): void {
    this.editingItem = item;
    this.isFormVisible = true;

    this.http.get<any>(`${this.apiUrl}/transportations/${item.id}`).subscribe({
      next: (res) => {
        const data = (res && (res.data || res)) || null;

        const vehicleType = String(
          data?.vehicle_type ?? item.vehicleType ?? ''
        );
        const vehicleTypeName =
          data?.vehicle_type_name ?? item.vehicleTypeName ?? vehicleType;

        this.selectedPhotos = Array.isArray(data?.photos)
          ? data.photos
          : item.photos || [];
        this.selectedPhotoFiles = [];
        this.selectedRcBookFileName =
          data?.rc_book_file_name ?? item.rcBookFileName ?? '';
        this.selectedRcBookFile = null;
        this.selectedInsuranceFileName =
          data?.insurance_file_name ?? item.insuranceFileName ?? '';
        this.selectedInsuranceFile = null;

        const singlePersonPrice =
          data?.price_per_person ??
          data?.single_price ??
          item.singlePersonPrice ??
          item.singlePrice ??
          null;
        const maxOccupancyPrice =
          data?.max_occupancy_price ??
          data?.max_price ??
          item.maxOccupancyPrice ??
          item.maxPrice ??
          null;
        const singlePrice = data?.single_price ?? item.singlePrice ?? null;
        const maxPrice = data?.max_price ?? item.maxPrice ?? null;

        const singleAdultPrice =
          data?.single_adult_price != null
            ? data.single_adult_price
            : singlePersonPrice;
        const singleChildPrice =
          data?.single_child_price != null
            ? data.single_child_price
            : item.singleChildPrice ?? null;

        const type = data?.type ?? '';
        const adultAgeLimit = data?.adult_age_limit ?? 12;
        const freeChildAge =
          type === 'SIC' && data?.free_child_age != null
            ? data.free_child_age
            : null;

        this.form.setValue({
          vehicleType,
          type,
          vehicleName: data?.vehicle_name ?? item.vehicleName,
          minOccupancy: data?.min_occupancy ?? item.minOccupancy,
          maxOccupancy: data?.max_occupancy ?? item.maxOccupancy,
          adultAgeLimit,
          freeChildAge,
          singleAdultPrice,
          singleChildPrice,
          singlePersonPrice,
          maxOccupancyPrice,
          description: data?.description ?? item.description,
          manufactureYear: data?.manufacture_year ?? item.manufactureYear,
          serviceCharge: data?.service_charge ?? item.serviceCharge ?? null
        });

        this.editingItem = {
          id: item.id,
          vehicleType,
          vehicleTypeName,
          vehicleName: data?.vehicle_name ?? item.vehicleName,
          photos: this.selectedPhotos,
          minOccupancy: Number(data?.min_occupancy ?? item.minOccupancy),
          maxOccupancy: Number(data?.max_occupancy ?? item.maxOccupancy),
          singleAdultPrice,
          singleChildPrice,
          singlePersonPrice,
          maxOccupancyPrice,
          singlePrice,
          maxPrice,
          description: data?.description ?? item.description,
          manufactureYear: data?.manufacture_year ?? item.manufactureYear,
          serviceCharge:
            data?.service_charge ?? item.serviceCharge ?? null,
          rcBookFileName: this.selectedRcBookFileName || undefined,
          insuranceFileName: this.selectedInsuranceFileName || undefined
        };
      },
      error: () => {
        this.selectedPhotos = item.photos || [];
        this.selectedPhotoFiles = [];
        this.selectedRcBookFileName = item.rcBookFileName || '';
        this.selectedRcBookFile = null;
        this.selectedInsuranceFileName = item.insuranceFileName || '';
        this.selectedInsuranceFile = null;
        this.form.setValue({
          vehicleType: item.vehicleType,
          type: '',
          vehicleName: item.vehicleName,
          minOccupancy: item.minOccupancy,
          maxOccupancy: item.maxOccupancy,
          adultAgeLimit: 12,
          freeChildAge: null,
          singleAdultPrice: item.singleAdultPrice ?? null,
          singleChildPrice: item.singleChildPrice ?? null,
          singlePersonPrice: item.singlePersonPrice,
          maxOccupancyPrice: item.maxOccupancyPrice,
          description: item.description,
          manufactureYear: item.manufactureYear,
          serviceCharge: item.serviceCharge ?? null
        });
      }
    });
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || !files.length) {
      this.selectedPhotos = [];
      this.selectedPhotoFiles = [];
      return;
    }
    const arr = Array.from(files);
    this.selectedPhotoFiles = arr;
    this.selectedPhotos = arr.map((f) => f.name);
  }

  onRcBookSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length) {
      this.selectedRcBookFile = files[0];
      this.selectedRcBookFileName = files[0].name;
    } else {
      this.selectedRcBookFile = null;
      this.selectedRcBookFileName = '';
    }
  }

  onInsuranceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length) {
      this.selectedInsuranceFile = files[0];
      this.selectedInsuranceFileName = files[0].name;
    } else {
      this.selectedInsuranceFile = null;
      this.selectedInsuranceFileName = '';
    }
  }

  cancelForm(): void {
    this.isFormVisible = false;
    this.editingItem = null;
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.value;
    const payload: any = {
      vehicle_type: value.vehicleType,
      type: value.type || null,
      vehicle_name: value.vehicleName,
      photos: this.selectedPhotos.slice(),
      min_occupancy: Number(value.minOccupancy),
      max_occupancy: Number(value.maxOccupancy),
      adult_age_limit:
        value.type === 'SIC' && value.adultAgeLimit
          ? Number(value.adultAgeLimit)
          : null,
      free_child_age:
        value.type === 'SIC' && value.freeChildAge
          ? Number(value.freeChildAge)
          : null,
      single_adult_price: value.singleAdultPrice
        ? Number(value.singleAdultPrice)
        : null,
      single_child_price: value.singleChildPrice
        ? Number(value.singleChildPrice)
        : null,
      price_per_person: value.singlePersonPrice
        ? Number(value.singlePersonPrice)
        : null,
      max_occupancy_price: value.maxOccupancyPrice
        ? Number(value.maxOccupancyPrice)
        : null,
      single_price: value.singlePersonPrice
        ? Number(value.singlePersonPrice)
        : null,
      max_price: value.maxOccupancyPrice
        ? Number(value.maxOccupancyPrice)
        : null,
      description: value.description || '',
      manufacture_year: value.manufactureYear
        ? Number(value.manufactureYear)
        : null,
      service_charge: value.serviceCharge ? Number(value.serviceCharge) : null,
      rc_book_file_name: this.selectedRcBookFileName || null,
      insurance_file_name: this.selectedInsuranceFileName || null
    };

    const formData = new FormData();
    formData.append('vehicle_type', String(payload.vehicle_type || ''));
    if (payload.type != null) {
      formData.append('type', String(payload.type));
    }
    formData.append('vehicle_name', String(payload.vehicle_name || ''));
    formData.append(
      'min_occupancy',
      payload.min_occupancy != null ? String(payload.min_occupancy) : '0'
    );
    formData.append(
      'max_occupancy',
      payload.max_occupancy != null ? String(payload.max_occupancy) : '0'
    );
    if (payload.adult_age_limit != null) {
      formData.append('adult_age_limit', String(payload.adult_age_limit));
    }
    if (payload.free_child_age != null) {
      formData.append('free_child_age', String(payload.free_child_age));
    }
    if (payload.price_per_person != null) {
      formData.append('price_per_person', String(payload.price_per_person));
    }
    if (payload.single_adult_price != null) {
      formData.append(
        'single_adult_price',
        String(payload.single_adult_price)
      );
    }
    if (payload.single_child_price != null) {
      formData.append(
        'single_child_price',
        String(payload.single_child_price)
      );
    }
    if (payload.max_occupancy_price != null) {
      formData.append(
        'max_occupancy_price',
        String(payload.max_occupancy_price)
      );
    }
    if (payload.single_price != null) {
      formData.append('single_price', String(payload.single_price));
    }
    if (payload.max_price != null) {
      formData.append('max_price', String(payload.max_price));
    }
    if (payload.description) {
      formData.append('description', String(payload.description));
    }
    if (payload.manufacture_year != null) {
      formData.append('manufacture_year', String(payload.manufacture_year));
    }
    if (payload.service_charge != null) {
      formData.append('service_charge', String(payload.service_charge));
    }
    if (this.selectedRcBookFile) {
      formData.append('rc_book_file', this.selectedRcBookFile);
    } else if (payload.rc_book_file_name) {
      formData.append('rc_book_file', String(payload.rc_book_file_name));
    }
    if (this.selectedInsuranceFile) {
      formData.append('insurance_file', this.selectedInsuranceFile);
    } else if (payload.insurance_file_name) {
      formData.append('insurance_file', String(payload.insurance_file_name));
    }

    if (this.selectedPhotoFiles.length) {
      this.selectedPhotoFiles.forEach((file) => {
        formData.append('photos[]', file);
      });
    } else if (Array.isArray(payload.photos)) {
      payload.photos.forEach((name: string) => {
        if (name) {
          formData.append('photos[]', name);
        }
      });
    }

    if (this.editingItem) {
      formData.append('_method', 'PUT');
      this.http
        .post<any>(
          `${this.apiUrl}/transportations/${this.editingItem.id}`,
          formData
        )
        .subscribe({
          next: (res) => {
            const data = (res && (res.data || res)) || null;
            const updated: TransportationItem = {
              id: this.editingItem ? this.editingItem.id : Date.now(),
              vehicleType: data?.vehicle_type ?? payload.vehicle_type,
              vehicleTypeName:
                data?.vehicle_type_name ??
                this.editingItem?.vehicleTypeName ??
                data?.vehicle_type ??
                payload.vehicle_type,
              vehicleName: data?.vehicle_name ?? payload.vehicle_name,
              photos: data?.photos ?? payload.photos,
              minOccupancy: data?.min_occupancy ?? payload.min_occupancy,
              maxOccupancy: data?.max_occupancy ?? payload.max_occupancy,
              singleAdultPrice:
                data?.single_adult_price ??
                payload.single_adult_price ??
                null,
              singleChildPrice:
                data?.single_child_price ??
                payload.single_child_price ??
                null,
              singlePersonPrice:
                data?.price_per_person ?? payload.price_per_person ?? null,
              maxOccupancyPrice:
                data?.max_occupancy_price ??
                payload.max_occupancy_price ??
                null,
              singlePrice: data?.single_price ?? null,
              maxPrice: data?.max_price ?? null,
              description: data?.description ?? payload.description,
              manufactureYear:
                data?.manufacture_year ?? payload.manufacture_year,
              serviceCharge:
                data?.service_charge ?? payload.service_charge ?? null,
              rcBookFileName:
                data?.rc_book_file_name ??
                (payload.rc_book_file_name || undefined),
              insuranceFileName:
                data?.insurance_file_name ??
                (payload.insurance_file_name || undefined)
            };
            const index = this.items.findIndex(
              (i) => i.id === this.editingItem?.id
            );
            if (index > -1) {
              this.items[index] = updated;
            }
            this.afterSave();
          }
        });
    } else {
      this.http
        .post<any>(`${this.apiUrl}/transportations`, formData)
        .subscribe({
          next: (res) => {
            const data = (res && (res.data || res)) || null;
            const id =
              (data && (data.id ?? data.transportation_id)) || Date.now();
            const created: TransportationItem = {
              id,
              vehicleType: data?.vehicle_type ?? payload.vehicle_type,
              vehicleTypeName:
                data?.vehicle_type_name ??
                data?.vehicle_type ??
                payload.vehicle_type,
              vehicleName: data?.vehicle_name ?? payload.vehicle_name,
              photos: data?.photos ?? payload.photos,
              minOccupancy: data?.min_occupancy ?? payload.min_occupancy,
              maxOccupancy: data?.max_occupancy ?? payload.max_occupancy,
              singleAdultPrice:
                data?.single_adult_price ??
                payload.single_adult_price ??
                null,
              singleChildPrice:
                data?.single_child_price ??
                payload.single_child_price ??
                null,
              singlePersonPrice:
                data?.price_per_person ?? payload.price_per_person ?? null,
              maxOccupancyPrice:
                data?.max_occupancy_price ??
                payload.max_occupancy_price ??
                null,
              singlePrice: data?.single_price ?? null,
              maxPrice: data?.max_price ?? null,
              description: data?.description ?? payload.description,
              manufactureYear:
                data?.manufacture_year ?? payload.manufacture_year,
              serviceCharge:
                data?.service_charge ?? payload.service_charge ?? null,
              rcBookFileName:
                data?.rc_book_file_name ??
                (payload.rc_book_file_name || undefined),
              insuranceFileName:
                data?.insurance_file_name ??
                (payload.insurance_file_name || undefined)
            };
            this.items = [...this.items, created];
            this.afterSave();
          }
        });
    }
  }

  private loadVehicleTypes(): void {
    this.http.get<any>(`${this.apiUrl}/vehicle-types`).subscribe({
      next: (res) => {
        const raw =
          Array.isArray(res?.data) || Array.isArray(res)
            ? Array.isArray(res?.data)
              ? res.data
              : res
            : [];
        const list = Array.isArray(raw) ? raw : [];
        const result: VehicleTypeOption[] = [];
        list.forEach((v: any) => {
          if (typeof v === 'string' || typeof v === 'number') {
            const id = String(v);
            result.push({ id, name: String(v) });
            return;
          }
          const id = v?.id ?? v?.value ?? v?.code ?? v?.slug ?? v?.name ?? null;
          if (!id) {
            return;
          }
          const name = v?.name ?? v?.label ?? String(id ?? '');
          result.push({ id: String(id), name });
        });
        this.vehicleTypes = result;
      },
      error: () => {
        this.vehicleTypes = [];
      }
    });
  }

  private loadTransportations(): void {
    this.http.get<any>(`${this.apiUrl}/transportations`).subscribe({
      next: (res) => {
        const raw =
          Array.isArray(res?.data) || Array.isArray(res)
            ? Array.isArray(res?.data)
              ? res.data
              : res
            : [];
        const list = Array.isArray(raw) ? raw : [];
        this.items = list.map((t: any) => {
          const id =
            t?.id ?? t?.transportation_id ?? t?.vehicle_id ?? Date.now();
          return {
            id,
            vehicleType: t?.vehicle_type ?? t?.vehicleType ?? '',
            vehicleTypeName:
              t?.vehicle_type_name ??
              t?.vehicleTypeName ??
              t?.vehicle_type ??
              t?.vehicleType ??
              '',
            vehicleName: t?.vehicle_name ?? t?.vehicleName ?? '',
            photos: Array.isArray(t?.photos) ? t.photos : [],
            minOccupancy: Number(t?.min_occupancy ?? t?.minOccupancy ?? 0),
            maxOccupancy: Number(t?.max_occupancy ?? t?.maxOccupancy ?? 0),
            singleAdultPrice:
              t?.single_adult_price ??
              t?.singleAdultPrice ??
              t?.single_price ??
              null,
            singleChildPrice:
              t?.single_child_price ?? t?.singleChildPrice ?? null,
            singlePersonPrice:
              t?.price_per_person ??
              t?.single_price ??
              t?.singlePersonPrice ??
              null,
            maxOccupancyPrice:
              t?.max_occupancy_price ??
              t?.max_price ??
              t?.maxOccupancyPrice ??
              null,
            singlePrice: t?.single_price ?? t?.singlePrice ?? null,
            maxPrice: t?.max_price ?? t?.maxPrice ?? null,
            description: t?.description ?? '',
            manufactureYear: t?.manufacture_year ?? t?.manufactureYear ?? null,
            serviceCharge: t?.service_charge ?? t?.serviceCharge ?? null,
            rcBookFileName:
              t?.rc_book_file ?? t?.rc_book_file_name ?? t?.rcBookFileName,
            insuranceFileName:
              t?.insurance_file ??
              t?.insurance_file_name ??
              t?.insuranceFileName,
            is_active: typeof t?.is_active === 'number' ? t.is_active : 1
          } as TransportationItem;
        });
      },
      error: () => {
        this.items = [];
      }
    });
  }

  private afterSave(): void {
    this.loadTransportations();
    this.isFormVisible = false;
    this.editingItem = null;
  }

  toggleStatus(row: TransportationItem): void {
    const id = Number(row.id || 0) || 0;
    if (!id) {
      return;
    }
    const next = row.is_active === 1 ? 0 : 1;
    this.http
      .patch<any>(`${this.apiUrl}/transportations/${id}/toggle-status`, {
        is_active: next === 1
      })
      .subscribe({
        next: (res) => {
          const data = (res && (res.data || res)) || null;
          const newStatus =
            typeof data?.is_active === 'number' ? data.is_active : next;
          this.items = this.items.map((it) =>
            it.id === id ? { ...it, is_active: newStatus } : it
          );
        }
      });
  }
}
