"""
main.py
────────
FastAPI server for the Dispatch + Rider Assignment demo.

ARCHITECTURE:
  POST /api/order/place → creates order, returns order_id
  GET  /api/order/{id}/stream → Server-Sent Events stream of dispatch progress
  GET  /api/riders → current rider statuses (for UI map)

WHY SERVER-SENT EVENTS (SSE) instead of WebSockets?
  SSE is simpler for this use case: server pushes events, client only reads.
  WebSockets are bidirectional — overkill when client doesn't send messages.
  SSE automatically reconnects on disconnect (built into browsers).
  SSE works over plain HTTP/1.1 — no upgrade handshake needed.

Run: uvicorn main:app --reload --port 8000
"""

import asyncio
import json
import logging
import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

sys.path.insert(0, os.path.dirname(__file__))

from rider_service import create_default_store
from order_queue import order_queue, OrderMessage
from dispatch_service import dispatch_order

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(message)s"
)
logger = logging.getLogger("api")

app = FastAPI(title="Dispatch Service Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rider store (shared across requests)
store = create_default_store()

# ─────────────────────────── Models ──────────────────────────────────

class PlaceOrderRequest(BaseModel):
    customer_name:  str
    user_x:         float
    user_y:         float
    restaurant:     str
    restaurant_x:   float
    restaurant_y:   float
    items:          List[str]
    amount:         float


# ─────────────────────────── Routes ──────────────────────────────────

@app.post("/api/order/place")
async def place_order(req: PlaceOrderRequest):
    """
    Place an order — creates the OrderMessage and enqueues it.

    EVENT-DRIVEN: This endpoint doesn't wait for dispatch to complete.
    It just creates the order and returns immediately.
    The client then opens the /stream endpoint to watch dispatch happen.
    """
    message = OrderMessage.create(
        customer_name=req.customer_name,
        restaurant=req.restaurant,
        user_x=req.user_x,
        user_y=req.user_y,
        restaurant_x=req.restaurant_x,
        restaurant_y=req.restaurant_y,
        items=req.items,
        amount=req.amount,
    )
    await order_queue.put(message)
    logger.info(f"[API] Order {message.order_id} placed and enqueued")
    return message.to_dict()


@app.get("/api/order/{order_id}/stream")
async def stream_dispatch(order_id: str):
    """
    Stream dispatch progress as Server-Sent Events.

    The client receives real-time updates as each step happens:
    - Riders being ranked
    - Each rider being contacted
    - Accept/Reject/Timeout outcomes
    - Final assignment or failure

    This is EVENT-DRIVEN ARCHITECTURE in action: each event triggers
    UI updates without polling.
    """

    async def event_generator():
        # Find the queued order
        message = None
        for msg in order_queue._history:
            if msg.order_id == order_id:
                message = msg
                break

        if not message:
            yield f"data: {json.dumps({'type': 'error', 'msg': 'Order not found'})}\n\n"
            return

        # Stream all dispatch events
        async for event in dispatch_order(message, store):
            yield f"data: {json.dumps(event)}\n\n"
            # Small yield to let the event loop breathe
            await asyncio.sleep(0)

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable nginx buffering
        }
    )


@app.get("/api/riders")
async def get_riders():
    """Return current rider statuses for the UI grid."""
    return {
        "riders": store.snapshot(),
        "user": {"x": 5.0, "y": 5.0},
    }


@app.post("/api/riders/{rider_id}/free")
async def free_rider(rider_id: str):
    """Reset a rider to IDLE (for demo reset)."""
    store.free_rider(rider_id)
    return {"ok": True}


@app.post("/api/reset")
async def reset():
    """Reset all riders to IDLE."""
    for rider in store.all_riders():
        store.free_rider(rider.id)
    return {"ok": True}


@app.post("/api/init")
async def init_riders():
    """Randomize 5 riders for a new session."""
    store.randomize_riders(count=5)
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
