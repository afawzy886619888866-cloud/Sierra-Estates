# Sierra Estates Theme System

## Overview

The theme system provides seamless light/dark mode support across the entire application. **Light theme is the default**, with dark theme available as an optional toggle.

### Key Features

- **Light theme by default** - Professional, clean appearance for public-facing site
- **Dark theme optional** - Elegant alternative for users who prefer it
- **Persistent preference** - Theme choice saved to localStorage
- **System preference fallback** - Respects OS dark mode preference if no stored choice
- **Smooth transitions** - 300ms transitions when switching themes
- **RTL compatible** - Full support for Arabic (RTL) layouts
- **WCAG AA compliant** - Contrast ratios meet accessibility standards

## Architecture

### Files

```
lib/
  └── ThemeContext.tsx          # Theme provider & hook
app/
  ├── globals-theme.css         # Theme variables (light & dark)
  ├── layout.tsx                # Root layout (imports theme CSS)
  ├── providers.tsx             # Providers wrapper
  └── admin/
      ├── layout.tsx            # Admin layout with theme toggle
      └── components/
          └── ThemeToggle.tsx    # Theme toggle button component
```

### CSS Variables

All colors use CSS variables defined in `app/globals-theme.css`:

#### Light Theme (`:root`)

- **Backgrounds**: `#ffffff`, `#f8fafc`, `#f1f5f9`
- **Text**: `#0f172a`, `#1e293b`, `#475569`
- **Primary**: `#2563eb` (blue)
- **Secondary**: `#0f766e` (teal)
- **Accent**: `#dc2626` (red)

#### Dark Theme (`[data-theme="dark"]`)

- **Backgrounds**: `#0f172a`, `#1a202c`, `#1e293b`
- **Text**: `#f1f5f9`, `#e2e8f0`, `#cbd5e1`
- **Primary**: `#3b82f6` (bright blue)
- **Secondary**: `#14b8a6` (bright teal)
- **Accent**: `#fbbf24` (gold/amber)

## Usage

### In Components

```tsx
import { useTheme } from '@/lib/ThemeContext';

export function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
    </div>
  );
}
```

### With Tailwind CSS

Use CSS variables with Tailwind's `var()` syntax:

```tsx
// Using CSS variables
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
  Content that respects theme
</div>

// Or use theme-aware utility classes
<div className="bg-primary text-primary">
  Content with theme variables
</div>
```

### With Inline Styles

```tsx
<div style={{
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
}}>
  Content
</div>
```

## Theme Toggle Component

The `ThemeToggle` component provides a button to switch themes:

```tsx
import { ThemeToggle } from '@/app/admin/components/ThemeToggle';

export function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}
```

### Features

- **Light icon** (Sun) shows when dark theme is available
- **Dark icon** (Moon) shows when light theme is available
- **Accessible** - Proper ARIA labels and keyboard support
- **Responsive** - Works on mobile and desktop
- **Styled** - Uses theme variables for consistent appearance

## Storage & Persistence

Theme preference is stored in localStorage under key: `sierra-estates-theme`

### Detection Order

1. Check localStorage for saved preference
2. If none, check system preference (prefers-color-scheme)
3. Fall back to light theme

### Clearing Preference

```tsx
localStorage.removeItem('sierra-estates-theme');
```

## CSS Variables Reference

### Background Colors

```css
--bg-primary          /* Main background */
--bg-secondary        /* Secondary background */
--bg-tertiary         /* Tertiary background */
--bg-surface          /* Surface/card background */
--bg-surface-hover    /* Hover state */
--bg-elevation-1      /* Elevated elements */
--bg-input            /* Form input background */
--bg-disabled         /* Disabled state */
```

### Text Colors

```css
--text-primary        /* Primary text */
--text-secondary      /* Secondary text */
--text-tertiary       /* Tertiary text */
--text-muted          /* Muted/faded text */
--text-disabled       /* Disabled text */
--text-on-primary     /* Text on primary background */
--text-on-secondary   /* Text on secondary background */
--text-on-accent      /* Text on accent background */
```

### Semantic Colors

