async function startRegistration(followLink) {
    // =================================================================
    // CẤU HÌNH VÀ CÁC HÀM TIỆN ÍCH
    // =================================================================
    const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app';

    function generatePassword(length = 10) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    async function waitForElement(selector, timeout = 20000) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    resolve(el);
                }
            }, 500);
            const timer = setTimeout(() => {
                clearInterval(interval);
                reject(new Error(`Timeout chờ phần tử: ${selector}`));
            }, timeout);
        });
    }

    async function waitForCaptcha(timeout = 30000) {
        console.log("🧩 Đang chờ captcha (nếu có)...");
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!document.querySelector('.kwai-captcha-slider-wrapper')) {
                    clearInterval(interval);
                    clearTimeout(timer);
                    console.log("✅ Captcha đã được xử lý hoặc không xuất hiện.");
                    resolve();
                }
            }, 500);
            const timer = setTimeout(() => {
                clearInterval(interval);
                console.warn("⚠️ Hết thời gian chờ captcha, tiếp tục flow...");
                resolve();
            }, timeout);
        });
    }

    async function fetchEmail() {
        const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Lỗi API create-email: ${res.status}`);
        const json = await res.json();
        if (!json.email) throw new Error("Phản hồi API không chứa email.");
        console.log(`✅ Nhận được email: ${json.email}`);
        return { email: json.email };
    }

    async function fetchVerificationCode(email) {
        if (!email) {
            console.warn("⚠️ Không có email, bỏ qua lấy mã.");
            return null;
        }
        console.log(`⏳ Đang chờ mã xác minh cho ${email}...`);
        for (let i = 0; i < 30; i++) {
            try {
                const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/check-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                if (!res.ok) throw new Error(`Lỗi API check-email: ${res.status}`);
                const json = await res.json();
                if (json && json.text) {
                    const match = json.text.match(/\b\d{6}\b/);
                    if (match) {
                        console.log(`✅ Tìm thấy mã xác minh: ${match[0]}`);
                        return match[0];
                    }
                }
                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                console.error("❌ Lỗi khi gọi API check-email:", err.message);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        console.warn("⚠️ Không tìm thấy mã xác minh trong email sau 60 giây.");
        return null;
    }

    // =================================================================
    // FLOW ĐĂNG KÝ CHÍNH
    // =================================================================
    try {
        if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
            throw new Error("Link follow không hợp lệ!");
        }

        const { email } = await fetchEmail();
        const password = generatePassword();
        console.log("Tài khoản mới sẽ được tạo:", { email, password });

        // Bắt đầu luồng đăng ký
        const signInBtn = await waitForElement('div.login');
        signInBtn.click();
        console.log("➡️ Đã click Sign In");
        await new Promise(r => setTimeout(r, 1000));

        let emailBtn;
        document.querySelectorAll('div.sign-in-button span.caption').forEach(caption => {
            if (caption.innerText.trim() === 'Sign in with email') {
                emailBtn = caption.closest('div.sign-in-button');
            }
        });
        if (!emailBtn) {
            emailBtn = document.querySelector('div.sign-in-button[style*="margin-top: 24px"]');
        }
        if (!emailBtn) throw new Error("❌ Không tìm thấy nút Sign in with email");
        emailBtn.click();
        console.log("➡️ Đã click Sign in with Email");
        await new Promise(r => setTimeout(r, 1000));

        const signUpLink = await waitForElement('p.clickable a');
        signUpLink.click();
        console.log("➡️ Đã click Sign up for free");

        const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
        const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
        const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');

        emailInput.value = email;
        passInput.value = password;
        confirmInput.value = password;
        [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));
        console.log("➡️ Đã điền thông tin đăng ký.");

        const nextBtn = await waitForElement('.generic-button.critical.large');
        nextBtn.click();
        console.log("➡️ Đã click Next, chờ captcha...");

        await waitForCaptcha(30000);

        const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);
        const code = await fetchVerificationCode(email);
        if (!code) {
            throw new Error("Không thể tự động lấy mã xác minh.");
        }
        console.log("➡️ Đã điền mã xác minh.");
        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.dispatchEvent(new Event('change', { bubbles: true }));

        const finalSubmitBtn = await waitForElement('button.generic-button.critical.large:not([disabled])');
        finalSubmitBtn.click();
        console.log("✅ Hoàn tất đăng ký!");

        // Chờ trang ổn định sau khi đăng ký
        await new Promise(r => setTimeout(r, 5000));

        // Chuyển đến link follow
        console.log(`🚀 Chuyển hướng đến: ${followLink}`);
        window.location.href = followLink;

    } catch (err) {
        console.error("❌ Flow đăng ký thất bại:", err.message);
    }
}
