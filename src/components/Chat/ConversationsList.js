import React, {
    useEffect,
    useState,
} from 'react';

import { db } from '../../services/firebase';

function Avatar({ user }) {
    if (user?.photoURL) {
        return (
            <img
                src={user.photoURL}
                alt=""
                className="avatar"
            />
        );
    }

    const initials = (
        user?.displayName || 'CT'
    )
        .split(' ')
        .slice(0, 2)
        .map(
            (part) => part[0]
        )
        .join('')
        .toUpperCase();

    return (
        <div className="avatar avatar-fallback">
            {initials || 'CT'}
        </div>
    );
}

function millis(timestamp) {
    return timestamp?.toMillis
        ? timestamp.toMillis()
        : 0;
}

function formatTime(
    timestamp
) {
    if (
        !timestamp?.toDate
    ) {
        return '';
    }

    return timestamp
        .toDate()
        .toLocaleTimeString(
            'tr-TR',
            {
                hour: '2-digit',
                minute: '2-digit',
            }
        );
}

export default function ConversationsList({
    currentUser,
    selectedUser,
    archived = false,
    onSelect,
}) {
    const [
        items,
        setItems,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState('');

    useEffect(() => {
        let alive = true;

        const conversations =
            new Map();

        const messages =
            new Map();

        const profiles =
            new Map();

        let rebuildTimer =
            null;

        const scheduleRebuild =
            () => {
                window.clearTimeout(
                    rebuildTimer
                );

                rebuildTimer =
                    window.setTimeout(
                        rebuild,
                        40
                    );
            };

        const rebuild =
            async () => {
                if (!alive) {
                    return;
                }

                try {
                    const virtual =
                        new Map();

                    messages.forEach(
                        (message) => {
                            if (
                                message.deletedForEveryone
                            ) {
                                return;
                            }

                            const sender =
                                message.senderId ||
                                message.uid ||
                                '';

                            const receiver =
                                message.receiverId ||
                                '';

                            let otherUid =
                                '';

                            if (
                                sender ===
                                currentUser.uid
                            ) {
                                otherUid =
                                    receiver;
                            } else if (
                                receiver ===
                                currentUser.uid
                            ) {
                                otherUid =
                                    sender;
                            }

                            if (!otherUid) {
                                return;
                            }

                            const id =
                                message.conversationId ||
                                [
                                    currentUser.uid,
                                    otherUid,
                                ]
                                    .sort()
                                    .join('_');

                            const old =
                                virtual.get(id);

                            if (
                                !old ||
                                millis(
                                    message.createdAt
                                ) >
                                millis(
                                    old.lastMessageAt
                                )
                            ) {
                                virtual.set(id, {
                                    id,
                                    participants: [
                                        currentUser.uid,
                                        otherUid,
                                    ],
                                    lastMessage:
                                        message.text ||
                                        '',
                                    lastMessageAt:
                                        message.createdAt ||
                                        null,
                                    updatedAt:
                                        message.createdAt ||
                                        null,
                                });
                            }
                        }
                    );

                    conversations.forEach(
                        (conversation) => {
                            virtual.set(
                                conversation.id,
                                conversation
                            );
                        }
                    );

                    const visible =
                        Array.from(
                            virtual.values()
                        ).filter(
                            (conversation) => {
                                const participants =
                                    conversation.participants ||
                                    [];

                                if (
                                    !participants.includes(
                                        currentUser.uid
                                    )
                                ) {
                                    return false;
                                }

                                const deleted =
                                    (
                                        conversation.deletedFor ||
                                        []
                                    ).includes(
                                        currentUser.uid
                                    );

                                if (deleted) {
                                    return false;
                                }

                                const isArchived =
                                    (
                                        conversation.archivedBy ||
                                        []
                                    ).includes(
                                        currentUser.uid
                                    );

                                return (
                                    isArchived ===
                                    archived
                                );
                            }
                        );

                    const next =
                        [];

                    for (
                        const conversation of visible
                    ) {
                        const otherUid =
                            (
                                conversation.participants ||
                                []
                            ).find(
                                (uid) =>
                                    uid !==
                                    currentUser.uid
                            );

                        if (!otherUid) {
                            continue;
                        }

                        let otherUser =
                            profiles.get(
                                otherUid
                            );

                        if (!otherUser) {
                            const profileSnapshot =
                                await db
                                    .collection('users')
                                    .doc(otherUid)
                                    .get();

                            if (
                                !profileSnapshot.exists
                            ) {
                                continue;
                            }

                            otherUser = {
                                uid:
                                    profileSnapshot.id,
                                ...profileSnapshot.data(),
                            };

                            profiles.set(
                                otherUid,
                                otherUser
                            );
                        }

                        next.push({
                            conversation,
                            otherUser,
                            pinned: (
                                conversation.pinnedBy ||
                                []
                            ).includes(
                                currentUser.uid
                            ),
                            muted: (
                                conversation.mutedBy ||
                                []
                            ).includes(
                                currentUser.uid
                            ),
                        });
                    }

                    next.sort(
                        (a, b) => {
                            if (
                                a.pinned !==
                                b.pinned
                            ) {
                                return a.pinned
                                    ? -1
                                    : 1;
                            }

                            const at =
                                Math.max(
                                    millis(
                                        a.conversation
                                            .updatedAt
                                    ),
                                    millis(
                                        a.conversation
                                            .lastMessageAt
                                    )
                                );

                            const bt =
                                Math.max(
                                    millis(
                                        b.conversation
                                            .updatedAt
                                    ),
                                    millis(
                                        b.conversation
                                            .lastMessageAt
                                    )
                                );

                            return bt - at;
                        }
                    );

                    if (alive) {
                        setItems(next);
                        setLoading(false);
                    }
                } catch (rebuildError) {
                    console.error(
                        'Sohbet listesi oluşturulamadı:',
                        rebuildError
                    );

                    if (alive) {
                        setError(
                            'Sohbetler yüklenemedi.'
                        );

                        setItems([]);
                        setLoading(false);
                    }
                }
            };

        /*
         * Conversations
         */
        const unsubConversations =
            db
                .collection(
                    'conversations'
                )
                .where(
                    'participants',
                    'array-contains',
                    currentUser.uid
                )
                .onSnapshot(
                    (snapshot) => {
                        conversations.clear();

                        snapshot.docs.forEach(
                            (doc) => {
                                conversations.set(
                                    doc.id,
                                    {
                                        id: doc.id,
                                        ...doc.data(),
                                    }
                                );
                            }
                        );

                        scheduleRebuild();
                    },
                    (snapshotError) => {
                        console.error(
                            'Sohbet belgeleri alınamadı:',
                            snapshotError
                        );

                        if (alive) {
                            setError(
                                'Sohbet verileri okunamadı.'
                            );

                            setLoading(false);
                        }
                    }
                );

        /*
         * Gönderilen mesajlar
         */
        const unsubSent =
            db
                .collection('messages')
                .where(
                    'senderId',
                    '==',
                    currentUser.uid
                )
                .limit(500)
                .onSnapshot(
                    (snapshot) => {
                        snapshot.docChanges().forEach(
                            (change) => {
                                if (
                                    change.type ===
                                    'removed'
                                ) {
                                    messages.delete(
                                        change.doc.id
                                    );
                                } else {
                                    messages.set(
                                        change.doc.id,
                                        {
                                            id:
                                                change.doc.id,
                                            ...change.doc.data(),
                                        }
                                    );
                                }
                            }
                        );

                        scheduleRebuild();
                    },
                    (snapshotError) => {
                        console.error(
                            'Gönderilen mesajlar alınamadı:',
                            snapshotError
                        );

                        if (alive) {
                            setError(
                                'Mesaj geçmişi okunamadı.'
                            );

                            setLoading(false);
                        }
                    }
                );

        /*
         * Alınan mesajlar
         */
        const unsubReceived =
            db
                .collection('messages')
                .where(
                    'receiverId',
                    '==',
                    currentUser.uid
                )
                .limit(500)
                .onSnapshot(
                    (snapshot) => {
                        snapshot.docChanges().forEach(
                            (change) => {
                                if (
                                    change.type ===
                                    'removed'
                                ) {
                                    messages.delete(
                                        change.doc.id
                                    );
                                } else {
                                    messages.set(
                                        change.doc.id,
                                        {
                                            id:
                                                change.doc.id,
                                            ...change.doc.data(),
                                        }
                                    );
                                }
                            }
                        );

                        scheduleRebuild();
                    },
                    (snapshotError) => {
                        console.error(
                            'Alınan mesajlar alınamadı:',
                            snapshotError
                        );

                        if (alive) {
                            setError(
                                'Mesaj geçmişi okunamadı.'
                            );

                            setLoading(false);
                        }
                    }
                );

        /*
         * Emniyet kemeri:
         * hiçbir listener sonuç vermezse bile
         * loading sonsuza kadar kalmasın.
         */
        const timeout =
            window.setTimeout(
                () => {
                    if (alive) {
                        setLoading(false);
                    }
                },
                4000
            );

        return () => {
            alive = false;

            window.clearTimeout(
                rebuildTimer
            );

            window.clearTimeout(
                timeout
            );

            unsubConversations();
            unsubSent();
            unsubReceived();
        };
    }, [
        currentUser.uid,
        archived,
    ]);

    if (loading) {
        return (
            <div className="chat-list-state">
                Sohbetler yükleniyor...
            </div>
        );
    }

    if (error && !items.length) {
        return (
            <div className="chat-list-state error-state">
                {error}
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="chat-list-state">
                {archived
                    ? 'Arşivlenmiş sohbet yok.'
                    : 'Henüz bir sohbetin yok.'}
            </div>
        );
    }

    return (
        <div className="chat-list">
            {items.map(
                ({
                    conversation,
                    otherUser,
                    pinned,
                    muted,
                }) => {
                    const active =
                        selectedUser?.uid ===
                        otherUser.uid;

                    return (
                        <button
                            type="button"
                            key={
                                conversation.id
                            }
                            className={`chat-list-item ${active
                                ? 'active'
                                : ''
                                }`}
                            onClick={() =>
                                onSelect(
                                    otherUser
                                )
                            }
                        >
                            <Avatar
                                user={otherUser}
                            />

                            <div className="chat-list-main">
                                <div className="chat-list-top">
                                    <strong>
                                        {otherUser.displayName ||
                                            'CyberTalk Kullanıcısı'}
                                    </strong>

                                    <span>
                                        {formatTime(
                                            conversation.lastMessageAt
                                        )}
                                    </span>
                                </div>

                                <div className="chat-list-bottom">
                                    <span className="chat-list-preview">
                                        {conversation.lastMessage ||
                                            'Sohbeti başlat'}
                                    </span>

                                    <span className="chat-list-meta">
                                        {pinned &&
                                            '📌'}

                                        {muted &&
                                            ' 🔕'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                }
            )}
        </div>
    );
}