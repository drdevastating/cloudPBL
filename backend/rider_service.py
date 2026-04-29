"""
rider_service.py
─────────────────
Manages rider data and implements the scoring function.

DISTRIBUTED SYSTEMS CONCEPTS:
  - Load Balancing: scoring function distributes orders to best-fit riders
  - Thread Safety: RiderStore uses locks to prevent race conditions
    (two orders grabbing the same rider simultaneously)
"""

import threading
import math
import time
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

logger = logging.getLogger("rider_service")


class RiderStatus(Enum):
    IDLE    = "idle"
    BUSY    = "busy"
    OFFLINE = "offline"


@dataclass
class Rider:
    id:              str
    name:            str
    phone:           str
    x:               float       # Grid x position (simulated, 0–10)
    y:               float       # Grid y position (simulated, 0–10)
    status:          RiderStatus = RiderStatus.IDLE
    rating:          float       = 4.5
    last_active_time: float      = field(default_factory=time.time)

    def is_available(self) -> bool:
        return self.status == RiderStatus.IDLE

    def euclidean_distance(self, user_x: float, user_y: float) -> float:
        """
        Euclidean distance from rider to user.
        distance = sqrt((x1-x2)^2 + (y1-y2)^2)

        In production: replace with Haversine formula for real lat/lng.
        """
        return math.sqrt((self.x - user_x) ** 2 + (self.y - user_y) ** 2)

    def idle_time_minutes(self) -> float:
        """How long the rider has been idle (in minutes)."""
        return (time.time() - self.last_active_time) / 60.0

    def to_dict(self) -> dict:
        return {
            "id":       self.id,
            "name":     self.name,
            "phone":    self.phone,
            "x":        self.x,
            "y":        self.y,
            "status":   self.status.value,
            "rating":   self.rating,
        }


def compute_score(rider: Rider, user_x: float, user_y: float, rest_x: float, rest_y: float) -> float:
    """
    Scoring function — priority based solely on minimum total distance.

    score = distance(rider -> restaurant) + distance(restaurant -> user)

    LOAD BALANCING: This matches the requirement to prioritize the closest rider
    based on the full trip distance.
    """
    dist_to_rest = rider.euclidean_distance(rest_x, rest_y)
    dist_from_rest = math.sqrt((rest_x - user_x) ** 2 + (rest_y - user_y) ** 2)
    score = dist_to_rest + dist_from_rest
    
    return round(score, 4)


class RiderStore:
    """
    Thread-safe in-memory rider registry.

    CONCURRENCY: The threading.Lock() ensures that if two orders arrive
    simultaneously, they cannot both grab the same rider. Only one will
    succeed in calling assign_rider(); the other gets False and tries next.
    """

    def __init__(self):
        self._riders: dict[str, Rider] = {}
        self._lock = threading.Lock()

    def register(self, rider: Rider):
        with self._lock:
            self._riders[rider.id] = rider

    def assign_rider(self, rider_id: str) -> bool:
        """
        Atomically mark a rider as BUSY.
        Returns False if rider was already taken (race condition guard).
        """
        with self._lock:
            rider = self._riders.get(rider_id)
            if rider and rider.is_available():
                rider.status = RiderStatus.BUSY
                return True
            return False

    def free_rider(self, rider_id: str):
        with self._lock:
            rider = self._riders.get(rider_id)
            if rider:
                rider.status = RiderStatus.IDLE
                rider.last_active_time = time.time()

    def get_available_riders(self) -> List[Rider]:
        with self._lock:
            return [r for r in self._riders.values() if r.is_available()]

    def all_riders(self) -> List[Rider]:
        with self._lock:
            return list(self._riders.values())

    def snapshot(self) -> dict:
        with self._lock:
            return {
                r.id: r.to_dict() for r in self._riders.values()
            }

    def randomize_riders(self, count: int = 5):
        """Randomize the riders in the grid, spanning 0-50."""
        import random
        with self._lock:
            self._riders.clear()
            for i in range(1, count + 1):
                rider_id = f"R{i}"
                x = round(random.uniform(0, 50), 1)
                y = round(random.uniform(0, 50), 1)
                rider = Rider(
                    id=rider_id,
                    name=f"Rider {i}",
                    phone=f"+91-981000{i}{i}{i}{i}",
                    x=x,
                    y=y,
                    rating=round(random.uniform(4.0, 5.0), 1),
                )
                self._riders[rider_id] = rider


def create_default_store() -> RiderStore:
    """
    Seed the store with 5 demo riders at random grid positions (0-50).
    """
    store = RiderStore()
    store.randomize_riders(count=5)
    return store