```css
--color-primary       /* Primary action color */
--color-secondary     /* Secondary action color */
--color-accent        /* Accent highlights */
--color-success       /* Success state */
--color-warning       /* Warning state */
--color-error         /* Error state */
```

### Border Colors

```css
--border-default      /* Default border */
--border-light        /* Light border */
--border-subtle       /* Subtle border */
--border-focus        /* Focus state */
--border-error        /* Error border */
--border-success      /* Success border */
```

### Shadows

```css
--shadow-xs           /* Extra small shadow */
--shadow-sm           /* Small shadow */
--shadow-md           /* Medium shadow */
--shadow-lg           /* Large shadow */
--shadow-xl           /* Extra large shadow */
--shadow-2xl          /* 2X large shadow */
```

## Responsive Design

### Media Query for Dark Mode

```css
@media (prefers-color-scheme: dark) {
  /* Automatically applied in dark theme */
}
```

### Tailwind Dark Mode

```tsx
<div className="bg-white dark:bg-slate-900">
  Works in both light and dark themes
</div>
```

## RTL Support

Theme system is fully RTL-compatible. Language-aware styling is handled by the I18nContext:

```tsx
export function MyComponent() {
  const { locale } = useI18n();
  
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Content auto-adjusts */}
    </div>
  );
}
```

## Component Examples

### Themed Card

```tsx
<div className="card">
  <h2 className="text-primary">Title</h2>
  <p className="text-secondary">Description</p>
</div>
```

### Themed Button

```tsx
<button className="btn-primary">
  Primary Action
</button>

<button className="btn-secondary">
  Secondary Action
</button>

<button className="btn-ghost">
  Ghost Button
</button>
```

### Themed Form Input

```tsx
<input 
  className="input-themed" 
  placeholder="Enter text..."
/>
```

### Themed Modal

```tsx
<div className="fixed inset-0 bg-[var(--overlay-scrim)] flex items-center justify-center">
  <div className="modal-content rounded-lg p-6">
    <h2 className="text-primary">Modal Title</h2>
  </div>
</div>
```

## Testing Checklist

- [ ] Light theme renders by default
- [ ] Dark theme toggles on button click
- [ ] Theme persists on page reload
- [ ] Theme switches respect system preference on first load
- [ ] All components display properly in light theme
- [ ] All components display properly in dark theme
- [ ] Transitions are smooth (300ms)
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] RTL layouts work in both themes
- [ ] Mobile responsive in both themes
- [ ] Focus states visible in both themes
- [ ] No hard-coded colors in components

## Accessibility

### Contrast Ratios

- **Light Theme**: Meets or exceeds WCAG AA standards (4.5:1 for text)
- **Dark Theme**: Meets or exceeds WCAG AA standards (4.5:1 for text)

### Keyboard Navigation

- Theme toggle accessible via Tab key
- Toggle button has proper ARIA labels
- Focus state clearly visible in both themes

### Color Blindness

- Accent colors chosen to work for color-blind users
- Not relying on color alone for information
- Semantic color meanings (success, warning, error) supported

## Troubleshooting

### Theme Not Switching

1. Check that `ThemeProvider` wraps the app in `providers.tsx`
2. Verify `globals-theme.css` is imported in `layout.tsx`
3. Check browser console for errors
4. Clear localStorage and try again

### Styles Not Applying

1. Verify CSS variables are defined in `globals-theme.css`
2. Check Tailwind config includes dark mode selector
3. Ensure components use `var(--variable-name)` or `className="bg-primary"`
4. Check for CSS specificity conflicts

### RTL Issues

1. Verify `dir` attribute is set correctly on `<html>` tag
2. Check I18nContext provides correct locale
3. Use CSS logical properties (margin-inline, padding-block, etc.)

## Future Enhancements

- [ ] Per-page theme override
- [ ] Custom theme creator
- [ ] Theme scheduler (auto-switch at specific times)
- [ ] High contrast mode
- [ ] Theme animation preferences (respects prefers-reduced-motion)
- [ ] Advanced color picker for white-label solutions

## Related Documentation

- `CLAUDE.md` - Project context
- `DEPLOYMENT.md` - Deployment configuration
- Auth system - `lib/AuthContext.tsx`
- I18n system - `lib/I18nContext.tsx`
