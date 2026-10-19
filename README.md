# Meta Lead Ads – React Native Integration

A React Native dashboard for monitoring Meta Lead Ads using a Node.js backend, Meta Graph API, webhooks, and Socket.IO.

## Tech Stack
- **Frontend:** React Native, Expo, TypeScript
- **Backend:** Node.js, Express
- **Real-time communication:** Socket.IO
- **Integration:** Meta Graph API and Lead Ads webhooks

## Project Structure
- `mobile/` – React Native dashboard
- `backend/` – API, webhook handling, lead retrieval, and Socket.IO

## Setup

### Backend
1. Open a terminal in `backend/`.
2. Run `npm install`.
3. Configure a local `.env` file with `PORT`, `META_VERIFY_TOKEN`, `META_ACCESS_TOKEN`, `META_FORM_ID`, and `GRAPH_API_VERSION`.
4. Run `npm start`.

### Mobile
1. Open a second terminal in `mobile/`.
2. Run `npm install`.
3. Run `npx expo start`.

The default backend URL is configured for an Android emulator. Physical devices require an appropriate LAN or tunnel URL.

## Testing
- `/` – backend health check
- `/leads` – retrieve stored leads
- `/test-lead` – test the backend-to-mobile flow with sample data
- `/test-meta-lead?id=YOUR_TEST_LEAD_ID` – retrieve a specific Meta test lead

Meta webhook delivery requires valid credentials, permissions, and a publicly accessible HTTPS webhook URL.

## Security
Do not commit access tokens, credentials, or `.env` files. Development test endpoints should be secured before production deployment.

## Verification
Test the sample-data flow and Meta webhook flow separately. Only claim end-to-end Meta webhook success after verifying that an actual Meta event reaches the mobile app.
