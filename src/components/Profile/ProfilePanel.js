import React, { useEffect, useState } from 'react';
import { auth, db, firebase } from '../../services/firebase';

function Avatar({ user, large = false }) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className={`profile-avatar ${large ? 'large' : ''}`}
      />
    );
  }

  const initials = (user.displayName || 'CT')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`profile-avatar profile-avatar-fallback ${large ? 'large' : ''}`}>
      {initials || 'CT'}
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return '—';

  return timestamp.toDate().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfilePanel({ user, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;

    db.collection('users')
      .doc(user.uid)
      .get()
      .then((snapshot) => {
        if (!alive) return;

        const data = snapshot.data() || {};
        setProfile(data);
        setName(data.displayName || user.displayName || '');
      })
      .catch((error) => {
        console.error('Profil alınamadı:', error);
        if (alive) setMessage('Profil bilgileri alınamadı.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user]);

  const saveName = async (event) => {
    event.preventDefault();

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      setMessage('Ad soyad en az 2 karakter olmalı.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await db.collection('users').doc(user.uid).set(
        {
          displayName: cleanName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await user.updateProfile({ displayName: cleanName });

      setProfile((current) => ({
        ...(current || {}),
        displayName: cleanName,
      }));
      setEditingName(false);
      setMessage('Ad soyad güncellendi.');
    } catch (error) {
      console.error('Ad soyad güncellenemedi:', error);
      setMessage('Ad soyad güncellenemedi. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <section className="profile-panel" onClick={(event) => event.stopPropagation()}>
        <header className="profile-header">
          <div>
            <div className="profile-kicker">HESABIM</div>
            <h2>Profilim</h2>
          </div>

          <button className="profile-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="profile-content">
          <div className="profile-hero">
            <Avatar user={user} large />
            <div className="profile-identity">
              <strong>{profile?.displayName || user.displayName || 'CyberTalk Kullanıcısı'}</strong>
              <span>@{profile?.username || 'kullanici'}</span>
              <span className="profile-status">
                <i></i> Çevrimiçi
              </span>
            </div>
          </div>

          {loading ? (
            <div className="profile-loading">Profil yükleniyor...</div>
          ) : (
            <>
              <div className="profile-section">
                <div className="profile-section-title">HESAP BİLGİLERİ</div>

                <div className="profile-field">
                  <span>E-posta</span>
                  <strong>{profile?.email || user.email || '—'}</strong>
                </div>

                <div className="profile-field">
                  <span>Kullanıcı adı</span>
                  <strong>@{profile?.username || '—'}</strong>
                </div>

                <div className="profile-field">
                  <span>Hesap türü</span>
                  <strong>{profile?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</strong>
                </div>

                <div className="profile-field">
                  <span>CyberTalk'a katılım</span>
                  <strong>{formatDate(profile?.createdAt)}</strong>
                </div>
              </div>

              <div className="profile-section">
                <div className="profile-section-title">PROFİL</div>

                {!editingName ? (
                  <div className="profile-action-row">
                    <div>
                      <span>Ad Soyad</span>
                      <strong>{profile?.displayName || user.displayName || '—'}</strong>
                    </div>

                    <button
                      className="profile-action-btn"
                      onClick={() => {
                        setName(profile?.displayName || user.displayName || '');
                        setMessage('');
                        setEditingName(true);
                      }}
                    >
                      Düzenle
                    </button>
                  </div>
                ) : (
                  <form className="profile-edit-form" onSubmit={saveName}>
                    <label>
                      Ad Soyad
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoFocus
                      />
                    </label>

                    <div className="profile-edit-actions">
                      <button
                        type="button"
                        className="profile-action-btn secondary"
                        onClick={() => {
                          setEditingName(false);
                          setMessage('');
                        }}
                        disabled={saving}
                      >
                        Vazgeç
                      </button>

                      <button
                        type="submit"
                        className="profile-action-btn primary"
                        disabled={saving}
                      >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="profile-action-row disabled">
                  <div>
                    <span>Kullanıcı adı</span>
                    <strong>@{profile?.username || '—'}</strong>
                  </div>
                  <span className="coming-soon">Yakında</span>
                </div>
              </div>

              {message && <div className="profile-message">{message}</div>}

              <div className="profile-section danger-section">
                <div className="profile-section-title">HESAP</div>

                <button
                  className="logout-btn"
                  onClick={() => auth.signOut()}
                >
                  <span>↪</span>
                  Çıkış Yap
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
