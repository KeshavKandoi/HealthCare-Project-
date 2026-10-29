# Heartline cinematic film integration

## Current status
The public website redesign and a scroll-seeking video component are implemented. No reference video or licensed camera-animation asset was present in the supplied attachment (the attachment is a text brief). The original anatomical-heart PNG remains a **static fallback**, not a claimed 3D animation. No artificial camera zoom is applied to the PNG. Without a film, the long pinned region is disabled.

## Required deliverable
Supply an original or licensed anatomical-heart camera animation, with permission for web distribution. Keep its source/license record here. Do not use a Pinterest screen recording.

- 12–18 seconds; silent; no embedded text, UI or watermark.
- Deep navy background (#071326), electric-blue/cyan rim light, restrained violet vessels.
- First 35%: full anatomical heart on the right; empty left side for the headline.
- 35–68%: camera approaches and moves into a stylized luminous structure; caption overlays on left.
- 68–100%: transition to digital signal imagery, with left caption space.
- Do not encode fake patient measurements, unsupported clinical claims or a fabricated dashboard.
- Suggested desktop size: 1600×1000; keep essential composition safe for narrow crops.
- H.264 MP4, yuv420p, faststart, frequent keyframes (at least every 0.2 seconds). Balance file size against seek latency; target below 10 MB.
- Start and end on valid frames. Test seeking backward as well as forward.

Install under `HEALTHCARE/HealthCare/public/heartline-camera.mp4` and set `VITE_HEART_FILM_URL=/heartline-camera.mp4` in the frontend build environment. This is a public asset URL, never a credential. Rebuild the frontend.

The component maps normalized section scroll to media time, with one scheduled animation frame per event and seek completion reconciliation. It removes event handlers on unmount, keeps the poster visible until media loads, falls back on media errors, and does not download video for reduced-motion users. Camera motion must be rendered **in the video**, not inferred from the PNG. On mobile the pinned duration is shortened. The video should be tested on low-end hardware; use the static fallback if seek performance is poor.

## Still required for complete acceptance
- Actual licensed camera animation and matching poster.
- Actual anonymous product screenshot (no private medical records) for the requested product preview; current page uses clearly identified workflow illustrations rather than invented UI.
- Review against the user's video once available.
- Forward/reverse seeking, mobile crop, reduced-motion, network failure and slow-device tests with the real clip.
