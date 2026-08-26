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
  uploadToCloudinary,
} from '../../services/cloudinary';

import {
  getConversationId,
  formatMessageTime,
} from '../../services/chat';

import MessageBubble from './MessageBubble';
import MessageActions from './MessageActions';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';
import ComposerTools from './ComposerTools';

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

function getMessageText(message) {
  if (message.type === 'gif') {
    return 'GIF';
  }

  if (
    message.type === 'image'
  ) {
    return 'Fotoğraf';
  }

  if (
    message.type === 'file'
  ) {
    return message.fileName || 'Dosya';
  }

  return message.text || '';
}

export default function Conversation({
  currentUser,
  otherUser,
  onViewProfile,
  onCloseConversation,
}) {
  const [
    showMenu,
    setShowMenu,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    draft,
    setDraft,
  ] = useState('');

  const [
    selectedPhotos,
    setSelectedPhotos,
  ] = useState([]);

  const [
    previewPhoto,
    setPreviewPhoto,
  ] = useState(null);

  const [
    conversationMeta,
    setConversationMeta,
  ] = useState(null);

  const [
    deletedMessageIds,
    setDeletedMessageIds,
  ] = useState(new Set());

  const deletedMessageIdsRef =
    useRef(new Set());

  const [
    messageMenu,
    setMessageMenu,
  ] = useState(null);

  const [
    showEmojiPicker,
    setShowEmojiPicker,
  ] = useState(false);

  const [
    showGifPicker,
    setShowGifPicker,
  ] = useState(false);

  const [
    showComposerTools,
    setShowComposerTools,
  ] = useState(false);

  const photoInputRef = useRef(null);

  const fileInputRef = useRef(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    deletionsLoaded,
    setDeletionsLoaded,
  ] = useState(false);

  const [
    replyTo,
    setReplyTo,
  ] = useState(null);

  const [
    forwardMessage,
    setForwardMessage,
  ] = useState(null);

  const [
    usersForForward,
    setUsersForForward,
  ] = useState([]);

  const [
    forwardLoading,
    setForwardLoading,
  ] = useState(false);

  const [
    reactionLoading,
    setReactionLoading,
  ] = useState(false);

  const endRef =
    useRef(null);

  const menuRef =
    useRef(null);

  const messageMenuRef =
    useRef(null);

  // Duplicate submit kilidi: aynı kullanıcı eylemi iki kez tetiklense bile
  // yalnızca bir upload/batch işlemi çalışır.
  const sendingRef =
    useRef(false);

  const conversationId =
    getConversationId(
      currentUser.uid,
      otherUser.uid
    );

  const ensureConversation =
    async () => {
      await db
        .collection(
          'conversations'
        )
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

  /*
   * Aktif sohbet metadata
   */
  useEffect(() => {
    const unsubscribe =
      db
        .collection(
          'conversations'
        )
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
  }, [
    conversationId,
  ]);

  /*
   * Bu kullanıcının "benden sil"
   * kayıtlarını dinle.
   */
  useEffect(() => {
    const unsubscribe =
      db
        .collection(
          'messageDeletions'
        )
        .where(
          'uid',
          '==',
          currentUser.uid
        )
        .onSnapshot(
          (snapshot) => {
            const ids =
              new Set();

            snapshot.docs.forEach(
              (doc) => {
                const data =
                  doc.data();

                if (
                  data.conversationId ===
                  conversationId
                ) {
                  ids.add(
                    data.messageId
                  );
                }
              }
            );

            setDeletedMessageIds(
              ids
            );
            setDeletionsLoaded(true);
          },
          (error) => {
            console.error(
              'Mesaj silme kayıtları alınamadı:',
              error
            );

            setDeletionsLoaded(true);
          }
        );

    return unsubscribe;
  }, [
    currentUser.uid,
    conversationId,
  ]);
  useEffect(() => {
    deletedMessageIdsRef.current =
      deletedMessageIds;
  }, [
    deletedMessageIds,
  ]);

  /*
   * Mesajları canlı olarak al.
   *
   * İki sorgu kullanıyoruz:
   * - benim gönderdiğim
   * - bana gelen
   */
  /*
 * Aktif sohbetin bütün mesajlarını
 * tek Firestore sorgusuyla dinle.
 *
 * Böylece:
 * - gönderilen mesaj
 * - alınan mesaj
 * - iletilen mesaj
 *
 * aynı stream üzerinden gelir.
 *
 * Bu yapı sohbet değiştirince
 * mesajların kaybolmasını ve
 * forward mesajının sidebar'da olup
 * içeride görünmemesini engeller.
 */
  useEffect(() => {
    if (!deletionsLoaded) {
      return undefined;
    }

    setMessages([]);
    setMessageMenu(null);

    const unsubscribe =
      db
        .collection('messages')
        .where(
          'conversationId',
          '==',
          conversationId
        )
        .onSnapshot(
          (snapshot) => {
            const next =
              snapshot.docs
                .map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }))
                .filter(
                  (message) =>
                    !message.deletedForEveryone
                )
                .filter(
                  (message) =>
                    !deletedMessageIdsRef.current.has(
                      message.id
                    )
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
          },
          (error) => {
            console.error(
              'Mesajlar alınamadı:',
              error
            );
          }
        );

    return unsubscribe;
  }, [
    conversationId,
    deletionsLoaded,
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    messages.length,
  ]);

  /*
   * Menülerin dışına tıklanınca kapat.
   */
  useEffect(() => {
    const handleOutsideClick =
      (event) => {
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
          !event.target.closest(
            '.bubble'
          )
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

  const isArchived =
    (
      conversationMeta?.archivedBy ||
      []
    ).includes(
      currentUser.uid
    );

  const isPinned =
    (
      conversationMeta?.pinnedBy ||
      []
    ).includes(
      currentUser.uid
    );

  const isMuted =
    (
      conversationMeta?.mutedBy ||
      []
    ).includes(
      currentUser.uid
    );

  /*
   * Mesaj gönder
   */
  /*
   * Metin + fotoğraf(lar) gönder
    */
  /*
* Metin + fotoğraf(lar) gönder
*/
  /*
   * Metin + fotoğraf(lar) + belge gönder
   */
  const sendMessageInternal =
    async () => {
      const text =
        draft.trim();

      const hasPhotos =
        selectedPhotos.length > 0;

      const hasFile =
        !!selectedFile;

      if (
        !text &&
        !hasPhotos &&
        !hasFile
      ) {
        return;
      }

      /*
       * BELGE GÖNDERİMİ
       */
      if (hasFile) {
        try {
          const conversationRef =
            db
              .collection(
                'conversations'
              )
              .doc(conversationId);

          const messageRef =
            db
              .collection('messages')
              .doc();

          const uploadResult =
            await uploadToCloudinary(
              selectedFile.file,
              'raw'
            );

          const batch =
            db.batch();

          batch.set(
            messageRef,
            {
              conversationId,

              type: 'file',

              fileUrl:
                uploadResult.url,

              fileName:
                selectedFile.file.name,

              fileSize:
                selectedFile.file.size,

              mimeType:
                selectedFile.file.type ||
                'application/octet-stream',

              mediaPublicId:
                uploadResult.publicId,

              text,

              uid:
                currentUser.uid,

              senderId:
                currentUser.uid,

              receiverId:
                otherUser.uid,

              userName:
                currentUser.displayName ||
                'CyberTalk Kullanıcısı',

              photoURL:
                currentUser.photoURL ||
                '',

              createdAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            }
          );

          batch.set(
            conversationRef,
            {
              conversationId,

              participants: [
                currentUser.uid,
                otherUser.uid,
              ],

              lastMessage:
                `📎 ${selectedFile.file.name}`,

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

          await batch.commit();

          setSelectedFile(null);
          setDraft('');
          setReplyTo(null);
          setShowEmojiPicker(false);
          setShowGifPicker(false);

          return;
        } catch (error) {
          console.error(
            'Belge gönderilemedi:',
            error
          );

          alert(
            `Belge gönderilemedi.\n${error.code || ''}\n${error.message || error}`
          );

          return;
        }
      }

      const messageId =
        db
          .collection('messages')
          .doc().id;

      /*
       * FOTOĞRAF GÖNDERİMİ
       */
      if (hasPhotos) {
        try {
          const conversationRef =
            db
              .collection(
                'conversations'
              )
              .doc(conversationId);

          const batch =
            db.batch();

          for (
            let index = 0;
            index <
            selectedPhotos.length;
            index += 1
          ) {
            const photo =
              selectedPhotos[index];

            const photoMessageId =
              db
                .collection(
                  'messages'
                )
                .doc().id;

            const uploadResult =
              await uploadToCloudinary(
                photo.file
              );

            const messageRef =
              db
                .collection('messages')
                .doc(photoMessageId);

            batch.set(
              messageRef,
              {
                conversationId,

                type: 'image',

                fileUrl:
                  uploadResult.url,

                fileName:
                  photo.file.name,

                fileSize:
                  photo.file.size,

                mimeType:
                  photo.file.type,

                mediaPublicId:
                  uploadResult.publicId,

                text:
                  index === 0
                    ? text
                    : '',

                uid:
                  currentUser.uid,

                senderId:
                  currentUser.uid,

                receiverId:
                  otherUser.uid,

                userName:
                  currentUser.displayName ||
                  'CyberTalk Kullanıcısı',

                photoURL:
                  currentUser.photoURL ||
                  '',

                createdAt:
                  firebase.firestore.FieldValue.serverTimestamp(),
              }
            );
          }

          batch.set(
            conversationRef,
            {
              conversationId,

              participants: [
                currentUser.uid,
                otherUser.uid,
              ],

              lastMessage:
                text
                  ? `📷 ${text}`
                  : '📷 Fotoğraf',

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

          await batch.commit();

          selectedPhotos.forEach(
            (photo) => {
              URL.revokeObjectURL(
                photo.previewUrl
              );
            }
          );

          setSelectedPhotos([]);
          setPreviewPhoto(null);
          setDraft('');
          setReplyTo(null);
          setShowEmojiPicker(false);
          setShowGifPicker(false);

          return;
        } catch (error) {
          console.error(
            'Fotoğraf gönderilemedi:',
            error
          );

          setDraft(text);

          alert(
            `Fotoğraf gönderilemedi.\n${error.code || ''}\n${error.message || error}`
          );

          return;
        }
      }

      /*
       * NORMAL METİN MESAJI
       */
      const optimisticMessage = {
        id:
          messageId,

        conversationId,

        text,

        type: 'text',

        uid:
          currentUser.uid,

        senderId:
          currentUser.uid,

        receiverId:
          otherUser.uid,

        pending:
          true,

        localCreatedAt:
          Date.now(),

        replyTo:
          replyTo
            ? {
              messageId:
                replyTo.id,

              senderId:
                replyTo.senderId ||
                replyTo.uid,

              senderName:
                replyTo.userName ||
                otherUser.displayName ||
                'Kullanıcı',

              text:
                getMessageText(
                  replyTo
                ),
            }
            : null,
      };

      setMessages(
        (current) => [
          ...current,
          optimisticMessage,
        ]
      );

      setDraft('');
      setReplyTo(null);
      setShowEmojiPicker(false);
      setShowGifPicker(false);

      try {
        const conversationRef =
          db
            .collection(
              'conversations'
            )
            .doc(conversationId);

        const messageRef =
          db
            .collection('messages')
            .doc(messageId);

        const batch =
          db.batch();

        batch.set(
          conversationRef,
          {
            conversationId,

            participants: [
              currentUser.uid,
              otherUser.uid,
            ],

            lastMessage:
              text,

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

        batch.set(
          messageRef,
          {
            conversationId,

            text,

            type: 'text',

            uid:
              currentUser.uid,

            senderId:
              currentUser.uid,

            receiverId:
              otherUser.uid,

            userName:
              currentUser.displayName ||
              'CyberTalk Kullanıcısı',

            photoURL:
              currentUser.photoURL ||
              '',

            replyTo:
              optimisticMessage.replyTo,

            createdAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          }
        );

        await batch.commit();

        setMessages(
          (current) =>
            current.map(
              (message) =>
                message.id ===
                  messageId
                  ? {
                    ...message,
                    pending:
                      false,
                  }
                  : message
            )
        );
      } catch (error) {
        console.error(
          'Mesaj gönderilemedi:',
          error
        );

        setMessages(
          (current) =>
            current.filter(
              (message) =>
                message.id !==
                messageId
            )
        );

        setDraft(text);

        alert(
          `Mesaj gönderilemedi.\n${error.code || ''}\n${error.message || error}`
        );
      }
    };
/*
 * Emoji seç
 */
const handleEmojiSelect =
  (emoji) => {
    setDraft(
      (current) =>
        `${current}${emoji}`
    );

    setShowEmojiPicker(
      false
    );
  };
/*
 * GIF gönder
 */

const sendGif =
  async (gif) => {
    setShowGifPicker(
      false
    );

    const messageId =
      db
        .collection(
          'messages'
        )
        .doc().id;

    setMessages(
      (current) => [
        ...current,
        {
          id: messageId,
          conversationId,
          type: 'gif',
          gifUrl: gif.url,
          text: '',
          uid:
            currentUser.uid,
          senderId:
            currentUser.uid,
          receiverId:
            otherUser.uid,
          pending: true,
          localCreatedAt:
            Date.now(),
        },
      ]
    );

    try {
      await ensureConversation();

      await db
        .collection(
          'conversations'
        )
        .doc(conversationId)
        .set(
          {
            lastMessage:
              'GIF',

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
        .collection(
          'messages'
        )
        .doc(messageId)
        .set({
          conversationId,

          type: 'gif',

          gifUrl:
            gif.url,

          gifTitle:
            gif.title ||
            'GIF',

          text: '',

          uid:
            currentUser.uid,

          senderId:
            currentUser.uid,

          receiverId:
            otherUser.uid,

          userName:
            currentUser.displayName ||
            'CyberTalk Kullanıcısı',

          photoURL:
            currentUser.photoURL ||
            '',

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });

      setMessages(
        (current) =>
          current.map(
            (message) =>
              message.id ===
                messageId
                ? {
                  ...message,
                  pending:
                    false,
                }
                : message
          )
      );
    } catch (error) {
      console.error(
        'GIF gönderilemedi:',
        error
      );

      setMessages(
        (current) =>
          current.filter(
            (message) =>
              message.id !==
              messageId
          )
      );
    }
  };

/*
 * Sabitle / sessize al / arşiv
 */
const toggleFlag =
  async (
    field,
    enabled
  ) => {
    try {
      await ensureConversation();

      await db
        .collection(
          'conversations'
        )
        .doc(conversationId)
        .set(
          {
            [field]:
              enabled
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
        field ===
        'archivedBy' &&
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

/*
 * Sohbeti sadece benden kaldır.
 */
const deleteConversationForMe =
  async () => {
    try {
      await ensureConversation();

      await db
        .collection(
          'conversations'
        )
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

/*
 * Mesajı sadece benden sil.
 */
const deleteMessageForMe =
  async (message) => {
    try {
      const deletionId =
        `${message.id}_${currentUser.uid}`;

      await db
        .collection(
          'messageDeletions'
        )
        .doc(deletionId)
        .set({
          messageId:
            message.id,

          conversationId,

          uid:
            currentUser.uid,

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });

      setMessages(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              message.id
          )
      );

      setMessageMenu(
        null
      );
    } catch (error) {
      console.error(
        'Mesaj benden silinemedi:',
        error
      );
    }
  };

/*
 * Kendi mesajını herkesten sil.
 */
const deleteMessageForEveryone =
  async (message) => {
    const sender =
      message.senderId ||
      message.uid;

    if (
      sender !==
      currentUser.uid
    ) {
      return;
    }

    try {
      await db
        .collection('messages')
        .doc(message.id)
        .update({
          deletedForEveryone:
            true,

          deletedAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        });

      setMessages(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              message.id
          )
      );

      setMessageMenu(
        null
      );
    } catch (error) {
      console.error(
        'Mesaj herkesten silinemedi:',
        error
      );
    }
  };

/*
 * Reaction
 *
 * Şimdilik mesaj belgesi üzerinde
 * reactions map kullanıyoruz.
 */
/*
 * Mesaj reaction
 */
const handleReaction =
  async (
    message,
    emoji
  ) => {
    if (reactionLoading) {
      return;
    }

    setReactionLoading(true);

    try {
      const messageRef =
        db
          .collection('messages')
          .doc(message.id);

      const currentReactions =
        message.reactions || {};

      const currentReaction =
        currentReactions[
        currentUser.uid
        ];

      const nextReactions = {
        ...currentReactions,
      };

      if (
        currentReaction === emoji
      ) {
        delete nextReactions[
          currentUser.uid
        ];
      } else {
        nextReactions[
          currentUser.uid
        ] = emoji;
      }

      await messageRef.update({
        reactions:
          nextReactions,
      });

      setMessages(
        (current) =>
          current.map(
            (item) =>
              item.id === message.id
                ? {
                  ...item,
                  reactions:
                    nextReactions,
                }
                : item
          )
      );

      setMessageMenu(null);
    } catch (error) {
      console.error(
        'Reaction kaydedilemedi:',
        error
      );

      alert(
        `Reaction kaydedilemedi:\n${error.code || ''
        }\n${error.message ||
        error
        }`
      );
    } finally {
      setReactionLoading(false);
    }
  };
/*
 * Clipboard
 */
const copyMessage =
  async (message) => {
    const value =
      getMessageText(
        message
      );

    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        value
      );
    } catch (error) {
      console.error(
        'Mesaj kopyalanamadı:',
        error
      );
    }

    setMessageMenu(
      null
    );
  };

/*
 * Cevapla
 */
const startReply =
  (message) => {
    setReplyTo(
      message
    );

    setMessageMenu(
      null
    );

    setShowEmojiPicker(
      false
    );

    setShowGifPicker(
      false
    );
  };

/*
 * Forward penceresini aç.
 */
const openForward =
  async (message) => {
    setForwardMessage(
      message
    );

    setMessageMenu(
      null
    );

    setForwardLoading(
      true
    );

    try {
      const snapshot =
        await db
          .collection('conversations')
          .where(
            'participants',
            'array-contains',
            currentUser.uid
          )
          .get();

      const contactedUserIds =
        new Set();

      snapshot.docs.forEach(
        (doc) => {
          const data =
            doc.data();

          const participants =
            data.participants || [];

          participants.forEach(
            (uid) => {
              if (
                uid !==
                currentUser.uid
              ) {
                contactedUserIds.add(
                  uid
                );
              }
            }
          );
        }
      );

      contactedUserIds.delete(
        otherUser.uid
      );

      const userResults =
        await Promise.all(
          Array.from(
            contactedUserIds
          ).map(
            async (uid) => {
              const userSnapshot =
                await db
                  .collection('users')
                  .doc(uid)
                  .get();

              if (
                !userSnapshot.exists
              ) {
                return null;
              }

              return {
                uid:
                  userSnapshot.id,
                ...userSnapshot.data(),
              };
            }
          )
        );

      setUsersForForward(
        userResults.filter(
          Boolean
        )
      );
    } catch (error) {
      console.error(
        'Forward kullanıcıları alınamadı:',
        error
      );

      setUsersForForward(
        []
      );
    } finally {
      setForwardLoading(
        false
      );
    }
  };

/*
 * Mesajı başka kişiye ilet.
 */
/*
 * Mesajı başka kullanıcıya ilet
 */
const forwardToUser =
  async (targetUser) => {
    if (!forwardMessage) {
      return;
    }

    const targetConversationId =
      getConversationId(
        currentUser.uid,
        targetUser.uid
      );

    const targetConversationRef =
      db
        .collection(
          'conversations'
        )
        .doc(
          targetConversationId
        );

    const targetMessageRef =
      db
        .collection('messages')
        .doc();

    try {
      const batch =
        db.batch();

      batch.set(
        targetConversationRef,
        {
          conversationId:
            targetConversationId,

          participants: [
            currentUser.uid,
            targetUser.uid,
          ],

          lastMessage:
            `↗ ${getMessageText(
              forwardMessage
            )}`,

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

      batch.set(
        targetMessageRef,
        {
          conversationId:
            targetConversationId,

          type:
            'forward',

          text:
            forwardMessage.text ||
            getMessageText(
              forwardMessage
            ),

          forwardedFrom: {
            messageId:
              forwardMessage.id,

            conversationId,

            senderId:
              forwardMessage.senderId ||
              forwardMessage.uid,

            senderName:
              forwardMessage.userName ||
              otherUser.displayName ||
              'Kullanıcı',

            originalType:
              forwardMessage.type ||
              'text',

            originalGifUrl:
              forwardMessage.gifUrl ||
              '',
          },

          uid:
            currentUser.uid,

          senderId:
            currentUser.uid,

          receiverId:
            targetUser.uid,

          userName:
            currentUser.displayName ||
            'CyberTalk Kullanıcısı',

          photoURL:
            currentUser.photoURL ||
            '',

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp(),
        }
      );

      await batch.commit();

      setForwardMessage(null);

      setUsersForForward([]);

    } catch (error) {
      console.error(
        'Mesaj iletilemedi:',
        error
      );

      alert(
        `Mesaj iletilemedi:\n${error.code || ''
        }\n${error.message ||
        error
        }`
      );
    }
  };
/*
 * Mesaj menüsünü ekran içinde tut.
 */
const openMessageMenu =
  (
    event,
    message
  ) => {
    event.stopPropagation();

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth =
      210;

    const menuHeight =
      260;

    const gap = 8;

    const maxLeft =
      window.innerWidth -
      menuWidth -
      12;

    const desiredLeft =
      (
        message.senderId ||
        message.uid
      ) ===
        currentUser.uid
        ? rect.right -
        menuWidth
        : rect.left;

    const left =
      Math.max(
        12,
        Math.min(
          desiredLeft,
          maxLeft
        )
      );

    const desiredTop =
      rect.bottom +
      gap;

    const top =
      desiredTop +
        menuHeight >
        window.innerHeight
        ? Math.max(
          12,
          rect.top -
          menuHeight -
          gap
        )
        : desiredTop;

    setMessageMenu({
      id:
        message.id,

      top,

      left,
    });
  };

  /*
   * Tek bir kullanıcı eyleminin iki submit event'i üretmesi halinde
   * aynı mesajın iki kez gönderilmesini engelle.
   */
  const sendMessage =
    async (event) => {
      event.preventDefault();

      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;

      try {
        await sendMessageInternal();
      } finally {
        sendingRef.current = false;
      }
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
        <Avatar
          user={otherUser}
        />

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
            aria-expanded={
              showMenu
            }
            onClick={() =>
              setShowMenu(
                (value) =>
                  !value
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
                  setShowMenu(
                    false
                  );

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
                  setShowMenu(
                    false
                  );

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
        messages.map(
          (message) => {
            const mine =
              (
                message.senderId ||
                message.uid
              ) ===
              currentUser.uid;

            const active =
              messageMenu?.id ===
              message.id;

            const formattedTime =
              message.pending
                ? ''
                : formatMessageTime(
                  message.createdAt
                );

            return (
              <div
                key={
                  message.id
                }
                className="message-bubble-wrap"
              >

                <MessageBubble
                  message={{
                    ...message,
                    formattedTime,
                  }}
                  mine={mine}
                  active={active}
                  currentUser={
                    currentUser
                  }
                  onOpenMenu={
                    openMessageMenu
                  }
                />

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

                      zIndex:
                        9999,
                    }}
                  >
                    <MessageActions
                      message={
                        message
                      }

                      mine={
                        mine
                      }

                      onReply={
                        startReply
                      }

                      onForward={
                        openForward
                      }

                      onCopy={
                        copyMessage
                      }

                      onReaction={
                        handleReaction
                      }

                      onDeleteForMe={
                        deleteMessageForMe
                      }

                      onDeleteForEveryone={
                        deleteMessageForEveryone
                      }
                    />
                  </div>
                )}

              </div>
            );
          }
        )
      )}

      <div
        ref={endRef}
      />
    </div>

    <form
      className="composer"
      onSubmit={
        sendMessage
      }
    >{selectedFile && (
      <div className="file-composer-strip">
        <div className="file-composer-item">
          <span className="file-composer-icon">
            📄
          </span>

          <div className="file-composer-info">
            <strong>
              {selectedFile.file.name}
            </strong>

            <small>
              {Math.round(
                selectedFile.file.size /
                1024
              )}{' '}
              KB
            </small>
          </div>

          <button
            type="button"
            className="file-composer-remove"
            onClick={() =>
              setSelectedFile(null)
            }
          >
            ×
          </button>
        </div>
      </div>
    )}
      {selectedPhotos.length > 0 && (
        <div className="photo-composer-strip">
          {selectedPhotos.map(
            (photo) => (
              <div
                key={photo.id}
                className="photo-composer-item"
              >
                <button
                  type="button"
                  className="photo-composer-thumb"
                  onClick={() =>
                    setPreviewPhoto(
                      photo
                    )
                  }
                >
                  <img
                    src={
                      photo.previewUrl
                    }
                    alt="Seçilen fotoğraf"
                  />
                </button>

                <button
                  type="button"
                  className="photo-composer-remove"
                  onClick={() => {
                    URL.revokeObjectURL(
                      photo.previewUrl
                    );

                    setSelectedPhotos(
                      (current) =>
                        current.filter(
                          (item) =>
                            item.id !==
                            photo.id
                        )
                    );

                    if (
                      previewPhoto?.id ===
                      photo.id
                    ) {
                      setPreviewPhoto(
                        null
                      );
                    }
                  }}
                >
                  ×
                </button>
              </div>
            )
          )}
        </div>
      )}
      {previewPhoto && (
        <div
          className="photo-preview-modal"
          onClick={() =>
            setPreviewPhoto(null)
          }
        >
          <button
            type="button"
            className="photo-preview-close"
            onClick={(event) => {
              event.stopPropagation();
              setPreviewPhoto(null);
            }}
          >
            ×
          </button>

          <img
            src={previewPhoto.previewUrl}
            alt="Fotoğraf önizleme"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
      {replyTo && (
        <div className="reply-composer">

          <div>
            <strong>
              {replyTo.userName ||
                otherUser.displayName ||
                'Kullanıcı'}
            </strong>

            <span>
              {getMessageText(
                replyTo
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setReplyTo(
                null
              )
            }
            aria-label="Cevabı kapat"
          >
            ×
          </button>

        </div>
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={
            handleEmojiSelect
          }
          onClose={() =>
            setShowEmojiPicker(
              false
            )
          }
        />
      )}

      {showGifPicker && (
        <GifPicker
          onSelect={
            sendGif
          }
          onClose={() =>
            setShowGifPicker(
              false
            )
          }
        />
      )}

      <div
        className="composer-main"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          flexWrap: 'nowrap',
        }}
      >

        <div className="composer-actions">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (!file) {
                return;
              }

              const allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
              ];

              if (
                !allowedTypes.includes(
                  file.type
                )
              ) {
                alert(
                  'Sadece JPG, PNG, WEBP veya GIF seçebilirsin.'
                );

                event.target.value = '';
                return;
              }

              if (
                file.size >
                10 * 1024 * 1024
              ) {
                alert(
                  'Fotoğraf en fazla 10 MB olabilir.'
                );

                event.target.value = '';
                return;
              }

              const previewUrl = URL.createObjectURL(file);
              const photo = {
                id: Date.now(),
                file,
                previewUrl,
              };

              setSelectedPhotos((current) => [
                ...current,
                photo,
              ]);

              event.target.value = '';
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file =
                event.target.files?.[0];

              if (!file) {
                return;
              }

              if (
                file.size >
                25 * 1024 * 1024
              ) {
                alert(
                  'Belge en fazla 25 MB olabilir.'
                );

                event.target.value = '';
                return;
              }

              setSelectedFile({
                id: Date.now(),
                file,
              });

              event.target.value = '';
            }}
          />

          <button
            type="button"
            className="composer-plus-btn"
            aria-label="Ekler"
            aria-expanded={showComposerTools}
            onClick={() => {
              setShowComposerTools(
                (value) => !value
              );

              setShowEmojiPicker(false);
              setShowGifPicker(false);
            }}
          >
            +
          </button>

          {showComposerTools && (

            <ComposerTools
              onEmoji={() => {
                setShowEmojiPicker(true);
                setShowGifPicker(false);
              }}
              onGif={() => {
                setShowGifPicker(true);
                setShowEmojiPicker(false);
              }}
              onPhoto={() => {
                photoInputRef.current?.click();
              }}
              onDocument={() => {
                fileInputRef.current?.click();
              }}
              onClose={() => {
                setShowComposerTools(false);
              }}
            />

          )}

        </div>

        <input
          value={draft}
          onChange={(event) =>
            setDraft(
              event.target.value
            )
          }
          placeholder={
            replyTo
              ? 'Cevabını yaz...'
              : 'Mesaj yaz...'
          }
          style={{
            flex: '1 1 auto',
            minWidth: 0,
          }}
        />

        <button
          type="submit"
          className="send-btn"
          disabled={
            !draft.trim() &&
            selectedPhotos.length === 0 &&
            !selectedFile
          }
          style={{
            flex: '0 0 auto',
          }}
        >
          ➤
        </button>

      </div>

    </form>

    {forwardMessage && (
      <div
        className="forward-overlay"
        onClick={() =>
          setForwardMessage(
            null
          )
        }
      >
        <div
          className="forward-panel"
          onClick={(event) =>
            event.stopPropagation()
          }
        >

          <div className="forward-header">
            <div>
              <strong>
                Mesajı ilet
              </strong>

              <span>
                Kime göndermek
                istiyorsun?
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setForwardMessage(
                  null
                )
              }
            >
              ×
            </button>
          </div>

          {forwardLoading ? (
            <div className="forward-state">
              Kullanıcılar
              yükleniyor...
            </div>
          ) : !usersForForward.length ? (
            <div className="forward-state">
              İletilecek başka
              kullanıcı bulunamadı.
            </div>
          ) : (
            <div className="forward-users">

              {usersForForward.map(
                (user) => (
                  <button
                    key={
                      user.uid
                    }
                    type="button"
                    className="forward-user"
                    onClick={() =>
                      forwardToUser(
                        user
                      )
                    }
                  >
                    <Avatar
                      user={user}
                    />

                    <div>
                      <strong>
                        {user.displayName ||
                          'CyberTalk Kullanıcısı'}
                      </strong>

                      <span>
                        @{user.username ||
                          'kullanici'}
                      </span>
                    </div>
                  </button>
                )
              )}

            </div>
          )}

        </div>
      </div>
    )}
  </div>
  );
}
