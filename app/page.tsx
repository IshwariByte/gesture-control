"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      video.srcObject = stream;
      await video.play();

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Load MediaPipe Hands
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
        if (!canvas || !ctx || !video) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
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
          }
        }
      });

      // Simple frame loop (NO camera_utils)
      const sendFrame = async () => {
        if (!video) return;
        await hands.send({ image: video });
        requestAnimationFrame(sendFrame);
      };

      sendFrame();
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Gesture Control System</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

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