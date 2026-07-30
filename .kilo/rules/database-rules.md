# Database Rules


Database:

MySQL


Rules:


Always consider:

- normalization
- indexing
- foreign keys
- performance


Never:

- delete production data
- modify tables without migration
- store relational data as JSON


Naming:

Tables:

snake_case


Example:


sop_versions

sop_sections

sop_steps



Every table should have:


id

created_at

updated_at


Important:

Before creating tables:

Analyze existing schema first.