import React from 'react';

const QUICK_REACTIONS = [
    '❤️',
    '👍',
    '😂',
    '😮',
    '😢',
    '🙏',
];

export default function MessageActions({
    message,
    mine,
    onReply,
    onForward,
    onCopy,
    onDeleteForMe,
    onDeleteForEveryone,
    onReaction,
}) {
    return (
        <div className="message-actions-menu">
            <div className="message-quick-reactions">
                {QUICK_REACTIONS.map(
                    (emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            className="quick-reaction-btn"
                            title={`${emoji} tepki`}
                            onClick={() =>
                                onReaction(
                                    message,
                                    emoji
                                )
                            }
                        >
                            {emoji}
                        </button>
                    )
                )}
            </div>

            <button
                type="button"
                onClick={() =>
                    onReply(message)
                }
            >
                ↩ Cevapla
            </button>

            <button
                type="button"
                onClick={() =>
                    onForward(message)
                }
            >
                ↗ İlet
            </button>

            <button
                type="button"
                onClick={() =>
                    onCopy(message)
                }
            >
                ⧉ Kopyala
            </button>

            <button
                type="button"
                onClick={() =>
                    onReaction(
                        message,
                        '❤️'
                    )
                }
            >
                ❤️ Tepki ver
            </button>

            <button
                type="button"
                onClick={() =>
                    onDeleteForMe(
                        message
                    )
                }
            >
                Benden sil
            </button>

            {mine && (
                <button
                    type="button"
                    className="danger-menu-item"
                    onClick={() =>
                        onDeleteForEveryone(
                            message
                        )
                    }
                >
                    Herkesten sil
                </button>
            )}
        </div>
    );
}