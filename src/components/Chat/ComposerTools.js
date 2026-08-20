import React from 'react';

export default function ComposerTools({
    onEmoji,
    onGif,
    onPhoto,
    onClose,
}) {
    return (
        <div className="composer-tools-popover">

            <button
                type="button"
                className="composer-tool-item"
                onClick={() => {
                    onEmoji();
                    onClose();
                }}
            >
                <span className="composer-tool-icon">
                    😊
                </span>

                <span>
                    Emoji
                </span>
            </button>

            <button
                type="button"
                className="composer-tool-item"
                onClick={() => {
                    onGif();
                    onClose();
                }}
            >
                <span className="composer-tool-icon gif-label">
                    GIF
                </span>

                <span>
                    GIF
                </span>
            </button>

            <button
                type="button"
                className="composer-tool-item disabled"
                disabled
            >
                <span className="composer-tool-icon">
                    📷
                </span>

                <span>
                    Kamera

                    <small>
                        Yakında
                    </small>
                </span>
            </button>

            <button
                type="button"
                className="composer-tool-item"
                onClick={() => {
                    onPhoto();
                    onClose();
                }}
            >
                <span className="composer-tool-icon">
                    🖼️
                </span>

                <span>
                    Fotoğraf
                </span>
            </button>

            <button
                type="button"
                className="composer-tool-item disabled"
                disabled
            >
                <span className="composer-tool-icon">
                    📄
                </span>

                <span>
                    Belge

                    <small>
                        Yakında
                    </small>
                </span>
            </button>

        </div>
    );
}