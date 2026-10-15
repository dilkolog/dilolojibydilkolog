# Supabase e-posta şablonları (Türkçe)

Supabase → **Authentication → Emails → Templates**. Her sekmede **Subject** alanına aşağıdaki konuyu, **Body** (Source/HTML) alanına dosyanın içeriğini yapıştır, **Save**.

| Supabase sekmesi | Konu (Subject) | Dosya |
| --- | --- | --- |
| Confirm signup | Diloloji hesabını onayla | `confirm-signup.html` |
| Invite user | Diloloji'ye davet edildin | `invite.html` |
| Magic Link | Diloloji giriş bağlantın | `magic-link.html` |
| Change Email Address | Diloloji: yeni e-posta adresini onayla | `change-email.html` |
| Reset Password | Diloloji şifreni yenile | `reset-password.html` |
| Reauthentication | Diloloji doğrulama kodun | `reauthentication.html` |

## Güvenlik bildirimleri

Supabase → **Authentication → Emails** sayfasının "Security" (güvenlik bildirimleri) bölümü. Her birini önce **açık** (Enabled) yap, sonra konuyu ve gövdeyi yapıştır. Bunlar hesapta bir değişiklik olunca kişiye haber verir; bağlantı ya da düğme taşımaz.

| Supabase'teki ad | Konu (Subject) | Dosya |
| --- | --- | --- |
| Password changed | Diloloji şifren değişti | `password-changed.html` |
| Email address changed | Diloloji hesabının e-postası değişti | `email-changed.html` |
| Phone number changed | Diloloji hesabının telefon numarası değişti | `phone-changed.html` |
| Identity linked | Diloloji hesabına yeni bir giriş yolu eklendi | `identity-linked.html` |
| Identity unlinked | Diloloji hesabından bir giriş yolu kaldırıldı | `identity-unlinked.html` |
| Multi-factor authentication method added | Diloloji hesabına iki adımlı doğrulama eklendi | `mfa-enrolled.html` |
| Multi-factor authentication method removed | Diloloji hesabından iki adımlı doğrulama kaldırıldı | `mfa-unenrolled.html` |

Telefon ve iki adımlı doğrulama Diloloji'de kullanılmıyor; şablonları yine de hazır, açman şart değil. Önerilen: **Password changed**, **Email address changed**, **Identity linked**, **Identity unlinked** açık olsun.

Notlar:
- `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`, `{{ .Provider }}`, `{{ .FactorType }}`, `{{ .Token }}` Supabase'in kendi değişkenleri; olduğu gibi kalmalı.
- Tasarım uygulamanın hatırlatma mailleriyle aynı (`api/_mail.ts`): resimsiz, tablo tabanlı tek kart. Resim yok, çünkü mail uygulamaları resimleri varsayılan olarak engeller ve spam puanını düşürür.
- Konu satırlarında emoji ve büyük harf yok (spam filtreleri sever).
- GitHub'da dosyayı açıp **Raw**'a basarsan içeriği kolayca kopyalarsın.
