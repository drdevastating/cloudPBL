# SwiftDispatch — Distributed Systems Demo
### PBL: Fundamentals of Distributed Systems
#### Module: Dispatch Service + Rider Assignment

---

## 🚀 Quick Start

### 1. Backend (Python)
```bash
cd backend
pip install -r requirements.txt
python main.py
# Backend runs at http://localhost:8000
```

### 2. Frontend (React)
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Open browser
Go to `http://localhost:5173`

---

## 🗂️ File Structure

```
backend/
  main.py              ← FastAPI server, HTTP + SSE endpoints
  dispatch_service.py  ← Core dispatch algorithm (MOST IMPORTANT)
  rider_service.py     ← Rider data + scoring function
  order_queue.py       ← Simulated message queue
  simulation.py        ← Async rider behavior simulation
  requirements.txt

frontend/
  src/App.jsx          ← Complete React UI (single file)
  src/main.jsx
  index.html
  vite.config.js
  package.json
```

---

## 🎯 What Happens When You Place an Order

```
1. POST /api/order/place
   → Creates OrderMessage
   → Enqueues to OrderQueue

2. GET /api/order/{id}/stream  (Server-Sent Events)
   → find_and_rank_riders() scores all idle riders
   → For each rider (best score first):
       → simulate_rider_response() [ASYNC]
       → 70% accept → assign, done
       → 20% reject → try next
       → 10% timeout (5s) → try next
   → No riders left → order_failed

3. UI receives real-time events and shows live log
```

---

## 🧠 Distributed Systems Concepts (Viva Answers)

### 1. Asynchronous Processing
**Code:** `simulation.py` — `simulate_rider_response()` uses `asyncio.sleep()`

"Rider responses are non-blocking. While we wait for Rider 1 to respond,
the server's event loop can handle other HTTP requests. This is async I/O."

---

### 2. Event-Driven Architecture
**Code:** `main.py` → `dispatch_service.py` → `simulation.py`

"Order placed → event dispatched → rider response event → UI update event.
No polling — each step triggers the next. We use Server-Sent Events (SSE)
to push updates to the browser in real-time."

---

### 3. Fault Tolerance
**Code:** `dispatch_service.py` — the for loop with continue on reject/timeout

"If a rider rejects or times out, we catch that outcome and try the next
candidate. The system never crashes — it degrades gracefully to
'no riders available' as a last resort."

---

### 4. Concurrency
**Code:** `rider_service.py` — `RiderStore.assign_rider()` uses `threading.Lock()`

"Two orders arriving simultaneously could both try to grab the same rider.
The Lock() ensures only one succeeds — the other gets False and tries next.
This prevents double-booking (a consistency violation)."

---

### 5. Message Queue
**Code:** `order_queue.py` — `OrderQueue` wraps `asyncio.Queue`

"The queue decouples the HTTP handler (producer) from the dispatch logic
(consumer). In production this would be Kafka or SQS. Benefits: backpressure
handling, retry on failure, and orders survive if dispatch service restarts."

---

### 6. Deadlock Analysis
**Why deadlock DOES NOT occur here:**
- Mutual exclusion: riders are locked but only briefly during assign_rider()
- No hold-and-wait: we try one rider at a time, never hold one while waiting for another
- Preemption: timeouts force release after 5 seconds
- No circular wait: riders don't wait on each other

"In a system where Rider A waits for Order lock AND Order waits for Rider A lock,
deadlock could occur. We avoid this by never holding locks across async waits."

---

### 7. Load Balancing
**Code:** `rider_service.py` — `compute_score()`

```python
score = 0.5 * distance + 0.3 * (1/rating) + 0.2 * (1/idle_time)
```

"We don't just pick the nearest rider. The scoring function balances:
- Distance (50% weight): prefer nearby
- Rating (30% weight): prefer reliable riders
- Idle time (20% weight): prefer riders who've been waiting longer (fairness)
This distributes work more fairly — load balancing."

---

## 📊 Sample Log Output

```
12:34:01  📦 Order received: ORD-A1B2C3
12:34:01  🔍 Scanning for available riders...
12:34:02  📊 Found 8 available riders. Ranking by score...
12:34:02  🏍️  [1/8] Contacting Vikram Singh (score: 0.187)...
12:34:03  🚫 Vikram Singh rejected the order.
12:34:03  🏍️  [2/8] Contacting Priya Sharma (score: 0.873)...
12:34:04  ✅ Priya Sharma accepted! Assigned to your order.
```

---

## ⚙️ Key Design Decisions

| Decision | Why |
|---|---|
| SSE instead of WebSockets | SSE is simpler for server→client push; no bidirectional needed |
| asyncio.Queue | Non-blocking; event loop stays free for HTTP requests |
| threading.Lock in RiderStore | asyncio is single-threaded but FastAPI uses thread pools |
| Scoring over pure distance | Load balancing — distributes work fairly |
| Generator pattern in dispatch | Yields events lazily — no buffering all results in memory |

---

## 🔧 No Google Maps Required!
The UI uses an SVG grid (0-10 x 0-10) to visualize rider positions.
Riders have (x, y) coordinates instead of lat/lng.
Distance is Euclidean: `sqrt((x1-x2)² + (y1-y2)²)`
