# Security Rules


Always consider:


Authentication:

- JWT
- refresh tokens


Authorization:

- role permissions
- ownership checks


Input:

Validate every request.


Database:

Use parameterized queries.


Never:

- expose passwords
- expose secrets
- trust frontend validation only


Uploads:

Validate:

- file type
- file size
- filename