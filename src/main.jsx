/**
 * main.jsx
 * Entry point - just mounts the App component to the DOM
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}
