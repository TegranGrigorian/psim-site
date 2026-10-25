import './app.css';
import { mount } from 'svelte';
import Docs from './docs/Docs.svelte';

mount(Docs, { target: document.getElementById('app')! });
