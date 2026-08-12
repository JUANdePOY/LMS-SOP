# Inline Content Banner Redesign Plan

## Goal
Move the banner from full-width fixed header overlay into the normal page content flow, and change its entrance animation from slide-down to slide-in-from-left with a subtle bounce.

## Current State
- `BannerSection.jsx` renders a `fixed top-0` full-width banner that covers the header
- Uses slide-down animation (`y: "-100%"` → `y: 0`)
- `AppLayout.jsx` renders `<BannerSection />` outside the scrollable content area
- Premium styling: gradient backgrounds, glassmorphism, spring animations, progress bar

## New Requirement
- **Position**: Inline within the content area, below the page header
- **Animation**: Slide in from the left with a subtle bounce/overshoot
- **Layout**: Full-width within the content container, not fixed to viewport
- **Behavior**: Pushes content down naturally when present, no overlay

## Design Decisions

### 1. Layout Change: Inline Content Banner
- Remove `fixed top-0` positioning
- Banner becomes a normal block element inside the content flow
- In `AppLayout.jsx`, place `<BannerSection />` inside the scrollable content area, below the header
- Banner width: 100% of content container
- Banner presence pushes page content down naturally

### 2. Animation: Slide from Left with Bounce
- **Enter**: Slide in from left with overshoot
  - `initial={{ x: "-100%", opacity: 0 }}`
  - `animate={{ x: 0, opacity: 1 }}`
  - Spring physics: `type: "spring", stiffness: 180, damping: 15, mass: 0.9`
  - This creates a subtle bounce at the end
- **Exit**: Slide out to left
  - `exit={{ x: "-100%", opacity: 0 }}`
- **Stagger**: Internal content elements stagger slightly for premium feel

### 3. Visual Design Updates
- Keep gradient backgrounds and premium styling
- Add left-side accent bar instead of full-width gradient for better inline appearance
- Shadow: `shadow-md` or `shadow-lg` for depth within content
- Border radius: `rounded-xl` or `rounded-2xl`
- Margin bottom: `mb-4` or `mb-6` to separate from content below

### 4. Responsive Behavior
- Desktop: Full-width within content container
- Mobile: Full-width with adjusted padding
- Content below shifts down naturally when banner appears

### 5. Queue Behavior
- Keep single-banner display
- When one banner dismisses, next one slides in from left
- Smooth transition between banners

### 6. Auto-Dismiss Behavior
- Keep existing auto-dismiss for `achievement`, `new_course`, `new_sop`
- Progress bar remains at bottom of banner
- Pauses on hover/focus

## Implementation Tasks

### Task 1: Update `AppLayout.jsx`
- Move `<BannerSection />` from outside `<Scrollbar>` back inside the content area
- Place it below the header, before the main page content
- Remove fixed positioning context

### Task 2: Redesign `BannerSection.jsx` Container
- Remove `fixed top-0 left-0 right-0 z-50`
- Change to normal block element: `w-full mb-4`
- Container becomes part of normal document flow
- No z-index needed beyond normal stacking

### Task 3: Update `BannerCard` Animation
- Change enter animation from `y: "-100%"` to `x: "-100%"`
- Add spring physics with bounce: `stiffness: 180, damping: 15, mass: 0.9`
- Update exit animation to slide left: `x: "-100%"`
- Keep staggered content reveals

### Task 4: Update `BannerCard` Visual Design
- Add left accent bar: `border-l-4` with type-based color
- Adjust shadow for inline appearance: `shadow-lg`
- Keep gradient background or switch to solid with accent
- Ensure banner looks premium within content flow

### Task 5: Update Queue Logic
- Keep single-banner display
- Smooth transition when switching between banners
- Maintain auto-dismiss behavior

### Task 6: Validate
- Banner appears inline below header
- Slides in from left with bounce
- Pushes content down naturally
- Works on mobile and desktop
- Dark mode renders correctly
- Auto-dismiss progress bar works

## Out of Scope
- Backend API for banners
- Admin banner management
- Banner center/history dropdown
- Multiple simultaneous banners

## Validation Criteria
1. Banner appears inline within content area, not fixed overlay
2. Banner slides in from left with subtle bounce
3. Banner slides out to left on dismiss
4. Content below shifts down naturally when banner appears
5. Banner has premium styling with gradients/shadows
6. Auto-dismiss progress bar animates correctly
7. Dark mode renders all effects correctly
8. Mobile and desktop layouts are polished
9. Course/SOP publish triggers still work
10. Accessibility contrast ratios pass
