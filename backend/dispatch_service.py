"""
dispatch_service.py
────────────────────
The core dispatch algorithm — the most important file for your viva.

DISTRIBUTED SYSTEMS CONCEPTS IMPLEMENTED:
  1. Asynchronous Processing  — asyncio throughout, non-blocking rider requests
  2. Event-Driven Architecture — order placed → dispatch → rider response → next step
  3. Fault Tolerance          — retry on reject/timeout, fallback to next rider
  4. Concurrency              — asyncio.gather could run multiple dispatches
  5. Message Queue            — consumes from OrderQueue
  6. Load Balancing           — scoring function picks best rider
  7. Deadlock Avoidance       — no circular waits, sequential fallback, timeouts

FLOW:
  place_order()
    → enqueue to order_queue
    → dispatch_order() picks up the message
    → find_and_rank_riders() scores all idle riders
    → for each rider (best first):
        → simulate_rider_response() [ASYNC, with timeout]
        → accepted? → assign, stream "rider_assigned" event
        → rejected/timeout? → log it, try next rider
    → no riders? → stream "order_failed" event
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional

from rider_service import RiderStore, Rider, compute_score, create_default_store
from order_queue import OrderQueue, OrderMessage, order_queue
from simulation import simulate_rider_response

logger = logging.getLogger("dispatch_service")

# How long to wait for a rider before treating as timeout (seconds)
RIDER_TIMEOUT_SECONDS = 5.0


def find_and_rank_riders(store: RiderStore, user_x: float, user_y: float, rest_x: float, rest_y: float) -> list[tuple[float, Rider]]:
    """
    Score all idle riders and return sorted list (lowest score = best).

    LOAD BALANCING: This is the scoring/ranking step.
    We don't just pick the nearest rider — we balance distance, rating,
    and how long they've been waiting (fairness).

    Returns: [(score, rider), ...] sorted ascending by score
    """
    available = store.get_available_riders()
    if not available:
        return []

    scored = []
    for rider in available:
        score = compute_score(rider, user_x, user_y, rest_x, rest_y)
        scored.append((score, rider))

    # Sort ascending — lowest score = best candidate
    scored.sort(key=lambda x: x[0])
    return scored


async def dispatch_order(
    message: OrderMessage,
    store: RiderStore
) -> AsyncGenerator[dict, None]:
    """
    Core dispatch algorithm — an async generator that yields log events.

    Using an async generator means the caller (SSE stream) gets real-time
    updates as each step completes. This is event-driven architecture in action.

    FAULT TOLERANCE: If a rider rejects or times out, we catch that and
    continue to the next candidate. The system never crashes — it degrades
    gracefully to "no riders available" as a last resort.
    """

    yield {"type": "log", "level": "info",
           "msg": f"📦 Order received: {message.order_id}"}
    yield {"type": "log", "level": "info",
           "msg": f"🔍 Scanning for available riders..."}

    await asyncio.sleep(0.3)  # Brief pause for dramatic effect

    # ── Step 1: Score and rank riders ─────────────────────────────────
    ranked = find_and_rank_riders(store, message.user_x, message.user_y, message.restaurant_x, message.restaurant_y)

    if not ranked:
        yield {"type": "log", "level": "error",
               "msg": "❌ No riders available in the area."}
        yield {"type": "order_failed",
               "order_id": message.order_id,
               "reason": "No riders available"}
        return

    yield {"type": "log", "level": "info",
           "msg": f"📊 Found {len(ranked)} available riders. Ranking by score..."}

    # Emit the ranked rider list for the UI map
    yield {
        "type": "riders_ranked",
        "riders": [
            {
                "id":     r.id,
                "name":   r.name,
                "x":      r.x,
                "y":      r.y,
                "score":  round(score, 3),
                "rating": r.rating,
                "status": "candidate",
            }
            for score, r in ranked
        ]
    }

    await asyncio.sleep(0.4)

    # ── Step 2: Try each rider in order ───────────────────────────────
    for attempt, (score, rider) in enumerate(ranked):
        rank = attempt + 1

        yield {"type": "log", "level": "info",
               "msg": f"🏍️  [{rank}/{len(ranked)}] Contacting {rider.name} (score: {score})..."}
        yield {"type": "trying_rider", "rider_id": rider.id, "attempt": rank}

        await asyncio.sleep(0.2)

        # ASYNC rider request with timeout ──────────────────────────
        # asyncio.wait_for() adds a hard timeout on top of the simulation.
        # This is FAULT TOLERANCE — we never wait forever for a rider.
        # Even if the simulate function hangs, we'll still move on.
        is_last = (attempt == len(ranked) - 1)
        try:
            outcome = await asyncio.wait_for(
                simulate_rider_response(rider.id, rider.name, force_accept=is_last),
                timeout=RIDER_TIMEOUT_SECONDS + 0.5  # Slightly more than sim timeout
            )
        except asyncio.TimeoutError:
            outcome = "timeout"

        # ── Handle outcome ─────────────────────────────────────────────
        if outcome == "accepted":
            # Atomically mark rider as busy (thread-safe)
            success = store.assign_rider(rider.id)
            if not success:
                # Race condition: another order grabbed this rider
                yield {"type": "log", "level": "warn",
                       "msg": f"⚡ {rider.name} was taken by another order — retrying..."}
                yield {"type": "rider_response", "rider_id": rider.id, "outcome": "taken"}
                continue

            yield {"type": "log", "level": "success",
                   "msg": f"✅ {rider.name} accepted! Assigned to your order."}
            yield {
                "type": "rider_assigned",
                "rider": {
                    "id":     rider.id,
                    "name":   rider.name,
                    "phone":  rider.phone,
                    "x":      rider.x,
                    "y":      rider.y,
                    "rating": rider.rating,
                    "score":  score,
                },
                "order_id": message.order_id,
                "eta_minutes": _estimate_eta(rider, message),
            }
            return  # SUCCESS — stop trying more riders

        elif outcome == "rejected":
            yield {"type": "log", "level": "warn",
                   "msg": f"🚫 {rider.name} rejected the order."}
            yield {"type": "rider_response", "rider_id": rider.id, "outcome": "rejected"}

        else:  # timeout
            yield {"type": "log", "level": "warn",
                   "msg": f"⏱️  {rider.name} didn't respond (timeout)."}
            yield {"type": "rider_response", "rider_id": rider.id, "outcome": "timeout"}

        await asyncio.sleep(0.2)

    # ── Step 3: All riders exhausted ──────────────────────────────────
    yield {"type": "log", "level": "error",
           "msg": "❌ All riders rejected or timed out. No rider available."}
    yield {"type": "order_failed",
           "order_id": message.order_id,
           "reason": "All available riders rejected the order"}


def _estimate_eta(rider: Rider, message: OrderMessage) -> int:
    """
    Simple ETA estimate based on Euclidean distance.
    Assumes average speed of 1 grid unit per minute.
    In production: use Google Maps Distance Matrix API.
    """
    import math
    # Distance from rider to restaurant
    d1 = math.sqrt((rider.x - message.restaurant_x)**2 + (rider.y - message.restaurant_y)**2)
    # Distance from restaurant to user
    d2 = math.sqrt((message.restaurant_x - message.user_x)**2 + (message.restaurant_y - message.user_y)**2)
    total = d1 + d2
    # 1 grid unit ≈ 2 minutes, plus 5 min prep time
    return int(total * 2) + 5
