import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiDatePickerComponent } from './multi-date-picker.component';

describe('MultiDatePickerComponent', () => {
  let component: MultiDatePickerComponent;
  let fixture: ComponentFixture<MultiDatePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiDatePickerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MultiDatePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
