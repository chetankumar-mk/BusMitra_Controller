# BusMitra Controller Design System

## Overview

The BusMitra Controller design system provides a comprehensive set of design tokens, global styles, and reusable UI components built with React 18, CSS custom properties, and Tailwind-inspired design principles.

## Design Tokens

Design tokens are defined in `src/styles/tokens.css` and imported first in `src/main.jsx`. All components use these tokens for consistent theming.

### Color Tokens

**Brand Colors:**
- `--color-brand-primary`: #2563EB (primary blue)
- `--color-brand-primary-hover`: #1D4ED8
- `--color-brand-navy`: #0B1F3A (deep navy)
- `--color-brand-navy-secondary`: #12345B
- `--color-brand-navy-dark`: #07182D

**Semantic Colors:**
- `--color-success`: #16A34A
- `--color-warning`: #F59E0B
- `--color-danger`: #DC2626
- `--color-info`: #0EA5E9

**Neutral Scale:**
- `--color-neutral-50` through `--color-neutral-950`

**Semantic Surfaces (Light Theme):**
- `--surface-page`: #F8FAFC
- `--surface-card`: #FFFFFF
- `--surface-raised`: #FFFFFF
- `--surface-sunken`: #F1F5F9
- `--border-subtle`: #E2E8F0
- `--border-strong`: #CBD5E1

**Text Colors:**
- `--text-primary`: Primary text color
- `--text-secondary`: Secondary text color
- `--text-muted`: Muted text color
- `--text-inverse`: Inverse text color

### Dark Theme

Dark theme is activated via `[data-theme="dark"]` attribute. All surface and text colors automatically adapt. The system also respects `prefers-color-scheme` when no explicit theme is set.

### Spacing Scale

Based on 4px base unit:
- `--spacing-0`: 0
- `--spacing-1`: 4px
- `--spacing-2`: 8px
- `--spacing-3`: 12px
- `--spacing-4`: 16px
- `--spacing-6`: 24px
- `--spacing-8`: 32px
- `--spacing-12`: 48px
- `--spacing-16`: 64px

### Border Radius

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-xl`: 16px
- `--radius-full`: 9999px

### Shadows

- `--shadow-xs`: Small shadow
- `--shadow-sm`: Small shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow
- `--shadow-focus`: Focus ring (brand color)
- `--shadow-glow`: Brand glow effect

### Typography

**Fonts:**
- `--font-family-ui`: Inter Variable (UI text)
- `--font-family-mono`: JetBrains Mono Variable (code, numbers)

**Font Sizes:**
- `--font-size-xs`: 11px
- `--font-size-sm`: 12px
- `--font-size-base`: 14px
- `--font-size-md`: 16px
- `--font-size-lg`: 18px
- `--font-size-xl`: 20px
- `--font-size-2xl`: 24px
- `--font-size-3xl`: 30px
- `--font-size-4xl`: 36px

**Font Weights:**
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700

**Line Heights:**
- `--line-height-tight`: 1.25
- `--line-height-normal`: 1.5
- `--line-height-relaxed`: 1.75

### Motion

**Durations:**
- `--duration-fast`: 120ms
- `--duration-normal`: 200ms
- `--duration-slow`: 320ms

**Easing:**
- `--ease-in`: cubic-bezier(0.4, 0, 1, 1)
- `--ease-out`: cubic-bezier(0, 0, 0.2, 1)
- `--ease-in-out`: cubic-bezier(0.4, 0, 0.2, 1)

### Layout

- `--layout-sidebar-width`: 260px
- `--layout-header-height`: 64px
- `--layout-max-width`: 1400px
- `--layout-content-width`: 1200px

### Legacy Aliases

For backward compatibility with existing CSS:
- `--color-text-main` → `--text-primary`
- `--color-text-secondary` → `--text-secondary`
- `--color-text-muted` → `--text-muted`
- `--font-size-body` → `--font-size-base`
- `--font-size-page-title` → `--font-size-3xl`
- `--font-size-page-subtitle` → `--font-size-lg`
- `--font-weight-page-title` → `--font-weight-bold`
- `--spacing-xs` → `--spacing-1`
- `--spacing-md` → `--spacing-4`
- `--spacing-xl` → `--spacing-6`

## UI Components

All components are located in `src/components/ui/` and can be imported from the barrel export:

```jsx
import { Button, Card, Input } from '../components/ui';
```

### Button

Variants: `primary`, `secondary`, `ghost`, `danger`
Sizes: `sm`, `md`, `lg`

```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="secondary" icon={Icon} iconPosition="left">
  With Icon
