# Task Management Module

## Overview

The **Task Management Module** enables administrators to create, assign, monitor, and manage tasks for individual users, departments, or positions.

This module is designed to integrate seamlessly with the LMS and SOP Management System, providing a centralized way to manage operational tasks, monitor progress, and track completion without requiring an approval workflow.

---

# Objectives

- Create and manage tasks
- Assign tasks to Users, Departments, or Positions
- Track task progress
- Monitor completion rates
- Upload supporting evidence
- View task history
- Generate task analytics

---

# User Roles

## Administrator

Administrators can:

- Create tasks
- Edit tasks
- Delete tasks
- Assign tasks
- Reassign tasks
- Monitor task progress
- View analytics
- Export task reports

---

## Users

Assigned users can:

- View assigned tasks
- Update task progress
- Upload supporting files
- Add progress notes
- Mark tasks as completed
- View task history

---

# Task Information

Each task contains the following information.

| Field | Required | Description |
|--------|----------|-------------|
| Task Title | ✔ | Name of the task |
| Description | ✔ | Detailed instructions |
| Priority | ✔ | Low, Medium, High, Critical |
| Start Date & Time | ✔ | When the task becomes active |
| Deadline (End Date & Time) | ✔ | Final date and time for completion |
| Estimated Hours | Optional | Estimated completion time |
| Category | Optional | Task grouping |
| Attachments | Optional | Supporting documents |

---

## Example

**Task Title**

> Inspect Fire Extinguishers

**Description**

> Inspect every fire extinguisher on the second floor and upload inspection photos.

**Priority**

> High

**Start Date & Time**

> August 08, 2026 - 08:00 AM

**Deadline**

> August 10, 2026 - 05:00 PM

---

# Task Assignment

Tasks may be assigned using multiple assignment methods.

## Assignment Types

- Individual User
- Department
- Position
- Multiple Users

### Example

```
Assignment Type:
Department

Department:
Maintenance
```

or

```
Assignment Type:
Multiple Users

John Doe
Sarah Cruz
Michael Reyes
```

---

# Task Status

Tasks automatically move between the following statuses.

| Status | Description |
|--------|-------------|
| Pending | Waiting for the scheduled start date |
| In Progress | Task has started but is not completed |
| Completed | User marked the task as completed |
| Overdue | Deadline has passed without completion |
| Cancelled | Task cancelled by administrator |

---

# Automatic Status Logic

```
Current Time < Start Date
        ↓
      Pending

Start Date ≤ Current Time < Deadline
        ↓
    In Progress

User Marks Completed
        ↓
     Completed

Current Time > Deadline
and Status ≠ Completed
        ↓
      Overdue
```

---

# Priority Levels

| Priority | Suggested Color |
|-----------|-----------------|
| Low | Green |
| Medium | Blue |
| High | Orange |
| Critical | Red |

---

# User Progress

Users may update their progress at any time while the task is active.

## Fields

- Completion Rate (0–100%)
- Progress Notes
- Attachments
- Current Status

### Example

**Completion**

```
75%
```

**Notes**

```
Completed inspection of Building A.
Currently inspecting Building B.
```

**Uploaded Files**

```
inspection.pdf
photo1.jpg
photo2.jpg
```

---

# Attachments

Supported file types:

- Images
- PDF
- Word Documents
- Excel Files
- ZIP Files

Attachments serve as supporting evidence for task completion.

---

# Task Timeline

Every important action is recorded automatically.

Example

```
Task Created

↓

Assigned

↓

Started

↓

Progress Updated (20%)

↓

Progress Updated (60%)

↓

Completed
```

This timeline functions as the task's audit log.

---

# Comments

Administrators and assigned users can communicate through task comments.

### Example

**Administrator**

> Please finish this before Friday.

**User**

> Waiting for replacement equipment before proceeding.

---

# Notifications

Users receive notifications when:

