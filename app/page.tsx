"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    startCamera();
  }, []);

  const getFingerCount = (landmarks: any) => {
    // Simple finger detection (based on tip positions)
    const tips = [8, 12, 16, 20]; // index, middle, ring, pinky
    let count = 0;

    for (let i = 0; i < tips.length; i++) {
      if (landmarks[tips[i]].y < landmarks[tips[i] - 2].y) {
        count++;
      }
    }

    return count;
  };

  const startCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    video.srcObject = stream;
    await video.play();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handsModule = await import("@mediapipe/hands");
    const Hands = handsModule.Hands;

    const hands = new Hands({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results: any) => {
      if (!video || !canvas || !ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw points
        for (const point of landmarks) {
          ctx.beginPath();
          ctx.arc(
            point.x * canvas.width,
            point.y * canvas.height,
            5,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = "red";
          ctx.fill();
        }

        // 👉 Gesture detection
        const fingers = getFingerCount(landmarks);

        let action = "STOP";

        if (fingers === 1) action = "FORWARD";
        else if (fingers === 2) action = "BACKWARD";
        else if (fingers === 3) action = "LEFT";
        else if (fingers === 4) action = "RIGHT";

        // Show action on screen
        ctx.font = "30px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText(`Action: ${action}`, 20, 50);
      }
    });

    const sendFrame = async () => {
      if (!video) return;
      await hands.send({ image: video });
      requestAnimationFrame(sendFrame);
    };

    sendFrame();
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Gesture Control System</h1>

      <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: "700px",
          border: "2px solid black",
        }}
      />
    </div>
  );
}