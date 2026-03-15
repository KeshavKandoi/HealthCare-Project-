from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import cv2
import numpy as np
import pandas as pd
from skimage.feature import hog
import io
import os
import tempfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "saved_models")

spiral_model = joblib.load(os.path.join(MODELS_DIR, "spiral_model.pkl"))
wave_model   = joblib.load(os.path.join(MODELS_DIR, "wave_model.pkl"))
voice_model  = joblib.load(os.path.join(MODELS_DIR, "voice_model.pkl"))
gait_model   = joblib.load(os.path.join(MODELS_DIR, "gait_model.pkl"))

print("✅ All 4 models loaded")

# UCI parkinsons.data feature column order (must match training)
VOICE_FEATURE_COLS = [
    "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)",
    "MDVP:Jitter(%)", "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ", "Jitter:DDP",
    "MDVP:Shimmer", "MDVP:Shimmer(dB)", "Shimmer:APQ3", "Shimmer:APQ5",
    "MDVP:APQ", "Shimmer:DDA", "NHR", "HNR",
    "RPDE", "DFA", "spread1", "spread2", "D2", "PPE"
]


# ─────────────────────────────────────────────
# Helper: extract UCI-compatible features from audio using librosa
# ─────────────────────────────────────────────
def extract_voice_features_from_audio(audio_path: str) -> pd.DataFrame:
    try:
        import librosa
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="librosa not installed. Run: pip install librosa soundfile"
        )

    try:
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not load audio: {str(e)}")

    if len(y) < sr * 0.5:
        raise HTTPException(status_code=400, detail="Audio too short — record at least 1 second")

    # ── Fundamental frequency (F0) via YIN ──
    f0 = librosa.yin(y, fmin=50, fmax=500)
    f0_voiced = f0[f0 > 0]
    if len(f0_voiced) == 0:
        f0_voiced = np.array([120.0])

    fo  = float(np.mean(f0_voiced))
    fhi = float(np.max(f0_voiced))
    flo = float(np.min(f0_voiced))

    # ── Jitter: cycle-to-cycle F0 variation ──
    if len(f0_voiced) > 1:
        jitter_abs  = float(np.mean(np.abs(np.diff(f0_voiced))))
        jitter_pct  = float(jitter_abs / fo * 100) if fo > 0 else 0.0
        jitter_rap  = float(np.mean([abs(f0_voiced[i] - np.mean(f0_voiced[max(0,i-1):i+2]))
                                     for i in range(1, len(f0_voiced)-1)])) / fo if fo > 0 else 0.0
        jitter_ppq  = jitter_rap * 0.9
        jitter_ddp  = jitter_rap * 3.0
    else:
        jitter_abs = jitter_pct = jitter_rap = jitter_ppq = jitter_ddp = 0.0

    # ── Shimmer: amplitude variation ──
    rms = librosa.feature.rms(y=y)[0]
    if len(rms) > 1:
        shimmer     = float(np.mean(np.abs(np.diff(rms))) / (np.mean(rms) + 1e-8))
        shimmer_db  = float(20 * np.log10(shimmer + 1e-8) * -1)
        shimmer_apq3 = shimmer * 0.8
        shimmer_apq5 = shimmer * 0.85
        shimmer_apq  = shimmer * 0.9
        shimmer_dda  = shimmer_apq3 * 3.0
    else:
        shimmer = shimmer_db = shimmer_apq3 = shimmer_apq5 = shimmer_apq = shimmer_dda = 0.0

    # ── NHR / HNR: noise-to-harmonics ratio ──
    harmonic, percussive = librosa.effects.hpss(y)
    harmonic_energy   = float(np.mean(harmonic ** 2) + 1e-8)
    noise_energy      = float(np.mean(percussive ** 2) + 1e-8)
    nhr  = noise_energy / harmonic_energy
    hnr  = float(10 * np.log10(harmonic_energy / noise_energy + 1e-8))

    # ── Nonlinear dynamics (approximations) ──
    mfccs  = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    rpde   = float(np.std(mfccs[0]) / (np.mean(np.abs(mfccs[0])) + 1e-8))
    dfa    = float(np.polyfit(np.log(np.arange(1, len(rms)+1) + 1),
                              np.log(np.cumsum(rms - np.mean(rms)) ** 2 + 1e-8), 1)[0])
    dfa    = float(np.clip(dfa, 0.5, 1.0))

    # ── Spread / D2 / PPE (spectral features) ──
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    spread1 = float(np.mean(spectral_centroid) / sr * -10)
    spread2 = float(np.std(spectral_centroid) / sr)
    d2      = float(np.mean(mfccs[1]) / 10)
    ppe     = float(np.std(f0_voiced) / (fo + 1e-8))

    features = {
        "MDVP:Fo(Hz)":      fo,
        "MDVP:Fhi(Hz)":     fhi,
        "MDVP:Flo(Hz)":     flo,
        "MDVP:Jitter(%)":   jitter_pct,
        "MDVP:Jitter(Abs)": jitter_abs,
        "MDVP:RAP":         jitter_rap,
        "MDVP:PPQ":         jitter_ppq,
        "Jitter:DDP":       jitter_ddp,
        "MDVP:Shimmer":     shimmer,
        "MDVP:Shimmer(dB)": shimmer_db,
        "Shimmer:APQ3":     shimmer_apq3,
        "Shimmer:APQ5":     shimmer_apq5,
        "MDVP:APQ":         shimmer_apq,
        "Shimmer:DDA":      shimmer_dda,
        "NHR":              nhr,
        "HNR":              hnr,
        "RPDE":             rpde,
        "DFA":              dfa,
        "spread1":          spread1,
        "spread2":          spread2,
        "D2":               d2,
        "PPE":              ppe,
    }

    return pd.DataFrame([features], columns=VOICE_FEATURE_COLS)


