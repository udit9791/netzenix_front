import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #020617;
        color: #e5e7eb;
        text-align: center;
        padding: 24px;
      "
    >
      <div>
        <h1
          style="
            font-size: 40px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #f9fafb;
          "
        >
          We're Coming Soon
        </h1>
        <p style="max-width: 640px; margin: 0 auto; font-size: 16px;">
          Our website is currently under maintenance. We're working hard to
          launch a better experience for you. Please check back shortly.
        </p>
      </div>
    </div>
  `
})
export class MaintenanceComponent {}

