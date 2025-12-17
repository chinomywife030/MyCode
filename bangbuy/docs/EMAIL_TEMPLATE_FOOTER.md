# BangBuy Email Template Footer 設置指南

請在 Supabase Dashboard 的 **Authentication > Email Templates** 中，為以下模板添加 Trust Footer：

## 需要更新的模板

1. **Confirm signup** (驗證信)
2. **Reset Password** (重設密碼)
3. **Magic Link** (魔術連結，如有使用)
4. **Invite User** (邀請用戶，如有使用)

## Footer HTML（複製到每個模板底部）

```html
<!-- Trust Footer -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
  <tr>
    <td align="center" style="padding: 16px 0;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
        This email was sent by <a href="https://bangbuy.app" style="color: #2563eb; text-decoration: none;">BangBuy</a> (https://bangbuy.app)
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
        <a href="https://bangbuy.app/privacy" style="color: #2563eb; text-decoration: none;">Privacy Policy</a>
        &nbsp;|&nbsp;
        <a href="https://bangbuy.app/terms" style="color: #2563eb; text-decoration: none;">Terms of Service</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        Contact: <a href="mailto:support@bangbuy.app" style="color: #2563eb; text-decoration: none;">support@bangbuy.app</a>
      </p>
      <p style="font-size: 11px; color: #9ca3af; margin: 16px 0 0 0;">
        © 2025 BangBuy. All rights reserved.
      </p>
    </td>
  </tr>
</table>
```

## 操作步驟

1. 登入 Supabase Dashboard
2. 前往 **Authentication** > **Email Templates**
3. 選擇要編輯的模板（如 Confirm signup）
4. 在現有模板 HTML 的 `</body>` 之前，貼上上方的 Footer HTML
5. 點擊 **Save**
6. 對其他模板重複相同操作

## 注意事項

- 不要刪除模板中的 `{{ .ConfirmationURL }}` 等變數
- Footer 應該放在主要內容之後、`</body>` 之前
- 建議先在測試環境驗證郵件格式

## 範例完整模板（Confirm signup）

```html
<h2>確認您的 Email</h2>
<p>感謝您註冊 BangBuy！請點擊下方連結驗證您的 Email：</p>
<p><a href="{{ .ConfirmationURL }}">確認 Email</a></p>
<p>如果您沒有註冊 BangBuy，請忽略此郵件。</p>

<!-- Trust Footer -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
  <tr>
    <td align="center" style="padding: 16px 0;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
        This email was sent by <a href="https://bangbuy.app" style="color: #2563eb; text-decoration: none;">BangBuy</a> (https://bangbuy.app)
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
        <a href="https://bangbuy.app/privacy" style="color: #2563eb; text-decoration: none;">Privacy Policy</a>
        &nbsp;|&nbsp;
        <a href="https://bangbuy.app/terms" style="color: #2563eb; text-decoration: none;">Terms of Service</a>
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        Contact: <a href="mailto:support@bangbuy.app" style="color: #2563eb; text-decoration: none;">support@bangbuy.app</a>
      </p>
      <p style="font-size: 11px; color: #9ca3af; margin: 16px 0 0 0;">
        © 2025 BangBuy. All rights reserved.
      </p>
    </td>
  </tr>
</table>
```