# ─────────────────────────────────────────────
# Helper: image bytes → HOG features
# ─────────────────────────────────────────────
def image_to_hog(contents: bytes):
    np_arr = np.frombuffer(contents, np.uint8)
    image  = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    image = cv2.resize(image, (128, 128))
    return hog(image)


# ─────────────────────────────────────────────
# Helper: extract gait features from video
# ─────────────────────────────────────────────
def extract_gait_features_from_video(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Could not open video file")
    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, (160, 120))
        frames.append(gray)
    cap.release()
    if len(frames) < 5:
        raise HTTPException(status_code=400, detail="Video too short — need at least 5 frames")

    flow_magnitudes = []
    for i in range(1, len(frames)):
        flow = cv2.calcOpticalFlowFarneback(frames[i-1], frames[i], None, 0.5, 3, 15, 3, 5, 1.2, 0)
        magnitude, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        flow_magnitudes.append(magnitude)

    flow_arr = np.array(flow_magnitudes)
    H, W = flow_arr.shape[1], flow_arr.shape[2]
    rh = H // 3
    rw = W // 6

    # ── Scale video motion values to match PhysioNet sensor data range ──
    # PhysioNet sensors: mean ~50-150, std ~10-50, max ~200-750
    # Video optical flow: mean ~0.1-0.5, std ~0.3-1.0, max ~5-20
    # Scale factor brings video features into sensor range
    SCALE = 300.0

    features = []
    for r in range(3):
        for c in range(6):
            zone = flow_arr[:, r*rh:(r+1)*rh, c*rw:(c+1)*rw].flatten()
            features.extend([
                float(np.mean(zone)  * SCALE),
                float(np.std(zone)   * SCALE),
                float(np.min(zone)   * SCALE),
                float(np.max(zone)   * SCALE),
            ])
    return features


@app.get("/")
def home():
    return {"message": "Parkinson AI Server Running"}


# ─────────────────────────────────────────────
# SPIRAL
# ─────────────────────────────────────────────
@app.post("/predict/spiral")
async def predict_spiral(file: UploadFile = File(...)):
    try:
        features = image_to_hog(await file.read())
        pred = spiral_model.predict([features])[0]
        prob = spiral_model.predict_proba([features])[0][int(pred)]
        return {"prediction": int(pred), "result": "Parkinson Detected" if pred == 1 else "Healthy",
                "confidence": round(float(prob), 4)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# WAVE
# ─────────────────────────────────────────────
@app.post("/predict/wave")
async def predict_wave(file: UploadFile = File(...)):
    try:
        features = image_to_hog(await file.read())
        pred = wave_model.predict([features])[0]
        prob = wave_model.predict_proba([features])[0][int(pred)]
        return {"prediction": int(pred), "result": "Parkinson Detected" if pred == 1 else "Healthy",
                "confidence": round(float(prob), 4)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# VOICE — accepts BOTH audio files AND CSV
# ─────────────────────────────────────────────
@app.post("/predict/voice")
async def predict_voice(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = (file.filename or "").lower()

        # ── Detect file type ──
        is_audio = any(filename.endswith(ext) for ext in
                       [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac", ".aac"])
        is_csv   = any(filename.endswith(ext) for ext in [".csv", ".data", ".txt"])

        if is_audio:
            # Save to temp file and extract features with librosa
            suffix = os.path.splitext(filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name
            try:
                sample_df = extract_voice_features_from_audio(tmp_path)
            finally:
                os.unlink(tmp_path)

        elif is_csv:
            # Parse CSV directly
            try:
                text = contents.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400,
                    detail="Could not decode file. Upload a CSV or an audio file (.wav, .m4a, .webm, .mp3)")
            df        = pd.read_csv(io.StringIO(text))
            drop_cols = [c for c in ["name", "status"] if c in df.columns]
            sample_df = df.drop(columns=drop_cols).iloc[[0]]

        else:
            # Try CSV first, then treat as audio
            try:
                text      = contents.decode("utf-8")
                df        = pd.read_csv(io.StringIO(text))
                drop_cols = [c for c in ["name", "status"] if c in df.columns]
                sample_df = df.drop(columns=drop_cols).iloc[[0]]
            except Exception:
                suffix = ".webm"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(contents)
                    tmp_path = tmp.name
                try:
                    sample_df = extract_voice_features_from_audio(tmp_path)
                finally:
                    os.unlink(tmp_path)

        pred = voice_model.predict(sample_df)[0]
        prob = voice_model.predict_proba(sample_df)[0][int(pred)]
        return {"prediction": int(pred), "result": "Parkinson Detected" if pred == 1 else "Healthy",
                "confidence": round(float(prob), 4)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# GAIT
# ─────────────────────────────────────────────
@app.post("/predict/gait")
async def predict_gait(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        suffix   = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        try:
            features = extract_gait_features_from_video(tmp_path)
        finally:
            os.unlink(tmp_path)
        pred = gait_model.predict([features])[0]
        prob = gait_model.predict_proba([features])[0][int(pred)]
        return {"prediction": int(pred), "result": "Parkinson Detected" if pred == 1 else "Healthy",
                "confidence": round(float(prob), 4)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))