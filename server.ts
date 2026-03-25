import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";

// Try to load Firebase config from file, fallback to environment variables
let firebaseApiKey = process.env.VITE_FIREBASE_API_KEY;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    firebaseApiKey = firebaseConfig.apiKey;
  }
} catch (e) {
  console.log("No firebase-applet-config.json found, using environment variables.");
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  }
});

const PORT = 3000;

app.use(express.json());

// Socket.io logic
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_order", (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`User joined order: ${orderId}`);
  });

  socket.on("update_location", ({ orderId, location }) => {
    io.to(`order_${orderId}`).emit("location_update", location);
  });

  socket.on("update_status", ({ orderId, status }) => {
    io.to(`order_${orderId}`).emit("status_update", status);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// APIs
app.get("/api/distance-matrix", async (req, res) => {
  const { origins, destinations } = req.query;
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || firebaseApiKey;
  
  if (!apiKey) {
    // Mock response if no API key
    return res.json({
      rows: [{
        elements: [{
          duration: { text: "15 mins" },
          distance: { text: "2.4 km" }
        }]
      }]
    });
  }

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch distance matrix" });
  }
});

app.post("/api/location/update", (req, res) => {
  const { orderId, lat, lng } = req.body;
  // In a real app, you might save this to a DB or broadcast it
  // Here we just acknowledge it as Firestore is also being updated
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
