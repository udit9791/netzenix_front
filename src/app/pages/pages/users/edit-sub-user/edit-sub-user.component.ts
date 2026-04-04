import { Component } from '@angular/core';
import { EditUserComponent } from '../edit-user/edit-user.component';

@Component({
  selector: 'app-edit-sub-user',
  standalone: true,
  imports: [EditUserComponent],
  template: `
    <vex-edit-user></vex-edit-user>
  `
})
export class EditSubUserComponent {}

