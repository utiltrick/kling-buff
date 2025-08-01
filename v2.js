// =================================================================
// CẤU HÌNH: DÁN URL VERCEL API CỦA BẠN VÀO ĐÂY
// =================================================================
const YOUR_VERCEL_APP_URL = 'https://kling-api-proxy.vercel.app';
// =================================================================

console.log("🚀 Script đã sẵn sàng. Chạy từng hàm theo hướng dẫn.");

// --- CÁC HÀM TIỆN ÍCH VÀ API (GIỮ NGUYÊN) ---
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
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (!document.querySelector('.kwai-captcha-slider-wrapper')) {
                clearInterval(interval);
                clearTimeout(timer);
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
    try {
        const res = await fetch(`${YOUR_VERCEL_APP_URL}/api/create-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`Lỗi API create-email: ${res.status}`);
        const json = await res.json();
        if (!json.email) throw new Error("Phản hồi API không chứa email.");
        return { email: json.email };
    } catch (err) {
        console.error("❌ Lỗi khi gọi API create-email:", err.message);
        throw err;
    }
}

async function fetchVerificationCode(email) {
    if (!email) {
        console.warn("⚠️ Không có email, bỏ qua lấy mã.");
        return null;
    }
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
                if (match) return match[0];
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


// --- CÁC HÀM ĐÃ ĐƯỢC TÁCH RIÊNG ---

/**
 * BƯỚC 1: Tự động đăng ký tài khoản và chuyển đến trang follow.
 * @param {string} followLink - Link của người dùng bạn muốn follow.
 */
async function runStep1_Register(followLink) {
    if (!followLink || !followLink.startsWith('https://app.klingai.com/')) {
        console.error("❌ Link follow không hợp lệ!");
        return;
    }
    try {
        console.log("--- BƯỚC 1: Bắt đầu tạo tài khoản ---");
        const { email } = await fetchEmail();
        const password = generatePassword();
        console.log(`... Đang dùng email: ${email}`);

        (await waitForElement('div.login')).click();
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
        if (!emailBtn) throw new Error("Không tìm thấy nút Sign in with email");
        emailBtn.click();
        await new Promise(r => setTimeout(r, 1000));

        (await waitForElement('p.clickable a')).click();

        const emailInput = await waitForElement('input[placeholder="Enter Email Address"]');
        const passInput = await waitForElement('input[placeholder="Password (at least 8 characters)"]');
        const confirmInput = await waitForElement('input[placeholder="Confirm Password"]');

        emailInput.value = email;
        passInput.value = password;
        confirmInput.value = password;
        [emailInput, passInput, confirmInput].forEach(input => input.dispatchEvent(new Event('input', { bubbles: true })));

        (await waitForElement('.generic-button.critical.large')).click();
        
        await waitForCaptcha(30000);

        const codeInput = await waitForElement('input[placeholder="Verification Code"]', 60000);
        console.log("... Đang chờ mã xác minh...");
        const code = await fetchVerificationCode(email);
        if (!code) throw new Error("Không thể lấy mã xác minh.");
        console.log(`... Đã nhận mã: ${code}`);

        codeInput.value = code;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.dispatchEvent(new Event('change', { bubbles: true }));

        (await waitForElement('button.generic-button.critical.large:not([disabled])')).click();
        
        console.log("✅ Đăng ký thành công! Đang chuyển hướng đến trang follow...");
        
        await new Promise(r => setTimeout(r, 4000));
        window.location.href = followLink;

    } catch (err) {
        console.error("❌ Lỗi ở Bước 1:", err);
    }
}

/**
 * BƯỚC 2: Nhấn nút Follow và chuyển đến trang quản lý tài khoản.
 * Chạy hàm này KHI BẠN ĐANG Ở TRANG FOLLOW.
 */
async function runStep2_Follow() {
    try {
        console.log("--- BƯỚC 2: Bắt đầu Follow ---");
        const followBtn = await waitForElement('button.follow-button', 10000);
        followBtn.click();
        console.log("✅ Đã Follow! Đang chuyển đến trang tài khoản...");

        await new Promise(r => setTimeout(r, 3000));
        window.location.href = 'https://app.klingai.com/global/account';

    } catch (err) {
        console.error("❌ Lỗi ở Bước 2:", err);
    }
}

/**
 * BƯỚC 3: Đăng xuất khỏi tài khoản và quay về trang chủ.
 * Chạy hàm này KHI BẠN ĐANG Ở TRANG ACCOUNT.
 */
async function runStep3_SignOut() {
    try {
        console.log("--- BƯỚC 3: Bắt đầu Đăng xuất ---");
        const profileSettingsBtn = await waitForElement('button:contains("Profile Settings"), .profile-settings', 10000);
        profileSettingsBtn.click();

        const signOutBtn = await waitForElement('button:contains("Sign Out"), .sign-out', 10000);
        signOutBtn.click();
        
        console.log("✅ Đã Đăng xuất! Chuyển về trang chủ.");
        
        await new Promise(r => setTimeout(r, 3000));
        window.location.href = 'https://app.klingai.com/global/';

    } catch (err) {
        console.error("❌ Lỗi ở Bước 3:", err);
    }
}
