# Landing Page Carousel Implementation

**Date:** May 22, 2026

## Overview

Replaced custom fade-based carousel with Swiper.js for horizontal sliding with autoplay and infinite loop functionality. Updated carousel buttons to "View All Trainings" that scrolls to the Internal Trainings section. Refactored components to follow UI_WORKFLOW.md structure.

## Changes Made

### 1. Package Installation

```bash
cd client && npm install swiper
```

### 2. Component Refactoring (UI_WORKFLOW.md Compliance)

Created `client/src/components/trainings/TrainingPreviewCard.jsx`:
- Reusable training card component for internal and external trainings
- Supports `variant="internal"` and `variant="external"`
- Uses `shortDate` utility from `lib/dateUtils.js`

Updated `lib/dateUtils.js`:
- Added `shortDate` utility function

### 3. Landing.jsx Updates

#### Imports Added
```javascript
import { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import TrainingPreviewCard from '@/components/trainings/TrainingPreviewCard';
```

#### Scroll Functionality
```javascript
const trainingsRef = useRef(null);

const scrollToTrainings = () => {
  trainingsRef.current?.scrollIntoView({ behavior: 'smooth' });
};
```

#### Carousel Component (Swiper Implementation)
```javascript
function Carousel({ slides = [] }) {
  return slides.length > 0 ? (
    <Swiper
      modules={[Autoplay, Pagination]}
      spaceBetween={0}
      slidesPerView={1}
      autoplay={{ delay: 3000, disableOnInteraction: false }}
      loop={true}
      pagination={{ clickable: true }}
      className="h-[420px] w-full max-w-[1080px] mx-auto"
    >
      {slides.map((s, i) => (
        <SwiperSlide key={s.key || i}>
          <div className="grid h-full gap-8 lg:grid-cols-[1.4fr] lg:items-center">
            <div>{s.left}</div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  ) : null;
}
```

#### Internal Trainings Section Ref
```javascript
<section ref={trainingsRef} className="space-y-6">
```

### 4. announcementsService.js

Added `fetchActiveAnnouncements` function:

```javascript
export const fetchActiveAnnouncements = async (options = {}) => {
  const { limit = 50 } = options;
  try {
    const response = await fetch(`${API_BASE}/announcements`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    const announcements = (data.data || []).map(a => ({
      ...a,
      announcement_type: a.type || 'general',
      start_date: a.start_date || null,
      end_date: a.end_date || null,
      audience: a.audience || 'all',
      is_pinned: a.is_pinned === 1 || a.is_pinned === true
    }));
    const active = announcements.filter(a => a.status === 'active');
    return { success: true, data: { announcements: active.slice(0, limit) } };
  } catch (error) {
    return { success: false, message: error.message || 'Failed to fetch announcements' };
  }
};
```

## Carousel Behavior

| Feature | Configuration |
|---------|---------------|
| Transition | Horizontal slide |
| Autoplay | Every 3 seconds (3000ms) |
| Infinite Loop | Enabled (loops back to first slide) |
| Pagination | Clickable dots at bottom |
| Navigation Arrows | Disabled |

## Button Interaction

The carousel "Sign In" and "Go to Dashboard" buttons were replaced with "View All Trainings" that:
- Scrolls smoothly to the Internal Trainings section
- Uses `scrollIntoView({ behavior: 'smooth' })`

## Build Command

```bash
cd client && npm run build
```