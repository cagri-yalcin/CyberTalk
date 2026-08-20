import React from 'react';

function renderReplyPreview(message) {
    if (!message.replyTo) {
        return null;
    }

    return (
        <div className="message-reply-preview">
            <strong>
                {message.replyTo.senderName ||
                    'Kullanıcı'}
            </strong>

            <span>
                {message.replyTo.text ||
                    'Mesaj'}
            </span>
        </div>
    );
}

function renderContent(message) {
    switch (message.type) {
        case 'gif':
            return (
                <img
                    src={message.gifUrl}
                    alt="GIF"
                    className="message-gif"
                />
            );

        case 'image':
            return (
                <img
                    src={message.fileUrl}
                    alt={
                        message.fileName ||
                        'Fotoğraf'
                    }
                    className="message-image"
                />
            );

        case 'file':
            return (
                <div className="message-file">
                    <div className="message-file-icon">
                        📎
                    </div>

                    <div className="message-file-info">
                        <strong>
                            {message.fileName ||
                                'Dosya'}
                        </strong>

                        {message.fileSize && (
                            <span>
                                {Math.round(
                                    message.fileSize / 1024
                                )}{' '}
                                KB
                            </span>
                        )}
                    </div>
                </div>
            );

        case 'forward':
            return (
                <p>
                    {message.text ||
                        'Mesaj'}
                </p>
            );

        default:
            return (
                <p>
                    {message.text}
                </p>
            );
    }
}

function renderReactions(
    message,
    currentUser
) {
    const reactions =
        message.reactions || {};

    const grouped = {};

    Object.entries(reactions).forEach(
        ([uid, emoji]) => {
            if (!emoji) {
                return;
            }

            if (!grouped[emoji]) {
                grouped[emoji] = {
                    emoji,
                    count: 0,
                    mine: false,
                };
            }

            grouped[emoji].count += 1;

            if (
                uid === currentUser?.uid
            ) {
                grouped[emoji].mine = true;
            }
        }
    );

    const items =
        Object.values(grouped);

    if (!items.length) {
        return null;
    }

    return (
        <div className="message-reactions">
            {items.map((reaction) => (
                <span
                    key={reaction.emoji}
                    className={`message-reaction ${reaction.mine
                            ? 'mine'
                            : ''
                        }`}
                >
                    <span>
                        {reaction.emoji}
                    </span>

                    {reaction.count > 1 && (
                        <small>
                            {reaction.count}
                        </small>
                    )}
                </span>
            ))}
        </div>
    );
}

export default function MessageBubble({
    message,
    mine,
    active,
    onOpenMenu,
    currentUser,
}) {
    return (
        <div
            className={`bubble-row ${mine
                    ? 'mine'
                    : 'theirs'
                }`}
        >
            <div
                className={`bubble ${mine
                        ? 'mine'
                        : 'theirs'
                    } ${active
                        ? 'selected'
                        : ''
                    }`}
                onClick={(event) =>
                    onOpenMenu(
                        event,
                        message
                    )
                }
            >
                {renderReplyPreview(
                    message
                )}

                {message.forwardedFrom && (
                    <div className="message-forwarded-label">
                        ↗ İletildi
                    </div>
                )}

                {renderContent(
                    message
                )}

                <span className="message-time">
                    {message.pending
                        ? 'Gönderiliyor...'
                        : message.formattedTime}
                </span>
            </div>

            {renderReactions(
                message,
                currentUser
            )}
        </div>
    );
}