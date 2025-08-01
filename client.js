async function generatePassword(length = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function fetchEmail() {
  try {
    const res = await fetch('https://my-proxy-vercel.vercel.app/api/create-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainId: 'RG9tYWluOjI=' })
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const json = await res.json();
    console.log("📡 Phản hồi API create-email:", JSON.stringify(json, null, 2));
    const email = json?.data?.introduceSession?.addresses?.[0]?.address;
    const sessionId = json?.data?.introduceSession?.id;
    const restoreKey = json?.data?.introduceSession?.addresses?.[0]?.restoreKey;
    if (!email || !sessionId) throw new Error("❌ Không lấy được email hoặc sessionId từ API");
    return { email, sessionId, restoreKey };
  } catch (err) {
    console.error("❌ Lỗi khi gọi API create-email:", err.message);
    throw err;
  }
}

async function fetchVerificationCode(sessionId) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`https://my-proxy-vercel.vercel.app/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const json = await res.json();
      console.log("📡 Phản hồi API check-email:", JSON.stringify(json, null, 2));
      const messages = json?.data?.session?.mails || [];
      if (messages.length > 0) {
        const content = messages[0]?.text || "";
        console.log("📧 Nội dung email:", content);
        const match = content.match(/\b\d{6}\b/);
        if (match) return match[0];
      }
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error("❌ Lỗi khi gọi API check-email:", err.message);
    }
  }
  console.warn("⚠️ Không tìm thấy mã xác minh trong email");
  return null;
}

async function waitForElement(selector, timeout = 20000, maxRetries = 4) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function tryFind() {
      console.log(`🔍 Đang tìm phần tử với selector: ${selector}`);
      const el = document.querySelector(selector);
      if (el) {
        console.log(`✅ Tìm thấy phần tử: ${selector}`);
        return resolve(el);
      }
      const observer = new MutationObserver(() => {
        const e = document.querySelector(selector);
        if (e) {
          console.log(`✅ Tìm thấy phần tử qua MutationObserver: ${selector}`);
          observer.disconnect();
          clearTimeout(timer);
          resolve(e);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        retries++;
        if (retries <= maxRetries) {
          console.log(`🔄 Thử lại tìm phần tử: ${selector} (lần ${retries})`);
          tryFind();
        } else {
          console.error(`❌ Timeout chờ phần tử: ${selector} sau ${maxRetries + 1} lần thử`);
          reject(`❌ Timeout chờ phần tử: ${selector}`);
        }
      }, timeout);
    }
    tryFind();
  });
}

async function waitForPageLoad(timeout = 10000) {
  console.log("⏳ Đang chờ trang tải hoàn tất...");
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      console.log("✅ Trang đã tải hoàn tất");
      resolve();
      return;
    }
    window.addEventListener('load', () => {
      console.log("✅ Trang tải hoàn tất qua sự kiện load");
      resolve();
    }, { once: true });
    setTimeout(() => {
      console.warn("⚠️ Timeout chờ trang tải, tiếp tục...");
      resolve();
    }, timeout);
  });
}

async function waitForCaptcha(timeout = 30000) {
  console.log("🧩 Đang chờ captcha...");
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const captchaWrapper = document.querySelector('.kwai-captcha-slider-wrapper');
      if (!captchaWrapper) {
        console.log("✅ Captcha đã biến mất hoặc không xuất hiện");
        clearInterval(interval);
        resolve();
      }
    }, 500);
    setTimeout(() => {
      clearInterval(interval);
      console.warn("⚠️ Timeout chờ captcha, tiếp tục...");
      resolve();
    }, timeout);
  });
}

async function waitForButtonEnabled(selector, timeout = 10000) {
  console.log(`⏳ Đang chờ nút ${selector} không còn disabled...`);
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const button = document.querySelector(selector);
      if (button && !button.disabled) {
        console.log(`✅ Nút ${selector} đã enabled`);
        clearInterval(interval);
        resolve(button);
      }
    }, 500);
    setTimeout(() => {
      clearInterval(interval);
      reject(`❌ Timeout chờ nút ${selector} enabled`);
    }, timeout);
  });
}

async function closeDialog(timeout = 5000) {
  console.log("🔍 Đang tìm dialog để đóng...");
  const selectors = [
    '[aria-label="Close"]',
    'button.close',
    'button:contains("X")',
    '.modal-close',
    '.dialog-close'
  ];
  for (const selector of selectors) {
    try {
      const closeBtn = await waitForElement(selector, timeout);
      closeBtn.click();
      console.log("✅ Đã đóng dialog với selector:", selector);
      return true;
    } catch (err) {
      console.log(`⚠️ Không tìm thấy dialog với selector ${selector}`);
    }
  }
  console.warn("⚠️ Không tìm thấy dialog để đóng, tiếp tục...");
  return false;
}

async function runFlow(followLink, runCount) {
  console.log(`🚀 Bắt đầu script với ${runCount} lần chạy, link: ${followLink}`);
  if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
    console.error("❌ Link không hợp lệ, phải bắt đầu bằng https://app.klingai.com/");
    return;
  }
  if (isNaN(runCount) || runCount <= 0) {
    console.error("❌ Số lần chạy không hợp lệ, phải là số nguyên dương");
    return;
  }

  for (let i = 1; i <= runCount; i++) {
    console.log(`🔄 Bắt đầu lần chạy thứ ${i}/${runCount}`);
    try {
      const { email, sessionId, restoreKey } = await fetchEmail();
      const password = generatePassword();
      console.log("📧 Email:", email);
      console.log("🔐 Password:", password);
      console.log("🔑 sessionId:", sessionId);
      console.log("🔑 restoreKey:", restoreKey || "Không có restoreKey");

      window.location.href = 'https://app.klingai.com/global';
      await waitForPageLoad(10000);

      const signInBtn = await waitForElement('div.login');
      signInBtn.click();
      console.log("➡️ Click Sign In");

      await new Promise(r => setTimeout(r, 1000));

      let emailBtn;
      const captionElements = document.querySelectorAll('div.sign-in-button span.caption');
      for (const caption of captionElements) {
        const text = caption.innerText.trim();
        console.log(`🔍 Kiểm tra span.caption: ${text}`);
        if (text === 'Sign in with email') {
          emailBtn = caption.closest('div.sign-in-button');
          break;
        }
      }

      if (!emailBtn) {
        console.log('🔎 Thử tìm nút bằng style margin-top: 24px');
        emailBtn = document.querySelector('div.sign-in-button[style*="margin-top: 24px"]');
      }

      if (!emailBtn) {
        throw new Error("❌ Không tìm thấy nút Sign in with email");
      }

      emailBtn.click();
      console.log("➡️ Click Sign in with Email");

      await new Promise(r => setTimeout(r, 1000));

      const signUpLink = await waitForElement('p.clickable a');
      signUpLink.click();
      console.log("➡️ Click Sign up for free");

      const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
      const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
      const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');

      emailInput.value = email;
      passInput.value = password;
      confirmInput.value = password;

      for (let input of [emailInput, passInput, confirmInput]) {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const nextBtn = await waitForElement('.generic-button.critical.large');
      nextBtn.click();
      console.log("➡️ Đã click Next, chờ captcha...");

      await waitForCaptcha(30000);

      console.log("➡️ Captcha đã xử lý, tìm trường mã xác minh...");
      const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);

      const code = await fetchVerificationCode(sessionId);
      if (!code) {
        console.log("⚠️ Không có mã xác minh tự động, cần nhập mã thủ công");
        const finalSubmitBtn = await waitForButtonEnabled('button.generic-button.critical.large', 60000);
        finalSubmitBtn.click();
        console.log("✅ Đã click Submit sau khi nhập mã thủ công");
        return;
      }

      console.log("📨 Mã xác minh nhận được:", code);
      codeInput.value = code;
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      codeInput.dispatchEvent(new Event('change', { bubbles: true }));

      const finalSubmitBtn = await waitForButtonEnabled('button.generic-button.critical.large', 10000);
      finalSubmitBtn.click();
      console.log("✅ Đã nhập mã và submit hoàn tất đăng ký!");

      console.log(`🌐 Đang vào link buff follow: ${followLink}`);
      window.location.href = followLink;
      await waitForPageLoad(10000);
      await closeDialog(5000);

      const followBtn = await waitForElement('button:contains("Follow"), .follow-button, .btn-follow', 15000);
      followBtn.click();
      console.log("✅ Đã nhấn nút Follow");

      console.log("🌐 Đang vào trang Profile Settings...");
      window.location.href = 'https://app.klingai.com/global/account';
      await waitForPageLoad(10000);

      const profileSettingsBtn = await waitForElement('button:contains("Profile Settings"), .profile-settings, .settings-button', 15000);
      profileSettingsBtn.click();
      console.log("✅ Đã nhấn nút Profile Settings");

      const signOutBtn = await waitForElement('button:contains("Sign Out"), .sign-out, .logout-button', 15000);
      signOutBtn.click();
      console.log("✅ Đã nhấn nút Sign Out");

      await new Promise(r => setTimeout(r, 2000));
      console.log(`✅ Hoàn thành lần chạy thứ ${i}`);
    } catch (err) {
      console.error(`❌ Lỗi ở lần chạy thứ ${i}:`, err);
    }
  }
  console.log("✅ Đã hoàn thành tất cả các lần chạy!");
}

console.log("🚀 Script đã tải, gọi runFlow(followLink, runCount) để chạy!");
