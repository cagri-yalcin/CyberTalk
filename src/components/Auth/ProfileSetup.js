import React, { useState } from 'react';

import {
  db,
  firebase,
  auth,
} from '../../services/firebase';

const USERNAME_PATTERN =
  /^[a-zA-Z0-9._]{3,20}$/;

export default function ProfileSetup({
  user,
  onComplete,
  onSignOut,
}) {
  const [
    username,
    setUsername,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState('');

  const save = async (
    event
  ) => {
    event.preventDefault();

    const cleanUsername =
      username
        .trim()
        .toLowerCase();

    if (
      !USERNAME_PATTERN.test(
        cleanUsername
      )
    ) {
      setMessage(
        'Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam, nokta veya alt çizgi içermeli.'
      );

      return;
    }

    setSaving(true);
    setMessage('');

    const usernameRef =
      db
        .collection('usernames')
        .doc(cleanUsername);

    const profileRef =
      db
        .collection('users')
        .doc(user.uid);

    try {
      await db.runTransaction(
        async (transaction) => {
          const usernameSnapshot =
            await transaction.get(
              usernameRef
            );

          if (
            usernameSnapshot.exists &&
            usernameSnapshot.data()
              .uid !== user.uid
          ) {
            throw new Error(
              'Bu kullanıcı adı zaten kullanılıyor.'
            );
          }

          transaction.set(
            usernameRef,
            {
              uid: user.uid,

              updatedAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          transaction.set(
            profileRef,
            {
              uid: user.uid,

              username:
                cleanUsername,

              updatedAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }
      );

      /*
       * Kullanıcı adı gerçekten Firestore'a
       * yazıldıktan sonra uygulamaya geç.
       */
      onComplete();
    } catch (error) {
      console.error(
        'Kullanıcı adı kaydedilemedi:',
        error
      );

      setMessage(
        error.message ||
          'Kullanıcı adı kaydedilemedi.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">

        <div className="brand-row">
          <div className="brand-mark">
            CT
          </div>

          <div>
            <div className="brand-name">
              CyberTalk
            </div>

            <div className="brand-subtitle">
              Profilini tamamla
            </div>
          </div>
        </div>

        <div className="auth-eyebrow">
          ◈ SON BİR ADIM
        </div>

        <h1>
          Kullanıcı adını seç.
        </h1>

        <p className="auth-copy">
          İnsanların seni CyberTalk'ta
          bulabilmesi için benzersiz bir
          kullanıcı adı belirle.
        </p>

        <form
          onSubmit={save}
          className="auth-form"
        >
          <label>
            Kullanıcı Adı

            <div className="username-input">
              <span>@</span>

              <input
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value.replace(
                      /\s/g,
                      ''
                    )
                  )
                }
                placeholder="kullaniciadi"
                maxLength={20}
                autoFocus
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="primary-btn"
            disabled={saving}
          >
            {saving
              ? 'Kaydediliyor...'
              : 'CyberTalk Profilimi Oluştur'}
          </button>
        </form>

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            onSignOut
              ? onSignOut()
              : auth.signOut()
          }
          disabled={saving}
        >
          Farklı hesapla giriş yap
        </button>

        <div className="auth-foot">
          CyberTalk · Güvenli iletişim platformu
        </div>

      </section>
    </main>
  );
}
