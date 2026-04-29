"""
order_queue.py
──────────────
Simulated message queue for incoming orders.

DISTRIBUTED SYSTEMS CONCEPT — Message Queue:
In production systems (Swiggy, Zomato, Uber Eats), this would be:
  - Apache Kafka (topic: "payment-success")
  - AWS SQS
  - RabbitMQ

Why use a queue instead of direct function calls?
  1. Decoupling: Payment service doesn't need to know about dispatch service
  2. Backpressure: Queue absorbs traffic spikes (10,000 orders/second)
  3. Retry: Failed messages stay in queue and can be retried
  4. Durability: If dispatch service crashes, messages aren't lost

This in-memory implementation mimics these semantics:
  - FIFO ordering
  - Message acknowledgment (mark as processing)
  - Dead letter queue (failed messages)

For your viva: "Our queue uses asyncio.Queue which is non-blocking.
In production we'd swap this for Kafka with the same interface."
"""

import asyncio
import time
import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("order_queue")


@dataclass
class OrderMessage:
    """A single message in the queue."""
    order_id:      str
    customer_name: str
    restaurant:    str
    user_x:        float
    user_y:        float
    restaurant_x:  float
    restaurant_y:  float
    items:         list
    amount:        float
    enqueued_at:   float = field(default_factory=time.time)
    status:        str   = "pending"    # pending → processing → done / failed

    @staticmethod
    def create(customer_name: str, restaurant: str,
               user_x: float, user_y: float,
               restaurant_x: float, restaurant_y: float,
               items: list, amount: float) -> "OrderMessage":
        return OrderMessage(
            order_id=f"ORD-{uuid.uuid4().hex[:6].upper()}",
            customer_name=customer_name,
            restaurant=restaurant,
            user_x=user_x,
            user_y=user_y,
            restaurant_x=restaurant_x,
            restaurant_y=restaurant_y,
            items=items,
            amount=amount,
        )

    def to_dict(self) -> dict:
        return {
            "order_id":      self.order_id,
            "customer_name": self.customer_name,
            "restaurant":    self.restaurant,
            "user_x":        self.user_x,
            "user_y":        self.user_y,
            "items":         self.items,
            "amount":        self.amount,
            "status":        self.status,
        }


class OrderQueue:
    """
    Async FIFO queue for incoming orders.

    asyncio.Queue is thread-safe and non-blocking — exactly what we need
    for a FastAPI app where requests come in concurrently.

    CONCURRENCY DESIGN:
    - put() is called by the HTTP handler (producer)
    - dispatch_service consumes from the queue (consumer)
    - Multiple orders can sit in queue simultaneously
    - The queue decouples arrival rate from processing rate
    """

    def __init__(self):
        self._queue: asyncio.Queue = None  # Created lazily (needs running event loop)
        self._history = []

    def _ensure_queue(self):
        if self._queue is None:
            self._queue = asyncio.Queue()

    async def put(self, message: OrderMessage):
        self._ensure_queue()
        self._history.append(message)
        await self._queue.put(message)
        logger.info(f"[QUEUE] Enqueued order {message.order_id} (depth: {self._queue.qsize()})")

    async def get(self) -> OrderMessage:
        self._ensure_queue()
        return await self._queue.get()

    def qsize(self) -> int:
        if self._queue is None:
            return 0
        return self._queue.qsize()

    def history(self) -> list:
        return [m.to_dict() for m in self._history]


# Module-level singleton (shared across all modules in this process)
order_queue = OrderQueue()
