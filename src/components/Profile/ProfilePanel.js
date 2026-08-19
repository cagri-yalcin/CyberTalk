import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  auth,
  db,
  firebase,
} from '../../services/firebase';

import {
  compressProfileImage,
} from '../../services/profileImage';

function Avatar({
  user,
  large = false,
}) {
  if (user.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt=""
        className={`profile-avatar ${large ? 'large' : ''
          }`}
      />
    );
  }

  const initials = (
    user.displayName || 'CT'
  )
    .split(' ')
    .slice(0, 2)
    .map(
      (part) => part[0]
    )
    .join('')
    .toUpperCase();

  return (
    <div
      className={`profile-avatar profile-avatar-fallback ${large ? 'large' : ''
        }`}
    >
      {initials || 'CT'}
    </div>
  );
}

function formatDate(
  timestamp
) {
  if (
    !timestamp?.toDate
  ) {
    return '—';
  }

  return timestamp
    .toDate()
    .toLocaleDateString(
      'tr-TR',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }
    );
}

export default function ProfilePanel({
  user,
  isOwnProfile = false,
  onClose,
}) {
  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    editingName,
    setEditingName,
  ] = useState(false);

  const [
    editingAbout,
    setEditingAbout,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState('');

  const [
    about,
    setAbout,
  ] = useState('');

  const [
    gender,
    setGender,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    photoSaving,
    setPhotoSaving,
  ] = useState(false);

  const [
    notice,
    setNotice,
  ] = useState(null);

  const noticeTimer =
    useRef(null);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setNotice(null);

    db.collection('users')
      .doc(user.uid)
      .get()
      .then(
        (snapshot) => {
          if (!alive) {
            return;
          }

          const data =
            snapshot.data() ||
            {};

          setProfile(data);

          setName(
            data.displayName ||
            user.displayName ||
            ''
          );

          setAbout(
            data.about || ''
          );

          setGender(
            data.gender || ''
          );
        }
      )
      .catch((error) => {
        console.error(
          'Profil alınamadı:',
          error
        );

        if (alive) {
          showNotice(
            'Profil bilgileri alınamadı.',
            'error'
          );
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;

      if (noticeTimer.current) {
        clearTimeout(
          noticeTimer.current
        );
      }
    };
  }, [user]);

  const showNotice =
    (
      text,
      type = 'success'
    ) => {
      setNotice({
        text,
        type,
      });

      if (noticeTimer.current) {
        clearTimeout(
          noticeTimer.current
        );
      }

      noticeTimer.current =
        setTimeout(() => {
          setNotice(null);
        }, 3000);
    };

  const saveName = async (
    event
  ) => {
    event.preventDefault();

    if (!isOwnProfile) {
      return;
    }

    const cleanName =
      name.trim();

    if (
      cleanName.length < 2
    ) {
      showNotice(
        'Ad soyad en az 2 karakter olmalı.',
        'error'
      );
      return;
    }

    setSaving(true);

    try {
      await db
        .collection('users')
        .doc(user.uid)
        .set(
          {
            displayName:
              cleanName,

            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

      setProfile(
        (current) => ({
          ...(current || {}),
          displayName:
            cleanName,
        })
      );

      setEditingName(false);

      showNotice(
        'Ad soyad başarıyla güncellendi.'
      );
    } catch (error) {
      console.error(
        'Ad soyad güncellenemedi:',
        error
      );

      showNotice(
        'Ad soyad güncellenemedi.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async (
    event
  ) => {
    event.preventDefault();

    if (!isOwnProfile) {
      return;
    }

    const cleanAbout =
      about.trim();

    if (
      cleanAbout.length >
      150
    ) {
      showNotice(
        'Hakkında alanı en fazla 150 karakter olabilir.',
        'error'
      );
      return;
    }

    setSaving(true);

    try {
      await db
        .collection('users')
        .doc(user.uid)
        .set(
          {
            about:
              cleanAbout,

            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

      setProfile(
        (current) => ({
          ...(current || {}),
          about:
            cleanAbout,
        })
      );

      setEditingAbout(false);

      showNotice(
        'Hakkında bilgisi başarıyla güncellendi.'
      );
    } catch (error) {
      console.error(
        'Hakkında güncellenemedi:',
        error
      );

      showNotice(
        'Hakkında güncellenemedi.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveGender =
    async (value) => {
      if (!isOwnProfile) {
        return;
      }

      setGender(value);

      try {
        await db
          .collection('users')
          .doc(user.uid)
          .set(
            {
              gender: value,

              updatedAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );

        setProfile(
          (current) => ({
            ...(current || {}),
            gender: value,
          })
        );

        showNotice(
          'Cinsiyet başarıyla güncellendi.'
        );
      } catch (error) {
        console.error(
          'Cinsiyet güncellenemedi:',
          error
        );

        showNotice(
          'Cinsiyet güncellenemedi.',
          'error'
        );
      }
    };

  const changePhoto =
    async (event) => {
      if (!isOwnProfile) {
        return;
      }

      const input =
        event.currentTarget;

      const file =
        input?.files?.[0];

      if (!file) {
        return;
      }

      setPhotoSaving(true);

      try {
        const photoURL =
          await compressProfileImage(
            file
          );

        await db
          .collection('users')
          .doc(user.uid)
          .set(
            {
              photoURL,

              updatedAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );

        setProfile(
          (current) => ({
            ...(current || {}),
            photoURL,
          })
        );

        showNotice(
          'Profil fotoğrafı başarıyla değiştirildi.'
        );
      } catch (error) {
        console.error(
          'Profil fotoğrafı değiştirilemedi:',
          error
        );

        showNotice(
          error.message ||
          'Profil fotoğrafı değiştirilemedi.',
          'error'
        );
      } finally {
        setPhotoSaving(false);

        if (input) {
          input.value = '';
        }
      }
    };

  const removePhoto =
    async () => {
      if (!isOwnProfile) {
        return;
      }

      setPhotoSaving(true);

      try {
        await db
          .collection('users')
          .doc(user.uid)
          .set(
            {
              photoURL: '',

              updatedAt:
                firebase.firestore.FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );

        setProfile(
          (current) => ({
            ...(current || {}),
            photoURL: '',
          })
        );

        showNotice(
          'Profil fotoğrafı başarıyla kaldırıldı.'
        );
      } catch (error) {
        console.error(
          'Profil fotoğrafı kaldırılamadı:',
          error
        );

        showNotice(
          'Profil fotoğrafı kaldırılamadı.',
          'error'
        );
      } finally {
        setPhotoSaving(false);
      }
    };

  const displayName =
    profile?.displayName ||
    user.displayName ||
    'CyberTalk Kullanıcısı';

  const username =
    profile?.username || '';

  const currentAbout =
    profile?.about || '';

  const genderLabel =
    profile?.gender === 'male'
      ? 'Erkek'
      : profile?.gender ===
        'female'
        ? 'Kadın'
        : profile?.gender ===
          'prefer-not-to-say'
          ? 'Belirtmek istemiyor'
          : 'Belirtilmedi';

  return (
    <div
      className="profile-overlay"
      onClick={onClose}
    >
      <section
        className="profile-panel"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="profile-header">
          <div>
            <div className="profile-kicker">
              {isOwnProfile
                ? 'HESABIM'
                : 'KULLANICI PROFİLİ'}
            </div>

            <h2>
              {isOwnProfile
                ? 'Profilim'
                : 'Profil'}
            </h2>
          </div>

          <button
            type="button"
            className="profile-close"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </header>

        {notice && (
          <div
            className={`profile-notice ${notice.type ===
                'error'
                ? 'error'
                : 'success'
              }`}
          >
            {notice.text}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-hero">
            <Avatar
              user={{
                ...user,
                ...(profile || {}),
              }}
              large
            />

            <div className="profile-identity">
              <strong>
                {displayName}
              </strong>

              <span>
                @{username ||
                  'kullanici'}
              </span>

              <span className="profile-status">
                <i></i>
                Çevrimiçi
              </span>
            </div>
          </div>

          {loading ? (
            <div className="profile-loading">
              Profil yükleniyor...
            </div>
          ) : (
            <>
              {isOwnProfile && (
                <div className="profile-section">
                  <div className="profile-section-title">
                    PROFİL FOTOĞRAFI
                  </div>

                  <div className="profile-photo-actions">
                    <label className="profile-action-btn">
                      {photoSaving
                        ? 'İşleniyor...'
                        : 'Fotoğraf değiştir'}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={
                          changePhoto
                        }
                        hidden
                        disabled={
                          photoSaving
                        }
                      />
                    </label>

                    {profile?.photoURL && (
                      <button
                        type="button"
                        className="profile-action-btn secondary"
                        onClick={
                          removePhoto
                        }
                        disabled={
                          photoSaving
                        }
                      >
                        Fotoğrafı kaldır
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="profile-section">
                <div className="profile-section-title">
                  HESAP BİLGİLERİ
                </div>

                {isOwnProfile && (
                  <div className="profile-field">
                    <span>
                      E-posta
                    </span>

                    <strong>
                      {profile?.email ||
                        user.email ||
                        '—'}
                    </strong>
                  </div>
                )}

                <div className="profile-field">
                  <span>
                    Kullanıcı adı
                  </span>

                  <strong className="full-username">
                    @{username ||
                      '—'}
                  </strong>
                </div>

                <div className="profile-field">
                  <span>
                    Katılım
                  </span>

                  <strong>
                    {formatDate(
                      profile?.createdAt
                    )}
                  </strong>
                </div>
              </div>

              <div className="profile-section">
                <div className="profile-section-title">
                  PROFİL
                </div>

                {isOwnProfile ? (
                  !editingName ? (
                    <div className="profile-action-row">
                      <div>
                        <span>
                          Ad Soyad
                        </span>

                        <strong>
                          {displayName}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="profile-action-btn"
                        onClick={() => {
                          setName(
                            displayName
                          );

                          setEditingName(
                            true
                          );
                        }}
                      >
                        Düzenle
                      </button>
                    </div>
                  ) : (
                    <form
                      className="profile-edit-form"
                      onSubmit={
                        saveName
                      }
                    >
                      <label>
                        Ad Soyad

                        <input
                          value={name}
                          onChange={(
                            event
                          ) =>
                            setName(
                              event.target.value
                            )
                          }
                          autoFocus
                        />
                      </label>

                      <div className="profile-edit-actions">
                        <button
                          type="button"
                          className="profile-action-btn secondary"
                          onClick={() =>
                            setEditingName(
                              false
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Vazgeç
                        </button>

                        <button
                          type="submit"
                          className="profile-action-btn primary"
                          disabled={
                            saving
                          }
                        >
                          {saving
                            ? 'Kaydediliyor...'
                            : 'Kaydet'}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="profile-action-row read-only">
                    <div>
                      <span>
                        Ad Soyad
                      </span>

                      <strong>
                        {displayName}
                      </strong>
                    </div>
                  </div>
                )}

                {isOwnProfile ? (
                  !editingAbout ? (
                    <div className="profile-action-row">
                      <div>
                        <span>
                          Hakkında
                        </span>

                        <strong>
                          {currentAbout ||
                            'Henüz bilgi eklenmedi.'}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="profile-action-btn"
                        onClick={() => {
                          setAbout(
                            currentAbout
                          );

                          setEditingAbout(
                            true
                          );
                        }}
                      >
                        Düzenle
                      </button>
                    </div>
                  ) : (
                    <form
                      className="profile-edit-form"
                      onSubmit={
                        saveAbout
                      }
                    >
                      <label>
                        Hakkında

                        <textarea
                          value={
                            about
                          }
                          maxLength={
                            150
                          }
                          onChange={(
                            event
                          ) =>
                            setAbout(
                              event.target.value
                            )
                          }
                          autoFocus
                        />
                      </label>

                      <div className="profile-edit-actions">
                        <button
                          type="button"
                          className="profile-action-btn secondary"
                          onClick={() =>
                            setEditingAbout(
                              false
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Vazgeç
                        </button>

                        <button
                          type="submit"
                          className="profile-action-btn primary"
                          disabled={
                            saving
                          }
                        >
                          {saving
                            ? 'Kaydediliyor...'
                            : 'Kaydet'}
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <div className="profile-action-row read-only">
                    <div>
                      <span>
                        Hakkında
                      </span>

                      <strong>
                        {currentAbout ||
                          'Henüz bilgi eklenmedi.'}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="profile-action-row">
                  <div>
                    <span>
                      Cinsiyet
                    </span>

                    <strong>
                      {genderLabel}
                    </strong>
                  </div>

                  {isOwnProfile && (
                    <select
                      className="profile-select"
                      value={
                        gender || ''
                      }
                      onChange={(
                        event
                      ) =>
                        saveGender(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Seçiniz
                      </option>

                      <option value="male">
                        Erkek
                      </option>

                      <option value="female">
                        Kadın
                      </option>

                      <option value="prefer-not-to-say">
                        Belirtmek istemiyorum
                      </option>
                    </select>
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <div className="profile-section danger-section">
                  <div className="profile-section-title">
                    HESAP
                  </div>

                  <button
                    type="button"
                    className="logout-btn"
                    onClick={() =>
                      auth.signOut()
                    }
                  >
                    <span>↪</span>
                    Çıkış Yap
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}