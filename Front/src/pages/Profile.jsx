import { useEffect, useRef, useState } from 'react'
import {
  AtSign,
  Camera,
  Check,
  ImageOff,
  Pencil,
  Save,
  Settings as SettingsIcon,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { readPhotoFile, useUser } from '../context/UserContext.jsx'
import { PROFILE_LIMITS, sanitizeUsername, validateProfile } from '../services/profile.js'
import { formatDate } from '../utils/format.js'
import { Avatar } from '../components/Avatar.jsx'
import { Modal } from '../components/Modal.jsx'

const EMPTY_DRAFT = {
  displayName: '',
  username: '',
  bio: '',
  pronouns: '',
  email: '',
  profilePicture: null,
}

/** Datos de la foto de perfil a partir del usuario. */
function draftFromUser(user) {
  if (!user) return { ...EMPTY_DRAFT }
  return {
    displayName: user.displayName ?? '',
    username: user.username ?? '',
    bio: user.bio ?? '',
    pronouns: user.pronouns ?? '',
    email: user.email ?? '',
    profilePicture: user.profilePicture ?? null,
  }
}

/**
 * Vista de perfil.
 *
 * Cabecera con la PFP (clic para cambiar la foto), el nombre para mostrar
 * (editable en el sitio) y el @username, followed by bio y pronombres.
 * "Editar perfil" abre el editor completo en un modal.
 *
 * Todo se guarda en UserContext, asi que los cambios se ven al instante en el
 * avatar del header y en el menu de perfil.
 */
export function Profile({ onNavigate }) {
  const { t, language } = usePreferences()
  const { user, updateProfile, setPhoto, removePhoto } = useUser()

  const photoInputRef = useRef(null)
  const photoMenuRef = useRef(null)
  const nameInputRef = useRef(null)
  const modalPhotoRef = useRef(null)

  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const locale = language === 'en' ? 'en-GB' : 'es-ES'

  useEffect(() => {
    if (!photoMenuOpen) return undefined
    const onPointerDown = (event) => {
      if (!photoMenuRef.current?.contains(event.target)) setPhotoMenuOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPhotoMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [photoMenuOpen])

  // --- PFP: al pulsar la foto se ofrece cambiarla o quitarla ---------------
  const pickPhoto = (inputRef) => {
    setPhotoMenuOpen(false)
    inputRef.current?.click()
  }

  const onPhotoPicked = async (event, { direct = true } = {}) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!direct) {
      // Dentro del modal la foto se previsualiza y se aplica al guardar.
      const resultado = await readPhotoFile(file)
      if (resultado.ok) setDraft((d) => ({ ...d, profilePicture: resultado.dataUrl }))
      else setErrors((e) => ({ ...e, photo: resultado.error }))
    } else {
      await setPhoto(file)
    }
    event.target.value = ''
  }

  // --- Nombre para mostrar: edicion en el sitio ---------------------------
  const startNameEdit = () => {
    setNameDraft(user.displayName ?? '')
    setNameError(false)
    setEditingName(true)
  }

  useEffect(() => {
    if (editingName) nameInputRef.current?.select()
  }, [editingName])

  // Return temprano DESPUES de todos los hooks (regla de hooks).
  if (!user) return null

  const commitName = () => {
    const value = nameDraft.trim()
    if (!value) {
      setNameError(true)
      nameInputRef.current?.focus()
      return
    }
    updateProfile({ displayName: value.slice(0, PROFILE_LIMITS.displayName) })
    setEditingName(false)
    setNameError(false)
  }

  // --- Modal "Editar perfil" ---------------------------------------------
  const openModal = () => {
    setDraft(draftFromUser(user))
    setErrors({})
    setModalOpen(true)
  }

  const saveModal = (event) => {
    event.preventDefault()
    const found = validateProfile(draft)
    setErrors(found)
    if (Object.keys(found).length) return

    // username se guarda sin "@"; la interfaz lo muestra con "@".
    updateProfile({
      displayName: draft.displayName.trim(),
      username: sanitizeUsername(draft.username),
      bio: draft.bio.trim(),
      pronouns: draft.pronouns.trim(),
      email: draft.email.trim(),
      profilePicture: draft.profilePicture,
    })
    setModalOpen(false)
    setSaved(true)
  }

  const errorText = (key) => {
    if (!key) return null
    if (key === 'required') return t('profile.errors.required')
    if (key === 'short') return t('profile.errors.usernameShort')
    if (key === 'long') return t('profile.errors.long')
    if (key === 'format') return t('profile.errors.usernameFormat')
    if (key === 'invalid') return t('profile.invalidEmail')
    return t('profile.errors.photo')
  }

  return (
    <div className="page profile">
      <header className="page__header">
        <div>
          <h1 className="page__title">{t('profile.title')}</h1>
          <p className="page__subtitle">{t('profile.subtitle')}</p>
        </div>
        {saved && (
          <p className="badge badge--success" role="status">
            <Check size={14} aria-hidden="true" />
            {t('profile.saved')}
          </p>
        )}
      </header>

      {/* ---------------------------------------------- tarjeta principal */}
      <section className="card card--padded profile__hero">
        <div className="profile__identity">
          <div className="pfp" ref={photoMenuRef}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={onPhotoPicked}
              aria-label={t('profile.changePhoto')}
            />
            <button
              type="button"
              className="pfp__button"
              onClick={() => setPhotoMenuOpen((value) => !value)}
              aria-expanded={photoMenuOpen}
              aria-haspopup="menu"
              aria-label={t('profile.changePhoto')}
            >
              <Avatar
                name={user.displayName}
                photo={user.profilePicture}
                size={104}
                alt={t('profile.photo')}
              />
              <span className="pfp__overlay" aria-hidden="true">
                <Camera size={20} />
              </span>
            </button>

            {photoMenuOpen && (
              <div className="pfp__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="pfp__menu-item"
                  onClick={() => pickPhoto(photoInputRef)}
                >
                  <Camera size={16} aria-hidden="true" />
                  {t('profile.changePhoto')}
                </button>
                {user.profilePicture && (
                  <button
                    type="button"
                    role="menuitem"
                    className="pfp__menu-item"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      removePhoto()
                    }}
                  >
                    <ImageOff size={16} aria-hidden="true" />
                    {t('profile.removePhoto')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="profile__identity-text">
            {editingName ? (
              <div className="profile__name-edit">
                <input
                  ref={nameInputRef}
                  className="input profile__name-input"
                  value={nameDraft}
                  maxLength={PROFILE_LIMITS.displayName}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onBlur={commitName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitName()
                    }
                    if (event.key === 'Escape') setEditingName(false)
                  }}
                  aria-label={t('profile.displayName')}
                  aria-invalid={nameError}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={commitName}
                  aria-label={t('profile.save')}
                >
                  <Check size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setEditingName(false)}
                  aria-label={t('profile.cancel')}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="profile__display-name"
                onClick={startNameEdit}
                title={t('profile.displayNameHint')}
              >
                {user.displayName}
                <Pencil size={15} className="profile__display-name-icon" aria-hidden="true" />
              </button>
            )}
            {nameError && <p className="field__error">{t('profile.errors.required')}</p>}

            <p className="profile__username">
              <AtSign size={14} aria-hidden="true" />
              {user.username || t('profile.noUsername')}
            </p>

            <button type="button" className="btn btn--secondary profile__edit-button" onClick={openModal}>
              <Pencil size={15} aria-hidden="true" />
              {t('profile.edit')}
            </button>
          </div>
        </div>

        <dl className="profile__details">
          <div className="profile__detail">
            <dt>{t('profile.bio')}</dt>
            <dd>{user.bio || <span className="text-muted">{t('profile.bioEmpty')}</span>}</dd>
          </div>
          <div className="profile__detail">
            <dt>{t('profile.pronouns')}</dt>
            <dd>
              {user.pronouns ? (
                user.pronouns
              ) : (
                <span className="text-muted">{t('profile.pronounsEmpty')}</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* ------------------------------------------- datos de la cuenta */}
      <section className="card card--padded stack stack--3">
        <h2 className="section-title">
          <UserIcon size={18} aria-hidden="true" />
          {t('profile.accountInfo')}
        </h2>
        <dl className="data-list">
          <div className="data-list__row">
            <dt>{t('profile.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="data-list__row">
            <dt>{t('profile.joined')}</dt>
            <dd>{formatDate(user.createdAt, locale)}</dd>
          </div>
        </dl>
      </section>

      <section className="card card--padded profile__shortcut">
        <div>
          <h2 className="section-title">{t('profile.preferences')}</h2>
          <p className="text-muted text-sm">{t('profile.preferencesHint')}</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/ajustes')}>
          <SettingsIcon size={16} aria-hidden="true" />
          {t('profile.goToSettings')}
        </button>
      </section>

      {/* --------------------------------------------- modal de edicion */}
      <Modal
        open={modalOpen}
        title={t('profile.editTitle')}
        description={t('profile.editHint')}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              {t('profile.cancel')}
            </button>
            <button type="submit" form="profile-edit-form" className="btn btn--primary">
              <Save size={16} aria-hidden="true" />
              {t('profile.save')}
            </button>
          </>
        }
      >
        <form id="profile-edit-form" className="stack stack--4" onSubmit={saveModal} noValidate>
          <div className="profile-edit__photo">
            <Avatar
              name={draft.displayName || user.displayName}
              photo={draft.profilePicture}
              size={72}
              alt={t('profile.photo')}
            />
            <input
              ref={modalPhotoRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(event) => onPhotoPicked(event, { direct: false })}
              aria-label={t('profile.changePhoto')}
            />
            <div className="row row--wrap">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => modalPhotoRef.current?.click()}
              >
                <Camera size={15} aria-hidden="true" />
                {t('profile.changePhoto')}
              </button>
              {draft.profilePicture && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setDraft((d) => ({ ...d, profilePicture: null }))}
                >
                  <ImageOff size={15} aria-hidden="true" />
                  {t('profile.removePhoto')}
                </button>
              )}
            </div>
            {errors.photo && <p className="field__error">{errorText(errors.photo)}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-display-name">
              {t('profile.displayName')}
            </label>
            <input
              id="edit-display-name"
              className="input"
              value={draft.displayName}
              maxLength={PROFILE_LIMITS.displayName}
              onChange={(event) => setDraft((d) => ({ ...d, displayName: event.target.value }))}
              aria-invalid={Boolean(errors.displayName)}
            />
            {errors.displayName && <p className="field__error">{errorText(errors.displayName)}</p>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-username">
              {t('profile.username')}
            </label>
            <div className="input-prefix">
              <span className="input-prefix__symbol" aria-hidden="true">
                @
              </span>
              <input
                id="edit-username"
                className="input input-prefix__input"
                value={draft.username}
                maxLength={PROFILE_LIMITS.username}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                onChange={(event) =>
                  setDraft((d) => ({ ...d, username: sanitizeUsername(event.target.value) }))
                }
                aria-invalid={Boolean(errors.username)}
                aria-describedby="edit-username-hint"
              />
            </div>
            {errors.username ? (
              <p className="field__error">{errorText(errors.username)}</p>
            ) : (
              <p className="field__hint" id="edit-username-hint">
                {t('profile.usernameHint')}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-bio">
              {t('profile.bio')}
            </label>
            <textarea
              id="edit-bio"
              className="input profile__textarea"
              rows={3}
              value={draft.bio}
              maxLength={PROFILE_LIMITS.bio}
              placeholder={t('profile.bioPlaceholder')}
              onChange={(event) => setDraft((d) => ({ ...d, bio: event.target.value }))}
            />
            <p className="field__hint">
              {draft.bio.length}/{PROFILE_LIMITS.bio}
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-pronouns">
              {t('profile.pronouns')}
              <span className="field__optional">({t('common.optional')})</span>
            </label>
            <input
              id="edit-pronouns"
              className="input"
              value={draft.pronouns}
              maxLength={PROFILE_LIMITS.pronouns}
              placeholder={t('profile.pronounsPlaceholder')}
              onChange={(event) => setDraft((d) => ({ ...d, pronouns: event.target.value }))}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="edit-email">
              {t('profile.email')}
            </label>
            <input
              id="edit-email"
              type="email"
              className="input"
              value={draft.email}
              onChange={(event) => setDraft((d) => ({ ...d, email: event.target.value }))}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="field__error">{errorText(errors.email)}</p>}
          </div>

          <p className="profile-edit__note">
            <Sparkles size={14} aria-hidden="true" />
            {t('profile.localNote')}
          </p>
        </form>
      </Modal>
    </div>
  )
}
