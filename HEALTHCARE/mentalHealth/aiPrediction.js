import { spawn } from "child_process";

const predictDepression = (data) => {

  return new Promise((resolve, reject) => {

    const python = spawn("python", [
      "./mentalHealth/predict.py",
      JSON.stringify(data)
    ]);

    python.stdout.on("data", (result) => {
      resolve(result.toString().trim());
    });

    python.stderr.on("data", (error) => {
      reject(error.toString());
    });

  });

};

export default predictDepression;