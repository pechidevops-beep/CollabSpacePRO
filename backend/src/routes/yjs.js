import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils"; // Uses yjs internally

export function attachYjsWS(server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (!url.pathname.startsWith("/ws/yjs/")) {
            return;
        }

        // We encode the room name in the URL: /ws/yjs/some-room-guid
        const docName = url.pathname.replace("/ws/yjs/", "");

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req, { docName });
        });
    });

    wss.on("connection", (conn, req, { docName }) => {
        setupWSConnection(conn, req, { docName, gc: true });
    });
}
