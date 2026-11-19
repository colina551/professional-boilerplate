1.Authentication vs. Authorization: Authentication verifies who a user is (e.g., showing your ID or logging in with email/password), while authorization determines what actions or resources they are allowed to access once identified (e.g., a boarding pass granting access to a specific gate, or an admin being allowed to delete users while a regular user cannot).

2.Stateless JWT & Scalability: A JWT is stateless because the server stores no session state in memory or a database; the client holds the token and sends it with each request. This improves scalability by eliminating server session memory overhead and database session lookups, allowing easy horizontal scaling across instances.

3.Three Parts of a JWT:

Header: Specifies the token type (JWT) and signing algorithm (e.g., HS256).

Payload: Contains claims/data about the user (e.g., userId, email, role) and timestamps like iat and exp.

Signature: Cryptographic hash of the encoded header, encoded payload, and server secret key that verifies the token hasn't been tampered with.

4.No Sensitive Data in Payload: The payload is only Base64-encoded, not encrypted, so anyone who decodes the token can read its contents in plain text.

5.How bcrypt Protects Passwords: bcrypt hashes passwords one-way so raw passwords aren't stored. A salt is a unique random value added per password to defeat rainbow tables and make identical passwords hash differently; rounds set the iteration count (cost factor), slowing down hashing to resist brute-force attacks.

6.Stolen JWT Risk & Mitigation: Anyone who steals a valid JWT can act as that user until the token expires. Mitigate by storing tokens in httpOnly, secure, sameSite: 'strict' cookies (instead of localStorage to prevent XSS theft), using short expiration times, and using token blacklists or token versioning on logout/password changes.

7.Why Use HTTPS: Sending a JWT over unencrypted HTTP exposes it to network interception (Man-in-the-Middle attacks). HTTPS encrypts traffic in transit so attackers cannot capture the token.

8.Access Token vs. Refresh Token: Access tokens are short-lived (e.g., 15 minutes) and sent with API requests to access protected resources; refresh tokens are long-lived (e.g., 7–30 days) and stored securely to obtain new access tokens when they expire, balancing security with a smooth user experience.

9.How Auth Middleware Identifies the User: It extracts the token from the Authorization: Bearer <token> header, verifies its signature and expiration with jwt.verify() using JWT_SECRET, and attaches the decoded payload (userId, email, etc.) to req.user for downstream handlers.

10.Role-Based Authorization Changes: Add a role column (defaulting to 'user') to the User entity, include role in the JWT payload when signing tokens, extend Express.Request.user to include role, add a role-checking middleware (e.g., adminOnly returning 403 ForbiddenError if not 'admin'), and apply it after authMiddleware on restricted routes.