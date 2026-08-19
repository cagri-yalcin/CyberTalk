const MAX_OUTPUT_BYTES = 350 * 1024;
const MAX_DIMENSION = 256;

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Fotoğraf okunamadı.'));
        };

        image.src = objectUrl;
    });
}

function canvasToDataUrl(canvas, quality) {
    return canvas.toDataURL('image/jpeg', quality);
}

export async function compressProfileImage(file) {
    if (!file) return '';

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error(
            'Profil fotoğrafı JPG, PNG veya WEBP olmalı.'
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            'Profil fotoğrafı en fazla 5 MB olabilir.'
        );
    }

    const image = await loadImage(file);

    const longestSide = Math.max(
        image.width,
        image.height
    );

    const scale =
        longestSide > MAX_DIMENSION
            ? MAX_DIMENSION / longestSide
            : 1;

    let width = Math.max(
        1,
        Math.round(image.width * scale)
    );

    let height = Math.max(
        1,
        Math.round(image.height * scale)
    );

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error(
            'Fotoğraf işlenemedi.'
        );
    }

    const tryEncode = () => {
        canvas.width = width;
        canvas.height = height;

        context.clearRect(
            0,
            0,
            width,
            height
        );

        context.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        const qualities = [
            0.78,
            0.70,
            0.62,
            0.55,
            0.48,
        ];

        for (const quality of qualities) {
            const dataUrl = canvasToDataUrl(
                canvas,
                quality
            );

            const estimatedBytes =
                Math.ceil(
                    (dataUrl.length * 3) / 4
                );

            if (
                estimatedBytes <=
                MAX_OUTPUT_BYTES
            ) {
                return dataUrl;
            }
        }

        return null;
    };

    let result = tryEncode();

    if (!result) {
        width = 192;
        height = Math.max(
            1,
            Math.round(
                (image.height / image.width) *
                width
            )
        );

        result = tryEncode();
    }

    if (!result) {
        throw new Error(
            'Fotoğraf çok büyük. Daha küçük bir fotoğraf seç.'
        );
    }

    return result;
}