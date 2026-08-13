# Plan: Fix /employee/settings routing so it renders inside AppLayout

## Problem
In `client/src/App.jsx`, the `/employee/settings` route is defined as a **sibling** of the `/` route:

```jsx
{
  path: "/",
  element: <AppLayout />,
  children: [
    // profile, my-learning, settings, etc.
  ]
},
{
  path: "/employee/settings",   // <-- sibling, NOT child of /
  element: EmployeeProtectedWrapper(EmployeeSettingsPage),
}
```

Because it's a sibling, it does **not** render inside `AppLayout`'s `<Outlet />`. It has no sidebar, no topbar, no shared page chrome — which is why it "goes to another page" instead of appearing as embedded content cards.

## Fix
Move `/employee/settings` into the `children` array of the `/` route, exactly like `my-learning`, `profile`, `notifications`, etc.

### Before (lines 222-225 in App.jsx)
```jsx
  {
    path: "/employee/settings",
    element: EmployeeProtectedWrapper(EmployeeSettingsPage),
    handle: { title: "Settings" },
  },
]);
```

### After
```jsx
      { path: "employee/settings", element: EmployeeProtectedWrapper(EmployeeSettingsPage), handle: { title: "Settings" } },
    ],
  },
]);
```

This places it inside the `/` route's `children` array, so `AppLayout` wraps it and the sidebar/topbar/navigation remain visible.

## Validation
- `npx vite build --mode production` in `client/` — confirm zero errors
- Navigate to `/employee/settings` in the browser — confirm it now appears inside the app layout with sidebar/topbar, not as a standalone page

## Files changed
- `client/src/App.jsx` — move `/employee/settings` route into `/` children array
