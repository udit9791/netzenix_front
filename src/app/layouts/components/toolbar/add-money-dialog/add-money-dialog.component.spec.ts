import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMoneyDialogComponent } from './add-money-dialog.component';

describe('AddMoneyDialogComponent', () => {
  let component: AddMoneyDialogComponent;
  let fixture: ComponentFixture<AddMoneyDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMoneyDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMoneyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
