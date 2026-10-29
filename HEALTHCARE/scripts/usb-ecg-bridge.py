#!/usr/bin/env python3
"""Forward newline-delimited ECG batches from a USB serial device to the gateway.

No sample conversion, timestamps, or sequence numbers are fabricated here.
"""
import argparse
import json
import os
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description="Forward ESP32 USB ECG batches to the authenticated Heartline gateway")
    parser.add_argument("port", help="Serial port, e.g. /dev/cu.usbserial-...")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()
    try:
        import serial
    except ImportError:
        parser.error("Install pyserial first: python3 -m pip install pyserial")
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    gateway = os.path.join(root, "dist", "scripts", "offline-gateway.js")
    if not os.path.isfile(gateway):
        parser.error("Build the backend first: npm run build")
    try:
        with serial.Serial(args.port, args.baud, timeout=1) as port:
            with subprocess.Popen(["node", gateway, "watch"], cwd=root, stdin=subprocess.PIPE, text=True) as process:
                print("USB bridge connected. Press Ctrl+C to stop.", file=sys.stderr)
                try:
                    while process.poll() is None:
                        line = port.readline(65537)
                        if not line:
                            continue
                        if len(line) > 65536 or not line.endswith(b"\n"):
                            raise ValueError("Serial line is too long or incomplete; stopping to avoid corrupting the stream")
                        value = json.loads(line)
                        if not isinstance(value, dict) or not all(key in value for key in ("sessionId", "sequence", "firstSampleAt", "sampleRateHz", "samples")):
                            raise ValueError("Serial output is not an ECG batch; check firmware format")
                        process.stdin.write(json.dumps(value, separators=(",", ":")) + "\n")
                        process.stdin.flush()
                except KeyboardInterrupt:
                    print("Stopping USB bridge.", file=sys.stderr)
                finally:
                    process.stdin.close()
                    process.terminate()
                    process.wait(timeout=10)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"USB bridge stopped: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
