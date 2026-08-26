const CLOUD_NAME =
    'l8xvhoou';

const UPLOAD_PRESET =
    'cybertalk_media';

const UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export async function uploadToCloudinary(
    file
) {
    if (!file) {
        throw new Error(
            'Yüklenecek dosya bulunamadı.'
        );
    }

    const formData =
        new FormData();

    formData.append(
        'file',
        file
    );

    formData.append(
        'upload_preset',
        UPLOAD_PRESET
    );

    const response =
        await fetch(
            UPLOAD_URL,
            {
                method: 'POST',
                body: formData,
            }
        );

    if (!response.ok) {
        const errorText =
            await response.text();

        throw new Error(
            `Cloudinary upload başarısız: ${response.status} ${errorText}`
        );
    }

    const data =
        await response.json();

    if (!data.secure_url) {
        throw new Error(
            'Cloudinary güvenli URL döndürmedi.'
        );
    }

    return {
        url:
            data.secure_url,

        publicId:
            data.public_id || '',

        resourceType:
            data.resource_type || 'image',

        width:
            data.width || null,

        height:
            data.height || null,

        bytes:
            data.bytes || file.size,

        format:
            data.format ||
            '',
    };
}