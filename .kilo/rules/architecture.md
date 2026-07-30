# Architecture Rules


Follow Feature-Based Architecture.


Frontend:

src/

features/

Each module owns:

components/
hooks/
services/
pages/
utils/


Example:


features/

sop-management/

components/

hooks/

services/

pages/


Rules:

DO NOT:

- create random folders
- mix modules
- put business logic inside components
- create giant files


Component size:

Preferred:
100-250 lines

Maximum:
300 lines


Reuse existing components before creating new ones.