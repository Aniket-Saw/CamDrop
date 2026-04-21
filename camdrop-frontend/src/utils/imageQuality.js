export const analyzeImageQuality = (base64Image) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Image;

        img.onload = () => {
            // Create an offscreen canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Scale down for much faster processing
            const processWidth = 150;
            const scale = processWidth / img.width;
            const processHeight = img.height * scale;

            canvas.width = processWidth;
            canvas.height = processHeight;
            ctx.drawImage(img, 0, 0, processWidth, processHeight);

            // Extract raw pixel data
            const imageData = ctx.getImageData(0, 0, processWidth, processHeight);
            const data = imageData.data;

            let rSum = 0, gSum = 0, bSum = 0;
            const pixelCount = processWidth * processHeight;
            const intensities = new Float32Array(pixelCount);

            // 1. Calculate Brightness
            let pixelIndex = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                rSum += r;
                gSum += g;
                bSum += b;

                // Grayscale intensity for this pixel
                intensities[pixelIndex++] = 0.299 * r + 0.587 * g + 0.114 * b;
            }

            const avgR = rSum / pixelCount;
            const avgG = gSum / pixelCount;
            const avgB = bSum / pixelCount;
            const overallBrightness = (avgR + avgG + avgB) / 3;

            // 2. Calculate Blur (Variance/Contrast)
            const avgIntensity = intensities.reduce((a, b) => a + b) / pixelCount;
            let sumOfSquares = 0;
            for (let i = 0; i < intensities.length; i++) {
                sumOfSquares += Math.pow(intensities[i] - avgIntensity, 2);
            }
            const variance = sumOfSquares / pixelCount;

            // Thresholds
            const isDark = overallBrightness < 40;
            const isBlurry = variance < 300;

            resolve({ isDark, isBlurry, brightness: overallBrightness, variance });
        };
    });
};
