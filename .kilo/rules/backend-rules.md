# Backend Rules


Framework:

Node.js + Express


Architecture:


src/

controllers/

services/

routes/

middleware/

validators/


Rules:


Controllers:

Only handle HTTP.


Services:

Contain business logic.


Database:

Only access through repositories/services.


Always implement:

- validation
- error handling
- authentication
- authorization



API Style:


GET    /api/sops

POST   /api/sops

PUT    /api/sops/:id

DELETE /api/sops/:id