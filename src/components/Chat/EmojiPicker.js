import React from 'react';

const EMOJIS = [
    '😀',
    '😂',
    '🤣',
    '😊',
    '😍',
    '😘',
    '😎',
    '🥳',
    '😭',
    '😡',
    '🤔',
    '😮',
    '😢',
    '😴',
    '🙄',
    '❤️',
    '🔥',
    '👍',
    '👎',
    '👏',
    '🙏',
    '🎉',
    '💯',
    '🚀',
    '💀',
    '🤝',
    '👀',
    '✨',
    '💙',
    '💜',
];

export default function EmojiPicker({
    onSelect,
    onClose,
}) {
    return (
        <div className="emoji-picker">
            <div className="emoji-picker-header">
                <strong>
                    Emojiler
                </strong>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                >
                    ×
                </button>
            </div>

            <div className="emoji-grid">
                {EMOJIS.map(
                    (emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                                onSelect(emoji)
                            }
                        >
                            {emoji}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}