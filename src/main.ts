import { mount } from 'svelte';
import App from './ui/App.svelte';
import './ui/global.css';
import { validateContent } from './content';

validateContent();

const target = document.getElementById('app');
if (!target) throw new Error('No #app element found');

mount(App, { target });
