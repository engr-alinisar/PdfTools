import { Component } from '@angular/core';
import { ToolCardComponent } from '../../components/tool-card/tool-card';
import { Tool } from '../../models/tool.model';

const TOOLS: Tool[] = [
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document in seconds.',
    icon: '🔀',
    color: '#e63946',
    bgColor: '#ffeaea',
    route: '/merge',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages or ranges from your PDF file.',
    icon: '✂️',
    color: '#4361ee',
    bgColor: '#eaedff',
    route: '/split',
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate all or selected pages in your PDF to any angle.',
    icon: '🔄',
    color: '#7209b7',
    bgColor: '#f5eaff',
    route: '/rotate',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce your PDF file size while preserving document quality.',
    icon: '🗜️',
    color: '#f4a261',
    bgColor: '#fff4ea',
    route: '/compress',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'Add your signature to any page or position in your PDF.',
    icon: '✍️',
    color: '#4361ee',
    bgColor: '#eaedff',
    route: '/sign',
  },
  {
    id: 'info',
    title: 'PDF Info',
    description: 'View metadata, page count, and details about your PDF.',
    icon: 'ℹ️',
    color: '#2a9d8f',
    bgColor: '#eafaf8',
    route: '/info',
  },
];

@Component({
  selector: 'app-home',
  imports: [ToolCardComponent],
  templateUrl: './home.html',
})
export class HomeComponent {
  readonly tools: Tool[] = TOOLS;
}
