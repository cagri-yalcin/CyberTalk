import React, {
  useEffect,
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

function friendlyAuthError(error) {
  const map = {
    'auth/invalid-email':
      'Geçerli bir e-posta adresi gir.',

    'auth/user-not-found':
      'Bu e-posta ile kayıtlı bir hesap bulunamadı.',

    'auth/wrong-password':
      'E-posta veya şifre hatalı.',

    'auth/invalid-credential':
      'E-posta veya şifre hatalı.',

    'auth/email-already-in-use':
      'Bu e-posta adresi zaten kullanılıyor.',

    'auth/weak-password':
      'Şifre en az 6 karakter olmalı.',

    'auth/popup-closed-by-user':
      'Google giriş penceresi kapatıldı.',

    'auth/popup-blocked':
      'Tarayıcı açılır pencereyi engelledi.',

    'auth/operation-not-allowed':
      'Bu giriş yöntemi Firebase tarafında etkin değil.',
  };

  return (
    map[error?.code] ||
    error?.message ||
    'İşlem sırasında bir hata oluştu.'
  );
}

export default function AuthPage() {
  const [mode, setMode] =
    useState('login');

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [fullName, setFullName] =
    useState('');

  const [gender, setGender] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [passwordAgain, setPasswordAgain] =
    useState('');

  const [photoFile, setPhotoFile] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState('');

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(
          photoPreview
        );
      }
    };
  }, [photoPreview]);

  const resetFields = () => {
    setMessage('');
    setFullName('');
    setGender('');
    setEmail('');
    setPassword('');
    setPasswordAgain('');
    setPhotoFile(null);

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhotoPreview('');
  };

  const switchMode = (
    nextMode
  ) => {
    resetFields();
    setMode(nextMode);
  };

  const handlePhotoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setPhotoFile(null);
      setMessage(
        'Profil fotoğrafı JPG, PNG veya WEBP olmalı.'
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setPhotoFile(null);
      setMessage(
        'Profil fotoğrafı en fazla 5 MB olabilir.'
      );
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setPhotoFile(file);
    setPhotoPreview(
      URL.createObjectURL(file)
    );
    setMessage('');
  };

  const login = async (
    event
  ) => {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      await auth.signInWithEmailAndPassword(
        email.trim(),
        password
      );
    } catch (error) {
      console.error(
        'Giriş başarısız:',
        error
      );

      const rawMessage =
        String(
          error?.message || ''
        ).toUpperCase();

      if (
        error?.code ===
        'auth/invalid-credential' ||
        error?.code ===
        'auth/wrong-password' ||
        error?.code ===
        'auth/user-not-found' ||
        rawMessage.includes(
          'INVALID_LOGIN_CREDENTIALS'
        )
      ) {
        setMessage(
          'E-posta veya şifre yanlış.'
        );
      } else if (
        error?.code ===
        'auth/invalid-email'
      ) {
        setMessage(
          'Geçerli bir e-posta adresi gir.'
        );
      } else {
        setMessage(
          'Giriş yapılamadı. Lütfen bilgilerini kontrol et.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const signInGoogle =
    async () => {
      setLoading(true);
      setMessage('');

      try {
        const provider =
          new firebase.auth.GoogleAuthProvider();

        provider.setCustomParameters({
          prompt:
            'select_account',
        });

        await auth.signInWithPopup(
          provider
        );
      } catch (error) {
        setMessage(
          friendlyAuthError(error)
        );
      } finally {
        setLoading(false);
      }
    };

  const register =
    async (event) => {
      event.preventDefault();

      setMessage('');

      const cleanName =
        fullName.trim();

      const cleanEmail =
        email.trim();

      if (
        cleanName.length < 2
      ) {
        setMessage(
          'Ad soyad en az 2 karakter olmalı.'
        );
        return;
      }

      if (!cleanEmail) {
        setMessage(
          'E-posta adresi gerekli.'
        );
        return;
      }

      if (
        password.length < 6
      ) {
        setMessage(
          'Şifre en az 6 karakter olmalı.'
        );
        return;
      }

      if (
        password !== passwordAgain
      ) {
        setMessage(
          'Şifreler eşleşmiyor.'
        );
        return;
      }

      if (!gender) {
        setMessage(
          'Lütfen cinsiyet seçimini yap.'
        );
        return;
      }

      setLoading(true);

      try {
        const credential =
          await auth.createUserWithEmailAndPassword(
            cleanEmail,
            password
          );

        let photoURL = '';

        if (photoFile) {
          photoURL =
            await compressProfileImage(
              photoFile
            );
        }

        /*
         * Burada username YOK.
         * Kullanıcı adı bir sonraki
         * ProfileSetup adımında alınacak.
         */
        await db
          .collection('users')
          .doc(
            credential.user.uid
          )
          .set({
            uid:
              credential.user.uid,

            displayName:
              cleanName,

            gender,

            about: '',

            email:
              credential.user.email ||
              cleanEmail,

            photoURL,

            role: 'user',

            createdAt:
              firebase.firestore.FieldValue.serverTimestamp(),

            updatedAt:
              firebase.firestore.FieldValue.serverTimestamp(),
          });

        /*
         * Auth user üzerinde updateProfile
         * kullanmıyoruz. Firestore bizim
         * profil kaynağımız.
         */
      } catch (error) {
        console.error(
          'Kayıt işlemi başarısız:',
          error
        );

        setMessage(
          friendlyAuthError(error)
        );
      } finally {
        setLoading(false);
      }
    };

  const resetPassword =
    async (event) => {
      event.preventDefault();

      const cleanEmail =
        email.trim();

      if (!cleanEmail) {
        setMessage(
          'Önce e-posta adresini gir.'
        );
        return;
      }

      setLoading(true);
      setMessage('');

      try {
        await auth.sendPasswordResetEmail(
          cleanEmail
        );

        setMessage(
          'Şifre sıfırlama bağlantısı e-posta adresine gönderildi.'
        );
      } catch (error) {
        setMessage(
          friendlyAuthError(error)
        );
      } finally {
        setLoading(false);
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
              Güvenli iletişim platformu
            </div>
          </div>
        </div>

        <div className="auth-eyebrow">
          ◈ CYBERTALK HESABI
        </div>

        {mode === 'login' && (
          <>
            <h1>
              Tekrar hoş geldin.
            </h1>

            <p className="auth-copy">
              Hesabına giriş yap ve
              konuşmaya devam et.
            </p>

            <form
              onSubmit={login}
              className="auth-form"
            >
              <label>
                E-posta

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <label>
                Şifre

                <input
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? 'Giriş yapılıyor...'
                  : 'Giriş Yap'}
              </button>
            </form>

            <div className="divider">
              <span>veya</span>
            </div>

            <button
              type="button"
              className="google-btn"
              onClick={
                signInGoogle
              }
              disabled={loading}
            >
              <span className="google-icon">
                G
              </span>

              Google ile devam et
            </button>

            <div className="auth-links">
              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'forgot'
                  )
                }
              >
                Şifremi unuttum
              </button>

              <span>·</span>

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'register'
                  )
                }
              >
                Hesap oluştur
              </button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <h1>
              CyberTalk'a katıl.
            </h1>

            <p className="auth-copy">
              Hesabını oluştur, ardından
              kullanıcı adını belirle.
            </p>

            <form
              onSubmit={register}
              className="auth-form"
            >
              <label>
                Ad Soyad

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Ad Soyad"
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                E-posta

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <label>
                Şifre

                <input
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  type="password"
                  autoComplete="new-password"
                  placeholder="En az 6 karakter"
                  required
                />
              </label>

              <label>
                Şifre Tekrar

                <input
                  value={
                    passwordAgain
                  }
                  onChange={(
                    event
                  ) =>
                    setPasswordAgain(
                      event.target.value
                    )
                  }
                  type="password"
                  autoComplete="new-password"
                  placeholder="Şifreni tekrar yaz"
                  required
                />
              </label>

              <label>
                Cinsiyet

                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(
                      event.target.value
                    )
                  }
                  required
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
              </label>

              <div className="profile-photo-picker">
                <div className="profile-photo-preview">
                  {photoPreview ? (
                    <img
                      src={
                        photoPreview
                      }
                      alt="Profil önizleme"
                    />
                  ) : (
                    <span>
                      CT
                    </span>
                  )}
                </div>

                <div className="profile-photo-copy">
                  <strong>
                    Profil fotoğrafı
                  </strong>

                  <span>
                    İsteğe bağlı · JPG, PNG veya WEBP
                  </span>

                  <label className="photo-select-btn">
                    Fotoğraf seç

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handlePhotoChange
                      }
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? 'Hesap oluşturuluyor...'
                  : 'Hesap Oluştur'}
              </button>
            </form>

            <div className="auth-links centered">
              <span>
                Zaten hesabın var mı?
              </span>

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'login'
                  )
                }
              >
                Giriş yap
              </button>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1>
              Şifreni yenile.
            </h1>

            <p className="auth-copy">
              E-posta adresini gir. Sana
              şifre sıfırlama bağlantısı
              gönderelim.
            </p>

            <form
              onSubmit={
                resetPassword
              }
              className="auth-form"
            >
              <label>
                E-posta

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? 'Gönderiliyor...'
                  : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>

            <div className="auth-links centered">
              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'login'
                  )
                }
              >
                Giriş ekranına dön
              </button>
            </div>
          </>
        )}

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        <div className="auth-foot">
          CyberTalk · Güvenli iletişim platformu
        </div>
      </section>
    </main>
  );
}