import React from 'react';

/**
 * Renders an icon prop, which can be:
 * - A React element (already rendered): returned as-is
 * - A component reference (function or forwardRef): rendered with props
 * - null/undefined: returns null
 * - Invalid type: dev warning and null
 */
export function renderIcon(icon, props = { size: 18 }) {
  if (!icon) return null;

  if (React.isValidElement(icon)) {
    // Already a rendered element, render as-is
    return icon;
  }

  // Component reference: function or forwardRef object (has $$typeof)
  if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && icon.$$typeof)) {
    return React.createElement(icon, props);
  }

  // Development warning for unsupported icon type
  if (import.meta.env.DEV) {
    console.warn('renderIcon: icon prop must be a React component or element, received:', typeof icon, icon);
  }

  return null;
}
