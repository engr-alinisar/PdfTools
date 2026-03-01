import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tool } from '../../models/tool.model';

@Component({
  selector: 'app-tool-card',
  imports: [RouterLink],
  templateUrl: './tool-card.html',
})
export class ToolCardComponent {
  tool = input.required<Tool>();
}