- A new task is assigned
- The task start time has arrived
- The deadline is approaching
- The task becomes overdue
- Progress has been updated

---

# Dashboard

## Summary Cards

- Total Tasks
- Pending
- In Progress
- Completed
- Overdue
- Cancelled

---

## Task Table

| Column |
|----------|
| Task |
| Assigned To |
| Priority |
| Start Date |
| Deadline |
| Progress |
| Status |
| Actions |

### Example

| Task | Assigned To | Progress | Status |
|------|-------------|----------|--------|
| Fire Inspection | Maintenance Department | 85% | In Progress |

---

# Task Details Page

Each task displays the following sections.

## Task Information

- Title
- Description
- Priority
- Start Date & Time
- Deadline

---

## Assigned Users

Displays all assigned users, departments, or positions.

---

## Attachments

Displays uploaded supporting files.

---

## Progress Timeline

Displays all progress updates in chronological order.

---

## Comments

Displays communication between administrators and assigned users.

---

# User Interface

## My Tasks

```
------------------------------------------------

My Tasks

------------------------------------------------

Inspect Fire Extinguishers

Status
In Progress

Start
August 08, 2026
08:00 AM

Deadline
August 10, 2026
05:00 PM

Progress

██████░░░░ 60%

Notes

___________________________

Upload Evidence

Choose File

Save Progress

------------------------------------------------
```

---

# Administrator Interface

```
------------------------------------------------

Tasks

------------------------------------------------

+ New Task

------------------------------------------------

Search

Status Filter

Priority Filter

Department Filter

------------------------------------------------

Task
Assigned To
Start
Deadline
Progress
Status

------------------------------------------------
```

---

# Database Design

## tasks

| Column |
|----------|
| id |
| title |
| description |
| priority |
| status |
| start_datetime |
| deadline_datetime |
| estimated_hours |
| created_by |
| created_at |
| updated_at |

---

## task_assignments

| Column |
|----------|
| id |
| task_id |
| assignment_type |
| reference_id |
| assigned_by |
| assigned_at |

### Assignment Types

- User
- Department
- Position

---

## task_progress

| Column |
|----------|
| id |
| task_id |
| user_id |
| completion_rate |
| status |
| notes |
| updated_at |

### Example

| Completion | Notes |
|------------|-------|
| 10% | Started inspection |
| 45% | Building A completed |
| 80% | Building B completed |
| 100% | Inspection finished |

---

## task_attachments

| Column |
|----------|
| id |
| task_progress_id |
| file_name |
| mime_type |
| file_data |
| uploaded_by |

---

## task_comments

| Column |
|----------|
| id |
| task_id |
| user_id |
| comment |
| created_at |

---

# Future Enhancements

## Recurring Tasks

Automatically generate tasks on a daily, weekly, or monthly schedule.

---

## SOP Integration

Automatically generate operational tasks from SOPs.

---

## Course Integration

Assign tasks automatically after users complete a training course.

---

## Task Checklist

Instead of manually entering only a completion percentage, tasks may include checklist items.

Example

```
☑ Inspect Building A

☑ Upload Photos

☐ Submit Final Report

☐ Notify Supervisor
```

Completion percentage can then be calculated automatically based on completed checklist items.

---

## Analytics

Future reports may include:

- Task completion rate by department
- Average completion time
- Overdue task trends
- User productivity
- Department performance

---

# Recommended Workflow

```
Administrator

↓

Create Task

↓

Assign Task

↓

User Receives Notification

↓

Task Starts

↓

User Updates Progress

↓

Upload Evidence

↓

Mark Completed

↓

Task Closed
```

---

# Summary

The **Task Management Module** provides a centralized platform for assigning, tracking, and completing organizational tasks. It supports flexible assignment methods (Users, Departments, and Positions), automatic status updates based on task schedules, progress tracking, evidence uploads, comments, and future integration with SOPs and Courses, making it a scalable solution for operational task management within the LMS ecosystem.