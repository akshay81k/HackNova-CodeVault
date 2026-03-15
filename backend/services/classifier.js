const { spawn } = require('child_process');
const path = require('path');

const runClassifier = (zipPath) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'ml', 'predict.py');
        const pythonProcess = spawn('python', [scriptPath, zipPath], {
            cwd: path.join(__dirname, '..', 'ml')
        });

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Classifier Service] Python script exited with code ${code}. Stderr: ${stderrData}`);
                return reject(new Error(`Classification failed: ${stderrData}`));
            }
            try {
                const output = stdoutData.trim();
                const [category, confidenceStr] = output.split('|');
                const confidence = parseFloat(confidenceStr);
                resolve({ category, confidence });
            } catch (err) {
                console.error(`[Classifier Service] Failed to parse output: ${stdoutData}`);
                reject(new Error(`Failed to parse classifier output: ${err.message}`));
            }
        });
    });
};

module.exports = { runClassifier };
