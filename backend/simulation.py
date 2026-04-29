"""
simulation.py
─────────────
Simulates real rider behavior: random delay + random outcome.

This is the KEY file for your viva on:
  - Asynchronous Processing: each rider response arrives after a delay
  - Fault Tolerance: system handles reject/timeout gracefully
  - Non-blocking: asyncio.sleep() doesn't block other operations

In a real system (Swiggy/Zomato), this module would be replaced by:
  - A push notification to the rider's phone
  - A WebSocket connection waiting for their tap
  - A timeout timer running in parallel
"""

import asyncio
import random
import logging

logger = logging.getLogger("simulation")

# Probability weights for rider response simulation
ACCEPT_PROBABILITY  = 0.65   # 65% chance rider accepts
REJECT_PROBABILITY  = 0.35   # 35% chance rider rejects
TIMEOUT_PROBABILITY = 0.0    # 0% chance rider times out

TIMEOUT_SECONDS = 5.0        # Treat no response after this as timeout
MAX_RESPONSE_DELAY = 3.0     # Max random delay before rider "responds"


async def simulate_rider_response(rider_id: str, rider_name: str, force_accept: bool = False) -> str:
    """
    Simulate a rider responding to an order request.

    Returns one of: "accepted", "rejected", "timeout"

    WHY ASYNC?
    ----------
    asyncio.sleep() releases the event loop during the wait.
    This means while we're "waiting" for Rider 1, the server can:
    - Handle HTTP requests
    - Process other events
    - Update WebSocket clients
    This is non-blocking I/O — a core distributed systems pattern.

    DEADLOCK ANALYSIS (important for viva):
    ----------------------------------------
    Deadlock requires: mutual exclusion + hold-and-wait + no preemption + circular wait.
    This system avoids deadlock because:
    - Each rider request is independent (no circular resource dependency)
    - If a rider times out, we immediately move to the next — no "holding"
    - No two riders are waiting on each other
    - The queue processes orders one-at-a-time per order (sequential fallback)
    """

    if force_accept:
        logger.info(f"[SIM] Rider {rider_name} ({rider_id}) — forced to accept")
        delay = random.uniform(0.5, MAX_RESPONSE_DELAY)
        await asyncio.sleep(delay)
        return "accepted"

    # Decide outcome first, then simulate delay
    outcome_roll = random.random()

    if outcome_roll < TIMEOUT_PROBABILITY:
        # Rider will timeout — simulate them ignoring the request
        logger.info(f"[SIM] Rider {rider_name} ({rider_id}) — will timeout")
        # Wait the full timeout period, then return timeout
        await asyncio.sleep(TIMEOUT_SECONDS)
        return "timeout"
    else:
        # Rider will respond — simulate random response delay (1–3 seconds)
        delay = random.uniform(0.5, MAX_RESPONSE_DELAY)
        await asyncio.sleep(delay)

        # We already handled timeout, now just accept or reject
        # scale remaining probability
        if outcome_roll < TIMEOUT_PROBABILITY + REJECT_PROBABILITY:
            logger.info(f"[SIM] Rider {rider_name} ({rider_id}) — rejected after {delay:.1f}s")
            return "rejected"
        else:
            logger.info(f"[SIM] Rider {rider_name} ({rider_id}) — accepted after {delay:.1f}s")
            return "accepted"
