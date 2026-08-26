import React, { useState } from 'react';
import { createPortal } from 'react-dom';

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

function renderContent(
    message,
    onImageClick
) {
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
                <div className="message-image-content">
                    <img
                        src={message.fileUrl}
                        alt={
                            message.fileName ||
                            'Fotoğraf'
                        }
                        className="message-image"
                        onClick={(event) => {
                            event.stopPropagation();
                            onImageClick?.();
                        }}
                        style={{
                            cursor: 'zoom-in',
                        }}
                    />

                    {message.text && (
                        <p className="message-media-caption">
                            {message.text}
                        </p>
                    )}
                </div>
            );

        case 'file':
            return (
                <div>
                    <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="message-file message-file-link"
                        download={message.fileName || undefined}
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
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
                    </a>

                    {message.text && (
                        <p className="message-media-caption">
                            {message.text}
                        </p>
                    )}
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
    const [
        imageViewerOpen,
        setImageViewerOpen,
    ] = useState(false);

    return (
        <>
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
                    message,
                    () => setImageViewerOpen(true)
                )}

                <div
                    className="message-meta-row"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        marginTop: '4px',
                    }}
                >
                    {message.editedAt && (
                        <span
                            className="message-edited-label"
                            title="Bu mesaj düzenlendi"
                            style={{
                                fontSize: '10px',
                                opacity: 0.72,
                                lineHeight: 1,
                                letterSpacing: '0.1px',
                                fontStyle: 'italic',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            • düzenlendi
                        </span>
                    )}

                    <span className="message-time">
                        {message.pending
                            ? 'Gönderiliyor...'
                            : message.formattedTime}
                    </span>
                </div>
            </div>

            {renderReactions(
                message,
                currentUser
            )}
        </div>

            {imageViewerOpen &&
                message.type === 'image' &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Fotoğraf görüntüleyici"
                        onClick={() =>
                            setImageViewerOpen(false)
                        }
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '32px',
                            background: 'rgba(0, 0, 0, 0.86)',
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Kapat"
                            onClick={(event) => {
                                event.stopPropagation();
                                setImageViewerOpen(false);
                            }}
                            style={{
                                position: 'fixed',
                                top: '20px',
                                right: '24px',
                                zIndex: 10001,
                                border: 'none',
                                background: 'rgba(255,255,255,0.12)',
                                color: '#fff',
                                fontSize: '32px',
                                lineHeight: 1,
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                            }}
                        >
                            ×
                        </button>

                        <img
                            src={message.fileUrl}
                            alt={
                                message.fileName ||
                                'Fotoğraf'
                            }
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                            style={{
                                maxWidth: '92vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow:
                                    '0 20px 60px rgba(0,0,0,0.5)',
                            }}
                        />
                    </div>,
                    document.body
                )}
        </>
    );
}