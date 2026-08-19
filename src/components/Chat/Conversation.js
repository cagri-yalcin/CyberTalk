import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  db,
  firebase,
} from '../../services/firebase';

import {
  getConversationId,
  formatMessageTime,
} from '../../services/chat';

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
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="avatar avatar-fallback">
      {initials || 'CT'}
    </div>
  );
}

export default function Conversation({
  currentUser,
  otherUser,
  onViewProfile,
  onCloseConversation,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [conversationMeta, setConversationMeta] =
    useState(null);

  const [deletedMessageIds, setDeletedMessageIds] =
    useState(new Set());

  const [messageMenu, setMessageMenu] =
    useState(null);

  const endRef = useRef(null);
  const menuRef = useRef(null);
  const messageMenuRef = useRef(null);

  const conversationId = getConversationId(
    currentUser.uid,
    otherUser.uid
  );

  const ensureConversation = async () => {
    await db
      .collection('conversations')
      .doc(conversationId)
      .set(
        {
          conversationId,
          participants: [
            currentUser.uid,
            otherUser.uid,
          ],
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );
  };

  useEffect(() => {
    const unsubscribe = db
      .collection('conversations')
      .doc(conversationId)
      .onSnapshot(
        (snapshot) => {
          setConversationMeta(
            snapshot.exists
              ? snapshot.data()
              : null
          );
        },
        (error) => {
          console.error(
            'Konuşma bilgisi alınamadı:',
            error
          );
        }
      );

    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    const unsubscribe = db
      .collection('messageDeletions')
      .where(
        'uid',
        '==',
        currentUser.uid
      )
      .onSnapshot(
        (snapshot) => {
          const ids = new Set();

          snapshot.docs.forEach((doc) => {
            const data = doc.data();

            if (
              data.conversationId ===
              conversationId
            ) {
              ids.add(data.messageId);
            }
          });

          setDeletedMessageIds(ids);
        },
        (error) => {
          console.error(
            'Mesaj silme kayıtları alınamadı:',
            error
          );
        }
      );

    return unsubscribe;
  }, [
    currentUser.uid,
    conversationId,
  ]);

  useEffect(() => {
    const messageMap = new Map();

    const rebuildMessages = () => {
      const next = Array.from(
        messageMap.values()
      )
        .filter(
          (message) =>
            !message.deletedForEveryone
        )
        .filter(
          (message) =>
            !deletedMessageIds.has(message.id)
        )
        .sort((a, b) => {
          const at =
            a.createdAt?.toMillis
              ? a.createdAt.toMillis()
              : a.localCreatedAt || 0;

          const bt =
            b.createdAt?.toMillis
              ? b.createdAt.toMillis()
              : b.localCreatedAt || 0;

          return at - bt;
        });

      setMessages(next);
    };

    const applySnapshot = (snapshot) => {
      snapshot.docChanges().forEach(
        (change) => {
          if (change.type === 'removed') {
            messageMap.delete(
              change.doc.id
            );
          } else {
            messageMap.set(
              change.doc.id,
              {
                id: change.doc.id,
                ...change.doc.data(),
              }
            );
          }
        }
      );

      rebuildMessages();
    };

    const unsubscribeSent = db
      .collection('messages')
      .where(
        'conversationId',
        '==',
        conversationId
      )
      .where(
        'senderId',
        '==',
        currentUser.uid
      )
      .onSnapshot(
        applySnapshot,
        (error) => {
          console.error(
            'Gönderilen mesajlar okunamadı:',
            error
          );
        }
      );

    const unsubscribeReceived = db
      .collection('messages')
      .where(
        'conversationId',
        '==',
        conversationId
      )
      .where(
        'receiverId',
        '==',
        currentUser.uid
      )
      .onSnapshot(
        applySnapshot,
        (error) => {
          console.error(
            'Alınan mesajlar okunamadı:',
            error
          );
        }
      );

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [
    conversationId,
    currentUser.uid,
    deletedMessageIds,
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages.length]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target
        )
      ) {
        setShowMenu(false);
      }

      if (
        messageMenuRef.current &&
        !messageMenuRef.current.contains(
          event.target
        ) &&
        !event.target.closest('.bubble')
      ) {
        setMessageMenu(null);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  const isArchived = (
    conversationMeta?.archivedBy || []
  ).includes(currentUser.uid);

  const isPinned = (
    conversationMeta?.pinnedBy || []
  ).includes(currentUser.uid);

  const isMuted = (
    conversationMeta?.mutedBy || []
  ).includes(currentUser.uid);

  const sendMessage = async (event) => {
    event.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    const messageId = db
      .collection('messages')
      .doc().id;

    setMessages((current) => [
      ...current,
      {
        id: messageId,
        conversationId,
        text,
        uid: currentUser.uid,
        senderId: currentUser.uid,
        receiverId: otherUser.uid,
        pending: true,
        localCreatedAt: Date.now(),
      },
    ]);

    setDraft('');

    try {
      await ensureConversation();

      await db
        .collection('conversations')
        .doc(conversationId)
        .set(
          {
            lastMessage: text,
            lastSenderId:
              currentUser.uid,
            lastMessageAt:
              firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
            deletedFor:
              firebase.firestore.FieldValue.arrayRemove(
                currentUser.uid
              ),
            archivedBy:
              firebase.firestore.FieldValue.arrayRemove(
                currentUser.uid
              ),
          },
          {
            merge: true,
          }
        );

      await db
        .collection('messages')
        .doc(messageId)
        .set({
          conversationId,
          text,
          uid: currentUser.uid,
          senderId: currentUser.uid,
          receiverId: otherUser.uid,
          userName:
            currentUser.displayName ||
            'CyberTalk Kullanıcısı',
          photoURL:
            currentUser.photoURL || '',
          createdAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error(
        'Mesaj gönderilemedi:',
        error
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== messageId
        )
      );

      setDraft(text);
    }
  };

  const toggleFlag = async (
    field,
    enabled
  ) => {
    try {
      await ensureConversation();

      await db
        .collection('conversations')
        .doc(conversationId)
        .set(
          {
            [field]: enabled
              ? firebase.firestore.FieldValue.arrayUnion(
                currentUser.uid
              )
              : firebase.firestore.FieldValue.arrayRemove(
                currentUser.uid
              ),
            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

      setShowMenu(false);

      if (
        field === 'archivedBy' &&
        enabled
      ) {
        onCloseConversation?.();
      }
    } catch (error) {
      console.error(
        'Sohbet ayarı değiştirilemedi:',
        error
      );
    }
  };

  const deleteConversationForMe =
    async () => {
      try {
        await ensureConversation();

        await db
          .collection('conversations')
          .doc(conversationId)
          .set(
            {
              deletedFor:
                firebase.firestore.FieldValue.arrayUnion(
                  currentUser.uid
                ),
            },
            {
              merge: true,
            }
          );

        setShowMenu(false);
        onCloseConversation?.();
      } catch (error) {
        console.error(
          'Sohbet silinemedi:',
          error
        );
      }
    };

  const deleteMessageForMe =
    async (message) => {
      try {
        const deletionId =
          `${message.id}_${currentUser.uid}`;

        await db
          .collection('messageDeletions')
          .doc(deletionId)
          .set({
            messageId: message.id,
            conversationId,
            uid: currentUser.uid,
            createdAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          });

        setMessages((current) =>
          current.filter(
            (item) =>
              item.id !== message.id
          )
        );

        setMessageMenu(null);
      } catch (error) {
        console.error(
          'Mesaj benden silinemedi:',
          error
        );
      }
    };

  const deleteMessageForEveryone =
    async (message) => {
      const sender =
        message.senderId ||
        message.uid;

      if (
        sender !== currentUser.uid
      ) {
        return;
      }

      try {
        await db
          .collection('messages')
          .doc(message.id)
          .update({
            deletedForEveryone: true,
            deletedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          });

        setMessages((current) =>
          current.filter(
            (item) =>
              item.id !== message.id
          )
        );

        setMessageMenu(null);
      } catch (error) {
        console.error(
          'Mesaj herkesten silinemedi:',
          error
        );
      }
    };

  const openMessageMenu = (
    event,
    message
  ) => {
    event.stopPropagation();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 190;
    const menuHeight = 92;
    const gap = 8;

    const maxLeft =
      window.innerWidth -
      menuWidth -
      12;

    const desiredLeft =
      (
        message.senderId ||
        message.uid
      ) === currentUser.uid
        ? rect.right - menuWidth
        : rect.left;

    const left = Math.max(
      12,
      Math.min(
        desiredLeft,
        maxLeft
      )
    );

    const desiredTop =
      rect.bottom + gap;

    const top =
      desiredTop + menuHeight >
        window.innerHeight
        ? Math.max(
          12,
          rect.top -
          menuHeight -
          gap
        )
        : desiredTop;

    setMessageMenu({
      id: message.id,
      top,
      left,
    });
  };

  return (
    <div className="conversation">
      <header className="conversation-header">
        <button
          type="button"
          className="conversation-person profile-trigger"
          onClick={() =>
            onViewProfile?.()
          }
          title="Profili görüntüle"
        >
          <Avatar user={otherUser} />

          <div>
            <strong>
              {otherUser.displayName ||
                'CyberTalk Kullanıcısı'}
            </strong>

            <span>
              @{otherUser.username ||
                ''}
            </span>
          </div>
        </button>

        <div className="conversation-actions">
          <div
            className="conversation-menu-wrap"
            ref={menuRef}
          >
            <button
              type="button"
              className="icon-btn"
              aria-expanded={showMenu}
              onClick={() =>
                setShowMenu(
                  (value) => !value
                )
              }
            >
              •••
            </button>

            {showMenu && (
              <div className="conversation-menu conversation-menu-rich">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onViewProfile?.();
                  }}
                >
                  Profili görüntüle
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleFlag(
                      'pinnedBy',
                      !isPinned
                    )
                  }
                >
                  {isPinned
                    ? 'Sabitlemeyi kaldır'
                    : 'Sohbeti sabitle'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleFlag(
                      'mutedBy',
                      !isMuted
                    )
                  }
                >
                  {isMuted
                    ? 'Sessizi kaldır'
                    : 'Sohbeti sessize al'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleFlag(
                      'archivedBy',
                      !isArchived
                    )
                  }
                >
                  {isArchived
                    ? 'Arşivden çıkar'
                    : 'Sohbeti arşivle'}
                </button>

                <button
                  type="button"
                  className="danger-menu-item"
                  onClick={
                    deleteConversationForMe
                  }
                >
                  Sohbeti benden sil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onCloseConversation?.();
                  }}
                >
                  Sohbeti kapat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="messages">
        {!messages.length ? (
          <div className="conversation-empty">
            <div className="big-lock">
              🔒
            </div>

            <h2>
              İlk mesajı gönder
            </h2>

            <p>
              {otherUser.displayName ||
                'Kullanıcı'} ile
              konuşmayı başlat.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const mine =
              (
                message.senderId ||
                message.uid
              ) === currentUser.uid;

            const active =
              messageMenu?.id ===
              message.id;

            return (
              <div
                key={message.id}
                className={`bubble-row ${mine
                    ? 'mine'
                    : 'theirs'
                  }`}
              >
                <div
                  className={`bubble ${mine
                      ? 'mine'
                      : 'theirs'
                    }`}
                  onClick={(event) => {
                    if (
                      message.pending
                    ) {
                      return;
                    }

                    openMessageMenu(
                      event,
                      message
                    );
                  }}
                >
                  <p>
                    {message.text}
                  </p>

                  <span>
                    {message.pending
                      ? 'Gönderiliyor...'
                      : formatMessageTime(
                        message.createdAt
                      )}
                  </span>
                </div>

                {active && (
                  <div
                    ref={
                      messageMenuRef
                    }
                    className="message-actions-menu"
                    style={{
                      position:
                        'fixed',
                      top:
                        messageMenu.top,
                      left:
                        messageMenu.left,
                      zIndex: 9999,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        deleteMessageForMe(
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
                          deleteMessageForEveryone(
                            message
                          )
                        }
                      >
                        Herkesten sil
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={sendMessage}
      >
        <input
          value={draft}
          onChange={(event) =>
            setDraft(
              event.target.value
            )
          }
          placeholder="Mesaj yaz..."
        />

        <button
          type="submit"
          className="send-btn"
          disabled={!draft.trim()}
        >
          ➤
        </button>
      </form>
    </div>
  );
}