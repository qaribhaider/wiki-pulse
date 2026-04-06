## 0. Initial Setup (Manual Task)
Before running the app for the first time on Aiven, you must create the topics with the correct partition and retention settings.

### Run Setup Script:
```bash
npm run setup
```
This ensures topics are created with 2 partitions and 1-minute retention.

## 1. Automated Unit Tests
We use **Vitest** for fast, high-signal logic verification. These tests cover:
- **Slimming Logic**: Ensures raw Wikipedia events are correctly minimalist.
- **Aggregation Window**: Verifies the metric recalculations (bot counts, language leaderboard).
- **Activity Spike Radar**: Confirms the threshold logic (3 edits / 10s) works.

### Run Tests:
```bash
cd backend
npm test
```

## 2. Manual Simulation (Mock SSE)
Wikipedia's stream is unpredictable. To force-test specific scenarios like a "Language Race" or "Activity Spike Radar" triggers, use the Mock SSE server.

### Full End-to-End Test (Simulation Mode):
To verify the entire pipeline (Slimming -> Aggregation -> Alerting -> WebSocket) without waiting for real Wikipedia events:

1. **Terminal 1 (Mock SSE)**: `npm run mock-server`
2. **Terminal 2 (Producer)**: `npm run producer:mock`
3. **Terminal 3 (Aggregator)**: `npm run aggregator`
4. **Terminal 4 (Alerts)**: `npm run alerts`
5. **Terminal 5 (Gateway)**: `npm run start`

**Verification**:
- Check the **Alerts** terminal for `Edit War Alert`.
- Check the **Aggregator** terminal for metrics updates.
- Connect to `ws://localhost:3001/ws` (see section 3) to see the final merged stream.

## 3. Real-Time WebSocket Observation
The dashboard receives metrics and alerts via WebSockets from the Gateway.

### Steps:
1. Ensure `backend/.env` has valid Aiven credentials.
2. Start the stack: `npm run dev` (or `docker-compose up`).
3. Open a browser console or Postman and connect to `ws://localhost:3001/ws`.
4. Run the following snippet to see incoming pulses:
   ```javascript
   const socket = new WebSocket('ws://localhost:3001/ws');
   socket.onmessage = (e) => console.log('WIKI PULSE UPDATED:', JSON.parse(e.data));
   ```

## 4. Production Checklist (Aiven)
- [ ] `backend/certs/` contains `ca.pem`, `service.cert`, and `service.key`.
- [ ] `backend/.env` correctly points to the `KAFKA_BROKER` and `SCHEMA_REGISTRY_URL`.
- [ ] Karapace (Schema Registry) is enabled in the Aiven console.
