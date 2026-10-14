const fa = (value) => Number(value).toLocaleString("fa-IR");

export function errorText(error, extra = {}) {
  switch (error) {
    case "invalid_credentials":
      return "ایمیل یا رمز عبور درست نیست.";
    case "email_taken":
      return "این ایمیل قبلاً ثبت‌نام کرده. وارد شو.";
    case "invalid_email":
      return "ایمیل معتبر نیست.";
    case "weak_password":
      return "رمز عبور باید حداقل ۸ کاراکتر باشد و خیلی ساده نباشد.";
    case "rate_limited": {
      const minutes = Math.max(1, Math.ceil((extra.retryAfter ?? 60) / 60));
      return `تلاش‌های زیادی انجام شد. ${fa(minutes)} دقیقه دیگه دوباره امتحان کن.`;
    }
    case "network_error":
      return "اتصال برقرار نشد. اینترنتت رو چک کن و دوباره امتحان کن.";
    case "already_has_email":
      return "این حساب از قبل ایمیل دارد.";
    case "no_password_login":
      return "این حساب هنوز رمز عبور ندارد.";
    case "already_linked":
      return "این حساب قبلاً به تلگرام وصل شده.";
    case "forbidden":
      return "درخواست معتبر نبود. صفحه رو دوباره باز کن.";
    default:
      return "مشکلی پیش اومد. دوباره امتحان کن.";
  }
}