</Button>

<Button loading disabled>
  Loading...
</Button>
```

### Badge / StatusPill

Variants: `online`, `offline`, `stale`, `active`, `assigned`, `unassigned`, `warning`, `danger`, `info`, `neutral`

```jsx
<Badge variant="online" pulse>
  Online
</Badge>

<Badge variant="assigned">
  Assigned
</Badge>
```

### Card

```jsx
<Card hoverable>
  <CardHeader>
    <h3>Title</h3>
  </CardHeader>
  <CardBody>
    <p>Content</p>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### StatCard

```jsx
<StatCard
  icon={BusIcon}
  label="Total Buses"
  value="42"
  subText="+5 from last week"
  accent="primary"
/>
```

### PageHeader

```jsx
<PageHeader
  title="Dashboard"
  subtitle="Overview of fleet status"
  breadcrumb={<span>Home / Dashboard</span>}
  actions={<Button>Action</Button>}
/>
```

### Skeleton

```jsx
<Skeleton variant="rect" width="100%" height={16} />
<SkeletonText lines={3} />
<SkeletonCircle size={40} />
<SkeletonTableRow cols={4} />
```

### EmptyState

```jsx
<EmptyState
  title="No data found"
  description="Try adjusting your filters or add new items."
  action={<Button>Add Item</Button>}
/>
```

### ErrorState

```jsx
<ErrorState
  message="Failed to load data"
  onRetry={handleRetry}
/>
```

### Spinner

```jsx
<Spinner size="md" />
```

### Toast

```jsx
import { useToast } from '../components/ui';

function MyComponent() {
  const { success, error, info, warning } = useToast();

  const handleClick = () => {
    success('Operation completed successfully');
    error('Something went wrong');
    info('New message received');
    warning('Action required');
  };
}
```

Wrap your app with `ToastProvider`:

```jsx
import { ToastProvider } from '../components/ui';

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  );
}
```

### Modal

```jsx
<Modal
  open={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="md"
>
  <p>Modal content</p>
</Modal>
```

### Drawer

```jsx
<Drawer
  open={isOpen}
  onClose={handleClose}
  position="right"
  size="md"
>
  <p>Drawer content</p>
</Drawer>
```

### Tooltip

```jsx
<Tooltip content="Tooltip text" position="top">
  <span>Hover me</span>
</Tooltip>
```

### Input

```jsx
<Input
  label="Email"
  hint="Enter your email address"
  error={error}
  icon={MailIcon}
  type="email"
  value={value}
  onChange={handleChange}
/>
```

### Select

```jsx
<Select
  label="Status"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]}
  value={value}
  onChange={handleChange}
/>
```

### SearchInput

```jsx
<SearchInput
  value={searchValue}
  onChange={handleSearchChange}
  onClear={handleClear}
  placeholder="Search..."
/>
```

## Global Utility Classes

Available in `src/index.css`:

- `.tabular` - Tabular numbers for data
- `.mono` - Monospace font
- `.sr-only` - Screen reader only
- `.truncate` - Single line truncation
- `.truncate-2` - Two line truncation
- `.truncate-3` - Three line truncation
- `.skeleton` - Skeleton loading shimmer

## Accessibility

All components follow accessibility best practices:
- Keyboard navigation support
- ARIA attributes
- Focus management
- Screen reader support
- Reduced motion support

## Responsive Design

Components are responsive and adapt to different screen sizes. Use the design tokens for consistent spacing and sizing across breakpoints.

## Usage Guidelines

1. **Always use design tokens** - Never hardcode colors, spacing, or sizes
2. **Import from barrel export** - Use `@/components/ui` for clean imports
3. **Theme awareness** - Components automatically adapt to light/dark themes
4. **Accessibility first** - All components are accessible by default
5. **Performance** - Components are optimized for performance with proper memoization

## Migration Notes

Existing CSS that used undefined variables will now work correctly due to the legacy aliases defined in tokens.css. No breaking changes to existing page layouts.
