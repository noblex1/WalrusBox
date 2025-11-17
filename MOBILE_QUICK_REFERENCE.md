# 📱 Mobile Optimization Quick Reference

## Quick Copy-Paste Patterns

### Responsive Text
```tsx
// Headings
<h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">
<h2 className="text-xl sm:text-3xl md:text-4xl">
<h3 className="text-lg sm:text-2xl md:text-3xl">

// Body text
<p className="text-sm sm:text-base md:text-lg">
```

### Responsive Spacing
```tsx
// Container padding
<div className="px-4 sm:px-6 md:px-8">
<div className="py-6 sm:py-8 md:py-12">

// Gaps
<div className="gap-4 sm:gap-6 md:gap-8">
<div className="space-y-4 sm:space-y-6 md:space-y-8">
```

### Responsive Grids
```tsx
// 1 -> 2 -> 3 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// 1 -> 3 columns
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// 1 -> 2 -> 4 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Responsive Buttons
```tsx
// Full width on mobile, auto on desktop
<Button className="w-full sm:w-auto min-h-[44px] px-6 py-3">
  Click Me
</Button>

// Responsive padding
<Button className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 min-h-[44px]">
```

### Responsive Icons
```tsx
// Small on mobile, larger on desktop
<Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
<Icon className="h-6 w-6 sm:h-8 sm:w-8" />
```

### Show/Hide Elements
```tsx
// Hide on mobile, show on desktop
<div className="hidden sm:block">Desktop only</div>
<div className="hidden md:block">Tablet+ only</div>
<div className="hidden lg:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="block sm:hidden">Mobile only</div>
<div className="sm:hidden">Mobile only</div>

// Show on mobile and tablet, hide on desktop
<div className="block lg:hidden">Mobile & Tablet</div>
```

### Responsive Flex
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col sm:flex-row gap-4">

// Center on mobile, left on desktop
<div className="flex flex-col items-center sm:items-start">

// Wrap on mobile
<div className="flex flex-wrap gap-2 sm:gap-4">
```

### Responsive Cards
```tsx
<Card className="p-4 sm:p-6 md:p-8">
  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">
  <p className="text-sm sm:text-base text-muted-foreground">
</Card>
```

### Responsive Images
```tsx
<img 
  className="w-full h-auto rounded-lg"
  alt="Description"
/>

// With aspect ratio
<div className="aspect-video w-full">
  <img className="w-full h-full object-cover" />
</div>
```

### Responsive Modals
```tsx
<Dialog>
  <DialogContent className="w-[95vw] sm:w-full max-w-md sm:max-w-lg">
    <DialogHeader className="px-4 sm:px-6">
      <DialogTitle className="text-lg sm:text-xl">
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### Responsive Forms
```tsx
<form className="space-y-4 sm:space-y-6">
  <Input 
    className="w-full min-h-[44px] text-base"
    placeholder="Enter text"
  />
  <Button 
    type="submit" 
    className="w-full sm:w-auto min-h-[44px]"
  >
    Submit
  </Button>
</form>
```

### Responsive Navigation
```tsx
<nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
  <div className="flex items-center gap-2 sm:gap-4">
    <Logo className="h-6 w-6 sm:h-8 sm:w-8" />
    <span className="text-base sm:text-xl font-bold">
  </div>
  <div className="flex items-center gap-1 sm:gap-2">
    {/* Nav items */}
  </div>
</nav>
```

### Responsive Tables
```tsx
// Card view on mobile, table on desktop
<div className="block md:hidden">
  {/* Mobile card view */}
  {items.map(item => (
    <Card key={item.id} className="p-4 mb-3">
      {/* Card content */}
    </Card>
  ))}
</div>

<div className="hidden md:block">
  <Table>
    {/* Desktop table */}
  </Table>
</div>
```

## Breakpoint Reference

```
xs:  375px  (iPhone SE, small phones)
sm:  640px  (large phones)
md:  768px  (tablets)
lg:  1024px (laptops)
xl:  1280px (desktops)
2xl: 1536px (large screens)
```

## Common Mistakes to Avoid

❌ **Don't:**
```tsx
// Text too large on mobile
<h1 className="text-8xl">

// No minimum tap target
<button className="p-1">

// Fixed width on mobile
<div className="w-96">

// No responsive spacing
<div className="p-16">
```

✅ **Do:**
```tsx
// Responsive text
<h1 className="text-3xl sm:text-5xl md:text-8xl">

// Proper tap target
<button className="min-h-[44px] px-4 py-2">

// Responsive width
<div className="w-full sm:w-96">

// Responsive spacing
<div className="p-4 sm:p-8 md:p-16">
```

## Testing Checklist

- [ ] Test on 360px viewport
- [ ] Test on 375px viewport
- [ ] Test on 390px viewport
- [ ] Test on 414px viewport
- [ ] Test on 768px viewport
- [ ] Test on 1024px viewport
- [ ] No horizontal scroll
- [ ] All text readable
- [ ] All buttons tappable (44px min)
- [ ] Forms work properly
- [ ] Images load correctly
- [ ] Animations smooth
- [ ] Dark mode works
- [ ] Keyboard navigation works

## Performance Tips

```tsx
// Reduce animations on mobile
const isMobile = window.innerWidth < 768;

{!isMobile && <HeavyAnimation />}

// Lazy load images
<img loading="lazy" />

// Reduce motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

## Accessibility

```tsx
// Proper tap targets
<button className="min-h-[44px] min-w-[44px]">

// Readable text
<p className="text-base leading-relaxed">

// Proper contrast
<div className="bg-background text-foreground">

// Focus indicators
<button className="focus:ring-2 focus:ring-primary">
```

---

**Remember**: Always start with mobile styles, then add larger breakpoints!
