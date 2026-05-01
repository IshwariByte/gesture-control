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

        let action = "NO HAND DETECTED";

        if (results?.multiHandLandmarks?.length > 0) {
          const landmarks = results.multiHandLandmarks[0];

          // draw points
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

          // improved finger detection (thumb + fingers)
          const fingers = [
            landmarks[4].x < landmarks[3].x, // thumb
            landmarks[8].y < landmarks[6].y, // index
            landmarks[12].y < landmarks[10].y, // middle
            landmarks[16].y < landmarks[14].y, // ring
            landmarks[20].y < landmarks[18].y, // pinky
          ].filter(Boolean).length;

          if (fingers === 1) action = "FORWARD";
          else if (fingers === 2) action = "BACKWARD";
          else if (fingers === 3) action = "LEFT";
          else if (fingers === 4) action = "RIGHT";
          else action = "STOP";
        }

        // always show action
        ctx.font = "30px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText(`Action: ${action}`, 20, 50);
      });

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