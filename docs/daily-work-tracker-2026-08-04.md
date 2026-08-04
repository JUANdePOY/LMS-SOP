# SOP System Project - Daily Work Tracker

**Date:** August 4, 2026  
**Goal:** Complete all listed tasks for today  
**Status Legend:** 🔴 Not Started | 🟡 In Progress | 🟢 Completed | ⚠️ Blocked

---

## 📋 Currently Working Modules (Ongoing)

### 1. Assessment Module

#### Quiz Page
- [x] Implement Bulk Import
- [x] Add Hierarchy Dropdown for Multiple Choice and True/False questions
- [x] Improve the Save functionality
- [x] Upgrade the overall UI Interface

#### Integrity Violation Page
- [x] Remove unnecessary metadata
- [x] Make the Auto-Flagged records clickable to open a detailed modal

### 2. Certificate Module
- [x] Make the Live Preview fully functional
- [x] Ensure all certificate contents are displayed correctly in the preview
- [x] Automatically center all contents in the Live Preview
- [x] Fix the Save and Update buttons (currently not functioning)

---

## 🔧 Modules for Refinement (Ongoing)

### 1. User Management
- [x] Improve the Profile Image/Profile Picture feature

### 2. Course Management

#### Add Course
- [x] Add Thumbnail support
- [x] Link Category to the SOP Category page

#### Course Builder
- [x] Fix the Save and Save Draft functions
- [x] Ensure Certificates, Documents, and Quiz outputs are visible and functional on the user end

### 3. Course Library
- [x] Improve Dropdown Labels
- [x] Update Course Cards to display only: Enrollments, Average Progress, Completed
- [x] Make all Action Buttons functional
- [x] Enable Export Data
- [x] Remove "Start Created" and "View Course" from the user interface
- [x] Filter users based on the courses assigned to them

### 4. User & Admin Interface
- [x] Add a Banner Section for announcements and events
- [x] Ensure the UI Design is consistent across all pages
- [x] For Department Head accounts: Allow access only to Course and Quiz creation. Remove Analytics and other unnecessary administrative features

---

## 🔴 Pending Modules

### Paul's Tasks
- [x] Messaging
- [x] Announcements
- [x] Events

---

## 📊 Progress Summary

| Category | Total Tasks | Completed | In Progress | Not Started |
|----------|-------------|-----------|-------------|-------------|
| Assessment Module | 6 | 6 | 0 | 0 |
| Certificate Module | 4 | 4 | 0 | 0 |
| User Management | 1 | 1 | 0 | 0 |
| Course Management | 5 | 5 | 0 | 0 |
| Course Library | 6 | 6 | 0 | 0 |
| User & Admin Interface | 3 | 3 | 0 | 0 |
| Pending (Paul) | 3 | 3 | 0 | 0 |
| **TOTAL** | **28** | **28** | **0** | **0** |

---

## 📝 Notes & Blockers

*Add any blockers or notes here as work progresses*

---

## ✅ Completed Tasks

### Assessment Module
- [x] Implement Bulk Import (CSV + JSON support, backend endpoint `/api/quiz/:id/import`)
- [x] Add Hierarchy Dropdown for Multiple Choice and True/False questions (new `quiz_hierarchy` table, migration, model, API, frontend dropdown)
- [x] Improve the Save functionality (fixed useEffect, added auto-save, added max_score/feedback_policy fields, unsaved changes warning)
- [x] Upgrade the overall UI Interface (@dnd-kit drag-drop, search/filter, bulk select + delete)
- [x] Remove unnecessary metadata (human-readable format instead of raw JSON)
- [x] Make the Auto-Flagged records clickable to open a detailed modal (detail modal with violation timeline)

### Certificate Module
- [x] Make the Live Preview fully functional (wired up `useSectionPositions` drag-to-position, removed early return without frame, added grid placeholder)
- [x] Ensure all certificate contents are displayed correctly in the preview (synced frontend/backend `certificateSections.js`, fixed PDF renderer to respect xPercent, textAlign, fontFamily)
- [x] Automatically center all contents in the Live Preview (changed `date` and `signatures_seal` defaults to center, added "Center All" button)
- [x] Fix the Save and Update buttons (removed hardcoded status, fixed button types to `submit` for keyboard support)

### User Management
- [x] Improve the Profile Image/Profile Picture feature (added avatar upload endpoint, frontend upload UI with preview, avatar display in Profile page)

### Course Management
- [x] Fix the Save and Save Draft functions (refactored to use state instead of refs, added auto-save with 30s debounce, added unsaved changes warning)
- [x] Add Thumbnail support (added thumbnail upload field to CourseCreateForm with preview)
- [x] Link Category to SOP Category page (added category_id FK to courses, migration, updated CourseCreateForm to use categories API dropdown)

### Course Library
- [x] Improve Dropdown Labels (renamed "All Levels" to "All Difficulty Levels", "All Categories" to "All Course Categories")
- [x] Update Course Cards to display only: Enrollments, Average Progress, Completed (removed status, category, difficulty, start date, rating from cards)
- [x] Make all Action Buttons functional (wired up Export Data button)
- [x] Enable Export Data (added backend endpoints `/api/courses/:id/export/csv`, `/excel`, `/pdf`)
- [x] Remove "Start Created" and "View Course" from the user interface (confirmed these buttons do not exist in the current codebase)
- [x] Filter users based on the courses assigned to them (added courseId-based filtering in assign modal)

### User & Admin Interface
- [x] Add Banner Section for announcements and events (created BannerSection component, added to AppLayout)
- [x] Ensure the UI Design is consistent across all pages (standardized components, removed unused imports, fixed inconsistent patterns)
- [x] For Department Head accounts: Allow access only to Course and Quiz creation. Removed Analytics and other unnecessary administrative features (updated sidebar menu roles, added route guards in App.jsx)

### Pending (Paul) - Completed
- [x] Messaging (created messaging module with conversations, messages, real-time polling, and full CRUD)
- [x] Announcements (created announcements module with CRUD, priority levels, types, and integrated into AppLayout)
- [x] Events (created events module with CRUD, event dates, locations, types, and integrated into AppLayout)
