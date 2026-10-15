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

Notlar:
- `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}` Supabase'in kendi değişkenleri; olduğu gibi kalmalı.
- Tasarım uygulamanın hatırlatma mailleriyle aynı (`api/_mail.ts`): resimsiz, tablo tabanlı tek kart. Resim yok, çünkü mail uygulamaları resimleri varsayılan olarak engeller ve spam puanını düşürür.
- Konu satırlarında emoji ve büyük harf yok (spam filtreleri sever).
- GitHub'da dosyayı açıp **Raw**'a basarsan içeriği kolayca kopyalarsın.
