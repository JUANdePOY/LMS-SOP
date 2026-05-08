# Git Workflow Documentation

## Branch Structure

The project uses feature branches for development. Current branches:

| Branch | Description |
|--------|-------------|
| `main` | Production-ready code |
| `feature/authentication` | Login, auth middleware, RBAC, API client |
| `feature/reservists-crud` | Reservists form, service, routes, DB schema |
| `feature/groups-units` | Groups/units hierarchy with forms and routes |
| `feature/trainings` | Trainings module with form and service |
| `feature/attendance` | Attendance module with service and routes |
| `feature/announcements` | Announcements page |
| `feature/reservations` | Reservations page update |
| `feature/server-infrastructure` | Server routes, utilities, scripts, docs |

## Cloning the Repository

```bash
git clone https://github.com/wawikun30-cloud/PAFR.git
cd PAFR
```

## Pulling All Branches and Changes

After cloning, fetch all remote branches:

```bash
git fetch --all
```

To pull all remote branches to local, run:

```bash
for branch in $(git branch -r | grep -v HEAD | sed 's/origin\///'); do
  git checkout -b $branch origin/$branch 2>/dev/null || git checkout $branch && git pull
done
```

Or manually checkout each feature branch:

```bash
git checkout feature/authentication
git pull origin feature/authentication

git checkout feature/reservists-crud
git pull origin feature/reservists-crud

git checkout feature/groups-units
git pull origin feature/groups-units

git checkout feature/trainings
git pull origin feature/trainings

git checkout feature/attendance
git pull origin feature/attendance

git checkout feature/announcements
git pull origin feature/announcements

git checkout feature/reservations
git pull origin feature/reservations

git checkout feature/server-infrastructure
git pull origin feature/server-infrastructure
```

## Team Workflow

### For Developers

1. **Always start from main**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a new feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```

4. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub to merge into `main`

### Branch Naming Convention

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/topic` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Message Convention

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Syncing with Main

If main has been updated while you're working on a feature:

```bash
git checkout main
git pull origin main
git checkout feature/your-branch
git rebase main
```

## Pushing All Branches to Remote

To push all local branches to remote:

```bash
git push --all origin
```

## Staying Updated

To keep your local repo updated with all remote changes:

```bash
git fetch --all
git pull --all
```

Note: This will only update branches you currently have checked out locally. Use the loop command above to pull all branches.
