import React, { useEffect, useRef, useState } from 'react';
import { db, firebase } from '../../services/firebase';
import { getConversationId, formatMessageTime } from '../../services/chat';

function Avatar({ user }) {
  if (user.photoURL) return <img src={user.photoURL} alt="" className="avatar" />;
  return <div className="avatar avatar-fallback">CT</div>;
}

export default function Conversation({ currentUser, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  const conversationId = getConversationId(currentUser.uid, otherUser.uid);

  useEffect(() => {
    const unsubscribe = db
      .collection('messages')
      .where('conversationId', '==', conversationId)
      .onSnapshot(
        (snapshot) => {
          const items = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
              const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
              return at - bt;
            });
          setMessages(items);
        },
        (error) => console.error('Mesajlar alınamadı:', error)
      );

    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const conversationRef = db.collection('conversations').doc(conversationId);

    await conversationRef.set({
      conversationId,
      participants: [currentUser.uid, otherUser.uid],
      lastMessage: text,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('messages').add({
      conversationId,
      text,
      uid: currentUser.uid,
      senderId: currentUser.uid,
      receiverId: otherUser.uid,
      photoURL: currentUser.photoURL || '',
      userName: currentUser.displayName || 'CyberTalk Kullanıcısı',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setDraft('');
  };

  return (
    <div className="conversation">
      <header className="conversation-header">
        <div className="conversation-person">
          <Avatar user={otherUser} />
          <div>
            <strong>{otherUser.displayName || 'CyberTalk Kullanıcısı'}</strong>
            <span>Çevrimiçi</span>
          </div>
        </div>
        <div className="conversation-actions">
          <button className="icon-btn" title="Yakında">☎</button>
          <button className="icon-btn" title="Yakında">▣</button>
          <button className="icon-btn" title="Daha fazla">•••</button>
        </div>
      </header>

      <div className="messages">
        {!messages.length ? (
          <div className="conversation-empty">
            <div className="big-lock">🔒</div>
            <h2>İlk mesajı gönder</h2>
            <p>{otherUser.displayName || 'Kullanıcı'} ile konuşmayı başlat.</p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.uid === currentUser.uid;
            return (
              <div key={message.id} className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
                <div className={`bubble ${mine ? 'mine' : 'theirs'}`}>
                  <p>{message.text}</p>
                  <span>{formatMessageTime(message.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={sendMessage}>
        <button type="button" className="icon-btn" title="Yakında">＋</button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mesaj yaz..."
        />
        <button type="submit" className="send-btn" disabled={!draft.trim()}>➤</button>
      </form>
    </div>
  );
}
