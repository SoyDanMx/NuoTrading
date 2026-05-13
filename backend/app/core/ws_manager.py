import logging
from typing import List
from fastapi import WebSocket
import json

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket connection. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        msg_str = json.dumps(message)
        logger.info(f"Broadcasting to {len(self.active_connections)} connections: {message.get('type')}")
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_str)
            except Exception as e:
                logger.error(f"Error sending message to connection: {e}")
                # We don't remove here to avoid modifying list during iteration
                # but we'll cleanup in the next loop or on disconnect

# Singleton manager
manager = ConnectionManager()
