# Feature Development Workflow Guide

This document defines the standard workflow and architecture rules for building features inside the Airforce System.

The goal is to:

* Maintain clean architecture
* Avoid spaghetti code
* Keep components reusable
* Keep the codebase scalable
* Maintain enterprise-level frontend structure

---
# Core Architecture Principles

## 1. Separation of Concerns

Always separate:

* UI Components
* Custom Hooks
* Services/API Logic
* Utility Functions

DO NOT:

* Put API calls directly inside JSX
* Put large business logic inside components
* Create giant monolithic components

---

# Standard Folder Workflow

Every feature should follow this workflow:

```txt
components/
hooks/
services/
lib/
pages/
```

---

# Responsibilities

## components/

Contains:

* Reusable UI components
* Presentation logic only
* Layout rendering
* UI states

Examples:

```txt
components/
 ┣ trainings/
 ┃ ┣ TrainingForm.jsx
 ┃ ┣ TrainingCard.jsx
 ┃ ┗ TrainingFilters.jsx
```

Rules:

* Keep components reusable
* Keep components small
* Single responsibility only
* Avoid large JSX files

---

# hooks/

Contains:

* State management
* Reusable frontend logic
* UI interaction logic
* Filters/search logic
* Dynamic builders

Examples:

```txt
hooks/
 ┣ useTrainings.js
 ┣ useTrainingFilters.js
 ┗ useRegistrationBuilder.js
```

Rules:

* Reusable logic only
* No JSX rendering
* Keep hooks feature-focused

---

# services/

Contains:

* API requests
* Axios calls
* Server communication

Examples:

```txt
services/
 ┣ trainingsService.js
 ┣ attendanceService.js
 ┗ analyticsService.js
```

Rules:

* Centralize API logic
* Avoid duplicate requests
* Keep endpoints organized

---

# lib/

Contains:

* Utility functions
* Helpers
* Formatters
* Shared logic

Examples:

```txt
lib/
 ┣ dateUtils.js
 ┣ trainingUtils.js
 ┗ validationUtils.js
```

Rules:

* Pure reusable functions only
* No UI rendering
* No API logic

---

# pages/

Contains:

* Main page layouts
* Page composition
* Feature assembly

Examples:

```txt
pages/
 ┣ Dashboard.jsx
 ┣ Trainings.jsx
 ┗ Attendance.jsx
```

Rules:

* Assemble components
* Minimal business logic
* Keep pages readable

---

# Feature Development Workflow

# STEP 1 — Plan the Feature

Before coding:

* Identify the feature goal
* Identify required UI
* Identify reusable components
* Identify required hooks
* Identify required services

---

# STEP 2 — Create Components

Create reusable UI components first.

Example:

```txt
components/trainings/
 ┣ TrainingForm.jsx
 ┣ TrainingCard.jsx
 ┗ TrainingDetails.jsx
```

Rules:

* Presentation-focused
* Reusable
* Clean props
* Responsive

---

# STEP 3 — Create Hooks

Move logic into hooks.

Example:

```txt
hooks/
 ┣ useTrainings.js
 ┗ useTrainingFilters.js
```

Hooks handle:

* State
* Filtering
* Form logic
* Dynamic builders
* UI interactions

---

# STEP 4 — Create Services

Centralize API communication.

Example:

```txt
services/
 ┗ trainingsService.js
```

Rules:

* One service per feature
* Reusable methods
* Keep API organized

---

# STEP 5 — Create Utility Functions

Move reusable helpers into lib/.

Example:

```txt
lib/
 ┣ dateUtils.js
 ┗ trainingUtils.js
```

---

# STEP 6 — Assemble the Page

Use pages/ to assemble:

* Components
* Hooks
* Services

Pages should remain clean.

---

# UI/UX Standards

The system should feel:

* Tactical
* Operational
* Military-inspired
* Enterprise-grade
* Clean
* Data-centric

Avoid:

* Overdecorated layouts
* Excessive animations
* Giant components
* Cluttered UI

---

# Responsive Design Standards

Support:

* Desktop
* Tablet
* Mobile

Requirements:

* Responsive grids
* Scrollable mobile tables/cards
* Clean spacing
* Readable typography

---

# Component Design Standards

DO:

* Use reusable UI primitives
* Keep components modular
* Use composition
* Use responsive layouts

DO NOT:

* Duplicate layouts
* Hardcode repeated UI
* Create deeply nested JSX
* Mix business logic inside UI

---

# Naming Conventions

## Components

```txt
PascalCase.jsx
```

Examples:

```txt
TrainingCard.jsx
AttendanceTable.jsx
```

---

# Hooks

```txt
useSomething.js
```

Examples:

```txt
useTrainings.js
useSidebarState.js
```

---

# Services

```txt
featureService.js
```

Examples:

```txt
trainingsService.js
attendanceService.js
```

---

# Utilities

```txt
somethingUtils.js
```

Examples:

```txt
dateUtils.js
trainingUtils.js
```

---

# Final Goal

Every feature should:

* Be scalable
* Be maintainable
* Avoid spaghetti code
* Follow clean architecture
* Feel enterprise-level
* Be easy to extend in the future
