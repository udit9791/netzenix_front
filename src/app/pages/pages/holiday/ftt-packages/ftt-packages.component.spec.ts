import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FttPackagesComponent } from './ftt-packages.component';

describe('FttPackagesComponent', () => {
  let component: FttPackagesComponent;
  let fixture: ComponentFixture<FttPackagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FttPackagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FttPackagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
