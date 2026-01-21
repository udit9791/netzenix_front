import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageFlightSeriesComponent } from './manage-flight-series.component';

describe('ManageFlightSeriesComponent', () => {
  let component: ManageFlightSeriesComponent;
  let fixture: ComponentFixture<ManageFlightSeriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageFlightSeriesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageFlightSeriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
