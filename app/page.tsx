"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // MediaPipe imports
      const handsModule = await import("@mediapipe/hands");
      const drawingModule = await import("@mediapipe/drawing_utils");

      const Hands = handsModule.Hands;
      const HAND_CONNECTIONS = handsModule.HAND_CONNECTIONS;
      const drawConnectors = drawingModule.drawConnectors;
      const drawLandmarks = drawingModule.drawLandmarks;

      // ESP IP (CHANGE THIS)
      const ESP_IP = "http://192.168.137.61";

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      video.srcObject = stream;
      await video.play();

      // Setup MediaPipe
      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      let prevCommand = "";
      let stableCount = 0;

      function send(url) {
        fetch(url).catch(() => {});
      }

      // Count fingers
      function countFingers(lm) {
        let fingers = [];

        // Thumb
        if (lm[4].x > lm[3].x) fingers.push(1);
        else fingers.push(0);

        // Other fingers
        for (let i = 8; i <= 20; i += 4) {
          if (lm[i].y < lm[i - 2].y) fingers.push(1);
          else fingers.push(0);
        }

        return fingers.reduce((a, b) => a + b, 0);
      }

      // Process results
      hands.onResults((results) => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let command = "NONE";

        if (results.multiHandLandmarks?.length > 0) {
          const lm = results.multiHandLandmarks[0];

          drawConnectors(ctx, lm, HAND_CONNECTIONS, {
            color: "cyan",
            lineWidth: 3,
          });

          drawLandmarks(ctx, lm, {
            color: "yellow",
            lineWidth: 2,
          });

          let total = countFingers(lm);

          // 🚗 CAR CONTROL LOGIC
          if (total === 1) command = "FORWARD";
          else if (total === 2) command = "BACKWARD";
          else if (total === 3) command = "LEFT";
          else if (total === 4) command = "RIGHT";
          else if (total === 5) command = "STOP";
        }

        // Stability filter (prevents flickering)
        if (command === prevCommand) {
          stableCount++;
        } else {
          stableCount = 0;
        }

        if (stableCount > 7) {
          if (command !== "NONE") {
            console.log(command);

            if (command === "FORWARD")
              send(ESP_IP + "/forward");

            else if (command === "BACKWARD")
              send(ESP_IP + "/backward");

            else if (command === "LEFT")
              send(ESP_IP + "/left");

            else if (command === "RIGHT")
              send(ESP_IP + "/right");

            else if (command === "STOP")
              send(ESP_IP + "/stop");

            stableCount = 0;
          }
        }

        prevCommand = command;

        // Show text on screen
        ctx.fillStyle = "yellow";
        ctx.font = "30px Arial";
        ctx.fillText(command, 20, 50);
      });

      // Loop
      async function loop() {
        await hands.send({ image: video });
        requestAnimationFrame(loop);
      }

      loop();
    };

    start();
  }, []);

  return (
    <div style={{ textAlign: "center", background: "black", height: "100vh" }}>
      <h1 style={{ color: "cyan" }}>🚗 Gesture Car Control</h1>

      <video ref={videoRef} style={{ display: "none" }} />

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ border: "2px solid cyan" }}
      />
    </div>
  );
}