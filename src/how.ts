import './app.css';
import { mount } from 'svelte';
import How from './how/How.svelte';

mount(How, { target: document.getElementById('app')! });
